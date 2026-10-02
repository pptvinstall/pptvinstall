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
import { computePremium, type PremiumResult } from "./premium";

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

  /** Cash-ish costs at the RECOMMENDED price: materials, fuel, vehicle, helper, overhead. */
  outOfPocketCents: Cents;
  /** Out-of-pocket costs that do not depend on price (everything except a revenue-share helper). */
  outOfPocketExHelperCents: Cents;
  /** Owner time valued at the configured rate: labor, travel time, schedule premium. */
  ownerValueCents: Cents;
  /** Cost to serve at the RECOMMENDED price (a revenue-share helper's pay depends on price; see helperPay). */
  costToServeCents: Cents;
  /** How the helper is paid on this job, so economics at any price are computed without circularity. */
  helperPay: HelperPay;
  /** Deterministic complexity / risk premium applied to the recommended price. */
  premium: PremiumResult;
  /** Structured "why the price is what it is", owner-facing. */
  priceDrivers: PriceDriver[];

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

export interface HelperPay {
  mode: "none" | "hourly" | "labor_revenue_share";
  /** Effective share of labor revenue (0 unless mode is labor_revenue_share and a helper is on the job). */
  sharePct: number;
  /** Revenue the helper does not share: materials/products at their charged amount + customer travel fee. */
  passThroughCents: Cents;
  /** Fixed helper cost when paid hourly (0 otherwise). */
  hourlyCostCents: Cents;
  helperMinutes: number;
}

export interface PriceDriver {
  key: string;
  label: string;
  cents: Cents;
  detail?: string;
}

/** Helper pay at a customer total. Labor revenue = total minus pass-through; never negative; never circular. */
export function helperCostAt(pay: HelperPay, customerTotalCents: Cents): Cents {
  if (pay.mode === "labor_revenue_share") return safeCents(pay.sharePct * Math.max(0, customerTotalCents - pay.passThroughCents));
  return pay.hourlyCostCents;
}

/**
 * Smallest price P with P*(1 - pct) >= fixed + share*(P - passThrough): fixed costs plus a helper share of labor
 * revenue, keeping `pct` margin. Closed form, so helper pay never feeds back into itself. Falls back to "no helper
 * share" when P would not exceed the pass-through (labor revenue is never negative).
 */
