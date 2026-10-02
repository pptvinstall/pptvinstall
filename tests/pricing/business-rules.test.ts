import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ECONOMICS_CONFIG,
  QuotePolicyError,
  composeQuote,
  economicsAtPrice,
  findInternalKeys,
  helperCostAt,
  itemFromTemplate,
  priceScope,
  solvePrice,
  toCustomerView,
  validateEconomicsConfig,
} from "../../shared/pricing";
import { cfg, nearby, scope, tv } from "./helpers";

// Owner-approved business rules (2026-10-02 mission): $100/hr owner labor value, helper paid 20% of LABOR revenue,
// $100 minimum job, deterministic complexity/risk pricing, safety prerequisites for ceiling and electrical work.

const firm = { oneWayMiles: 8, oneWayDriveMinutes: 20 };
const plain = (over = {}) => scope([tv({ inches: 65, ...over })]);
const price = (s = plain(), ctx: object = firm, c = cfg()) => priceScope(s, ctx, c);
const withHelper = (s = plain()) => ({ ...s, access: { ...s.access, helper: true } });

test("owner labor is valued at $100/hr in cost-to-serve (not a customer hourly rate)", () => {
  assert.equal(DEFAULT_ECONOMICS_CONFIG.labor.targetLaborPerHourCents, 10_000);
  const r = price();
  assert.equal(r.labor.ownerCostCents, Math.round((r.labor.minutes / 60) * 10_000));
  assert.ok(r.why.some((w) => w.includes("$100/hr")));
  const q = composeQuote({ scope: plain(), context: firm, config: cfg((c) => (c.pricingMode = "dynamic")) });
  const view = toCustomerView(q, { version: 1, createdAt: "2026-10-02T00:00:00.000Z" });
  assert.ok(!JSON.stringify(view).includes("/hr"), "customers never see an hourly labor calculation");
});

test("helper is paid 20% of labor revenue, solved without circular math", () => {
  const r = price(withHelper());
  assert.equal(r.helperPay.mode, "labor_revenue_share");
  assert.equal(r.helperPay.sharePct, 0.2);
  assert.equal(r.helperPay.passThroughCents, r.materials.chargeCents);
  // At any price, helper = 20% x (price - pass-through). Direct formula, so no feedback loop.
  for (const p of [r.floorCents, r.recommendedCents, 30_000, 12_345]) {
    assert.equal(economicsAtPrice(r, p).helperCostCents, Math.round(0.2 * Math.max(0, p - r.helperPay.passThroughCents)));
  }
  // "$100 of labor earned -> helper about $20"
  assert.equal(helperCostAt({ ...r.helperPay, passThroughCents: 0 }, 10_000), 2_000);
  // The recommended price satisfies its own equation: margin at the recommendation ~= desired + premium.
  const e = economicsAtPrice(r, r.recommendedCents);
  const target = cfg().business.desiredMarginPct + r.premium.pct;
  assert.ok(Math.abs(e.marginPct - target) < 0.03, `margin ${e.marginPct} vs ${target}`);
  assert.equal(r.labor.helperCostCents, e.helperCostCents, "reported helper cost is at the recommended price");
  // Deterministic: repeated pricing is identical.
  assert.deepEqual(price(withHelper()), r);
});

test("helper share never includes mount/product, materials or the customer travel fee", () => {
  const pptvMount = withHelper(scope([tv({ inches: 65, mountSource: "pptv", mountType: "full_motion" })]));
  const r = price(pptvMount);
  assert.ok(r.materials.lines.some((l) => l.recipe === "pptv_mount"));
  assert.ok(r.helperPay.passThroughCents >= r.materials.chargeCents && r.materials.chargeCents > 5_000);
  const at = economicsAtPrice(r, 40_000);
  assert.equal(at.helperCostCents, Math.round(0.2 * (40_000 - r.materials.chargeCents)));
  // A pricier mount raises the pass-through, so at the same customer price the helper's share goes DOWN.
  const pricier = price(pptvMount, firm, cfg((c) => (c.mountCostsCents["full_motion:56+"] = 15_000)));
  assert.ok(economicsAtPrice(pricier, 40_000).helperCostCents < at.helperCostCents);
  // Travel fee is pass-through too.
  const fee = cfg((c) => {
    c.travel.customerFeePolicy = "per_round_trip_mile";
    c.travel.customerFeePerRoundTripMileCents = 100;
    c.travel.customerFeeFreeRoundTripMiles = 0;
  });
  const far = price(withHelper(), { oneWayMiles: 30, oneWayDriveMinutes: 45 }, fee);
  assert.equal(far.helperPay.passThroughCents, far.materials.chargeCents + far.customerTravelFeeCents);
});

