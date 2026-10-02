import type { EconomicsConfig, PremiumFactor } from "./config";
import type { JobScope } from "./scope";
import type { WorkComputation } from "./workEngine";
import type { WorkStatus } from "./work";

// Complexity / risk premium. Deterministic: each factor is detected from structured scope facts and adds a
// configured margin to the RECOMMENDED price (never the floor). The sum is capped. No AI, no clock.

export interface AppliedPremiumFactor {
  key: PremiumFactor;
  label: string;
  pct: number;
  /** Plain-language reason the factor applied. */
  because: string;
}

export interface PremiumResult {
  /** Margin added on top of the desired margin, after the cap. */
  pct: number;
  /** Uncapped sum, for transparency. */
  rawPct: number;
  factors: AppliedPremiumFactor[];
  complexity: "standard" | "moderate" | "complex";
}

const LABELS: Record<PremiumFactor, string> = {
  fireplace: "Fireplace",
  masonry: "Masonry / stone",
  steel_studs: "Steel studs / high-rise",
  height: "Height / ladder work",
  ceiling: "Ceiling attachment",
  helper: "Helper required",
  heavy_equipment: "Heavy or oversized item",
  rush: "Same-day / rush",
  multi_stop: "Multiple addresses",
  confirmation_needed: "Unconfirmed details",
  specialty: "Specialty / custom work",
  electrical: "Electrical work",
  difficult_access: "Difficult access",
};

export function computePremium(args: {
  scope: JobScope;
  work: WorkComputation;
  helperMinutes: number;
  scheduleKeys: string[];
  siteCount: number;
  status: WorkStatus;
  cfg: EconomicsConfig;
}): PremiumResult {
  const { scope, work, cfg } = args;
  const R = cfg.business.riskPremium;
  const W = cfg.work;
  const found = new Map<PremiumFactor, string>();
  const hit = (k: PremiumFactor, because: string) => {
    if (!found.has(k)) found.set(k, because);
  };

  scope.tvs.forEach((tv, i) => {
    const n = `TV ${i + 1}`;
    if (tv.location === "fireplace") hit("fireplace", `${n} above a fireplace`);
    if (tv.location === "high_wall") hit("height", `${n} on a high wall`);
    if (tv.wall === "brick" || tv.wall === "stone") hit("masonry", `${n} on ${tv.wall}`);
    if (tv.wall === "steel") hit("steel_studs", `${n} on steel studs`);
    if (tv.power === "outlet") hit("electrical", `${n} needs an outlet`);
    if ((tv.inches ?? 0) >= 80) hit("heavy_equipment", `${n} is ${tv.inches}"`);
  });

  scope.items.forEach((item, i) => {
    const r = work.items[i];
    const label = r?.label ?? item.category;
    const env = item.environment;
    const surface = env.surface;
    if (surface === "ceiling") hit("ceiling", `${label} on a ceiling`);
    if (surface === "brick" || surface === "stone" || surface === "concrete" || surface === "masonry") hit("masonry", `${label} on ${surface}`);
    if (surface === "steel_studs") hit("steel_studs", `${label} on steel studs`);
    if (env.ladder || (env.heightFt ?? 0) > W.access.ladderHeightFt) hit("height", `${label} needs ladder work`);
    if (env.difficultAccess || env.tightSpace || env.obstructions) hit("difficult_access", `${label} has access constraints`);
    if (item.tv?.location === "fireplace") hit("fireplace", `${label} above a fireplace`);
    if (item.tv?.power === "outlet") hit("electrical", `${label} needs an outlet`);
    if (r?.bandKey === "two_person" || r?.bandKey === "oversized") hit("heavy_equipment", `${label} is ${r.bandLabel.toLowerCase()}`);
    const category = W.categories[item.category];
    if (!category || item.category === "custom") hit("specialty", `${label} is a custom item`);
    for (const f of category?.premiumFactors ?? []) hit(f, `${label} (${category!.label})`);
  });

  if (scope.extras.some((e) => e.kind === "custom" || e.kind === "specialty" || e.kind === "av")) hit("specialty", "specialty / custom extras");
  if (scope.access.level === "difficult") hit("difficult_access", "difficult access");
  if (scope.access.ladderHeight) hit("height", "ladder / height work");
  if (args.helperMinutes > 0) hit("helper", "a helper is needed");
  if (args.scheduleKeys.includes("same_day")) hit("rush", "same-day request");
  if (args.siteCount > 1) hit("multi_stop", `${args.siteCount} addresses`);
  if (args.status === "estimate_with_confirmation" || args.status === "manual_review_required") hit("confirmation_needed", "details still need confirmation");

  const factors: AppliedPremiumFactor[] = [];
  for (const [key, because] of Array.from(found.entries())) {
    const pct = R.enabled ? R.factors[key] : 0;
    if (pct > 0) factors.push({ key, label: LABELS[key], pct, because });
  }
  const rawPct = factors.reduce((s, f) => s + f.pct, 0);
  const pct = R.enabled ? Math.min(R.maxTotalPct, rawPct) : 0;
  const complexity: PremiumResult["complexity"] =
    args.status === "manual_review_required" || pct >= 0.06 || found.size >= 4 ? "complex" : found.size > 0 ? "moderate" : "standard";
  return { pct: Number(pct.toFixed(4)), rawPct: Number(rawPct.toFixed(4)), factors, complexity };
}
