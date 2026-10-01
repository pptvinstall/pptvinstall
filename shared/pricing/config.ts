import { z } from "zod";
import { MOUNT_TYPES, SCHEDULE_MODIFIERS, SIZE_BANDS, EXTRA_KINDS } from "./scope";

// Economics configuration. Everything the engine "believes" about cost lives here,
// versioned and validated, so it can be edited by the owner without code changes.
//
// IMPORTANT: every default below is an UNCALIBRATED STARTING ASSUMPTION, not a
// measured fact. They exist so the engine produces sensible internal numbers on day
// one; the actuals loop (job_actuals -> pricing intelligence) is how they get tuned.
// Customer-facing prices are NOT driven by this config unless pricingMode is "dynamic".

const cents = z.number().int().min(0).max(10_000_000);
const minutes = z.number().min(0).max(1_000);
const pct = z.number().min(0).max(1);

const recipeLineSchema = z.object({
  label: z.string().min(1).max(80),
  qty: z.number().min(0).max(1_000),
  unitCostCents: cents,
});

export const recipeSchema = z.object({
  label: z.string().min(1).max(80),
  lines: z.array(recipeLineSchema).max(30),
});

const mountCostKey = z.string().regex(/^(fixed|tilt|full_motion):(32-55|56\+)$/);

export const economicsConfigSchema = z
  .object({
    version: z.number().int().min(1),
    name: z.string().min(1).max(80),
    /** "legacy": customer price = existing catalog. "dynamic": customer price = engine recommendation. */
    pricingMode: z.enum(["legacy", "dynamic"]),
    calibration: z.enum(["uncalibrated-default", "owner-edited", "calibrated-from-actuals"]),

    labor: z
      .object({
        targetLaborPerHourCents: cents,
        helperPerHourCents: cents,
        /** Minutes charged once per visit regardless of TV count (load in, walk-through, sign-off). */
        setupMinutes: minutes,
        perTvBaseMinutes: z.record(z.enum(SIZE_BANDS), minutes),
        wallMinutes: z.object({ drywall: minutes, brick: minutes, stone: minutes, steel: minutes, unknown: minutes }),
        locationMinutes: z.object({ standard: minutes, fireplace: minutes, high_wall: minutes }),
        mountSuppliedMinutes: minutes,
        mountTypeMinutes: z.record(z.enum(MOUNT_TYPES), minutes),
        wireMinutes: z.object({ visible: minutes, raceway: minutes, in_wall: minutes }),
        outletInstallMinutes: minutes,
        powerUnknownMinutes: minutes,
        removalMinutes: z.object({ tvRemoval: minutes, mountRemoval: minutes, remount: minutes }),
        extraMinutes: z.record(z.enum(EXTRA_KINDS), minutes),
        cleanupMinutes: z.object({ standard: minutes, patching: minutes, haul_away: minutes }),
        access: z.object({
          difficultMultiplier: z.number().min(1).max(3),
          furnitureMovementMinutes: minutes,
          ladderHeightMinutes: minutes,
          /** Fraction of labor minutes a helper is also on the clock. */
          helperShare: z.number().min(0).max(1),
        }),
        /** Each TV after the first takes this fraction of the per-TV base time (shared setup/learning). */
        additionalTvEfficiency: z.number().min(0.5).max(1),
      })
      .strict(),

    travel: z
      .object({
        vehicleLabel: z.string().max(80),
        mpg: z.number().min(5).max(80),
        /** Cached reference price. Not live data; asOf documents when the owner last set it. */
        fuelPricePerGalCents: cents,
        fuelPriceAsOf: z.string().max(40),
        vehicleCostPerMileCents: cents,
        ownerTimeValuePerHourCents: cents,
        defaultTrafficMultiplier: z.number().min(0.5).max(5),
        trafficMultiplierMin: z.number().min(0.5).max(5),
        trafficMultiplierMax: z.number().min(0.5).max(5),
        /** Miles are rounded UP to this band so tiny route changes do not move prices. */
        mileageBandMiles: z.number().min(1).max(50),
        driveMinuteBand: z.number().min(1).max(60),
        /** Assumed one-way miles/minutes when route is unknown. Flagged as an uncertainty. */
        unknownRouteOneWayMiles: z.number().min(0).max(200),
        unknownRouteOneWayMinutes: z.number().min(0).max(300),
        /** Customer-facing travel fee. Current policy is none: travel is absorbed unless the owner enables it. */
        customerFeePolicy: z.enum(["none", "per_round_trip_mile"]),
        customerFeePerRoundTripMileCents: cents,
        customerFeeFreeRoundTripMiles: z.number().min(0).max(500),
      })
      .strict(),

    business: z
      .object({
        minimumTicketCents: cents,
        minimumTripEconomicsCents: cents,
        overheadPerJobCents: cents,
        overheadPctOfLabor: pct,
        materialMarkupPct: z.number().min(0).max(3),
        minimumMarginPct: z.number().min(0).max(0.9),
        desiredMarginPct: z.number().min(0).max(0.9),
        premiumReferenceFactor: z.number().min(1).max(3),
        roundingStepCents: z.number().int().min(1).max(10_000),
        /** Recommendation moves only if the new number differs by at least this much. */
        minimumMeaningfulAdjustmentCents: cents,
        maxDiscountPct: pct,
        /** Owner-controlled. Disabled by default; no tax rule is assumed by the system. */
        tax: z.object({ enabled: z.boolean(), rateBps: z.number().int().min(0).max(2_500), label: z.string().max(40) }),
      })
      .strict(),

    scheduleModifiers: z.record(
      z.enum(SCHEDULE_MODIFIERS),
      z.object({
        enabled: z.boolean(),
        /** Extra internal cost as a fraction of labor cost. */
        laborCostPct: pct,
        extraCostCents: cents,
        extraDriveMinutes: minutes,
        /** Only when true may this modifier become a customer-visible surcharge. Default false everywhere. */
        customerFacing: z.boolean(),
        customerSurchargeCents: cents,
      }),
    ),

    /** Material recipes keyed by recipe id. Selection rules live in code; quantities and costs live here. */
    recipes: z.record(z.string().min(1).max(40), recipeSchema),
    /** Cost (not sell price) of PPTV-supplied mounts, keyed "type:band". */
    mountCostsCents: z.record(mountCostKey, cents),
    /** Fixed catalog sell prices for PPTV mounts are NOT here; they stay in the legacy catalog. */
  })
  .strict()
  .superRefine((cfg, ctx) => {
    if (cfg.business.desiredMarginPct < cfg.business.minimumMarginPct) {
      ctx.addIssue({ code: "custom", path: ["business", "desiredMarginPct"], message: "desiredMarginPct must be >= minimumMarginPct" });
    }
    if (cfg.travel.trafficMultiplierMin > cfg.travel.trafficMultiplierMax) {
      ctx.addIssue({ code: "custom", path: ["travel", "trafficMultiplierMin"], message: "min must be <= max" });
    }
    if (cfg.business.minimumMarginPct >= 0.9 || cfg.business.desiredMarginPct >= 0.9) {
      ctx.addIssue({ code: "custom", path: ["business"], message: "margins must be below 90%" });
    }
  });

