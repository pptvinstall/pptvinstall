import { z } from "zod";
import { createHash } from "node:crypto";
import {
  DEFAULT_ECONOMICS_CONFIG,
  QuotePolicyError,
  assertCustomerSafe,
  buildPackages,
  composeQuote,
  diffConfigs,
  jobContextSchema,
  jobScopeSchema,
  parseJobContext,
  parseJobScope,
  priceScope,
  resolveRouteContext,
  catalogPublicQuote,
  economicsAtPrice,
  publicQuoteRequestSchema,
  publicRequestToScope,
  stableStringify,
  type PricingResult,
  type RouteProvider,
  snapshotQuote,
  toCustomerView,
  validateEconomicsConfig,
  type CustomerPackage,
  type CustomerQuoteView,
  type EconomicsConfig,
  type JobContextInput,
  type JobScopeInput,
  categorySchema,
  workTemplateSchema,
} from "@shared/pricing";
import {
  InvoicePolicyError,
  assertPaymentAllowed,
  buildIntakePrompt,
  buildIntelligence,
  buildItemIntelligence,
  itemComplexity,
  computeInvoiceTotals,
  computeProfitability,
  findComparableJobs,
  heuristicIntake,
  intakeToScopeDraft,
  invoiceLineSchema,
  jobActualsInputSchema,
  parseIntakeResponse,
  paymentInputSchema,
  scopeSignature,
  shouldEscalateHeuristicIntake,
  verifyEvidence,
  type CompletedItemRecord,
  type CompletedJobRecord,
  type ScopeDraft,
} from "@shared/jobos";
import { hashObject } from "@shared/pricing/hash";
import { addDays, assertDocumentSafe, buildEstimateDocument, buildInvoiceDocument, buildReceiptDocument, localDate, type CustomerDocument } from "@shared/jobos/documents";
import { MEDIA_HINTS, type JobContact, type InvoiceRecord, type JobRecord, type MediaRecord, type QuoteRecord, type QuoteVersionRecord, type ShadowSampleRecord, type ShadowSampleSummary, type StoredConfig } from "@shared/jobos/types";
import { buildUnifiedProposal, combineIntakeText, proposalToScope, reviewDecisionsSchema, type ImageAnalysisResult, type ImageObservation, type UnifiedProposal } from "@shared/jobos/unifiedIntake";
import type { AiScopeIntake } from "@shared/jobos/intake";
import { randomUUID } from "node:crypto";
import type { MediaStorage } from "./media/storage";
import { normalizeImage, visionCopy } from "./media/images";
import { runVision, VISION_SCHEMA_VERSION, type VisionImage, type VisionProvider } from "./vision";
import { OCR_SCHEMA_VERSION, ocrObservation, textImageHint, type OcrProvider } from "./ocr";
import type { IntakeMetrics } from "@shared/jobos/intakeMetrics";
import { NotFoundError, type JobOsStore } from "./store";

export class ConflictError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "ConflictError";
  }
}

/** Optional AI provider. Returns the raw model text for the intake prompt. */
export interface IntakeProvider {
  name: string;
  model?: string;
  enabled(): boolean;
  complete(prompt: string): Promise<string>;
}

export const createJobSchema = z.object({
  title: z.string().min(1).max(120),
  customerLabel: z.string().max(120).nullable().optional(),
  zip: z.string().regex(/^\d{5}$/).nullable().optional(),
  bookingId: z.number().int().positive().nullable().optional(),
  customerId: z.number().int().positive().nullable().optional(),
  crmContactId: z.number().int().positive().nullable().optional(),
  source: z.enum(["manual", "booking", "ai_intake", "quote_tool", "synthetic"]).default("manual"),
  scheduledFor: z.string().datetime({ offset: true }).nullable().optional(),
  scope: jobScopeSchema.optional(),
  context: jobContextSchema.optional(),
  notes: z.string().max(2_000).nullable().optional(),
  /** Intake (photos/screenshots/message) this job came from; its images are attached to the job. */
  intakeId: z.string().uuid().nullable().optional(),
});

export const quoteRequestSchema = z.object({
  adjustment: z.unknown().optional(),
  /** Required to add a version to a quote the customer already accepted. */
  reopen: z.boolean().optional(),
});