test("helper share: solvePrice is the exact closed form (property check)", () => {
  for (const [fixed, pct, share, pass] of [[10_000, 0.25, 0.2, 500], [50_000, 0.12, 0.2, 9_000], [2_000, 0, 0.2, 5_000], [30_000, 0.3, 0, 1_000]] as const) {
    const p = solvePrice(fixed, pct, share, pass);
    const helper = share * Math.max(0, p - pass);
    assert.ok(Math.abs(p * (1 - pct) - (fixed + helper)) < 1e-6, `equation holds for ${fixed}/${pct}/${share}/${pass}`);
  }
});

test("hourly helper mode still works and old stored configs keep it", () => {
  const old = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
  delete old.labor.helperCompensation;
  delete old.business.riskPremium;
  const parsed = validateEconomicsConfig(old);
  assert.equal(parsed.labor.helperCompensation.mode, "hourly");
  assert.equal(parsed.business.riskPremium.enabled, false);
  const r = priceScope(withHelper(), firm, parsed);
  assert.equal(r.helperPay.mode, "hourly");
  assert.equal(r.helperPay.hourlyCostCents, Math.round((r.labor.helperMinutes / 60) * parsed.labor.helperPerHourCents));
  assert.equal(r.premium.pct, 0, "old configs keep their old recommendation (no premium)");
});

test("config guard: margin + premium + helper share cannot approach 100%", () => {
  assert.throws(() => validateEconomicsConfig(cfg((c) => (c.labor.helperCompensation.laborRevenueSharePct = 0.6))), /85%/);
  assert.doesNotThrow(() => validateEconomicsConfig(cfg()));
});

test("minimum $100 job: floor never goes under it, and a sub-$100 catalog price is flagged", () => {
  const removalOnly = { items: [{ id: "u", action: "unmount" as const, category: "tv", quantity: 1, environment: { surface: "drywall_studs" as const }, weightLb: 40 }] };
  const r = priceScope(removalOnly, firm, cfg());
  assert.equal(r.legacy.totalCents, 5_000, "catalog take-down is $50");
  assert.ok(r.floorCents >= 10_000 && r.recommendedCents >= 10_000);
  assert.ok(r.flags.some((f) => /under the \$100 minimum/.test(f)));
  const dyn = composeQuote({ scope: removalOnly, context: firm, config: cfg((c) => (c.pricingMode = "dynamic")) });
  assert.ok(dyn.customerTotalCents >= 10_000);
});

test("simple drywall TV: priced, standard complexity, no premium; catalog stays $100", () => {
  const r = price();
  assert.equal(r.status, "priced");
  assert.equal(r.confidence, "high");
  assert.equal(r.premium.complexity, "standard");
  assert.equal(r.premium.pct, 0);
  assert.equal(r.legacy.totalCents, 10_000);
  assert.ok(r.floorCents >= 10_000 && r.recommendedCents >= r.floorCents);
});

test("large and extreme TVs: heavy-equipment premium; 86\"+ needs confirmation", () => {
  const big = price(plain({ inches: 85 }));
  assert.ok(big.premium.factors.some((f) => f.key === "heavy_equipment"));
  assert.ok(big.recommendedCents > price().recommendedCents);
  const huge = price(plain({ inches: 98 }));
  assert.equal(huge.status, "estimate_with_confirmation");
  assert.ok(huge.questions.some((q) => /weigh/.test(q.question)));
});