export type EconomicsConfig = z.infer<typeof economicsConfigSchema>;

export const ENGINE_VERSION = "2.0.0";

export const DEFAULT_ECONOMICS_CONFIG: EconomicsConfig = {
  version: 1,
  name: "Uncalibrated defaults",
  pricingMode: "legacy",
  calibration: "uncalibrated-default",
  labor: {
    targetLaborPerHourCents: 7_000,
    helperPerHourCents: 2_500,
    setupMinutes: 15,
    perTvBaseMinutes: { "32-55": 35, "56+": 40 },
    wallMinutes: { drywall: 0, brick: 25, stone: 30, steel: 15, unknown: 10 },
    locationMinutes: { standard: 0, fireplace: 25, high_wall: 15 },
    mountSuppliedMinutes: 8,
    mountTypeMinutes: { fixed: 0, tilt: 3, full_motion: 10 },
    wireMinutes: { visible: 0, raceway: 20, in_wall: 40 },
    outletInstallMinutes: 45,
    powerUnknownMinutes: 10,
    removalMinutes: { tvRemoval: 15, mountRemoval: 20, remount: 20 },
    extraMinutes: {
      soundbar: 30,
      shelf: 35,
      artwork: 20,
      camera: 40,
      doorbell: 35,
      floodlight: 60,
      av: 45,
      specialty: 60,
      custom: 0,
    },
    cleanupMinutes: { standard: 5, patching: 30, haul_away: 25 },
    access: { difficultMultiplier: 1.2, furnitureMovementMinutes: 15, ladderHeightMinutes: 15, helperShare: 0.8 },
    additionalTvEfficiency: 0.85,
  },
  travel: {
    vehicleLabel: "2021 VW Atlas SE",
    mpg: 20,
    fuelPricePerGalCents: 350,
    fuelPriceAsOf: "owner reference value, not live data",
    vehicleCostPerMileCents: 30,
    ownerTimeValuePerHourCents: 4_000,
    defaultTrafficMultiplier: 1,
    trafficMultiplierMin: 1,
    trafficMultiplierMax: 2,
    mileageBandMiles: 5,
    driveMinuteBand: 5,
    unknownRouteOneWayMiles: 20,
    unknownRouteOneWayMinutes: 35,
    customerFeePolicy: "none",
    customerFeePerRoundTripMileCents: 0,
    customerFeeFreeRoundTripMiles: 20,
  },
  business: {
    minimumTicketCents: 10_000,
    minimumTripEconomicsCents: 6_000,
    overheadPerJobCents: 500,
    overheadPctOfLabor: 0.05,
    materialMarkupPct: 0.35,
    minimumMarginPct: 0.12,
    desiredMarginPct: 0.25,
    premiumReferenceFactor: 1.15,
    roundingStepCents: 500,
    minimumMeaningfulAdjustmentCents: 500,
    maxDiscountPct: 0.2,
    tax: { enabled: false, rateBps: 0, label: "" },
  },
  scheduleModifiers: {
    rush_hour: { enabled: true, laborCostPct: 0, extraCostCents: 0, extraDriveMinutes: 15, customerFacing: false, customerSurchargeCents: 0 },
    same_day: { enabled: true, laborCostPct: 0.1, extraCostCents: 0, extraDriveMinutes: 0, customerFacing: false, customerSurchargeCents: 0 },
    late_evening: { enabled: true, laborCostPct: 0.15, extraCostCents: 0, extraDriveMinutes: 0, customerFacing: false, customerSurchargeCents: 0 },
    weekend: { enabled: true, laborCostPct: 0.1, extraCostCents: 0, extraDriveMinutes: 0, customerFacing: false, customerSurchargeCents: 0 },
    awkward_gap: { enabled: true, laborCostPct: 0, extraCostCents: 1_500, extraDriveMinutes: 0, customerFacing: false, customerSurchargeCents: 0 },
  },
  recipes: {
    standard_drywall_install: {
      label: "Standard drywall install hardware",
      lines: [
        { label: "Lag screws / anchors", qty: 1, unitCostCents: 250 },
        { label: "Cable ties and misc.", qty: 1, unitCostCents: 100 },
      ],
    },
    masonry_install: {
      label: "Masonry / stone install hardware",
      lines: [
        { label: "Masonry anchors", qty: 1, unitCostCents: 800 },
        { label: "Drill bit wear", qty: 1, unitCostCents: 500 },
      ],
    },
    steel_install: {
      label: "Steel stud / high-rise hardware",
      lines: [{ label: "Steel stud toggle anchors", qty: 1, unitCostCents: 900 }],
    },
    outlet_clean_cord: {
      label: "Outlet behind TV / clean-cord (per outlet)",
      lines: [
        { label: "14/2 Romex (10 ft)", qty: 1, unitCostCents: 600 },
        { label: "Old-work box", qty: 1, unitCostCents: 250 },
        { label: "Receptacle", qty: 1, unitCostCents: 200 },
        { label: "Cover plate", qty: 1, unitCostCents: 150 },
        { label: "Low-voltage / cord pass-through plate", qty: 1, unitCostCents: 300 },
      ],
    },
    surface_raceway: {
      label: "Surface raceway kit (per TV)",
      lines: [{ label: "Raceway kit with fittings", qty: 1, unitCostCents: 1_800 }],
    },
    in_wall_low_voltage: {
      label: "In-wall low-voltage pass-through (per TV)",
      lines: [
        { label: "Low-voltage brush plate pair", qty: 1, unitCostCents: 700 },
        { label: "Fish tape / pull string wear", qty: 1, unitCostCents: 200 },
      ],
    },
    patching: {
      label: "Patch and touch-up kit",
      lines: [
        { label: "Spackle / patch kit", qty: 1, unitCostCents: 600 },
        { label: "Paint touch-up", qty: 1, unitCostCents: 300 },
      ],
    },
    haul_away: {
      label: "Haul-away disposal",
      lines: [{ label: "Disposal / bags", qty: 1, unitCostCents: 500 }],
    },
  },
  mountCostsCents: {
    "fixed:32-55": 1_800,
    "fixed:56+": 2_400,
    "tilt:32-55": 2_400,
    "tilt:56+": 3_000,
    "full_motion:32-55": 3_800,
    "full_motion:56+": 5_200,
  },
};

