import assert from "node:assert/strict";
import test from "node:test";
import { priceScope, economicsAtPrice, stabilizeRecommendation, roundToStep } from "../../shared/pricing";
import { cfg, nearby, scope, tv } from "./helpers";

const price = (s = scope(), ctx: object = nearby, c = cfg()) => priceScope(s, ctx, c);

test("standard drywall install: labor, materials, travel all positive; floor <= recommended <= premium", () => {
  const r = price();
  assert.ok(r.labor.minutes > 0);
  assert.ok(r.materials.costCents > 0);
  assert.ok(r.travel.costCents > 0);
  assert.ok(r.floorCents > 0);
  assert.ok(r.floorCents <= r.recommendedCents);
  assert.ok(r.recommendedCents <= r.premiumCents);
  assert.equal(r.legacy.totalCents, 10_000, "legacy catalog price stays $100");
});

test("deterministic: same input produces identical output and hash", () => {
  assert.deepEqual(price(), price());
  assert.equal(price().inputHash, price().inputHash);
});

test("input hash changes when scope changes", () => {
  assert.notEqual(price().inputHash, price(scope([tv({ wall: "brick" })])).inputHash);
});

test("multi-TV: more TVs cost more but each additional TV is cheaper than a standalone job", () => {
  const one = price(scope([tv()]));
  const two = price(scope([tv(), tv()]));
  const three = price(scope([tv(), tv(), tv()]));
  assert.ok(two.labor.minutes > one.labor.minutes);
  assert.ok(three.labor.minutes > two.labor.minutes);
  assert.ok(two.labor.minutes < one.labor.minutes * 2, "shared setup/efficiency");
  assert.ok(two.recommendedCents > one.recommendedCents);
});

test("fireplace costs more labor than standard; legacy catalog fireplace is $200", () => {
  const std = price(scope([tv()]));
  const fp = price(scope([tv({ location: "fireplace" })]));
  assert.ok(fp.labor.minutes > std.labor.minutes);
  assert.equal(fp.legacy.totalCents, 20_000);
});

test("wall types: brick/stone/steel add time and hardware; unknown adds an uncertainty", () => {
  const drywall = price(scope([tv()]));
  for (const wall of ["brick", "stone", "steel"] as const) {
    const r = price(scope([tv({ wall })]));
    assert.ok(r.labor.minutes > drywall.labor.minutes, wall);
    assert.ok(r.materials.costCents > 0);
  }
  const unknown = price(scope([tv({ wall: "unknown" })]));
  assert.ok(unknown.uncertainties.some((u) => /wall type unknown/i.test(u)));
  assert.ok(unknown.flags.some((f) => /assumes drywall/i.test(f)));
});

test("legacy catalog: brick +$50, steel +$25 (reference prices unchanged)", () => {
  assert.equal(price(scope([tv({ wall: "brick" })])).legacy.totalCents, 15_000);
  assert.equal(price(scope([tv({ wall: "stone" })])).legacy.totalCents, 15_000);
  assert.equal(price(scope([tv({ wall: "steel" })])).legacy.totalCents, 12_500);
});

test("PPTV supplied mounts add material cost by type and band; catalog prices match golden", () => {
  const fm = price(scope([tv({ mountSource: "pptv", mountType: "full_motion" })]));
  const fixed = price(scope([tv({ mountSource: "pptv", mountType: "fixed" })]));
  assert.ok(fm.materials.costCents > fixed.materials.costCents);
  assert.equal(fm.legacy.totalCents, 18_000);
  assert.ok(fm.materials.lines.some((l) => l.recipe === "pptv_mount"));
});

test("outlet / clean-cord uses the Romex/box/receptacle/plate recipe and +$100 in the catalog", () => {
  const r = price(scope([tv({ power: "outlet", wire: "in_wall" })]));
  const labels = r.materials.lines.map((l) => l.label).join("|");
  for (const part of ["Romex", "box", "Receptacle", "Cover plate"]) assert.match(labels, new RegExp(part, "i"));
  assert.equal(r.legacy.totalCents, 20_000);
});

test("raceway and in-wall low-voltage wiring have recipes and no silent catalog price", () => {
  const race = price(scope([tv({ wire: "raceway" })]));
  assert.ok(race.materials.lines.some((l) => l.recipe === "surface_raceway"));
  assert.ok(race.flags.some((f) => /raceway has no catalog price/i.test(f)));
  const inwall = price(scope([tv({ wire: "in_wall" })]));
  assert.ok(inwall.materials.lines.some((l) => l.recipe === "in_wall_low_voltage"));
});

