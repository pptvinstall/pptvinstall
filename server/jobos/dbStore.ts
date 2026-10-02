import { and, desc, eq, sql } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as s from "@shared/jobos-schema";
import type { ConfigEvent, IntakeCacheRecord, IntakeSessionRecord, InvoiceRecord, JobActualsRecord, JobRecord, MediaRecord, PaymentRecord, QuoteRecord, QuoteVersionRecord, ShadowSampleRecord, StoredConfig } from "@shared/jobos/types";
import { deriveInvoiceStatus, formatInvoiceNumber } from "@shared/jobos/invoice";
import { NotFoundError, type JobOsStore, type JobPatch, type NewInvoice, type NewJob, type NewPayment, type NewQuoteVersion } from "./store";

// Postgres implementation. Works with any Drizzle pg driver (neon-serverless in production,
// pglite in tests). Quote versions are insert-only; the only UPDATE is accepted_at.

type Db = PgDatabase<PgQueryResultHKT, any>;

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

const toMedia = (r: typeof s.jobMedia.$inferSelect): MediaRecord => ({
  id: r.id,
  intakeId: r.intakeId,
  jobId: r.jobId,
  source: r.source as MediaRecord["source"],
  hint: r.hint as MediaRecord["hint"],
  contentType: "image/jpeg",
  bytes: r.bytes,
  width: r.width,
  height: r.height,
  sha256: r.sha256,
  storageKey: r.storageKey,
  thumbKey: r.thumbKey,
  analysisStatus: r.analysisStatus as MediaRecord["analysisStatus"],
  analysisError: r.analysisError,
  analysis: r.analysis ?? null,
  provider: r.provider,
  model: r.model,
  schemaVersion: r.schemaVersion,
  analyzedAt: iso(r.analyzedAt),
  createdAt: r.createdAt.toISOString(),
  deletedAt: iso(r.deletedAt),
});

