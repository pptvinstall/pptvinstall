import { randomUUID } from "node:crypto";
import type { ConfigEvent, IntakeCacheRecord, InvoiceRecord, JobActualsRecord, JobRecord, PaymentRecord, QuoteRecord, QuoteVersionRecord, StoredConfig } from "@shared/jobos/types";
import { deriveInvoiceStatus, formatInvoiceNumber } from "@shared/jobos/invoice";
import { NotFoundError, type JobOsStore, type NewInvoice, type NewJob, type NewPayment, type NewQuoteVersion, type JobPatch } from "./store";

const now = () => new Date().toISOString();
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export class MemoryJobOsStore implements JobOsStore {
  private configs: StoredConfig[] = [];
  private events: ConfigEvent[] = [];
  private jobs = new Map<string, JobRecord>();
  private scopeItems = new Map<string, Array<{ kind: string; attributes: unknown }>>();
  private quotes = new Map<string, QuoteRecord>();
  private versions = new Map<string, QuoteVersionRecord>();
  private estimates: unknown[] = [];
  private invoices = new Map<string, InvoiceRecord>();
  private payments = new Map<string, PaymentRecord[]>();
  private counters = new Map<number, number>();
  private actuals = new Map<string, JobActualsRecord>();
  private intake = new Map<string, IntakeCacheRecord>();
  private eventSeq = 0;
  private configSeq = 0;

  async getActiveConfig() {
    const active = this.configs.find((c) => c.isActive);
    return active ? clone(active) : null;
  }
  async listConfigVersions() {
    return clone([...this.configs].sort((a, b) => b.version - a.version));
  }
  async saveConfigVersion(args: Parameters<JobOsStore["saveConfigVersion"]>[0]) {
    const version = Math.max(0, ...this.configs.map((c) => c.version)) + 1;
    if (args.activate) this.configs.forEach((c) => (c.isActive = false));
    const rec: StoredConfig = {
      id: ++this.configSeq,
      version,
      name: args.name,
      isActive: args.activate,
      config: clone({ ...args.config, version }),
      createdAt: now(),
      createdBy: args.actor,
      changeReason: args.reason,
      changedPaths: args.changedPaths,
    };
    this.configs.push(rec);
    this.events.push({ id: ++this.eventSeq, version, action: version === 1 ? "seeded" : "created", actor: args.actor, at: now(), details: args.reason });
    if (args.activate) this.events.push({ id: ++this.eventSeq, version, action: "activated", actor: args.actor, at: now(), details: null });
    return clone(rec);
  }
  async activateConfigVersion(version: number, actor: string) {
    const target = this.configs.find((c) => c.version === version);
    if (!target) throw new NotFoundError(`Config version ${version}`);
    this.configs.forEach((c) => (c.isActive = false));
    target.isActive = true;
    this.events.push({ id: ++this.eventSeq, version, action: "activated", actor, at: now(), details: null });
    return clone(target);
  }
  async listConfigEvents(limit = 100) {
    return clone([...this.events].reverse().slice(0, limit));
  }

  async createJob(job: NewJob) {
    const t = now();
    const rec: JobRecord = {
      id: randomUUID(),
      status: job.status ?? "lead",
      title: job.title,
      customerLabel: job.customerLabel ?? null,
      zip: job.zip ?? null,
      bookingId: job.bookingId ?? null,
      customerId: job.customerId ?? null,
      crmContactId: job.crmContactId ?? null,
      source: job.source,
      scheduledFor: job.scheduledFor ?? null,
      scope: clone(job.scope),
      context: clone(job.context),
      currentQuoteId: null,
      notes: job.notes ?? null,
      createdAt: t,
      updatedAt: t,
    };
    this.jobs.set(rec.id, rec);
    return clone(rec);
  }
  async getJob(id: string) {
    const j = this.jobs.get(id);
    return j ? clone(j) : null;
  }
  async listJobs(opts: { status?: JobRecord["status"]; limit?: number } = {}) {
    return clone(Array.from(this.jobs.values()).filter((j) => !opts.status || j.status === opts.status).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, opts.limit ?? 100));
  }
  async updateJob(id: string, patch: JobPatch) {
    const j = this.jobs.get(id);
    if (!j) throw new NotFoundError("Job");
    Object.assign(j, clone(patch), { updatedAt: now() });
    return clone(j);
  }
  async replaceScopeItems(jobId: string, items: Array<{ kind: "tv" | "extra" | "item"; attributes: unknown }>) {
    this.scopeItems.set(jobId, clone(items));
  }
  getScopeItemsForTest(jobId: string) {
    return this.scopeItems.get(jobId) ?? [];
  }

  async createQuote(jobId: string) {
    if (!this.jobs.has(jobId)) throw new NotFoundError("Job");
    const q: QuoteRecord = { id: randomUUID(), jobId, status: "draft", shareToken: randomUUID(), acceptedVersionId: null, createdAt: now() };
    this.quotes.set(q.id, q);
    return clone(q);
  }
  async getQuote(id: string) {
    const q = this.quotes.get(id);
    return q ? clone(q) : null;
  }
  async getQuoteByShareToken(token: string) {
    const q = Array.from(this.quotes.values()).find((x) => x.shareToken === token);
    return q ? clone(q) : null;
  }
  async setQuoteStatus(id: string, status: QuoteRecord["status"], acceptedVersionId?: string | null) {
    const q = this.quotes.get(id);
    if (!q) throw new NotFoundError("Quote");
    q.status = status;
    if (acceptedVersionId !== undefined) q.acceptedVersionId = acceptedVersionId;
    return clone(q);
  }
  async addQuoteVersion(quoteId: string, v: NewQuoteVersion) {
    if (!this.quotes.has(quoteId)) throw new NotFoundError("Quote");
    const existing = Array.from(this.versions.values()).filter((x) => x.quoteId === quoteId);
    const rec: QuoteVersionRecord = { ...clone(v), id: randomUUID(), quoteId, version: existing.length + 1, createdAt: now(), acceptedAt: null };
    this.versions.set(rec.id, rec);
    return clone(rec);
  }
  async getQuoteVersion(id: string) {
    const v = this.versions.get(id);
    return v ? clone(v) : null;
  }
  async listQuoteVersions(quoteId: string) {
    return clone(Array.from(this.versions.values()).filter((v) => v.quoteId === quoteId).sort((a, b) => a.version - b.version));
  }
  async markVersionAccepted(versionId: string, at: string) {
    const v = this.versions.get(versionId);
    if (!v) throw new NotFoundError("Quote version");
    v.acceptedAt = at; // the ONLY permitted mutation of a quote version
    return clone(v);
  }
  async saveEstimates(args: Parameters<JobOsStore["saveEstimates"]>[0]) {
    this.estimates.push(clone(args));
  }
  estimateCountForTest() {
    return this.estimates.length;
  }

  async createInvoice(inv: NewInvoice) {
    const seq = (this.counters.get(inv.year) ?? 0) + 1;
    this.counters.set(inv.year, seq);
    const rec: InvoiceRecord = {
      id: randomUUID(),
      jobId: inv.jobId,
      quoteVersionId: inv.quoteVersionId,
      invoiceNumber: formatInvoiceNumber(inv.year, seq),
      status: "draft",
      lines: clone(inv.lines),
      subtotalCents: inv.subtotalCents,
      discountCents: inv.discountCents,
      taxCents: inv.taxCents,
      totalCents: inv.totalCents,
      paidCents: 0,
      taxConfigSnapshot: clone(inv.taxConfigSnapshot),
      sentAt: null,
      voidedAt: null,
      createdAt: now(),
    };
    this.invoices.set(rec.id, rec);
    return clone(rec);
  }
  async getInvoice(id: string) {
    const i = this.invoices.get(id);
    return i ? clone(i) : null;
  }
  async listInvoicesForJob(jobId: string) {
    return clone(Array.from(this.invoices.values()).filter((i) => i.jobId === jobId));
  }
  async setInvoiceSent(id: string, at: string) {
    const i = this.invoices.get(id);
    if (!i) throw new NotFoundError("Invoice");
    i.sentAt = at;
    i.status = deriveInvoiceStatus({ totalCents: i.totalCents, paidCents: i.paidCents, voided: !!i.voidedAt, sent: true });
    return clone(i);
  }
  async voidInvoice(id: string, at: string) {
    const i = this.invoices.get(id);
    if (!i) throw new NotFoundError("Invoice");
    i.voidedAt = at;
    i.status = "void";
    return clone(i);
  }
  async recordPayment(invoiceId: string, p: NewPayment) {
    const i = this.invoices.get(invoiceId);
    if (!i) throw new NotFoundError("Invoice");
    const rec: PaymentRecord = { id: randomUUID(), invoiceId, amountCents: p.amountCents, method: p.method, tipCents: p.tipCents, reference: p.reference, receivedAt: p.receivedAt, createdAt: now() };
    this.payments.set(invoiceId, [...(this.payments.get(invoiceId) ?? []), rec]);
    i.paidCents += p.amountCents;
    i.status = deriveInvoiceStatus({ totalCents: i.totalCents, paidCents: i.paidCents, voided: !!i.voidedAt, sent: !!i.sentAt || i.paidCents > 0 });
    return { invoice: clone(i), payment: clone(rec) };
  }
  async listPayments(invoiceId: string) {
    return clone(this.payments.get(invoiceId) ?? []);
  }

  async upsertActuals(args: Parameters<JobOsStore["upsertActuals"]>[0]) {
    const existing = this.actuals.get(args.jobId);
    const t = now();
    const rec: JobActualsRecord = {
      id: existing?.id ?? randomUUID(),
      jobId: args.jobId,
      quoteVersionId: args.quoteVersionId,
      actuals: clone(args.actuals),
      profitability: args.profitability ? clone(args.profitability) : null,
      configVersion: args.configVersion,
      createdAt: existing?.createdAt ?? t,
      updatedAt: t,
    };
    this.actuals.set(args.jobId, rec);
    return clone(rec);
  }
  async getActuals(jobId: string) {
    const a = this.actuals.get(jobId);
    return a ? clone(a) : null;
  }
  async listActuals() {
    return clone(Array.from(this.actuals.values()));
  }

  async getIntakeCache(hash: string) {
    const r = this.intake.get(hash);
    if (!r) return null;
    r.hits += 1;
    return clone(r);
  }
  async putIntakeCache(rec: { inputHash: string; source: "ai" | "heuristic"; intake: unknown }) {
    this.intake.set(rec.inputHash, { ...clone(rec), createdAt: now(), hits: 0 });
  }
}
