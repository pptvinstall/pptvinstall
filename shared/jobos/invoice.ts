import { z } from "zod";
import type { EconomicsConfig } from "../pricing/config";
import type { Cents } from "../pricing/money";
import { PAYMENT_METHODS } from "./actuals";

// Invoice and payment foundation. Records what the owner says happened; it does NOT claim
// reconciliation with Zelle, Venmo, Apple Pay or any processor. Tax is applied only if the
// owner has enabled and configured it; the system never invents a tax rule.

export const INVOICE_STATUSES = ["draft", "sent", "partially_paid", "paid", "void"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoiceLineSchema = z.object({
  description: z.string().min(1).max(200),
  qty: z.number().int().min(1).max(99).default(1),
  unitCents: z.number().int().min(-5_000_000).max(5_000_000),
});
export type InvoiceLine = z.infer<typeof invoiceLineSchema>;

export const paymentInputSchema = z.object({
  amountCents: z.number().int().min(1).max(10_000_000),
  method: z.enum(PAYMENT_METHODS),
  tipCents: z.number().int().min(0).max(1_000_000).default(0),
  /** Free-text reference the owner types (e.g. last 4 of a Zelle confirmation). Not verified by the system. */
  reference: z.string().max(80).optional(),
  receivedAt: z.string().datetime({ offset: true }).optional(),
});
export type PaymentInput = z.infer<typeof paymentInputSchema>;

export interface InvoiceTotals {
  subtotalCents: Cents;
  discountCents: Cents;
  taxCents: Cents;
  totalCents: Cents;
}

export function computeInvoiceTotals(lines: InvoiceLine[], discountCents: Cents, config: EconomicsConfig): InvoiceTotals {
  const subtotalCents = lines.reduce((s, l) => s + l.qty * l.unitCents, 0);
  const discount = Math.min(Math.max(0, discountCents), Math.max(0, subtotalCents));
  const taxable = Math.max(0, subtotalCents - discount);
  const t = config.business.tax;
  const taxCents = t.enabled ? Math.round((taxable * t.rateBps) / 10_000) : 0;
  return { subtotalCents, discountCents: discount, taxCents, totalCents: taxable + taxCents };
}

export function deriveInvoiceStatus(args: { totalCents: Cents; paidCents: Cents; voided: boolean; sent: boolean }): InvoiceStatus {
  if (args.voided) return "void";
  if (args.totalCents > 0 && args.paidCents >= args.totalCents) return "paid";
  if (args.paidCents > 0) return "partially_paid";
  return args.sent ? "sent" : "draft";
}

export class InvoicePolicyError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "InvoicePolicyError";
  }
}

/** Validate a payment against an invoice. Overpayment and payment on void invoices are rejected. */
export function assertPaymentAllowed(args: { status: InvoiceStatus; balanceCents: Cents; amountCents: Cents }) {
  if (args.status === "void") throw new InvoicePolicyError("Cannot record a payment on a void invoice", "INVOICE_VOID");
  if (args.status === "paid") throw new InvoicePolicyError("Invoice is already paid", "INVOICE_PAID");
  if (args.amountCents > args.balanceCents) throw new InvoicePolicyError("Payment exceeds the remaining balance (record tips separately)", "OVERPAYMENT");
}

export function formatInvoiceNumber(year: number, sequence: number): string {
  return `INV-${year}-${String(sequence).padStart(4, "0")}`;
}
