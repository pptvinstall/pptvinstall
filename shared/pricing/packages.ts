import { computeLegacyPrice } from "./legacy";
import type { Cents } from "./money";
import type { JobScope } from "./scope";
import { parseJobScope } from "./scope";

// Customer packages. Each package is the SAME scope run through the real catalog with a
// different set of real components. No fabricated strike-through prices, no invented
// "savings": a package total is exactly the sum of its real lines. Packages that would be
// identical to a cheaper one are omitted. Customer-safe by construction (catalog data only).

export interface CustomerPackage {
  id: "essential" | "clean" | "complete";
  name: string;
  summary: string;
  components: Array<{ label: string; amountCents: Cents | null }>;
  totalCents: Cents;
  requiresReview: boolean;
}

function clone(scope: JobScope): JobScope {
  return parseJobScope(JSON.parse(JSON.stringify(scope)));
}

function describe(scope: JobScope, id: CustomerPackage["id"]): CustomerPackage {
  const legacy = computeLegacyPrice(scope);
  const components: CustomerPackage["components"] = [];
  for (const g of legacy.groups) {
    for (const item of g.items) {
      if (item.lineTotalCents > 0) components.push({ label: g.title.startsWith("TV") ? `${g.title}: ${item.name}` : item.name, amountCents: item.lineTotalCents });
    }
  }
  for (const name of legacy.customQuoteItems) components.push({ label: name, amountCents: null });
  const names = { essential: "Essential", clean: "Clean", complete: "Complete" } as const;
  const summaries = {
    essential: "Professional mounting. Cords stay visible.",
    clean: "Mounting plus an outlet behind the TV so cords can run clean.",
    complete: "Clean setup plus a full-motion mount supplied by us where you do not have one.",
  } as const;
  return {
    id,
    name: names[id],
    summary: summaries[id],
    components,
    totalCents: legacy.totalCents,
    requiresReview: legacy.customQuoteItems.length > 0 || legacy.customerFlags.length > 0,
  };
}

export function buildPackages(scopeInput: unknown): CustomerPackage[] {
  const base = parseJobScope(scopeInput);
  if (base.tvs.length === 0) return [];

  const essential = clone(base);
  for (const tv of essential.tvs) {
    tv.power = "existing";
    tv.wire = "visible";
  }

  const clean = clone(essential);
  for (const tv of clean.tvs) {
    if (tv.location !== "fireplace") tv.power = "outlet";
  }

  // "Complete" upgrades any mount we supply to full motion; customer-owned mounts are never touched.
  const complete = clone(clean);
  for (const tv of complete.tvs) {
    if (tv.mountSource === "pptv") tv.mountType = "full_motion";
  }
  const anyPptvMount = complete.tvs.some((tv) => tv.mountSource === "pptv");

  const out: CustomerPackage[] = [describe(essential, "essential")];
  const cleanPkg = describe(clean, "clean");
  if (cleanPkg.totalCents !== out[0]!.totalCents) out.push(cleanPkg);
  if (anyPptvMount) {
    const completePkg = describe(complete, "complete");
    if (completePkg.totalCents !== out[out.length - 1]!.totalCents) out.push(completePkg);
  }
  return out;
}
