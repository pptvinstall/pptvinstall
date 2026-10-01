import { ENGINE_VERSION, type EconomicsConfig } from "./config";
import { computeLabor, type LaborBreakdown } from "./labor";
import { computeLegacyPrice, type LegacyPrice } from "./legacy";
import { computeMaterials, type MaterialBreakdown } from "./materials";
import { roundToStep, safeCents, formatDollarsShort, type Cents } from "./money";
import { applyScheduleModifiers, detectScheduleModifiers, type AppliedScheduleModifier } from "./schedule";
import { computeTravel, type TravelBreakdown } from "./travel";
import { hashObject } from "./hash";
import { parseJobContext, parseJobScope, type JobContext, type JobContextInput, type JobScope, type JobScopeInput } from "./scope";
import { computeWork, normalizeScope, worstStatus, type WorkComputation, type WorkQuestion, type WorkReason } from "./workEngine";
import type { WorkStatus } from "./work";

// Pricing Engine V2: price(scope, context, config) -> PricingResult.
// Pure and deterministic. No LLM arithmetic, no clock, no network, no randomness.
// Everything in PricingResult is INTERNAL. Customer-facing data goes through customerView.ts.

export interface PricingResult {
  engineVersion: string;
  configVersion: number;
  configCalibration: EconomicsConfig["calibration"];
  pricingMode: EconomicsConfig["pricingMode"];
  inputHash: string;
  empty: boolean;

  labor: LaborBreakdown;
  materials: MaterialBreakdown;
  travel: TravelBreakdown;
  scheduleModifiers: AppliedScheduleModifier[];
  scheduleCostCents: Cents;
  overheadCents: Cents;

  /** Cash-ish costs: materials, fuel, vehicle, helper, overhead. */
  outOfPocketCents: Cents;
  /** Owner time valued at the configured rate: labor, travel time, schedule premium. */
  ownerValueCents: Cents;
  costToServeCents: Cents;

  floorCents: Cents;
  recommendedCents: Cents;
  premiumCents: Cents;
  /** What the existing catalog charges for the priced portion of this scope. */
  legacy: LegacyPrice;

  /** Total owner time on the job: on-site plus driving. */
  totalOwnerMinutes: number;
  /** Customer-facing travel fee under the configured policy (zero today). */
  customerTravelFeeCents: Cents;
  /** Customer-visible schedule surcharge (zero unless an owner rule enables it). */
  customerScheduleSurchargeCents: Cents;

  flags: string[];
  uncertainties: string[];
  why: string[];

  /** priced | estimate_with_confirmation | manual_review_required | not_supported. */
  status: WorkStatus;
  statusReasons: WorkReason[];
  /** Open questions for the owner/customer. Unknown scope always produces questions, never silent guesses. */
  questions: WorkQuestion[];
  confidence: "high" | "medium" | "low";
  /** Per-item breakdown from the universal work model (TVs priced by the TV engine are not repeated here). */
  work: WorkComputation;
  /** Customer-safe statements of what is NOT included (e.g. painting). */
  exclusions: string[];
  /** Number of work sites (1 = single address). */
  siteCount: number;
}

