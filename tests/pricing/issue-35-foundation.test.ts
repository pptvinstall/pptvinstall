import assert from "node:assert/strict";
import test from "node:test";

import { priceScope } from "../../shared/pricing";
import { shadowRouteTravel } from "../../shared/pricing/travelShadow";
import {
  captureTravelShadowLog,
  resolveTravelShadowLogging,
  TRAVEL_SHADOW_LOGGING_DISABLED,
} from "../../shared/pricing/travelShadowLog";
import {
  createWebsiteQuoteSnapshot,
  verifyWebsiteQuoteSnapshot,
} from "../../shared/pricing/websiteSnapshot";
import { calculateQuote, createDefaultQuoteFormState } from "../../client/src/lib/quote-calculator";
import { cfg, nearby, scope, tv } from "./helpers";

// Issue #35 foundation change set:
//  S-7  premium must not double-charge difficulty already paid in labor minutes
//  S-11 immutable website quote snapshots attached to bookings
//  S-6  unified route-based travel pricing as a shadow calculation (inactive)

// ── S-7: no double-count ─────────────────────────────────────────────────────

test("S-7: brick fireplace — fireplace + masonry premiums are counted in labor minutes, not charged again", () => {
  const r = priceScope(scope([tv({ location: "fireplace", wall: "brick" })]), nearby, cfg());
  const fireplace = r.premium.factors.find((f) => f.key === "fireplace");
  const masonry = r.premium.factors.find((f) => f.key === "masonry");
  assert.ok(fireplace && masonry, "both factors are still detected and reported");
  assert.equal(fireplace.countedInLaborMinutes, true);
  assert.equal(masonry.countedInLaborMinutes, true);
  assert.equal(fireplace.appliedPct, 0);
  assert.equal(masonry.appliedPct, 0);
  // Configured total is still transparent (0.04 + 0.03), applied total is 0.
  assert.equal(r.premium.rawPct, 0.07);
  assert.equal(r.premium.pct, 0);
  // The difficulty is still paid — once — through labor minutes.
  assert.ok(r.labor.minutes > priceScope(scope([tv()]), nearby, cfg()).labor.minutes);
  // Catalog baselines hold.
  assert.equal(r.legacy.totalCents, 20_000);
});

test("S-7: a non-compensated factor still applies on top (helper with a brick fireplace)", () => {
  const r = priceScope(scope([tv({ location: "fireplace", wall: "brick" })], { access: { helper: true } as never }), nearby, cfg());
  const helper = r.premium.factors.find((f) => f.key === "helper");
  assert.ok(helper);
  assert.equal(helper.countedInLaborMinutes, false);
  assert.equal(helper.appliedPct, 0.02);
  assert.equal(r.premium.pct, 0.02);
  // The job is still complex — complexity reads the configured total, not the charge.
  assert.equal(r.premium.complexity, "complex");
  assert.ok(r.priceDrivers.some((d) => d.key === "premium.helper"));
  assert.ok(!r.priceDrivers.some((d) => d.key === "premium.fireplace" || d.key === "premium.masonry"));
});

test("S-7: standard scenarios are unchanged ($100 / $200 / $200 / $300 catalog baselines)", () => {
  assert.equal(priceScope(scope([tv()]), nearby, cfg()).legacy.totalCents, 10_000);
  assert.equal(priceScope(scope([tv(), tv({ id: "tv-2" })]), nearby, cfg()).legacy.totalCents, 20_000);
  assert.equal(priceScope(scope([tv({ location: "fireplace" })]), nearby, cfg()).legacy.totalCents, 20_000);
  assert.equal(priceScope(scope([tv(), tv({ id: "tv-2", location: "fireplace" })]), nearby, cfg()).legacy.totalCents, 30_000);
  const plain = priceScope(scope([tv()]), nearby, cfg());
  assert.equal(plain.premium.pct, 0);
  assert.equal(plain.premium.complexity, "standard");
});

