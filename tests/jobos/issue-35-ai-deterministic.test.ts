import assert from "node:assert/strict";
import test from "node:test";

import { applyDeterministicPricing } from "../../server/services/aiQuoteService";

// Issue #35 S-10: the AI quote entry extracts scope; the deterministic catalog
// calculation sets the customer total. Same confirmed scope = same price as
// the form entry, regardless of what totals the AI invented.

function aiContent(scope: unknown, aiTotal: number): string {
  return JSON.stringify({
    groups: [{ title: "TV 1", items: [{ name: "Standard TV Mounting (Customer's Mount)", price: aiTotal, qty: 1, lineTotal: aiTotal }], subtotal: aiTotal }],
    subtotal: aiTotal,
    discount: 0,
    total: aiTotal,
    summary: "AI summary",
    flags: ["AI flag"],
    scope,
  });
}

const oneTvScope = {
  form: {
    tvs: [{ size: "56+", wallType: "drywall", location: "standard", hasMount: true, mountType: null, wireConcealment: false, outletDistance: null, unmounting: false }],
    cameras: [],
    doorbell: false,
    doorbellBrand: "",
    soundbar: false,
    surroundSound: false,
    floodlight: false,
    handymanMinutes: 0,
    zipCode: "",
  },
  standalone: { removalCount: 0, troubleshootingMinutes: 0, wireManagementLocations: 0, deviceSetup: false, sharedUnmountCount: 0 },
};

test("issue-35 S-10: AI totals are replaced by the deterministic catalog total for the extracted scope", () => {
  const out = JSON.parse(applyDeterministicPricing(aiContent(oneTvScope, 999))) as {
    total: number;
    pricedBy?: string;
    summary: string;
    flags: string[];
  };
  assert.equal(out.total, 100);
  assert.equal(out.pricedBy, "deterministic");
  assert.equal(out.summary, "AI summary");
  assert.ok(out.flags.includes("AI flag"));
});

test("issue-35 S-10: brick fireplace scope re-prices to the $200 start with review required", () => {
  const scope = structuredClone(oneTvScope);
  scope.form.tvs[0] = { ...scope.form.tvs[0], wallType: "brick", location: "fireplace" };
  const out = JSON.parse(applyDeterministicPricing(aiContent(scope, 250))) as { total: number; requiresReview: boolean };
  assert.equal(out.total, 200);
  assert.equal(out.requiresReview, true);
});

test("issue-35 S-10: 98-inch scope yields no instant price and requires review", () => {
  const scope = structuredClone(oneTvScope);
  scope.form.tvs[0] = { ...scope.form.tvs[0], exactInches: 98, model: "Samsung QN90C" } as typeof scope.form.tvs[0];
  const out = JSON.parse(applyDeterministicPricing(aiContent(scope, 100))) as { total: number; requiresReview: boolean };
  assert.equal(out.total, 0);
  assert.equal(out.requiresReview, true);
});

test("issue-35 S-10: standalone removal scope gets the $100 visit minimum deterministically", () => {
  const scope = structuredClone(oneTvScope);
  scope.form.tvs = [];
  scope.standalone.removalCount = 1;
  const out = JSON.parse(applyDeterministicPricing(aiContent(scope, 50))) as { total: number };
  assert.equal(out.total, 100);
});

test("issue-35 S-10: content without a usable scope is returned unchanged (documented fallback)", () => {
  const raw = aiContent(null, 175);
  assert.equal(applyDeterministicPricing(raw), raw);
  assert.equal(applyDeterministicPricing("not json at all"), "not json at all");
});
