import assert from "node:assert/strict";
import test from "node:test";
import { isComparableCatalogSample, shadowSampleMatches } from "../../shared/jobos/shadowFilters";
import type { ShadowSampleRecord } from "../../shared/jobos/types";

const sample = (overrides: Partial<ShadowSampleRecord> = {}): ShadowSampleRecord => ({
  id: "sample", day: "2026-10-02", sampleKey: "key", source: "public_quote", zip: null,
  configVersion: 1, pricingMode: "shadow", shownCents: 20_000, recommendedCents: 30_000, floorCents: 25_000,
  status: "priced", scope: { tvs: [{ id: "tv1", sizeBand: "32-55", wall: "brick", location: "fireplace", power: "outlet" }, { id: "tv2", sizeBand: "32-55" }] }, context: {}, jobId: null, createdAt: "2026-10-02T00:00:00Z",
  summary: {
    shownSource: "catalog", catalogHasCustomQuoteLines: false, premiumCents: 35_000, confidence: "high", complexity: "complex", premiumPct: 0,
    premiumFactors: [], onsiteMinutes: 90, totalOwnerMinutes: 120, helperMinutes: 0, materialsCostCents: 1000, travelCostCents: 2000, travelSource: "owner_input", overheadCents: 500,
    atShown: { helperCostCents: 0, costToServeCents: 25_000, ownerNetCents: 15_000, marginPct: -0.25, effectivePerHourCents: 7500 },
    atRecommended: { helperCostCents: 0, costToServeCents: 25_000, ownerNetCents: 25_000, marginPct: 1 / 6, effectivePerHourCents: 12_500 }, flags: [], questions: [], why: [], engineVersion: "2.0.0",
  }, ...overrides,
});

test("Shadow filters combine recorded scope facts even when risk premiums are disabled", () => {
  const s = sample();
  assert.equal(shadowSampleMatches(s, ["fireplace", "masonry", "electrical", "multi_tv", "catalog_below_floor", "catalog_below_recommended", "below_target"], 10_000), true);
  assert.equal(shadowSampleMatches(s, ["fireplace", "helper"], 10_000), false);
  assert.equal(shadowSampleMatches(s, [], 10_000), true);
  assert.equal(shadowSampleMatches(s, ["below_target"], 7500), false, "equal to target is not below target");
  assert.equal(shadowSampleMatches(s, ["catalog_below_floor"], 10_000), true);
  assert.equal(shadowSampleMatches(sample({ shownCents: 25_000 }), ["catalog_below_floor"], 10_000), false);
});

test("partial catalog totals and historical dynamic shown prices are excluded from price comparisons", () => {
  for (const summary of [{ ...sample().summary, catalogHasCustomQuoteLines: true }, { ...sample().summary, shownSource: "engine" as const }]) {
    const s = sample({ summary });
    assert.equal(isComparableCatalogSample(s), false);
    for (const filter of ["catalog_below_floor", "catalog_below_recommended", "below_target"] as const) assert.equal(shadowSampleMatches(s, [filter], 10_000), false);
  }
});

test("helper, low confidence and review are independent facts; unanswered questions require review", () => {
  const s = sample({ summary: { ...sample().summary, helperMinutes: 60, confidence: "low", questions: ["Confirm the mounting height."] } });
  assert.equal(shadowSampleMatches(s, ["helper", "low_confidence", "review"], 10_000), true);
  assert.equal(shadowSampleMatches(sample(), ["review"], 10_000), false);
  assert.equal(shadowSampleMatches(sample({ status: "manual_review_required" }), ["review"], 10_000), true);
  assert.equal(shadowSampleMatches(sample({ summary: { ...sample().summary, catalogHasCustomQuoteLines: true } }), ["review"], 10_000), true);
});

test("universal item quantities count TVs and scope categories identify electrical work", () => {
  const s = sample({ scope: { items: [{ id: "down", category: "tv", action: "unmount", quantity: 3 }, { id: "outlet", category: "receptacle", action: "install" }] } });
  assert.equal(shadowSampleMatches(s, ["multi_tv", "electrical"], 10_000), true);
  assert.equal(shadowSampleMatches(s, ["masonry", "fireplace"], 10_000), false);
});

test("missing legacy scope can use recorded factors without throwing or inventing TV counts", () => {
  const s = sample({ scope: null, summary: { ...sample().summary, premiumFactors: ["Fireplace", "Masonry / stone", "Electrical work"] } });
  assert.equal(shadowSampleMatches(s, ["fireplace", "masonry", "electrical"], 10_000), true);
  assert.equal(shadowSampleMatches(s, ["multi_tv"], 10_000), false);
});
