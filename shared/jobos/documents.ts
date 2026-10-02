import type { DocumentSettings, EconomicsConfig } from "../pricing/config";
import { findInternalKeys, InternalDataLeakError } from "../pricing/customerView";
import type { PricingResult } from "../pricing/engine";
import type { InvoiceRecord, JobContact, JobRecord, PaymentRecord, QuoteRecord, QuoteVersionRecord } from "./types";
import { computeInvoiceTotals } from "./invoice";

// Canonical customer documents. A PDF (or any other format) is rendered FROM this data, never from UI components.
// The builders read the job's canonical records (quote version, invoice, payments, booking/job contact) and copy
// only customer-facing fields. They never compute prices: amounts come from the quote version's customer view
// and the invoice record. assertDocumentSafe() is a runtime backstop against internal economics.

export type DocumentKind = "estimate" | "invoice" | "receipt";

export interface DocumentParty {
  name: string | null;
  addressLines: string[];
  phone?: string;
  email?: string;
}

export interface DocumentLine {
  description: string;
  detail?: string;
  qty: number;
  unitCents: number | null;
  amountCents: number | null;
}

export interface CustomerDocument {
  kind: DocumentKind;
  /** EST-1001, INV-2026-0001. */
  number: string;
  /** Number part used in file names ("1001", "2026-0001"). */
  fileNumber: string;
  heading: "Estimate" | "Invoice" | "Paid Receipt";
  jobTitle: string;
  issuedDate: string;
  expiresDate?: string;
  dueDate?: string;
  paidDate?: string;
  statusLabel: string;
  business: { name: string; phone: string; email: string; website: string; serviceArea: string };
  customer: DocumentParty;
  lines: DocumentLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  taxLabel: string | null;
  totalCents: number;
  depositCents: number | null;
  paidCents: number;
  balanceCents: number;
  payments: Array<{ date: string; method: string; amountCents: number; reference?: string }>;
  /** Plain statements the price is based on. */
  assumptions: string[];
  /** What is not included. */
  exclusions: string[];
  /** Questions to settle before work begins. */
  confirmations: string[];
  schedulingNotes: string[];
  terms: string[];
  /** Estimate acceptance, or null for invoices/receipts. */
  acceptance: { accepted: boolean; acceptedDate?: string; version: number } | null;
  /** Invoice notes written for the customer. */
  notes: string[];
}

export const BUSINESS = { name: "Picture Perfect TV Install", phone: "404-702-4748", email: "PPTVInstall@gmail.com" } as const;
const METHOD_LABEL: Record<string, string> = { cash: "Cash", zelle: "Zelle", venmo: "Venmo", apple_pay: "Apple Pay", other: "Other" };

