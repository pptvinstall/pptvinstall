import type { JobScope } from "../pricing/scope";

// Pricing intelligence: transparent statistics over completed jobs. No machine learning,
// no hidden weights. Every number is a median/percentile/ratio the owner can recompute.
// Output is ADVISORY: nothing here changes a customer price or the live config.

export const MIN_SAMPLE = 5;

export interface CompletedJobRecord {
  jobId: string;
  /** True for seed/test fixtures. Synthetic rows are excluded from suggestions unless explicitly included. */
  synthetic: boolean;
  signature: ScopeSignature;
  estimateLaborMinutes: number;
  actualLaborMinutes: number;
  estimateTravelMinutes: number;
  actualTravelMinutes: number;
  estimateMaterialsCents: number;
  actualMaterialsCents: number;
  quotedCents: number;
  collectedCents: number;
  costToServeCents: number;
  actualOutOfPocketCents: number;
  actualOwnerMinutes: number;
}

export interface ScopeSignature {
  tvCount: number;
  walls: string[];
  locations: string[];
  mountSources: string[];
  outlets: number;
  extras: string[];
  difficultAccess: boolean;
  /** Universal work items as "action:category" (empty for TV-only jobs and for older records). */
  workKinds?: string[];
}

export function scopeSignature(scope: JobScope): ScopeSignature {
  return {
    tvCount: scope.tvs.length,
    walls: scope.tvs.map((t) => t.wall).sort(),
    locations: scope.tvs.map((t) => t.location).sort(),
    mountSources: scope.tvs.map((t) => t.mountSource).sort(),
    outlets: scope.tvs.filter((t) => t.power === "outlet").length,
    extras: scope.extras.map((e) => e.kind).sort(),
    difficultAccess: scope.access.level === "difficult",
    workKinds: scope.items.map((i) => `${i.thenAction ? `${i.action}+${i.thenAction}` : i.action}:${i.category}`).sort(),
  };
}

export interface Stats {
  n: number;
  min: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  p90: number | null;
  max: number | null;
}

export function percentile(sorted: number[], p: number): number | null {
  if (!sorted.length) return null;
  if (sorted.length === 1) return sorted[0]!;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (idx - lo);
}

export function summarize(values: number[]): Stats {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  return { n: v.length, min: v[0] ?? null, p25: percentile(v, 0.25), median: percentile(v, 0.5), p75: percentile(v, 0.75), p90: percentile(v, 0.9), max: v[v.length - 1] ?? null };
}

function ratios(rows: CompletedJobRecord[], est: (r: CompletedJobRecord) => number, act: (r: CompletedJobRecord) => number): number[] {
  return rows.filter((r) => est(r) > 0).map((r) => act(r) / est(r));
}

export interface CalibrationSuggestion {
  metric: "laborMinutes" | "travelMinutes" | "materialsCents" | "ownerHourly";
  sampleSize: number;
  medianActualOverEstimate: number;
  message: string;
  /** Always false: suggestions are never auto-applied. */
  applied: false;
}

export interface IntelligenceReport {
  sampleSize: number;
  syntheticExcluded: number;
  sufficientData: boolean;
  minimumSample: number;
  ratios: { laborMinutes: Stats; travelMinutes: Stats; materialsCents: Stats; collectedOverQuoted: Stats };
  effectiveGrossPerHourCents: Stats;
  suggestions: CalibrationSuggestion[];
  note: string;
}

