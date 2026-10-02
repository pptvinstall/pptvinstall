import { z } from "zod";
import type { EconomicsConfig } from "../pricing/config";
import { safeCents, type Cents } from "../pricing/money";
import { helperCostAt } from "../pricing/engine";
import type { QuoteSnapshot } from "../pricing/quote";

// Job actuals: what really happened. Captured after the work; never rewrites the quote
// version it is compared against. Everything derived here is an ESTIMATE (it uses
// configured fuel/vehicle/labor assumptions) and is labelled as such.

export const UNEXPECTED_CONDITIONS = [
  "hidden_wiring",
  "wall_surprise",
  "access_issue",
  "extra_scope",
  "customer_not_ready",
  "mount_incompatible",
  "heavier_than_expected",
  "missing_parts",
  "missing_hardware",
  "surface_surprise",
  "structure_concern",
  "other",
] as const;
export const PAYMENT_METHODS = ["cash", "zelle", "venmo", "apple_pay", "card", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const iso = z.string().datetime({ offset: true });
const minutes = z.number().min(0).max(1_440);

export const jobActualsInputSchema = z
  .object({
    startedAt: iso.optional(),
    finishedAt: iso.optional(),
    laborMinutes: minutes,
    helperMinutes: minutes.default(0),
    /** What the helper was actually paid. When absent, the configured helper rule is applied to the actuals. */
    helperPaidCents: z.number().int().min(0).max(5_000_000).optional(),
    travelMinutes: minutes.default(0),
    /** Round-trip miles actually driven. */
    mileage: z.number().min(0).max(1_000).default(0),
    actualMaterialsCents: z.number().int().min(0).max(5_000_000).default(0),
    otherSpendCents: z.number().int().min(0).max(5_000_000).default(0),
    unexpectedConditions: z.array(z.enum(UNEXPECTED_CONDITIONS)).max(10).default([]),
    /** Scope additions/removals/changes discovered on site. kind and itemId are optional context for intelligence. */
    scopeChanges: z
      .array(
        z.object({
          description: z.string().min(1).max(200),
          amountDeltaCents: z.number().int().min(-5_000_000).max(5_000_000),
          kind: z.enum(["added", "removed", "changed"]).optional(),
          itemId: z.string().max(64).optional(),
        }),
      )
      .max(20)
      .default([]),
    /** Per work item actuals (any action/category). Optional: job totals above remain the source of truth. */
    items: z
      .array(
        z.object({
          itemId: z.string().min(1).max(64),
          actualMinutes: minutes.optional(),
          helperMinutes: minutes.optional(),
          actualMaterialsCents: z.number().int().min(0).max(5_000_000).optional(),
          note: z.string().max(200).optional(),
        }),
      )
      .max(60)
      .default([]),
    collectedCents: z.number().int().min(0).max(10_000_000).default(0),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    tipCents: z.number().int().min(0).max(1_000_000).default(0),
    notes: z.string().max(2_000).optional(),
  })
  .superRefine((a, ctx) => {
    if (a.startedAt && a.finishedAt && Date.parse(a.finishedAt) < Date.parse(a.startedAt)) {
      ctx.addIssue({ code: "custom", path: ["finishedAt"], message: "finishedAt must not be before startedAt" });
    }
    if (a.collectedCents > 0 && !a.paymentMethod) {
      ctx.addIssue({ code: "custom", path: ["paymentMethod"], message: "paymentMethod is required when an amount was collected" });
    }
  });

export type JobActualsInput = z.infer<typeof jobActualsInputSchema>;

export interface Variance {
  estimate: number;
  actual: number;
  delta: number;
  /** actual / estimate; null when the estimate is zero. */
  ratio: number | null;
}

export interface Profitability {
  estimate: true;
  note: string;
  quotedCents: Cents;
  collectedCents: Cents;
  tipCents: Cents;
  /** Quoted minus collected (positive = collected less than quoted). */
  quotedVsCollectedCents: number;
  actualOutOfPocketCents: Cents;
  actualOwnerMinutes: number;
  /** Collected minus out-of-pocket costs. Tips excluded. */
  estimatedGrossProfitCents: number;
  estimatedGrossMarginPct: number;
  effectiveGrossPerHourCents: Cents;
  /** Profit after valuing owner time at the configured rate. */
  estimatedNetAfterOwnerTimeCents: number;
  estimatedNetMarginPct: number;
  variances: {
    laborMinutes: Variance;
    travelMinutes: Variance;
    miles: Variance;
    materialsCents: Variance;
    priceVsCollectedCents: Variance;
    /** Helper pay: estimate at the quoted price vs actual (paid, or the configured rule applied to actuals). */
    helperCents: Variance;
    outOfPocketCents: Variance;
    /** Margin after valuing owner time: estimate at quote vs actual. */
    netMarginPct: Variance;
    /** Owner net per hour of owner time: estimate at quote vs actual. */
    effectivePerHourCents: Variance;
  };
  /** Actual helper cost used above, and how it was determined. */
  helperCostCents: Cents;
  helperBasis: "paid" | "labor_revenue_share" | "hourly" | "none";
  /** Estimate vs actual per work item (only items with a recorded actual). Empty for TV-only jobs. */
  items: Array<{ itemId: string; label: string; quantity: number; estimateMinutes: number; actualMinutes: number; deltaMinutes: number; ratio: number | null; estimateMaterialsCents: number; actualMaterialsCents: number | null }>;
}

function variance(estimate: number, actual: number): Variance {
  return { estimate, actual, delta: actual - estimate, ratio: estimate > 0 ? actual / estimate : null };
}

export function computeProfitability(args: { snapshot: QuoteSnapshot; customerQuotedCents: Cents; actuals: JobActualsInput; config: EconomicsConfig }): Profitability {
  const { snapshot, actuals, config } = args;
  const est = snapshot.composition.pricing;
  const T = config.travel;

  const fuel = safeCents((actuals.mileage / T.mpg) * T.fuelPricePerGalCents);
  const vehicle = safeCents(actuals.mileage * T.vehicleCostPerMileCents);
  // Helper: what was paid if recorded; otherwise the configured rule applied to what actually happened.
  const HC = config.labor.helperCompensation;
  const passThrough = est.helperPay?.passThroughCents ?? est.materials.chargeCents;
  const helperBasis: Profitability["helperBasis"] =
    actuals.helperPaidCents !== undefined ? "paid" : actuals.helperMinutes <= 0 ? "none" : HC.mode === "labor_revenue_share" ? "labor_revenue_share" : "hourly";
  const helper =
    helperBasis === "paid"
      ? actuals.helperPaidCents!
      : helperBasis === "labor_revenue_share"
        ? safeCents(HC.laborRevenueSharePct * Math.max(0, actuals.collectedCents - passThrough))
        : helperBasis === "hourly"
          ? safeCents((actuals.helperMinutes / 60) * config.labor.helperPerHourCents)
          : 0;
  // Estimates at the quoted price (older snapshots predate revenue-share helpers: fall back to their stored figures).
  const quoted = args.customerQuotedCents;
  const estHelper = est.helperPay ? helperCostAt(est.helperPay, quoted) : est.labor.helperCostCents;
  const estOutOfPocket = est.outOfPocketExHelperCents !== undefined ? est.outOfPocketExHelperCents + estHelper : est.outOfPocketCents;
  const estEconomics = snapshot.composition.economics;
  // Overhead is not measured per job: the same per-job allocation as the estimate keeps the comparison like-for-like.
  const overheadAllocation = est.overheadCents ?? 0;
  const outOfPocket = actuals.actualMaterialsCents + actuals.otherSpendCents + fuel + vehicle + helper + overheadAllocation;
  const ownerMinutes = actuals.laborMinutes + actuals.travelMinutes;
  const ownerHours = ownerMinutes / 60;

  const gross = actuals.collectedCents - outOfPocket;
  const net = gross - safeCents(ownerHours * config.labor.targetLaborPerHourCents);
  const pct = (n: number) => (actuals.collectedCents > 0 ? n / actuals.collectedCents : 0);

  const itemVariances: Profitability["items"] = [];
  for (const a of actuals.items) {
    const e = est.work?.items.find((i) => i.itemId === a.itemId);
    if (!e || a.actualMinutes === undefined) continue;
    itemVariances.push({
      itemId: a.itemId,
      label: e.customerText,
      quantity: e.quantity,
      estimateMinutes: e.minutes,
      actualMinutes: a.actualMinutes,
      deltaMinutes: a.actualMinutes - e.minutes,
      ratio: e.minutes > 0 ? a.actualMinutes / e.minutes : null,
      estimateMaterialsCents: e.materialsCostCents,
      actualMaterialsCents: a.actualMaterialsCents ?? null,
    });
  }

  return {
    estimate: true,
    note: "Estimates only: fuel, vehicle, overhead allocation and owner-time values come from the configured assumptions, not receipts.",
    quotedCents: args.customerQuotedCents,
    collectedCents: actuals.collectedCents,
    tipCents: actuals.tipCents,
    quotedVsCollectedCents: args.customerQuotedCents - actuals.collectedCents,
    actualOutOfPocketCents: outOfPocket,
    actualOwnerMinutes: ownerMinutes,
    estimatedGrossProfitCents: gross,
    estimatedGrossMarginPct: pct(gross),
    effectiveGrossPerHourCents: ownerHours > 0 ? safeCents(gross / ownerHours) : 0,
    estimatedNetAfterOwnerTimeCents: net,
    estimatedNetMarginPct: pct(net),
    variances: {
      laborMinutes: variance(est.labor.minutes, actuals.laborMinutes),
      travelMinutes: variance(est.travel.roundTripDriveMinutes, actuals.travelMinutes),
      miles: variance(est.travel.roundTripMiles, actuals.mileage),
      materialsCents: variance(est.materials.costCents, actuals.actualMaterialsCents),
      priceVsCollectedCents: variance(args.customerQuotedCents, actuals.collectedCents),
      helperCents: variance(estHelper, helper),
      outOfPocketCents: variance(estOutOfPocket, outOfPocket),
      netMarginPct: variance(Number((estEconomics?.marginPct ?? 0).toFixed(4)), Number(pct(net).toFixed(4))),
      effectivePerHourCents: variance(estEconomics?.effectiveGrossPerHourCents ?? 0, ownerHours > 0 ? safeCents(gross / ownerHours) : 0),
    },
    helperCostCents: helper,
    helperBasis,
    items: itemVariances,
  };
}
