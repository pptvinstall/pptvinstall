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
// Deals Batch 1 — Black Friday, Friday Nov 27, 2026 (Issue #35, S-13).
//
// Ready-to-commit entries matching client/src/data/deals.ts exactly.
// Source evidence: deals-batch-2026-11-27.md in this folder.
//
// HONESTY NOTES (read before committing):
// - Every price + stock status below was read on the retailer's own product
//   page on 2026-11-27 at ~07:10-07:12 AM ET (checkedAt, UTC).
// - The first seven entries are ONLINE records only: no Atlanta store-level
//   pickup stock could be verified for Best Buy / Target / BrandsMart
//   (their pages render a non-Atlanta default location or web inventory
//   only). Those records carry fulfillment "delivery" and stockStatus
//   "in-stock" exactly as the page displayed (JSON-LD Product Offer:
//   InStock), and support NO "pickup today" claim.
// - The last four entries (Walmart ×3, Sam's Club ×1) DO carry verified
//   Atlanta store-level records, read in a live browser session on
//   2026-11-27 at ~07:17 AM ET (CHECKED_LIVE): Walmart Atlanta Gresham Rd
//   (2427 Gresham Rd SE, Atlanta, GA 30316 — Walmart's pages show the store
//   name/address, not a store number, so no store number is recorded) and
//   Sam's Club Tucker (1940 Mountain Industrial Blvd, Tucker, GA 30084).
//   Their pickup records support a "pickup today" claim only while fresh
//   under the /deals freshness window.
// - NOT included (see the .md): VIZIO 85" Mini LED QLED VQM85C-10 at Walmart
//   — verified, but pickup is OUT OF STOCK at Gresham Rd for both the new
//   ($768) and open-box ($292) conditions, and the open-box price's only
//   reference is the new price (a cross-condition comparison the schema
//   forbids), so it is recorded in the .md only.
// - `published: false` on every entry: the schema requires human review
//   before a deal renders, and the Issue #35 release gate keeps publishing
//   behind the owner's approval. Flip to true only on owner sign-off.
// - referencePrice is always the SAME-CONDITION (new) reference the retailer
//   itself displayed on the same page ("Comp. Value" / "reg" / strikethrough).
// - Warranty/returns/completeness strings deliberately state that the terms
//   were not itemized on the pages read, instead of inventing specifics.
// - Affiliate field omitted on all entries: every program in
//   docs/affiliate-program-prep.md is Status: NOT REGISTERED, so ordinary
//   retailer links are the default (purchaseUrl falls back to retailerUrl).
// - Also NOT included (see the .md): BrandsMart collection-page leads
//   without model numbers.

const CHECKED_BESTBUY = "2026-11-27T12:10:00Z"; // 07:10 AM ET, Nov 27 2026
const CHECKED_TARGET = "2026-11-27T12:11:00Z"; // 07:11 AM ET, Nov 27 2026
const CHECKED_BRANDSMART = "2026-11-27T12:11:00Z"; // 07:11 AM ET, Nov 27 2026
const CHECKED_LIVE = "2026-11-27T12:17:00Z"; // ~07:17 AM ET, Nov 27 2026 — live browser session (Walmart / Sam's Club store pages)

const WARRANTY_UNVERIFIED =
  "Manufacturer warranty applies — specific terms were not itemized on the retailer product page read on 2026-11-27; confirm on the retailer page before purchase.";
const RETURNS_UNVERIFIED =
  "Retailer standard return policy applies — the return window was not stated on the product page read on 2026-11-27; confirm on the retailer site before purchase.";
const COMPLETENESS_NEW =
  "New, factory-sealed retail box sold by the retailer; box contents are the manufacturer's standard contents (not itemized on the page read on 2026-11-27).";

