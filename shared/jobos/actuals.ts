import { z } from "zod";
import type { EconomicsConfig } from "../pricing/config";
import { safeCents, type Cents } from "../pricing/money";
import type { QuoteSnapshot } from "../pricing/quote";

// Job actuals: what really happened. Captured after the work; never rewrites the quote
// version it is compared against. Everything derived here is an ESTIMATE (it uses
// configured fuel/vehicle/labor assumptions) and is labelled as such.

export const UNEXPECTED_CONDITIONS = ["hidden_wiring", "wall_surprise", "access_issue", "extra_scope", "customer_not_ready", "mount_incompatible", "other"] as const;
export const PAYMENT_METHODS = ["cash", "zelle", "venmo", "apple_pay", "other"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

const iso = z.string().datetime({ offset: true });
const minutes = z.number().min(0).max(1_440);

export const jobActualsInputSchema = z
  .object({
    startedAt: iso.optional(),
    finishedAt: iso.optional(),
    laborMinutes: minutes,
    helperMinutes: minutes.default(0),
    travelMinutes: minutes.default(0),
    /** Round-trip miles actually driven. */
    mileage: z.number().min(0).max(1_000).default(0),
    actualMaterialsCents: z.number().int().min(0).max(5_000_000).default(0),
    otherSpendCents: z.number().int().min(0).max(5_000_000).default(0),
    unexpectedConditions: z.array(z.enum(UNEXPECTED_CONDITIONS)).max(10).default([]),
    scopeChanges: z
      .array(z.object({ description: z.string().min(1).max(200), amountDeltaCents: z.number().int().min(-5_000_000).max(5_000_000) }))
      .max(20)
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
  };
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
  const helper = safeCents((actuals.helperMinutes / 60) * config.labor.helperPerHourCents);
  const outOfPocket = actuals.actualMaterialsCents + actuals.otherSpendCents + fuel + vehicle + helper;
  const ownerMinutes = actuals.laborMinutes + actuals.travelMinutes;
  const ownerHours = ownerMinutes / 60;

  const gross = actuals.collectedCents - outOfPocket;
  const net = gross - safeCents(ownerHours * config.labor.targetLaborPerHourCents);
  const pct = (n: number) => (actuals.collectedCents > 0 ? n / actuals.collectedCents : 0);

  return {
    estimate: true,
    note: "Estimates only: fuel, vehicle and owner-time values come from the configured assumptions, not receipts.",
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
    },
  };
}