test("unmount, mount removal and remount add labor; catalog unmount $50, remount $50", () => {
  const base = price(scope([tv()]));
  const un = price(scope([tv({ removal: { tvRemoval: true, mountRemoval: false, remount: false } })]));
  const re = price(scope([tv({ removal: { tvRemoval: false, mountRemoval: false, remount: true } })]));
  assert.ok(un.labor.minutes > base.labor.minutes);
  assert.ok(re.labor.minutes > base.labor.minutes);
  assert.equal(un.legacy.totalCents, 15_000);
  assert.equal(re.legacy.totalCents, 15_000);
  const both = price(scope([tv({ removal: { tvRemoval: true, mountRemoval: true, remount: false } })]));
  assert.equal(both.legacy.totalCents, 15_000, "unmount is charged once per TV");
});

test("extras add labor and flag custom quotes; catalog does not invent prices", () => {
  const r = price(scope([tv()], { extras: [{ kind: "soundbar", qty: 1 }, { kind: "shelf", qty: 1 }] }));
  assert.ok(r.labor.tasks.some((t) => t.key.includes("soundbar")));
  assert.ok(r.legacy.customQuoteItems.length >= 2);
  assert.equal(r.legacy.totalCents, 10_000, "custom items add $0 to the catalog total");
  assert.ok(r.flags.some((f) => /cannot price/i.test(f)));
});

test("custom extra uses owner minutes and materials", () => {
  const r = price(scope([tv()], { extras: [{ kind: "custom", qty: 2, label: "Hang mirror", customMinutes: 20, customMaterialsCents: 700 }] }));
  assert.ok(r.labor.tasks.some((t) => t.minutes === 40));
  assert.ok(r.materials.lines.some((l) => l.recipe === "custom_extra" && l.costCents === 1_400));
});

test("access: difficult multiplier, furniture, ladder and helper increase cost", () => {
  const base = price(scope([tv()]));
  const hard = price(scope([tv()], { access: { level: "difficult", furnitureMovement: true, ladderHeight: true, helper: true } }));
  assert.ok(hard.labor.minutes > base.labor.minutes);
  assert.ok(hard.labor.helperMinutes > 0);
  assert.ok(hard.labor.helperCostCents > 0);
  assert.ok(hard.costToServeCents > base.costToServeCents);
});

test("cleanup: patching and haul-away add time and materials", () => {
  const std = price(scope([tv()]));
  const patch = price(scope([tv()], { cleanup: "patching" }));
  const haul = price(scope([tv()], { cleanup: "haul_away" }));
  assert.ok(patch.labor.minutes > std.labor.minutes && patch.materials.costCents > std.materials.costCents);
  assert.ok(haul.labor.minutes > std.labor.minutes && haul.materials.costCents > std.materials.costCents);
});

test("travel: Atlas 20 MPG at $3.50 reference, round trip fuel is exact", () => {
  const r = price(scope(), { oneWayMiles: 10, oneWayDriveMinutes: 25 });
  assert.equal(r.travel.roundTripMiles, 20);
  assert.equal(r.travel.fuelCents, 350); // 20 mi / 20 mpg * $3.50
  assert.equal(r.travel.vehicleCents, 600); // 20 mi * 30c
  assert.equal(r.travel.mpg, 20);
  assert.equal(r.travel.vehicleLabel, "2021 VW Atlas SE");
});

test("travel: separate fuel, vehicle, time and customer fee; customer fee is zero under current policy", () => {
  const r = price(scope(), { oneWayMiles: 30, oneWayDriveMinutes: 50 });
  assert.ok(r.travel.fuelCents > 0 && r.travel.vehicleCents > 0 && r.travel.timeCents > 0);
  assert.equal(r.travel.costCents, r.travel.fuelCents + r.travel.vehicleCents + r.travel.timeCents);
  assert.equal(r.customerTravelFeeCents, 0);
});

test("travel: unknown route is assumed and flagged, never silently zero", () => {
  const r = price(scope(), {});
  assert.equal(r.travel.source, "assumed_unknown_route");
  assert.ok(r.travel.costCents > 0);
  assert.ok(r.uncertainties.some((u) => /route unknown/i.test(u)));
});