export const invoiceRequestSchema = z.object({
  lines: z.array(invoiceLineSchema).min(1).max(30).optional(),
  discountCents: z.number().int().min(0).max(10_000_000).default(0),
  /** YYYY-MM-DD. Defaults to the invoice date plus the configured due days. */
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((ymd) => {
    const date = new Date(`${ymd}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === ymd;
  }, "Due date must be a real calendar date").optional(),
  /** Shown to the customer on the invoice. */
  notes: z.string().max(500).optional(),
});

export const jobContactSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    phone: z.string().trim().max(20).optional(),
    email: z.string().trim().email().max(255).optional().or(z.literal("").transform(() => undefined)),
    street: z.string().trim().max(255).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(2).optional(),
    zip: z.string().trim().regex(/^\d{5}$/).optional().or(z.literal("").transform(() => undefined)),
  })
  .strict();

export const configUpdateSchema = z.object({
  config: z.unknown(),
  reason: z.string().min(3).max(300),
  name: z.string().min(1).max(80).optional(),
  /** Must be exactly DYNAMIC_CONFIRMATION to switch customer pricing to the engine. */
  confirmDynamic: z.string().max(60).optional(),
});

/** Typed by the owner to move customers onto engine (dynamic) pricing. Checked server-side, not just in the UI. */
export const DYNAMIC_CONFIRMATION = "change customer prices";
function assertDynamicConfirmed(fromMode: string, toMode: string, confirm: string | undefined) {
  if (toMode === "dynamic" && fromMode !== "dynamic" && (confirm ?? "").trim().toLowerCase() !== DYNAMIC_CONFIRMATION) {
    throw new ConflictError(`Switching customers to dynamic (engine) pricing changes what they are quoted. Confirm by sending confirmDynamic: "${DYNAMIC_CONFIRMATION}".`, "DYNAMIC_CONFIRMATION_REQUIRED");
  }
}

export class JobOsService {
  private configCache: { at: number; value: StoredConfig } | null = null;
  private analyzing = new Set<string>();

  constructor(
    private readonly store: JobOsStore,
    private readonly opts: {
      intakeProvider?: IntakeProvider | null;
      now?: () => Date;
      configCacheMs?: number;
      routeProviders?: RouteProvider[];
      media?: MediaStorage;
      vision?: VisionProvider | null;
      ocr?: OcrProvider | null;
      /** Canonical customer details from the booking (owner-only use: documents). */
      lookupBookingContact?: (bookingId: number) => Promise<JobContact | undefined>;
    } = {},
  ) {}

  private now() {
    return (this.opts.now ?? (() => new Date()))();
  }

  // ---------------------------------------------------------------- config
  async getActiveConfig(): Promise<StoredConfig> {
    const ttl = this.opts.configCacheMs ?? 0;
    if (ttl > 0 && this.configCache && Date.now() - this.configCache.at < ttl) return this.configCache.value;
    let active = await this.store.getActiveConfig();
    if (!active) {
      // First boot: seed the uncalibrated defaults as version 1 (additive, audited).
      active = await this.store.saveConfigVersion({ config: DEFAULT_ECONOMICS_CONFIG, name: "Uncalibrated defaults", actor: "system", reason: "initial seed", changedPaths: [], activate: true });
    }
    // Stored configs are raw JSON written by older versions: re-validate so missing (newer) fields get their
    // backward-compatible defaults instead of crashing the engine.
    active = { ...active, config: validateEconomicsConfig(active.config) };
    if (ttl > 0) this.configCache = { at: Date.now(), value: active };
    return active;
  }

  /** Fill route facts (owner input > live provider > ZIP reference table > flagged unknown). Never throws. */
  async resolveContext(context: unknown): Promise<JobContextInput> {
    const parsed = parseJobContext(context ?? {});
    return resolveRouteContext(parsed, { providers: this.opts.routeProviders ?? [], now: () => this.now() });
  }

  async updateConfig(input: unknown, actor: string): Promise<StoredConfig> {
    const { config, reason, name, confirmDynamic } = configUpdateSchema.parse(input);
    const current = await this.getActiveConfig();
    const validated = validateEconomicsConfig({ ...(config as object), version: current.version + 1 });
    assertDynamicConfirmed(current.config.pricingMode, validated.pricingMode, confirmDynamic);
    const next: EconomicsConfig = { ...validated, calibration: validated.calibration === "uncalibrated-default" ? "owner-edited" : validated.calibration };
    const changedPaths = diffConfigs(current.config, next).filter((p) => p !== "version" && p !== "calibration" && p !== "name");
    if (!changedPaths.length) throw new ConflictError("No configuration values changed", "NO_CHANGE");
    const saved = await this.store.saveConfigVersion({ config: next, name: name ?? next.name, actor, reason, changedPaths, activate: true });
    this.configCache = null;
    return saved;
  }

  async listVersionsForAdmin() {
    return this.store.listConfigVersions();
  }

  async listConfigEventsForAdmin() {
    return this.store.listConfigEvents(100);
  }

  async rollbackConfig(version: number, actor: string, confirmDynamic?: string): Promise<StoredConfig> {
    const current = await this.getActiveConfig();
    const target = (await this.store.listConfigVersions()).find((v) => v.version === version);
    if (target) assertDynamicConfirmed(current.config.pricingMode, (target.config as { pricingMode?: string }).pricingMode ?? "legacy", confirmDynamic);
    const saved = await this.store.activateConfigVersion(version, actor);
    this.configCache = null;
    return saved;
  }

  // ---------------------------------------------------------------- pricing
  async previewPrice(scope: unknown, context: unknown) {
    const cfg = (await this.getActiveConfig()).config;
    const s = parseJobScope(scope);
    const c = parseJobContext(await this.resolveContext(context));
    // Review states must stay visible to the owner: the preview explains a gated scope instead of failing.
    // Saving a quote is still blocked by composeQuote (NOT_SUPPORTED always; MANUAL_REVIEW_REQUIRED unless overridden).
    try {
      const composition = composeQuote({ scope: s, context: c, config: cfg });
      return { composition, gate: null, pricing: composition.pricing, atRecommended: economicsAtPrice(composition.pricing, composition.pricing.recommendedCents), packages: buildPackages(s) as CustomerPackage[], configVersion: cfg.version, pricingMode: cfg.pricingMode };
    } catch (e) {
      if (!(e instanceof QuotePolicyError) || (e.code !== "NOT_SUPPORTED" && e.code !== "MANUAL_REVIEW_REQUIRED")) throw e;
      const pricing = priceScope(s, c, cfg);
      return { composition: null, gate: { code: e.code, message: e.message }, pricing, atRecommended: economicsAtPrice(pricing, pricing.recommendedCents), packages: [] as CustomerPackage[], configVersion: cfg.version, pricingMode: cfg.pricingMode };
    }
  }

  // ---------------------------------------------------------------- jobs
  async createJob(input: unknown): Promise<JobRecord> {
    const data = createJobSchema.parse(input);
    if (data.intakeId) {
      const intake = await this.store.getIntakeSession(data.intakeId);
      if (!intake || intake.source !== "owner") throw new NotFoundError("Intake");
      if (this.analyzing.has(data.intakeId)) throw new ConflictError("This intake is being read. Review the new proposal first.", "INTAKE_BUSY");
      if ((intake.proposal as UnifiedProposal | null)?.requiresOcrConfirmation && !(intake.review as { confirmExtractedText?: boolean } | null)?.confirmExtractedText) throw new ConflictError("Review the text read from images before creating the job.", "OCR_REVIEW_REQUIRED");
    }
    const scope = data.scope ?? parseJobScope({});
    const context = data.context ?? parseJobContext({ ...(data.zip ? { zip: data.zip } : {}) });
    const job = await this.store.createJob({
      title: data.title,
      customerLabel: data.customerLabel ?? null,
      zip: data.zip ?? null,
      bookingId: data.bookingId ?? null,
      customerId: data.customerId ?? null,
      crmContactId: data.crmContactId ?? null,
      source: data.source,
      scheduledFor: data.scheduledFor ?? null,
      scope,
      context,
      notes: data.notes ?? null,
      status: scope.tvs.length || scope.extras.length || scope.items.length ? "scoped" : "lead",
    });
    await this.syncScopeItems(job.id, scope);
    if (data.intakeId) await this.linkIntakeToJob(data.intakeId, job.id);
    return job;
  }

  async updateScope(jobId: string, scopeInput: unknown, contextInput: unknown): Promise<JobRecord> {
    const job = await this.requireJob(jobId);
    if (["invoiced", "paid", "cancelled"].includes(job.status)) throw new ConflictError(`Job is ${job.status}; scope is locked`, "JOB_LOCKED");
    const scope = parseJobScope(scopeInput);
    const context = parseJobContext(contextInput ?? job.context);
    const next = await this.store.updateJob(jobId, { scope, context, status: job.status === "lead" ? "scoped" : job.status });
    await this.syncScopeItems(jobId, scope);
    return next;
  }

  async getJob(jobId: string) {
    return this.requireJob(jobId);
  }

  async listJobs(opts?: { status?: JobRecord["status"]; limit?: number }) {
    return this.store.listJobs(opts);
  }

  async jobDetail(jobId: string) {
    const job = await this.requireJob(jobId);
    const quote = job.currentQuoteId ? await this.store.getQuote(job.currentQuoteId) : null;
    const versions = quote ? await this.store.listQuoteVersions(quote.id) : [];
    const invoices = await this.store.listInvoicesForJob(jobId);
    const payments = (await Promise.all(invoices.map((i) => this.store.listPayments(i.id)))).flat();
    const actuals = await this.store.getActuals(jobId);
    const media = (await this.store.listMedia({ jobId })).map(mediaSummary);
    return { job, quote, versions, invoices, payments, actuals, media };
  }

  private async requireJob(id: string): Promise<JobRecord> {
    const job = await this.store.getJob(id);
    if (!job) throw new NotFoundError("Job");
    return job;
  }

  private async syncScopeItems(jobId: string, scope: JobScopeInput) {
    const parsed = parseJobScope(scope);
    await this.store.replaceScopeItems(jobId, [
      ...parsed.tvs.map((tv) => ({ kind: "tv" as const, attributes: tv })),
      ...parsed.extras.map((e) => ({ kind: "extra" as const, attributes: e })),
      ...parsed.items.map((it) => ({ kind: "item" as const, attributes: it })),
    ]);
  }

  // ---------------------------------------------------------------- quotes
  /** Creates the next immutable quote version for a job using the ACTIVE config. */
  async createQuoteVersion(jobId: string, input: unknown): Promise<{ quote: QuoteRecord; version: QuoteVersionRecord }> {
    const { adjustment, reopen } = quoteRequestSchema.parse(input ?? {});
    const job = await this.requireJob(jobId);
    if (["invoiced", "paid", "cancelled"].includes(job.status)) throw new ConflictError(`Job is ${job.status}; quoting is closed`, "JOB_LOCKED");
    const parsedScope = parseJobScope(job.scope);
    if (!parsedScope.tvs.length && !parsedScope.extras.length && !parsedScope.items.length) throw new ConflictError("Add at least one item before quoting", "EMPTY_SCOPE");

    const stored = await this.getActiveConfig();
    const context = await this.resolveContext(job.context);
    const snapshot = snapshotQuote({ scope: parsedScope, context, config: stored.config, adjustment });
    const createdAt = this.now().toISOString();

    let quote = job.currentQuoteId ? await this.store.getQuote(job.currentQuoteId) : null;
    if (quote?.status === "accepted" && !reopen) throw new ConflictError("This quote was accepted by the customer. Pass reopen=true to create a revised version.", "QUOTE_ACCEPTED");
    if (!quote) {
      quote = await this.store.createQuote(jobId);
      await this.store.updateJob(jobId, { currentQuoteId: quote.id });
    } else if (quote.status === "accepted" || quote.status === "sent") {
      quote = await this.store.setQuoteStatus(quote.id, "draft");
    }

    const prior = await this.store.listQuoteVersions(quote.id);
    const version = await this.store.addQuoteVersion(quote.id, {
      snapshot,
      customerView: toCustomerView(snapshot.composition, { version: prior.length + 1, createdAt }),
      customerAmountCents: snapshot.composition.customerTotalCents,
      recommendedCents: snapshot.composition.pricing.recommendedCents,
      floorCents: snapshot.composition.pricing.floorCents,
      discountCents: snapshot.composition.discountAppliedCents,
      adjustment: snapshot.composition.adjustment,
      configVersion: stored.version,
      engineVersion: snapshot.engineVersion,
      snapshotHash: snapshot.snapshotHash,
    });
    await this.store.saveEstimates({
      jobId,
      quoteVersionId: version.id,
      travel: snapshot.composition.pricing.travel,
      travelSource: snapshot.composition.pricing.travel.source,
      materialLines: snapshot.composition.pricing.materials.lines,
      materialCostCents: snapshot.composition.pricing.materials.costCents,
      materialChargeCents: snapshot.composition.pricing.materials.chargeCents,
    });
    if (job.status === "lead" || job.status === "scoped") await this.store.updateJob(jobId, { status: "quoted" });
    return { quote, version };
  }

  async markQuoteSent(quoteId: string) {
    const quote = await this.store.getQuote(quoteId);
    if (!quote) throw new NotFoundError("Quote");
    if (quote.status === "accepted") throw new ConflictError("Quote already accepted", "QUOTE_ACCEPTED");
    return this.store.setQuoteStatus(quoteId, "sent");
  }

  /** Public, token-addressed, customer-safe view of the latest version. */
  async getCustomerQuote(shareToken: string): Promise<{ view: CustomerQuoteView; status: QuoteRecord["status"] }> {
    const quote = await this.store.getQuoteByShareToken(shareToken);
    if (!quote || quote.status === "draft") throw new NotFoundError("Quote");
    const versions = await this.store.listQuoteVersions(quote.id);
    const latest = quote.acceptedVersionId ? versions.find((v) => v.id === quote.acceptedVersionId) ?? versions[versions.length - 1] : versions[versions.length - 1];
    if (!latest) throw new NotFoundError("Quote");
    return { view: assertCustomerSafe(latest.customerView), status: quote.status };
  }

  async acceptCustomerQuote(shareToken: string): Promise<{ view: CustomerQuoteView; status: QuoteRecord["status"] }> {
    const quote = await this.store.getQuoteByShareToken(shareToken);
    if (!quote || quote.status === "draft") throw new NotFoundError("Quote");
    if (quote.status === "accepted") return this.getCustomerQuote(shareToken);
    if (quote.status !== "sent") throw new ConflictError("Quote cannot be accepted in its current state", "QUOTE_NOT_ACCEPTABLE");
    const versions = await this.store.listQuoteVersions(quote.id);
    const latest = versions[versions.length - 1];
    if (!latest) throw new NotFoundError("Quote");
    await this.store.markVersionAccepted(latest.id, this.now().toISOString());
    await this.store.setQuoteStatus(quote.id, "accepted", latest.id);
    return this.getCustomerQuote(shareToken);
  }

  // ---------------------------------------------------------------- actuals
  async recordActuals(jobId: string, input: unknown) {
    const job = await this.requireJob(jobId);
    const actuals = jobActualsInputSchema.parse(input);
    const quote = job.currentQuoteId ? await this.store.getQuote(job.currentQuoteId) : null;
    const versions = quote ? await this.store.listQuoteVersions(quote.id) : [];
    const basis = (quote?.acceptedVersionId && versions.find((v) => v.id === quote.acceptedVersionId)) || versions[versions.length - 1] || null;
    let profitability = null;
    let configVersion: number | null = null;
    if (basis) {
      // Profitability uses the config the quote was made under for assumptions that define the estimate,
      // and the active config for actual-cost valuation (fuel/vehicle/owner time) so owners see today's costs.
      const active = await this.getActiveConfig();
      profitability = computeProfitability({ snapshot: basis.snapshot, customerQuotedCents: basis.customerAmountCents, actuals, config: active.config });
      configVersion = active.version;
    }
    const record = await this.store.upsertActuals({ jobId, quoteVersionId: basis?.id ?? null, actuals, profitability, configVersion });
    if (["lead", "scoped", "quoted", "scheduled", "in_progress"].includes(job.status)) await this.store.updateJob(jobId, { status: "completed" });
    return record;
  }

  async getProfitability(jobId: string) {
    await this.requireJob(jobId);
    const a = await this.store.getActuals(jobId);
    if (!a) throw new NotFoundError("Actuals");
    return a;
  }

  // ---------------------------------------------------------------- invoices
  async createInvoice(jobId: string, input: unknown): Promise<InvoiceRecord> {
    const job = await this.requireJob(jobId);
    const { lines, discountCents, dueDate, notes } = invoiceRequestSchema.parse(input ?? {});
    const config = (await this.getActiveConfig()).config;
    let invoiceLines = lines;
    let quoteVersionId: string | null = null;
    const quote = job.currentQuoteId ? await this.store.getQuote(job.currentQuoteId) : null;
    if (quote) {
      const versions = await this.store.listQuoteVersions(quote.id);
      const basis = (quote.acceptedVersionId && versions.find((v) => v.id === quote.acceptedVersionId)) || versions[versions.length - 1];
      quoteVersionId = basis?.id ?? null;
      if (!invoiceLines && basis) {
        // Invoice from the customer-facing lines only; unpriced "custom quote" lines are not billable.
        invoiceLines = basis.customerView.lines.filter((l) => l.amountCents !== null).map((l) => ({ description: l.detail ? `${l.detail}: ${l.label}` : l.label, qty: 1, unitCents: l.amountCents as number }));
      }
    }
    if (!invoiceLines?.length) throw new ConflictError("No billable lines. Provide lines or create a quote first.", "NO_LINES");
    const totals = computeInvoiceTotals(invoiceLines, discountCents, config);
    const invoice = await this.store.createInvoice({
      jobId,
      quoteVersionId,
      lines: invoiceLines,
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      taxConfigSnapshot: config.business.tax,
      year: this.now().getUTCFullYear(),
      dueDate: dueDate ?? addDays(localDate(this.now().toISOString()), config.documents.invoiceDueDays),
      notes: notes?.trim() || null,
    });
    await this.store.updateJob(jobId, { status: "invoiced" });
    return invoice;
  }

  async sendInvoice(invoiceId: string) {
    const inv = await this.store.getInvoice(invoiceId);
    if (!inv) throw new NotFoundError("Invoice");
    if (inv.status === "void") throw new InvoicePolicyError("Invoice is void", "INVOICE_VOID");
    return this.store.setInvoiceSent(invoiceId, this.now().toISOString());
  }

  async voidInvoice(invoiceId: string) {
    const inv = await this.store.getInvoice(invoiceId);
    if (!inv) throw new NotFoundError("Invoice");
    if (inv.paidCents > 0) throw new InvoicePolicyError("Cannot void an invoice with recorded payments", "HAS_PAYMENTS");
    return this.store.voidInvoice(invoiceId, this.now().toISOString());
  }

  async recordPayment(invoiceId: string, input: unknown) {
    const p = paymentInputSchema.parse(input);
    const inv = await this.store.getInvoice(invoiceId);
    if (!inv) throw new NotFoundError("Invoice");
    assertPaymentAllowed({ status: inv.status, balanceCents: inv.totalCents - inv.paidCents, amountCents: p.amountCents });
    const result = await this.store.recordPayment(invoiceId, { amountCents: p.amountCents, method: p.method, tipCents: p.tipCents, reference: p.reference ?? null, receivedAt: p.receivedAt ?? this.now().toISOString() });
    if (result.invoice.status === "paid") await this.store.updateJob(inv.jobId, { status: "paid" });
    return { ...result, balanceCents: result.invoice.totalCents - result.invoice.paidCents };
  }

  // ---------------------------------------------------------------- intelligence
  async completedRecords(): Promise<CompletedJobRecord[]> {
    const rows = await this.store.listActuals();
    const out: CompletedJobRecord[] = [];
    for (const a of rows) {
      if (!a.quoteVersionId) continue;
      const job = await this.store.getJob(a.jobId);
      const version = await this.store.getQuoteVersion(a.quoteVersionId);
      if (!job || !version) continue;
      const est = version.snapshot.composition.pricing;
      out.push({
        jobId: job.id,
        synthetic: job.source === "synthetic",
        signature: scopeSignature(parseJobScope(job.scope)),
        estimateLaborMinutes: est.labor.minutes,
        actualLaborMinutes: a.actuals.laborMinutes,
        estimateTravelMinutes: est.travel.roundTripDriveMinutes,
        actualTravelMinutes: a.actuals.travelMinutes,
        estimateMaterialsCents: est.materials.costCents,
        actualMaterialsCents: a.actuals.actualMaterialsCents,
        quotedCents: version.customerAmountCents,
        collectedCents: a.actuals.collectedCents,
        costToServeCents: est.costToServeCents,
        actualOutOfPocketCents: a.profitability?.actualOutOfPocketCents ?? 0,
        actualOwnerMinutes: a.profitability?.actualOwnerMinutes ?? a.actuals.laborMinutes + a.actuals.travelMinutes,
      });
    }
    return out;
  }

  /** Per-item records (any action/category) from actuals that carry per-item minutes. */
  async completedItemRecords(): Promise<CompletedItemRecord[]> {
    const rows = await this.store.listActuals();
    const out: CompletedItemRecord[] = [];
    for (const a of rows) {
      if (!a.quoteVersionId || !a.actuals.items?.length) continue;
      const job = await this.store.getJob(a.jobId);
      const version = await this.store.getQuoteVersion(a.quoteVersionId);
      if (!job || !version) continue;
      const scope = parseJobScope(version.snapshot.scope);
      const results = version.snapshot.composition.pricing.work?.items ?? [];
      for (const act of a.actuals.items) {
        const item = scope.items.find((i) => i.id === act.itemId);
        const est = results.find((r) => r.itemId === act.itemId);
        if (!item || !est || act.actualMinutes === undefined) continue;
        out.push({
          jobId: job.id,
          itemId: item.id,
          synthetic: job.source === "synthetic",
          action: item.action,
          thenAction: item.thenAction ?? null,
          category: item.category,
          templateId: item.templateId ?? null,
          band: est.bandKey,
          surface: item.environment.surface,
          complexity: itemComplexity(item),
          quantity: item.quantity,
          estimateMinutes: est.minutes,
          actualMinutes: act.actualMinutes,
        });
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- work templates (config data, no code or migration)
  private async mutateWorkConfig(mutate: (work: EconomicsConfig["work"]) => EconomicsConfig["work"], actor: string, reason: string) {
    const current = await this.getActiveConfig();
    const work = mutate(JSON.parse(JSON.stringify(current.config.work)) as EconomicsConfig["work"]);
    return this.updateConfig({ config: { ...current.config, work }, reason }, actor);
  }

  /** Create or replace an owner template. Validated against the work schema (recipes must exist). */
  async upsertWorkTemplate(id: string, template: unknown, actor: string, reason?: string) {
    const slug = z.string().regex(/^[a-z0-9_]{1,40}$/).parse(id);
    const parsed = workTemplateSchema.parse(template);
    return this.mutateWorkConfig((w) => ({ ...w, templates: { ...w.templates, [slug]: parsed } }), actor, reason ?? `template ${slug} saved`);
  }

  async deleteWorkTemplate(id: string, actor: string) {
    const slug = z.string().regex(/^[a-z0-9_]{1,40}$/).parse(id);
    const current = await this.getActiveConfig();
    if (!current.config.work.templates[slug]) throw new NotFoundError("Template");
    return this.mutateWorkConfig((w) => {
      const { [slug]: _removed, ...rest } = w.templates;
      return { ...w, templates: rest };
    }, actor, `template ${slug} removed`);
  }

  /** Add or replace a taxonomy category, so a new kind of item needs only config. */
  async upsertWorkCategory(id: string, category: unknown, actor: string) {
    const slug = z.string().regex(/^[a-z0-9_]{1,40}$/).parse(id);
    const parsed = categorySchema.parse(category);
    return this.mutateWorkConfig((w) => ({ ...w, categories: { ...w.categories, [slug]: parsed } }), actor, `category ${slug} saved`);
  }

  async intelligence(opts: { includeSynthetic?: boolean; comparableTo?: string } = {}) {
    const records = await this.completedRecords();
    const itemReport = buildItemIntelligence(await this.completedItemRecords(), opts);
    const report = buildIntelligence(records, { ...opts, targetOwnerHourlyCents: (await this.getActiveConfig()).config.labor.targetLaborPerHourCents });
    let comparable: ReturnType<typeof findComparableJobs> = [];
    if (opts.comparableTo) {
      const job = await this.requireJob(opts.comparableTo);
      comparable = findComparableJobs(scopeSignature(parseJobScope(job.scope)), records, 5, opts);
    }
    return { report, comparable, itemReport };
  }

  // ---------------------------------------------------------------- public /quote pricing + shadow mode
  /**
   * Price the public QuoteTool request. Customer-safe output only.
   *  - legacy / shadow: the customer price is exactly the existing catalog total (same as the browser calculator).
   *  - dynamic: the customer price is the engine recommendation (or "we'll review" when review is required).
   * In shadow and dynamic mode a "review"-stage request also stores an owner-only comparison sample.
   */
  async publicPrice(input: unknown): Promise<PublicPriceResponse> {
    const req = publicQuoteRequestSchema.parse(input);
    const stored = await this.getActiveConfig();
    const cfg = stored.config;
    const catalog = catalogPublicQuote(req);
    const scope = publicRequestToScope(req);
    const context = await this.resolveContext(req.form.zipCode ? { zip: req.form.zipCode } : {});

    let composition: ReturnType<typeof composeQuote> | null = null;
    let gate: "NOT_SUPPORTED" | "MANUAL_REVIEW_REQUIRED" | null = null;
    try {
      composition = composeQuote({ scope, context, config: cfg });
    } catch (e) {
      if (!(e instanceof QuotePolicyError) || (e.code !== "NOT_SUPPORTED" && e.code !== "MANUAL_REVIEW_REQUIRED")) throw e;
      gate = e.code;
    }
    const pricing: PricingResult = composition?.pricing ?? priceScope(scope, context, cfg);

    let response: PublicPriceResponse;
    if (cfg.pricingMode !== "dynamic") {
      response = { source: "catalog", totalCents: catalog.totalCents };
    } else if (!composition || pricing.empty) {
      response = {
        source: "engine",
        totalCents: null,
        status: "review",
        lines: [],
        notes: [gate === "NOT_SUPPORTED" ? "Part of this request is outside the work we install. We'll follow up with options." : "We need to review a few details before we can confirm a price."],
      };
    } else {
      const view = toCustomerView(composition, { version: 0, createdAt: this.now().toISOString() });
      response = { source: "engine", totalCents: view.totalCents, status: pricing.status === "priced" ? "firm" : "estimate", lines: view.lines, notes: view.notes };
    }
    assertCustomerSafe(response);

    if (req.stage === "review" && cfg.pricingMode !== "legacy" && !pricing.empty) {
      const shownCents = response.totalCents ?? catalog.totalCents;
      const at = (p: number) => {
        const e = economicsAtPrice(pricing, p);
        return { helperCostCents: e.helperCostCents, costToServeCents: e.costToServeCents, ownerNetCents: e.ownerNetCents, marginPct: Number(e.marginPct.toFixed(4)), effectivePerHourCents: e.effectiveGrossPerHourCents };
      };
      const summary: ShadowSampleSummary = {
        shownSource: response.source,
        catalogHasCustomQuoteLines: catalog.hasCustomQuoteLines,
        premiumCents: pricing.premiumCents,
        confidence: pricing.confidence,
        complexity: pricing.premium.complexity,
        premiumPct: pricing.premium.pct,
        premiumFactors: pricing.premium.factors.map((f) => f.label),
        onsiteMinutes: pricing.labor.minutes,
        totalOwnerMinutes: pricing.totalOwnerMinutes,
        helperMinutes: pricing.labor.helperMinutes,
        materialsCostCents: pricing.materials.costCents,
        travelCostCents: pricing.travel.costCents,
        travelSource: pricing.travel.source,
        overheadCents: pricing.overheadCents,
        atShown: at(shownCents),
        atRecommended: at(pricing.recommendedCents),
        flags: pricing.flags.slice(0, 30),
        questions: pricing.questions.map((q) => q.question).slice(0, 30),
        why: pricing.why.slice(0, 30),
        engineVersion: pricing.engineVersion,
      };
      // Same choices on the same day = one sample (TV ids are random per browser session, so they are not hashed).
      const canonical = { ...scope, tvs: scope.tvs.map((t, i) => ({ ...t, id: `tv-${i + 1}` })) };
      await this.store.recordShadowSample({
        day: this.now().toISOString().slice(0, 10),
        sampleKey: hashObject({ scope: stableStringify(canonical), zip: req.form.zipCode, config: cfg.version, mode: cfg.pricingMode }),
        source: "public_quote",
        zip: req.form.zipCode || null,
        configVersion: cfg.version,
        pricingMode: cfg.pricingMode,
        shownCents,
        recommendedCents: pricing.recommendedCents,
        floorCents: pricing.floorCents,
        status: pricing.status,
        scope: canonical,
        context,
        summary,
      });
    }
    return response;
  }

  async publicPriceSource(): Promise<{ source: "catalog" | "engine" }> {
    const cfg = (await this.getActiveConfig()).config;
    return { source: cfg.pricingMode === "dynamic" ? "engine" : "catalog" };
  }

  /** Owner-only: recent shadow samples plus a plain comparison of catalog vs engine. */
  async shadowReport(limit = 100) {
    const samples = await this.store.listShadowSamples(Math.min(500, Math.max(1, limit)));
    const median = (xs: number[]) => {
      if (!xs.length) return null;
      const a = xs.slice().sort((x, y) => x - y);
      const m = Math.floor(a.length / 2);
      return a.length % 2 ? a[m]! : Math.round((a[m - 1]! + a[m]!) / 2);
    };
    const comparable = samples.filter((x) => !x.summary.catalogHasCustomQuoteLines);
    const statusCounts: Record<string, number> = {};
    for (const x of samples) statusCounts[x.status] = (statusCounts[x.status] ?? 0) + 1;
    return {
      samples,
      stats: {
        count: samples.length,
        comparableCount: comparable.length,
        shownBelowFloor: comparable.filter((x) => x.shownCents < x.floorCents).length,
        shownBelowRecommended: comparable.filter((x) => x.shownCents < x.recommendedCents).length,
        medianShownCents: median(comparable.map((x) => x.shownCents)),
        medianRecommendedCents: median(comparable.map((x) => x.recommendedCents)),
        medianGapCents: median(comparable.map((x) => x.recommendedCents - x.shownCents)),
        medianEffectivePerHourAtShownCents: median(comparable.map((x) => x.summary.atShown.effectivePerHourCents)),
        statusCounts,
      },
      note: "Advisory only. Samples with custom-quote lines are excluded from comparisons because the catalog total leaves that work unpriced.",
    };
  }

  /** Owner-only: turn a public quote sample into a Job (the quote becomes a job; contact details stay with the booking/request). */
  async createJobFromShadowSample(id: string): Promise<JobRecord> {
    const sample = await this.store.getShadowSample(id);
    if (!sample) throw new NotFoundError("Shadow sample");
    if (sample.jobId) throw new ConflictError("A job was already created from this quote.", "ALREADY_CONVERTED");
    const job = await this.createJob({
      title: `Website quote ${sample.zip ?? ""} ${sample.day}`.replace(/\s+/g, " ").trim(),
      zip: sample.zip,
      source: "quote_tool",
      scope: sample.scope,
      context: sample.context,
    });
    await this.store.linkShadowSampleJob(id, job.id);
    return job;
  }

  // ---------------------------------------------------------------- customer documents
  /** Booking details are canonical; the job's own contact is used only when no booking is linked. */
  private async contactFor(job: JobRecord): Promise<JobContact | null> {
    if (job.bookingId && this.opts.lookupBookingContact) {
      const booking = await this.opts.lookupBookingContact(job.bookingId);
      if (booking) return booking;
    }
    return job.contact ?? null;
  }

  async setJobContact(jobId: string, input: unknown): Promise<JobRecord> {
    await this.requireJob(jobId);
    const contact = jobContactSchema.parse(input);
    return this.store.updateJob(jobId, { contact });
  }

  private async estimateFor(quote: QuoteRecord, opts: { version?: number; includeContact: boolean }): Promise<CustomerDocument> {
    const versions = await this.store.listQuoteVersions(quote.id);
    const version =
      (opts.version !== undefined ? versions.find((v) => v.version === opts.version) : undefined) ??
      (opts.version === undefined && quote.acceptedVersionId ? versions.find((v) => v.id === quote.acceptedVersionId) : undefined) ??
      (opts.version === undefined ? versions[versions.length - 1] : undefined);
    if (!version) throw new NotFoundError("Quote version");
    const job = await this.requireJob(quote.jobId);
    const quoteNumber = quote.quoteNumber ?? (await this.store.assignQuoteNumber(quote.id));
    // A saved version keeps its tax, expiration, deposit and terms even after owner settings change.
    const storedConfig = (await this.store.listConfigVersions()).find((c) => c.version === version.configVersion);
    if (!storedConfig) throw new ConflictError("Estimate settings are unavailable. Please ask us to review this quote.", "DOCUMENT_CONFIG_UNAVAILABLE");
    const config = validateEconomicsConfig(storedConfig.config);
    return assertDocumentSafe(buildEstimateDocument({ quote: { ...quote, quoteNumber }, version, job, contact: await this.contactFor(job), config, includeContact: opts.includeContact }));
  }

  /** Owner: estimate document for a quote (latest or accepted version unless one is named). */
  async estimateDocument(quoteId: string, opts: { version?: number } = {}): Promise<CustomerDocument> {
    const quote = await this.store.getQuote(quoteId);
    if (!quote) throw new NotFoundError("Quote");
    return this.estimateFor(quote, { ...opts, includeContact: true });
  }

  /** Customer (share link): the version they can see, without phone/email. Drafts are never available. */
  async customerEstimateDocument(shareToken: string): Promise<CustomerDocument> {
    const quote = await this.store.getQuoteByShareToken(shareToken);
    if (!quote || quote.status === "draft") throw new NotFoundError("Quote");
    return this.estimateFor(quote, { includeContact: false });
  }

  private async invoiceArgs(invoiceId: string) {
    const invoice = await this.store.getInvoice(invoiceId);
    if (!invoice) throw new NotFoundError("Invoice");
    const job = await this.requireJob(invoice.jobId);
    return { invoice, payments: await this.store.listPayments(invoiceId), job, contact: await this.contactFor(job), config: (await this.getActiveConfig()).config, includeContact: true };
  }

  async invoiceDocument(invoiceId: string): Promise<CustomerDocument> {
    return assertDocumentSafe(buildInvoiceDocument(await this.invoiceArgs(invoiceId)));
  }

  async receiptDocument(invoiceId: string): Promise<CustomerDocument> {
    return assertDocumentSafe(buildReceiptDocument(await this.invoiceArgs(invoiceId)));
  }

  // ---------------------------------------------------------------- AI intake
  async parseIntake(message: string, opts: { allowAi: boolean }): Promise<{ draft: ScopeDraft; cached: boolean; downgraded: string[]; aiUsed: boolean }> {
    const r = await this.textIntake(z.string().min(5).max(4_000).parse(message), opts);
    return { draft: r.draft, cached: r.cached, downgraded: r.downgraded, aiUsed: r.aiUsed };
  }

  /** Text intake (heuristic, or AI when allowed). Returns the structured intake as well as its draft. */
  private async textIntake(clean: string, opts: { allowAi: boolean }): Promise<{ intake: AiScopeIntake; draft: ScopeDraft; cached: boolean; downgraded: string[]; aiUsed: boolean; calls: number; escalationReason: string | null }> {
    const normalized = clean.toLowerCase().replace(/\s+/g, " ").trim();
    const provider = this.opts.intakeProvider;
    const aiUsable = opts.allowAi && !!provider && provider.enabled();
    const active = await this.getActiveConfig();
    const work = active.config.work;

    // Rules first. Unknown facts are intentionally left for confirmation; they are not a reason
    // to pay a model to guess. Escalate only when the rules could not identify the work (or only
    // found a custom taxonomy item that AI may be able to map safely).
    let intake = heuristicIntake(clean, work);
    const aiEscalated = aiUsable && shouldEscalateHeuristicIntake(intake, clean);
    // The taxonomy (category keywords) is config, so the cache key includes the config version.
    // Version the gate mode so older "AI always" cache entries cannot force a paid-AI result.
    const hash = hashObject({ m: normalized, mode: aiEscalated ? "ai-fallback-v1" : "heuristic-v2", v: active.version });

    const cached = await this.store.getIntakeCache(hash);
    if (cached) {
      const cachedIntake = parseIntakeResponse(JSON.stringify(cached.intake));
      return { intake: cachedIntake, draft: intakeToScopeDraft(cachedIntake, cached.source, work), cached: true, downgraded: [], aiUsed: cached.source === "ai", calls: 0, escalationReason: cached.source === "ai" ? "unrecognized work (cached)" : null };
    }

    let source: "ai" | "heuristic" = "heuristic";
    if (aiEscalated && provider) {
      try {
        intake = parseIntakeResponse(await provider.complete(buildIntakePrompt(clean, work)));
        source = "ai";
      } catch (err) {
        // Invalid or failed AI output never reaches pricing; fall back to the deterministic parser.
        console.warn(`[jobos] AI intake failed (${(err as Error).name}); using heuristic parser`);
      }
    }
    const verified = verifyEvidence(intake, clean);
    await this.store.putIntakeCache({ inputHash: hash, source, intake: verified.intake });
    return { intake: verified.intake, draft: intakeToScopeDraft(verified.intake, source, work), cached: false, downgraded: verified.downgraded, aiUsed: source === "ai", calls: aiEscalated ? 1 : 0, escalationReason: aiEscalated ? "unrecognized work" : null };
  }

  // ---------------------------------------------------------------- private media + unified intake
  private media(): MediaStorage {
    if (!this.opts.media?.enabled) throw new ConflictError("Photo storage is unavailable. Continue with text or manual entry.", "MEDIA_NOT_CONFIGURED");
    return this.opts.media;
  }

  intakeStatus() {
    const m = this.opts.media;
    return { media: { kind: m?.kind ?? "disabled", enabled: m?.enabled ?? false, durable: m?.durable ?? false, reason: m ? m.reason : "Photo storage is not configured." }, ocrEnabled: this.opts.ocr?.enabled() ?? false, visionEnabled: this.opts.vision?.enabled() ?? false };
  }

  async intakeMetrics() {
    const sessions = await this.store.listIntakeSessions(100);
    const metrics = sessions.map((s) => (s.proposal as { metrics?: IntakeMetrics } | null)?.metrics).filter((m): m is IntakeMetrics => !!m);
    const ai = metrics.filter((m) => m.aiAssisted).length;
    return { sampleCount: metrics.length, zeroAiPercent: metrics.length ? Math.round(100 * (metrics.length - ai) / metrics.length) : null, aiAssistedPercent: metrics.length ? Math.round(100 * ai / metrics.length) : null, calls: metrics.reduce((n, m) => n + m.totalTextCalls + m.totalVisionCalls, 0) };
  }

  /** Confirmations apply only to the image set and proposal that were actually reviewed. */
  private async invalidateIntakeReview(intakeId: string | null) {
    if (!intakeId) return;
    const session = await this.store.getIntakeSession(intakeId);
    if (session) await this.store.updateIntakeSession(intakeId, { review: null, status: session.status === "linked" ? "linked" : "open" });
  }

  /** Store one image privately (validated, metadata stripped). Creates the intake on first upload. */
  async uploadMedia(input: { intakeId?: string | null; jobId?: string | null; hint?: string; data: Buffer; source: "owner" | "customer" }): Promise<{ intakeId: string; media: MediaSummary }> {
    const storage = this.media();
    const hint = z.enum(MEDIA_HINTS).catch("other").parse(input.hint ?? "photo");
    let session = input.intakeId ? await this.store.getIntakeSession(input.intakeId) : null;
    if (input.intakeId && (!session || session.source !== input.source)) throw new NotFoundError("Intake");
    if (session && this.analyzing.has(session.id)) throw new ConflictError("This intake is being read.", "INTAKE_BUSY");
    if (input.jobId) await this.requireJob(input.jobId);
    if (!session) session = await this.store.createIntakeSession({ source: input.source });
    const existing = await this.store.listMedia({ intakeId: session.id });
    const limit = input.source === "customer" ? MAX_CUSTOMER_IMAGES : MAX_OWNER_IMAGES;
    if (existing.length >= limit) throw new ConflictError(`Up to ${limit} images per intake.`, "TOO_MANY_IMAGES");
    const img = await normalizeImage(input.data);
    const dup = existing.find((m) => m.sha256 === img.sha256);
    if (dup) return { intakeId: session.id, media: mediaSummary(dup) };
    const id = randomUUID();
    const day = this.now().toISOString().slice(0, 7).replace("-", "/");
    const storageKey = `${input.source}/${day}/${id}.jpg`;
    const thumbKey = `${input.source}/${day}/${id}.t.jpg`;
    await storage.put(storageKey, img.data, "image/jpeg");
    await storage.put(thumbKey, img.thumb, "image/jpeg");
    const rec = await this.store.createMedia({
      id,
      intakeId: session.id,
      jobId: input.jobId ?? session.jobId ?? null,
      source: input.source,
      hint,
      contentType: "image/jpeg",
      bytes: img.data.length,
      width: img.width,
      height: img.height,
      sha256: img.sha256,
      storageKey,
      thumbKey,
    });
    await this.invalidateIntakeReview(session.id);
    return { intakeId: session.id, media: mediaSummary(rec) };
  }

  /** Owner-only bytes. Customer uploads are never served back through a public URL. */
  async getMediaBytes(id: string, variant: "full" | "thumb"): Promise<Buffer> {
    const rec = await this.store.getMedia(id);
    if (!rec || rec.deletedAt) throw new NotFoundError("Media");
    const bytes = await this.media().get(variant === "thumb" ? rec.thumbKey : rec.storageKey);
    if (!bytes) throw new NotFoundError("Media");
    return bytes;
  }

  async deleteMedia(id: string): Promise<void> {
    const rec = await this.store.getMedia(id);
    if (!rec || rec.deletedAt) throw new NotFoundError("Media");
    if (rec.intakeId && this.analyzing.has(rec.intakeId)) throw new ConflictError("This intake is being read.", "INTAKE_BUSY");
    await this.media().delete(rec.storageKey);
    await this.media().delete(rec.thumbKey);
    await this.store.updateMedia(id, { deletedAt: this.now().toISOString(), analysis: null });
    await this.invalidateIntakeReview(rec.intakeId);
  }

  async setMediaHint(id: string, hint: unknown): Promise<MediaSummary> {
    const rec = await this.store.getMedia(id);
    if (!rec || rec.deletedAt || rec.source !== "owner") throw new NotFoundError("Media");
    if (rec.intakeId && this.analyzing.has(rec.intakeId)) throw new ConflictError("This intake is being read.", "INTAKE_BUSY");
    const next = z.enum(MEDIA_HINTS).parse(hint);
    if (next === rec.hint) return mediaSummary(rec);
    const updated = await this.store.updateMedia(id, { hint: next, analysisStatus: "pending", analysis: null, analysisError: null, provider: null, model: null, schemaVersion: null, analyzedAt: null });
    await this.invalidateIntakeReview(rec.intakeId);
    return mediaSummary(updated);
  }

  async listMediaFor(filter: { intakeId?: string; jobId?: string }): Promise<MediaSummary[]> {
    return (await this.store.listMedia(filter)).map(mediaSummary);
  }

  /**
   * Analyze an intake: images through the vision provider (if configured), visible text plus the typed/pasted/voice
   * message through the text intake, merged deterministically into one reviewable proposal. Never prices anything,
   * never fails because vision is missing or broken: manual quoting always works.
   */
  async analyzeIntake(input: { intakeId?: string | null; message?: string; allowAi: boolean; source: "owner" | "customer" }) {
    const active = await this.getActiveConfig();
    const work = active.config.work;
    let session = input.intakeId ? await this.store.getIntakeSession(input.intakeId) : null;
    if (input.intakeId && (!session || session.source !== input.source)) throw new NotFoundError("Intake");
    if (!session) session = await this.store.createIntakeSession({ source: input.source });
    const message = (input.message ?? "").slice(0, 4_000);
    const media = await this.store.listMedia({ intakeId: session.id });

    if (this.analyzing.has(session.id)) throw new ConflictError("This intake is being read. Try again shortly.", "INTAKE_BUSY");
    this.analyzing.add(session.id);
    try {
    session = (await this.store.getIntakeSession(session.id))!;
    const previous = (session.proposal as { metrics?: IntakeMetrics } | null)?.metrics;
    const metrics: IntakeMetrics = { ocrImages: 0, cachedImages: media.filter((m) => m.analysisStatus === "analyzed").length, newImages: 0, textCached: false, textCalls: 0, visionCalls: 0, totalTextCalls: previous?.totalTextCalls ?? 0, totalVisionCalls: previous?.totalVisionCalls ?? (media.some((m) => m.provider && m.provider !== "tesseract") ? 1 : 0), aiAssisted: previous?.aiAssisted ?? false, provider: previous?.provider ?? null, model: previous?.model ?? null, escalationReason: null, estimatedCostUsd: null };
    // OCR first for text-heavy images, cached by sanitized content hash and reader version.
    const ocr = this.opts.ocr;
    for (const m of media.filter((m) => m.analysisStatus !== "analyzed" && textImageHint(m.hint))) {
      const cached = await this.store.findCachedMediaAnalysis(m.sha256, m.hint, OCR_SCHEMA_VERSION);
      let obs: ImageObservation | null = cached?.analysis ? { ...(cached.analysis as ImageObservation), imageId: m.id } : null;
      if (obs) metrics.cachedImages++;
      else if (ocr?.enabled()) {
        try {
          const bytes = await this.media().get(m.storageKey);
          if (bytes) obs = ocrObservation(m.id, m.hint, await ocr.read(bytes));
        } catch { /* OCR failure leaves text/manual entry and the optional vision fallback available. */ }
      }
      if (obs) {
        metrics.ocrImages++;
        await this.store.updateMedia(m.id, { analysisStatus: "analyzed", analysisError: null, analysis: obs, provider: ocr?.name ?? "tesseract", model: ocr?.model ?? "eng-lstm-7", schemaVersion: OCR_SCHEMA_VERSION, analyzedAt: this.now().toISOString() });
      }
    }
    // One paid vision batch per intake, including failed attempts. Re-reading does not spend again.
    const vision = this.opts.vision ?? null;
    const visionAvailable = !!vision && vision.enabled();
    // Reuse prior paid observations for identical sanitized content, provider/model and taxonomy.
    const visionVersion = `v2-${hashObject({ schema: VISION_SCHEMA_VERSION, config: active.version, provider: vision?.name, model: vision?.model }).slice(0, 16)}`;
    for (const m of (await this.store.listMedia({ intakeId: session.id })).filter((m) => m.analysisStatus !== "analyzed")) {
      const cached = await this.store.findCachedMediaAnalysis(m.sha256, m.hint, visionVersion);
      if (cached?.analysis) {
        const obs = { ...(cached.analysis as ImageObservation), imageId: m.id };
        metrics.cachedImages++;
        metrics.aiAssisted = true;
        metrics.provider = cached.provider;
        metrics.model = cached.model;
        await this.store.updateMedia(m.id, { analysisStatus: "analyzed", analysisError: null, analysis: obs, provider: cached.provider, model: cached.model, schemaVersion: visionVersion, analyzedAt: this.now().toISOString() });
      }
    }
    let visionError: string | null = null;
    const afterOcr = await this.store.listMedia({ intakeId: session.id });
    const todo = afterOcr.filter((m) => m.analysisStatus !== "analyzed");
    const mayUseVision = visionAvailable && input.allowAi && metrics.totalVisionCalls === 0;
    if (todo.length && mayUseVision) {
      const batch = todo.slice(0, 8);
      const images: VisionImage[] = [];
      for (const m of batch) {
        try {
          const bytes = await this.media().get(m.storageKey);
          if (!bytes) throw new Error("MEDIA_BYTES_UNAVAILABLE");
          images.push({ id: m.id, jpeg: await visionCopy(bytes), hint: m.hint });
        } catch {
          // Old ephemeral uploads or a provider outage must not prevent text/manual quoting or spend AI calls.
          visionError = "Some images could not be read from storage. Continue with text or manual review.";
          await this.store.updateMedia(m.id, { analysisStatus: "skipped", analysisError: visionError });
        }
      }
      if (images.length) {
      metrics.visionCalls = 1;
      metrics.totalVisionCalls++;
      metrics.aiAssisted = true;
      metrics.newImages = images.length;
      metrics.provider = vision!.name;
      metrics.model = vision!.model;
      metrics.escalationReason = "room photo or OCR did not yield reliable text";
      // Reserve before the network call so a failure/restart cannot silently repeat a paid request.
      await this.store.updateIntakeSession(session.id, { proposal: { ...(session.proposal as object ?? {}), metrics } });
      const result = await runVision(vision, images, work);
      const at = this.now().toISOString();
      for (const m of batch) {
        if (result.status === "analyzed") {
          const raw = result.result.images.find((x) => x.imageId === m.id) ?? null;
          // Namespaced refs preserve same-TV grouping within the original batch without merging unrelated cached batches.
          const ref = (r: string) => createHash("sha256").update(`${session!.id}:${r}`).digest("hex").slice(0, 16);
          const obs = raw ? { ...raw, tvs: raw.tvs.map((tv) => ({ ...tv, ref: ref(tv.ref) })), items: raw.items.map((item) => ({ ...item, ref: ref(item.ref) })) } : null;
          await this.store.updateMedia(m.id, { analysisStatus: obs ? "analyzed" : "failed", analysisError: obs ? null : "no observations returned", analysis: obs, provider: vision!.name, model: vision!.model, schemaVersion: visionVersion, analyzedAt: at });
        } else {
          visionError = result.error;
          await this.store.updateMedia(m.id, { analysisStatus: result.status, analysisError: result.error.slice(0, 120) });
        }
      }
      }
      if (todo.length > 8) visionError = "One image-analysis batch was used. Review the remaining images manually.";
    } else if (todo.length) {
      visionError = metrics.totalVisionCalls ? "Image-analysis allowance was already used. Review remaining images manually." : "Paid image reading is off or unavailable. Use the message and manual review.";
      for (const m of todo) await this.store.updateMedia(m.id, { analysisStatus: "skipped", analysisError: visionError });
    }
    const fresh = await this.store.listMedia({ intakeId: session.id });
    const observations = fresh.filter((m) => m.analysisStatus === "analyzed" && m.analysis).map((m) => m.analysis as ImageObservation);
    const images: ImageAnalysisResult | null = observations.length ? { images: observations, notes: [] } : null;

    const { text, extractedText } = combineIntakeText(message, images);
    const textSide = text.trim().length >= 5 ? await this.textIntake(text, { allowAi: input.allowAi }) : null;
    metrics.textCalls = textSide?.calls ?? 0;
    metrics.totalTextCalls += metrics.textCalls;
    metrics.textCached = textSide?.cached ?? false;
    metrics.aiAssisted ||= !!textSide?.aiUsed || metrics.textCalls > 0;
    if (metrics.textCalls || textSide?.aiUsed) {
      metrics.provider = this.opts.intakeProvider?.name ?? metrics.provider;
      metrics.model = this.opts.intakeProvider?.model ?? metrics.model;
      metrics.escalationReason ??= textSide?.escalationReason ?? null;
    }
    metrics.estimatedCostUsd = metrics.aiAssisted ? null : 0;
    const proposal = buildUnifiedProposal(
      { textIntake: textSide?.intake ?? null, textDraft: textSide?.draft ?? null, textSource: "text", images, extractedText },
      work,
    );
    if (metrics.ocrImages || fresh.some((m) => m.schemaVersion === OCR_SCHEMA_VERSION)) {
      proposal.requiresOcrConfirmation = true;
      // OCR is evidence to review, never a customer's confirmed statement.
      proposal.tvs.forEach((tv, i) => { for (const [key, f] of Object.entries(tv.facts)) {
        if (f && (!f.observation || !message.toLowerCase().includes(f.observation.replace(/[“”]/g, "").toLowerCase()))) {
          f.requiresConfirmation = true;
          const factKey = `tvs.${i}.${key}`;
          if (!proposal.questions.some((q) => q.factKey === factKey)) proposal.questions.push({ factKey, owner: `Confirm TV ${i + 1} ${key} against the image.`, customer: `Please confirm TV ${i + 1} ${key}.` });
        }
      }
      });
      for (const f of Object.values(proposal.access)) if (f) f.requiresConfirmation = true;
      // Receipts stay reference text; OCR never infers purchases or price arithmetic.
      const referenceText = fresh.filter((m) => m.schemaVersion === OCR_SCHEMA_VERSION).map((m) => (m.analysis as ImageObservation)?.text).filter(Boolean).join("\n");
      proposal.extractedText = referenceText.slice(0, 4000);
    }
    await this.store.updateIntakeSession(session.id, { proposal: { ...proposal, metrics }, review: null, messageChars: message.length, status: session.status === "linked" ? "linked" : "open" });
    return {
      intakeId: session.id,
      proposal,
      images: fresh.map(mediaSummary),
      vision: { available: visionAvailable, provider: visionAvailable ? vision!.name : null, error: visionError },
      textUsedAi: textSide?.aiUsed ?? false,
      metrics,
    };
    } finally { this.analyzing.delete(session.id); }
  }

  /** Apply the reviewer's decisions: only confirmed facts become scope. Stores the decisions for learning. */
  async reviewIntake(intakeId: string, input: unknown, source: "owner" | "customer" = "owner") {
    const session = await this.store.getIntakeSession(intakeId);
    if (!session || session.source !== source || !session.proposal) throw new NotFoundError("Intake");
    if (this.analyzing.has(intakeId)) throw new ConflictError("This intake is being read. Review the new proposal first.", "INTAKE_BUSY");
    const review = reviewDecisionsSchema.parse(input ?? {});
    if ((session.proposal as UnifiedProposal).requiresOcrConfirmation && !review.confirmExtractedText) throw new ConflictError("Check the extracted text, counts and actions against the images first.", "OCR_REVIEW_REQUIRED");
    const result = proposalToScope(session.proposal as UnifiedProposal, review);
    await this.store.updateIntakeSession(intakeId, { review: { ...review, applied: result.applied, pending: result.pending, at: this.now().toISOString() }, status: session.status === "linked" ? "linked" : "reviewed" });
    return result;
  }

  /** Attach an intake's images (and the intake) to a job. */
  async linkIntakeToJob(intakeId: string, jobId: string) {
    const session = await this.store.getIntakeSession(intakeId);
    if (!session) throw new NotFoundError("Intake");
    await this.requireJob(jobId);
    for (const m of await this.store.listMedia({ intakeId })) await this.store.updateMedia(m.id, { jobId });
    await this.store.updateIntakeSession(intakeId, { jobId, status: "linked" });
  }
}

export const MAX_OWNER_IMAGES = 12;
export const MAX_CUSTOMER_IMAGES = 6;

/** What callers may see about an image: never the storage key or the raw analysis provider payload. */
export interface MediaSummary {
  id: string;
  hint: string;
  width: number;
  height: number;
  bytes: number;
  analysisStatus: string;
  kind: string | null;
  summary: string | null;
  createdAt: string;
}
function mediaSummary(m: MediaRecord): MediaSummary {
  const a = m.analysis as ImageObservation | null;
  return { id: m.id, hint: m.hint, width: m.width, height: m.height, bytes: m.bytes, analysisStatus: m.analysisStatus, kind: a?.kind ?? null, summary: a?.summary ?? null, createdAt: m.createdAt };
}

export type PublicPriceResponse =
  | { source: "catalog"; totalCents: number }
  | { source: "engine"; totalCents: number | null; status: "firm" | "estimate" | "review"; lines: Array<{ label: string; detail?: string; amountCents: number | null }>; notes: string[] };

export function hashMessage(message: string) {
  return createHash("sha256").update(message).digest("hex").slice(0, 16);
}

export { QuotePolicyError, InvoicePolicyError, NotFoundError, priceScope };
export type { JobContextInput };
