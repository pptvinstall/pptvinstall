import { jobScopeSchema } from "../pricing/scope";
import type { ShadowSampleRecord } from "./types";

export const SHADOW_FILTERS = [
  { id: "catalog_below_floor", label: "Catalog below floor" },
  { id: "catalog_below_recommended", label: "Catalog below recommended" },
  { id: "below_target", label: "Owner rate below target" },
  { id: "fireplace", label: "Fireplace" },
  { id: "masonry", label: "Masonry" },
  { id: "electrical", label: "Electrical" },
  { id: "helper", label: "Helper included / required" },
  { id: "multi_tv", label: "Multi-TV" },
  { id: "low_confidence", label: "Low confidence" },
  { id: "review", label: "Review required" },
] as const;
export type ShadowFilter = (typeof SHADOW_FILTERS)[number]["id"];

type Sample = Pick<ShadowSampleRecord, "shownCents" | "floorCents" | "recommendedCents" | "status" | "scope" | "summary">;

/** The stored shown price is a catalog comparison only when that catalog priced the complete scope. */
export function isComparableCatalogSample(sample: Sample): boolean {
  return sample.summary.shownSource === "catalog" && !sample.summary.catalogHasCustomQuoteLines;
}

/** Owner filters read recorded facts. They never re-price a sample or guess facts from customer text. */
export function shadowSampleMatches(sample: Sample, filters: readonly ShadowFilter[], currentTargetPerHourCents: number): boolean {
  const parsed = jobScopeSchema.safeParse(sample.scope);
  const scope = parsed.success ? parsed.data : null;
  const tvs = scope?.tvs ?? [];
  const items = scope?.items ?? [];
  const factors = sample.summary.premiumFactors;
  const comparable = isComparableCatalogSample(sample);
  const masonry = new Set(["brick", "stone", "concrete", "masonry"]);
  const electrical = new Set(["receptacle", "ceiling_fan", "light_fixture", "floodlight_hardwired", "doorbell_chime"]);
  const tvCount = tvs.length + items.filter((item) => item.category === "tv").reduce((sum, item) => sum + item.quantity, 0);
  const match: Record<ShadowFilter, boolean> = {
    catalog_below_floor: comparable && sample.shownCents < sample.floorCents,
    catalog_below_recommended: comparable && sample.shownCents < sample.recommendedCents,
    below_target: comparable && Number.isFinite(currentTargetPerHourCents) && sample.summary.atShown.effectivePerHourCents < currentTargetPerHourCents,
    fireplace: tvs.some((tv) => tv.location === "fireplace") || items.some((item) => item.tv?.location === "fireplace") || factors.includes("Fireplace"),
    masonry: tvs.some((tv) => masonry.has(tv.wall)) || items.some((item) => masonry.has(item.environment.surface)) || factors.includes("Masonry / stone"),
    electrical: tvs.some((tv) => tv.power === "outlet") || items.some((item) => item.tv?.power === "outlet" || electrical.has(item.category)) || factors.includes("Electrical work"),
    // A recorded helper allowance can be recommended or required; the filter says both rather than upgrading it.
    helper: sample.summary.helperMinutes > 0,
    multi_tv: tvCount > 1,
    low_confidence: sample.summary.confidence === "low",
    review: sample.status !== "priced" || sample.summary.questions.length > 0 || sample.summary.catalogHasCustomQuoteLines,
  };
  return filters.every((filter) => match[filter]);
}