test("travel: mileage banding keeps tiny route changes from moving the price", () => {
  const a = price(scope(), { oneWayMiles: 11.1, oneWayDriveMinutes: 20 });
  const b = price(scope(), { oneWayMiles: 12.9, oneWayDriveMinutes: 20 });
  assert.deepEqual(a.recommendedCents, b.recommendedCents);
});

test("travel: traffic multiplier is clamped to configured bounds", () => {
  const hi = price(scope(), { ...nearby, trafficMultiplier: 4 });
  const clamp = price(scope(), { ...nearby, trafficMultiplier: 2 });
  assert.equal(hi.travel.trafficMultiplier, 2);
  assert.equal(hi.travel.roundTripDriveMinutes, clamp.travel.roundTripDriveMinutes);
});

test("travel: configurable MPG, fuel price, vehicle cost and owner time value all change cost", () => {
  const base = price();
  assert.ok(price(scope(), nearby, cfg((c) => (c.travel.mpg = 10))).travel.fuelCents > base.travel.fuelCents);
  assert.ok(price(scope(), nearby, cfg((c) => (c.travel.fuelPricePerGalCents = 600))).travel.fuelCents > base.travel.fuelCents);
  assert.ok(price(scope(), nearby, cfg((c) => (c.travel.vehicleCostPerMileCents = 100))).travel.vehicleCents > base.travel.vehicleCents);
  assert.ok(price(scope(), nearby, cfg((c) => (c.travel.ownerTimeValuePerHourCents = 9_000))).travel.timeCents > base.travel.timeCents);
});

test("travel: optional customer fee policy charges only beyond the free round-trip miles", () => {
  const c = cfg((x) => {
    x.travel.customerFeePolicy = "per_round_trip_mile";
    x.travel.customerFeePerRoundTripMileCents = 100;
    x.travel.customerFeeFreeRoundTripMiles = 20;
  });
  assert.equal(price(scope(), { oneWayMiles: 10, oneWayDriveMinutes: 20 }, c).customerTravelFeeCents, 0);
  assert.equal(price(scope(), { oneWayMiles: 20, oneWayDriveMinutes: 40 }, c).customerTravelFeeCents, 2_000);
});

test("schedule modifiers affect internal cost but never customer price by default", () => {
  const base = price(scope(), { ...nearby, appointmentTime: "11:00", weekday: 3 });
  const rush = price(scope(), { ...nearby, appointmentTime: "17:00", weekday: 3 });
  const late = price(scope(), { ...nearby, appointmentTime: "21:00", weekday: 3 });
  const weekend = price(scope(), { ...nearby, appointmentTime: "11:00", weekday: 6 });
  const sameDay = price(scope(), { ...nearby, appointmentTime: "11:00", weekday: 3, sameDay: true });
  const gap = price(scope(), { ...nearby, appointmentTime: "11:00", weekday: 3, awkwardGap: true });
  assert.deepEqual(base.scheduleModifiers, []);
  assert.ok(rush.scheduleModifiers.some((m) => m.key === "rush_hour"));
  assert.ok(late.scheduleModifiers.some((m) => m.key === "late_evening"));
  assert.ok(weekend.scheduleModifiers.some((m) => m.key === "weekend"));
  assert.ok(sameDay.scheduleModifiers.some((m) => m.key === "same_day"));
  assert.ok(gap.scheduleModifiers.some((m) => m.key === "awkward_gap"));
  for (const r of [rush, late, weekend, sameDay, gap]) {
    assert.ok(r.costToServeCents >= base.costToServeCents);
    assert.equal(r.customerScheduleSurchargeCents, 0);
  }
  assert.ok(late.costToServeCents > base.costToServeCents);
});

test("schedule modifier customer surcharge only when explicitly enabled", () => {
  const c = cfg((x) => {
    x.scheduleModifiers.late_evening.customerFacing = true;
    x.scheduleModifiers.late_evening.customerSurchargeCents = 2_500;
  });
  assert.equal(price(scope(), { ...nearby, appointmentTime: "21:00", weekday: 3 }, c).customerScheduleSurchargeCents, 2_500);
});

test("minimum ticket is honored in floor and recommended", () => {
  const c = cfg((x) => (x.business.minimumTicketCents = 30_000));
  const r = price(scope(), nearby, c);
  assert.ok(r.floorCents >= 30_000);
  assert.ok(r.recommendedCents >= 30_000);
});

