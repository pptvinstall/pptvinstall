import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { DbJobOsStore } from "../../server/jobos/dbStore";
import { MemoryJobOsStore } from "../../server/jobos/memoryStore";
import { ConflictError, JobOsService } from "../../server/jobos/service";
import type { JobOsStore } from "../../server/jobos/store";
import { DEFAULT_ECONOMICS_CONFIG, findInternalKeys } from "../../shared/pricing";
import { calculateQuote } from "../../client/src/lib/quote-calculator";
import { createTestDb } from "./pg";

// Shadow pricing and the learning loop, on the in-memory store AND real Postgres (PGlite).

let pg: Awaited<ReturnType<typeof createTestDb>>;
before(async () => {
  pg = await createTestDb();
});
after(async () => {
  await pg.client.close();
});

const impls: Array<[string, () => JobOsStore]> = [
  ["memory", () => new MemoryJobOsStore()],
  ["postgres", () => new DbJobOsStore(pg.db as never)],
];

const form = {
  tvs: [{ id: "b-1", size: "56+", wallType: "drywall", location: "fireplace", hasMount: true, mountType: null, wireConcealment: false, outletDistance: null, unmounting: false }],
  cameras: [],
  doorbell: false,
  doorbellBrand: "",
  soundbar: false,
  surroundSound: false,
  floodlight: false,
  handymanMinutes: 0,
  zipCode: "30332",
};
const catalogCents = Math.round(calculateQuote({ ...form, notes: "" } as never).total * 100);
const nearby = { oneWayMiles: 8, oneWayDriveMinutes: 20 };
const helperScope = { tvs: [{ id: "tv-1", sizeBand: "56+", inches: 75, wall: "drywall", location: "standard", mountSource: "customer", wire: "visible", power: "existing" }], access: { helper: true } };

