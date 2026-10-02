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
  verifyEvidence,
  type CompletedItemRecord,
  type CompletedJobRecord,
  type ScopeDraft,
} from "@shared/jobos";
import { hashObject } from "@shared/pricing/hash";
import type { InvoiceRecord, JobRecord, QuoteRecord, QuoteVersionRecord, ShadowSampleRecord, ShadowSampleSummary, StoredConfig } from "@shared/jobos/types";
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
});

export const quoteRequestSchema = z.object({
  adjustment: z.unknown().optional(),
  /** Required to add a version to a quote the customer already accepted. */
  reopen: z.boolean().optional(),
});

export const invoiceRequestSchema = z.object({
  lines: z.array(invoiceLineSchema).min(1).max(30).optional(),
  discountCents: z.number().int().min(0).max(10_000_000).default(0),
});

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

  constructor(
    private readonly store: JobOsStore,
    private readonly opts: { intakeProvider?: IntakeProvider | null; now?: () => Date; configCacheMs?: number; routeProviders?: RouteProvider[] } = {},
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
      return { composition, gate: null, pricing: composition.pricing, packages: buildPackages(s) as CustomerPackage[], configVersion: cfg.version, pricingMode: cfg.pricingMode };
    } catch (e) {
      if (!(e instanceof QuotePolicyError) || (e.code !== "NOT_SUPPORTED" && e.code !== "MANUAL_REVIEW_REQUIRED")) throw e;
      const pricing = priceScope(s, c, cfg);
      return { composition: null, gate: { code: e.code, message: e.message }, pricing, packages: [] as CustomerPackage[], configVersion: cfg.version, pricingMode: cfg.pricingMode };
    }
  }

  // ---------------------------------------------------------------- jobs
  async createJob(input: unknown): Promise<JobRecord> {
    const data = createJobSchema.parse(input);
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
    return { job, quote, versions, invoices, payments, actuals };
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
    const { lines, discountCents } = invoiceRequestSchema.parse(input ?? {});
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
    const report = buildIntelligence(records, opts);
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

  // ---------------------------------------------------------------- AI intake
  async parseIntake(message: string, opts: { allowAi: boolean }): Promise<{ draft: ScopeDraft; cached: boolean; downgraded: string[]; aiUsed: boolean }> {
    const clean = z.string().min(5).max(4_000).parse(message);
    const normalized = clean.toLowerCase().replace(/\s+/g, " ").trim();
    const provider = this.opts.intakeProvider;
    const aiUsable = opts.allowAi && !!provider && provider.enabled();
    const active = await this.getActiveConfig();
    const work = active.config.work;
    // The taxonomy (category keywords) is config, so the cache key includes the config version.
    const hash = hashObject({ m: normalized, mode: aiUsable ? "ai" : "heuristic", v: active.version });

    const cached = await this.store.getIntakeCache(hash);
    if (cached) {
      const intake = parseIntakeResponse(JSON.stringify(cached.intake));
      return { draft: intakeToScopeDraft(intake, cached.source, work), cached: true, downgraded: [], aiUsed: cached.source === "ai" };
    }

    let source: "ai" | "heuristic" = "heuristic";
    let intake = heuristicIntake(clean, work);
    if (aiUsable && provider) {
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
    return { draft: intakeToScopeDraft(verified.intake, source, work), cached: false, downgraded: verified.downgraded, aiUsed: source === "ai" };
  }
}

export type PublicPriceResponse =
  | { source: "catalog"; totalCents: number }
  | { source: "engine"; totalCents: number | null; status: "firm" | "estimate" | "review"; lines: Array<{ label: string; detail?: string; amountCents: number | null }>; notes: string[] };

export function hashMessage(message: string) {
  return createHash("sha256").update(message).digest("hex").slice(0, 16);
}

export { QuotePolicyError, InvoicePolicyError, NotFoundError, priceScope };
export type { JobContextInput };