const toSession = (r: typeof s.intakeSessions.$inferSelect): IntakeSessionRecord => ({
  id: r.id,
  source: r.source as IntakeSessionRecord["source"],
  jobId: r.jobId,
  status: r.status as IntakeSessionRecord["status"],
  proposal: r.proposal ?? null,
  review: r.review ?? null,
  messageChars: r.messageChars,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const toShadow = (r: typeof s.pricingShadowSamples.$inferSelect): ShadowSampleRecord => ({
  id: r.id,
  day: r.day,
  sampleKey: r.sampleKey,
  source: r.source as ShadowSampleRecord["source"],
  zip: r.zip,
  configVersion: r.configVersion,
  pricingMode: r.pricingMode,
  shownCents: r.shownCents,
  recommendedCents: r.recommendedCents,
  floorCents: r.floorCents,
  status: r.status,
  scope: r.scope,
  context: r.context,
  summary: r.summary as ShadowSampleRecord["summary"],
  jobId: r.jobId,
  createdAt: r.createdAt.toISOString(),
});

const toJob = (r: typeof s.jobs.$inferSelect): JobRecord => ({
  id: r.id,
  status: r.status as JobRecord["status"],
  title: r.title,
  customerLabel: r.customerLabel,
  zip: r.zip,
  bookingId: r.bookingId,
  customerId: r.customerId,
  crmContactId: r.crmContactId,
  source: r.source as JobRecord["source"],
  scheduledFor: iso(r.scheduledFor),
  scope: r.scope as JobRecord["scope"],
  context: r.context as JobRecord["context"],
  currentQuoteId: r.currentQuoteId,
  notes: r.notes,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

const toQuote = (r: typeof s.quotes.$inferSelect): QuoteRecord => ({
  id: r.id,
  jobId: r.jobId,
  status: r.status as QuoteRecord["status"],
  shareToken: r.shareToken,
  acceptedVersionId: r.acceptedVersionId,
  createdAt: r.createdAt.toISOString(),
});

const toVersion = (r: typeof s.quoteVersions.$inferSelect): QuoteVersionRecord => ({
  id: r.id,
  quoteId: r.quoteId,
  version: r.version,
  snapshot: r.snapshot as QuoteVersionRecord["snapshot"],
  customerView: r.customerView as QuoteVersionRecord["customerView"],
  customerAmountCents: r.customerAmountCents,
  recommendedCents: r.recommendedCents,
  floorCents: r.floorCents,
  discountCents: r.discountCents,
  adjustment: r.adjustment ?? null,
  configVersion: r.configVersion,
  engineVersion: r.engineVersion,
  snapshotHash: r.snapshotHash,
  createdAt: r.createdAt.toISOString(),
  acceptedAt: iso(r.acceptedAt),
});

const toInvoice = (r: typeof s.invoices.$inferSelect): InvoiceRecord => ({
  id: r.id,
  jobId: r.jobId,
  quoteVersionId: r.quoteVersionId,
  invoiceNumber: r.invoiceNumber,
  status: r.status as InvoiceRecord["status"],
  lines: r.lines as InvoiceRecord["lines"],
  subtotalCents: r.subtotalCents,
  discountCents: r.discountCents,
  taxCents: r.taxCents,
  totalCents: r.totalCents,
  paidCents: r.paidCents,
  taxConfigSnapshot: r.taxConfigSnapshot as InvoiceRecord["taxConfigSnapshot"],
  sentAt: iso(r.sentAt),
  voidedAt: iso(r.voidedAt),
  createdAt: r.createdAt.toISOString(),
});

const toPayment = (r: typeof s.payments.$inferSelect): PaymentRecord => ({
  id: r.id,
  invoiceId: r.invoiceId,
  amountCents: r.amountCents,
  method: r.method as PaymentRecord["method"],
  tipCents: r.tipCents,
  reference: r.reference,
  receivedAt: r.receivedAt.toISOString(),
  createdAt: r.createdAt.toISOString(),
});

const toConfig = (r: typeof s.pricingConfigs.$inferSelect): StoredConfig => ({
  id: r.id,
  version: r.version,
  name: r.name,
  isActive: r.isActive,
  config: r.config as StoredConfig["config"],
  createdAt: r.createdAt.toISOString(),
  createdBy: r.createdBy,
  changeReason: r.changeReason,
  changedPaths: (r.changedPaths as string[]) ?? [],
});

const toActuals = (r: typeof s.jobActuals.$inferSelect): JobActualsRecord => ({
  id: r.id,
  jobId: r.jobId,
  quoteVersionId: r.quoteVersionId,
  actuals: r.actuals as JobActualsRecord["actuals"],
  profitability: (r.profitability as JobActualsRecord["profitability"]) ?? null,
  configVersion: r.configVersion,
  createdAt: r.createdAt.toISOString(),
  updatedAt: r.updatedAt.toISOString(),
});

export class DbJobOsStore implements JobOsStore {
  constructor(private readonly db: Db) {}

  async getActiveConfig() {
    const [row] = await this.db.select().from(s.pricingConfigs).where(eq(s.pricingConfigs.isActive, true)).limit(1);
    return row ? toConfig(row) : null;
  }
  async listConfigVersions() {
    const rows = await this.db.select().from(s.pricingConfigs).orderBy(desc(s.pricingConfigs.version));
    return rows.map(toConfig);
  }
  async saveConfigVersion(args: Parameters<JobOsStore["saveConfigVersion"]>[0]) {
    return this.db.transaction(async (tx) => {
      const [{ max }] = (await tx.select({ max: sql<number>`coalesce(max(${s.pricingConfigs.version}), 0)` }).from(s.pricingConfigs)) as Array<{ max: number }>;
      const version = Number(max) + 1;
      if (args.activate) await tx.update(s.pricingConfigs).set({ isActive: false }).where(eq(s.pricingConfigs.isActive, true));
      const [row] = await tx
        .insert(s.pricingConfigs)
        .values({ version, name: args.name, config: { ...args.config, version }, isActive: args.activate, createdBy: args.actor, changeReason: args.reason, changedPaths: args.changedPaths })
        .returning();
      await tx.insert(s.pricingConfigEvents).values({ version, action: version === 1 ? "seeded" : "created", actor: args.actor, details: args.reason });
      if (args.activate) await tx.insert(s.pricingConfigEvents).values({ version, action: "activated", actor: args.actor });
      return toConfig(row!);
    });
  }
  async activateConfigVersion(version: number, actor: string) {
    return this.db.transaction(async (tx) => {
      const [target] = await tx.select().from(s.pricingConfigs).where(eq(s.pricingConfigs.version, version)).limit(1);
      if (!target) throw new NotFoundError(`Config version ${version}`);
      await tx.update(s.pricingConfigs).set({ isActive: false }).where(eq(s.pricingConfigs.isActive, true));
      const [row] = await tx.update(s.pricingConfigs).set({ isActive: true }).where(eq(s.pricingConfigs.version, version)).returning();
      await tx.insert(s.pricingConfigEvents).values({ version, action: "activated", actor });
      return toConfig(row!);
    });
  }
  async listConfigEvents(limit = 100) {
    const rows = await this.db.select().from(s.pricingConfigEvents).orderBy(desc(s.pricingConfigEvents.id)).limit(limit);
    return rows.map((r): ConfigEvent => ({ id: r.id, version: r.version, action: r.action as ConfigEvent["action"], actor: r.actor, at: r.at.toISOString(), details: r.details }));
  }

  async createJob(job: NewJob) {
    const [row] = await this.db
      .insert(s.jobs)
      .values({
        status: job.status ?? "lead",
        title: job.title,
        customerLabel: job.customerLabel ?? null,
        zip: job.zip ?? null,
        bookingId: job.bookingId ?? null,
        customerId: job.customerId ?? null,
        crmContactId: job.crmContactId ?? null,
        source: job.source,
        scheduledFor: job.scheduledFor ? new Date(job.scheduledFor) : null,
        scope: job.scope,
        context: job.context,
        notes: job.notes ?? null,
      })
      .returning();
    return toJob(row!);
  }
  async getJob(id: string) {
    const [row] = await this.db.select().from(s.jobs).where(eq(s.jobs.id, id)).limit(1);
    return row ? toJob(row) : null;
  }
  async listJobs(opts: { status?: JobRecord["status"]; limit?: number } = {}) {
    const q = this.db.select().from(s.jobs);
    const rows = await (opts.status ? q.where(eq(s.jobs.status, opts.status)) : q).orderBy(desc(s.jobs.createdAt)).limit(opts.limit ?? 100);
    return rows.map(toJob);
  }
  async updateJob(id: string, patch: JobPatch) {
    const { scheduledFor, ...rest } = patch;
    const set: Record<string, unknown> = { ...rest, updatedAt: new Date() };
    if (scheduledFor !== undefined) set.scheduledFor = scheduledFor ? new Date(scheduledFor) : null;
    const [row] = await this.db.update(s.jobs).set(set).where(eq(s.jobs.id, id)).returning();
    if (!row) throw new NotFoundError("Job");
    return toJob(row);
  }
  async replaceScopeItems(jobId: string, items: Array<{ kind: "tv" | "extra" | "item"; attributes: unknown }>) {
    await this.db.transaction(async (tx) => {
      await tx.delete(s.scopeItems).where(eq(s.scopeItems.jobId, jobId));
      if (items.length) await tx.insert(s.scopeItems).values(items.map((it, position) => ({ jobId, kind: it.kind, position, attributes: it.attributes })));
    });
  }

  async createQuote(jobId: string) {
    const [row] = await this.db.insert(s.quotes).values({ jobId }).returning();
    return toQuote(row!);
  }
  async getQuote(id: string) {
    const [row] = await this.db.select().from(s.quotes).where(eq(s.quotes.id, id)).limit(1);
    return row ? toQuote(row) : null;
  }
  async getQuoteByShareToken(token: string) {
    const [row] = await this.db.select().from(s.quotes).where(eq(s.quotes.shareToken, token)).limit(1);
    return row ? toQuote(row) : null;
  }
  async setQuoteStatus(id: string, status: QuoteRecord["status"], acceptedVersionId?: string | null) {
    const set: Record<string, unknown> = { status };
    if (acceptedVersionId !== undefined) set.acceptedVersionId = acceptedVersionId;
    const [row] = await this.db.update(s.quotes).set(set).where(eq(s.quotes.id, id)).returning();
    if (!row) throw new NotFoundError("Quote");
    return toQuote(row);
  }
  async addQuoteVersion(quoteId: string, v: NewQuoteVersion) {
    return this.db.transaction(async (tx) => {
      const [{ max }] = (await tx.select({ max: sql<number>`coalesce(max(${s.quoteVersions.version}), 0)` }).from(s.quoteVersions).where(eq(s.quoteVersions.quoteId, quoteId))) as Array<{ max: number }>;
      const [row] = await tx
        .insert(s.quoteVersions)
        .values({
          quoteId,
          version: Number(max) + 1,
          snapshot: v.snapshot,
          customerView: v.customerView,
          customerAmountCents: v.customerAmountCents,
          recommendedCents: v.recommendedCents,
          floorCents: v.floorCents,
          discountCents: v.discountCents,
          adjustment: v.adjustment,
          configVersion: v.configVersion,
          engineVersion: v.engineVersion,
          snapshotHash: v.snapshotHash,
        })
        .returning();
      return toVersion(row!);
    });
  }
  async getQuoteVersion(id: string) {
    const [row] = await this.db.select().from(s.quoteVersions).where(eq(s.quoteVersions.id, id)).limit(1);
    return row ? toVersion(row) : null;
  }
  async listQuoteVersions(quoteId: string) {
    const rows = await this.db.select().from(s.quoteVersions).where(eq(s.quoteVersions.quoteId, quoteId)).orderBy(s.quoteVersions.version);
    return rows.map(toVersion);
  }
  async markVersionAccepted(versionId: string, at: string) {
    const [row] = await this.db.update(s.quoteVersions).set({ acceptedAt: new Date(at) }).where(eq(s.quoteVersions.id, versionId)).returning();
    if (!row) throw new NotFoundError("Quote version");
    return toVersion(row);
  }
  async saveEstimates(args: Parameters<JobOsStore["saveEstimates"]>[0]) {
    await this.db.transaction(async (tx) => {
      await tx.insert(s.travelEstimates).values({ jobId: args.jobId, quoteVersionId: args.quoteVersionId, data: args.travel, source: args.travelSource });
      await tx.insert(s.materialEstimates).values({ jobId: args.jobId, quoteVersionId: args.quoteVersionId, lines: args.materialLines, costCents: args.materialCostCents, chargeCents: args.materialChargeCents });
    });
  }

  async createInvoice(inv: NewInvoice) {
    return this.db.transaction(async (tx) => {
      const [counter] = await tx
        .insert(s.invoiceCounters)
        .values({ year: inv.year, lastSeq: 1 })
        .onConflictDoUpdate({ target: s.invoiceCounters.year, set: { lastSeq: sql`${s.invoiceCounters.lastSeq} + 1` } })
        .returning();
      const [row] = await tx
        .insert(s.invoices)
        .values({
          jobId: inv.jobId,
          quoteVersionId: inv.quoteVersionId,
          invoiceNumber: formatInvoiceNumber(inv.year, counter!.lastSeq),
          lines: inv.lines,
          subtotalCents: inv.subtotalCents,
          discountCents: inv.discountCents,
          taxCents: inv.taxCents,
          totalCents: inv.totalCents,
          taxConfigSnapshot: inv.taxConfigSnapshot,
        })
        .returning();
      return toInvoice(row!);
    });
  }
  async getInvoice(id: string) {
    const [row] = await this.db.select().from(s.invoices).where(eq(s.invoices.id, id)).limit(1);
    return row ? toInvoice(row) : null;
  }
  async listInvoicesForJob(jobId: string) {
    const rows = await this.db.select().from(s.invoices).where(eq(s.invoices.jobId, jobId)).orderBy(s.invoices.createdAt);
    return rows.map(toInvoice);
  }
  async setInvoiceSent(id: string, at: string) {
    const cur = await this.getInvoice(id);
    if (!cur) throw new NotFoundError("Invoice");
    const status = deriveInvoiceStatus({ totalCents: cur.totalCents, paidCents: cur.paidCents, voided: !!cur.voidedAt, sent: true });
    const [row] = await this.db.update(s.invoices).set({ sentAt: new Date(at), status }).where(eq(s.invoices.id, id)).returning();
    return toInvoice(row!);
  }
  async voidInvoice(id: string, at: string) {
    const [row] = await this.db.update(s.invoices).set({ voidedAt: new Date(at), status: "void" }).where(eq(s.invoices.id, id)).returning();
    if (!row) throw new NotFoundError("Invoice");
    return toInvoice(row);
  }
  async recordPayment(invoiceId: string, p: NewPayment) {
    return this.db.transaction(async (tx) => {
      const [inv] = await tx.select().from(s.invoices).where(eq(s.invoices.id, invoiceId)).for("update").limit(1);
      if (!inv) throw new NotFoundError("Invoice");
      const [payment] = await tx
        .insert(s.payments)
        .values({ invoiceId, amountCents: p.amountCents, method: p.method, tipCents: p.tipCents, reference: p.reference, receivedAt: new Date(p.receivedAt) })
        .returning();
      const paid = inv.paidCents + p.amountCents;
      const status = deriveInvoiceStatus({ totalCents: inv.totalCents, paidCents: paid, voided: !!inv.voidedAt, sent: !!inv.sentAt || paid > 0 });
      const [updated] = await tx.update(s.invoices).set({ paidCents: paid, status }).where(eq(s.invoices.id, invoiceId)).returning();
      return { invoice: toInvoice(updated!), payment: toPayment(payment!) };
    });
  }
  async listPayments(invoiceId: string) {
    const rows = await this.db.select().from(s.payments).where(eq(s.payments.invoiceId, invoiceId)).orderBy(s.payments.createdAt);
    return rows.map(toPayment);
  }

  async upsertActuals(args: Parameters<JobOsStore["upsertActuals"]>[0]) {
    const [row] = await this.db
      .insert(s.jobActuals)
      .values({ jobId: args.jobId, quoteVersionId: args.quoteVersionId, actuals: args.actuals, profitability: args.profitability, configVersion: args.configVersion })
      .onConflictDoUpdate({
        target: s.jobActuals.jobId,
        set: { quoteVersionId: args.quoteVersionId, actuals: args.actuals, profitability: args.profitability, configVersion: args.configVersion, updatedAt: new Date() },
      })
      .returning();
    return toActuals(row!);
  }
  async getActuals(jobId: string) {
    const [row] = await this.db.select().from(s.jobActuals).where(eq(s.jobActuals.jobId, jobId)).limit(1);
    return row ? toActuals(row) : null;
  }
  async listActuals() {
    const rows = await this.db.select().from(s.jobActuals);
    return rows.map(toActuals);
  }

  async getIntakeCache(hash: string): Promise<IntakeCacheRecord | null> {
    const [row] = await this.db.update(s.aiIntakeCache).set({ hits: sql`${s.aiIntakeCache.hits} + 1` }).where(eq(s.aiIntakeCache.inputHash, hash)).returning();
    return row ? { inputHash: row.inputHash, source: row.source as "ai" | "heuristic", intake: row.intake, createdAt: row.createdAt.toISOString(), hits: row.hits } : null;
  }
  async putIntakeCache(rec: { inputHash: string; source: "ai" | "heuristic"; intake: unknown }) {
    await this.db.insert(s.aiIntakeCache).values(rec).onConflictDoNothing();
  }

  async recordShadowSample(rec: Omit<ShadowSampleRecord, "id" | "createdAt" | "jobId">) {
    const [row] = await this.db.insert(s.pricingShadowSamples).values(rec).onConflictDoNothing().returning();
    return row ? toShadow(row) : null;
  }
  async listShadowSamples(limit: number) {
    const rows = await this.db.select().from(s.pricingShadowSamples).orderBy(desc(s.pricingShadowSamples.createdAt)).limit(limit);
    return rows.map(toShadow);
  }
  async getShadowSample(id: string) {
    const [row] = await this.db.select().from(s.pricingShadowSamples).where(eq(s.pricingShadowSamples.id, id));
    return row ? toShadow(row) : null;
  }
  async linkShadowSampleJob(id: string, jobId: string) {
    const [row] = await this.db.update(s.pricingShadowSamples).set({ jobId }).where(eq(s.pricingShadowSamples.id, id)).returning();
    if (!row) throw new NotFoundError("Shadow sample");
    return toShadow(row);
  }

  async createMedia(rec: Parameters<JobOsStore["createMedia"]>[0]) {
    const [row] = await this.db.insert(s.jobMedia).values(rec).returning();
    return toMedia(row!);
  }
  async getMedia(id: string) {
    const [row] = await this.db.select().from(s.jobMedia).where(eq(s.jobMedia.id, id)).limit(1);
    return row ? toMedia(row) : null;
  }
  async listMedia(filter: { intakeId?: string; jobId?: string }) {
    const conds = [sql`${s.jobMedia.deletedAt} is null`];
    if (filter.intakeId) conds.push(eq(s.jobMedia.intakeId, filter.intakeId));
    if (filter.jobId) conds.push(eq(s.jobMedia.jobId, filter.jobId));
    const rows = await this.db.select().from(s.jobMedia).where(and(...conds)).orderBy(s.jobMedia.createdAt);
    return rows.map(toMedia);
  }
  async updateMedia(id: string, patch: Parameters<JobOsStore["updateMedia"]>[1]) {
    const values: Record<string, unknown> = { ...patch };
    if (patch.analyzedAt !== undefined) values.analyzedAt = patch.analyzedAt ? new Date(patch.analyzedAt) : null;
    if (patch.deletedAt !== undefined) values.deletedAt = patch.deletedAt ? new Date(patch.deletedAt) : null;
    const [row] = await this.db.update(s.jobMedia).set(values).where(eq(s.jobMedia.id, id)).returning();
    if (!row) throw new NotFoundError("Media");
    return toMedia(row);
  }
  async createIntakeSession(rec: { source: IntakeSessionRecord["source"] }) {
    const [row] = await this.db.insert(s.intakeSessions).values({ source: rec.source }).returning();
    return toSession(row!);
  }
  async getIntakeSession(id: string) {
    const [row] = await this.db.select().from(s.intakeSessions).where(eq(s.intakeSessions.id, id)).limit(1);
    return row ? toSession(row) : null;
  }
  async updateIntakeSession(id: string, patch: Parameters<JobOsStore["updateIntakeSession"]>[1]) {
    const [row] = await this.db.update(s.intakeSessions).set({ ...patch, updatedAt: new Date() }).where(eq(s.intakeSessions.id, id)).returning();
    if (!row) throw new NotFoundError("Intake");
    return toSession(row);
  }
  async listIntakeSessions(limit: number) {
    const rows = await this.db.select().from(s.intakeSessions).orderBy(desc(s.intakeSessions.createdAt)).limit(limit);
    return rows.map(toSession);
  }
}
