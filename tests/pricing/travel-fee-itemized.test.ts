import assert from "node:assert/strict";
import test from "node:test";
import { getDayType, getTravelContext, getTravelFee } from "../../client/src/lib/travel-pricing";
import { normalizeQuoteForDisplayTotals } from "../../client/src/components/ui/quote-tool/shared";
import type { DisplayQuote } from "../../client/src/components/ui/quote-tool/shared";

// Booking-20 incident: a $100 standard mount showed an "Estimated Total" of $109
// with no explanation. The $9 is the fuel travel fee for ZIP 30093 — it was added
// to the total by quote normalization but never itemized as a line item.

const SATURDAY = new Date(2026, 9, 17); // quote day for booking-20 (weekend tiers)
const THURSDAY = new Date(2026, 9, 22); // appointment day (weekday tiers)

test("travel fee is date-aware: 30093 is tier 2 ($9) on weekends, tier 3 ($11) on weekdays", () => {
  assert.equal(getDayType(SATURDAY), "weekend");
  assert.equal(getDayType(THURSDAY), "weekday");
  assert.equal(getTravelFee("30093", SATURDAY), 9);
  assert.equal(getTravelFee("30093", THURSDAY), 11);
});

function booking20Quote(): DisplayQuote {
  const travelContext = getTravelContext("30093", SATURDAY);
  return {
    groups: [
      {
        title: "TV Mounting",
        items: [{ name: "Standard TV Mounting", price: 100, qty: 1, lineTotal: 100 }],
        subtotal: 100,
      },
    ],
    subtotal: 100,
    discount: 0,
    total: 100,
    flags: [],
    travelTier: travelContext.tier,
    travelFee: travelContext.fee,
    travelContext,
    summary: "1 TV mounting",
  };
}

test("booking-20: the $9 travel fee is itemized and line items sum to the total", () => {
  const normalized = normalizeQuoteForDisplayTotals(booking20Quote());
  assert.equal(normalized.total, 109);

  const travelLines = normalized.groups.flatMap((g) => g.items).filter((i) => /travel fee/i.test(i.name));
  assert.equal(travelLines.length, 1);
  assert.equal(travelLines[0].lineTotal, 9);

  const itemsSum = normalized.groups.flatMap((g) => g.items).reduce((s, i) => s + i.lineTotal, 0);
  assert.equal(itemsSum, normalized.total);
});

test("normalization is idempotent: re-running never double-counts the fee", () => {
  const once = normalizeQuoteForDisplayTotals(booking20Quote());
  const twice = normalizeQuoteForDisplayTotals(once);
  assert.equal(twice.total, 109);
  const travelLines = twice.groups.flatMap((g) => g.items).filter((i) => /travel fee/i.test(i.name));
  assert.equal(travelLines.length, 1);
  const itemsSum = twice.groups.flatMap((g) => g.items).reduce((s, i) => s + i.lineTotal, 0);
  assert.equal(itemsSum, twice.total);
});

test("no travel line is added when the fee is $0 (local tier)", () => {
  const travelContext = getTravelContext("30034", SATURDAY); // Decatur: tier 0 on weekends
  assert.equal(getTravelFee("30034", SATURDAY), 0);
  const quote: DisplayQuote = { ...booking20Quote(), travelTier: travelContext.tier, travelFee: 0, travelContext };
  const normalized = normalizeQuoteForDisplayTotals(quote);
  assert.equal(normalized.total, 100);
  assert.ok(!normalized.groups.flatMap((g) => g.items).some((i) => /travel fee/i.test(i.name)));
});
