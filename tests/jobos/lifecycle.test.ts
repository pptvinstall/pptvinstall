import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { DbJobOsStore } from "../../server/jobos/dbStore";
import { MemoryJobOsStore } from "../../server/jobos/memoryStore";
import { ConflictError, JobOsService, type IntakeProvider } from "../../server/jobos/service";
import { NotFoundError, type JobOsStore } from "../../server/jobos/store";
import { DEFAULT_ECONOMICS_CONFIG, ConfigValidationError, QuotePolicyError, findInternalKeys } from "../../shared/pricing";
import { InvoicePolicyError } from "../../shared/jobos";
import { createTestDb } from "./pg";

// The SAME lifecycle suite runs against the in-memory store and a real Postgres engine (PGlite),
// so the Drizzle store is verified against actual SQL, not just types.

let pg: Awaited<ReturnType<typeof createTestDb>>;
before(async () => {
  pg = await createTestDb();
});
after(async () => {
  await pg.client.close();
});

const nearby = { oneWayMiles: 8, oneWayDriveMinutes: 20 };
const basicScope = { tvs: [{ id: "tv-1", sizeBand: "56+", wall: "drywall", location: "standard", mountSource: "customer", wire: "visible", power: "existing" }] };

const impls: Array<[string, () => JobOsStore]> = [
  ["memory", () => new MemoryJobOsStore()],
  ["postgres", () => new DbJobOsStore(pg.db as never)],
];

