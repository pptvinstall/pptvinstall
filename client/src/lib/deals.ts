import type { Deal, DealCategory, DealCondition, FulfillmentType, StoreAvailability } from "@/data/deals";

// Pure deal logic for the /deals page (Issue #35 S-13). No React, no I/O —
// everything takes an explicit `now` so freshness behaviour is testable.
//
// Freshness rule (owner, Issue #35): a "pickup today" claim requires a FRESH,
// retailer-specific pickup verification — checked today (ET) and within the
// freshness window — for a store that is not closed, with pickup possible
// today. Anything else is suppressed to a "recheck" state automatically.
// Cached "in-stock" results are NOT pickup confirmations.

export const PICKUP_FRESHNESS_WINDOW_HOURS = 6;

const etFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function etParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number } {
  const parts = Object.fromEntries(etFormatter.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

function etDateKey(date: Date): string {
  const p = etParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function etMinutesOfDay(date: Date): number {
  const p = etParts(date);
  return p.hour * 60 + p.minute;
}

function parseHmToMinutes(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function isDealExpired(deal: Deal, now: Date): boolean {
  return now.getTime() > new Date(deal.expiresAt).getTime();
}

/** A verification is fresh for pickup claims only when it is from today (ET) and inside the window. */
export function isVerificationFresh(record: StoreAvailability, now: Date): boolean {
  const checked = new Date(record.checkedAt);
  if (Number.isNaN(checked.getTime())) return false;
  const ageMs = now.getTime() - checked.getTime();
  if (ageMs < 0) return false;
  if (ageMs > PICKUP_FRESHNESS_WINDOW_HOURS * 60 * 60 * 1000) return false;
  return etDateKey(checked) === etDateKey(now);
}

export function isStoreClosedNow(record: StoreAvailability, now: Date): boolean {
  if (!record.storeHours) return false;
  const close = parseHmToMinutes(record.storeHours.close);
  const open = parseHmToMinutes(record.storeHours.open);
  if (close === null || open === null) return false;
  const mins = etMinutesOfDay(now);
  // Same-day hours (open < close). Overnight schedules are not modelled; if the
  // hours look overnight we never claim "closed" from them.
  if (close <= open) return false;
  return mins >= close || mins < open;
}

/** Earliest pickup is today or earlier (ET), or unspecified. */
function pickupDateAllowsToday(record: StoreAvailability, now: Date): boolean {
  if (!record.earliestPickup) return true;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(record.earliestPickup.trim());
  if (!m) return true; // free-form window label — cannot prove a future date, do not block on it
  return `${m[1]}-${m[2]}-${m[3]}` <= etDateKey(now);
}

export type PickupClaim = "pickup-today" | "recheck" | "unknown" | "unavailable";

/**
 * The customer-facing availability claim for one store record. Stale
 * verifications, closed stores and future pickup dates all suppress the
 * "pickup today" claim to "recheck" automatically.
 */
export function pickupClaim(record: StoreAvailability, now: Date): PickupClaim {
  if (record.stockStatus === "unavailable") return "unavailable";
  if (record.stockStatus === "unknown") return "unknown";
  if (record.fulfillment !== "pickup") return "recheck";
  if (!pickupDateAllowsToday(record, now)) return "recheck";
  if (!isVerificationFresh(record, now)) return "recheck";
  if (isStoreClosedNow(record, now)) return "recheck";
  return "pickup-today";
}

export const PICKUP_CLAIM_LABELS: Record<PickupClaim, string> = {
  "pickup-today": "Pickup today",
  recheck: "Recheck availability",
  unknown: "Availability unknown — recheck",
  unavailable: "Unavailable",
};

/** Lowest verified store price for a deal, or null when no store records exist. */
export function lowestStorePrice(deal: Deal): number | null {
  if (deal.availability.length === 0) return null;
  return Math.min(...deal.availability.map((r) => r.price));
}

/**
 * Same-condition savings only: compares the lowest store price against the
 * deal's own same-condition reference price. Returns null when there is no
 * verified reference — savings are never inferred across conditions.
 */
export function sameConditionSavings(deal: Deal): number | null {
  const lowest = lowestStorePrice(deal);
  if (lowest === null || typeof deal.referencePrice !== "number") return null;
  const savings = deal.referencePrice - lowest;
  return savings > 0 ? savings : null;
}

/** Deals that may render publicly: published, and (by default) not expired. */
export function visibleDeals(all: Deal[], now: Date, opts: { includeExpired?: boolean } = {}): Deal[] {
  return all.filter((deal) => deal.published && (opts.includeExpired || !isDealExpired(deal, now)));
}

export type DealFilters = {
  /** Manual ZIP entry only — the page never requires geolocation. */
  zip?: string;
  retailer?: string;
  category?: DealCategory | "";
  /** Max lowest-store price, dollars. */
  budget?: number | null;
  condition?: DealCondition | "";
  fulfillment?: FulfillmentType | "";
  /** Only deals with at least one fresh verification. */
  freshOnly?: boolean;
  /** Include expired deals (they render with an Expired badge). Default: excluded. */
  includeExpired?: boolean;
};

export function filterDeals(all: Deal[], filters: DealFilters, now: Date): Deal[] {
  const zip = (filters.zip ?? "").trim();
  return visibleDeals(all, now, { includeExpired: filters.includeExpired }).filter((deal) => {
    if (zip && !deal.availability.some((r) => r.zip === zip)) return false;
    if (filters.retailer && deal.retailer !== filters.retailer) return false;
    if (filters.category && deal.category !== filters.category) return false;
    if (filters.condition && deal.condition !== filters.condition) return false;
    if (typeof filters.budget === "number" && filters.budget > 0) {
      const lowest = lowestStorePrice(deal);
      if (lowest === null || lowest > filters.budget) return false;
    }
    if (filters.fulfillment && !deal.availability.some((r) => r.fulfillment === filters.fulfillment)) return false;
    if (filters.freshOnly && !deal.availability.some((r) => isVerificationFresh(r, now))) return false;
    return true;
  });
}

export type QuoteHandoff = {
  product: string;
  model: string;
  source: string;
};

/**
 * The ONLY data a deal hands to the quote flow: product name, exact model and
 * source attribution. No installation price is ever attached to a deal.
 */
export function buildQuoteHandoff(deal: Deal): QuoteHandoff {
  return { product: deal.productName, model: deal.model, source: deal.retailer };
}

export function quoteHandoffUrl(deal: Deal): string {
  const params = new URLSearchParams(buildQuoteHandoff(deal));
  return `/quote?${params.toString()}`;
}

/** The purchase link to render: approved affiliate URL only when a program is approved and the link is live; otherwise the canonical retailer URL. */
export function purchaseUrl(deal: Deal, now: Date): { url: string; isAffiliate: boolean } {
  const aff = deal.affiliate;
  if (aff?.status === "approved" && aff.affiliateUrl) {
    if (!aff.linkExpiresAt || new Date(aff.linkExpiresAt).getTime() > now.getTime()) {
      return { url: aff.affiliateUrl, isAffiliate: true };
    }
  }
  return { url: deal.retailerUrl, isAffiliate: false };
}