test("fireplace, brick/stone and steel studs each carry their own premium and cost", () => {
  const base = price();
  for (const [over, key] of [[{ location: "fireplace" }, "fireplace"], [{ wall: "brick" }, "masonry"], [{ wall: "stone" }, "masonry"], [{ wall: "steel" }, "steel_studs"]] as const) {
    const r = price(plain(over));
    assert.ok(r.premium.factors.some((f) => f.key === key), key);
    assert.ok(r.recommendedCents > base.recommendedCents, `${key} recommendation is higher`);
    assert.ok(r.labor.minutes > base.labor.minutes, `${key} takes longer`);
  }
  assert.equal(price(plain({ location: "fireplace" })).legacy.totalCents, 20_000, "catalog fireplace stays $200");
});

test("2+ TVs: total up, each extra TV cheaper; multiple outlets add per-outlet materials and circuit questions", () => {
  const one = price();
  const two = price(scope([tv({ inches: 65 }), tv({ inches: 65 })]));
  assert.ok(two.recommendedCents > one.recommendedCents && two.recommendedCents < 2 * one.recommendedCents);
  const outlets = price(scope([tv({ inches: 65, power: "outlet" }), tv({ inches: 65, power: "outlet" })]));
  assert.equal(outlets.materials.lines.filter((l) => l.recipe === "outlet_clean_cord" && l.label === "Receptacle").reduce((s, l) => s + l.qty, 0), 2);
  assert.ok(outlets.premium.factors.some((f) => f.key === "electrical"));
  assert.equal(outlets.questions.filter((q) => q.field === "power.circuit").length, 2);
  assert.equal(outlets.legacy.totalCents, 2 * 10_000 + 2 * 10_000, "catalog: $100 mount + $100 concealment each");
});

test("PPTV-supplied vs customer-supplied mount", () => {
  const pptv = price(plain({ mountSource: "pptv", mountType: "tilt" }));
  const own = price();
  assert.ok(pptv.materials.costCents > own.materials.costCents);
  assert.ok(pptv.legacy.totalCents > own.legacy.totalCents);
  assert.ok(!own.materials.lines.some((l) => l.recipe === "pptv_mount"));
});

test("ceiling TV mount: structure unknown -> manual review; verified -> quotable; no joist -> not supported", () => {
  const c = cfg();
  const unknown = priceScope({ items: [itemFromTemplate("ceiling_tv_mount", c, { id: "c1", weightLb: 55 })] }, firm, c);
  assert.equal(unknown.status, "manual_review_required");
  assert.ok(unknown.questions.some((q) => /joist/.test(q.question)));
  assert.equal(unknown.work.items.length, 1, "ceiling TVs stay a reviewed work item, not the standard TV price");
  assert.ok(unknown.legacy.customQuoteItems.length === 1, "no catalog price for ceiling TVs");
  assert.throws(() => composeQuote({ scope: { items: [itemFromTemplate("ceiling_tv_mount", c, { id: "c1", weightLb: 55 })] }, context: firm, config: c }), QuotePolicyError);

  const verified = priceScope({ items: [itemFromTemplate("ceiling_tv_mount", c, { id: "c1", weightLb: 55, conditions: { ceiling_structure: "yes" } })] }, firm, c);
  assert.notEqual(verified.status, "manual_review_required");
  assert.notEqual(verified.status, "not_supported");
  assert.ok(verified.premium.factors.some((f) => f.key === "ceiling"));
  assert.ok(verified.labor.helperMinutes > 0 && verified.helperPay.mode === "labor_revenue_share");
  assert.ok(verified.exclusions.some((e) => /joist/.test(e)), "customer sees the structural condition");

  const noJoist = priceScope({ items: [itemFromTemplate("ceiling_tv_mount", c, { id: "c1", weightLb: 55, conditions: { ceiling_structure: "no" } })] }, firm, c);
  assert.equal(noJoist.status, "not_supported");
});

