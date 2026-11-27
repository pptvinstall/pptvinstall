import { z } from "zod";
import { calculateQuote, type QuoteFormState } from "../../client/src/lib/quote-calculator";
import { buildAugmentedQuote, type StandaloneServices } from "../../client/src/components/ui/quote-tool/shared";
import { toCents, type Cents } from "./money";
import { parseJobScope, type JobContextInput, type JobScope } from "./scope";
import type { WorkItemInput } from "./work";

// The public /quote tool's inputs, validated, and the two prices that can be shown for them:
//  - the CATALOG price: exactly what the browser calculator shows today (calculateQuote + standalone services);
//  - the ENGINE view: the same request as a structured JobScope for Pricing Engine V2.
// Nothing here is customer-identifying: the customer's free-text notes are deliberately not accepted.

const tvSchema = z
  .object({
    id: z.string().min(1).max(80),
    size: z.enum(["32-55", "56+"]),
    wallType: z.enum(["drywall", "brick", "highrise"]),
    location: z.enum(["standard", "fireplace"]),
    hasMount: z.boolean(),
    mountType: z.enum(["fixed", "tilting", "fullMotion"]).nullable(),
    wireConcealment: z.boolean(),
    outletDistance: z.enum(["near", "far"]).nullable(),
    unmounting: z.boolean(),
    /** Explicit 56"+ size-range answer (Issue #35 size gate): "86+" is oversize, "unsure" routes to review. */
    sizeChoice: z.enum(["56-85", "86+", "unsure"]).nullable().optional(),
    /** Exact diagonal (owner rule S-4): 86"+ routes the TV to custom-quote review. */
    exactInches: z.number().int().min(19).max(120).nullable().optional(),
    /** Exact model / weight / VESA collected for the oversize compatibility review. */
    model: z.string().max(120).nullable().optional(),
    weightLbs: z.number().min(0).max(400).nullable().optional(),
    vesaPattern: z.string().max(40).nullable().optional(),
  })
  .strip();

const moveProjectSchema = z.object({
  enabled: z.boolean().default(false),
  previousZipCode: z.string().regex(/^(\d{5})?$/).default(""),
  oldHomeTvUnmountCount: z.number().int().min(0).max(20).default(0),
  oldHomeMountRemovalCount: z.number().int().min(0).max(20).default(0),
  rackTeardownLevel: z.enum(["none", "small", "medium", "large"]).default("none"),
});

const cameraSchema = z
  .object({
    id: z.string().min(1).max(80),
    brand: z.enum(["ring", "blink", "google", "arlo", "wyze", "other"]),
    type: z.enum(["wireless_smart", "wired_smart", "wired_dvr"]),
    location: z.enum(["indoor", "outdoor"]),
  })
  .strip();

export const publicQuoteFormSchema = z
  .object({
    tvs: z.array(tvSchema).max(12),
    cameras: z.array(cameraSchema).max(20),
    doorbell: z.boolean(),
    doorbellBrand: z.string().max(40).default(""),
    soundbar: z.boolean(),
    surroundSound: z.boolean(),
    floodlight: z.boolean(),
    handymanMinutes: z.number().int().min(0).max(600),
    moveProject: moveProjectSchema.default({ enabled: false, previousZipCode: "", oldHomeTvUnmountCount: 0, oldHomeMountRemovalCount: 0, rackTeardownLevel: "none" }),
    zipCode: z.string().regex(/^(\d{5})?$/),
  })
  .strip();

export const publicStandaloneSchema = z
  .object({
    removalCount: z.number().int().min(0).max(20),
    troubleshootingMinutes: z.number().int().min(0).max(600),
    wireManagementLocations: z.number().int().min(0).max(20),
    deviceSetup: z.boolean(),
    sharedUnmountCount: z.number().int().min(0).max(20),
  })
  .strip();

export const publicQuoteRequestSchema = z
  .object({
    form: publicQuoteFormSchema,
    standalone: publicStandaloneSchema.default({ removalCount: 0, troubleshootingMinutes: 0, wireManagementLocations: 0, deviceSetup: false, sharedUnmountCount: 0 }),
    /** "live" = sticky total while building (never stored); "review" = the customer asked for their quote. */
    stage: z.enum(["live", "review"]).default("live"),
  })
  .strict();
