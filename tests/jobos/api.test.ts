import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// HTTP-level tests against the REAL route registration (registerRoutes), with the in-memory
// Job OS store and no real database, email, SMS or AI. Verifies auth, customer/internal
// separation over the wire, rate limits and staging suppression.

process.env.DATABASE_URL = ["postgres:", "", "127.0.0.1:1/test"].join("/");
process.env.ADMIN_API_TOKEN = "test-admin-token-not-a-secret";
process.env.ADMIN_PASSWORD = "legacy-admin-password-not-a-secret";
process.env.JOBOS_STORE = "memory";
process.env.JOB_OS_ENABLED = "true";
process.env.APP_ENV = "staging";
process.env.NODE_ENV = "test";
delete process.env.OUTBOUND_MODE;
delete process.env.ANTHROPIC_API_KEY;

let server: Server;
let base = "";
const H = { "content-type": "application/json", "x-admin-token": process.env.ADMIN_API_TOKEN! };

async function call(method: string, path: string, body?: unknown, headers: Record<string, string> = H) {
  const res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* not json */
  }
  return { status: res.status, json, text, headers: res.headers };
}

before(async () => {
  const express = (await import("express")).default;
  const { registerRoutes } = await import("../../server/routes");
  const app = express();
  app.set("trust proxy", 1);
  app.use(express.json());
  server = registerRoutes(app);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  // The real routes module starts background timers; do not let them hold the test process open.
  setTimeout(() => process.exit(0), 50).unref();
});

const scope = { tvs: [{ id: "tv-1", sizeBand: "56+", wall: "drywall", location: "standard", mountSource: "customer", wire: "visible", power: "existing" }] };
const nearby = { oneWayMiles: 8, oneWayDriveMinutes: 20 };

test("every admin Job OS endpoint rejects missing and wrong tokens", async () => {
  const id = "00000000-0000-4000-8000-000000000000";
  const endpoints: Array<[string, string]> = [
    ["GET", "/api/admin/job-os/config"],
    ["PUT", "/api/admin/job-os/config"],
    ["GET", "/api/admin/job-os/config/versions"],
    ["GET", "/api/admin/job-os/config/events"],
    ["POST", "/api/admin/job-os/config/rollback"],
    ["POST", "/api/admin/job-os/price"],
    ["GET", "/api/admin/job-os/jobs"],
    ["POST", "/api/admin/job-os/jobs"],
    ["GET", `/api/admin/job-os/jobs/${id}`],
    ["PATCH", `/api/admin/job-os/jobs/${id}/scope`],
    ["POST", `/api/admin/job-os/jobs/${id}/quote`],
    ["POST", `/api/admin/job-os/quotes/${id}/send`],
    ["GET", `/api/admin/job-os/quotes/${id}/pdf`],
    ["POST", `/api/admin/job-os/jobs/${id}/actuals`],
    ["GET", `/api/admin/job-os/jobs/${id}/profitability`],
    ["POST", `/api/admin/job-os/jobs/${id}/invoice`],
    ["POST", `/api/admin/job-os/invoices/${id}/send`],
    ["POST", `/api/admin/job-os/invoices/${id}/void`],
    ["POST", `/api/admin/job-os/invoices/${id}/payments`],
    ["GET", `/api/admin/job-os/invoices/${id}/pdf`],
    ["GET", `/api/admin/job-os/invoices/${id}/receipt.pdf`],
    ["GET", "/api/admin/job-os/intelligence"],
    ["GET", "/api/admin/job-os/intake/status"],
    ["POST", "/api/admin/job-os/intake/parse"],
    ["POST", "/api/admin/job-os/intake/photos"],
    ["GET", "/api/admin/job-os/outbox"],
    ["GET", "/api/admin/job-os/shadow-samples"],
    ["POST", `/api/admin/job-os/shadow-samples/${id}/job`],
    ["PUT", `/api/admin/job-os/work-templates/x`],
    ["DELETE", `/api/admin/job-os/work-templates/x`],
    ["PUT", `/api/admin/job-os/work-categories/x`],
  ];
  for (const [method, path] of endpoints) {
    const none = await call(method, path, method === "GET" ? undefined : {}, { "content-type": "application/json" });
    assert.equal(none.status, 401, `${method} ${path} without token`);
    const wrong = await call(method, path, method === "GET" ? undefined : {}, { "content-type": "application/json", "x-admin-token": "wrong" });
    assert.equal(wrong.status, 401, `${method} ${path} wrong token`);
  }
});

test("admin Job OS accepts either configured owner credential", async () => {
  const apiToken = await call("GET", "/api/admin/job-os/intake/status", undefined, {
    "content-type": "application/json",
    "x-admin-token": process.env.ADMIN_API_TOKEN!,
  });
  assert.equal(apiToken.status, 200, "ADMIN_API_TOKEN should authorize Job OS");

  const legacyPassword = await call("GET", "/api/admin/job-os/intake/status", undefined, {
    "content-type": "application/json",
    "x-admin-token": process.env.ADMIN_PASSWORD!,
  });
  assert.equal(legacyPassword.status, 200, "ADMIN_PASSWORD should remain a valid owner credential");

  const invalid = await call("GET", "/api/admin/job-os/intake/status", undefined, {
    "content-type": "application/json",
    "x-admin-token": "not-a-valid-owner-credential",
  });
  assert.equal(invalid.status, 401);
});

