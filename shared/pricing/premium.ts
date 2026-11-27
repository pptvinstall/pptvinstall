import type { EconomicsConfig, PremiumFactor } from "./config";
import type { JobScope } from "./scope";
import type { WorkComputation } from "./workEngine";
import type { WorkStatus } from "./work";

// Complexity / risk premium. Deterministic: each factor is detected from structured scope facts and adds a
// configured margin to the RECOMMENDED price (never the floor). The sum is capped. No AI, no clock.

export interface AppliedPremiumFactor {
  key: PremiumFactor;
  label: string;
  /** The configured premium for this factor (transparency — what it would add if it were not already counted in labor time). */
  pct: number;
  /**
   * The premium actually applied on top of the desired margin. Issue #35 S-7:
   * when the same difficulty is already compensated in labor minutes (a
   * fireplace's location minutes, brick/stone wall minutes, masonry surface
   * minutes), the premium does NOT stack on top of those minutes —
   * appliedPct is 0 and countedInLaborMinutes is true.
   *
   * Owner rule (2026-11-27) for steel studs: the difficulty is only PARTIALLY
   * compensated by minutes, so only the duplicating share is removed —
   * appliedPct = pct × (1 − laborCountedShare) — and the remainder stays
   * applied, pricing specialized hardware, additional labor beyond the
   * minute allowance, and genuine incremental risk.
   */
  appliedPct: number;
  /** True only when the premium is FULLY counted in labor minutes (share = 1, appliedPct = 0). */
  countedInLaborMinutes: boolean;
  /** Share (0..1) of this factor's configured premium already paid through labor minutes. */
  laborCountedShare: number;
  /** Plain-language reason the factor applied. */
  because: string;
}

export interface PremiumResult {
  /** Margin added on top of the desired margin, after de-stacking and the cap. */
  pct: number;
  /** Uncapped sum of the CONFIGURED factor percentages, for transparency. */
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
  const L = cfg.labor;
  const found = new Map<PremiumFactor, string>();
  const hit = (k: PremiumFactor, because: string) => {
    if (!found.has(k)) found.set(k, because);
  };
  // Issue #35 S-7: factors whose difficulty is already paid for (at least in
  // part) in labor minutes. The premium for such a factor is reported
  // (transparency) but the share already covered by the minutes is not
  // charged a second time on top of the minute-based labor.
  const countedInMinutes = new Set<PremiumFactor>();

  scope.tvs.forEach((tv, i) => {
    const n = `TV ${i + 1}`;
    if (tv.location === "fireplace") {
      hit("fireplace", `${n} above a fireplace`);
      if ((L.locationMinutes.fireplace ?? 0) > 0) countedInMinutes.add("fireplace");
    }
    if (tv.location === "high_wall") hit("height", `${n} on a high wall`);
    if (tv.wall === "brick" || tv.wall === "stone") {
      hit("masonry", `${n} on ${tv.wall}`);
      if ((L.wallMinutes[tv.wall] ?? 0) > 0) countedInMinutes.add("masonry");
    }
    if (tv.wall === "steel") {
      hit("steel_studs", `${n} on steel studs`);
      // Steel wall minutes pay the extra hands-on time; per the owner's
      // 2026-11-27 rule only the duplicating share of the premium comes off
      // (config laborCountedShare), the rest prices hardware + risk.
      if ((L.wallMinutes.steel ?? 0) > 0) countedInMinutes.add("steel_studs");
    }
    if (tv.power === "outlet") hit("electrical", `${n} needs an outlet`);
    if ((tv.inches ?? 0) >= 80) hit("heavy_equipment", `${n} is ${tv.inches}"`);
  });

  scope.items.forEach((item, i) => {
    const r = work.items[i];
    const label = r?.label ?? item.category;
    const env = item.environment;
    const surface = env.surface;
    if (surface === "ceiling") hit("ceiling", `${label} on a ceiling`);
    if (surface === "brick" || surface === "stone" || surface === "concrete" || surface === "masonry") {
      hit("masonry", `${label} on ${surface}`);
      if ((W.surfaceMinutes[surface] ?? 0) > 0) countedInMinutes.add("masonry");
    }
    if (surface === "steel_studs") {
      hit("steel_studs", `${label} on steel studs`);
      if ((W.surfaceMinutes.steel_studs ?? 0) > 0) countedInMinutes.add("steel_studs");
    }
    if (env.ladder || (env.heightFt ?? 0) > W.access.ladderHeightFt) hit("height", `${label} needs ladder work`);
    if (env.difficultAccess || env.tightSpace || env.obstructions) hit("difficult_access", `${label} has access constraints`);
    if (item.tv?.location === "fireplace") {
      hit("fireplace", `${label} above a fireplace`);
      if ((L.locationMinutes.fireplace ?? 0) > 0) countedInMinutes.add("fireplace");
    }
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
    if (pct > 0) {
      // Share of this factor's premium already paid through labor minutes:
      // 0 when no minutes compensate it, 1 by default when they do (the
      // original fireplace/masonry full de-stack), or the configured partial
      // share (steel studs: hardware + risk are NOT in the minutes).
      const share = !countedInMinutes.has(key) ? 0 : (R.laborCountedShare[key] ?? 1);
      const appliedPct = Number((pct * (1 - share)).toFixed(4));
      factors.push({ key, label: LABELS[key], pct, appliedPct, countedInLaborMinutes: share >= 1, laborCountedShare: share, because });
    }
  }
  const rawPct = factors.reduce((s, f) => s + f.pct, 0);
  const appliedPctTotal = factors.reduce((s, f) => s + f.appliedPct, 0);
  const pct = R.enabled ? Math.min(R.maxTotalPct, appliedPctTotal) : 0;
  // Complexity describes the JOB, not the charge: it keeps using the raw
  // configured total so a de-stacked job still reads as complex.
  const complexity: PremiumResult["complexity"] =
    args.status === "manual_review_required" || rawPct >= 0.06 || found.size >= 4 ? "complex" : found.size > 0 ? "moderate" : "standard";
  return { pct: Number(pct.toFixed(4)), rawPct: Number(rawPct.toFixed(4)), factors, complexity };
}
