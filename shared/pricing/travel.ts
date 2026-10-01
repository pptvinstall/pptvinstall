import type { EconomicsConfig } from "./config";
import type { JobContext } from "./scope";
import { roundToStep, safeCents, type Cents } from "./money";

// Travel engine V2. Pure arithmetic over configured assumptions.
// No live traffic or fuel data is claimed. Providers can supply miles / minutes /
// multiplier through the adapter interfaces below; the engine only consumes numbers.

export interface RouteProvider {
  name: string;
  /** Resolve one-way miles and drive minutes. Returns null when unknown. */
  getRoute(input: { origin?: string; zip?: string; departAt?: string }): Promise<{ oneWayMiles: number; oneWayMinutes: number } | null>;
}

export interface TrafficProvider {
  name: string;
  getMultiplier(input: { weekday?: number; time?: string; zip?: string }): Promise<number | null>;
}

export interface FuelPriceProvider {
  name: string;
  getPricePerGalCents(): Promise<{ cents: Cents; asOf: string } | null>;
}

export type TravelEstimateSource = "owner_input" | "provider" | "assumed_unknown_route";

export interface TravelBreakdown {
  source: TravelEstimateSource;
  origin: string | null;
  oneWayMiles: number;
  roundTripMiles: number;
  oneWayDriveMinutes: number;
  roundTripDriveMinutes: number;
  trafficMultiplier: number;
  fuelCents: Cents;
  vehicleCents: Cents;
  timeCents: Cents;
  /** Total internal travel cost (fuel + vehicle + owner time). */
  costCents: Cents;
  /** What the customer is charged as a separate travel line. Zero under the current policy. */
  customerFeeCents: Cents;
  vehicleLabel: string;
  mpg: number;
  fuelPricePerGalCents: Cents;
  fuelPriceAsOf: string;
  uncertainties: string[];
}

function bandUp(value: number, band: number): number {
  if (value <= 0) return 0;
  return Math.ceil(value / band - 1e-9) * band;
}

export function computeTravel(context: JobContext, cfg: EconomicsConfig, extraDriveMinutes = 0): TravelBreakdown {
  const t = cfg.travel;
  const uncertainties: string[] = [];

  let source: TravelEstimateSource = "owner_input";
  let oneWayMiles = context.oneWayMiles;
  let oneWayMinutes = context.oneWayDriveMinutes;

  if (oneWayMiles === undefined && oneWayMinutes === undefined) {
    source = "assumed_unknown_route";
    oneWayMiles = t.unknownRouteOneWayMiles;
    oneWayMinutes = t.unknownRouteOneWayMinutes;
    uncertainties.push(`Route unknown: assuming ${oneWayMiles} mi / ${oneWayMinutes} min one way. Confirm address before quoting firmly.`);
  } else if (oneWayMiles === undefined) {
    // Minutes known, miles not: assume ~30 mph average urban speed.
    oneWayMiles = Math.round((oneWayMinutes ?? 0) * 0.5);
    uncertainties.push("Miles estimated from drive minutes (30 mph assumption).");
  } else if (oneWayMinutes === undefined) {
    oneWayMinutes = Math.round(oneWayMiles * 2);
    uncertainties.push("Drive minutes estimated from miles (30 mph assumption).");
  }

  const rawMultiplier = context.trafficMultiplier ?? t.defaultTrafficMultiplier;
  const trafficMultiplier = Math.min(t.trafficMultiplierMax, Math.max(t.trafficMultiplierMin, rawMultiplier));

  const bandedOneWayMiles = bandUp(oneWayMiles ?? 0, t.mileageBandMiles);
  const trafficMinutes = bandUp((oneWayMinutes ?? 0) * trafficMultiplier, t.driveMinuteBand);
  const roundTripMiles = bandedOneWayMiles * 2;
  const roundTripDriveMinutes = trafficMinutes * 2 + Math.max(0, extraDriveMinutes);

  const fuelCents = safeCents((roundTripMiles / t.mpg) * t.fuelPricePerGalCents);
  const vehicleCents = safeCents(roundTripMiles * t.vehicleCostPerMileCents);
  const timeCents = safeCents((roundTripDriveMinutes / 60) * t.ownerTimeValuePerHourCents);

  let customerFeeCents = 0;
  if (t.customerFeePolicy === "per_round_trip_mile") {
    const chargeable = Math.max(0, roundTripMiles - t.customerFeeFreeRoundTripMiles);
    customerFeeCents = roundToStep(safeCents(chargeable * t.customerFeePerRoundTripMileCents), 100, "up");
  }

  return {
    source,
    origin: context.origin ?? null,
    oneWayMiles: bandedOneWayMiles,
    roundTripMiles,
    oneWayDriveMinutes: trafficMinutes,
    roundTripDriveMinutes,
    trafficMultiplier,
    fuelCents,
    vehicleCents,
    timeCents,
    costCents: fuelCents + vehicleCents + timeCents,
    customerFeeCents,
    vehicleLabel: t.vehicleLabel,
    mpg: t.mpg,
    fuelPricePerGalCents: t.fuelPricePerGalCents,
    fuelPriceAsOf: t.fuelPriceAsOf,
    uncertainties,
  };
}