export type PublicQuoteRequest = z.infer<typeof publicQuoteRequestSchema>;

function toFormState(form: PublicQuoteRequest["form"]): QuoteFormState {
  return {
    ...form,
    // Issue #35 size gate: at the public boundary an omitted size answer for a
    // 56"+ TV means the size is unconfirmed — normalize it to an explicit
    // "unsure" so the catalog calculator routes the TV to review instead of
    // silently instant-pricing what could be a 98" TV. Contradictory answers
    // pass through untouched; the calculator flags them as contradictions.
    tvs: form.tvs.map((tv) => ({
      ...tv,
      sizeChoice:
        tv.size === "56+" && typeof tv.exactInches !== "number" && tv.sizeChoice == null
          ? ("unsure" as const)
          : tv.sizeChoice ?? null,
    })),
    moveProject: form.moveProject ?? { enabled: false, previousZipCode: "", oldHomeTvUnmountCount: 0, oldHomeMountRemovalCount: 0, rackTeardownLevel: "none" },
    notes: "",
  };
}

/** The full deterministic catalog quote (browser calculator + standalone services) for a public request. */
export function catalogPublicQuoteResult(req: Pick<PublicQuoteRequest, "form" | "standalone">) {
  return buildAugmentedQuote(calculateQuote(toFormState(req.form)), req.standalone as StandaloneServices);
}

/** Exactly what the browser calculator shows the customer today, in cents. */
export function catalogPublicQuote(req: Pick<PublicQuoteRequest, "form" | "standalone">): { totalCents: Cents; hasCustomQuoteLines: boolean; flags: string[]; requiresReview: boolean; reviewReasons: string[] } {
  const quote = catalogPublicQuoteResult(req);
  const hasCustomQuoteLines = quote.groups.some((g) => g.items.some((i) => i.lineTotal === 0 && /custom quote|review|assessment/i.test(i.name)));
  return {
    totalCents: toCents(quote.total),
    hasCustomQuoteLines,
    flags: quote.flags,
    requiresReview: quote.requiresReview ?? false,
    reviewReasons: quote.reviewReasons ?? [],
  };
}