test("S-7 steel studs (owner rule 2026-11-27): only the share already paid in labor minutes is de-stacked — hardware/risk premium remains", () => {
  const r = priceScope(scope([tv({ wall: "steel" })]), nearby, cfg());
  const steel = r.premium.factors.find((f) => f.key === "steel_studs");
  assert.ok(steel, "steel factor is still detected and reported");
  // Configured premium is 2%; half of it duplicates the steel wall minutes.
  assert.equal(steel.pct, 0.02);
  assert.equal(steel.laborCountedShare, 0.5);
  assert.equal(steel.appliedPct, 0.01);
  assert.equal(steel.countedInLaborMinutes, false, "partially counted is not fully counted");
  assert.equal(r.premium.rawPct, 0.02, "configured total stays transparent");
  assert.equal(r.premium.pct, 0.01, "only the non-duplicating half is charged");
  // No double-count, stated both ways: charged premium (1%) + labor-paid
  // share (1%) equals the configured premium (2%) — never more.
  assert.equal(steel.appliedPct + steel.pct * steel.laborCountedShare, steel.pct);
  // The extra labor itself is paid exactly once, through minutes.
  const dry = priceScope(scope([tv()]), nearby, cfg());
  assert.ok(r.labor.minutes > dry.labor.minutes, "steel wall minutes exceed drywall minutes");
  // The retained premium is a real price driver, not a footnote.
  assert.ok(r.priceDrivers.some((d) => d.key === "premium.steel_studs"));
});

test("S-7 steel studs: a steel-only job still prices its genuine increment above a plain drywall job", () => {
  const dry = priceScope(scope([tv()]), nearby, cfg());
  const steel = priceScope(scope([tv({ wall: "steel" })]), nearby, cfg());
  assert.ok(steel.recommendedCents > dry.recommendedCents, "recommended price reflects hardware/labor/risk increment");
  assert.ok(steel.legacy.totalCents > dry.legacy.totalCents, "catalog steel/high-rise increment still applies");
  // Catalog baselines are untouched by the premium change.
  assert.equal(dry.legacy.totalCents, 10_000);
  assert.equal(priceScope(scope([tv({ location: "fireplace" })]), nearby, cfg()).legacy.totalCents, 20_000);
  assert.equal(priceScope(scope([tv({ location: "fireplace", wall: "brick" })]), nearby, cfg()).legacy.totalCents, 20_000);
  assert.equal(priceScope(scope([tv(), tv({ id: "tv-2", location: "fireplace" })]), nearby, cfg()).legacy.totalCents, 30_000);
});

test("S-7 steel studs: the de-stack share is configuration, not hardcode — share 1 fully de-stacks, share 0 fully stacks", () => {
  const full = priceScope(scope([tv({ wall: "steel" })]), nearby, cfg((c) => { c.business.riskPremium.laborCountedShare.steel_studs = 1; }));
  const fullSteel = full.premium.factors.find((f) => f.key === "steel_studs");
  assert.ok(fullSteel);
  assert.equal(fullSteel.appliedPct, 0);
  assert.equal(fullSteel.countedInLaborMinutes, true);
  assert.equal(full.premium.pct, 0);
  const none = priceScope(scope([tv({ wall: "steel" })]), nearby, cfg((c) => { c.business.riskPremium.laborCountedShare.steel_studs = 0; }));
  const noneSteel = none.premium.factors.find((f) => f.key === "steel_studs");
  assert.ok(noneSteel);
  assert.equal(noneSteel.appliedPct, noneSteel.pct);
  assert.equal(none.premium.pct, 0.02);
});

test("S-7 steel studs: work items on steel-stud surfaces get the same partial de-stack (surface minutes count once)", () => {
  const s = scope([], { items: [{ id: "item-1", action: "mount", category: "shelf", quantity: 1, environment: { surface: "steel_studs" } } as never] });
  const r = priceScope(s, nearby, cfg());
  const steel = r.premium.factors.find((f) => f.key === "steel_studs");
  assert.ok(steel, "steel factor detected from the item surface");
  assert.equal(steel.laborCountedShare, 0.5);
  assert.equal(steel.appliedPct, 0.01);
});

// ── S-11: immutable website quote snapshots ──────────────────────────────────

function sampleSnapshot() {
  const form = createDefaultQuoteFormState();
  form.tvs[0] = { ...form.tvs[0]!, sizeChoice: "56-85" };
  form.zipCode = "30034";
  const quote = calculateQuote(form);
  return {
    form,
    quote,
    snapshot: createWebsiteQuoteSnapshot({
      form,
      groups: quote.groups,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      flags: quote.flags,
      requiresReview: quote.requiresReview,
      reviewReasons: quote.reviewReasons,
      pricingSource: "form:catalog",
      createdAt: "2026-11-27T05:00:00.000Z",
    }),
  };
}