export function priceScope(scopeInput: JobScopeInput | JobScope, contextInput: JobContextInput | JobContext | undefined, cfg: EconomicsConfig): PricingResult {
  const scope = normalizeScope(parseJobScope(scopeInput));
  const parsedContext = parseJobContext(contextInput ?? {});
  const empty = scope.tvs.length === 0 && scope.extras.length === 0 && scope.items.length === 0;

  // Sites: the first address plus any extra stops. Items reference extra stops by `site`; a stop that was never
  // described gets an explicit "not entered" assumption inside the travel engine rather than being ignored.
  const maxItemSite = Math.max(scope.items.reduce((m, i) => Math.max(m, i.site), 0), scope.tvs.reduce((m, t) => Math.max(m, t.site), 0));
  const stops = parsedContext.extraStops.slice();
  while (stops.length < maxItemSite) stops.push({});
  const context: JobContext = { ...parsedContext, extraStops: stops };
  const siteCount = 1 + stops.length;
  const B = cfg.business;
  const flags: string[] = [];
  const uncertainties: string[] = [];
  const why: string[] = [];

  const work = computeWork(scope, cfg, { siteCount });
  const labor = computeLabor(scope, cfg, work);
  const materials = computeMaterials(scope, cfg, work);

  const modifierKeys = empty ? [] : detectScheduleModifiers(context);
  const schedule = applyScheduleModifiers(modifierKeys, labor.ownerCostCents, cfg);
  const travel = empty
    ? { ...computeTravel({ ...context, oneWayMiles: 0, oneWayDriveMinutes: 0 }, cfg), source: "owner_input" as const, uncertainties: [] }
    : computeTravel(context, cfg, schedule.extraDriveMinutes);

  const overheadCents = empty ? 0 : safeCents(B.overheadPerJobCents + labor.ownerCostCents * B.overheadPctOfLabor);

  // Costs
  const travelTimeCents = travel.timeCents;
  const outOfPocketCents = materials.costCents + travel.fuelCents + travel.vehicleCents + labor.helperCostCents + overheadCents;
  const ownerValueCents = labor.ownerCostCents + travelTimeCents + schedule.extraCostCents;
  const costToServeCents = outOfPocketCents + ownerValueCents;

  // The customer travel fee (if any) is paid by the customer on top, so it offsets travel cost in the price.
  const feeOffset = Math.min(travel.customerFeeCents, travel.costCents);
  const costForPrice = Math.max(0, costToServeCents - feeOffset);

  let floorCents = 0;
  let recommendedCents = 0;
  let premiumCents = 0;
  if (!empty) {
    const marginFloor = costForPrice / (1 - B.minimumMarginPct);
    const tripFloor = Math.max(0, outOfPocketCents - feeOffset) + B.minimumTripEconomicsCents;
    floorCents = roundToStep(Math.max(B.minimumTicketCents, marginFloor, tripFloor), B.roundingStepCents, "up");

    const chargeCost = costForPrice - materials.costCents + materials.chargeCents;
    const desired = chargeCost / (1 - B.desiredMarginPct);
    recommendedCents = Math.max(floorCents, roundToStep(desired, B.roundingStepCents, "nearest"));
    premiumCents = Math.max(recommendedCents, roundToStep(recommendedCents * B.premiumReferenceFactor, B.roundingStepCents, "nearest"));
  }

  const legacy = computeLegacyPrice(scope, work, cfg);

  // Flags and uncertainties (internal).
  if (empty) flags.push("No scope entered yet.");
  uncertainties.push(...travel.uncertainties);
  const questions: WorkQuestion[] = [...work.questions];
  scope.tvs.forEach((tv, i) => {
    const n = i + 1;
    if (tv.wall === "unknown") {
      uncertainties.push(`TV ${n}: wall type unknown. Hidden conditions are unverified until inspection.`);
      questions.push({ itemId: tv.id, field: "wall", question: `What is TV ${n}'s wall made of (drywall, brick, stone, steel stud)?` });
    }
    if (tv.power === "unknown") {
      uncertainties.push(`TV ${n}: power source unknown; outlet work may be needed.`);
      questions.push({ itemId: tv.id, field: "power", question: `Is there an outlet behind TV ${n}, or does one need to be installed?` });
    }
    if (tv.location === "fireplace" && tv.power === "outlet") flags.push(`TV ${n}: outlet above a fireplace needs photos before the price is firm.`);
    if (tv.location === "fireplace" && (tv.wall === "brick" || tv.wall === "stone")) flags.push(`TV ${n}: masonry above a fireplace; confirm firebox heat and mount rating.`);
    if (tv.inches === undefined && tv.sizeBand === "56+") {
      uncertainties.push(`TV ${n}: exact size not entered; very large TVs may need a helper.`);
      questions.push({ itemId: tv.id, field: "inches", question: `What is TV ${n}'s exact screen size?` });
    }
  });
  const statusReasons: WorkReason[] = [...work.reasons];
  for (const r of work.reasons) {
    if (r.severity === "confirm") uncertainties.push(r.message);
    else flags.push(`${r.severity === "not_supported" ? "NOT SUPPORTED" : "MANUAL REVIEW"}: ${r.message}`);
  }
  for (const e of travel.uncertainties) if (!uncertainties.includes(e)) uncertainties.push(e);
  if (scope.extras.some((e) => e.kind === "custom" || e.kind === "specialty")) flags.push("Custom or specialty extras are estimates; confirm scope before quoting firmly.");
  for (const note of legacy.mappingNotes) flags.push(`Catalog mapping: ${note}`);
  if (legacy.customQuoteItems.length) flags.push(`Catalog cannot price: ${legacy.customQuoteItems.join("; ")}.`);
  if (!empty && legacy.totalCents > 0 && legacy.totalCents < floorCents) {
    flags.push(`Current catalog price (${formatDollarsShort(legacy.totalCents)}) is below the economic floor (${formatDollarsShort(floorCents)}).`);
  }
  let status: WorkStatus = empty ? "priced" : work.status;
  if (!empty && uncertainties.some((u) => /unknown|not verified|unverified|assuming/i.test(u))) status = worstStatus(status, "estimate_with_confirmation");
  if (!empty && legacy.customQuoteItems.length > 0 && scope.tvs.length === 0 && scope.items.length === 0) status = worstStatus(status, "estimate_with_confirmation");
  const confidence: PricingResult["confidence"] = status === "manual_review_required" || status === "not_supported" || work.items.some((i) => i.confidence === "low") ? "low" : status === "estimate_with_confirmation" ? "medium" : "high";
  if (cfg.calibration === "uncalibrated-default") uncertainties.push("Economics config is uncalibrated defaults; treat internal numbers as estimates until tuned with actuals.");

  // Plain-language explanation.
  if (!empty) {
    why.push(`On-site: ${labor.minutes} min across ${labor.tasks.length} tasks, valued at ${formatDollarsShort(cfg.labor.targetLaborPerHourCents)}/hr = ${formatDollarsShort(labor.ownerCostCents)}.`);
    if (labor.helperMinutes) why.push(`Helper: ${labor.helperMinutes} min = ${formatDollarsShort(labor.helperCostCents)}.`);
    why.push(`Materials: ${formatDollarsShort(materials.costCents)} at cost, ${formatDollarsShort(materials.chargeCents)} with ${(B.materialMarkupPct * 100).toFixed(0)}% markup.`);
    why.push(
      `Travel: ${travel.roundTripMiles} mi round trip (${travel.mpg} MPG at ${formatDollarsShort(travel.fuelPricePerGalCents)}/gal reference) = fuel ${formatDollarsShort(travel.fuelCents)} + vehicle ${formatDollarsShort(travel.vehicleCents)} + ${travel.roundTripDriveMinutes} min of owner time ${formatDollarsShort(travel.timeCents)}.`,
    );
    for (const m of schedule.applied) if (m.extraCostCents || m.extraDriveMinutes) why.push(`Schedule (${m.key.replace("_", " ")}): +${formatDollarsShort(m.extraCostCents)} internal cost, +${m.extraDriveMinutes} drive min.`);
    if (work.items.length) why.push(`Work items: ${work.items.map((i) => i.customerText).join("; ")}.`);
    if (siteCount > 1) why.push(`${siteCount} stops: travel covers the drive between sites and the return trip.`);
    why.push(`Cost to serve ${formatDollarsShort(costToServeCents)}. Floor ${formatDollarsShort(floorCents)} keeps at least ${(B.minimumMarginPct * 100).toFixed(0)}% margin and ${formatDollarsShort(B.minimumTripEconomicsCents)} trip economics. Recommended ${formatDollarsShort(recommendedCents)} targets ${(B.desiredMarginPct * 100).toFixed(0)}%.`);
  }

  const inputHash = hashObject({ scope, context, configVersion: cfg.version, engine: ENGINE_VERSION });

  return {
    engineVersion: ENGINE_VERSION,
    configVersion: cfg.version,
    configCalibration: cfg.calibration,
    pricingMode: cfg.pricingMode,
    inputHash,
    empty,
    labor,
    materials,
    travel,
    scheduleModifiers: schedule.applied,
    scheduleCostCents: schedule.extraCostCents,
    overheadCents,
    outOfPocketCents,
    ownerValueCents,
    costToServeCents,
    floorCents,
    recommendedCents,
    premiumCents,
    legacy,
    totalOwnerMinutes: labor.minutes + travel.roundTripDriveMinutes,
    customerTravelFeeCents: travel.customerFeeCents,
    customerScheduleSurchargeCents: schedule.customerSurchargeCents,
    flags,
    uncertainties,
    why,
    status,
    statusReasons,
    questions: dedupeQuestions(questions),
    confidence,
    work,
    exclusions: work.exclusions,
    siteCount,
  };
}