test("ceiling fan at an existing fixture with a fan-rated box: priced as electrical work", () => {
  const c = cfg();
  const fan = itemFromTemplate("ceiling_fan_existing_fixture", c, { id: "f1", weightLb: 18, conditions: { existing_fixture: "yes", fan_rated_box: "yes", wiring_ok: "yes" } });
  const r = priceScope({ items: [fan] }, firm, c);
  assert.equal(r.status, "priced", JSON.stringify(r.statusReasons));
  assert.ok(r.premium.factors.some((f) => f.key === "electrical"));
  assert.ok(r.recommendedCents >= 10_000);
  assert.ok(r.exclusions.some((e) => /existing fixture/.test(e)));
  assert.ok(!r.statusReasons.some((x) => /joist/.test(x.message)), "the fan-rated box covers the ceiling structure");
});

test("ceiling fan with unknown or inadequate support is never quoted as firm", () => {
  const c = cfg();
  const make = (conditions: Record<string, "yes" | "no" | "unknown">) => priceScope({ items: [itemFromTemplate("ceiling_fan_existing_fixture", c, { id: "f1", weightLb: 18, conditions })] }, firm, c);
  const unknown = make({});
  assert.equal(unknown.status, "estimate_with_confirmation");
  assert.ok(unknown.questions.some((q) => /fan-rated/.test(q.question)));
  assert.ok(unknown.questions.some((q) => /existing light fixture/.test(q.question)));
  assert.equal(make({ existing_fixture: "yes", fan_rated_box: "no", wiring_ok: "yes" }).status, "manual_review_required");
  assert.equal(make({ existing_fixture: "no" }).status, "not_supported", "no fixture = new wiring = out of scope");
  assert.equal(make({ existing_fixture: "yes", fan_rated_box: "yes", wiring_ok: "no" }).status, "manual_review_required");
});

test("electrical scope stays limited: outlet on an existing circuit is fine; a new circuit is not supported", () => {
  const c = cfg();
  const outlet = (conditions: Record<string, "yes" | "no">) => priceScope({ items: [itemFromTemplate("outlet_add_existing_circuit", c, { id: "o1", conditions })] }, firm, c);
  assert.equal(outlet({ extend_existing_circuit: "yes", wiring_ok: "yes" }).status, "priced");
  assert.equal(outlet({ extend_existing_circuit: "no" }).status, "not_supported");
  const flagged = priceScope({ items: [{ id: "x", action: "install", category: "receptacle", riskFlags: ["new_circuit"] }] }, firm, c);
  assert.equal(flagged.status, "not_supported");
  const unsafe = priceScope({ items: [{ id: "x", action: "install", category: "light_fixture", conditions: { existing_fixture: "yes", wiring_ok: "yes" }, riskFlags: ["unsafe_electrical_condition"] }] }, firm, c);
  assert.equal(unsafe.status, "manual_review_required");
  const lowVoltage = priceScope({ items: [itemFromTemplate("low_voltage_pass_through", c, { id: "lv" })] }, firm, c);
  assert.ok(["priced", "estimate_with_confirmation"].includes(lowVoltage.status));
  const chime = priceScope({ items: [itemFromTemplate("doorbell_chime", c, { id: "ch" })] }, firm, c);
  assert.equal(chime.status, "estimate_with_confirmation");
});

test("second address: two sites, multi-stop premium, extra drive cost", () => {
  const one = price(plain());
  const two = price(scope([tv({ inches: 65 }), tv({ inches: 65, site: 1 })]), { ...firm, extraStops: [{ legMiles: 12, legMinutes: 25 }] });
  assert.equal(two.siteCount, 2);
  assert.ok(two.premium.factors.some((f) => f.key === "multi_stop"));
  assert.ok(two.travel.costCents > one.travel.costCents);
});

test("rush / same-day raises internal cost and the recommendation, never the catalog price", () => {
  const normal = price();
  const rush = price(plain(), { ...firm, sameDay: true });
  assert.ok(rush.costToServeCents > normal.costToServeCents);
  assert.ok(rush.premium.factors.some((f) => f.key === "rush"));
  assert.ok(rush.recommendedCents > normal.recommendedCents);
  assert.equal(rush.legacy.totalCents, normal.legacy.totalCents);
  assert.equal(rush.customerScheduleSurchargeCents, 0, "no customer surcharge unless the owner enables it");
});

