import assert from "node:assert/strict";
import test from "node:test";

import type { Deal, StoreAvailability } from "../../client/src/data/deals.ts";
import {
  buildQuoteHandoff,
  filterDeals,
  isDealExpired,
  lowestStorePrice,
  pickupClaim,
  purchaseUrl,
  quoteHandoffUrl,
  sameConditionSavings,
  visibleDeals,
} from "../../client/src/lib/deals.ts";

// Fixed "now": Thursday Nov 26, 2026, 12:00 PM ET.
const NOW = new Date("2026-11-26T17:00:00Z");

function store(overrides: Partial<StoreAvailability> = {}): StoreAvailability {
  return {
    storeId: "3709",
    storeName: "Walmart Gresham Rd",
    address: "3580 Memorial Dr, Decatur, GA",
    zip: "30032",
    price: 292,
    checkedAt: "2026-11-26T15:00:00Z", // 10:00 AM ET today — fresh
    evidenceUrl: "https://www.walmart.com/store/3709",
    fulfillment: "pickup",
    earliestPickup: "2026-11-26",
    stockStatus: "in-stock",
    storeHours: { open: "06:00", close: "23:00" }, // open at noon ET
    ...overrides,
  };
}

function deal(overrides: Partial<Deal> = {}): Deal {
  return {
    id: "deal-test-1",
    productName: "Example 85\" TV",
    model: "EX85-TEST",
    category: "tvs",
    condition: "open-box",
    retailer: "Walmart",
    seller: "Walmart",
    warranty: "Example warranty text",
    returns: "Example returns text",
    completeness: "Example completeness text",
    retailerUrl: "https://www.walmart.com/ip/example",
    expiresAt: "2026-11-29T05:00:00Z",
    published: true,
    availability: [store()],
    ...overrides,
  };
}

test("same SKU in two stores: differing pickup dates produce different claims", () => {
  const today = deal({ availability: [store({ earliestPickup: "2026-11-26" })] });
  const tomorrow = deal({ availability: [store({ storeId: "3185", earliestPickup: "2026-11-27" })] });
  assert.equal(pickupClaim(today.availability[0], NOW), "pickup-today");
  assert.equal(pickupClaim(tomorrow.availability[0], NOW), "recheck");
});

test("stale verification suppresses a pickup-today claim", () => {
  const stale = store({ checkedAt: "2026-11-25T20:00:00Z" }); // verified yesterday ET
  assert.equal(pickupClaim(stale, NOW), "recheck");
});

test("a store that is already closed cannot claim pickup today", () => {
  const closed = store({ storeHours: { open: "09:00", close: "11:00" } }); // closed at noon ET
  assert.equal(pickupClaim(closed, NOW), "recheck");
});

test("ambiguous availability is labelled unknown, never guessed", () => {
  assert.equal(pickupClaim(store({ stockStatus: "unknown" }), NOW), "unknown");
  assert.equal(pickupClaim(store({ stockStatus: "unavailable" }), NOW), "unavailable");
  assert.equal(lowestStorePrice(deal({ availability: [] })), null);
});

test("manual ZIP filter matches only deals verified in that ZIP", () => {
  const inZip = deal({ id: "a" });
  const otherZip = deal({ id: "b", availability: [store({ zip: "30308" })] });
  const result = filterDeals([inZip, otherZip], { zip: "30032" }, NOW);
  assert.deepEqual(result.map((d) => d.id), ["a"]);
});

test("expired deals drop from the default listing and return only when requested", () => {
  const expired = deal({ id: "old", expiresAt: "2026-11-26T10:00:00Z" });
  assert.equal(isDealExpired(expired, NOW), true);
  assert.deepEqual(visibleDeals([expired], NOW), []);
  assert.equal(visibleDeals([expired], NOW, { includeExpired: true }).length, 1);
  assert.deepEqual(filterDeals([expired], {}, NOW), []);
});

test("unpublished deals never render", () => {
  assert.deepEqual(visibleDeals([deal({ published: false })], NOW), []);
});

test("savings use only the deal's same-condition reference price", () => {
  // referencePrice is, by schema construction, the verified price for THIS
  // deal's condition — a cross-condition comparison is not representable.
  const withRef = deal({ referencePrice: 768 });
  assert.equal(sameConditionSavings(withRef), 768 - 292);
  const noRef = deal();
  assert.equal(sameConditionSavings(noRef), null);
});

test("quote handoff carries product, model and source only — no price", () => {
  const handoff = buildQuoteHandoff(deal());
  assert.deepEqual(Object.keys(handoff).sort(), ["model", "product", "source"]);
  assert.equal(handoff.model, "EX85-TEST");
  const url = quoteHandoffUrl(deal());
  assert.ok(!/price|total|amount/i.test(url), `handoff URL must not carry price data: ${url}`);
});

test("purchase URL falls back to the canonical retailer link unless an approved, unexpired affiliate link exists", () => {
  const plain = purchaseUrl(deal(), NOW);
  assert.equal(plain.isAffiliate, false);
  assert.equal(plain.url, "https://www.walmart.com/ip/example");

  const approved = deal({
    affiliate: {
      program: "Walmart Affiliate Program",
      network: "Impact",
      status: "approved",
      affiliateUrl: "https://goto.walmart.com/example",
      disclosureText: "Affiliate link.",
      linkExpiresAt: "2026-12-31T05:00:00Z",
    },
  });
  const aff = purchaseUrl(approved, NOW);
  assert.equal(aff.isAffiliate, true);
  assert.equal(aff.url, "https://goto.walmart.com/example");

  const expiredLink = deal({
    affiliate: { ...approved.affiliate!, linkExpiresAt: "2026-11-01T04:00:00Z" },
  });
  assert.equal(purchaseUrl(expiredLink, NOW).isAffiliate, false);
});

test("budget and freshness filters behave", () => {
  const pricey = deal({ id: "p", availability: [store({ price: 900 })] });
  const cheap = deal({ id: "c", availability: [store({ price: 200 })] });
  assert.deepEqual(filterDeals([pricey, cheap], { budget: 500 }, NOW).map((d) => d.id), ["c"]);

  const staleDeal = deal({ id: "s", availability: [store({ checkedAt: "2026-11-24T15:00:00Z" })] });
  assert.deepEqual(filterDeals([staleDeal], { freshOnly: true }, NOW), []);
  assert.equal(filterDeals([staleDeal], {}, NOW).length, 1);
});