function dedupeQuestions(qs: WorkQuestion[]): WorkQuestion[] {
  const seen = new Set<string>();
  return qs.filter((q) => (seen.has(q.question) ? false : (seen.add(q.question), true)));
}

export interface EconomicsAtPrice {
  priceCents: Cents;
  grossProfitCents: Cents;
  /** Profit after valuing owner time. Can be negative; labelled as an estimate. */
  marginCents: number;
  marginPct: number;
  /** (price - out-of-pocket) per hour of owner time (on-site + driving). */
  effectiveGrossPerHourCents: Cents;
  belowFloor: boolean;
  estimate: true;
}

/** Estimated economics if the customer pays priceCents. Always an estimate. */
export function economicsAtPrice(result: PricingResult, priceCents: Cents): EconomicsAtPrice {
  const price = safeCents(priceCents);
  const marginCents = price - result.costToServeCents;
  const marginPct = price > 0 ? marginCents / price : 0;
  const hours = result.totalOwnerMinutes / 60;
  const gross = price - result.outOfPocketCents;
  return {
    priceCents: price,
    grossProfitCents: Math.max(0, gross),
    marginCents,
    marginPct: Number.isFinite(marginPct) ? marginPct : 0,
    effectiveGrossPerHourCents: hours > 0 ? safeCents(gross / hours) : 0,
    belowFloor: !result.empty && price < result.floorCents,
    estimate: true,
  };
}

/**
 * Price stability: keep the previous recommendation unless the new one differs by at least the
 * configured minimum meaningful adjustment. Prevents quotes jittering on tiny input changes.
 */
export function stabilizeRecommendation(previousCents: Cents | null, nextCents: Cents, cfg: EconomicsConfig): Cents {
  if (previousCents === null) return nextCents;
  return Math.abs(nextCents - previousCents) < cfg.business.minimumMeaningfulAdjustmentCents ? previousCents : nextCents;
}
