import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

// HTTP-level tests against the REAL route registration (registerRoutes), with the in-memory
// Job OS store and no real database, email, SMS or AI. Verifies auth, customer/internal
// separation over the wire, rate limits and staging suppression.

process.env.DATABASE_URL = ["postgres:", "", "127.0.0.1:1/test"].join("/");
process.env.ADMIN_API_TOKEN = "test-admin-token-not-a-secret";
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
    ["POST", `/api/admin/job-os/jobs/${id}/actuals`],
    ["GET", `/api/admin/job-os/jobs/${id}/profitability`],
    ["POST", `/api/admin/job-os/jobs/${id}/invoice`],
    ["POST", `/api/admin/job-os/invoices/${id}/send`],
    ["POST", `/api/admin/job-os/invoices/${id}/void`],
    ["POST", `/api/admin/job-os/invoices/${id}/payments`],
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
  assert.equal(ok.json.config.travel.mpg, 18);
});

test("AI intake: works without AI (heuristic), photo intake reports not_configured, staging disables AI", async () => {
  const status = await call("GET", "/api/admin/job-os/intake/status");
  assert.equal(status.json.aiEnabled, false);
  assert.equal(status.json.photoIntake, "not_configured");
  assert.equal(status.json.outboundSuppressed, true);
  const parsed = await call("POST", "/api/admin/job-os/intake/parse", { message: "Two TVs, one over the fireplace on brick, 65 inch", useAi: true });
  assert.equal(parsed.status, 200);
  assert.equal(parsed.json.aiUsed, false);
  assert.equal(parsed.json.draft.needsOwnerConfirmation, true);
  assert.ok(parsed.json.draft.unresolved.length > 0);
  const photos = await call("POST", "/api/admin/job-os/intake/photos", {});
  assert.equal(photos.status, 501);
  assert.equal(photos.json.status, "not_configured");
});

test("staging test mode suppresses outbound email/SMS/push and records a masked outbox", async () => {
  const { createGuardedTransport, getOutbox, clearOutbox, outboundSuppressed } = await import("../../server/outbound");
  const { sendSmsMessage } = await import("../../server/services/smsService");
  assert.equal(outboundSuppressed(), true);
  clearOutbox();
  const transport = createGuardedTransport({ service: "gmail", auth: { user: "x", pass: "y" } });
  const info: any = await transport.sendMail({ to: "real.customer@example.com", subject: "Booking confirmed", html: "<b>hi</b>" });
  assert.equal(info.suppressed, true);
  const sms = await sendSmsMessage({ to: "+14045551234", body: "hello", messageType: "manual" });
  assert.match(sms.providerMessageId, /^suppressed-/);
  const outbox = getOutbox();
  assert.equal(outbox.length, 2);
  assert.ok(outbox.every((e) => !e.to.includes("real.customer") && !e.to.includes("4045551234")));
  const viaApi = await call("GET", "/api/admin/job-os/outbox");
  assert.equal(viaApi.status, 200);
  assert.equal(viaApi.json.entries.length, 2);
  assert.ok(!JSON.stringify(viaApi.json).includes("real.customer@example.com"));
});

test("public quote endpoints are rate limited", async () => {
  let limited = 0;
  for (let i = 0; i < 80; i++) {
    const r = await call("GET", "/api/quotes/00000000-0000-4000-8000-000000000000", undefined, {});
    if (r.status === 429) limited += 1;
  }
  assert.ok(limited > 0, "expected a 429 after the per-minute budget");
});

test("health reports environment and suppression without exposing secrets", async () => {
  const r = await call("GET", "/api/health", undefined, {});
  assert.ok([200, 503].includes(r.status));
  assert.equal(r.json.appEnv, "staging");
  assert.equal(r.json.outboundSuppressed, true);
  assert.ok(!r.text.includes(process.env.ADMIN_API_TOKEN!));
});