export function buildIntelligence(records: CompletedJobRecord[], opts: { includeSynthetic?: boolean; targetOwnerHourlyCents?: number } = {}): IntelligenceReport {
  const rows = opts.includeSynthetic ? records : records.filter((r) => !r.synthetic);
  const sufficient = rows.length >= MIN_SAMPLE;
  const labor = ratios(rows, (r) => r.estimateLaborMinutes, (r) => r.actualLaborMinutes);
  const travel = ratios(rows, (r) => r.estimateTravelMinutes, (r) => r.actualTravelMinutes);
  const materials = ratios(rows, (r) => r.estimateMaterialsCents, (r) => r.actualMaterialsCents);
  const collected = ratios(rows, (r) => r.quotedCents, (r) => r.collectedCents);
  const hourly = rows.filter((r) => r.actualOwnerMinutes > 0).map((r) => ((r.collectedCents - r.actualOutOfPocketCents) / (r.actualOwnerMinutes / 60)));

  const suggestions: CalibrationSuggestion[] = [];
  if (sufficient) {
    const add = (metric: CalibrationSuggestion["metric"], values: number[], label: string) => {
      const med = percentile([...values].sort((a, b) => a - b), 0.5);
      if (med !== null && values.length >= MIN_SAMPLE && Math.abs(med - 1) >= 0.1) {
        suggestions.push({
          metric,
          sampleSize: values.length,
          medianActualOverEstimate: Number(med.toFixed(3)),
          message: `Across ${values.length} jobs, actual ${label} is a median ${(med * 100).toFixed(0)}% of the estimate. Review the configured ${label} assumptions; nothing has been changed.`,
          applied: false,
        });
      }
    };
    add("laborMinutes", labor, "labor minutes");
    add("travelMinutes", travel, "travel minutes");
    add("materialsCents", materials, "material cost");
    // Learning loop on the owner's own number: are completed jobs actually paying the labor value they are priced at?
    const target = opts.targetOwnerHourlyCents;
    const medHourly = percentile([...hourly].sort((a, b) => a - b), 0.5);
    if (target && medHourly !== null && hourly.length >= MIN_SAMPLE && medHourly < target * 0.9) {
      suggestions.push({
        metric: "ownerHourly",
        sampleSize: hourly.length,
        medianActualOverEstimate: Number((medHourly / target).toFixed(3)),
        message: `Across ${hourly.length} jobs you netted a median $${(medHourly / 100).toFixed(0)}/hr of your time (labor + driving) against a $${(target / 100).toFixed(0)}/hr labor value. Compare the catalog with the engine recommendation in shadow mode; nothing has been changed.`,
        applied: false,
      });
    }
  }

  return {
    sampleSize: rows.length,
    syntheticExcluded: records.length - rows.length,
    sufficientData: sufficient,
    minimumSample: MIN_SAMPLE,
    ratios: { laborMinutes: summarize(labor), travelMinutes: summarize(travel), materialsCents: summarize(materials), collectedOverQuoted: summarize(collected) },
    effectiveGrossPerHourCents: summarize(hourly),
    suggestions,
    note: sufficient
      ? "Advisory only. Prices and configuration are never changed automatically."
      : `Not enough completed jobs yet (need ${MIN_SAMPLE}); no suggestions are produced from thin data.`,
  };
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 1;
  let inter = 0;
  A.forEach((x) => {
    if (B.has(x)) inter += 1;
  });
  return inter / (A.size + B.size - inter);
}

/** Similarity in [0,1]. Transparent weights so the owner can see why a job is "comparable". */
export function signatureSimilarity(a: ScopeSignature, b: ScopeSignature): number {
  const countScore = 1 - Math.min(1, Math.abs(a.tvCount - b.tvCount) / Math.max(1, Math.max(a.tvCount, b.tvCount)));
  const base =
    0.3 * countScore +
    0.2 * jaccard(a.walls, b.walls) +
    0.15 * jaccard(a.locations, b.locations) +
    0.1 * jaccard(a.mountSources, b.mountSources) +
    0.1 * (a.outlets === b.outlets ? 1 : 0) +
    0.1 * jaccard(a.extras, b.extras) +
    0.05 * (a.difficultAccess === b.difficultAccess ? 1 : 0);
  const wa = a.workKinds ?? [];
  const wb = b.workKinds ?? [];
  // Jobs with work items are compared on what the work IS; TV-only comparisons are unchanged.
  return wa.length || wb.length ? 0.6 * base + 0.4 * jaccard(wa, wb) : base;
}

