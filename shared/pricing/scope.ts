import { z } from "zod";
import { workItemSchema } from "./work";

// Structured job scope. This is the ONLY input the pricing engine accepts.
// Free text, photos and AI output must be reduced to this shape (and validated)
// before any money math happens. There are intentionally no fields about the
// customer as a person: price is a function of the work, the route and the
// schedule, never of who the customer is.

export const SIZE_BANDS = ["32-55", "56+"] as const;
export const WALL_TYPES = ["drywall", "brick", "stone", "steel", "unknown"] as const;
export const TV_LOCATIONS = ["standard", "fireplace", "high_wall"] as const;
export const MOUNT_SOURCES = ["customer", "pptv"] as const;
export const MOUNT_TYPES = ["fixed", "tilt", "full_motion"] as const;
export const WIRE_MODES = ["visible", "raceway", "in_wall"] as const;
export const POWER_MODES = ["existing", "outlet", "unknown"] as const;
export const EXTRA_KINDS = [
  "soundbar",
  "shelf",
  "artwork",
  "camera",
  "doorbell",
  "floodlight",
  "av",
  "specialty",
  "custom",
] as const;
export const ACCESS_LEVELS = ["normal", "difficult"] as const;
export const CLEANUP_LEVELS = ["standard", "patching", "haul_away"] as const;

export type SizeBand = (typeof SIZE_BANDS)[number];
export type WallType = (typeof WALL_TYPES)[number];
export type TvLocation = (typeof TV_LOCATIONS)[number];
export type MountSource = (typeof MOUNT_SOURCES)[number];
export type MountType = (typeof MOUNT_TYPES)[number];
export type WireMode = (typeof WIRE_MODES)[number];
export type PowerMode = (typeof POWER_MODES)[number];
export type ExtraKind = (typeof EXTRA_KINDS)[number];

export const tvScopeSchema = z
  .object({
    id: z.string().min(1).max(64).default("tv-1"),
    /** 0 = first address; 1.. = extra stops (see JobContext.extraStops). */
    site: z.number().int().min(0).max(4).default(0),
    sizeBand: z.enum(SIZE_BANDS).default("56+"),
    /** Exact diagonal, optional. When present it must agree with the size band. */
    inches: z.number().int().min(19).max(120).optional(),
    wall: z.enum(WALL_TYPES).default("drywall"),
    location: z.enum(TV_LOCATIONS).default("standard"),
    mountSource: z.enum(MOUNT_SOURCES).default("customer"),
    /** Required when mountSource is "pptv". Optional detail otherwise. */
    mountType: z.enum(MOUNT_TYPES).nullable().default(null),
    wire: z.enum(WIRE_MODES).default("visible"),
    power: z.enum(POWER_MODES).default("existing"),
    removal: z
      .object({
        tvRemoval: z.boolean().default(false),
        mountRemoval: z.boolean().default(false),
        remount: z.boolean().default(false),
      })
      .default({ tvRemoval: false, mountRemoval: false, remount: false }),
  })
  .superRefine((tv, ctx) => {
    if (tv.mountSource === "pptv" && !tv.mountType) {
      ctx.addIssue({ code: "custom", path: ["mountType"], message: "mountType is required when PPTV supplies the mount" });
    }
    if (tv.inches !== undefined) {
      const band: SizeBand = tv.inches >= 56 ? "56+" : "32-55";
      if (tv.inches >= 32 && band !== tv.sizeBand) {
        ctx.addIssue({ code: "custom", path: ["inches"], message: `inches (${tv.inches}) disagrees with sizeBand ${tv.sizeBand}` });
      }
    }
  });

export const extraScopeSchema = z.object({
  kind: z.enum(EXTRA_KINDS),
  qty: z.number().int().min(1).max(20).default(1),
  label: z.string().max(120).optional(),
  /** Only honoured for kind "custom"; other kinds use configured minutes. */
  customMinutes: z.number().min(0).max(600).optional(),
  customMaterialsCents: z.number().int().min(0).max(500_000).optional(),
});

