import assert from "node:assert/strict";
import test from "node:test";

import { createHostedCheckoutProvider } from "../../server/jobos/payments";

test("hosted checkout stays disabled without both Square credentials", () => {
  assert.equal(createHostedCheckoutProvider({} as NodeJS.ProcessEnv), null);
  assert.equal(createHostedCheckoutProvider({ SQUARE_ACCESS_TOKEN: "secret" } as NodeJS.ProcessEnv), null);
  assert.equal(createHostedCheckoutProvider({ SQUARE_LOCATION_ID: "loc" } as NodeJS.ProcessEnv), null);
});

test("Square checkout creates an amount-specific hosted link without collecting card data", async () => {
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
