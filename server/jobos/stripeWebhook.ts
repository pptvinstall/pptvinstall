import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import { assertPaymentAllowed } from "@shared/jobos";
import type { JobOsStore } from "./store";

const checkoutSessionSchema = z.object({
  id: z.string().min(1),
  payment_status: z.string().optional(),
  amount_total: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.string().nullable()).optional().default({}),
});

const stripeEventSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  created: z.number().int().nonnegative().optional(),
  data: z.object({ object: z.unknown() }),
});

export type StripeCheckoutEvent = z.infer<typeof stripeEventSchema>;

export class StripeWebhookError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "StripeWebhookError";
  }
}

function safeEqualHex(a: string, b: string) {
  if (!/^[a-f0-9]+$/i.test(a) || !/^[a-f0-9]+$/i.test(b) || a.length !== b.length) return false;
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Verify Stripe's v1 webhook signature against the exact raw request body. */
export function verifyStripeWebhook(
  rawBody: Buffer,
  signatureHeader: string,
  secret: string,
  opts: { nowMs?: number; toleranceSeconds?: number } = {},
): StripeCheckoutEvent {
  const timestampPart = signatureHeader.split(",").find((part) => part.startsWith("t="));
  const signatures = signatureHeader.split(",").filter((part) => part.startsWith("v1=")).map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));
  if (!Number.isInteger(timestamp) || !signatures.length) throw new StripeWebhookError("Invalid Stripe signature header.", "BAD_SIGNATURE_HEADER");

  const toleranceSeconds = opts.toleranceSeconds ?? 300;
  const nowSeconds = Math.floor((opts.nowMs ?? Date.now()) / 1000);
  if (Math.abs(nowSeconds - timestamp) > toleranceSeconds) throw new StripeWebhookError("Stripe webhook timestamp is outside the allowed window.", "STALE_SIGNATURE");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody.toString("utf8")}`, "utf8").digest("hex");
  if (!signatures.some((candidate) => safeEqualHex(candidate, expected))) throw new StripeWebhookError("Stripe webhook signature did not match.", "BAD_SIGNATURE");

  let json: unknown;
  try {
    json = JSON.parse(rawBody.toString("utf8"));
  } catch {
    throw new StripeWebhookError("Stripe webhook body is not valid JSON.", "BAD_JSON");
  }
  const parsed = stripeEventSchema.safeParse(json);
  if (!parsed.success) throw new StripeWebhookError("Stripe webhook event is malformed.", "BAD_EVENT");
  return parsed.data;
}

export type StripeReconcileResult =
  | { status: "ignored"; eventId: string; reason: string }
  | { status: "pending"; eventId: string; sessionId: string }
  | { status: "duplicate"; eventId: string; sessionId: string; invoiceId: string }
  | { status: "review"; eventId: string; sessionId: string; invoiceId?: string; reason: string }
  | { status: "recorded"; eventId: string; sessionId: string; invoiceId: string; amountCents: number; invoiceStatus: string };

/**
 * Reconcile only successful Stripe Checkout Sessions created for PPTVInstall invoices.
 * Returns 2xx-safe review results for mismatches so Stripe retries cannot double-credit an invoice.
 */
export async function reconcileStripeCheckoutEvent(store: JobOsStore, event: StripeCheckoutEvent): Promise<StripeReconcileResult> {
  const supported = event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded";
  if (!supported) return { status: "ignored", eventId: event.id, reason: "unsupported_event" };

  const parsed = checkoutSessionSchema.safeParse(event.data.object);
  if (!parsed.success) return { status: "ignored", eventId: event.id, reason: "not_checkout_session" };
  const session = parsed.data;

  if (event.type === "checkout.session.completed" && session.payment_status !== "paid") {
    return { status: "pending", eventId: event.id, sessionId: session.id };
  }

  const invoiceId = session.metadata.invoice_id?.trim() || "";
  const invoiceNumber = session.metadata.invoice_number?.trim() || "";
  if (!invoiceId) return { status: "review", eventId: event.id, sessionId: session.id, reason: "missing_invoice_id" };

  const invoice = await store.getInvoice(invoiceId);
  if (!invoice) return { status: "review", eventId: event.id, sessionId: session.id, invoiceId, reason: "invoice_not_found" };
  if (invoiceNumber && invoice.invoiceNumber !== invoiceNumber) return { status: "review", eventId: event.id, sessionId: session.id, invoiceId, reason: "invoice_number_mismatch" };
  if ((session.currency ?? "").toLowerCase() !== "usd") return { status: "review", eventId: event.id, sessionId: session.id, invoiceId, reason: "currency_mismatch" };
  if (!Number.isInteger(session.amount_total) || !session.amount_total || session.amount_total <= 0) return { status: "review", eventId: event.id, sessionId: session.id, invoiceId, reason: "invalid_amount" };

  const reference = `stripe:checkout:${session.id}`.slice(0, 80);
  const existing = await store.listPayments(invoice.id);
  if (existing.some((payment) => payment.reference === reference)) {
    return { status: "duplicate", eventId: event.id, sessionId: session.id, invoiceId: invoice.id };
  }

  const balanceCents = Math.max(0, invoice.totalCents - invoice.paidCents);
  if (invoice.status === "void") return { status: "review", eventId: event.id, sessionId: session.id, invoiceId: invoice.id, reason: "invoice_void" };
  if (invoice.status === "paid" || balanceCents <= 0) return { status: "review", eventId: event.id, sessionId: session.id, invoiceId: invoice.id, reason: "invoice_already_paid" };
  if (session.amount_total !== balanceCents) return { status: "review", eventId: event.id, sessionId: session.id, invoiceId: invoice.id, reason: "amount_mismatch" };

  assertPaymentAllowed({ status: invoice.status, balanceCents, amountCents: session.amount_total });
  const receivedAt = event.created ? new Date(event.created * 1000).toISOString() : new Date().toISOString();
  const result = await store.recordPayment(invoice.id, {
    amountCents: session.amount_total,
    method: "card",
    tipCents: 0,
    reference,
    receivedAt,
  });
  if (result.invoice.status === "paid") await store.updateJob(invoice.jobId, { status: "paid" });

  return {
    status: "recorded",
    eventId: event.id,
    sessionId: session.id,
    invoiceId: invoice.id,
    amountCents: session.amount_total,
    invoiceStatus: result.invoice.status,
  };
}