export const deals: Deal[] = [
  {
    id: "bestbuy-hisense-98qd5sf-2026-11-27",
    productName: "Hisense 98\" Class QD5 Hi-QLED Series 4K UHD Smart Fire TV (2026)",
    model: "98QD5SF",
    category: "tvs",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Best Buy",
    completeness: COMPLETENESS_NEW,
    retailer: "Best Buy",
    retailerUrl:
      "https://www.bestbuy.com/product/hisense-98-class-qd5-hi-qled-series-4k-uhd-smart-fire-tv-2026/J3Z9Z42FS4/sku/6685580",
    referencePrice: 2499.99,
    expiresAt: "2026-11-29T05:00:00Z", // Best Buy Black Friday event ends Nov. 28 (page banner)
    published: false,
    availability: [
      {
        storeId: "bestbuy-online",
        storeName: "BestBuy.com (online)",
        address: "Online store — no Atlanta store-level stock was shown on the product page",
        zip: "",
        price: 799.99,
        checkedAt: CHECKED_BESTBUY,
        evidenceUrl:
          "https://www.bestbuy.com/product/hisense-98-class-qd5-hi-qled-series-4k-uhd-smart-fire-tv-2026/J3Z9Z42FS4/sku/6685580",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "bestbuy-hisense-98qd5qg-2026-11-27",
    productName: "Hisense 98\" Class QD5 Series Hi-QLED 4K UHD Smart Google TV (2025)",
    model: "98QD5QG",
    category: "tvs",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Best Buy",
    completeness: COMPLETENESS_NEW,
    retailer: "Best Buy",
    retailerUrl:
      "https://www.bestbuy.com/product/hisense-98-class-qd5-series-hi-qled-4k-uhd-smart-google-tv-2025/J3Z9Z42625",
    referencePrice: 2299.99,
    expiresAt: "2026-11-29T05:00:00Z", // Best Buy Black Friday event ends Nov. 28 (page banner)
    published: false,
    availability: [
      {
        storeId: "bestbuy-online",
        storeName: "BestBuy.com (online)",
        address: "Online store — no Atlanta store-level stock was shown on the product page",
        zip: "",
        price: 999.99,
        checkedAt: CHECKED_BESTBUY,
        evidenceUrl:
          "https://www.bestbuy.com/product/hisense-98-class-qd5-series-hi-qled-4k-uhd-smart-google-tv-2025/J3Z9Z42625",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "bestbuy-insignia-ns75f501na27-2026-11-27",
    productName: "Insignia 75-inch Class F50 Series LED 2160p 4K UHD Smart Fire TV",
    model: "NS-75F501NA27",
    category: "tvs",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Best Buy",
    completeness: COMPLETENESS_NEW,
    retailer: "Best Buy",
    retailerUrl:
      "https://www.bestbuy.com/product/insignia-75-inch-class-f50-series-led-2160p-4k-uhd-smart-fire-tv/J2FPJK9ZCK/sku/6672635",
    referencePrice: 599.99,
    expiresAt: "2026-11-29T05:00:00Z", // Page: "Doorbuster, Deal ends tomorrow" read Nov. 27 → ends Nov. 28
    published: false,
    availability: [
      {
        storeId: "bestbuy-online",
        storeName: "BestBuy.com (online)",
        address: "Online store — no Atlanta store-level stock was shown on the product page",
        zip: "",
        price: 299.99,
        checkedAt: CHECKED_BESTBUY,
        evidenceUrl:
          "https://www.bestbuy.com/product/insignia-75-inch-class-f50-series-led-2160p-4k-uhd-smart-fire-tv/J2FPJK9ZCK/sku/6672635",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "bestbuy-tcl-85s4cf-2026-11-27",
    productName: "TCL 85\" S4CF Series 4K UHD HDR Smart TV with Fire TV (2026)",
    model: "85S4CF",
    category: "tvs",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Best Buy",
    completeness: COMPLETENESS_NEW,
    retailer: "Best Buy",
    retailerUrl:
      "https://www.bestbuy.com/product/tcl-85-s4cf-series-4k-uhd-hdr-smart-tv-with-fire-tv-2026/J36QYTHZFS/sku/6687110",
    referencePrice: 1199.99,
    expiresAt: "2026-11-29T05:00:00Z", // Best Buy Black Friday event ends Nov. 28 (page banner)
    published: false,
    availability: [
      {
        storeId: "bestbuy-online",
        storeName: "BestBuy.com (online)",
        address: "Online store — no Atlanta store-level stock was shown on the product page",
        zip: "",
        price: 639.99,
        checkedAt: CHECKED_BESTBUY,
        evidenceUrl:
          "https://www.bestbuy.com/product/tcl-85-s4cf-series-4k-uhd-hdr-smart-tv-with-fire-tv-2026/J36QYTHZFS/sku/6687110",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "target-samsung-un65u8000h-2026-11-27",
    productName: "Samsung 65\" 4K Crystal Series SamsungVision AI Companion Smart Tizen OS TV",
    model: "UN65U8000H",
    category: "tvs",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Target",
    completeness: COMPLETENESS_NEW,
    retailer: "Target",
    retailerUrl:
      "https://www.target.com/p/samsung-65-34-4k-crystal-series-samsungvision-ai-companion-smart-tizen-os-tv-un65u8000h/-/A-95003227",
    referencePrice: 399.99,
    // No end date on the product page; Target's announced Black Friday window
    // runs Nov. 26-29, so expiry is set to the end of Nov. 29 ET.
    expiresAt: "2026-11-30T05:00:00Z",
    published: false,
    availability: [
      {
        storeId: "target-online",
        storeName: "Target.com (online)",
        address: "Online store — no Atlanta store-level stock was shown on the product page",
        zip: "",
        price: 299.99,
        checkedAt: CHECKED_TARGET,
        evidenceUrl:
          "https://www.target.com/p/samsung-65-34-4k-crystal-series-samsungvision-ai-companion-smart-tizen-os-tv-un65u8000h/-/A-95003227",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "target-samsung-hwb400f-2026-11-27",
    productName: "Samsung 2.0Ch Soundbar with Built-in Woofer - Titan Black",
    model: "HW-B400F",
    category: "soundbars",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Target",
    completeness: COMPLETENESS_NEW,
    retailer: "Target",
    retailerUrl:
      "https://www.target.com/p/samsung-2-0ch-soundbar-with-built-in-woofer-titan-black-hw-b400f/-/A-94465171",
    referencePrice: 139.99,
    // No end date on the product page; Target Black Friday window Nov. 26-29.
    expiresAt: "2026-11-30T05:00:00Z",
    published: false,
    availability: [
      {
        storeId: "target-online",
        storeName: "Target.com (online)",
        address: "Online store — no Atlanta store-level stock was shown on the product page",
        zip: "",
        price: 69.99,
        checkedAt: CHECKED_TARGET,
        evidenceUrl:
          "https://www.target.com/p/samsung-2-0ch-soundbar-with-built-in-woofer-titan-black-hw-b400f/-/A-94465171",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "brandsmart-lg-65nu700bpua-2026-11-27",
    productName: "LG 65\" Class Nano 4K UHD NU70 AI Smart TV",
    model: "65NU700BPUA",
    category: "tvs",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "BrandsMart USA",
    completeness: COMPLETENESS_NEW,
    retailer: "BrandsMart USA",
    retailerUrl:
      "https://www.brandsmartusa.com/products/tv-home-theater-tvs-by-size-60-69-inch-65-class-nano-4k-uhd-nu70-ai-smart-tv",
    referencePrice: 379.99,
    // Product-page banner: "DOORBUSTER DEALS! In-store Only Nov. 26-29".
    // The same page also states "Free pickup in our shop(s)" and "Available
    // for delivery"; only the delivery record is entered because no specific
    // store's stock was shown.
    expiresAt: "2026-11-30T05:00:00Z",
    published: false,
    availability: [
      {
        storeId: "brandsmart-online",
        storeName: "BrandsMartUSA.com (online)",
        address: "Online store — no specific store-level stock was shown on the product page",
        zip: "",
        price: 299.99,
        checkedAt: CHECKED_BRANDSMART,
        evidenceUrl:
          "https://www.brandsmartusa.com/products/tv-home-theater-tvs-by-size-60-69-inch-65-class-nano-4k-uhd-nu70-ai-smart-tv",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  // ---- Store-level records verified in a live browser session, 2026-11-27
  // ---- ~07:17 AM ET (CHECKED_LIVE). ----
  {
    id: "walmart-onn-tilting-mount-50-86-2026-11-27",
    productName: "onn Tilting TV Wall Mount for 50-86\" TVs",
    // Walmart item ID from the product URL — no separate manufacturer model
    // number was captured in the live session.
    model: "299960224",
    category: "mounts",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Walmart",
    completeness: COMPLETENESS_NEW,
    retailer: "Walmart",
    retailerUrl: "https://www.walmart.com/ip/299960224",
    // No "was" price was displayed for this item in the live session, so no
    // referencePrice is recorded.
    // No sale end date was displayed; expiry is a conservative
    // re-verification deadline (end of Nov. 29 ET), not a retailer end date.
    expiresAt: "2026-11-30T05:00:00Z",
    published: false,
    availability: [
      {
        // Walmart's pages show the store name/address, not a store number —
        // the store is recorded by name/address only.
        storeId: "walmart-atlanta-gresham-rd",
        storeName: "Walmart Atlanta Gresham Rd S E Supercenter",
        address: "2427 Gresham Rd SE, Atlanta, GA 30316",
        zip: "30316",
        price: 25.24,
        checkedAt: CHECKED_LIVE,
        evidenceUrl: "https://www.walmart.com/ip/299960224",
        fulfillment: "pickup",
        // Pickup today, in stock, as soon as 11 AM; located in Aisle K23.
        earliestPickup: "2026-11-27",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "walmart-onn-full-motion-mount-50-86-2026-11-27",
    productName: "onn Full-Motion TV Wall Mount for 50-86\" TVs",
    model: "100027961",
    category: "mounts",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Walmart",
    completeness: COMPLETENESS_NEW,
    retailer: "Walmart",
    retailerUrl: "https://www.walmart.com/ip/866844895",
    referencePrice: 54.0, // "Rollback" — was $54.00 as displayed in the live session
    // Rollback pricing has no displayed end date; expiry is a conservative
    // re-verification deadline (end of Nov. 29 ET), not a retailer end date.
    expiresAt: "2026-11-30T05:00:00Z",
    published: false,
    availability: [
      {
        storeId: "walmart-atlanta-gresham-rd",
        storeName: "Walmart Atlanta Gresham Rd S E Supercenter",
        address: "2427 Gresham Rd SE, Atlanta, GA 30316",
        zip: "30316",
        price: 44.94,
        checkedAt: CHECKED_LIVE,
        evidenceUrl: "https://www.walmart.com/ip/866844895",
        fulfillment: "pickup",
        // Pickup today, in stock, as soon as 11 AM; located in Aisle K23.
        earliestPickup: "2026-11-27",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "walmart-vizio-vqd85x-10-2026-11-27",
    productName: "VIZIO 85\" Class Quantum QLED 4K Smart TV",
    model: "VQD85X-10",
    category: "tvs",
    condition: "new",
    warranty: WARRANTY_UNVERIFIED,
    returns: RETURNS_UNVERIFIED,
    seller: "Walmart",
    completeness: COMPLETENESS_NEW,
    retailer: "Walmart",
    retailerUrl: "https://www.walmart.com/ip/20270718496",
    referencePrice: 698.0, // Black Friday Deal — was $698.00 as displayed in the live session
    // No explicit end date was captured for this Black Friday price; expiry
    // is a conservative re-verification deadline (end of Nov. 29 ET).
    expiresAt: "2026-11-30T05:00:00Z",
    published: false,
    availability: [
      {
        storeId: "walmart-atlanta-gresham-rd",
        storeName: "Walmart Atlanta Gresham Rd S E Supercenter",
        address: "2427 Gresham Rd SE, Atlanta, GA 30316",
        zip: "30316",
        price: 498.0,
        checkedAt: CHECKED_LIVE,
        evidenceUrl: "https://www.walmart.com/ip/20270718496",
        fulfillment: "pickup",
        // Pickup today, in stock, as soon as 11 AM; located in Aisle BK1.
        earliestPickup: "2026-11-27",
        stockStatus: "in-stock",
      },
      {
        storeId: "walmart-online",
        storeName: "Walmart.com (online)",
        address: "Online store — shipping arrives today (Nov. 27) free, as displayed in the live session",
        zip: "",
        price: 498.0,
        checkedAt: CHECKED_LIVE,
        evidenceUrl: "https://www.walmart.com/ip/20270718496",
        fulfillment: "delivery",
        stockStatus: "in-stock",
      },
    ],
  },
  {
    id: "samsclub-vizio-vqd100m-0809-2026-11-27",
    productName: "VIZIO 100\" Class Quantum QLED Smart TV",
    model: "VQD100M-0809",
    category: "tvs",
    condition: "new",
    // The product page displayed a 5-year warranty as a member bonus
    // (Sam's Club "Instant Savings" offer, read in the live session).
    warranty:
      "5-year warranty included as a Sam's Club member bonus, as displayed on the product page read on 2026-11-27; confirm terms on the retailer page before purchase.",
    returns: RETURNS_UNVERIFIED,
    seller: "Sam's Club",
    completeness: COMPLETENESS_NEW,
    retailer: "Sam's Club",
    retailerUrl: "https://www.samsclub.com/ip/17672800075",
    referencePrice: 1498.0, // Instant Savings — was $1,498.00 as displayed in the live session
    expiresAt: "2026-11-30T05:00:00Z", // Offer ends Nov. 29 → end of Nov. 29 ET
    published: false,
    availability: [
      {
        storeId: "samsclub-tucker-ga",
        storeName: "Sam's Club — Tucker, GA",
        address: "1940 Mountain Industrial Blvd, Tucker, GA 30084",
        zip: "30084",
        price: 1198.0,
        checkedAt: CHECKED_LIVE,
        evidenceUrl: "https://www.samsclub.com/ip/17672800075",
        fulfillment: "pickup",
        // Club pickup available today; page estimated as soon as 11 AM
        // (reserving a slot requires sign-in); located in Aisle A3.
        earliestPickup: "2026-11-27",
        stockStatus: "in-stock",
        membershipRequired: "Sam's Club membership required — limit 5 per membership",
      },
      {
        storeId: "samsclub-online",
        storeName: "Sam's Club (online)",
        address: "Online store — shipping arrives tomorrow (Nov. 28) free freight, as displayed in the live session",
        zip: "",
        price: 1198.0,
        checkedAt: CHECKED_LIVE,
        evidenceUrl: "https://www.samsclub.com/ip/17672800075",
        fulfillment: "delivery",
        stockStatus: "in-stock",
        membershipRequired: "Sam's Club membership required — limit 5 per membership",
      },
    ],
  },
];