test("S-11: a snapshot verifies, is deep-frozen, and carries exactly what the customer saw", () => {
  const { quote, snapshot } = sampleSnapshot();
  assert.equal(verifyWebsiteQuoteSnapshot(snapshot), true);
  assert.equal(snapshot.total, quote.total);
  assert.deepEqual(snapshot.groups, quote.groups);
  assert.ok(Object.isFrozen(snapshot));
  assert.ok(Object.isFrozen(snapshot.groups));
  assert.ok(Object.isFrozen(snapshot.groups[0]!.items));
  assert.ok(Object.isFrozen(snapshot.form));
  assert.throws(() => {
    (snapshot as { total: number }).total = 1;
  });
  assert.equal(snapshot.total, quote.total);
});

test("S-11: a later pricing change cannot rewrite an existing snapshot", () => {
  const { snapshot } = sampleSnapshot();
  const hashBefore = snapshot.snapshotHash;
  // Simulate a later reprice: a new snapshot for the "same" job at a new total.
  const repriced = createWebsiteQuoteSnapshot({
    form: snapshot.form,
    groups: snapshot.groups,
    subtotal: 999,
    discount: 0,
    total: 999,
    flags: [],
    pricingSource: "form:catalog",
    createdAt: "2026-12-01T05:00:00.000Z",
  });
  assert.notEqual(repriced.snapshotHash, hashBefore);
  assert.equal(snapshot.snapshotHash, hashBefore);
  assert.equal(snapshot.total, 100);
  assert.equal(verifyWebsiteQuoteSnapshot(snapshot), true);
});

test("S-11: a tampered snapshot fails verification", () => {
  const { snapshot } = sampleSnapshot();
  const tampered = { ...structuredClone(snapshot), total: 1 };
  assert.equal(verifyWebsiteQuoteSnapshot(tampered), false);
  assert.equal(verifyWebsiteQuoteSnapshot(null), false);
  assert.equal(verifyWebsiteQuoteSnapshot({ kind: "website-quote" }), false);
});

test("S-11: the booking payload carries the same snapshot the customer saw", () => {
  const { quote, snapshot } = sampleSnapshot();
  // Mirrors client/src/pages/booking.tsx pricingBreakdown construction.
  const pricingBreakdown = JSON.stringify({
    source: "quote_generated",
    quoteSummary: "summary",
    quoteGroups: quote.groups,
    quoteFlags: quote.flags,
    quoteSnapshot: snapshot,
  });
  const parsed = JSON.parse(pricingBreakdown) as { quoteSnapshot: unknown };
  assert.equal(verifyWebsiteQuoteSnapshot(parsed.quoteSnapshot), true);
  assert.equal((parsed.quoteSnapshot as typeof snapshot).total, quote.total);
});

// ── S-6: shadow route travel (worked examples from Decatur, GA) ─────────────

const decaturBase = { origin: "Decatur, GA", routeSource: "owner_input" as const };

test("S-6 shadow: Decatur -> Rome GA (75 mi one-way) — browser has no price; unified model would charge $60", () => {
  const s = shadowRouteTravel({ zip: "30161", context: { ...decaturBase, zip: "30161", oneWayMiles: 75, oneWayDriveMinutes: 85 }, cfg: cfg() });
  assert.equal(s.browserFeeCents, null);
  assert.equal(s.route.roundTripMiles, 150);
  assert.equal(s.routeCostCents, 18_458);
  assert.equal(s.wouldChargeCents, 6_000);
  assert.equal(s.deltaCents, null);
});

test("S-6 shadow: Decatur -> Ball Ground GA (55 mi one-way) would charge $40", () => {
  const s = shadowRouteTravel({ zip: "30107", context: { ...decaturBase, zip: "30107", oneWayMiles: 55, oneWayDriveMinutes: 70 }, cfg: cfg() });
  assert.equal(s.browserFeeCents, null);
  assert.equal(s.routeCostCents, 14_558);
  assert.equal(s.wouldChargeCents, 4_000);
});

test("S-6 shadow: Decatur -> Marietta GA (25 mi one-way) would charge $10 travel", () => {
  const s = shadowRouteTravel({ zip: "30060", context: { ...decaturBase, zip: "30060", oneWayMiles: 25, oneWayDriveMinutes: 40 }, cfg: cfg() });
  assert.equal(s.routeCostCents, 7_708);
  assert.equal(s.wouldChargeCents, 1_000);
});

test("S-6 shadow: in-town Decatur (4 mi one-way) stays free under the unified model", () => {
  const s = shadowRouteTravel({ zip: "30030", context: { ...decaturBase, zip: "30030", oneWayMiles: 4, oneWayDriveMinutes: 12 }, cfg: cfg() });
  assert.equal(s.wouldChargeCents, 0);
  assert.equal(s.routeCostCents, 2_475);
});

