// Atlanta Electronics Deals — data model (Issue #35 S-13).
//
// ADMIN / HOW DEALS GET PUBLISHED:
// - Deals are managed in this typed data file (the same pattern as
//   client/src/data/pricing-data.ts). A future JobOS-backed editor can replace
//   the storage without changing the types or the page.
// - A deal renders publicly ONLY when `published: true` AND it is not expired.
//   There is no auto-publishing: a human verifies every record first.
// - Deal research/verification is owned by ChatGPT (Issue #35); this file ships
//   EMPTY on purpose. Never invent prices, stock, or savings — a record enters
//   this file only with store-level evidence (see StoreAvailability).
// - Retailers: established retailers / retailer outlets and reputable
//   established refurbishers ONLY. No private Marketplace/OfferUp sellers.
// - Savings are only ever computed against a SAME-CONDITION reference price on
//   the same deal record. Never compare across conditions (e.g. an open-box
//   price against a new price) — that comparison is not representable here.

export type DealCondition = "new" | "clearance" | "open-box" | "refurbished" | "used";

export type DealCategory =
  | "tvs"
  | "mounts"
  | "soundbars"
  | "projectors-screens"
  | "streaming"
  | "gaming"
  | "computers-monitors"
  | "networking"
  | "smart-home"
  | "av";

export type StockStatus = "in-stock" | "in-store-only" | "unknown" | "unavailable";
export type FulfillmentType = "pickup" | "delivery";

/** One verified availability record for one physical store. A deal has many. */
export type StoreAvailability = {
  storeId: string;
  storeName: string;
  address: string;
  zip: string;
  /** Price at THIS store, in dollars. Store prices can differ per branch. */
  price: number;
  /** When this record was verified, ISO timestamp (America/New_York evidence). */
  checkedAt: string;
  /** Evidence for the verification (retailer store page / listing URL). */
  evidenceUrl: string;
  fulfillment: FulfillmentType;
  /** Earliest pickup date ("YYYY-MM-DD", ET) or window label, when known. */
  earliestPickup?: string;
  stockStatus: StockStatus;
  /** e.g. "Sam's Club membership required". */
  membershipRequired?: string;
  /** Local store hours "HH:MM" 24h, used to suppress claims when closed. */
  storeHours?: { open: string; close: string };
};

export type AffiliateStatus = "not-registered" | "pending" | "approved";

export type AffiliateInfo = {
  /** Program name, e.g. "Walmart Affiliate Program". */
  program: string;
  /** Affiliate network, when the program runs through one. */
  network?: string;
  status: AffiliateStatus;
  /** Only set when status is "approved". Ordinary retailer links are the default until then. */
  affiliateUrl?: string;
  /** Disclosure text shown adjacent to the compensated link. */
  disclosureText: string;
  /** When the affiliate link itself expires, ISO timestamp. */
  linkExpiresAt?: string;
};

export type Deal = {
  id: string;
  productName: string;
  /** Exact model number / SKU. */
  model: string;
  category: DealCategory;
  condition: DealCondition;
  /** Warranty disclosure (e.g. "1-year manufacturer warranty", "90-day refurbisher warranty", "Sold as-is — no warranty"). */
  warranty: string;
  /** Returns disclosure (e.g. "30-day returns at retailer"). */
  returns: string;
  /** Seller disclosure — the established retailer / refurbisher selling it. */
  seller: string;
  /** Completeness disclosure — what is in the box and anything missing (remote, stand, cables). */
  completeness: string;
  retailer: string;
  /** Canonical retailer product URL (ordinary link — the default). */
  retailerUrl: string;
  /** Optional affiliate link data. Used only when status is "approved". */
  affiliate?: AffiliateInfo;
  /** Same-condition reference price for THIS deal's condition, when verified. */
  referencePrice?: number;
  /** Deal expiration, ISO timestamp. Expired deals leave the default listing. */
  expiresAt: string;
  /** Draft/review gate: only `true` deals can render. */
  published: boolean;
  availability: StoreAvailability[];
};

export const DEAL_CONDITION_LABELS: Record<DealCondition, string> = {
  new: "New",
  clearance: "Clearance",
  "open-box": "Open-box",
  refurbished: "Refurbished",
  used: "Used (established refurbisher/reseller)",
};

export const DEAL_CATEGORY_LABELS: Record<DealCategory, string> = {
  tvs: "TVs",
  mounts: "Mounts",
  soundbars: "Soundbars",
  "projectors-screens": "Projectors & Screens",
  streaming: "Streaming",
  gaming: "Gaming",
  "computers-monitors": "Computers & Monitors",
  networking: "Networking",
  "smart-home": "Smart Home",
  av: "Audio / AV",
};

/**
 * The live deal dataset. Intentionally EMPTY in this change set: verified
 * records (with store-level evidence) are supplied by the deal research lane
 * (ChatGPT, Issue #35) and reviewed before `published` is set to true.
 */
export const deals: Deal[] = [];
