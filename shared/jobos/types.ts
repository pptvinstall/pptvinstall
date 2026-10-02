import type { JobContextInput, JobScopeInput } from "../pricing/scope";
import type { EconomicsConfig } from "../pricing/config";
import type { QuoteSnapshot } from "../pricing/quote";
import type { CustomerQuoteView } from "../pricing/customerView";
import type { InvoiceLine, InvoiceStatus } from "./invoice";
import type { JobActualsInput, PaymentMethod, Profitability } from "./actuals";

// Domain records shared by server, store implementations and tests. Dates are ISO strings.
// Customer identity is NOT duplicated here: a job links to the existing booking / customer /
// CRM contact rows and carries only a short owner-entered label for leads with no booking.

export const JOB_STATUSES = ["lead", "scoped", "quoted", "scheduled", "in_progress", "completed", "invoiced", "paid", "cancelled"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const QUOTE_STATUSES = ["draft", "sent", "accepted", "declined", "expired", "superseded"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export interface StoredConfig {
  id: number;
  version: number;
  name: string;
  isActive: boolean;
  config: EconomicsConfig;
  createdAt: string;
  createdBy: string;
  changeReason: string | null;
  changedPaths: string[];
}

export interface ConfigEvent {
  id: number;
  version: number;
  action: "created" | "activated" | "seeded";
  actor: string;
  at: string;
  details: string | null;
}

export interface JobRecord {
  id: string;
  status: JobStatus;
  title: string;
  customerLabel: string | null;
  zip: string | null;
  bookingId: number | null;
  customerId: number | null;
  crmContactId: number | null;
  source: "manual" | "booking" | "ai_intake" | "quote_tool" | "synthetic";
  scheduledFor: string | null;
  scope: JobScopeInput;
  context: JobContextInput;
  currentQuoteId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteRecord {
  id: string;
  jobId: string;
  status: QuoteStatus;
  /** Unguessable token for the public customer quote link. */
  shareToken: string;
  acceptedVersionId: string | null;
  createdAt: string;
}

export interface QuoteVersionRecord {
  id: string;
  quoteId: string;
  version: number;
  snapshot: QuoteSnapshot;
  customerView: CustomerQuoteView;
  customerAmountCents: number;
  recommendedCents: number;
  floorCents: number;
  discountCents: number;
  adjustment: unknown | null;
  configVersion: number;
  engineVersion: string;
  snapshotHash: string;
  createdAt: string;
  acceptedAt: string | null;
}

export interface InvoiceRecord {
  id: string;
  jobId: string;
  quoteVersionId: string | null;
  invoiceNumber: string;
  status: InvoiceStatus;
  lines: InvoiceLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  taxConfigSnapshot: EconomicsConfig["business"]["tax"];
  sentAt: string | null;
  voidedAt: string | null;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  invoiceId: string;
  amountCents: number;
  method: PaymentMethod;
  tipCents: number;
  reference: string | null;
  receivedAt: string;
  createdAt: string;
}

export interface JobActualsRecord {
  id: string;
  jobId: string;
  quoteVersionId: string | null;
  actuals: JobActualsInput;
  profitability: Profitability | null;
  configVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntakeCacheRecord {
  inputHash: string;
  source: "ai" | "heuristic";
  intake: unknown;
  createdAt: string;
  hits: number;
}

/** Owner-only summary of one shadow-priced public quote. */
export interface ShadowSampleSummary {
  shownSource: "catalog" | "engine";
  catalogHasCustomQuoteLines: boolean;
  premiumCents: number;
  confidence: "high" | "medium" | "low";
  complexity: "standard" | "moderate" | "complex";
  premiumPct: number;
  premiumFactors: string[];
  onsiteMinutes: number;
  totalOwnerMinutes: number;
  helperMinutes: number;
  materialsCostCents: number;
  travelCostCents: number;
  travelSource: string;
  overheadCents: number;
  atShown: { helperCostCents: number; costToServeCents: number; ownerNetCents: number; marginPct: number; effectivePerHourCents: number };
  atRecommended: { helperCostCents: number; costToServeCents: number; ownerNetCents: number; marginPct: number; effectivePerHourCents: number };
  flags: string[];
  questions: string[];
  why: string[];
  engineVersion: string;
}

export interface ShadowSampleRecord {
  id: string;
  day: string;
  sampleKey: string;
  source: "public_quote";
  zip: string | null;
  configVersion: number;
  pricingMode: string;
  shownCents: number;
  recommendedCents: number;
  floorCents: number;
  status: string;
  scope: unknown;
  context: unknown;
  summary: ShadowSampleSummary;
  jobId: string | null;
  createdAt: string;
}