test("S-6 shadow: scheduling efficiency — nearby same-day jobs raise the free miles", () => {
  const s = shadowRouteTravel({ zip: "30161", context: { ...decaturBase, zip: "30161", oneWayMiles: 75, oneWayDriveMinutes: 85 }, cfg: cfg(), sameDayNearbyJobs: 2 });
  assert.equal(s.freeRoundTripMilesApplied, 70);
  assert.equal(s.wouldChargeCents, 4_000);
});

test("S-6 shadow logging: OFF by default — capture returns null and the flag only accepts the exact value '1'", () => {
  assert.equal(TRAVEL_SHADOW_LOGGING_DISABLED.enabled, false);
  assert.equal(resolveTravelShadowLogging({}).enabled, false);
  assert.equal(resolveTravelShadowLogging({ TRAVEL_SHADOW_LOGGING: "0" }).enabled, false);
  assert.equal(resolveTravelShadowLogging({ TRAVEL_SHADOW_LOGGING: "true" }).enabled, false);
  assert.equal(resolveTravelShadowLogging({ TRAVEL_SHADOW_LOGGING: "1" }).enabled, true);
  const jobScope = scope([tv()]);
  const priced = priceScope(jobScope, nearby, cfg());
  const record = captureTravelShadowLog({
    logging: TRAVEL_SHADOW_LOGGING_DISABLED,
    capturedAt: "2026-11-27T12:00:00.000Z",
    scope: jobScope,
    context: { zip: "30034", ...nearby },
    cfg: cfg(),
    priced,
  });
  assert.equal(record, null, "disabled logging captures nothing");
});

test("S-6 shadow logging: an enabled capture records route, efficiency, fuel, labor and profitability — and changes no price", () => {
  const config = cfg();
  const jobScope = scope([tv()]);
  const context = { zip: "30161", oneWayMiles: 75, oneWayDriveMinutes: 85 };
  const priced = priceScope(jobScope, context, config);
  const record = captureTravelShadowLog({
    logging: { enabled: true },
    capturedAt: "2026-11-27T12:00:00.000Z",
    scope: jobScope,
    context,
    cfg: config,
    priced,
    sameDayNearbyJobs: 2,
  });
  assert.ok(record);
  assert.equal(record.schemaVersion, 1);
  assert.equal(record.zip, "30161");
  assert.equal(record.quoteInputHash, priced.inputHash);
  // Route + candidate comparison (Rome worked example: would charge $60, $40 with 2 nearby jobs).
  assert.equal(record.route.roundTripMiles, 150);
  assert.equal(record.route.browserFeeCents, null);
  assert.equal(record.route.shadowWouldChargeCents, 4_000);
  // Efficiency / combined appointments.
  assert.equal(record.efficiency.sameDayNearbyJobs, 2);
  assert.equal(record.efficiency.combinedAppointment, true);
  assert.equal(record.efficiency.freeRoundTripMilesApplied, 70);
  // Fuel + labor estimates come from the priced job itself.
  assert.equal(record.fuel.fuelCents, priced.travel.fuelCents);
  assert.ok(record.fuel.gallonsEstimate > 0);
  assert.equal(record.labor.onSiteMinutes, priced.labor.minutes);
  assert.equal(record.labor.totalOwnerMinutes, priced.totalOwnerMinutes);
  // Profitability describes the REAL quote; the shadow margin is comparison-only.
  assert.equal(record.profitability.actualCustomerTotalCents, priced.legacy.totalCents);
  assert.equal(record.profitability.actualCustomerTravelFeeCents, priced.customerTravelFeeCents);
  assert.equal(record.profitability.estimatedMarginCents, priced.legacy.totalCents - priced.costToServeCents);
  assert.equal(record.profitability.travelCostExceedsJobTotal, true);
  // Inert: capturing mutated nothing — the priced job and the active config are untouched.
  assert.equal(config.travel.customerFeePolicy, "none");
  assert.equal(priced.customerTravelFeeCents, 0);
});

test("S-6 shadow: profitability guardrail flags when route cost exceeds the job total; active config is never mutated", () => {
  const config = cfg();
  const s = shadowRouteTravel({ zip: "30161", context: { ...decaturBase, zip: "30161", oneWayMiles: 75, oneWayDriveMinutes: 85 }, cfg: config, jobTotalCents: 10_000 });
  assert.equal(s.travelCostExceedsJobTotal, true);
  assert.equal(config.travel.customerFeePolicy, "none");
});
