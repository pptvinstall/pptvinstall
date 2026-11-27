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
  const scope = structuredClone(oneTvScope);
  scope.form.tvs[0] = { ...scope.form.tvs[0], sizeChoice: "56-85" } as typeof scope.form.tvs[0];
  const out = JSON.parse(applyDeterministicPricing(aiContent(scope, 999))) as {
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
  scope.form.tvs[0] = { ...scope.form.tvs[0], wallType: "brick", location: "fireplace", sizeChoice: "56-85" } as typeof scope.form.tvs[0];
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

test("issue-35 S-10 fail-closed: content without a usable scope returns a zero-total review payload, never the AI price", () => {
  const out = JSON.parse(applyDeterministicPricing(aiContent(null, 175))) as {
    total: number;
    pricedBy?: string;
    requiresReview: boolean;
    summary: string;
    flags: string[];
    groups: unknown[];
  };
  assert.equal(out.total, 0);
  assert.equal(out.pricedBy, "review");
  assert.equal(out.requiresReview, true);
  assert.deepEqual(out.groups, []);
  assert.ok(!out.summary.includes("175"));
  assert.ok(!out.flags.some((f) => f.includes("AI flag")));
});

test("issue-35 S-10 fail-closed: unparseable content returns the review payload, not the raw text", () => {
  const out = JSON.parse(applyDeterministicPricing("not json at all")) as { total: number; pricedBy?: string };
  assert.equal(out.total, 0);
  assert.equal(out.pricedBy, "review");
});

test("issue-35 S-10 fail-closed: an invalid scope fails closed but preserves the requested specialty work", () => {
  const scope = structuredClone(oneTvScope) as Record<string, unknown>;
  const form = scope.form as { tvs: Record<string, unknown>[] };
  form.tvs[0] = { ...form.tvs[0], location: "fireplace", wireConcealment: true };
  // 13 TVs exceeds the public schema maximum of 12, so validation fails and
  // pricing must fail closed — with the requested work preserved for review.
  form.tvs = Array.from({ length: 13 }, (_, i) => ({ ...form.tvs[0], ...(i > 0 ? { location: "standard", wireConcealment: false } : {}) }));
  const out = JSON.parse(applyDeterministicPricing(aiContent(scope, 432))) as {
    total: number;
    pricedBy?: string;
    requestedScope?: { tvs: Array<{ location: string; wireConcealment: boolean }> };
  };
  assert.equal(out.total, 0);
  assert.equal(out.pricedBy, "review");
  assert.equal(out.requestedScope?.tvs[0]?.location, "fireplace");
  assert.equal(out.requestedScope?.tvs[0]?.wireConcealment, true);
});

test("issue-35 S-10: AI summary/flags carrying prices are dropped on the deterministic path", () => {
  const scope = structuredClone(oneTvScope);
  scope.form.tvs[0] = { ...scope.form.tvs[0], sizeChoice: "56-85" } as typeof scope.form.tvs[0];
  const content = JSON.stringify({
    groups: [],
    subtotal: 999,
    discount: 0,
    total: 999,
    summary: "Your total is $999 today only",
    flags: ["Costs $999 total", "AI flag"],
    scope,
  });
  const out = JSON.parse(applyDeterministicPricing(content)) as { total: number; summary: string; flags: string[] };
  assert.equal(out.total, 100);
  assert.ok(!out.summary.includes("$"));
  assert.ok(!out.flags.some((f) => f.includes("$")));
  assert.ok(out.flags.includes("AI flag"));
});

test("issue-35 S-10 size gate: a 56+ scope with no size answer routes to review at $0", () => {
  const out = JSON.parse(applyDeterministicPricing(aiContent(oneTvScope, 100))) as { total: number; requiresReview: boolean };
  assert.equal(out.total, 0);
  assert.equal(out.requiresReview, true);
});

test("issue-35 S-10 size gate: an explicit 56-85 answer prices normally", () => {
  const scope = structuredClone(oneTvScope);
  scope.form.tvs[0] = { ...scope.form.tvs[0], sizeChoice: "56-85" } as typeof scope.form.tvs[0];
  const out = JSON.parse(applyDeterministicPricing(aiContent(scope, 100))) as { total: number; requiresReview: boolean };
  assert.equal(out.total, 100);
  assert.equal(out.requiresReview, false);
});
