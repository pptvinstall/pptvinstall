import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateQuote,
  tvSizeReview,
  type QuoteFormState,
  type TVConfig,
} from "../../client/src/lib/quote-calculator";
import { quoteDisplayState } from "../../client/src/components/ui/quote-tool/shared";
import {
  catalogPublicQuote,
  publicQuoteRequestSchema,
  publicRequestToScope,
} from "../../shared/pricing/publicQuote";
import { tvScopeSchema } from "../../shared/pricing/scope";

// Issue #35 release-blocker fixes (ChatGPT review of PR #36):
//  1. size gate — explicit 56–85 / 86+ / unsure choice; unknown and
//     contradictory sizes route to review on every channel;
//  2. (form input keeps raw string while typing — covered by browser test);
//  3. S-10 fails closed (covered in tests/jobos/issue-35-ai-deterministic);
//  4. results rendering — review-only is never "$0", mixed totals are
//     labelled partial, and review state propagates (display-state predicate
//     here; booking/inquiry wiring in the client).

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

function state(tvs: TVConfig[]): QuoteFormState {
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
    zipCode: "",
    notes: "",
  };
}

function publicReq(tvOverrides: Record<string, unknown>) {
  return publicQuoteRequestSchema.parse({
    form: {
      tvs: [
        {
          id: "tv-1",
          size: "56+",
          wallType: "drywall",
          location: "standard",
          hasMount: true,
          mountType: null,
          wireConcealment: false,
          outletDistance: null,
          unmounting: false,
          ...tvOverrides,
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
}

// ── Blocker 1: calculator-level size gate ────────────────────────────────────

test("blocker-1: explicit 86+ choice with no inches is oversize — $0, review", () => {
  const quote = calculateQuote(state([tv({ sizeChoice: "86+" })]));
  assert.equal(quote.total, 0);
  assert.equal(quote.requiresReview, true);
  assert.equal(tvSizeReview(tv({ sizeChoice: "86+" }))?.kind, "oversize");
});

test("blocker-1: 'unsure' size routes to review with no price for that TV", () => {
  const quote = calculateQuote(state([tv({ sizeChoice: "unsure" })]));
  assert.equal(quote.total, 0);
  assert.equal(quote.requiresReview, true);
  assert.ok(quote.reviewReasons?.some((r) => /not confirmed/i.test(r)));
});

test("blocker-1: contradictory size (98 inches but 56-85 range) is never priced", () => {
  const quote = calculateQuote(state([tv({ sizeChoice: "56-85", exactInches: 98 })]));
  assert.equal(quote.total, 0);
  assert.equal(quote.requiresReview, true);
  assert.ok(quote.reviewReasons?.some((r) => /conflict/i.test(r)));
  assert.equal(tvSizeReview(tv({ sizeChoice: "56-85", exactInches: 98 }))?.kind, "contradiction");
});

test("blocker-1: contradictory band (32-55 chosen, 65 inches typed) routes to review", () => {
  const quote = calculateQuote(state([tv({ size: "32-55", exactInches: 65 })]));
  assert.equal(quote.total, 0);
  assert.equal(quote.requiresReview, true);
});

test("blocker-1: 85 inches with a 56-85 answer prices normally at $100, no review", () => {
  const quote = calculateQuote(state([tv({ sizeChoice: "56-85", exactInches: 85 })]));
  assert.equal(quote.total, 100);
  assert.equal(quote.requiresReview, false);
});

test("blocker-1: 86 inches is oversize; 98 inches is oversize; both $0 + review", () => {
  for (const inches of [86, 98]) {
    const quote = calculateQuote(state([tv({ exactInches: inches })]));
    assert.equal(quote.total, 0, `${inches}" total`);
    assert.equal(quote.requiresReview, true, `${inches}" review`);
  }
});

test("blocker-1: mixed job — standard TV priced, unsure TV held for review", () => {
  const quote = calculateQuote(state([tv({ id: "a", sizeChoice: "56-85" }), tv({ id: "b", sizeChoice: "unsure" })]));
  assert.equal(quote.total, 100);
  assert.equal(quote.requiresReview, true);
  assert.equal(quoteDisplayState(quote), "partial");
});

// ── Blocker 1: public API boundary ───────────────────────────────────────────

test("blocker-1: omitted size answer at the public API is unconfirmed — $0 + review, scope marked unsure", () => {
  const req = publicReq({});
  const catalog = catalogPublicQuote(req);
  assert.equal(catalog.totalCents, 0);
  assert.equal(catalog.requiresReview, true);
  const scope = publicRequestToScope(req);
  assert.equal(scope.tvs[0]?.sizeChoice, "unsure");
});

test("blocker-1: explicit 86+ answer at the public API routes to review", () => {
  const catalog = catalogPublicQuote(publicReq({ sizeChoice: "86+" }));
  assert.equal(catalog.totalCents, 0);
  assert.equal(catalog.requiresReview, true);
});

test("blocker-1: explicit 56-85 answer at the public API prices $100 firm", () => {
  const req = publicReq({ sizeChoice: "56-85" });
  const catalog = catalogPublicQuote(req);
  assert.equal(catalog.totalCents, 10_000);
  assert.equal(catalog.requiresReview, false);
  assert.equal(publicRequestToScope(req).tvs[0]?.sizeChoice, "56-85");
});

// ── Blocker 1: engine scope schema validation ────────────────────────────────

test("blocker-1: engine scope rejects a sizeChoice that contradicts inches", () => {
  assert.equal(tvScopeSchema.safeParse({ sizeBand: "56+", sizeChoice: "56-85", inches: 98 }).success, false);
  assert.equal(tvScopeSchema.safeParse({ sizeBand: "56+", sizeChoice: "86+", inches: 65 }).success, false);
  assert.equal(tvScopeSchema.safeParse({ sizeBand: "32-55", sizeChoice: "unsure" }).success, false);
  assert.equal(tvScopeSchema.safeParse({ sizeBand: "56+", sizeChoice: "unsure" }).success, true);
  assert.equal(tvScopeSchema.safeParse({ sizeBand: "56+", sizeChoice: "86+", inches: 98 }).success, true);
});

// ── Blocker 4: flag propagation + display state ──────────────────────────────

test("blocker-4: fireplace wire concealment propagates to review state, not just a flag", () => {
  const quote = calculateQuote(state([tv({ sizeChoice: "56-85", location: "fireplace", wireConcealment: true })]));
  assert.equal(quote.requiresReview, true);
  assert.ok(quote.flags.some((f) => /concealment above fireplaces/i.test(f)));
  assert.ok(quote.reviewReasons?.some((r) => /photo assessment/i.test(r)));
  assert.equal(quoteDisplayState(quote), "partial");
});

test("blocker-4: display state — firm, partial, and review-only are distinct", () => {
  const firm = calculateQuote(state([tv({ sizeChoice: "56-85" })]));
  assert.equal(quoteDisplayState(firm), "firm");

  const reviewOnly = calculateQuote(state([tv({ exactInches: 98 })]));
  assert.equal(reviewOnly.total, 0);
  assert.equal(quoteDisplayState(reviewOnly), "review-only");

  // A priced TV plus an unpriced custom-quote extra is partial even without
  // an explicit review gate.
  const withSoundbar = calculateQuote({ ...state([tv({ sizeChoice: "56-85" })]), soundbar: true });
  assert.ok(withSoundbar.total > 0);
  assert.equal(quoteDisplayState(withSoundbar), "partial");
});

test("blocker-4: masonry fireplace keeps its $200 start and review state end-to-end", () => {
  const quote = calculateQuote(state([tv({ sizeChoice: "56-85", location: "fireplace", wallType: "brick" })]));
  assert.equal(quote.total, 200);
  assert.equal(quote.requiresReview, true);
  assert.equal(quoteDisplayState(quote), "partial");
  const catalog = catalogPublicQuote(publicReq({ sizeChoice: "56-85", location: "fireplace", wallType: "brick" }));
  assert.equal(catalog.totalCents, 20_000);
  assert.equal(catalog.requiresReview, true);
  assert.ok(catalog.reviewReasons.some((r) => /photo review/i.test(r)));
});