for (const [name, makeStore] of impls) {
  let day = 1;
  const t = (title: string, fn: () => Promise<void>) =>
    test(`[${name}] ${title}`, async () => {
      if (name === "postgres") {
        await pg.client.exec(
          "TRUNCATE pricing_configs, pricing_config_events, jobs, scope_items, quotes, quote_versions, travel_estimates, material_estimates, invoice_counters, invoices, payments, job_actuals, ai_intake_cache, pricing_shadow_samples RESTART IDENTITY",
        );
      }
      await fn();
    });
  const fresh = () => new JobOsService(makeStore(), { now: () => new Date(`2026-10-${String(day).padStart(2, "0")}T15:00:00.000Z`) });

  t("legacy records nothing; shadow shows the catalog and stores one deduped owner-only sample per day", async () => {
    day = 2;
    const svc = fresh();
    assert.deepEqual(await svc.publicPrice({ form, stage: "review" }), { source: "catalog", totalCents: catalogCents });
    assert.equal((await svc.shadowReport()).stats.count, 0);

    const cfg = (await svc.getActiveConfig()).config;
    await svc.updateConfig({ config: { ...cfg, pricingMode: "shadow" }, reason: "shadow on" }, "owner");
    for (let i = 0; i < 3; i++) assert.deepEqual(await svc.publicPrice({ form: { ...form, tvs: [{ ...form.tvs[0], id: `b-${i}` }] }, stage: "review" }), { source: "catalog", totalCents: catalogCents });
    await svc.publicPrice({ form, stage: "live" });
    const report = await svc.shadowReport();
    assert.equal(report.stats.count, 1);
    const s = report.samples[0]!;
    assert.equal(s.shownCents, catalogCents);
    assert.equal(s.pricingMode, "shadow");
    assert.ok(s.summary.premiumFactors.includes("Fireplace"));
    assert.ok(s.summary.atShown.costToServeCents > 0 && Number.isFinite(s.summary.atShown.marginPct));
    assert.equal(report.stats.comparableCount, 1);
    assert.equal(report.stats.shownBelowFloor, s.shownCents < s.floorCents ? 1 : 0);

  });

  t("shadow sample becomes a job exactly once; the job re-prices with the stored scope", async () => {
    day = 4;
    const svc = fresh();
    const cfg = (await svc.getActiveConfig()).config;
    await svc.updateConfig({ config: { ...cfg, pricingMode: "shadow" }, reason: "shadow on" }, "owner");
    await svc.publicPrice({ form, stage: "review" });
    const [sample] = (await svc.shadowReport()).samples;
    const job = await svc.createJobFromShadowSample(sample!.id);
    assert.equal(job.source, "quote_tool");
    assert.equal(job.zip, "30332");
    await assert.rejects(() => svc.createJobFromShadowSample(sample!.id), ConflictError);
    const { version } = await svc.createQuoteVersion(job.id, {});
    assert.equal(version.customerAmountCents, catalogCents, "shadow mode still quotes the catalog price on the job");
    assert.deepEqual(findInternalKeys(version.customerView), []);
  });

  t("dynamic mode requires confirmation; public price then follows the engine", async () => {
    day = 5;
    const svc = fresh();
    const cfg = (await svc.getActiveConfig()).config;
    await assert.rejects(() => svc.updateConfig({ config: { ...cfg, pricingMode: "dynamic" }, reason: "go dynamic" }, "owner"), (e: unknown) => e instanceof ConflictError && e.code === "DYNAMIC_CONFIRMATION_REQUIRED");
    await svc.updateConfig({ config: { ...cfg, pricingMode: "dynamic" }, reason: "go dynamic", confirmDynamic: "Change customer prices " }, "owner");
    const res = await svc.publicPrice({ form, stage: "review" });
    assert.equal(res.source, "engine");
    if (res.source === "engine") {
      assert.ok((res.totalCents ?? 0) >= DEFAULT_ECONOMICS_CONFIG.business.minimumTicketCents);
      assert.deepEqual(findInternalKeys(res), []);
    }
    assert.equal((await svc.shadowReport()).samples[0]!.summary.shownSource, "engine");
  });

  t("learning loop: helper at 20% of labor revenue, estimate vs actual variances, owner-hourly advice never auto-applied", async () => {
    day = 6;
    const svc = fresh();
    const quoted: number[] = [];
    for (let i = 0; i < 5; i++) {
      const job = await svc.createJob({ title: `Helper job ${i}`, scope: helperScope, context: nearby });
      const { version } = await svc.createQuoteVersion(job.id, { adjustment: { type: "override", amountCents: 30_000, reason: "other", note: "owner price" } });
      quoted.push(version.customerAmountCents);
      const pricing = version.snapshot.composition.pricing;
      assert.equal(pricing.helperPay.mode, "labor_revenue_share");
      const rec = await svc.recordActuals(job.id, { laborMinutes: 240, helperMinutes: 120, travelMinutes: 60, mileage: 20, actualMaterialsCents: 500, collectedCents: 30_000, paymentMethod: "cash", ...(i === 0 ? { helperPaidCents: 7_000 } : {}) });
      const p = rec.profitability!;
      const pass = pricing.helperPay.passThroughCents;
      assert.equal(p.variances.helperCents.estimate, Math.round(0.2 * (30_000 - pass)));
      if (i === 0) {
        assert.equal(p.helperBasis, "paid");
        assert.equal(p.helperCostCents, 7_000);
      } else {
        assert.equal(p.helperBasis, "labor_revenue_share");
        assert.equal(p.helperCostCents, Math.round(0.2 * (30_000 - pass)));
      }
      assert.ok(p.variances.netMarginPct.actual < p.variances.netMarginPct.estimate, "a long job shows lower actual margin");
      assert.ok(Number.isFinite(p.variances.effectivePerHourCents.actual));
    }
    const before = (await svc.getActiveConfig()).version;
    const intel = await svc.intelligence({ includeSynthetic: true });
    const hourly = intel.report.suggestions.find((s) => s.metric === "ownerHourly");
    assert.ok(hourly, "low owner $/hr produces advice");
    assert.equal(hourly!.applied, false);
    assert.match(hourly!.message, /nothing has been changed/);
    assert.equal((await svc.getActiveConfig()).version, before, "config never changes from actuals");
    assert.equal(quoted.length, 5);
  });
}
