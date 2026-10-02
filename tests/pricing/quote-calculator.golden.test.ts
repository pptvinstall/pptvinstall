import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateQuote,
  type QuoteFormState,
  type TVConfig,
} from "../../client/src/lib/quote-calculator";

function tv(overrides: Partial<TVConfig> = {}): TVConfig {
  return {
    id: "tv-test",
    size: "56+",
    wallType: "drywall",
    location: "standard",
    hasMount: true,
    mountType: null,
    wireConcealment: false,
    outletDistance: null,
    unmounting: false,
    ...overrides,
  };
}

function state(tvs: TVConfig[], zipCode = ""): QuoteFormState {
  return {
    tvs,
    cameras: [],
    doorbell: false,
    doorbellBrand: "Ring",
    soundbar: false,
    surroundSound: false,
    floodlight: false,
    handymanMinutes: 0,
    moveProject: { enabled: false, previousZipCode: "", oldHomeTvUnmountCount: 0, oldHomeMountRemovalCount: 0, rackTeardownLevel: "none" },
    zipCode,
    notes: "",
  };
}

test("golden: basic drywall install with customer mount stays $100", () => {
  const quote = calculateQuote(state([tv()]));
  assert.equal(quote.subtotal, 100);
  assert.equal(quote.discount, 0);
  assert.equal(quote.total, 100);
  assert.equal(quote.groups[0]?.items[0]?.lineTotal, 100);
});

test("golden: large TV + supplied full-motion mount stays $180", () => {
  const quote = calculateQuote(
    state([tv({ hasMount: false, mountType: "fullMotion", size: "56+" })]),
  );
  assert.equal(quote.total, 180);
});

test("golden: standard drywall + clean-cord/outlet stays $200", () => {
  const quote = calculateQuote(
    state([tv({ wireConcealment: true, outletDistance: "near" })]),
  );
  assert.equal(quote.total, 200);
});

test("golden: fireplace install stays $200 and concealment is assessment-only", () => {
  const quote = calculateQuote(
    state([tv({ location: "fireplace", wireConcealment: true })]),
  );
  assert.equal(quote.total, 200);
  assert.ok(quote.flags.some((flag) => flag.toLowerCase().includes("fireplace")));
  assert.ok(
    quote.groups[0]?.items.some(
      (item) => item.name === "Wire concealment assessment required" && item.lineTotal === 0,
    ),
  );
});

test("golden: brick standard install stays $150", () => {
  const quote = calculateQuote(state([tv({ wallType: "brick" })]));
  assert.equal(quote.total, 150);
});

test("golden: steel/high-rise standard install stays $125", () => {
  const quote = calculateQuote(state([tv({ wallType: "highrise" })]));
  assert.equal(quote.total, 125);
});

test("golden: unmount + reinstall scope stays $150", () => {
  const quote = calculateQuote(state([tv({ unmounting: true })]));
  assert.equal(quote.total, 150);
});

test("golden: two basic TVs remain $200 with no automatic bundle discount", () => {
  const quote = calculateQuote(state([tv({ id: "one" }), tv({ id: "two" })]));
  assert.equal(quote.subtotal, 200);
  assert.equal(quote.discount, 0);
  assert.equal(quote.total, 200);
});

test("golden: ZIP tier is informational and does not auto-charge travel", () => {
  const quote = calculateQuote(state([tv()], "30034"));
  assert.equal(quote.total, 100);
  assert.equal(quote.travelFee, 0);
});

test("golden: unknown ZIP requires route review without changing price", () => {
  const quote = calculateQuote(state([tv()], "99999"));
  assert.equal(quote.total, 100);
  assert.equal(quote.travelTier, "out_of_range");
  assert.ok(quote.flags.some((flag) => flag.toLowerCase().includes("route")));
});
