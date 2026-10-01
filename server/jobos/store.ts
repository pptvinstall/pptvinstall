import type {
  ConfigEvent,
  IntakeCacheRecord,
  InvoiceRecord,
  JobActualsRecord,
  JobRecord,
  JobStatus,
  PaymentRecord,
  QuoteRecord,
  QuoteStatus,
  QuoteVersionRecord,
  StoredConfig,
} from "@shared/jobos/types";
import type { EconomicsConfig } from "@shared/pricing/config";
import type { JobContextInput, JobScopeInput } from "@shared/pricing/scope";

// Persistence boundary for Job OS. Two implementations: MemoryJobOsStore (tests, staging
// test mode, local dev without a database) and DbJobOsStore (Drizzle/Postgres).
// The service layer only talks to this interface.

export type NewJob = {
  title: string;
  customerLabel?: string | null;
  zip?: string | null;
  bookingId?: number | null;
  customerId?: number | null;
  crmContactId?: number | null;
  source: JobRecord["source"];
  scheduledFor?: string | null;
  scope: JobScopeInput;
  context: JobContextInput;
  notes?: string | null;
  status?: JobStatus;
};

export type JobPatch = Partial<Pick<JobRecord, "status" | "title" | "customerLabel" | "zip" | "scheduledFor" | "scope" | "context" | "notes" | "currentQuoteId" | "bookingId" | "customerId" | "crmContactId">>;

export type NewQuoteVersion = Omit<QuoteVersionRecord, "id" | "createdAt" | "acceptedAt" | "version" | "quoteId">;

export interface NewInvoice {
  jobId: string;
  quoteVersionId: string | null;
  lines: InvoiceRecord["lines"];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  taxConfigSnapshot: InvoiceRecord["taxConfigSnapshot"];
  year: number;
}

export interface NewPayment {
  amountCents: number;
  method: PaymentRecord["method"];
  tipCents: number;
  reference: string | null;
  receivedAt: string;
}

export interface JobOsStore {
  // pricing config (versioned, audited)
  getActiveConfig(): Promise<StoredConfig | null>;
  listConfigVersions(): Promise<StoredConfig[]>;
  saveConfigVersion(args: { config: EconomicsConfig; name: string; actor: string; reason: string | null; changedPaths: string[]; activate: boolean }): Promise<StoredConfig>;
  activateConfigVersion(version: number, actor: string): Promise<StoredConfig>;
  listConfigEvents(limit?: number): Promise<ConfigEvent[]>;

  // jobs
  createJob(job: NewJob): Promise<JobRecord>;
  getJob(id: string): Promise<JobRecord | null>;
  listJobs(opts?: { status?: JobStatus; limit?: number }): Promise<JobRecord[]>;
  updateJob(id: string, patch: JobPatch): Promise<JobRecord>;
  replaceScopeItems(jobId: string, items: Array<{ kind: "tv" | "extra" | "item"; attributes: unknown }>): Promise<void>;

  // quotes
  createQuote(jobId: string): Promise<QuoteRecord>;
  getQuote(id: string): Promise<QuoteRecord | null>;
  getQuoteByShareToken(token: string): Promise<QuoteRecord | null>;
  setQuoteStatus(id: string, status: QuoteStatus, acceptedVersionId?: string | null): Promise<QuoteRecord>;
  addQuoteVersion(quoteId: string, version: NewQuoteVersion): Promise<QuoteVersionRecord>;
  getQuoteVersion(id: string): Promise<QuoteVersionRecord | null>;
  listQuoteVersions(quoteId: string): Promise<QuoteVersionRecord[]>;
  markVersionAccepted(versionId: string, at: string): Promise<QuoteVersionRecord>;
  saveEstimates(args: { jobId: string; quoteVersionId: string; travel: unknown; travelSource: string; materialLines: unknown; materialCostCents: number; materialChargeCents: number }): Promise<void>;

  // invoices & payments
  createInvoice(inv: NewInvoice): Promise<InvoiceRecord>;
  getInvoice(id: string): Promise<InvoiceRecord | null>;
  listInvoicesForJob(jobId: string): Promise<InvoiceRecord[]>;
  setInvoiceSent(id: string, at: string): Promise<InvoiceRecord>;
  voidInvoice(id: string, at: string): Promise<InvoiceRecord>;
  /** Atomically records a payment and updates paid_cents/status. Caller has already validated policy. */
  recordPayment(invoiceId: string, payment: NewPayment): Promise<{ invoice: InvoiceRecord; payment: PaymentRecord }>;
  listPayments(invoiceId: string): Promise<PaymentRecord[]>;

  // actuals
  upsertActuals(args: { jobId: string; quoteVersionId: string | null; actuals: JobActualsRecord["actuals"]; profitability: JobActualsRecord["profitability"]; configVersion: number | null }): Promise<JobActualsRecord>;
  getActuals(jobId: string): Promise<JobActualsRecord | null>;
  listActuals(): Promise<JobActualsRecord[]>;

  // AI intake cache
  getIntakeCache(hash: string): Promise<IntakeCacheRecord | null>;
  putIntakeCache(rec: { inputHash: string; source: "ai" | "heuristic"; intake: unknown }): Promise<void>;
}

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found`);
    this.name = "NotFoundError";
  }
}