export function solvePrice(fixedCents: number, pct: number, share: number, passThroughCents: number): number {
  if (share <= 0) return fixedCents / (1 - pct);
  const p = (fixedCents - share * passThroughCents) / (1 - pct - share);
  return p >= passThroughCents ? p : fixedCents / (1 - pct);
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

  // ---- helper pay. Hourly: a fixed cost. Labor-revenue share: share x (price - pass-through), solved in closed form.
  const HC = cfg.labor.helperCompensation;
  const helperOnJob = !empty && labor.helperMinutes > 0;
  const shareMode = HC.mode === "labor_revenue_share";
  const helperPay: HelperPay = {
    mode: !helperOnJob ? "none" : shareMode ? "labor_revenue_share" : "hourly",
    sharePct: helperOnJob && shareMode ? HC.laborRevenueSharePct : 0,
    passThroughCents: materials.chargeCents + travel.customerFeeCents,
    hourlyCostCents: helperOnJob && !shareMode ? labor.helperCostCents : 0,
    helperMinutes: helperOnJob ? labor.helperMinutes : 0,
  };
  const share = helperPay.sharePct;

  // ---- costs that do not depend on price
  const outOfPocketExHelperCents = materials.costCents + travel.fuelCents + travel.vehicleCents + overheadCents;
  const ownerValueCents = labor.ownerCostCents + travel.timeCents + schedule.extraCostCents;
  // The customer travel fee (if any) is paid on top of the base price, so it offsets travel cost in the price.
  const feeOffset = Math.min(travel.customerFeeCents, travel.costCents);
  const fixedForPrice = Math.max(0, outOfPocketExHelperCents + ownerValueCents + helperPay.hourlyCostCents - feeOffset);
  // Within the base price, the pass-through the helper does not share is the materials/product charge.
  const basePassThrough = materials.chargeCents;

  // ---- status is decided from scope facts, never from price
  const legacy = computeLegacyPrice(scope, work, cfg);
  uncertainties.push(...travel.uncertainties);
  const questions: WorkQuestion[] = [...work.questions];
  if (empty) flags.push("No scope entered yet.");
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
    if (tv.power === "outlet") questions.push({ itemId: tv.id, field: "power.circuit", question: `Can TV ${n}'s outlet be fed from an existing outlet on the same wall (no new circuit or panel work)?` });
    if (tv.location === "fireplace" && tv.power === "outlet") flags.push(`TV ${n}: outlet above a fireplace needs photos before the price is firm.`);
    if (tv.location === "fireplace" && (tv.wall === "brick" || tv.wall === "stone")) flags.push(`TV ${n}: masonry above a fireplace; confirm firebox heat and mount rating.`);
    if (tv.inches === undefined && tv.sizeBand === "56+") {
      uncertainties.push(`TV ${n}: exact size not entered; very large TVs may need a helper.`);
      questions.push({ itemId: tv.id, field: "inches", question: `What is TV ${n}'s exact screen size?` });
    }
    if ((tv.inches ?? 0) >= 86) {
      uncertainties.push(`TV ${n}: ${tv.inches}" is an extreme size; weight, mount rating and a second person are not verified.`);
      questions.push({ itemId: tv.id, field: "weight", question: `What does TV ${n} weigh, and what is the mount rated for?` });
    }
  });
  const statusReasons: WorkReason[] = [...work.reasons];
  for (const r of work.reasons) {
    if (r.severity === "confirm") uncertainties.push(r.message);
    else flags.push(`${r.severity === "not_supported" ? "NOT SUPPORTED" : "MANUAL REVIEW"}: ${r.message}`);
  }
  if (scope.extras.some((e) => e.kind === "custom" || e.kind === "specialty")) flags.push("Custom or specialty extras are estimates; confirm scope before quoting firmly.");
  for (const note of legacy.mappingNotes) flags.push(`Catalog mapping: ${note}`);
  if (legacy.customQuoteItems.length) flags.push(`Catalog cannot price: ${legacy.customQuoteItems.join("; ")}.`);
  let status: WorkStatus = empty ? "priced" : work.status;
  if (!empty && uncertainties.some((u) => /unknown|not verified|unverified|assuming/i.test(u))) status = worstStatus(status, "estimate_with_confirmation");
  if (!empty && legacy.customQuoteItems.length > 0 && scope.tvs.length === 0 && scope.items.length === 0) status = worstStatus(status, "estimate_with_confirmation");

  // ---- complexity / risk premium (recommended price only)
  const premium = computePremium({
    scope,
    work,
    helperMinutes: helperPay.helperMinutes,
    scheduleKeys: schedule.applied.map((m) => m.key),
    siteCount,
    status,
    cfg: empty ? { ...cfg, business: { ...B, riskPremium: { ...B.riskPremium, enabled: false } } } : cfg,
  });

  // ---- floor / recommended / premium reference
  let floorCents = 0;
  let recommendedCents = 0;
  let premiumCents = 0;
  if (!empty) {
    const marginFloor = solvePrice(fixedForPrice, B.minimumMarginPct, share, basePassThrough);
    // Trip floor: after out-of-pocket costs (including the helper's share) keep at least minimumTripEconomics.
    const tripFixed = Math.max(0, outOfPocketExHelperCents + helperPay.hourlyCostCents - feeOffset) + B.minimumTripEconomicsCents;
    const tripFloor = solvePrice(tripFixed, 0, share, basePassThrough);
    floorCents = roundToStep(Math.max(B.minimumTicketCents, marginFloor, tripFloor), B.roundingStepCents, "up");

    // Materials at their charged amount, desired margin plus the complexity/risk premium.
    const chargeFixed = fixedForPrice - materials.costCents + materials.chargeCents;
    const desired = solvePrice(chargeFixed, B.desiredMarginPct + premium.pct, share, basePassThrough);
    recommendedCents = Math.max(floorCents, roundToStep(desired, B.roundingStepCents, "nearest"));
    premiumCents = Math.max(recommendedCents, roundToStep(recommendedCents * B.premiumReferenceFactor, B.roundingStepCents, "nearest"));
  }

  // ---- reported at the recommended price (customer total = base + travel fee + schedule surcharge)
  const recommendedTotal = empty ? 0 : recommendedCents + travel.customerFeeCents + schedule.customerSurchargeCents;
  const helperAtRecommended = empty ? 0 : helperCostAt(helperPay, recommendedTotal);
  const reportedLabor: LaborBreakdown = { ...labor, helperMinutes: helperPay.helperMinutes, helperCostCents: helperAtRecommended, totalCostCents: labor.ownerCostCents + helperAtRecommended };
  const outOfPocketCents = outOfPocketExHelperCents + helperAtRecommended;
  const costToServeCents = outOfPocketCents + ownerValueCents;

  if (!empty && legacy.totalCents > 0 && legacy.totalCents < floorCents) {
    flags.push(`Current catalog price (${formatDollarsShort(legacy.totalCents)}) is below the economic floor (${formatDollarsShort(floorCents)}).`);
  }
  if (!empty && legacy.totalCents > 0 && legacy.totalCents < B.minimumTicketCents) {
    flags.push(`Current catalog price (${formatDollarsShort(legacy.totalCents)}) is under the ${formatDollarsShort(B.minimumTicketCents)} minimum job.`);
  }
  const confidence: PricingResult["confidence"] = status === "manual_review_required" || status === "not_supported" || work.items.some((i) => i.confidence === "low") ? "low" : status === "estimate_with_confirmation" ? "medium" : "high";
  if (cfg.calibration === "uncalibrated-default") uncertainties.push("Economics config is uncalibrated defaults; treat internal numbers as estimates until tuned with actuals.");

  // ---- plain-language explanation
  const priceDrivers: PriceDriver[] = [];
  if (!empty) {
    const pctText = (n: number) => `${(n * 100).toFixed(0)}%`;
    why.push(`On-site: ${labor.minutes} min across ${labor.tasks.length} tasks, valued at ${formatDollarsShort(cfg.labor.targetLaborPerHourCents)}/hr = ${formatDollarsShort(labor.ownerCostCents)}.`);
    if (helperPay.mode === "labor_revenue_share") why.push(`Helper: ${helperPay.helperMinutes} min on site, paid ${pctText(share)} of labor revenue (not materials, products or travel fee) = ${formatDollarsShort(helperAtRecommended)} at the recommended price.`);
    else if (helperPay.mode === "hourly") why.push(`Helper: ${helperPay.helperMinutes} min at ${formatDollarsShort(cfg.labor.helperPerHourCents)}/hr = ${formatDollarsShort(helperPay.hourlyCostCents)}.`);
    why.push(`Materials: ${formatDollarsShort(materials.costCents)} at cost, ${formatDollarsShort(materials.chargeCents)} with ${pctText(B.materialMarkupPct)} markup.`);
    why.push(
      `Travel: ${travel.roundTripMiles} mi round trip (${travel.mpg} MPG at ${formatDollarsShort(travel.fuelPricePerGalCents)}/gal reference) = fuel ${formatDollarsShort(travel.fuelCents)} + vehicle ${formatDollarsShort(travel.vehicleCents)} + ${travel.roundTripDriveMinutes} min of owner time ${formatDollarsShort(travel.timeCents)}.`,
    );
    for (const m of schedule.applied) if (m.extraCostCents || m.extraDriveMinutes) why.push(`Schedule (${m.key.replace("_", " ")}): +${formatDollarsShort(m.extraCostCents)} internal cost, +${m.extraDriveMinutes} drive min.`);
    if (overheadCents) why.push(`Business overhead: ${formatDollarsShort(overheadCents)} (per-job plus ${pctText(B.overheadPctOfLabor)} of labor value).`);
    if (work.items.length) why.push(`Work items: ${work.items.map((i) => i.customerText).join("; ")}.`);
    if (siteCount > 1) why.push(`${siteCount} stops: travel covers the drive between sites and the return trip.`);
    if (premium.factors.length) {
      why.push(`Complexity/risk premium +${pctText(premium.pct)} margin on the recommendation: ${premium.factors.map((f) => `${f.label.toLowerCase()} +${pctText(f.pct)} (${f.because})`).join("; ")}${premium.rawPct > premium.pct ? `; capped at ${pctText(premium.pct)}` : ""}.`);
    }
    why.push(`Cost to serve ${formatDollarsShort(costToServeCents)}. Floor ${formatDollarsShort(floorCents)} keeps at least ${pctText(B.minimumMarginPct)} margin, ${formatDollarsShort(B.minimumTripEconomicsCents)} trip economics and the ${formatDollarsShort(B.minimumTicketCents)} minimum job. Recommended ${formatDollarsShort(recommendedCents)} targets ${pctText(B.desiredMarginPct + premium.pct)} margin.`);

    priceDrivers.push({ key: "labor", label: "Your labor", cents: labor.ownerCostCents, detail: `${labor.minutes} min at ${formatDollarsShort(cfg.labor.targetLaborPerHourCents)}/hr` });
    if (helperAtRecommended) priceDrivers.push({ key: "helper", label: "Helper", cents: helperAtRecommended, detail: helperPay.mode === "labor_revenue_share" ? `${pctText(share)} of labor revenue` : `${helperPay.helperMinutes} min hourly` });
    priceDrivers.push({ key: "materials", label: "Materials (charged)", cents: materials.chargeCents, detail: `${formatDollarsShort(materials.costCents)} at cost` });
    priceDrivers.push({ key: "travel", label: "Travel", cents: travel.costCents, detail: `${travel.roundTripMiles} mi · ${travel.roundTripDriveMinutes} min` });
    if (overheadCents) priceDrivers.push({ key: "overhead", label: "Overhead", cents: overheadCents });
    if (schedule.extraCostCents) priceDrivers.push({ key: "schedule", label: "Schedule", cents: schedule.extraCostCents });
    for (const f of premium.factors) priceDrivers.push({ key: `premium.${f.key}`, label: `${f.label} premium`, cents: safeCents(recommendedCents * f.pct), detail: `+${pctText(f.pct)} · ${f.because}` });
  }

  const inputHash = hashObject({ scope, context, configVersion: cfg.version, engine: ENGINE_VERSION });

  return {
    engineVersion: ENGINE_VERSION,
    configVersion: cfg.version,
    configCalibration: cfg.calibration,
    pricingMode: cfg.pricingMode,
    inputHash,
    empty,
    labor: reportedLabor,
    materials,
    travel,
    scheduleModifiers: schedule.applied,
    scheduleCostCents: schedule.extraCostCents,
    overheadCents,
    outOfPocketCents,
    outOfPocketExHelperCents,
    ownerValueCents,
    costToServeCents,
    helperPay,
    premium,
    priceDrivers,
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
  /** Helper pay at this price (labor-revenue share or hourly). */
  helperCostCents: Cents;
  /** Cash-ish costs at this price: materials, fuel, vehicle, overhead, helper. */
  outOfPocketCents: Cents;
  /** Out-of-pocket plus owner time valued at the configured rates. */
  costToServeCents: Cents;
  /** Price minus out-of-pocket: what the owner keeps for their time (labor + driving). */
  ownerNetCents: number;
  grossProfitCents: Cents;
  /** Profit after valuing owner time. Can be negative; labelled as an estimate. */
  marginCents: number;
  marginPct: number;
  /** Owner net per hour of owner time (on-site + driving). */
  effectiveGrossPerHourCents: Cents;
  belowFloor: boolean;
  estimate: true;
}

/** Estimated economics if the customer pays priceCents (customer total). Always an estimate. */
export function economicsAtPrice(result: PricingResult, priceCents: Cents): EconomicsAtPrice {
  const price = safeCents(priceCents);
  const helper = result.empty ? 0 : helperCostAt(result.helperPay, price);
  const outOfPocket = result.outOfPocketExHelperCents + helper;
  const costToServe = outOfPocket + result.ownerValueCents;
  const marginCents = price - costToServe;
  const marginPct = price > 0 ? marginCents / price : 0;
  const hours = result.totalOwnerMinutes / 60;
  const gross = price - outOfPocket;
  return {
    priceCents: price,
    helperCostCents: helper,
    outOfPocketCents: outOfPocket,
    costToServeCents: costToServe,
    ownerNetCents: gross,
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
