import type { EconomicsConfig } from "./config";
import type { PricingResult } from "./engine";
import type { Cents } from "./money";
import type { JobContext, JobScope } from "./scope";
import { shadowRouteTravel, type RouteTravelShadow } from "./travelShadow";

// Issue #35 S-6 — travel SHADOW LOGGING preparation (owner direction, 2026-11-27).
//
// The shadow travel model (travelShadow.ts) can already say what a unified
// route-based model WOULD charge for a job. This module defines the record
// that would be kept for REAL quotes so the owner can later judge the model
// on actuals: route efficiency, combined-appointment grouping, fuel expense,
// estimated labor, and realized profitability.
//
// HARD INERT-BY-DEFAULT CONTRACT:
// - Logging is controlled by SHADOW_TRAVEL_LOGGING_ENABLED, which defaults to
//   false and can only be turned on by an explicit owner activation
//   (environment flag TRAVEL_SHADOW_LOGGING=1 on the server). Nothing in this
//   module reads the flag implicitly at import time in a way that changes
//   behaviour — callers must pass the resolved flag in.
// - captureTravelShadowLog() is a pure function: it builds a record and
//   returns it. It performs NO I/O, writes NOTHING, and is not imported by
//   any request/response path. Wiring it into a route (and choosing a
//   storage sink) is a separate, owner-approved change.
// - A record NEVER feeds a customer price. The customer-visible figures it
//   carries (what the customer was actually charged) are copied FROM the
//   finished quote, never the other way around.

export const TRAVEL_SHADOW_LOG_SCHEMA_VERSION = 1 as const;

/** Resolved kill-switch state. Default (and production, until the owner activates): OFF. */
export interface TravelShadowLoggingConfig {
  enabled: boolean;
}

/** The production default: logging OFF. */
export const TRAVEL_SHADOW_LOGGING_DISABLED: TravelShadowLoggingConfig = { enabled: false };

/**
 * Resolve the flag from an environment-like record. Only the exact value
 * "1" enables logging — anything else (unset, "0", "true", typos) stays OFF,
 * so an accidental deployment can never start logging.
 */
export function resolveTravelShadowLogging(env: Record<string, string | undefined>): TravelShadowLoggingConfig {
  return { enabled: env.TRAVEL_SHADOW_LOGGING === "1" };
}

export interface TravelShadowLogRecord {
  schemaVersion: typeof TRAVEL_SHADOW_LOG_SCHEMA_VERSION;
  /** ISO timestamp supplied by the caller (this module never reads a clock). */
  capturedAt: string;
  zip: string;
  /** Links the record back to the priced job without embedding customer PII. */
  quoteInputHash: string;
  pricingMode: EconomicsConfig["pricingMode"];
  configVersion: number;

  route: {
    oneWayMiles: number;
    roundTripMiles: number;
    roundTripDriveMinutes: number;
    source: string;
    /** What the browser ZIP-tier model charges today; null when unpriced. */
    browserFeeCents: Cents | null;
    /** What the unified candidate model would charge. */
    shadowWouldChargeCents: Cents;
    deltaCents: Cents | null;
  };

  /** Route efficiency: how much of the trip is shared with other work. */
  efficiency: {
    /** Jobs already routed near this ZIP on the appointment day. */
    sameDayNearbyJobs: number;
    /** Free round-trip miles the candidate model grants after efficiency. */
    freeRoundTripMilesApplied: number;
    /** >1 job sharing the trip means this route's cost is not carried by one ticket alone. */
    combinedAppointment: boolean;
  };

  /** Fuel expense estimate for the route (from the engine's travel breakdown). */
  fuel: {
    fuelCents: Cents;
    vehicleCents: Cents;
    gallonsEstimate: number;
    fuelPricePerGalCents: Cents;
    fuelPriceAsOf: string;
  };

  /** Estimated labor for the job the route serves. */
  labor: {
    onSiteMinutes: number;
    totalOwnerMinutes: number;
    ownerValueCents: Cents;
  };