test("floor respects minimum margin and minimum trip economics", () => {
  const r = price(scope(), { oneWayMiles: 40, oneWayDriveMinutes: 60 });
  const margin = (r.floorCents - r.costToServeCents) / r.floorCents;
  assert.ok(margin >= cfg().business.minimumMarginPct - 0.01, `margin ${margin}`);
  assert.ok(r.floorCents - r.outOfPocketCents >= cfg().business.minimumTripEconomicsCents);
});

test("rounding: recommended and premium land on the rounding step; floor never rounds down", () => {
  const r = price(scope([tv({ wall: "brick" }), tv()]), { oneWayMiles: 17, oneWayDriveMinutes: 33 });
  assert.equal(r.recommendedCents % 500, 0);
  assert.equal(r.premiumCents % 500, 0);
  assert.equal(r.floorCents % 500, 0);
  assert.ok((r.floorCents - r.costToServeCents / (1 - cfg().business.minimumMarginPct)) > -1, "floor rounded up, not down");
});

test("roundToStep handles modes and bad input", () => {
  assert.equal(roundToStep(1_201, 500, "up"), 1_500);
  assert.equal(roundToStep(1_201, 500, "down"), 1_000);
  assert.equal(roundToStep(1_251, 500), 1_500);
  assert.equal(roundToStep(Number.NaN, 500), 0);
  assert.equal(roundToStep(-50, 500), 0);
});

test("price stability: sub-threshold changes keep the previous recommendation", () => {
  const c = cfg();
  assert.equal(stabilizeRecommendation(12_000, 12_300, c), 12_000);
  assert.equal(stabilizeRecommendation(12_000, 13_000, c), 13_000);
  assert.equal(stabilizeRecommendation(null, 13_000, c), 13_000);
});

test("economics at price: margin, effective hourly and below-floor flag are computed and labelled estimates", () => {
  const r = price();
  const atFloor = economicsAtPrice(r, r.floorCents);
  const atLegacy = economicsAtPrice(r, r.legacy.totalCents);
  assert.equal(atFloor.estimate, true);
  assert.ok(atFloor.marginPct >= 0.1);
  assert.ok(atFloor.effectiveGrossPerHourCents > 0);
  assert.equal(atLegacy.belowFloor, r.legacy.totalCents < r.floorCents);
  assert.ok(Number.isFinite(economicsAtPrice(r, 0).marginPct));
});

test("calibration: default economics put a plain drywall install near the historical $100 reference", () => {
  const r = price(scope(), nearby);
  assert.ok(r.floorCents >= 8_000 && r.floorCents <= 20_000, `floor ${r.floorCents}`);
  assert.ok(r.recommendedCents >= 10_000 && r.recommendedCents <= 25_000, `recommended ${r.recommendedCents}`);
});

test("explanations exist and the result states when config is uncalibrated", () => {
  const r = price();
  assert.ok(r.why.length >= 4);
  assert.ok(r.uncertainties.some((u) => /uncalibrated/i.test(u)));
});

test("empty scope yields zeros, not NaN or a minimum ticket", () => {
  const r = price(scope([]), {});
  assert.equal(r.empty, true);
  for (const v of [r.floorCents, r.recommendedCents, r.premiumCents, r.costToServeCents, r.legacy.totalCents]) assert.equal(v, 0);
});

test("scope validation: pptv mount requires type; inches must agree with band", () => {
  assert.throws(() => scope([tv({ mountSource: "pptv", mountType: null })]));
  assert.throws(() => scope([tv({ sizeBand: "32-55", inches: 65 })]));
  assert.doesNotThrow(() => scope([tv({ sizeBand: "56+", inches: 65 })]));
});

test("dynamic mode quotes the engine recommendation; legacy mode quotes the catalog", async () => {
  const { composeQuote } = await import("../../shared/pricing");
  const legacy = composeQuote({ scope: scope(), context: nearby, config: cfg() });
  const dyn = composeQuote({ scope: scope(), context: nearby, config: cfg((c) => (c.pricingMode = "dynamic")) });
  assert.equal(legacy.customerTotalCents, 10_000);
  assert.equal(legacy.baseSource, "legacy_catalog");
  assert.equal(dyn.baseSource, "engine_recommended");
  assert.equal(dyn.customerTotalCents, dyn.pricing.recommendedCents);
  assert.equal(dyn.customerLines.reduce((s, l) => s + (l.amountCents ?? 0), 0), dyn.customerTotalCents);
});