export const accessScopeSchema = z
  .object({
    level: z.enum(ACCESS_LEVELS).default("normal"),
    furnitureMovement: z.boolean().default(false),
    ladderHeight: z.boolean().default(false),
    helper: z.boolean().default(false),
  })
  .default({ level: "normal", furnitureMovement: false, ladderHeight: false, helper: false });

export const jobScopeSchema = z
  .object({
    tvs: z.array(tvScopeSchema).max(12).default([]),
    extras: z.array(extraScopeSchema).max(20).default([]),
    /** Universal work items (any mount/install/assemble/remove/disassemble work). TVs may also appear here via the tv extension. */
    items: z.array(workItemSchema).max(60).default([]),
    access: accessScopeSchema,
    cleanup: z.enum(CLEANUP_LEVELS).default("standard"),
  })
  .superRefine((scope, ctx) => {
    const seen = new Set<string>();
    scope.items.forEach((item, i) => {
      if (seen.has(item.id)) ctx.addIssue({ code: "custom", path: ["items", i, "id"], message: `duplicate item id "${item.id}"` });
      seen.add(item.id);
    });
  });

export type TvScope = z.infer<typeof tvScopeSchema>;
export type ExtraScope = z.infer<typeof extraScopeSchema>;
export type JobScope = z.infer<typeof jobScopeSchema>;
export type JobScopeInput = z.input<typeof jobScopeSchema>;

export function parseJobScope(input: unknown): JobScope {
  return jobScopeSchema.parse(input);
}

export const SCHEDULE_MODIFIERS = ["rush_hour", "same_day", "late_evening", "weekend", "awkward_gap"] as const;
export type ScheduleModifier = (typeof SCHEDULE_MODIFIERS)[number];

/** Where and when the work happens. Distances come from an owner-entered value or a route provider. */
export const jobContextSchema = z.object({
  zip: z.string().regex(/^\d{5}$/).optional(),
  oneWayMiles: z.number().min(0).max(500).optional(),
  oneWayDriveMinutes: z.number().min(0).max(600).optional(),
  /** Free-form origin label for the audit trail (e.g. "Midtown" / "Decatur"). */
  origin: z.string().max(80).optional(),
  /** Local appointment time as HH:MM (24h) and weekday 0-6 so the engine never needs a clock. */
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  weekday: z.number().int().min(0).max(6).optional(),
  sameDay: z.boolean().default(false),
  awkwardGap: z.boolean().default(false),
  /** Where oneWayMiles/oneWayDriveMinutes came from. Absent = owner input. */
  routeSource: z.enum(["owner_input", "provider", "reference_table"]).optional(),
  /** Which provider / table supplied the route, and as of when (timestamps make cached data honest). */
  routeProvider: z.string().max(40).optional(),
  routeAsOf: z.string().max(40).optional(),
  /** Manual traffic multiplier supplied by owner or a provider. Clamped by config. */
  trafficMultiplier: z.number().min(0.5).max(5).optional(),
  /**
   * Additional work sites after the first (e.g. the new address of a move). Items reference them by
   * `site` (1-based). legMiles/legMinutes: drive from the previous site. returnMiles/returnMinutes:
   * drive home from the LAST stop (defaults to the first site's one-way distance).
   */
  extraStops: z
    .array(
      z.object({
        label: z.string().max(80).optional(),
        legMiles: z.number().min(0).max(500).optional(),
        legMinutes: z.number().min(0).max(600).optional(),
        returnMiles: z.number().min(0).max(500).optional(),
        returnMinutes: z.number().min(0).max(600).optional(),
      }),
    )
    .max(4)
    .default([]),
});

export type JobContext = z.infer<typeof jobContextSchema>;
export type JobContextInput = z.input<typeof jobContextSchema>;

export function parseJobContext(input: unknown): JobContext {
  return jobContextSchema.parse(input ?? {});
}
