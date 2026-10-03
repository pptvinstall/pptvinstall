import assert from "node:assert/strict";
import test from "node:test";

import { createHostedCheckoutProvider } from "../../server/jobos/payments";

test("hosted checkout stays disabled without Stripe or complete Square credentials", () => {
  assert.equal(createHostedCheckoutProvider({} as NodeJS.ProcessEnv), null);
  assert.equal(createHostedCheckoutProvider({ SQUARE_ACCESS_TOKEN: "secret" } as NodeJS.ProcessEnv), null);
  assert.equal(createHostedCheckoutProvider({ SQUARE_LOCATION_ID: "loc" } as NodeJS.ProcessEnv), null);
});

test("Stripe is preferred and creates an amount-specific hosted Checkout Session", async () => {
  let request: { url: string; init: RequestInit } | null = null;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ url: "https://checkout.stripe.com/c/pay/test" }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const provider = createHostedCheckoutProvider({
    STRIPE_SECRET_KEY: "sk_test_example",
    STRIPE_CHECKOUT_BASE_URL: "https://pptvinstall.com",
    SQUARE_ACCESS_TOKEN: "square-token",
    SQUARE_LOCATION_ID: "LOC123",
  } as NodeJS.ProcessEnv, fakeFetch)!;

  assert.equal(provider.name, "stripe");
  const result = await provider.createLink({ invoiceId: "11111111-1111-4111-8111-111111111111", invoiceNumber: "INV-2026-1001", amountCents: 125000 });
  assert.deepEqual(result, { provider: "stripe", url: "https://checkout.stripe.com/c/pay/test", amountCents: 125000 });
  assert.ok(request);
  assert.equal(request!.url, "https://api.stripe.com/v1/checkout/sessions");
  const headers = request!.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer sk_test_example");
  assert.match(headers["Idempotency-Key"], /^pptv-/);
  const body = new URLSearchParams(String(request!.init.body));
  assert.equal(body.get("mode"), "payment");
  assert.equal(body.get("line_items[0][price_data][unit_amount]"), "125000");
  assert.equal(body.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(body.get("metadata[invoice_id]"), "11111111-1111-4111-8111-111111111111");
  assert.equal(body.get("success_url"), "https://pptvinstall.com/payment/success?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(body.get("cancel_url"), "https://pptvinstall.com/payment/cancelled");
  assert.equal(String(request!.init.body).includes("card_number"), false);
});

test("Square remains a fallback when Stripe is not configured", async () => {
  let request: { url: string; init: RequestInit } | null = null;
  const fakeFetch = (async (url: string | URL | Request, init?: RequestInit) => {
    request = { url: String(url), init: init ?? {} };
    return new Response(JSON.stringify({ payment_link: { url: "https://square.link/u/test" } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;

  const provider = createHostedCheckoutProvider({
    SQUARE_ACCESS_TOKEN: "test-token",
    SQUARE_LOCATION_ID: "LOC123",
    SQUARE_ENVIRONMENT: "sandbox",
    SQUARE_API_VERSION: "2026-09-16",
  } as NodeJS.ProcessEnv, fakeFetch)!;

  assert.equal(provider.name, "square");
  const result = await provider.createLink({ invoiceId: "11111111-1111-4111-8111-111111111111", invoiceNumber: "INV-1001", amountCents: 125000 });
  assert.deepEqual(result, { provider: "square", url: "https://square.link/u/test", amountCents: 125000 });
  assert.ok(request);
  assert.equal(request!.url, "https://connect.squareupsandbox.com/v2/online-checkout/payment-links");
  const headers = request!.init.headers as Record<string, string>;
  assert.equal(headers.Authorization, "Bearer test-token");
  const body = JSON.parse(String(request!.init.body));
  assert.equal(body.quick_pay.price_money.amount, 125000);
  assert.equal(body.quick_pay.location_id, "LOC123");
  assert.equal(JSON.stringify(body).includes("card_number"), false);
});

test("Stripe checkout rejects an invalid base URL before making a request", () => {
  assert.throws(
    () => createHostedCheckoutProvider({ STRIPE_SECRET_KEY: "sk_test_example", STRIPE_CHECKOUT_BASE_URL: "javascript:alert(1)" } as NodeJS.ProcessEnv),
    /absolute http\(s\) URL/,
  );
});