/** YYYY-MM-DD in Atlanta time (documents are dated where the business is), from an ISO timestamp. */
export function localDate(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts;
}
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function party(contact: JobContact | null, fallbackName: string | null, includeContact: boolean): DocumentParty {
  if (!contact) return { name: fallbackName, addressLines: [] };
  const cityLine = [contact.city, [contact.state, contact.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return {
    name: contact.name || fallbackName,
    addressLines: [contact.street, cityLine].filter((x): x is string => Boolean(x && x.trim())),
    ...(includeContact && contact.phone ? { phone: contact.phone } : {}),
    ...(includeContact && contact.email ? { email: contact.email } : {}),
  };
}

function business(settings: DocumentSettings) {
  return { ...BUSINESS, website: settings.website, serviceArea: settings.serviceArea };
}

const QUOTE_STATUS: Record<string, string> = { draft: "Draft", sent: "Awaiting your approval", accepted: "Accepted", declined: "Declined", expired: "Expired" };
const INVOICE_STATUS: Record<string, string> = { draft: "Draft", sent: "Due", partially_paid: "Partially paid", paid: "Paid", void: "Void" };

export function estimateNumber(n: number): string {
  return `EST-${1000 + n}`;
}

/** Estimate from a quote version. Amounts come from the version's customer view; tax only if the owner enabled it. */
export function buildEstimateDocument(args: {
  quote: QuoteRecord & { quoteNumber: number };
  version: QuoteVersionRecord;
  job: JobRecord;
  contact: JobContact | null;
  config: EconomicsConfig;
  includeContact: boolean;
}): CustomerDocument {
  const { quote, version, job, config } = args;
  const view = version.customerView;
  const settings = config.documents;
  const items = view.lines.filter((l) => l.amountCents === null || l.amountCents >= 0);
  const discountCents = -view.lines.filter((l) => (l.amountCents ?? 0) < 0).reduce((s, l) => s + (l.amountCents ?? 0), 0);
  const lines: DocumentLine[] = items.map((l) => ({ description: l.label, ...(l.detail ? { detail: l.detail } : {}), qty: 1, unitCents: l.amountCents, amountCents: l.amountCents }));
  const priced = lines.reduce((s, l) => s + (l.amountCents ?? 0), 0);
  // Same tax rule as invoices (off unless the owner configured it). The customer total before tax is the quote total.
  const totals = computeInvoiceTotals([{ description: "quote", qty: 1, unitCents: view.totalCents }], 0, config);
  const issued = localDate(version.createdAt);
  const pricing = version.snapshot.composition.pricing as PricingResult;
  const deposit = settings.depositPct > 0 ? Math.round((totals.totalCents * settings.depositPct) / 100) * 100 : null;
  const accepted = quote.status === "accepted" && quote.acceptedVersionId === version.id;
  const notes = view.notes.filter((n) => !pricing.exclusions?.includes(n));
  return {
    kind: "estimate",
    number: estimateNumber(quote.quoteNumber),
    fileNumber: String(1000 + quote.quoteNumber),
    heading: "Estimate",
    jobTitle: job.title,
    issuedDate: issued,
    expiresDate: addDays(issued, settings.estimateValidDays),
    statusLabel: accepted ? "Accepted" : quote.status === "accepted" ? "Previous version" : QUOTE_STATUS[quote.status] ?? quote.status,
    business: business(settings),
    customer: party(args.contact, job.customerLabel, args.includeContact),
    lines,
    subtotalCents: priced,
    discountCents: Math.max(0, discountCents),
    taxCents: totals.taxCents,
    taxLabel: config.business.tax.enabled ? config.business.tax.label || "Tax" : null,
    totalCents: totals.totalCents,
    depositCents: deposit && deposit > 0 && deposit < totals.totalCents ? deposit : null,
    paidCents: 0,
    balanceCents: totals.totalCents,
    payments: [],
    assumptions: notes,
    exclusions: pricing.exclusions ?? [],
    confirmations: (pricing.questions ?? []).map((q) => q.question).slice(0, 12),
    schedulingNotes: [job.scheduledFor ? `Scheduled for ${localDate(job.scheduledFor)}.` : null, settings.schedulingNote].filter((x): x is string => Boolean(x)),
    terms: settings.terms,
    acceptance: { accepted, ...(accepted && version.acceptedAt ? { acceptedDate: localDate(version.acceptedAt) } : {}), version: version.version },
    notes: [],
  };
}

function invoiceBase(args: { invoice: InvoiceRecord; payments: PaymentRecord[]; job: JobRecord; contact: JobContact | null; config: EconomicsConfig; includeContact: boolean }) {
  const { invoice, payments, job, config } = args;
  const settings = config.documents;
  const issued = localDate(invoice.createdAt);
  return {
    jobTitle: job.title,
    issuedDate: issued,
    dueDate: invoice.dueDate ?? addDays(issued, settings.invoiceDueDays),
    business: business(settings),
    customer: party(args.contact, job.customerLabel, args.includeContact),
    lines: invoice.lines.map((l) => ({ description: l.description, qty: l.qty, unitCents: l.unitCents, amountCents: l.qty * l.unitCents })),
    subtotalCents: invoice.subtotalCents,
    discountCents: invoice.discountCents,
    taxCents: invoice.taxCents,
    taxLabel: invoice.taxConfigSnapshot.enabled ? invoice.taxConfigSnapshot.label || "Tax" : null,
    totalCents: invoice.totalCents,
    depositCents: null,
    paidCents: invoice.paidCents,
    balanceCents: Math.max(0, invoice.totalCents - invoice.paidCents),
    payments: payments
      .slice()
      .sort((a, b) => a.receivedAt.localeCompare(b.receivedAt))
      .map((p) => ({ date: localDate(p.receivedAt), method: METHOD_LABEL[p.method] ?? p.method, amountCents: p.amountCents, ...(p.reference ? { reference: p.reference } : {}) })),
    assumptions: [],
    exclusions: [],
    confirmations: [],
    schedulingNotes: [],
    terms: settings.terms,
    acceptance: null,
    notes: invoice.notes ? [invoice.notes] : [],
    fileNumber: invoice.invoiceNumber.replace(/^INV-/, ""),
  };
}

export function buildInvoiceDocument(args: Parameters<typeof invoiceBase>[0]): CustomerDocument {
  return { kind: "invoice", number: args.invoice.invoiceNumber, heading: "Invoice", statusLabel: INVOICE_STATUS[args.invoice.status] ?? args.invoice.status, ...invoiceBase(args) };
}

export class DocumentNotAvailableError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "DocumentNotAvailableError";
  }
}

/** Paid receipt: only for a fully paid invoice. */
export function buildReceiptDocument(args: Parameters<typeof invoiceBase>[0]): CustomerDocument {
  if (args.invoice.status !== "paid") throw new DocumentNotAvailableError("A paid receipt is available once the invoice is paid in full.", "NOT_PAID");
  const base = invoiceBase(args);
  const last = base.payments[base.payments.length - 1];
  return { kind: "receipt", number: args.invoice.invoiceNumber, heading: "Paid Receipt", statusLabel: "Paid in full", ...base, ...(last ? { paidDate: last.date } : {}), terms: [] };
}

// Words that only ever describe internal economics. Plain words like "floor" can be legitimate customer text.
const INTERNAL_TEXT = /\b(margin|cost to serve|cost-to-serve|overhead|helper (pay|cost|share)|recommended price|premium reference|risk premium|risk score|calibrat\w*|labor value|owner (rate|hourly)|economic floor|floor price)\b|\/hr\b/i;

/** Throws if a document carries internal keys or internal economics wording. */
export function assertDocumentSafe(doc: CustomerDocument): CustomerDocument {
  const keys = findInternalKeys({ ...doc, notes: undefined }).filter((k) => !/^(notes|terms)/.test(k));
  const texts: string[] = [];
  const walk = (v: unknown) => {
    if (typeof v === "string") texts.push(v);
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === "object") Object.values(v).forEach(walk);
  };
  walk(doc);
  const bad = texts.filter((t) => INTERNAL_TEXT.test(t));
  if (keys.length || bad.length) throw new InternalDataLeakError([...keys, ...bad.map((b) => `text: ${b.slice(0, 40)}`)]);
  return doc;
}
