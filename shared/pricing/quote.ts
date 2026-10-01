import { z } from "zod";
import type { EconomicsConfig } from "./config";
import { economicsAtPrice, priceScope, type EconomicsAtPrice, type PricingResult } from "./engine";
import { safeCents, type Cents } from "./money";
import { hashObject } from "./hash";
import type { JobContextInput, JobScopeInput } from "./scope";

// Quote composition: turns an internal PricingResult plus an optional owner adjustment
// into a customer amount and customer-safe line items. Adjustments are a discriminated
// union so an override and a discount can never stack ("no duplicate discounts").

export const ADJUSTMENT_REASONS = ["courtesy", "returning_customer", "competitive", "scope_uncertainty", "bundle", "other"] as const;
export type AdjustmentReason = (typeof ADJUSTMENT_REASONS)[number];

const reasonFields = {
  reason: z.enum(ADJUSTMENT_REASONS),
  /** Required when reason is "other". Short, factual, work-related. Never about the customer as a person. */
  note: z.string().max(200).optional(),
};

export const ownerAdjustmentSchema = z
  .discriminatedUnion("type", [
    z.object({ type: z.literal("override"), amountCents: z.number().int().min(0).max(10_000_000), acknowledgeDeepDiscount: z.boolean().optional(), ...reasonFields }),
    z.object({ type: z.literal("discount"), discountCents: z.number().int().min(1).max(10_000_000), ...reasonFields }),
  ])
  .superRefine((value, ctx) => {
    if (value.reason === "other" && (!value.note || value.note.trim().length < 3)) {
      ctx.addIssue({ code: "custom", path: ["note"], message: "A short note is required when reason is 'other'" });
    }
  });

export type OwnerAdjustment = z.infer<typeof ownerAdjustmentSchema>;

export interface CustomerLine {
  label: string;
  detail?: string;
  /** null means "custom quote / we'll confirm", never a made-up number. */
  amountCents: Cents | null;
}

export interface QuoteComposition {
  pricing: PricingResult;
  /** Customer amount before any owner adjustment (legacy catalog or engine recommendation). */
  baseCustomerCents: Cents;
  baseSource: "legacy_catalog" | "engine_recommended";
  adjustment: OwnerAdjustment | null;
  /** Positive number: how much the adjustment reduced the base (0 if none or if it raised it). */
  discountAppliedCents: Cents;
  customerTotalCents: Cents;
  customerLines: CustomerLine[];
  /** True when the catalog cannot fully price the scope or key facts are unconfirmed. */
  requiresReview: boolean;
  economics: EconomicsAtPrice;
  belowFloor: boolean;
  internalFlags: string[];
}

export class QuotePolicyError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "QuotePolicyError";
  }
}

function allocateDynamicLines(pricing: PricingResult, totalCents: Cents): CustomerLine[] {
  // Spread the dynamic price over the real scope groups by their weight (minutes + materials).
  const groups = new Map<string, { label: string; weight: number }>();
  for (const task of pricing.labor.tasks) {
    const m = /^(tv\d+)\./.exec(task.key);
    const w = /^(item\d+)\./.exec(task.key);
    const key = m ? m[1]! : w ? w[1]! : task.key.startsWith("extra") ? task.key : "visit";
    const label = m
      ? `TV ${m[1]!.slice(2)} installation`
      : w
        ? pricing.work.items[Number(w[1]!.slice(4)) - 1]?.customerText ?? task.label
        : key === "visit"
          ? "Visit, setup and cleanup"
          : task.label;
    const entry = groups.get(key) ?? { label, weight: 0 };
    entry.weight += task.minutes * 100;
    groups.set(key, entry);
  }
  for (const line of pricing.materials.lines) {
    const idx = line.itemId ? pricing.work.items.findIndex((i) => i.itemId === line.itemId) : -1;
    const key = idx >= 0 && groups.has(`item${idx + 1}`) ? `item${idx + 1}` : groups.has("tv1") ? "tv1" : "visit";
    const entry = groups.get(key) ?? groups.get("visit");
    if (entry) entry.weight += line.costCents;
  }
  const entries = Array.from(groups.values());
  const totalWeight = entries.reduce((s, e) => s + e.weight, 0) || 1;
  let allocated = 0;
  return entries.map((e, i) => {
    const amount = i === entries.length - 1 ? totalCents - allocated : Math.round((totalCents * e.weight) / totalWeight);
    allocated += amount;
    return { label: e.label, amountCents: Math.max(0, amount) };
  });
}

