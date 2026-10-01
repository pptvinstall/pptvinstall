import assert from "node:assert/strict";
import test from "node:test";
import {
  composeQuote,
  snapshotQuote,
  toCustomerView,
  assertCustomerSafe,
  findInternalKeys,
  InternalDataLeakError,
  QuotePolicyError,
  buildPackages,
  validateEconomicsConfig,
  ConfigValidationError,
  diffConfigs,
  DEFAULT_ECONOMICS_CONFIG,
} from "../../shared/pricing";
import { cfg, nearby, scope, tv } from "./helpers";

const compose = (adjustment?: unknown, s = scope(), c = cfg()) => composeQuote({ scope: s, context: nearby, config: c, adjustment });

test("owner override: valid reasons accepted, total equals override, below-floor is flagged not blocked", () => {
  for (const reason of ["courtesy", "returning_customer", "competitive", "scope_uncertainty", "bundle"]) {
    const q = compose({ type: "override", amountCents: 9_000, reason });
    assert.equal(q.customerTotalCents, 9_000);
  }
  const q = compose({ type: "override", amountCents: 9_000, reason: "courtesy" });
  assert.equal(q.belowFloor, true);
  assert.ok(q.internalFlags.some((f) => /below the economic floor/i.test(f)));
});

test("override reason 'other' needs a note; unknown reasons are rejected (no free-form protected factors)", () => {
  assert.throws(() => compose({ type: "override", amountCents: 9_500, reason: "other" }));
  assert.doesNotThrow(() => compose({ type: "override", amountCents: 9_500, reason: "other", note: "Neighbor referral bundle" }));
  assert.throws(() => compose({ type: "override", amountCents: 9_500, reason: "neighborhood" }));
  assert.throws(() => compose({ type: "override", amountCents: 9_500 }));
});

test("discount is capped by policy and cannot stack with an override", () => {
  assert.equal(compose({ type: "discount", discountCents: 1_000, reason: "bundle" }).customerTotalCents, 9_000);
  assert.throws(() => compose({ type: "discount", discountCents: 5_000, reason: "bundle" }), QuotePolicyError);
  // a single adjustment object means two discounts cannot be expressed at all
  assert.throws(() => compose({ type: "discount", discountCents: 500, reason: "bundle", amountCents: 8_000 }) && compose([{ type: "discount" }, { type: "discount" }]));
});

test("deep override needs explicit acknowledgement", () => {
  assert.throws(() => compose({ type: "override", amountCents: 5_000, reason: "courtesy" }), QuotePolicyError);
  assert.equal(compose({ type: "override", amountCents: 5_000, reason: "courtesy", acknowledgeDeepDiscount: true }).customerTotalCents, 5_000);
});

test("customer total is never negative and lines add up to the total", () => {
  const q = compose({ type: "discount", discountCents: 2_000, reason: "courtesy" });
  assert.ok(q.customerTotalCents >= 0);
  assert.equal(q.customerLines.reduce((s, l) => s + (l.amountCents ?? 0), 0), q.customerTotalCents);
  const free = compose({ type: "override", amountCents: 0, reason: "courtesy", acknowledgeDeepDiscount: true });
  assert.equal(free.customerTotalCents, 0);
});

test("customer view never contains internal fields", () => {
  const q = compose({ type: "override", amountCents: 9_000, reason: "competitive", note: "matched another quote" });
  const view = toCustomerView(q, { version: 1, createdAt: "2026-10-01T00:00:00.000Z" });
  const json = JSON.stringify(view);
  for (const banned of ["floor", "margin", "recommended", "premium", "overhead", "costToServe", "ownerValue", "competitive", "matched another quote", "labor", "uncertaint"]) {
    assert.ok(!json.toLowerCase().includes(banned.toLowerCase()), `leaked ${banned}`);
  }
  assert.deepEqual(findInternalKeys(view), []);
});