test("public /quote pricing: legacy shows the catalog, shadow stores owner-only economics, dynamic needs explicit confirmation", async () => {
  const { calculateQuote } = await import("../../client/src/lib/quote-calculator");
  const form = {
    tvs: [{ id: "browser-uuid-1", size: "56+", wallType: "brick", location: "standard", hasMount: false, mountType: "tilting", wireConcealment: true, outletDistance: null, unmounting: false }],
    cameras: [],
    doorbell: false,
    doorbellBrand: "Ring",
    soundbar: false,
    surroundSound: false,
    floodlight: false,
    handymanMinutes: 0,
    zipCode: "30030",
  };
  const catalogCents = Math.round(calculateQuote({ ...form, notes: "" } as never).total * 100);
  const pub = (body: unknown) => call("POST", "/api/quote/price", body, { "content-type": "application/json" });
  const banned = ["floor", "margin", "recommend", "premium", "helper", "overhead", "costToServe", "labor", "calibrat", "risk", "profit", "/hr"];

  // Legacy: catalog price, nothing stored.
  assert.equal((await call("GET", "/api/quote/price-source", undefined, {})).json.source, "catalog");
  const legacy = await pub({ form, stage: "review" });
  assert.equal(legacy.status, 200);
  assert.deepEqual(legacy.json, { source: "catalog", totalCents: catalogCents });
  assert.equal((await call("GET", "/api/admin/job-os/shadow-samples")).json.stats.count, 0);
  // Free-text notes are refused, never stored.
  assert.equal((await pub({ form: { ...form, notes: "call me at 555-1234" }, stage: "review" })).json.totalCents, catalogCents);
  assert.equal((await pub({ form, stage: "review", name: "x" })).status, 400);

  // Shadow: customer sees the identical catalog price; the owner gets the engine comparison.
  const cfg = (await call("GET", "/api/admin/job-os/config")).json.config;
  assert.equal((await call("PUT", "/api/admin/job-os/config", { config: { ...cfg, pricingMode: "shadow" }, reason: "start shadow pricing" })).status, 200);
  const shadow = await pub({ form, stage: "review" });
  assert.deepEqual(shadow.json, { source: "catalog", totalCents: catalogCents });
  await pub({ form: { ...form, tvs: [{ ...form.tvs[0], id: "another-browser-uuid" }] }, stage: "review" }); // same choices, same day: deduped
  await pub({ form, stage: "live" }); // live typing is never stored
  const report = (await call("GET", "/api/admin/job-os/shadow-samples")).json;
  assert.equal(report.stats.count, 1);
  const sample = report.samples[0];
  assert.equal(sample.shownCents, catalogCents);
  assert.equal(sample.zip, "30030");
  assert.ok(sample.recommendedCents >= sample.floorCents && sample.floorCents >= 10_000);
  assert.ok(sample.summary.atShown.effectivePerHourCents > 0 && sample.summary.premiumFactors.includes("Masonry / stone"));
  assert.equal(sample.context.routeSource, "reference_table", "route came from the ZIP reference table, with its revision");
  assert.ok(!JSON.stringify(sample).includes("browser-uuid"), "no browser ids stored");

  // Quote -> job.
  const job = await call("POST", `/api/admin/job-os/shadow-samples/${sample.id}/job`, {});
  assert.equal(job.status, 201);
  assert.equal(job.json.source, "quote_tool");
  assert.equal((await call("POST", `/api/admin/job-os/shadow-samples/${sample.id}/job`, {})).status, 409);

  // Dynamic requires the explicit owner confirmation, server-side.
  const blocked = await call("PUT", "/api/admin/job-os/config", { config: { ...cfg, pricingMode: "dynamic" }, reason: "go dynamic" });
  assert.equal(blocked.status, 409);
  assert.equal(blocked.json.code, "DYNAMIC_CONFIRMATION_REQUIRED");
  assert.equal((await call("GET", "/api/quote/price-source", undefined, {})).json.source, "catalog");
  const ok = await call("PUT", "/api/admin/job-os/config", { config: { ...cfg, pricingMode: "dynamic" }, reason: "go dynamic", confirmDynamic: "change customer prices" });
  assert.equal(ok.status, 200);
  assert.equal((await call("GET", "/api/quote/price-source", undefined, {})).json.source, "engine");
  const dyn = await pub({ form, stage: "review" });
  assert.equal(dyn.json.source, "engine");
  assert.ok(dyn.json.totalCents >= 10_000);
  assert.equal(dyn.json.lines.reduce((s: number, l: { amountCents: number }) => s + l.amountCents, 0), dyn.json.totalCents);
  assert.ok(["firm", "estimate"].includes(dyn.json.status));
  for (const res of [legacy, shadow, dyn]) for (const word of banned) assert.ok(!res.text.toLowerCase().includes(word.toLowerCase()), `public payload leaked "${word}"`);

  // Rolling back to the dynamic version later also needs the confirmation; leaving dynamic does not.
  const dynamicVersion = ok.json.version;
  const back = await call("PUT", "/api/admin/job-os/config", { config: { ...cfg, pricingMode: "legacy" }, reason: "back to catalog" });
  assert.equal(back.status, 200);
  assert.equal((await call("POST", "/api/admin/job-os/config/rollback", { version: dynamicVersion })).status, 409);
  assert.equal((await call("GET", "/api/quote/price-source", undefined, {})).json.source, "catalog");
});