export function composeQuote(args: {
  scope: JobScopeInput;
  context?: JobContextInput;
  config: EconomicsConfig;
  adjustment?: unknown;
}): QuoteComposition {
  const { config } = args;
  const pricing = priceScope(args.scope, args.context, config);
  const adjustment = args.adjustment ? ownerAdjustmentSchema.parse(args.adjustment) : null;
  const internalFlags = [...pricing.flags];

  // Review gates. Regulated, structural or oversized work must never be quoted like ordinary mounting.
  if (pricing.status === "not_supported") {
    const why = pricing.statusReasons.filter((r) => r.severity === "not_supported").map((r) => r.message).join("; ");
    throw new QuotePolicyError(`This scope includes work PPTV does not do: ${why}`, "NOT_SUPPORTED");
  }
  if (pricing.status === "manual_review_required" && adjustment?.type !== "override") {
    const why = pricing.statusReasons.filter((r) => r.severity === "manual_review").map((r) => r.message).join("; ");
    throw new QuotePolicyError(`Manual review required before quoting: ${why}. After review, set the price with an owner override.`, "MANUAL_REVIEW_REQUIRED");
  }

  const dynamic = config.pricingMode === "dynamic";
  const baseSource = dynamic ? "engine_recommended" : "legacy_catalog";
  const baseCents = dynamic ? pricing.recommendedCents : pricing.legacy.totalCents;
  const feeCents = pricing.customerTravelFeeCents + pricing.customerScheduleSurchargeCents;
  const subtotalCents = baseCents + feeCents;

  let customerLines: CustomerLine[] = [];
  if (dynamic) {
    customerLines = allocateDynamicLines(pricing, baseCents);
  } else {
    for (const g of pricing.legacy.groups) {
      for (const item of g.items) {
        if (item.lineTotalCents > 0) customerLines.push({ label: item.name, detail: g.title, amountCents: item.lineTotalCents });
      }
    }
    for (const name of pricing.legacy.customQuoteItems) customerLines.push({ label: name, amountCents: null });
  }
  if (pricing.customerTravelFeeCents > 0) customerLines.push({ label: "Travel", amountCents: pricing.customerTravelFeeCents });
  if (pricing.customerScheduleSurchargeCents > 0) customerLines.push({ label: "Scheduling", amountCents: pricing.customerScheduleSurchargeCents });

  let customerTotalCents = subtotalCents;
  let discountAppliedCents = 0;

  if (adjustment) {
    if (adjustment.type === "discount") {
      const cap = Math.floor(subtotalCents * config.business.maxDiscountPct);
      if (adjustment.discountCents > cap) {
        throw new QuotePolicyError(`Discount exceeds policy maximum of ${(config.business.maxDiscountPct * 100).toFixed(0)}% of the quote`, "DISCOUNT_EXCEEDS_POLICY");
      }
      if (adjustment.discountCents > subtotalCents) {
        throw new QuotePolicyError("Discount cannot exceed the quote total", "DISCOUNT_EXCEEDS_TOTAL");
      }
      discountAppliedCents = adjustment.discountCents;
      customerTotalCents = subtotalCents - adjustment.discountCents;
      customerLines.push({ label: "Adjustment", amountCents: -adjustment.discountCents });
    } else {
      const deepFloor = Math.floor(subtotalCents * (1 - config.business.maxDiscountPct));
      if (adjustment.amountCents < deepFloor && !adjustment.acknowledgeDeepDiscount) {
        throw new QuotePolicyError("Override is below the maximum discount policy; set acknowledgeDeepDiscount to confirm", "OVERRIDE_BELOW_POLICY");
      }
      customerTotalCents = adjustment.amountCents;
      discountAppliedCents = Math.max(0, subtotalCents - adjustment.amountCents);
      const delta = adjustment.amountCents - subtotalCents;
      if (delta !== 0) customerLines.push({ label: pricing.legacy.customQuoteItems.length > 0 && delta > 0 ? "Work priced after review" : "Adjustment", amountCents: delta });
    }
  }

  customerTotalCents = safeCents(customerTotalCents);
  const economics = economicsAtPrice(pricing, customerTotalCents);
  if (economics.belowFloor) internalFlags.push(`Customer amount is below the economic floor by ${(pricing.floorCents - customerTotalCents) / 100} dollars.`);

  const requiresReview =
    pricing.empty ||
    pricing.status !== "priced" ||
    pricing.legacy.customQuoteItems.length > 0 ||
    pricing.uncertainties.some((u) => /unknown|not verified|unverified/i.test(u));

  return {
    pricing,
    baseCustomerCents: baseCents,
    baseSource,
    adjustment,
    discountAppliedCents,
    customerTotalCents,
    customerLines,
    requiresReview,
    economics,
    belowFloor: economics.belowFloor,
    internalFlags,
  };
}

/** Immutable snapshot persisted for each quote version. Historical economics are never recomputed in place. */
export interface QuoteSnapshot {
  scope: JobScopeInput;
  context: JobContextInput;
  configVersion: number;
  configCalibration: EconomicsConfig["calibration"];
  pricingMode: EconomicsConfig["pricingMode"];
  engineVersion: string;
  inputHash: string;
  snapshotHash: string;
  composition: QuoteComposition;
}

export function snapshotQuote(args: { scope: JobScopeInput; context?: JobContextInput; config: EconomicsConfig; adjustment?: unknown }): QuoteSnapshot {
  const composition = composeQuote(args);
  const body = {
    scope: args.scope,
    context: args.context ?? {},
    configVersion: args.config.version,
    configCalibration: args.config.calibration,
    pricingMode: args.config.pricingMode,
    engineVersion: composition.pricing.engineVersion,
    inputHash: composition.pricing.inputHash,
    composition,
  };
  return { ...body, snapshotHash: hashObject(body) };
}
