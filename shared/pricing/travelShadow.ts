import { getTravelContext, type TravelTier } from "../../client/src/lib/travel-pricing";
import type { EconomicsConfig } from "./config";
import type { Cents } from "./money";
import type { JobContext } from "./scope";
import { computeTravel, type TravelBreakdown } from "./travel";

// Issue #35 S-6 — SHADOW ONLY unified route-based travel pricing.
//
// Today two travel models coexist and diverge:
//   - the browser quote tool charges a ZIP-tier fuel fee from a static table
//     (client/src/lib/travel-pricing.ts; origin even differs weekday/weekend);
//   - the pricing engine computes a full route cost (fuel + vehicle + owner
//     time) but charges the customer nothing (travel.customerFeePolicy "none").
//
// This module computes, for the same job, what ONE unified route-based model
// WOULD charge, alongside what the browser charges today. It changes NO
// customer-facing price: nothing here is wired into a response path. It exists
// so the owner can compare the models on real routes and decide whether to
// activate the unified model (see docs/issue-35-travel-pricing-proposal.md).

/** PROPOSED candidate parameters — owner decision required before any activation. */
export const SHADOW_TRAVEL_CANDIDATE = {
  /** Round-trip miles included before any travel fee applies. */
  freeRoundTripMiles: 30,
  /** Candidate fee per round-trip mile beyond the free miles. */
  perRoundTripMileCents: 50,
  /** Extra free miles per job already routed near the same ZIP that day (shared trip). */
  efficiencyFreeMilesPerNearbyJob: 20,
  efficiencyFreeMilesCap: 40,
} as const;

export interface RouteTravelShadow {
  zip: string;
  /** What the browser ZIP-tier model charges today; null when the ZIP is out of the table (fee "confirmed from the route" — effectively unpriced). */
  browserFeeCents: Cents | null;
  browserTier: TravelTier;
  /** The engine's full internal route cost for the actual route (fuel + vehicle + owner time). */
  routeCostCents: Cents;
  route: TravelBreakdown;
  /** What the unified candidate model would charge the customer for travel. */
  wouldChargeCents: Cents;
  /** wouldCharge − browserFee when both are known. */
  deltaCents: Cents | null;
  sameDayNearbyJobs: number;
  freeRoundTripMilesApplied: number;
  /** Guardrail signal: the route's internal cost exceeds the whole job total (owner economics, never a customer price input). */
  travelCostExceedsJobTotal: boolean | null;
  notes: string[];
}

export function shadowRouteTravel(args: {
  zip: string;
  /** Resolved route facts for the job (miles/minutes from the shop base in Decatur, GA). */
  context: JobContext;
  cfg: EconomicsConfig;
  /** Jobs already routed near this ZIP on the appointment day (scheduling efficiency). */
  sameDayNearbyJobs?: number;
  /** Job total in cents, only for the profitability guardrail signal. Never a price input. */
  jobTotalCents?: number;
  candidate?: Partial<typeof SHADOW_TRAVEL_CANDIDATE>;
}): RouteTravelShadow {
  const candidate = { ...SHADOW_TRAVEL_CANDIDATE, ...(args.candidate ?? {}) };
  const browser = getTravelContext(args.zip);
  const browserFeeCents = typeof browser.fee === "number" ? browser.fee * 100 : null;

  const nearby = Math.max(0, Math.trunc(args.sameDayNearbyJobs ?? 0));
  const freeMiles = candidate.freeRoundTripMiles + Math.min(candidate.efficiencyFreeMilesCap, nearby * candidate.efficiencyFreeMilesPerNearbyJob);

  // The unified model = the engine's existing route cost model with the
  // candidate customer-fee policy applied. The active config is NOT mutated:
  // its customerFeePolicy stays exactly as configured (currently "none").
  const shadowCfg: EconomicsConfig = {
    ...args.cfg,
    travel: {
      ...args.cfg.travel,
      customerFeePolicy: "per_round_trip_mile",
      customerFeePerRoundTripMileCents: candidate.perRoundTripMileCents,
      customerFeeFreeRoundTripMiles: freeMiles,
    },
  };
  const route = computeTravel(args.context, shadowCfg);

  const notes: string[] = [
    "Shadow calculation only — no customer-facing price changes.",
    `Unified model inputs: ${route.roundTripMiles} mi / ${route.roundTripDriveMinutes} min round trip from the Decatur base (route source: ${route.source}).`,
  ];
  if (browserFeeCents === null) notes.push("Browser model has no price for this ZIP today (out of table — travel is effectively unpriced until the route is confirmed).");
  if (nearby > 0) notes.push(`${nearby} job(s) already routed nearby the same day: free miles raised to ${freeMiles}.`);
  if (route.uncertainties.length) notes.push(...route.uncertainties);

  return {
    zip: args.zip,
    browserFeeCents,
    browserTier: browser.tier,
    routeCostCents: route.costCents,
    route,
    wouldChargeCents: route.customerFeeCents,
    deltaCents: browserFeeCents === null ? null : route.customerFeeCents - browserFeeCents,
    sameDayNearbyJobs: nearby,
    freeRoundTripMilesApplied: freeMiles,
    travelCostExceedsJobTotal: args.jobTotalCents === undefined ? null : route.costCents > args.jobTotalCents,
    notes,
  };
}