export class ConfigValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid economics config: ${issues.join("; ")}`);
    this.name = "ConfigValidationError";
  }
}

const SECRET_LIKE = /(password|secret|token|api[_-]?key|authorization|bearer)/i;

/** Validate a config. Rejects unknown keys and anything shaped like a secret. */
export function validateEconomicsConfig(input: unknown): EconomicsConfig {
  const secretPaths: string[] = [];
  const walk = (value: unknown, path: string) => {
    if (value && typeof value === "object") {
      for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
        if (SECRET_LIKE.test(key)) secretPaths.push(`${path}.${key}`);
        walk(nested, `${path}.${key}`);
      }
    }
  };
  walk(input, "config");
  if (secretPaths.length) {
    throw new ConfigValidationError([`secret-like keys are not allowed in pricing config: ${secretPaths.join(", ")}`]);
  }
  const parsed = economicsConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new ConfigValidationError(parsed.error.issues.map((i) => `${i.path.join(".") || "config"}: ${i.message}`));
  }
  return parsed.data;
}

/** Shallow list of changed leaf paths between two configs, for the audit trail. */
export function diffConfigs(before: unknown, after: unknown, prefix = ""): string[] {
  const out: string[] = [];
  if (before && after && typeof before === "object" && typeof after === "object" && !Array.isArray(before) && !Array.isArray(after)) {
    const keys = new Set([...Object.keys(before as object), ...Object.keys(after as object)]);
    for (const key of Array.from(keys)) {
      out.push(...diffConfigs((before as Record<string, unknown>)[key], (after as Record<string, unknown>)[key], prefix ? `${prefix}.${key}` : key));
    }
    return out;
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) out.push(prefix);
  return out;
}