test("unknown route: assumed, flagged and the price is an estimate", () => {
  const r = price(plain(), {});
  assert.equal(r.travel.source, "assumed_unknown_route");
  assert.equal(r.status, "estimate_with_confirmation");
  assert.ok(r.premium.factors.some((f) => f.key === "confirmation_needed"));
});

test("unsupported work is never priced as confident", () => {
  const gas = { items: [{ id: "g", action: "install" as const, category: "custom", riskFlags: ["gas_line" as const] }] };
  const r = priceScope(gas, firm, cfg());
  assert.equal(r.status, "not_supported");
  assert.equal(r.confidence, "low");
  assert.throws(() => composeQuote({ scope: gas, context: firm, config: cfg() }), (e: unknown) => e instanceof QuotePolicyError && e.code === "NOT_SUPPORTED");
  assert.throws(() => composeQuote({ scope: gas, context: firm, config: cfg(), adjustment: { type: "override", amountCents: 50_000, reason: "other", note: "x x x" } }), QuotePolicyError);
});

test("owner override and below-floor guardrail", () => {
  const r = price();
  const over = composeQuote({ scope: plain(), context: firm, config: cfg(), adjustment: { type: "override", amountCents: 25_000, reason: "bundle" } });
  assert.equal(over.customerTotalCents, 25_000);
  assert.equal(over.economics.priceCents, 25_000);
  const low = composeQuote({ scope: plain(), context: firm, config: cfg(), adjustment: { type: "override", amountCents: 9_000, reason: "courtesy" } });
  assert.equal(low.belowFloor, true);
  assert.ok(low.internalFlags.some((f) => /below the economic floor/.test(f)));
  assert.ok(r.floorCents > 9_000);
});

test("owner economics at the customer price: overhead, net, effective rate and margin are consistent", () => {
  const r = price(withHelper(scope([tv({ inches: 75, wall: "brick", location: "fireplace" })])));
  const e = economicsAtPrice(r, r.recommendedCents);
  assert.equal(e.outOfPocketCents, r.outOfPocketExHelperCents + e.helperCostCents);
  assert.equal(e.costToServeCents, e.outOfPocketCents + r.ownerValueCents);
  assert.equal(e.ownerNetCents, r.recommendedCents - e.outOfPocketCents);
  assert.equal(e.effectiveGrossPerHourCents, Math.round(e.ownerNetCents / (r.totalOwnerMinutes / 60)));
  assert.ok(r.overheadCents > 0);
  assert.ok(r.priceDrivers.some((d) => d.key === "helper") && r.priceDrivers.some((d) => d.key.startsWith("premium.")));
  assert.equal(r.premium.complexity, "complex");
});

test("risk premium is capped and only moves the recommendation, never the floor", () => {
  const messy = withHelper(scope([tv({ inches: 85, wall: "stone", location: "fireplace", power: "outlet" }), tv({ inches: 65, wall: "steel", location: "high_wall", site: 1 })], { access: { level: "difficult", furnitureMovement: false, ladderHeight: true, helper: true } }));
  const ctx = { ...firm, sameDay: true, extraStops: [{ legMiles: 5, legMinutes: 10 }] };
  const r = price(messy, ctx);
  assert.ok(r.premium.rawPct > r.premium.pct);
  assert.equal(r.premium.pct, cfg().business.riskPremium.maxTotalPct);
  const off = price(messy, ctx, cfg((c) => (c.business.riskPremium.enabled = false)));
  assert.equal(off.floorCents, r.floorCents, "premium never changes the floor");
  assert.ok(r.recommendedCents > off.recommendedCents);
});

test("public payloads never carry owner economics", () => {
  const q = composeQuote({ scope: withHelper(plain({ location: "fireplace" })), context: firm, config: cfg((c) => (c.pricingMode = "dynamic")) });
  const view = toCustomerView(q, { version: 1, createdAt: "2026-10-02T00:00:00.000Z" });
  assert.deepEqual(findInternalKeys(view), []);
  const text = JSON.stringify(view);
  for (const word of ["helper", "premium", "floor", "margin", "overhead", "costToServe", "risk", "calibrat"]) assert.ok(!text.toLowerCase().includes(word.toLowerCase()), word);
});