  /**
   * Profitability of the job as priced. `actual*` fields describe the quote
   * the customer actually received under the ACTIVE pricing mode — the
   * shadow figures sit beside them for comparison and never replace them.
   */
  profitability: {
    actualCustomerTotalCents: Cents;
    actualCustomerTravelFeeCents: Cents;
    costToServeCents: Cents;
    outOfPocketCents: Cents;
    /** actualCustomerTotal − costToServe: the engine's margin view of the real quote. */
    estimatedMarginCents: Cents;
    /** Guardrail: the route's internal cost alone exceeds the whole job total. */
    travelCostExceedsJobTotal: boolean;
    /** What the margin WOULD have been under the candidate travel fee (comparison only). */
    shadowMarginCents: Cents;
  };

  notes: string[];
}

/**
 * Build a shadow log record for a real, already-priced quote.
 *
 * Returns null when logging is disabled — callers can invoke this
 * unconditionally once wired (in a future approved change) and stay inert
 * until the owner activates the flag. Pure: no I/O, no clock, no mutation
 * of its inputs, and no effect on the quote it describes.
 */
export function captureTravelShadowLog(args: {
  logging: TravelShadowLoggingConfig;
  capturedAt: string;
  scope: JobScope;
  context: JobContext;
  cfg: EconomicsConfig;
  /** The finished engine result for the quote the customer actually got. */
  priced: PricingResult;
  /** Jobs already routed near this ZIP on the appointment day. */
  sameDayNearbyJobs?: number;
  /** Precomputed shadow comparison; computed here when not supplied. */
  shadow?: RouteTravelShadow;
}): TravelShadowLogRecord | null {
  if (!args.logging.enabled) return null;

  const { priced, cfg } = args;
  const shadow =
    args.shadow ??
    shadowRouteTravel({
      zip: args.context.zip ?? "",
      context: args.context,
      cfg,
      sameDayNearbyJobs: args.sameDayNearbyJobs,
      jobTotalCents: priced.legacy.totalCents,
    });

  const travel = priced.travel;
  const gallonsEstimate = travel.fuelPricePerGalCents > 0 ? travel.fuelCents / travel.fuelPricePerGalCents : 0;
  const actualTotal = priced.legacy.totalCents;
  const shadowDelta = shadow.wouldChargeCents - (shadow.browserFeeCents ?? 0);

  return {
    schemaVersion: TRAVEL_SHADOW_LOG_SCHEMA_VERSION,
    capturedAt: args.capturedAt,
    zip: args.context.zip ?? "",
    quoteInputHash: priced.inputHash,
    pricingMode: cfg.pricingMode,
    configVersion: priced.configVersion,
    route: {
      oneWayMiles: travel.oneWayMiles,
      roundTripMiles: travel.roundTripMiles,
      roundTripDriveMinutes: travel.roundTripDriveMinutes,
      source: travel.source,
      browserFeeCents: shadow.browserFeeCents,
      shadowWouldChargeCents: shadow.wouldChargeCents,
      deltaCents: shadow.deltaCents,
    },
    efficiency: {
      sameDayNearbyJobs: shadow.sameDayNearbyJobs,
      freeRoundTripMilesApplied: shadow.freeRoundTripMilesApplied,
      combinedAppointment: shadow.sameDayNearbyJobs > 0,
    },
    fuel: {
      fuelCents: travel.fuelCents,
      vehicleCents: travel.vehicleCents,
      gallonsEstimate: Number(gallonsEstimate.toFixed(3)),
      fuelPricePerGalCents: travel.fuelPricePerGalCents,
      fuelPriceAsOf: travel.fuelPriceAsOf,
    },
    labor: {
      onSiteMinutes: priced.labor.minutes,
      totalOwnerMinutes: priced.totalOwnerMinutes,
      ownerValueCents: priced.ownerValueCents,
    },
    profitability: {
      actualCustomerTotalCents: actualTotal,
      actualCustomerTravelFeeCents: priced.customerTravelFeeCents,
      costToServeCents: priced.costToServeCents,
      outOfPocketCents: priced.outOfPocketCents,
      estimatedMarginCents: actualTotal - priced.costToServeCents,
      travelCostExceedsJobTotal: shadow.travelCostExceedsJobTotal ?? travel.costCents > actualTotal,
      shadowMarginCents: actualTotal + shadowDelta - priced.costToServeCents,
    },
    notes: [...shadow.notes],
  };
}
