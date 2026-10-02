import { findInternalKeys, InternalDataLeakError } from "../pricing/customerView";
import type { InvoiceRecord, JobRecord, PaymentRecord, QuoteRecord, QuoteVersionRecord } from "./types";

export type CustomerDocumentKind = "estimate" | "invoice" | "receipt";

export interface CustomerDocumentLine {
  description: string;
  detail?: string;
  qty?: number;
  unitCents?: number;
  amountCents: number | null;
}

export interface CustomerDocumentPayment {
  amountCents: number;
  method: string;
  tipCents: number;
  receivedAt: string;
}

export interface CustomerDocumentModel {
  kind: CustomerDocumentKind;
  businessName: "Picture Perfect TV Install";
  title: string;
  documentNumber: string;
  status: string;
  createdAt: string;
  customerLabel: string | null;
  jobTitle: string;
  serviceZip: string | null;
  lines: CustomerDocumentLine[];
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  notes: string[];
  payments: CustomerDocumentPayment[];
}

function safe<T extends CustomerDocumentModel>(doc: T): T {
  const leaked = findInternalKeys(doc);
  if (leaked.length) throw new InternalDataLeakError(leaked);
  return doc;
}

function shortId(id: string) {
  return id.replace(/-/g, "").slice(0, 8).toUpperCase();
}

export function buildEstimateDocument(args: { job: JobRecord; quote: QuoteRecord; version: QuoteVersionRecord }): CustomerDocumentModel {
  const { job, quote, version } = args;
  const v = version.customerView;
  const created = new Date(version.createdAt);
  const year = Number.isFinite(created.getTime()) ? created.getUTCFullYear() : new Date().getUTCFullYear();
  const lines: CustomerDocumentLine[] = v.lines.map((line) => ({
    description: line.label,
    ...(line.detail ? { detail: line.detail } : {}),
    amountCents: line.amountCents,
  }));
  return safe({
    kind: "estimate",
    businessName: "Picture Perfect TV Install",
    title: "Estimate",
    documentNumber: `EST-${year}-${shortId(quote.id)}-V${version.version}`,
    status: quote.status,
    createdAt: version.createdAt,
    customerLabel: job.customerLabel,
    jobTitle: job.title,
    serviceZip: job.zip,
    lines,
    subtotalCents: v.subtotalCents,
    discountCents: Math.max(0, v.subtotalCents - v.totalCents),
    taxCents: 0,
    totalCents: v.totalCents,
    paidCents: 0,
    balanceCents: v.totalCents,
    notes: [
      ...v.notes,
      ...(v.requiresReview ? ["Some job details require confirmation before the price is final."] : []),
    ],
    payments: [],
  });
}

export function buildInvoiceDocument(args: { job: JobRecord; invoice: InvoiceRecord; payments: PaymentRecord[]; receipt?: boolean }): CustomerDocumentModel {
  const { job, invoice, payments } = args;
  const receipt = args.receipt === true;
  const kind: CustomerDocumentKind = receipt ? "receipt" : "invoice";
  const title = receipt ? "Paid Receipt" : "Invoice";
  const lines: CustomerDocumentLine[] = invoice.lines.map((line) => ({
    description: line.description,
    qty: line.qty,
    unitCents: line.unitCents,
    amountCents: line.qty * line.unitCents,
  }));
  return safe({
    kind,
    businessName: "Picture Perfect TV Install",
    title,
    documentNumber: receipt ? invoice.invoiceNumber.replace(/^INV-/, "REC-") : invoice.invoiceNumber,
    status: invoice.status,
    createdAt: invoice.createdAt,
    customerLabel: job.customerLabel,
    jobTitle: job.title,
    serviceZip: job.zip,
    lines,
    subtotalCents: invoice.subtotalCents,
    discountCents: invoice.discountCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    paidCents: invoice.paidCents,
    balanceCents: Math.max(0, invoice.totalCents - invoice.paidCents),
    notes: [
      ...(invoice.taxConfigSnapshot.enabled && invoice.taxCents > 0
        ? [`${invoice.taxConfigSnapshot.label || "Tax"} included as configured.`]
        : []),
      ...(receipt ? ["Payment recorded in PPTVInstall Job OS."] : []),
    ],
    payments: payments.map((p) => ({
      amountCents: p.amountCents,
      method: p.method,
      tipCents: p.tipCents,
      receivedAt: p.receivedAt,
    })),
  });
}
