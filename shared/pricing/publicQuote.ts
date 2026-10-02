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
    moveProject: form.moveProject ?? { enabled: false, previousZipCode: "", oldHomeTvUnmountCount: 0, oldHomeMountRemovalCount: 0, rackTeardownLevel: "none" },
    notes: "",
  };
}

/** Exactly what the browser calculator shows the customer today, in cents. */
export function catalogPublicQuote(req: Pick<PublicQuoteRequest, "form" | "standalone">): { totalCents: Cents; hasCustomQuoteLines: boolean; flags: string[] } {
  const quote = buildAugmentedQuote(calculateQuote(toFormState(req.form)), req.standalone as StandaloneServices);
  const hasCustomQuoteLines = quote.groups.some((g) => g.items.some((i) => i.lineTotal === 0 && /custom quote|review|assessment/i.test(i.name)));
  return { totalCents: toCents(quote.total), hasCustomQuoteLines, flags: quote.flags };
}

/** The same public request as structured scope for the engine. Only facts the customer chose; nothing invented. */
export function publicRequestToScope(req: Pick<PublicQuoteRequest, "form" | "standalone">): JobScope {
  const { form, standalone } = req;
  const move = form.moveProject ?? { enabled: false, previousZipCode: "", oldHomeTvUnmountCount: 0, oldHomeMountRemovalCount: 0, rackTeardownLevel: "none" as const };
  const newHomeSite = move.enabled ? 1 : 0;
  const tvs: JobScope["tvs"] = form.tvs.map((tv) => ({
    id: tv.id.slice(0, 64),
    site: newHomeSite,
    sizeBand: tv.size,
    wall: tv.wallType === "highrise" ? "steel" : tv.wallType,
    location: tv.location,
    mountSource: tv.hasMount ? "customer" : "pptv",
    mountType: tv.hasMount ? null : tv.mountType === "tilting" ? "tilt" : tv.mountType === "fullMotion" ? "full_motion" : "fixed",
    wire: "visible",
    // Concealment in the public tool is the outlet / clean-cord kit; a far outlet stays an outlet job with a question.
    power: tv.wireConcealment ? "outlet" : "existing",
    removal: { tvRemoval: tv.unmounting, mountRemoval: false, remount: false },
  }));
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