export function findComparableJobs(target: ScopeSignature, records: CompletedJobRecord[], limit = 5, opts: { includeSynthetic?: boolean } = {}) {
  return records
    .filter((r) => opts.includeSynthetic || !r.synthetic)
    .map((r) => ({ record: r, similarity: Number(signatureSimilarity(target, r.signature).toFixed(3)) }))
    .sort((x, y) => y.similarity - x.similarity || x.record.jobId.localeCompare(y.record.jobId))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------------------------
// Per-item intelligence for the universal work model. Learns by action, category, template,
// size/weight band, surface and complexity instead of TV-only fields. Same rules as above:
// transparent medians, minimum sample, synthetic excluded by default, advisory only.

import type { WorkItem } from "../pricing/work";

export type ItemComplexity = "simple" | "moderate" | "complex";

/** Simple, explainable complexity score: count of access/handling difficulties on the item. */
export function itemComplexity(item: WorkItem): ItemComplexity {
  const e = item.environment;
  let n = 0;
  for (const flag of [e.ladder, e.stairs, e.tightSpace, e.furnitureMovement, e.obstructions, e.difficultAccess]) if (flag) n += 1;
  if (item.helper !== "none" || item.assembly?.twoPerson) n += 1;
  if (item.disposal.length) n += 1;
  if (item.restoration === "minor_patch") n += 1;
  if (item.relocation !== "none") n += 1;
  return n === 0 ? "simple" : n <= 2 ? "moderate" : "complex";
}

export interface CompletedItemRecord {
  jobId: string;
  itemId: string;
  synthetic: boolean;
  action: string;
  thenAction: string | null;
  category: string;
  templateId: string | null;
  band: string | null;
  surface: string;
  complexity: ItemComplexity;
  quantity: number;
  estimateMinutes: number;
  actualMinutes: number;
}

export const ITEM_DIMENSIONS = ["action", "category", "template", "band", "surface", "complexity"] as const;
export type ItemDimension = (typeof ITEM_DIMENSIONS)[number];

export interface ItemGroupStat {
  dimension: ItemDimension;
  value: string;
  n: number;
  /** actual / estimate per record. */
  ratio: Stats;
  /** Actual minutes per unit. */
  actualMinutesPerUnit: Stats;
  sufficient: boolean;
  /** Advisory text only when the sample is large enough and the miss is >= 10%. Never applied. */
  suggestion: string | null;
}

export interface ItemIntelligenceReport {
  sampleSize: number;
  syntheticExcluded: number;
  minimumSample: number;
  groups: ItemGroupStat[];
  note: string;
}

const dimValue = (r: CompletedItemRecord, d: ItemDimension): string =>
  d === "action" ? (r.thenAction ? `${r.action}+${r.thenAction}` : r.action) : d === "category" ? r.category : d === "template" ? r.templateId ?? "(no template)" : d === "band" ? r.band ?? "unknown" : d === "surface" ? r.surface : r.complexity;

export function buildItemIntelligence(records: CompletedItemRecord[], opts: { includeSynthetic?: boolean } = {}): ItemIntelligenceReport {
  const rows = (opts.includeSynthetic ? records : records.filter((r) => !r.synthetic)).filter((r) => r.estimateMinutes > 0 && Number.isFinite(r.actualMinutes));
  const groups: ItemGroupStat[] = [];
  for (const d of ITEM_DIMENSIONS) {
    const byValue = new Map<string, CompletedItemRecord[]>();
    for (const r of rows) {
      const v = dimValue(r, d);
      byValue.set(v, [...(byValue.get(v) ?? []), r]);
    }
    for (const [value, rs] of Array.from(byValue.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      const ratio = summarize(rs.map((r) => r.actualMinutes / r.estimateMinutes));
      const sufficient = rs.length >= MIN_SAMPLE;
      const med = ratio.median;
      groups.push({
        dimension: d,
        value,
        n: rs.length,
        ratio,
        actualMinutesPerUnit: summarize(rs.map((r) => r.actualMinutes / Math.max(1, r.quantity))),
        sufficient,
        suggestion:
          sufficient && med !== null && Math.abs(med - 1) >= 0.1
            ? `Across ${rs.length} items (${d}: ${value}), actual time is a median ${(med * 100).toFixed(0)}% of the estimate. Review the configured minutes; nothing has been changed.`
            : null,
      });
    }
  }
  return {
    sampleSize: rows.length,
    syntheticExcluded: records.length - (opts.includeSynthetic ? records.length : records.filter((r) => !r.synthetic).length),
    minimumSample: MIN_SAMPLE,
    groups,
    note: rows.length >= MIN_SAMPLE ? "Advisory only. Prices and configuration are never changed automatically." : `Not enough completed items yet (need ${MIN_SAMPLE} per group); no suggestions from thin data.`,
  };
}