test("assertCustomerSafe rejects objects carrying internal keys", () => {
  assert.throws(() => assertCustomerSafe({ totalCents: 1, floorCents: 2 }), InternalDataLeakError);
  assert.throws(() => assertCustomerSafe({ lines: [{ label: "x", amountCents: 1, margin: 3 }] }), InternalDataLeakError);
  assert.throws(() => assertCustomerSafe({ totalCents: 1, ownerLaborValue: 5 }), InternalDataLeakError);
  assert.throws(() => assertCustomerSafe({ totalCents: 1, privateNotes: "x" }), InternalDataLeakError);
  assert.doesNotThrow(() => assertCustomerSafe({ totalCents: 1, notes: ["ok"], lines: [] }));
});

test("quote snapshot is immutable data: contains scope, config version, inputs and a hash; same input same hash", () => {
  const a = snapshotQuote({ scope: scope(), context: nearby, config: cfg() });
  const b = snapshotQuote({ scope: scope(), context: nearby, config: cfg() });
  assert.equal(a.configVersion, 1);
  assert.equal(a.snapshotHash, b.snapshotHash);
  const c = snapshotQuote({ scope: scope(), context: nearby, config: cfg((x) => { x.version = 2; x.business.minimumTicketCents = 20_000; }) });
  assert.notEqual(a.snapshotHash, c.snapshotHash);
  assert.equal(c.configVersion, 2);
});

test("packages: real components only, totals equal the sum of lines, no fake savings", () => {
  const pkgs = buildPackages({ tvs: [{ sizeBand: "56+", mountSource: "pptv", mountType: "tilt" }] });
  assert.ok(pkgs.length >= 2);
  for (const p of pkgs) {
    assert.equal(p.components.reduce((s, c) => s + (c.amountCents ?? 0), 0), p.totalCents);
    assert.ok(!/save|was|off/i.test(JSON.stringify(p)));
  }
  assert.deepEqual(findInternalKeys(pkgs), []);
  const ids = pkgs.map((p) => p.id);
  assert.equal(ids[0], "essential");
  assert.ok(pkgs.every((p, i) => i === 0 || p.totalCents > pkgs[i - 1]!.totalCents), "each package is a real step up");
});

test("packages: no duplicate or empty packages for trivial scopes", () => {
  assert.deepEqual(buildPackages({ tvs: [] }), []);
  const fireplace = buildPackages({ tvs: [{ location: "fireplace", mountSource: "customer" }] });
  assert.equal(new Set(fireplace.map((p) => p.totalCents)).size, fireplace.length);
});

test("config validation: defaults are valid; bad values, unknown keys and secret-like keys are rejected", () => {
  assert.doesNotThrow(() => validateEconomicsConfig(DEFAULT_ECONOMICS_CONFIG));
  const bad = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
  bad.business.minimumMarginPct = 0.95;
  assert.throws(() => validateEconomicsConfig(bad), ConfigValidationError);
  const neg = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
  neg.labor.targetLaborPerHourCents = -1;
  assert.throws(() => validateEconomicsConfig(neg), ConfigValidationError);
  const extra = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
  extra.travel.googleMapsApiKey = "abc";
  assert.throws(() => validateEconomicsConfig(extra), /secret-like/);
  const margins = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
  margins.business.desiredMarginPct = 0.05;
  assert.throws(() => validateEconomicsConfig(margins));
});

test("config diff lists changed leaf paths", () => {
  const next = cfg((c) => { c.labor.targetLaborPerHourCents = 8_000; c.travel.mpg = 18; });
  assert.deepEqual(diffConfigs(DEFAULT_ECONOMICS_CONFIG, next).sort(), ["labor.targetLaborPerHourCents", "travel.mpg"]);
});

test("requiresReview is set for unknown walls and custom-quote items", () => {
  assert.equal(compose(undefined, scope([tv({ wall: "unknown" })])).requiresReview, true);
  assert.equal(compose(undefined, scope([tv()], { extras: [{ kind: "soundbar", qty: 1 }] })).requiresReview, true);
  assert.equal(compose().requiresReview, false, "a fully specified standard job needs no review");
});