/** The same public request as structured scope for the engine. Only facts the customer chose; nothing invented. */
export function publicRequestToScope(req: Pick<PublicQuoteRequest, "form" | "standalone">): JobScope {
  const { form, standalone } = req;
  const move = form.moveProject ?? { enabled: false, previousZipCode: "", oldHomeTvUnmountCount: 0, oldHomeMountRemovalCount: 0, rackTeardownLevel: "none" as const };
  const newHomeSite = move.enabled ? 1 : 0;
  const tvs: JobScope["tvs"] = form.tvs.map((tv) => {
    const hasInches = typeof tv.exactInches === "number";
    const bandAgrees = !hasInches || tv.exactInches! < 32 || (tv.exactInches! >= 56) === (tv.size === "56+");
    const choiceContradicts =
      (tv.sizeChoice === "56-85" && hasInches && tv.exactInches! >= 86) ||
      (tv.sizeChoice === "86+" && hasInches && tv.exactInches! < 86) ||
      (tv.sizeChoice != null && tv.size === "32-55");
    // Issue #35 size gate: a contradictory size answer is never silently
    // dropped and priced — the inches are withheld from the engine (the scope
    // schema would reject the pair) and the TV is marked size-unconfirmed so
    // every channel routes it to review.
    const contradictory = hasInches && (!bandAgrees || choiceContradicts);
    return {
    id: tv.id.slice(0, 64),
    site: newHomeSite,
    sizeBand: tv.size,
    // Owner rule S-4: carry the exact diagonal into the engine scope so the ≥86"
    // gate can fire. Only pass it when it agrees with the size band — the scope
    // schema rejects a disagreeing inches/band pair, and a bad pair must never
    // break public pricing.
    inches: !contradictory && bandAgrees && hasInches ? tv.exactInches! : undefined,
    sizeChoice:
      tv.size !== "56+"
        ? undefined
        : contradictory
          ? ("unsure" as const)
          : (tv.sizeChoice ?? (hasInches ? undefined : ("unsure" as const))),
    wall: tv.wallType === "highrise" ? "steel" : tv.wallType,
    location: tv.location,
    mountSource: tv.hasMount ? "customer" : "pptv",
    mountType: tv.hasMount ? null : tv.mountType === "tilting" ? "tilt" : tv.mountType === "fullMotion" ? "full_motion" : "fixed",
    wire: "visible",
    // Concealment in the public tool is the outlet / clean-cord kit; a far outlet stays an outlet job with a question.
    power: tv.wireConcealment ? "outlet" : "existing",
    removal: { tvRemoval: tv.unmounting, mountRemoval: false, remount: false },
    };
  });
  const extras: JobScope["extras"] = [];
  if (form.soundbar) extras.push({ kind: "soundbar", qty: 1 });
  if (form.doorbell) extras.push({ kind: "doorbell", qty: 1 });
  if (form.floodlight) extras.push({ kind: "floodlight", qty: 1 });
  if (form.cameras.length) extras.push({ kind: "camera", qty: Math.min(20, form.cameras.length) });
  if (form.handymanMinutes > 0) extras.push({ kind: "specialty", qty: 1 });
  if (standalone.troubleshootingMinutes > 0) extras.push({ kind: "av", qty: 1, label: "AV troubleshooting" });
  if (standalone.deviceSetup) extras.push({ kind: "av", qty: 1, label: "Device setup" });
  if (standalone.wireManagementLocations > 0) {
    extras.push({ kind: "custom", qty: Math.min(20, standalone.wireManagementLocations), label: "Cable / device cleanup", customMinutes: 30 });
  }
  const items: WorkItemInput[] = [];
  const takeDowns = standalone.removalCount + standalone.sharedUnmountCount;
  if (takeDowns > 0) items.push({ id: "public-unmount", action: "unmount", category: "tv", quantity: Math.min(50, takeDowns), name: "TV", site: newHomeSite, ownerMinutesPerUnit: 15, weightLb: 20 });

  if (move.enabled) {
    if (move.oldHomeTvUnmountCount > 0) {
      items.push({ id: "move-old-tv-unmount", action: "unmount", category: "tv", quantity: move.oldHomeTvUnmountCount, name: "Previous-home TV", site: 0, ownerMinutesPerUnit: 15, weightLb: 20 });
    }
    if (move.oldHomeMountRemovalCount > 0) {
      items.push({ id: "move-old-mount-removal", action: "remove", category: "tv", quantity: move.oldHomeMountRemovalCount, name: "Existing TV mount / wall hardware", site: 0, ownerMinutesPerUnit: 20, weightLb: 10 });
    }
    if (move.rackTeardownLevel !== "none") {
      const minutes = { small: 60, medium: 120, large: 180 }[move.rackTeardownLevel];
      items.push({ id: "move-rack-teardown", action: "teardown", category: "wall_shelving", quantity: 1, name: "Wire-rack shelving", site: 0, ownerMinutesPerUnit: minutes, weightLb: 10 });
    }
  }

  if (form.surroundSound) items.push({ id: "public-surround", action: "install", category: "speaker", name: "Surround sound", quantity: 1, site: newHomeSite });
  return parseJobScope({ tvs, extras, items });
}

export function publicRequestToContext(req: Pick<PublicQuoteRequest, "form">): JobContextInput {
  const move = req.form.moveProject ?? { enabled: false, previousZipCode: "", oldHomeTvUnmountCount: 0, oldHomeMountRemovalCount: 0, rackTeardownLevel: "none" as const };
  if (!move.enabled) return req.form.zipCode ? { zip: req.form.zipCode } : {};
  const baseZip = move.previousZipCode || req.form.zipCode;
  return {
    ...(baseZip ? { zip: baseZip } : {}),
    extraStops: [{ label: req.form.zipCode ? `New home ${req.form.zipCode}` : "New home" }],
  };
}