test("private media over HTTP: auth required, type and size enforced, no public URL, analysis works without AI", async () => {
  const sharp = (await import("sharp")).default;
  const jpeg = await sharp({ create: { width: 640, height: 480, channels: 3, background: "#556677" } }).jpeg().toBuffer();
  const up = (body: Buffer, headers: Record<string, string> = { "x-admin-token": H["x-admin-token"] }, query = "?hint=photo") =>
    fetch(`${base}/api/admin/job-os/intake/media${query}`, { method: "POST", headers: { "content-type": "application/octet-stream", ...headers }, body });

  assert.equal((await up(jpeg, {})).status, 401, "no token");
  assert.equal((await up(jpeg, { "x-admin-token": "wrong" })).status, 401, "wrong token");
  const svg = await up(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'));
  assert.equal(svg.status, 415);
  const big = await up(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(13 * 1024 * 1024)]));
  assert.equal(big.status, 413);
  const badHint = await up(jpeg, { "x-admin-token": H["x-admin-token"] }, "?hint=../../etc");
  assert.equal(badHint.status, 400);

  const ok = await up(jpeg);
  assert.equal(ok.status, 201);
  const { intakeId, media } = (await ok.json()) as { intakeId: string; media: { id: string } };
  assert.ok(!JSON.stringify(media).includes("storage"), "storage location is never returned");

  const get = await fetch(`${base}/api/admin/job-os/media/${media.id}?variant=thumb`, { headers: { "x-admin-token": H["x-admin-token"] } });
  assert.equal(get.status, 200);
  assert.equal(get.headers.get("content-type"), "image/jpeg");
  assert.equal(get.headers.get("cache-control"), "private, no-store");
  assert.equal(get.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await fetch(`${base}/api/admin/job-os/media/${media.id}`)).status, 401, "no token, no image");
  assert.equal((await call("GET", "/api/admin/job-os/media/00000000-0000-4000-8000-000000000000")).status, 404);
  assert.equal((await call("GET", "/api/admin/job-os/media/not-a-uuid")).status, 400);
  for (const guess of [`/media/${media.id}`, `/uploads/${media.id}.jpg`, `/.media/owner/${media.id}.jpg`, `/api/quotes/${media.id}`]) {
    const r = await fetch(base + guess);
    const type = r.headers.get("content-type") ?? "";
    assert.ok(!type.startsWith("image/"), `${guess} must not serve the image (status ${r.status}, ${type})`);
  }

  const analyzed = await call("POST", "/api/admin/job-os/intake/analyze", { intakeId, message: "Mount my 65 inch TV over the fireplace", useAi: false });
  assert.equal(analyzed.status, 200);
  assert.equal(analyzed.json.vision.available, false);
  assert.equal(analyzed.json.images[0].analysisStatus, "skipped");
  assert.equal(analyzed.json.proposal.tvs.length, 1);
  const review = await call("POST", `/api/admin/job-os/intake/${intakeId}/review`, { decisions: {} });
  assert.equal(review.status, 200);
  assert.equal(review.json.scope.tvs[0].location, "fireplace");

  assert.equal((await call("DELETE", `/api/admin/job-os/media/${media.id}`)).status, 204);
  assert.equal((await call("GET", `/api/admin/job-os/media/${media.id}`)).status, 404);
});