test("price preview returns internal economics to the owner and customer-safe packages", async () => {
  const r = await call("POST", "/api/admin/job-os/price", { scope, context: nearby });
  assert.equal(r.status, 200);
  assert.equal(r.json.composition.customerTotalCents, 10_000);
  assert.ok(r.json.composition.pricing.floorCents > 0);
  assert.ok(Array.isArray(r.json.packages));
  const bad = await call("POST", "/api/admin/job-os/price", { scope: { tvs: [{ sizeBand: "99" }] }, context: nearby });
  assert.equal(bad.status, 400);
});

test("end to end over HTTP: job → quote → send → public customer view has no internal data → accept", async () => {
  const created = await call("POST", "/api/admin/job-os/jobs", { title: "HTTP test job (synthetic)", scope, context: nearby });
  assert.equal(created.status, 201);
  const jobId = created.json.id as string;

  const q = await call("POST", `/api/admin/job-os/jobs/${jobId}/quote`, { adjustment: { type: "override", amountCents: 9_500, reason: "returning_customer" } });
  assert.equal(q.status, 201);
  const { quote } = q.json;

  // Draft quotes are not public.
  assert.equal((await call("GET", `/api/quotes/${quote.shareToken}`, undefined, {})).status, 404);

  const sent = await call("POST", `/api/admin/job-os/quotes/${quote.id}/send`, {});
  assert.equal(sent.status, 200);
  assert.equal(sent.json.customerPath, `/q/${quote.shareToken}`);

  // Public, no admin token.
  const pub = await call("GET", `/api/quotes/${quote.shareToken}`, undefined, {});
  assert.equal(pub.status, 200);
  assert.equal(pub.headers.get("cache-control"), "no-store");
  assert.equal(pub.json.view.totalCents, 9_500);
  for (const banned of ["floor", "margin", "recommended", "premium", "returning_customer", "costToServe", "labor", "overhead", "snapshot", "configVersion"]) {
    assert.ok(!pub.text.includes(banned), `public quote leaked "${banned}"`);
  }

  // Malformed / unknown tokens are indistinguishable.
  assert.equal((await call("GET", "/api/quotes/not-a-uuid", undefined, {})).status, 404);
  assert.equal((await call("GET", "/api/quotes/00000000-0000-4000-8000-000000000000", undefined, {})).status, 404);

  const acc = await call("POST", `/api/quotes/${quote.shareToken}/accept`, {}, {});
  assert.equal(acc.status, 200);
  assert.equal(acc.json.status, "accepted");

  // Admin detail view does include internal economics.
  const detail = await call("GET", `/api/admin/job-os/jobs/${jobId}`);
  assert.equal(detail.status, 200);
  assert.ok(detail.json.versions[0].snapshot.composition.pricing.floorCents > 0);

  // Lifecycle tail over HTTP.
  const act = await call("POST", `/api/admin/job-os/jobs/${jobId}/actuals`, { laborMinutes: 75, travelMinutes: 40, mileage: 16, actualMaterialsCents: 600, collectedCents: 9_500, paymentMethod: "zelle" });
  assert.equal(act.status, 201);
  assert.equal(act.json.profitability.estimate, true);
  const inv = await call("POST", `/api/admin/job-os/jobs/${jobId}/invoice`, {});
  assert.equal(inv.status, 201);
  assert.equal(inv.json.totalCents, 9_500);
  const over = await call("POST", `/api/admin/job-os/invoices/${inv.json.id}/payments`, { amountCents: 99_999, method: "cash" });
  assert.equal(over.status, 409);
  const pay = await call("POST", `/api/admin/job-os/invoices/${inv.json.id}/payments`, { amountCents: 9_500, method: "apple_pay" });
  assert.equal(pay.status, 201);
  assert.equal(pay.json.invoice.status, "paid");
});

test("invalid ids and bodies return 4xx without leaking internals", async () => {
  const r1 = await call("GET", "/api/admin/job-os/jobs/not-a-uuid");
  assert.equal(r1.status, 400);
  const r2 = await call("POST", "/api/admin/job-os/jobs", { title: "" });
  assert.equal(r2.status, 400);
  const r3 = await call("GET", "/api/admin/job-os/jobs/00000000-0000-4000-8000-000000000000");
  assert.equal(r3.status, 404);
  for (const r of [r1, r2, r3]) assert.ok(!/stack|node_modules|at .*\.ts/i.test(r.text));
});

test("config endpoint rejects secret-like keys and requires a reason", async () => {
  const cur = await call("GET", "/api/admin/job-os/config");
  assert.equal(cur.status, 200);
  const cfg = JSON.parse(JSON.stringify(cur.json.config));
  cfg.travel.mpg = 18;
  assert.equal((await call("PUT", "/api/admin/job-os/config", { config: cfg })).status, 400);
  const withSecret = JSON.parse(JSON.stringify(cfg));
  withSecret.travel.apiKey = "abc";
  assert.equal((await call("PUT", "/api/admin/job-os/config", { config: withSecret, reason: "try to sneak a secret in" })).status, 422);
  const ok = await call("PUT", "/api/admin/job-os/config", { config: cfg, reason: "Atlas measured 18 MPG" });
  assert.equal(ok.status, 200);