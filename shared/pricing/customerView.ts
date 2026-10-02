import type { CustomerLine, QuoteComposition } from "./quote";
import type { Cents } from "./money";

// Customer-safe serialization. The customer type is built by WHITELISTING fields; it can
// never carry floor, cost, margin, owner labor value, recommended/premium references,
// adjustment reasons or private notes. assertCustomerSafe() is a runtime backstop that is
// also used by API tests and the public quote endpoint.

export interface CustomerQuoteView {
  version: number;
  packageName?: string;
  lines: CustomerLine[];
  subtotalCents: Cents;
  totalCents: Cents;
  /** Human-readable, catalog-derived notes (the same ones the public quote tool already shows). */
  notes: string[];
  requiresReview: boolean;
  createdAt: string;
}

const FORBIDDEN_KEY = /(floor|cost|margin|premium|recommend|labor|owner|internal|override|reason|why|uncertain|material|hourly|profit|overhead|helper|fuel|vehicle|mpg|snapshot|config|hash|private|note$|flags?$)/i;
// "notes" (customer-safe catalog notes) is allowed explicitly; everything else is checked by pattern.
const ALLOWED_KEYS = new Set(["notes", "lines", "label", "detail", "amountCents", "subtotalCents", "totalCents", "version", "packageName", "requiresReview", "createdAt"]);

export class InternalDataLeakError extends Error {
  constructor(public readonly leakedKeys: string[]) {
    super(`Internal fields present in customer payload: ${leakedKeys.join(", ")}`);
    this.name = "InternalDataLeakError";
  }
}

export function findInternalKeys(value: unknown, path = ""): string[] {
  const found: string[] = [];
  if (Array.isArray(value)) {
    value.forEach((v, i) => found.push(...findInternalKeys(v, `${path}[${i}]`)));
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (!ALLOWED_KEYS.has(key) && FORBIDDEN_KEY.test(key)) found.push(path ? `${path}.${key}` : key);
      found.push(...findInternalKeys(nested, path ? `${path}.${key}` : key));
    }
  }
  return found;
}

export function assertCustomerSafe<T>(value: T): T {
  const leaked = findInternalKeys(value);
  if (leaked.length) throw new InternalDataLeakError(leaked);
  return value;
}

function customerNotes(c: QuoteComposition): string[] {
  const notes = c.pricing.legacy.customerFlags.slice();
  if (c.pricing.status !== "priced") notes.push("This is an estimate. We will confirm the final price once a few details are verified.");
  for (const e of c.pricing.exclusions) if (!notes.includes(e)) notes.push(e);
  return notes;
}

export function toCustomerView(composition: QuoteComposition, meta: { version: number; createdAt: string; packageName?: string }): CustomerQuoteView {
  const view: CustomerQuoteView = {
    version: meta.version,
    ...(meta.packageName ? { packageName: meta.packageName } : {}),
    lines: composition.customerLines.map((l) => ({
      label: l.label,
      ...(l.detail ? { detail: l.detail } : {}),
      amountCents: l.amountCents,
    })),
    subtotalCents: composition.customerLines.reduce((s, l) => s + (l.amountCents ?? 0), 0),
    totalCents: composition.customerTotalCents,
    notes: customerNotes(composition),
    requiresReview: composition.requiresReview,
    createdAt: meta.createdAt,
  };
  return assertCustomerSafe(view);
}