for (const [name, makeStore] of impls) {
  const t = (title: string, fn: () => Promise<void>) =>
    test(`[${name}] ${title}`, async () => {
      if (name === "postgres") {
        // Isolate tests: the embedded database is shared across the file.
        await pg.client.exec(
          "TRUNCATE pricing_configs, pricing_config_events, jobs, scope_items, quotes, quote_versions, travel_estimates, material_estimates, invoice_counters, invoices, payments, job_actuals, ai_intake_cache RESTART IDENTITY",
        );
      }
      await fn();
    });
  const fresh = (opts: ConstructorParameters<typeof JobOsService>[1] = {}) => new JobOsService(makeStore(), opts);
  const seeded = async (opts?: ConstructorParameters<typeof JobOsService>[1]) => {
    const svc = fresh(opts);
    const job = await svc.createJob({ title: "Test job (synthetic)", zip: "30303", scope: basicScope, context: nearby });
    return { svc, job };
  };

  t("config: seeds v1 defaults; updates create audited versions; rollback works; bad configs rejected", async () => {
    const svc = fresh();
    const v1 = await svc.getActiveConfig();
    assert.equal(v1.version, 1);
    assert.equal(v1.config.calibration, "uncalibrated-default");

    await assert.rejects(() => svc.updateConfig({ config: DEFAULT_ECONOMICS_CONFIG, reason: "no change" }, "owner"), ConflictError);
    await assert.rejects(() => svc.updateConfig({ config: DEFAULT_ECONOMICS_CONFIG }, "owner"), /reason/i);

    const edited = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
    edited.labor.targetLaborPerHourCents = 8_000;
    edited.travel.mpg = 19;
    const v2 = await svc.updateConfig({ config: edited, reason: "owner set labor value" }, "owner");
    assert.equal(v2.version, 2);
    assert.equal(v2.isActive, true);
    assert.equal(v2.config.calibration, "owner-edited");
    assert.deepEqual(v2.changedPaths.sort(), ["labor.targetLaborPerHourCents", "travel.mpg"]);
    assert.equal((await svc.getActiveConfig()).version, 2);
    assert.equal((await svc.listVersionsForAdmin()).length, 2);

    const bad = JSON.parse(JSON.stringify(edited));
    bad.travel.googleMapsApiKey = "x";
    await assert.rejects(() => svc.updateConfig({ config: bad, reason: "try secret" }, "owner"), ConfigValidationError);
    const neg = JSON.parse(JSON.stringify(edited));
    neg.business.minimumTicketCents = -5;
    await assert.rejects(() => svc.updateConfig({ config: neg, reason: "negative" }, "owner"), ConfigValidationError);

    await svc.rollbackConfig(1, "owner");
    assert.equal((await svc.getActiveConfig()).version, 1);
    const events = await svc.listConfigEventsForAdmin();
    assert.ok(events.some((e) => e.action === "seeded"));
    assert.ok(events.some((e) => e.action === "created" && e.actor === "owner"));
    assert.ok(events.filter((e) => e.action === "activated").length >= 3);
    await assert.rejects(() => svc.rollbackConfig(99, "owner"), NotFoundError);
  });

  t("job: create, scope update, scope_items projection, locked after invoicing", async () => {
    const { svc, job } = await seeded();
    assert.equal(job.status, "scoped");
    const updated = await svc.updateScope(job.id, { tvs: [...basicScope.tvs, { ...basicScope.tvs[0], id: "tv-2" }] }, nearby);
    assert.equal((updated.scope as { tvs: unknown[] }).tvs.length, 2);
    await assert.rejects(() => svc.updateScope(job.id, { tvs: [{ id: "x", sizeBand: "99" }] }, nearby));
    assert.equal((await svc.listJobs()).length >= 1, true);
    await assert.rejects(() => svc.getJob("00000000-0000-4000-8000-000000000000"), NotFoundError);
  });

  t("quote versions are immutable snapshots tied to a config version; old economics are never rewritten", async () => {
    const { svc, job } = await seeded();
    const first = await svc.createQuoteVersion(job.id, {});
    assert.equal(first.version.version, 1);
    assert.equal(first.version.customerAmountCents, 10_000, "legacy catalog price is unchanged");
    assert.equal(first.version.configVersion, 1);

    const edited = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
    edited.labor.targetLaborPerHourCents = 12_000;
    await svc.updateConfig({ config: edited, reason: "raise labor value" }, "owner");

    const second = await svc.createQuoteVersion(job.id, { adjustment: { type: "discount", discountCents: 1_000, reason: "bundle" } });
    assert.equal(second.version.version, 2);
    assert.equal(second.version.configVersion, 2);
    assert.equal(second.version.customerAmountCents, 9_000);
    assert.equal(second.version.discountCents, 1_000);
    assert.ok(second.version.floorCents > first.version.floorCents, "new config raises the floor");

    const { versions } = await svc.jobDetail(job.id);
    assert.equal(versions.length, 2);
    const v1Again = versions[0]!;
    assert.equal(v1Again.snapshotHash, first.version.snapshotHash);
    assert.equal(v1Again.floorCents, first.version.floorCents, "historical economics preserved");
    assert.equal(v1Again.configVersion, 1);

    await assert.rejects(() => svc.createQuoteVersion(job.id, { adjustment: { type: "discount", discountCents: 9_999, reason: "bundle" } }), QuotePolicyError);
    await assert.rejects(() => svc.createQuoteVersion(job.id, { adjustment: { type: "override", amountCents: 9_000, reason: "other" } }));
  });

  t("empty scope cannot be quoted", async () => {
    const svc = fresh();
    const job = await svc.createJob({ title: "Empty (synthetic)" });
    assert.equal(job.status, "lead");
    await assert.rejects(() => svc.createQuoteVersion(job.id, {}), /at least one TV/);
  });

  t("customer quote: draft is invisible, sent is visible and customer-safe, accept locks, reopen revises", async () => {
    const { svc, job } = await seeded();
    const { quote, version } = await svc.createQuoteVersion(job.id, { adjustment: { type: "override", amountCents: 9_000, reason: "competitive", note: "matched" } });
    await assert.rejects(() => svc.getCustomerQuote(quote.shareToken), NotFoundError);
    await svc.markQuoteSent(quote.id);
    const { view, status } = await svc.getCustomerQuote(quote.shareToken);
    assert.equal(status, "sent");
    assert.equal(view.totalCents, 9_000);
    assert.deepEqual(findInternalKeys(view), []);
    const json = JSON.stringify(view).toLowerCase();
    for (const banned of ["floor", "margin", "competitive", "matched", "recommended", "cost"]) assert.ok(!json.includes(banned), banned);
    await assert.rejects(() => svc.getCustomerQuote("00000000-0000-4000-8000-000000000000"), NotFoundError);

    const accepted = await svc.acceptCustomerQuote(quote.shareToken);
    assert.equal(accepted.status, "accepted");
    const detail = await svc.jobDetail(job.id);
    assert.ok(detail.versions[0]!.acceptedAt);
    assert.equal(detail.versions[0]!.id, version.id);

    await assert.rejects(() => svc.createQuoteVersion(job.id, {}), (e: unknown) => e instanceof ConflictError && e.code === "QUOTE_ACCEPTED");
    const revised = await svc.createQuoteVersion(job.id, { reopen: true });
    assert.equal(revised.version.version, 2);
    const after = await svc.jobDetail(job.id);
    assert.ok(after.versions[0]!.acceptedAt, "the accepted version keeps its acceptance");
    assert.equal(after.quote!.status, "draft");
  });

  t("actuals: profitability vs the quote snapshot, upsert keeps one row, job completes", async () => {
    const { svc, job } = await seeded();
    await svc.createQuoteVersion(job.id, {});
    const rec = await svc.recordActuals(job.id, { laborMinutes: 80, travelMinutes: 45, mileage: 16, actualMaterialsCents: 700, collectedCents: 10_000, paymentMethod: "zelle", tipCents: 500, unexpectedConditions: ["hidden_wiring"], notes: "synthetic" });
    assert.ok(rec.profitability);
    assert.equal(rec.profitability!.estimate, true);
    assert.equal(rec.profitability!.quotedCents, 10_000);
    assert.equal(rec.profitability!.tipCents, 500);
    assert.equal((await svc.getJob(job.id)).status, "completed");
    const again = await svc.recordActuals(job.id, { laborMinutes: 70, travelMinutes: 40, mileage: 16, actualMaterialsCents: 700, collectedCents: 10_000, paymentMethod: "zelle" });
    assert.equal(again.id, rec.id);
    assert.equal(again.actuals.laborMinutes, 70);
    await assert.rejects(() => svc.recordActuals(job.id, { laborMinutes: 70, collectedCents: 100 }), /paymentMethod/);
    await assert.rejects(() => svc.getProfitability("00000000-0000-4000-8000-000000000000"), NotFoundError);
  });

  t("invoice and payments: numbering, totals, partial/full payment, overpayment and void rules", async () => {
    const { svc, job } = await seeded();
    await svc.createQuoteVersion(job.id, {});
    const inv = await svc.createInvoice(job.id, {});
    assert.match(inv.invoiceNumber, /^INV-\d{4}-0001$/);
    assert.equal(inv.totalCents, 10_000);
    assert.equal(inv.taxCents, 0, "no tax unless the owner enables it");
    assert.equal(inv.status, "draft");
    assert.equal((await svc.getJob(job.id)).status, "invoiced");

    const sent = await svc.sendInvoice(inv.id);
    assert.equal(sent.status, "sent");
    const partial = await svc.recordPayment(inv.id, { amountCents: 4_000, method: "venmo", reference: "demo-ref" });
    assert.equal(partial.invoice.status, "partially_paid");
    assert.equal(partial.balanceCents, 6_000);
    await assert.rejects(() => svc.recordPayment(inv.id, { amountCents: 7_000, method: "cash" }), InvoicePolicyError);
    await assert.rejects(() => svc.voidInvoice(inv.id), InvoicePolicyError);
    const full = await svc.recordPayment(inv.id, { amountCents: 6_000, method: "cash", tipCents: 1_000 });
    assert.equal(full.invoice.status, "paid");
    assert.equal(full.balanceCents, 0);
    assert.equal((await svc.getJob(job.id)).status, "paid");
    await assert.rejects(() => svc.recordPayment(inv.id, { amountCents: 1, method: "cash" }), InvoicePolicyError);

    const job2 = await svc.createJob({ title: "Second (synthetic)", scope: basicScope, context: nearby });
    await svc.createQuoteVersion(job2.id, {});
    const inv2 = await svc.createInvoice(job2.id, {});
    assert.match(inv2.invoiceNumber, /^INV-\d{4}-0002$/);
    const voided = await svc.voidInvoice(inv2.id);
    assert.equal(voided.status, "void");
    await assert.rejects(() => svc.recordPayment(inv2.id, { amountCents: 100, method: "cash" }), InvoicePolicyError);
  });

  t("invoice tax follows owner config only, and the invoice snapshots the tax config used", async () => {
    const svc = fresh();
    const edited = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
    edited.business.tax = { enabled: true, rateBps: 700, label: "Owner-configured tax" };
    await svc.updateConfig({ config: edited, reason: "owner enabled tax for test" }, "owner");
    const job = await svc.createJob({ title: "Taxed (synthetic)", scope: basicScope, context: nearby });
    await svc.createQuoteVersion(job.id, {});
    const inv = await svc.createInvoice(job.id, {});
    assert.equal(inv.taxCents, 700);
    assert.equal(inv.totalCents, 10_700);
    assert.equal(inv.taxConfigSnapshot.rateBps, 700);
    const manual = await svc.createInvoice(job.id, { lines: [{ description: "Manual", qty: 2, unitCents: 5_000 }], discountCents: 1_000 });
    assert.equal(manual.subtotalCents, 10_000);
    assert.equal(manual.totalCents, 9_000 + 630);
    const noQuote = await svc.createJob({ title: "No quote (synthetic)" });
    await assert.rejects(() => svc.createInvoice(noQuote.id, {}), /No billable lines/);
  });

  t("pricing intelligence: synthetic jobs are excluded by default; real jobs yield advisory suggestions only", async () => {
    const svc = fresh();
    for (let i = 0; i < 6; i++) {
      const job = await svc.createJob({ title: `Seed ${i} (synthetic)`, source: i < 3 ? "synthetic" : "manual", scope: basicScope, context: nearby });
      await svc.createQuoteVersion(job.id, {});
      await svc.recordActuals(job.id, { laborMinutes: 100, travelMinutes: 45, mileage: 16, actualMaterialsCents: 500, collectedCents: 10_000, paymentMethod: "cash" });
    }
    const real = await svc.intelligence();
    assert.equal(real.report.sampleSize, 3);
    assert.equal(real.report.syntheticExcluded, 3);
    assert.equal(real.report.sufficientData, false);
    assert.deepEqual(real.report.suggestions, []);
    const all = await svc.intelligence({ includeSynthetic: true });
    assert.equal(all.report.sampleSize, 6);
    assert.equal(all.report.sufficientData, true);
    assert.ok(all.report.suggestions.length > 0);
    assert.ok(all.report.suggestions.every((s) => s.applied === false));
    assert.equal((await svc.getActiveConfig()).version, 1, "intelligence never changes configuration");
    const jobs = await svc.listJobs();
    const comparable = await svc.intelligence({ includeSynthetic: true, comparableTo: jobs[0]!.id });
    assert.ok(comparable.comparable.length > 0);
  });

  t("AI intake: heuristic fallback, caching, provider validation, evidence downgrade, and no AI when disallowed", async () => {
    let calls = 0;
    const good = (evidence: string) =>
      JSON.stringify({
        tvs: [{
          sizeBand: { value: "56+", status: "known", evidence: "65 inch" },
          inches: { value: 65, status: "known", evidence: "65 inch" },
          wall: { value: "brick", status: "known", evidence },
          location: { value: null, status: "unknown" },
          mountSource: { value: null, status: "unknown" },
          mountType: { value: null, status: "unknown" },
          wire: { value: null, status: "unknown" },
          power: { value: null, status: "unknown" },
          tvRemoval: { value: null, status: "unknown" },
          remount: { value: null, status: "unknown" },
        }],
        extras: [],
        summary: "x",
        openQuestions: [],
      });
    let reply = good("brick wall");
    const provider: IntakeProvider = { name: "mock", enabled: () => true, complete: async () => { calls += 1; return reply; } };
    const svc = fresh({ intakeProvider: provider });

    const noAi = await svc.parseIntake("Mount a 65 inch TV on a brick wall please", { allowAi: false });
    assert.equal(noAi.aiUsed, false);
    assert.equal(calls, 0, "normal UI path needs zero AI calls");

    const ai = await svc.parseIntake("Please mount my 65 inch TV on the brick wall", { allowAi: true });
    assert.equal(ai.aiUsed, true);
    assert.equal(calls, 1);
    assert.equal(ai.draft.needsOwnerConfirmation, true);
    const cached = await svc.parseIntake("Please mount my 65 inch TV on the brick wall", { allowAi: true });
    assert.equal(cached.cached, true);
    assert.equal(calls, 1, "parsed scope is cached");

    reply = good("fabricated phrase not in the message");
    const fab = await svc.parseIntake("Put a 65 inch TV up somewhere for me", { allowAi: true });
    assert.ok(fab.downgraded.includes("tvs[0].wall"));

    reply = "not json at all";
    const bad = await svc.parseIntake("Hang two TVs in my living room tomorrow", { allowAi: true });
    assert.equal(bad.aiUsed, false, "invalid AI output falls back to the deterministic parser");
    await assert.rejects(() => svc.parseIntake("hi", { allowAi: false }));
  });
}
