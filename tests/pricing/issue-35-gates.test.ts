import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateQuote,
  isOversizeTv,
  type QuoteFormState,
  type TVConfig,
} from "../../client/src/lib/quote-calculator";
import {
  buildAugmentedQuote,
  HOUSE_VISIT_MINIMUM,
  type StandaloneServices,
} from "../../client/src/components/ui/quote-tool/shared";
import {
  catalogPublicQuote,
  catalogPublicQuoteResult,
  publicQuoteRequestSchema,
  publicRequestToScope,
} from "../../shared/pricing/publicQuote";

// Issue #35 implementation gates (owner decisions 2026-11-26):
//  S-2 masonry fireplaces start at $200 + photo review (no universal $250)
//  S-4 TVs 86"+ route to custom-quote review (85" is NOT oversized)
//  S-9 $100 minimum per house/visit; shared-visit add-ons stay ~$50

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

const noStandalone: StandaloneServices = {
  removalCount: 0,
  troubleshootingMinutes: 0,
  wireManagementLocations: 0,
  deviceSetup: false,
  sharedUnmountCount: 0,
};

test("issue-35: two standard TVs stay $200 with no review gate", () => {
  const quote = calculateQuote(state([tv({ id: "a" }), tv({ id: "b" })]));
  assert.equal(quote.total, 200);
  assert.equal(quote.requiresReview, false);
});

test("issue-35: standard TV + outlet stays $200 with no review gate", () => {
  const quote = calculateQuote(state([tv({ wireConcealment: true, outletDistance: "near" })]));
  assert.equal(quote.total, 200);
  assert.equal(quote.requiresReview, false);
});

test("issue-35: drywall fireplace stays a firm $200 with no review gate", () => {
  const quote = calculateQuote(state([tv({ location: "fireplace" })]));
  assert.equal(quote.total, 200);
  assert.equal(quote.requiresReview, false);
});

test("issue-35 S-2: brick fireplace starts at $200 (no $250 surcharge) and requires photo review", () => {
  const quote = calculateQuote(state([tv({ location: "fireplace", wallType: "brick" })]));
  assert.equal(quote.total, 200);
  assert.equal(quote.requiresReview, true);
  assert.ok(quote.reviewReasons?.some((r) => /photo review/i.test(r)));
  assert.ok(quote.flags.some((f) => /photo/i.test(f)));
});

test("issue-35 S-2: stone/masonry wording — brick standard wall keeps the established +$50", () => {
  const quote = calculateQuote(state([tv({ wallType: "brick" })]));
  assert.equal(quote.total, 150);
  assert.equal(quote.requiresReview, false);
});

test("issue-35: mixed standard + drywall fireplace scopes per TV at $300", () => {
  const quote = calculateQuote(state([tv({ id: "a" }), tv({ id: "b", location: "fireplace" })]));
  assert.equal(quote.total, 300);
  assert.equal(quote.groups[0]?.subtotal, 100);
  assert.equal(quote.groups[1]?.subtotal, 200);
  assert.equal(quote.requiresReview, false);
});

test("issue-35 S-4: 85 inches is NOT oversized — normal $100 pricing, no review", () => {
  const quote = calculateQuote(state([tv({ exactInches: 85 })]));
  assert.equal(quote.total, 100);
  assert.equal(quote.requiresReview, false);
  assert.equal(isOversizeTv(tv({ exactInches: 85 })), false);
  assert.equal(isOversizeTv(tv({ exactInches: 86 })), true);
});

test("issue-35 S-4: 98-inch TV with no model gets NO instant price and routes to review", () => {
  const quote = calculateQuote(state([tv({ exactInches: 98 })]));
  assert.equal(quote.total, 0);
  assert.equal(quote.requiresReview, true);
  assert.ok(quote.reviewReasons?.some((r) => /VESA/i.test(r)));
  const line = quote.groups[0]?.items[0];
  assert.equal(line?.lineTotal, 0);
  assert.match(line?.name ?? "", /custom quote/i);
});

test("issue-35 S-4: oversize TV does not drag a standard TV into review pricing", () => {
  const quote = calculateQuote(state([tv({ id: "a" }), tv({ id: "b", exactInches: 98 })]));
  assert.equal(quote.total, 100);
  assert.equal(quote.groups[0]?.subtotal, 100);
  assert.equal(quote.requiresReview, true);
});

test("issue-35 S-9: standalone removal-only quote floors at the $100 visit minimum", () => {
  const base = calculateQuote(state([]));
  const quote = buildAugmentedQuote(base, { ...noStandalone, removalCount: 1 });
  assert.equal(quote.total, HOUSE_VISIT_MINIMUM);
  assert.ok(
    quote.groups.some((g) => g.items.some((i) => /per-visit minimum/i.test(i.name) && i.lineTotal === 50)),
  );
});

test("issue-35 S-9: shared-visit unmount add-on on an install job stays $50 (no double minimum)", () => {
  const base = calculateQuote(state([tv()]));
  const quote = buildAugmentedQuote(base, { ...noStandalone, sharedUnmountCount: 1 });
  assert.equal(quote.total, 150);
  assert.ok(!quote.groups.some((g) => g.items.some((i) => /per-visit minimum/i.test(i.name))));
});

test("issue-35 S-9: custom-quote-only request gets no invented minimum price", () => {
  const base = calculateQuote(state([]));
  const quote = buildAugmentedQuote(base, { ...noStandalone, deviceSetup: true });
  assert.equal(quote.total, 0);
});

test("issue-35 S-4/S-9: public schema carries exactInches and the catalog quote surfaces review", () => {
  const req = publicQuoteRequestSchema.parse({
    form: {
      tvs: [
        {
          id: "tv-1",
          size: "56+",
          exactInches: 98,
          model: null,
          wallType: "drywall",
          location: "standard",
          hasMount: true,
          mountType: null,
          wireConcealment: false,
          outletDistance: null,
          unmounting: false,
        },
      ],
      cameras: [],
      doorbell: false,
      soundbar: false,
      surroundSound: false,
      floodlight: false,
      handymanMinutes: 0,
      zipCode: "",
    },
    stage: "review",
  });
  const catalog = catalogPublicQuote(req);
  assert.equal(catalog.totalCents, 0);
  assert.equal(catalog.requiresReview, true);
  const scope = publicRequestToScope(req);
  assert.equal(scope.tvs[0]?.inches, 98);
  const result = catalogPublicQuoteResult(req);
  assert.equal(result.requiresReview, true);
});

test("issue-35 S-4: inches that disagree with the size band are dropped, never thrown", () => {
  const req = publicQuoteRequestSchema.parse({
    form: {
      tvs: [
        {
          id: "tv-1",
          size: "56+",
          exactInches: 40,
          wallType: "drywall",
          location: "standard",
          hasMount: true,
          mountType: null,
          wireConcealment: false,
          outletDistance: null,
          unmounting: false,
        },
      ],
      cameras: [],
      doorbell: false,
      soundbar: false,
      surroundSound: false,
      floodlight: false,
      handymanMinutes: 0,
      zipCode: "",
    },
  });
  const scope = publicRequestToScope(req);
  assert.equal(scope.tvs[0]?.inches, undefined);
  assert.equal(catalogPublicQuote(req).totalCents, 10_000);
});
