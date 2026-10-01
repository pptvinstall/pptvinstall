import { calculateQuote, type QuoteFormState, type TVConfig, type CameraConfig } from "../../client/src/lib/quote-calculator";
import { pricingData } from "../../client/src/data/pricing-data";
import type { JobScope, TvScope } from "./scope";
import { toCents, type Cents } from "./money";

// Adapter from the structured scope to the CURRENT customer-facing catalog.
// This keeps today's prices authoritative: V2 never changes them, it only reads them
// so the owner can compare "what we charge today" with "what the economics say".

export interface LegacyPrice {
  /** Today's catalog total for the priced portion of the scope. */
  totalCents: Cents;
  /** Customer-safe line items as the existing calculator would show them. */
  groups: Array<{ title: string; subtitle?: string; items: Array<{ name: string; lineTotalCents: Cents }> }>;
  /** Items the catalog cannot price (custom quote). Not included in totalCents. */
  customQuoteItems: string[];
  /** Customer-safe notes from the catalog calculator. */
  customerFlags: string[];
  /** Internal-only notes about how the scope was mapped onto the catalog. */
  mappingNotes: string[];
}

function mapTv(tv: TvScope, notes: string[], index: number): TVConfig {
  const n = index + 1;
  if (tv.wall === "unknown") notes.push(`TV ${n}: wall unknown, legacy price assumes drywall.`);
  if (tv.location === "high_wall") notes.push(`TV ${n}: high wall has no catalog price; legacy treats it as a standard wall.`);
  if (tv.wire === "in_wall" && tv.power !== "outlet") notes.push(`TV ${n}: in-wall low-voltage only has no catalog price.`);
  if (tv.wire === "raceway") notes.push(`TV ${n}: raceway has no catalog price.`);
  return {
    id: tv.id,
    size: tv.sizeBand,
    wallType: tv.wall === "brick" || tv.wall === "stone" ? "brick" : tv.wall === "steel" ? "highrise" : "drywall",
    location: tv.location === "fireplace" ? "fireplace" : "standard",
    hasMount: tv.mountSource === "customer",
    mountType: tv.mountSource === "pptv" ? (tv.mountType === "tilt" ? "tilting" : tv.mountType === "full_motion" ? "fullMotion" : "fixed") : null,
    wireConcealment: tv.power === "outlet",
    outletDistance: null,
    unmounting: tv.removal.tvRemoval || tv.removal.mountRemoval,
  };
}

export function scopeToLegacyState(scope: JobScope, notes: string[] = []): QuoteFormState {
  const cameras: CameraConfig[] = [];
  let doorbell = false;
  let soundbar = false;
  let floodlight = false;
  let handymanMinutes = 0;
  for (const extra of scope.extras) {
    if (extra.kind === "camera") for (let i = 0; i < extra.qty; i++) cameras.push({ id: `cam-${cameras.length + 1}`, brand: "other", type: "wireless_smart", location: "outdoor" });
    else if (extra.kind === "doorbell") doorbell = true;
    else if (extra.kind === "soundbar") soundbar = true;
    else if (extra.kind === "floodlight") floodlight = true;
    else if (extra.kind === "av" || extra.kind === "specialty") handymanMinutes += 60;
    else notes.push(`${extra.label ?? extra.kind}: no catalog price (custom quote).`);
  }
  return {
    tvs: scope.tvs.map((tv, i) => mapTv(tv, notes, i)),
    cameras,
    doorbell,
    doorbellBrand: "",
    soundbar,
    surroundSound: false,
    floodlight,
    handymanMinutes,
    zipCode: "",
    notes: "",
  };
}

export function computeLegacyPrice(scope: JobScope): LegacyPrice {
  const mappingNotes: string[] = [];
  const state = scopeToLegacyState(scope, mappingNotes);
  const quote = calculateQuote(state);

  let totalCents = toCents(quote.total);
  const groups = quote.groups.map((g) => ({
    title: g.title,
    subtitle: g.subtitle,
    items: g.items.map((i) => ({ name: i.name, lineTotalCents: toCents(i.lineTotal) })),
  }));

  // Remount is in the catalog but not in the quote calculator; add it so the legacy figure is complete.
  scope.tvs.forEach((tv, index) => {
    if (tv.removal.remount) {
      const cents = toCents(pricingData.tvMounting.remount.price);
      totalCents += cents;
      const group = groups[index];
      if (group) group.items.push({ name: pricingData.tvMounting.remount.name, lineTotalCents: cents });
    }
  });

  // Catalog "custom quote" items are the zero-priced shared lines.
  const customQuoteItems: string[] = [];
  for (const g of quote.groups) {
    for (const item of g.items) {
      if (item.lineTotal === 0 && /custom quote|scope review|assessment required/i.test(item.name)) customQuoteItems.push(item.name);
    }
  }
  for (const extra of scope.extras) {
    if (["shelf", "artwork", "custom"].includes(extra.kind)) customQuoteItems.push(`${extra.label ?? extra.kind} — custom quote`);
  }

  return { totalCents, groups, customQuoteItems, customerFlags: quote.flags, mappingNotes };
}
