import assert from "node:assert/strict";
import test from "node:test";
import { composeQuote, economicsAtPrice, priceScope, toCustomerView, findInternalKeys, SIZE_BANDS, WALL_TYPES, TV_LOCATIONS, MOUNT_SOURCES, WIRE_MODES, POWER_MODES, EXTRA_KINDS, CLEANUP_LEVELS } from "../../shared/pricing";
import { cfg, scope } from "./helpers";

// Deterministic pseudo-random generator so "weird combinations" are reproducible.
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
const pick = <T,>(r: () => number, xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;

function randomScope(r: () => number) {
  const n = Math.floor(r() * 7);
  const tvs = Array.from({ length: n }, (_, i) => {
    const mountSource = pick(r, MOUNT_SOURCES);
    return {
      id: `tv-${i + 1}`,
      sizeBand: pick(r, SIZE_BANDS),
      wall: pick(r, WALL_TYPES),
      location: pick(r, TV_LOCATIONS),
      mountSource,
      mountType: mountSource === "pptv" ? pick(r, ["fixed", "tilt", "full_motion"] as const) : null,
      wire: pick(r, WIRE_MODES),
      power: pick(r, POWER_MODES),
      removal: { tvRemoval: r() > 0.7, mountRemoval: r() > 0.8, remount: r() > 0.8 },
    };
  });
  const extras = Array.from({ length: Math.floor(r() * 4) }, () => ({ kind: pick(r, EXTRA_KINDS), qty: 1 + Math.floor(r() * 3), customMinutes: Math.floor(r() * 90), customMaterialsCents: Math.floor(r() * 5_000) }));
  return {
    tvs,
    extras,
    access: { level: pick(r, ["normal", "difficult"] as const), furnitureMovement: r() > 0.5, ladderHeight: r() > 0.5, helper: r() > 0.5 },
    cleanup: pick(r, CLEANUP_LEVELS),
  };
}

function randomContext(r: () => number) {
  const known = r() > 0.25;
  return {
    ...(known ? { oneWayMiles: Math.floor(r() * 80), oneWayDriveMinutes: Math.floor(r() * 120) } : {}),
    appointmentTime: r() > 0.5 ? `${String(Math.floor(r() * 24)).padStart(2, "0")}:${r() > 0.5 ? "00" : "30"}` : undefined,
    weekday: Math.floor(r() * 7),
    sameDay: r() > 0.8,
    awkwardGap: r() > 0.8,
    trafficMultiplier: r() > 0.5 ? 0.5 + r() * 4 : undefined,
  };
}

test("invariants hold across 600 random weird combinations", () => {
  const r = rng(20261001);
  const config = cfg();
  const dynamic = cfg((c) => (c.pricingMode = "dynamic"));
  for (let i = 0; i < 600; i++) {
    const s = randomScope(r);
    const ctx = randomContext(r);
    const res = priceScope(s, ctx, config);

    // numeric sanity
    const nums = [res.floorCents, res.recommendedCents, res.premiumCents, res.costToServeCents, res.outOfPocketCents, res.ownerValueCents, res.legacy.totalCents, res.labor.minutes, res.labor.helperMinutes, res.travel.roundTripMiles, res.travel.roundTripDriveMinutes, res.materials.costCents, res.materials.chargeCents];
    for (const v of nums) {
      assert.ok(Number.isFinite(v), `non-finite at case ${i}`);
      assert.ok(v >= 0, `negative at case ${i}`);
    }
    for (const v of [res.floorCents, res.recommendedCents, res.premiumCents, res.costToServeCents]) assert.equal(v, Math.round(v), "integer cents");

    // ordering and floors
    if (!res.empty) {
      assert.ok(res.floorCents >= config.business.minimumTicketCents, `floor below min ticket, case ${i}`);
      assert.ok(res.floorCents <= res.recommendedCents && res.recommendedCents <= res.premiumCents, `order, case ${i}`);
      const e = economicsAtPrice(res, res.floorCents);
      assert.ok(e.marginPct >= config.business.minimumMarginPct - 0.02, `floor margin ${e.marginPct} case ${i}`);
      assert.ok(e.marginPct < 1, "impossible margin");
    }

    // quotes
    for (const c of [config, dynamic]) {
      const q = composeQuote({ scope: s, context: ctx, config: c });
      assert.ok(q.customerTotalCents >= 0);
      assert.ok(Number.isFinite(q.economics.marginPct));
      const view = toCustomerView(q, { version: 1, createdAt: "2026-10-01T00:00:00.000Z" });
      assert.deepEqual(findInternalKeys(view), [], `leak case ${i}`);
      if (c.pricingMode === "dynamic" && !q.pricing.empty) {
        assert.equal(view.lines.reduce((sum, l) => sum + (l.amountCents ?? 0), 0), q.customerTotalCents, `dynamic lines sum, case ${i}`);
      }
    }
  }
});

test("determinism over random cases: pricing twice gives byte-identical JSON", () => {
  const r = rng(7);
  for (let i = 0; i < 100; i++) {
    const s = randomScope(r);
    const ctx = randomContext(r);
    assert.equal(JSON.stringify(priceScope(s, ctx, cfg())), JSON.stringify(priceScope(s, ctx, cfg())));
  }
});

test("higher labor value never lowers the floor; more miles never lowers cost", () => {
  const s = scope();
  const base = priceScope(s, { oneWayMiles: 10, oneWayDriveMinutes: 20 }, cfg());
  const richer = priceScope(s, { oneWayMiles: 10, oneWayDriveMinutes: 20 }, cfg((c) => (c.labor.targetLaborPerHourCents = 12_000)));
  assert.ok(richer.floorCents >= base.floorCents);
  let last = 0;
  for (let miles = 0; miles <= 60; miles += 3) {
    const res = priceScope(s, { oneWayMiles: miles, oneWayDriveMinutes: miles * 2 }, cfg());
    assert.ok(res.travel.costCents >= last, `travel monotonic at ${miles}`);
    last = res.travel.costCents;
  }
});

test("hostile numeric inputs are rejected at validation, not priced", () => {
  assert.throws(() => priceScope(scope(), { oneWayMiles: -5 }, cfg()));
  assert.throws(() => priceScope(scope(), { oneWayMiles: Number.NaN }, cfg()));
  assert.throws(() => priceScope(scope(), { oneWayMiles: Number.POSITIVE_INFINITY }, cfg()));
  assert.throws(() => priceScope({ tvs: [{ id: "x", sizeBand: "99" }] } as never, {}, cfg()));
  assert.throws(() => priceScope({ extras: [{ kind: "custom", qty: -1 }] } as never, {}, cfg()));
  assert.throws(() => priceScope({ extras: [{ kind: "custom", qty: 1, customMinutes: 1e12 }] } as never, {}, cfg()));
});

test("helper share and premium invariants across 400 random jobs", () => {
  const r = rng(20261002);
  const config = cfg();
  for (let i = 0; i < 400; i++) {
    const s = randomScope(r);
    const ctx = randomContext(r);
    const res = priceScope(s, ctx, config);
    if (res.empty) continue;
    // premium never touches the floor and is always capped
    assert.ok(res.premium.pct >= 0 && res.premium.pct <= config.business.riskPremium.maxTotalPct + 1e-9, `premium cap case ${i}`);
    for (const p of [res.floorCents, res.recommendedCents, res.premiumCents]) {
      const e = economicsAtPrice(res, p);
      for (const v of [e.helperCostCents, e.outOfPocketCents, e.costToServeCents]) assert.ok(Number.isFinite(v) && v >= 0, `econ case ${i}`);
      if (res.helperPay.mode === "labor_revenue_share") {
        // 20% of labor revenue: never more than 20% of the price, never a share of pass-through revenue.
        assert.ok(e.helperCostCents <= Math.round(0.2 * p), `helper share bound case ${i}`);
        assert.equal(e.helperCostCents, Math.round(0.2 * Math.max(0, p - res.helperPay.passThroughCents)));
      } else if (res.helperPay.mode === "none") {
        assert.equal(e.helperCostCents, 0);
      }
    }
    // the floor really keeps the minimum margin with the helper paid at the floor price
    assert.ok(economicsAtPrice(res, res.floorCents).marginPct >= config.business.minimumMarginPct - 0.02, `floor margin case ${i}`);
    // no accidental $0 work
    assert.ok(res.recommendedCents >= config.business.minimumTicketCents);
  }
});
