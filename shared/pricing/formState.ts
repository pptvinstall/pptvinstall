import type { QuoteFormState, TVConfig } from "../../client/src/lib/quote-calculator";
import { calculateQuote } from "../../client/src/lib/quote-calculator";
import { toCents, type Cents } from "./money";
import { buildPackages, type CustomerPackage } from "./packages";
import { parseJobScope, type JobScope } from "./scope";

// Bridges the public QuoteTool's form state to the structured JobScope so packages and the
// Job OS use one definition of "the work". Customer-safe: contains only what the customer typed.

function mapTv(tv: TVConfig): JobScope["tvs"][number] {
  return {
    id: tv.id,
    site: 0,
    sizeBand: tv.size,
    wall: tv.wallType === "highrise" ? "steel" : tv.wallType,
    location: tv.location,
    mountSource: tv.hasMount ? "customer" : "pptv",
    mountType: tv.hasMount ? null : tv.mountType === "tilting" ? "tilt" : tv.mountType === "fullMotion" ? "full_motion" : "fixed",
    wire: "visible",
    power: tv.wireConcealment ? "outlet" : "existing",
    removal: { tvRemoval: tv.unmounting, mountRemoval: false, remount: false },
  };
}

export function formStateToScope(state: QuoteFormState): JobScope {
  const extras: JobScope["extras"] = [];
  if (state.soundbar) extras.push({ kind: "soundbar", qty: 1 });
  if (state.doorbell) extras.push({ kind: "doorbell", qty: 1 });
  if (state.floodlight) extras.push({ kind: "floodlight", qty: 1 });
  if (state.cameras.length) extras.push({ kind: "camera", qty: Math.min(20, state.cameras.length) });
  if (state.handymanMinutes > 0) extras.push({ kind: "specialty", qty: 1 });
  return parseJobScope({ tvs: state.tvs.map(mapTv), extras });
}

function moveAwarePackage(state: QuoteFormState, id: CustomerPackage["id"]): CustomerPackage {
  const next = applyPackageToFormState(state, id);
  const quote = calculateQuote(next);
  const names = { essential: "Essential", clean: "Clean", complete: "Complete" } as const;
  const summaries = {
    essential: "Professional mounting. Cords stay visible.",
    clean: "Mounting plus an outlet behind the TV so cords can run clean.",
    complete: "Clean setup plus a full-motion mount supplied by us where you do not have one.",
  } as const;

  const components: CustomerPackage["components"] = [];
  for (const group of quote.groups) {
    for (const item of group.items) {
      components.push({
        label: group.title.startsWith("TV") ? `${group.title}: ${item.name}` : item.name,
        amountCents: item.lineTotal === 0 ? null : toCents(item.lineTotal),
      });
    }
  }
  if (quote.discount > 0) {
    components.push({ label: "Two-home project bundle", amountCents: -toCents(quote.discount) });
  }

  return {
    id,
    name: names[id],
    summary: summaries[id],
    components,
    totalCents: toCents(quote.total),
    requiresReview: quote.flags.length > 0 || components.some((component) => component.amountCents === null),
  };
}

export function packagesForFormState(state: QuoteFormState): CustomerPackage[] {
  if (!state.moveProject?.enabled) return buildPackages(formStateToScope(state));

  const ids: CustomerPackage["id"][] = ["essential", "clean"];
  if (state.tvs.some((tv) => !tv.hasMount)) ids.push("complete");

  const packages = ids.map((id) => moveAwarePackage(state, id));
  return packages.filter((pkg, index) => index === 0 || pkg.totalCents !== packages[index - 1]!.totalCents);
}

/** Returns a new form state with the package's real components applied. */
export function applyPackageToFormState(state: QuoteFormState, id: CustomerPackage["id"]): QuoteFormState {
  const tvs = state.tvs.map((tv): TVConfig => {
    if (tv.location === "fireplace") return { ...tv, wireConcealment: false };
    const wireConcealment = id !== "essential";
    const next: TVConfig = { ...tv, wireConcealment };
    if (id === "complete" && !tv.hasMount) next.mountType = "fullMotion";
    return next;
  });
  return { ...state, tvs };
}

export function legacyTotalCentsForFormState(state: QuoteFormState): Cents {
  return toCents(calculateQuote(state).total);
}
