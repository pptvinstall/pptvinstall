import type { QuoteFormState, QuoteGroup } from "../../client/src/lib/quote-calculator";
import { hashObject } from "./hash";

// Issue #35 S-11: immutable website quote snapshots.
//
// When a customer turns a website quote into a booking or inquiry, the exact
// quote they SAW — scope facts, itemized groups, totals, flags and review
// state — is frozen into a versioned snapshot and attached to the booking
// record. The snapshot is deep-frozen and hash-sealed at creation: later
// pricing-config changes (or tampering) can never rewrite what the customer
// was quoted. This mirrors the JobOS QuoteSnapshot pattern
// (shared/pricing/quote.ts snapshotQuote) for the public catalog path, which
// has no server-side quote version to reference.

export const WEBSITE_QUOTE_SNAPSHOT_VERSION = 1;

export interface WebsiteQuoteSnapshot {
  snapshotVersion: number;
  kind: "website-quote";
  /** ISO timestamp of when the snapshot was taken (when the customer acted on the quote). */
  createdAt: string;
  /** Which public entry produced the quote ("form" | "text" | "voice" | engine/catalog source label). */
  pricingSource: string;
  /** Pricing-config version in effect when known (engine config version); null for the pure browser catalog. */
  configVersion: number | null;
  /** Factual scope exactly as the customer entered it (no prices beyond the totals below). */
  form: QuoteFormState;
  groups: QuoteGroup[];
  subtotal: number;
  discount: number;
  total: number;
  flags: string[];
  requiresReview: boolean;
  reviewReasons: string[];
  promoCode: string | null;
  snapshotHash: string;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

export function createWebsiteQuoteSnapshot(input: {
  form: QuoteFormState;
  groups: QuoteGroup[];
  subtotal: number;
  discount: number;
  total: number;
  flags: string[];
  requiresReview?: boolean;
  reviewReasons?: string[];
  promoCode?: string | null;
  pricingSource: string;
  configVersion?: number | null;
  createdAt: string;
}): WebsiteQuoteSnapshot {
  // Clone first so later mutation of the live quote/form objects cannot leak
  // into the snapshot, then seal with a hash and freeze the whole structure.
  const body = {
    snapshotVersion: WEBSITE_QUOTE_SNAPSHOT_VERSION,
    kind: "website-quote" as const,
    createdAt: input.createdAt,
    pricingSource: input.pricingSource,
    configVersion: input.configVersion ?? null,
    form: structuredClone(input.form),
    groups: structuredClone(input.groups),
    subtotal: input.subtotal,
    discount: input.discount,
    total: input.total,
    flags: [...input.flags],
    requiresReview: input.requiresReview ?? false,
    reviewReasons: [...(input.reviewReasons ?? [])],
    promoCode: input.promoCode ?? null,
  };
  return deepFreeze({ ...body, snapshotHash: hashObject(body) });
}

/** Recompute the seal. False means the snapshot was altered after creation (or is not one). */
export function verifyWebsiteQuoteSnapshot(snapshot: unknown): snapshot is WebsiteQuoteSnapshot {
  if (!snapshot || typeof snapshot !== "object") return false;
  const s = snapshot as Record<string, unknown>;
  if (s.kind !== "website-quote" || s.snapshotVersion !== WEBSITE_QUOTE_SNAPSHOT_VERSION) return false;
  if (typeof s.snapshotHash !== "string") return false;
  const { snapshotHash, ...body } = s;
  return hashObject(body) === snapshotHash;
}
