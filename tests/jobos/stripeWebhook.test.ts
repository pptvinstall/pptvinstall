import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { MemoryJobOsStore } from "../../server/jobos/memoryStore";
import { JobOsService } from "../../server/jobos/service";
import { reconcileStripeCheckoutEvent, StripeWebhookError, verifyStripeWebhook, type StripeCheckoutEvent } from "../../server/jobos/stripeWebhook";

const scope = { tvs: [{ id: "tv-1", sizeBand: "56+", wall: "drywall", location: "standard", mountSource: "customer", wire: "visible", power: "existing" }] };
const context = { oneWayMiles: 8, oneWayDriveMinutes: 20 };

function stripeHeader(raw: Buffer, secret: string, timestamp: number) {
  const sig = createHmac("sha256", secret).update(`${timestamp}.${raw.toString("utf8")}`, "utf8").digest("hex");
  return `t=${timestamp},v1=${sig}`;
}

async function invoiceFixture() {
  const store = new MemoryJobOsStore();
  const svc = new JobOsService(store);
  const job = await svc.createJob({ title: "Stripe webhook synthetic", scope, context, source: "synthetic" });
  await svc.createQuoteVersion(job.id, {});
  const invoice = await svc.createInvoice(job.id, {});
  return { store, svc, job, invoice };
}

test("Stripe webhook signature uses the exact raw body and rejects stale/tampered events", () => {
  const secret = "whsec_test_only";
  const timestamp = 1_800_000_000;
  const raw = Buffer.from(JSON.stringify({ id: "evt_1", type: "checkout.session.completed", created: timestamp, data: { object: { id: "cs_1" } } }));
  const header = stripeHeader(raw, secret, timestamp);

  const event = verifyStripeWebhook(raw, header, secret, { nowMs: timestamp * 1000 });
  assert.equal(event.id, "evt_1");

  assert.throws(
    () => verifyStripeWebhook(Buffer.from(raw.toString("utf8") + " "), header, secret, { nowMs: timestamp * 1000 }),
    (error: unknown) => error instanceof StripeWebhookError && error.code === "BAD_SIGNATURE",
  );
  assert.throws(
    () => verifyStripeWebhook(raw, header, secret, { nowMs: (timestamp + 301) * 1000 }),
    (error: unknown) => error instanceof StripeWebhookError && error.code === "STALE_SIGNATURE",
  );
});

test("successful Stripe Checkout records one card payment, marks the invoice/job paid, and retries are idempotent", async () => {
  const { store, svc, job, invoice } = await invoiceFixture();
  const sessionId = "cs_live_pptv_test_123";
  const event: StripeCheckoutEvent = {
    id: "evt_paid_1",
    type: "checkout.session.completed",
    created: 1_800_000_000,
    data: {
      object: {
        id: sessionId,
        payment_status: "paid",
        amount_total: invoice.totalCents,
        currency: "usd",
        metadata: { invoice_id: invoice.id, invoice_number: invoice.invoiceNumber },
      },
    },
  };

  const first = await reconcileStripeCheckoutEvent(store, event);
  assert.equal(first.status, "recorded");
  const detail = await svc.jobDetail(job.id);
  assert.equal(detail.job.status, "paid");
  assert.equal(detail.invoices[0]!.status, "paid");
  assert.equal(detail.payments.length, 1);
  assert.equal(detail.payments[0]!.method, "card");
  assert.equal(detail.payments[0]!.reference, `stripe:checkout:${sessionId}`);

  const retry = await reconcileStripeCheckoutEvent(store, { ...event, id: "evt_paid_retry" });
  assert.equal(retry.status, "duplicate");
  assert.equal((await svc.jobDetail(job.id)).payments.length, 1);
});

test("unpaid or mismatched Stripe sessions never mutate the invoice", async () => {
  const { store, svc, job, invoice } = await invoiceFixture();
  const base = {
    id: "cs_pending_1",
    amount_total: invoice.totalCents,
    currency: "usd",
    metadata: { invoice_id: invoice.id, invoice_number: invoice.invoiceNumber },
  };

  const pending = await reconcileStripeCheckoutEvent(store, {
    id: "evt_pending",
    type: "checkout.session.completed",
    data: { object: { ...base, payment_status: "unpaid" } },
  });
  assert.equal(pending.status, "pending");

  const mismatch = await reconcileStripeCheckoutEvent(store, {
    id: "evt_mismatch",
    type: "checkout.session.async_payment_succeeded",
    data: { object: { ...base, payment_status: "paid", amount_total: invoice.totalCents - 100 } },
  });
  assert.equal(mismatch.status, "review");
  if (mismatch.status === "review") assert.equal(mismatch.reason, "amount_mismatch");

  const detail = await svc.jobDetail(job.id);
  assert.equal(detail.invoices[0]!.paidCents, 0);
  assert.equal(detail.payments.length, 0);
  assert.equal(detail.job.status, "invoiced");
});
