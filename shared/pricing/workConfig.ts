import { z } from "zod";
import { ATTACHMENTS, DISPOSALS, HELPER_MODES, HARDWARE_COMPLEXITY, INSTRUCTIONS, PREMIUM_FACTORS, RELOCATIONS, RESTORATIONS, RISK_FLAGS, SURFACES, WORK_ACTIONS, workAssemblySchema } from "./work";

// Work-model configuration: taxonomy, templates, labor assumptions, complexity bands,
// material recipes and review limits. All of it is owner-editable data inside the versioned,
// audited economics config. EVERY DEFAULT BELOW IS AN UNCALIBRATED STARTING ASSUMPTION,
// not a measured fact; the actuals loop is how they get tuned.

const slug = z.string().regex(/^[a-z0-9_]{1,40}$/);
const cents = z.number().int().min(0).max(10_000_000);
const minutes = z.number().min(0).max(1_000);
const actionMinutes = z.record(z.enum(WORK_ACTIONS), minutes);

/** Object with every key required (z.record over an enum yields optional keys in Zod 3). */
function full<K extends string, V extends z.ZodTypeAny>(keys: readonly K[], value: V) {
  return z.object(Object.fromEntries(keys.map((k) => [k, value])) as Record<K, V>).strict();
}

/**
 * A site condition that must be true before the work is safe/in scope (e.g. "existing light fixture in place",
 * "fan-rated box", "ceiling joist verified"). The item records the answer in `conditions[key]`:
 * yes = fine; unknown = whenUnknown; no = whenNo. Owner-editable data, so new safety rules need no code.
 */
export const prerequisiteSchema = z
  .object({
    key: slug,
    label: z.string().min(1).max(80),
    /** Asked when the answer is unknown. */
    question: z.string().min(1).max(200),
    whenUnknown: z.enum(["confirm", "manual_review"]),
    whenNo: z.enum(["confirm", "manual_review", "not_supported"]),
    /** Explanation used when the answer is "no". */
    noMessage: z.string().min(1).max(200),
    /** Actions it applies to. Default: actions that put something in place (mount, install, remount, relocate). */
    actions: z.array(z.enum(WORK_ACTIONS)).max(11).optional(),
    /** Customer-safe condition shown on quotes when the prerequisite applies. */
    customerNote: z.string().max(200).optional(),
  })
  .strict();
export type Prerequisite = z.infer<typeof prerequisiteSchema>;

export const categorySchema = z.object({
  label: z.string().min(1).max(60),
  group: z.string().min(1).max(40),
  /** When true and weight is unknown for hanging/lifting work, the engine asks instead of guessing. */
  weightRelevant: z.boolean(),
  /** Words the offline intake parser may use to recognise this category. */
  keywords: z.array(z.string().min(1).max(40)).max(20),
  /** Per-unit base minutes for specific actions. Anything missing is derived by the engine. */
  actionMinutes: actionMinutes.optional(),
  /** Complexity/risk premium factors this kind of work always carries (e.g. electrical). */
  premiumFactors: z.array(z.enum(PREMIUM_FACTORS)).max(6).optional(),
  /** Safety / scope prerequisites for this kind of work. */
  prerequisites: z.array(prerequisiteSchema).max(8).optional(),
  /** True when this category's own prerequisites already cover the mounting surface (e.g. a fan-rated box on a ceiling). */
  skipSurfacePrerequisites: z.boolean().optional(),
});

export const recipeLineSchema = z.object({
  label: z.string().min(1).max(80),
  qty: z.number().min(0).max(1_000),
  unitCostCents: cents,
  /** Hardware is not charged when the customer supplies the hardware. Consumables always are. */
  kind: z.enum(["hardware", "consumable"]),
});

export const templateDefaultsSchema = z
  .object({
    surface: z.enum(SURFACES).optional(),
    attachment: z.enum(ATTACHMENTS).optional(),
    helper: z.enum(HELPER_MODES).optional(),
    hardwareSuppliedBy: z.enum(["customer", "pptv", "included", "unknown"]).optional(),
    dimensions: z.object({ widthIn: z.number().optional(), heightIn: z.number().optional(), depthIn: z.number().optional() }).optional(),
    weightLb: z.number().min(0.01).max(5_000).optional(),
    assembly: workAssemblySchema.partial().optional(),
    restoration: z.enum(RESTORATIONS).optional(),
    disposal: z.array(z.enum(DISPOSALS)).max(4).optional(),
    riskFlags: z.array(z.enum(RISK_FLAGS)).max(RISK_FLAGS.length).optional(),
  })
  .strict();

export const workTemplateSchema = z.object({
  label: z.string().min(1).max(80),
  customerLabel: z.string().max(80).optional(),
  category: slug,
  subcategory: z.string().max(60).optional(),
  /** Action the builder pre-selects. */
  action: z.enum(WORK_ACTIONS),
  thenAction: z.enum(WORK_ACTIONS).optional(),
  /** Per-unit minutes by action. Overrides the category and derived values. */
  laborMinutes: actionMinutes.optional(),
  /** Material recipe ids (from work.recipes), applied per unit. */
  recipes: z.array(slug).max(10),
  /** Owner-defined price per unit. Optional: most templates feed the engine and carry no price. */
  fixedPriceCents: cents.optional(),
  defaults: templateDefaultsSchema.optional(),
  notes: z.string().max(200).optional(),
  /** Template-specific prerequisites (override the category's prerequisite with the same key). */
  prerequisites: z.array(prerequisiteSchema).max(8).optional(),
});

const bandSchema = z.object({
  key: slug,
  label: z.string().min(1).max(40),
  /** Upper bounds (inclusive). The band is the largest one any known measurement reaches. */
  maxWeightLb: z.number().min(0).max(5_000),
  maxLongestIn: z.number().min(0).max(1_000),
  handlingMinutes: minutes,
  helper: z.enum(HELPER_MODES),
});

export const workConfigSchema = z
  .object({
    /** Each unit after the first of the same item takes this fraction of the per-unit time. */
    additionalUnitEfficiency: z.number().min(0.5).max(1),
    /** No item is ever priced below this many minutes (prevents accidental zero-price work). */
    minimumItemMinutes: minutes,
    /** Base minutes for custom items with no owner estimate (flagged as an estimate). */
    customDefaultMinutes: minutes,
    /** Added when weight or size band cannot be determined for relevant work. */
    unknownBandAllowanceMinutes: minutes,
    actionBaseMinutes: full(WORK_ACTIONS, minutes),
    /** Taking down a mounted item as a fraction of mounting it. */
    reverseFactor: z.number().min(0.1).max(2),
    disassembleFactor: z.number().min(0.1).max(2),
    reassembleFactor: z.number().min(0.1).max(2),
    surfaceMinutes: full(SURFACES, minutes),
    attachmentMinutes: full(ATTACHMENTS, minutes),
    access: z.object({
      ladderMinutes: minutes,
      stairsMinutes: minutes,
      tightSpaceMinutes: minutes,
      furnitureMovementMinutes: minutes,
      obstructionsMinutes: minutes,
      difficultMultiplier: z.number().min(1).max(3),
      /** Above this height the engine assumes a ladder. */
      ladderHeightFt: z.number().min(0).max(40),
    }),
    assembly: z.object({
      minutesPerPart: z.number().min(0).max(30),
      minutesPerBox: z.number().min(0).max(60),
      minutesPerMajorComponent: z.number().min(0).max(60),
      hardwareComplexityMultiplier: full(HARDWARE_COMPLEXITY, z.number().min(0.5).max(3)),
      instructionsMultiplier: full(INSTRUCTIONS, z.number().min(0.5).max(3)),
      levelingMinutes: minutes,
      wallAnchoringMinutes: minutes,
      packagingCleanupMinutes: minutes,
    }),
    teardown: z.object({
      protectivePrepMinutes: minutes,
      disconnectionMinutes: minutes,
      hardwareBaggingMinutes: minutes,
    }),
    restorationMinutes: full(RESTORATIONS, minutes),
    relocationMinutes: full(RELOCATIONS, minutes),
    /** Disposal is never assumed free: each kind carries time and cost. */
    disposal: full(DISPOSALS, z.object({ minutes, costCents: cents })),
    bands: z.array(bandSchema).min(1).max(8),
    helper: z.object({
      requiredShare: z.number().min(0).max(1),
      recommendedShare: z.number().min(0).max(1),
      /** Added once per job when any helper is involved (coordination / schedule impact). */
      coordinationMinutes: minutes,
      /** When false, a "recommended" helper is flagged but not costed. */
      costRecommended: z.boolean(),
    }),
    extraSite: z.object({ setupMinutes: minutes }),
    limits: z.object({
      manualReviewWeightLb: z.number().min(1).max(5_000),
      notSupportedWeightLb: z.number().min(1).max(10_000),
      manualReviewLongestIn: z.number().min(1).max(1_000),
      manualReviewHeightFt: z.number().min(1).max(100),
      notSupportedHeightFt: z.number().min(1).max(100),
      /** Heavy items on an unverified surface need review at or above this weight. */
      unknownSurfaceReviewWeightLb: z.number().min(1).max(5_000),
      ceilingMountRequiresReview: z.boolean(),
      transportSupported: z.boolean(),
      paintSupported: z.boolean(),
    }),
    risk: z.object({
      notSupported: z.array(z.enum(RISK_FLAGS)),
      manualReview: z.array(z.enum(RISK_FLAGS)),
    }),
    surfaceRecipes: z.record(z.enum(SURFACES), slug).default({}),
    /** Prerequisites that apply to any item placed on a given surface (e.g. ceiling structure). */
    surfacePrerequisites: z.record(z.enum(SURFACES), z.array(prerequisiteSchema).max(6)).default(() => DEFAULT_SURFACE_PREREQUISITES),
    recipes: z.record(slug, z.object({ label: z.string().min(1).max(80), lines: z.array(recipeLineSchema).max(30) })),
    categories: z.record(slug, categorySchema),
    templates: z.record(slug, workTemplateSchema),
  })
  .strict()
  .superRefine((w, ctx) => {
    if (w.limits.manualReviewWeightLb > w.limits.notSupportedWeightLb) {
      ctx.addIssue({ code: "custom", path: ["limits", "manualReviewWeightLb"], message: "must be <= notSupportedWeightLb" });
    }
    if (w.limits.manualReviewHeightFt > w.limits.notSupportedHeightFt) {
      ctx.addIssue({ code: "custom", path: ["limits", "manualReviewHeightFt"], message: "must be <= notSupportedHeightFt" });
    }
    for (const [id, tpl] of Object.entries(w.templates)) {
      for (const r of tpl.recipes) {
        if (!w.recipes[r]) ctx.addIssue({ code: "custom", path: ["templates", id, "recipes"], message: `unknown recipe "${r}"` });
      }
    }
    for (const [surface, recipe] of Object.entries(w.surfaceRecipes)) {
      if (!w.recipes[recipe]) ctx.addIssue({ code: "custom", path: ["surfaceRecipes", surface], message: `unknown recipe "${recipe}"` });
    }
  });

export type WorkConfig = z.infer<typeof workConfigSchema>;
export type WorkTemplate = z.infer<typeof workTemplateSchema>;
export type WorkCategory = z.infer<typeof categorySchema>;

type M = Partial<Record<(typeof WORK_ACTIONS)[number], number>>;
const cat = (label: string, group: string, weightRelevant: boolean, keywords: string[], actionMinutes?: M, extra: Pick<WorkCategory, "premiumFactors" | "prerequisites" | "skipSurfacePrerequisites"> = {}): WorkCategory => ({
  label,
  group,
  weightRelevant,
  keywords,
  ...(actionMinutes ? { actionMinutes: actionMinutes as WorkCategory["actionMinutes"] } : {}),
  ...extra,
});

// ---- safety / scope prerequisites (owner-editable). PPTV does limited residential work: no new circuits,
// no panel work, nothing that needs a licensed electrician. Anything outside that is review or not supported.
const PR = (key: string, label: string, question: string, whenUnknown: Prerequisite["whenUnknown"], whenNo: Prerequisite["whenNo"], noMessage: string, extra: Partial<Prerequisite> = {}): Prerequisite => ({
  key,
  label,
  question,
  whenUnknown,
  whenNo,
  noMessage,
  ...extra,
});
const P_CEILING_STRUCTURE = PR(
  "ceiling_structure",
  "Ceiling joist / approved blocking verified for the load",
  "Is there a ceiling joist or approved blocking at the mounting point, rated for the item's weight?",
  "manual_review",
  "not_supported",
  "no joist or approved blocking at the mounting point; it cannot be attached safely as described.",
  { customerNote: "Ceiling mounting requires attachment to a ceiling joist or approved blocking. We verify this before work begins." },
);
const P_EXISTING_FIXTURE = PR(
  "existing_fixture",
  "Existing light fixture / box at this location",
  "Is there an existing light fixture (or fixture box) at this location now?",
  "confirm",
  "not_supported",
  "no existing fixture: running new wiring or a new circuit is licensed electrical work outside PPTV's scope.",
  { customerNote: "Installs at an existing fixture location only; new wiring runs are not included." },
);
const P_FAN_RATED_BOX = PR(
  "fan_rated_box",
  "Fan-rated ceiling box / brace",
  "Is the ceiling box fan-rated (or is there a fan brace), and is it secured to framing?",
  "confirm",
  "manual_review",
  "the ceiling box is not fan-rated; a fan brace/box replacement must be reviewed before quoting.",
  { customerNote: "Ceiling fans require a fan-rated box secured to framing; if it is not, we confirm the extra work first." },
);
const P_WIRING_OK = PR(
  "wiring_ok",
  "Existing wiring in good condition (no scorching, aluminum, or missing ground)",
  "Is the existing wiring in good condition (no scorch marks, aluminum wiring, or missing ground) and controlled by a working switch?",
  "confirm",
  "manual_review",
  "existing wiring has a problem; it needs a licensed electrician's review before PPTV can work there.",
);
const P_EXTEND_EXISTING = PR(
  "extend_existing_circuit",
  "Extends an existing nearby circuit (no new circuit or panel work)",
  "Can the new outlet be fed from an existing outlet on the same wall/circuit (no new circuit or panel work)?",
  "confirm",
  "not_supported",
  "a new circuit or panel work is licensed electrical work outside PPTV's scope.",
  { customerNote: "Outlet work extends an existing nearby circuit; new circuits and panel work are not included." },
);
const P_DOORBELL_WIRING = PR(
  "existing_doorbell_wiring",
  "Existing doorbell wiring / transformer",
  "Is there an existing wired doorbell (wires and a working transformer) at the door?",
  "confirm",
  "confirm",
  "no existing doorbell wiring: use a battery doorbell or confirm a plug-in transformer option.",
);
const P_EXTERIOR_FIXTURE = PR(
  "existing_exterior_fixture",
  "Existing exterior fixture / box at this location",
  "Is there an existing outdoor light fixture (with a weatherproof box) where the floodlight will go?",
  "confirm",
  "not_supported",
  "no existing exterior fixture: new outdoor wiring is licensed electrical work outside PPTV's scope.",
  { customerNote: "Hardwired floodlights replace an existing outdoor fixture; new outdoor wiring is not included." },
);
export const DEFAULT_SURFACE_PREREQUISITES: Partial<Record<(typeof SURFACES)[number], Prerequisite[]>> = { ceiling: [P_CEILING_STRUCTURE] };

const CATEGORIES: Record<string, WorkCategory> = {
  // TV / AV
  tv: cat("TV", "TV / AV", true, ["tv", "tvs", "television", "televisions"], { unmount: 15, dismount: 15, remove: 15, remount: 35, mount: 35, install: 35 }),
  soundbar: cat("Soundbar", "TV / AV", false, ["soundbar", "sound bar"], { mount: 25 }),
  speaker: cat("Speaker", "TV / AV", true, ["speaker", "speakers"], { mount: 30 }),
  projector: cat("Projector", "TV / AV", true, ["projector"], { mount: 60 }),
  projector_screen: cat("Projector screen", "TV / AV", true, ["projector screen", "screen"], { mount: 45 }),
  av_device_mount: cat("Streaming / console mount", "TV / AV", false, ["streaming box", "console mount", "roku", "apple tv"], { mount: 15 }),
  media_shelf: cat("Media shelf", "TV / AV", true, ["media shelf", "media shelves"], { mount: 30 }),
  av_rack: cat("AV rack", "TV / AV", true, ["av rack", "equipment rack"], { assemble: 45 }),
  // Wall-mounted home items
  shelf: cat("Shelf", "Wall items", true, ["shelf", "shelves", "floating shelf", "floating shelves", "wire shelf", "wire shelves"], { mount: 30 }),
  picture_art: cat("Picture / artwork", "Wall items", true, ["picture", "pictures", "artwork", "art", "frame", "frames", "painting", "paintings", "wall decor"], { mount: 15 }),
  mirror: cat("Mirror", "Wall items", true, ["mirror", "mirrors"], { mount: 25 }),
  clock_sign: cat("Clock / sign", "Wall items", false, ["clock", "clocks", "sign", "signs"], { mount: 12 }),
  hooks_racks: cat("Hooks / coat rack", "Wall items", false, ["coat rack", "hook", "hooks"], { mount: 15 }),
  pegboard: cat("Pegboard", "Wall items", true, ["pegboard", "pegboards"], { mount: 35 }),
  board: cat("Board (white / cork / bulletin)", "Wall items", true, ["whiteboard", "whiteboards", "corkboard", "bulletin board", "chalkboard"], { mount: 30 }),
  // Window
  curtain_rod: cat("Curtain rod / drapery hardware", "Window", false, ["curtain rod", "curtain rods", "drapery", "drapes", "curtains"], { mount: 20 }),
  blinds_shades: cat("Blinds / shades", "Window", false, ["blinds", "blind", "shade", "shades"], { mount: 20 }),
  // Smart home / security
  camera: cat("Security camera", "Smart home", false, ["camera", "cameras"], { mount: 40 }),
  doorbell: cat("Video doorbell", "Smart home", false, ["doorbell", "video doorbell"], { mount: 30 }),
  smart_device: cat("Smart hub / sensor / display", "Smart home", false, ["hub", "sensor", "sensors", "smart display", "thermostat"], { mount: 15 }),
  floodlight: cat("Floodlight (plug-in / low-voltage)", "Smart home", false, ["floodlight", "flood light"], { mount: 45 }),
  doorbell_chime: cat("Doorbell chime", "Smart home", false, ["chime", "doorbell chime"], { install: 30 }, { prerequisites: [P_DOORBELL_WIRING] }),
  // Electrical / lighting (limited residential scope: existing locations and existing circuits only)
  ceiling_fan: cat("Ceiling fan", "Electrical / lighting", true, ["ceiling fan", "ceiling fans"], { install: 75, remove: 30 }, { premiumFactors: ["electrical", "height"], prerequisites: [P_EXISTING_FIXTURE, P_FAN_RATED_BOX, P_WIRING_OK], skipSurfacePrerequisites: true }),
  light_fixture: cat("Light fixture (replace existing)", "Electrical / lighting", false, ["light fixture", "light fixtures", "chandelier", "pendant light"], { install: 45, remove: 20 }, { premiumFactors: ["electrical"], prerequisites: [P_EXISTING_FIXTURE, P_WIRING_OK], skipSurfacePrerequisites: true }),
  receptacle: cat("Outlet (add / relocate)", "Electrical / lighting", false, ["outlet", "outlets", "receptacle", "receptacles", "power outlet"], { install: 45, relocate: 45, remove: 20 }, { premiumFactors: ["electrical"], prerequisites: [P_EXTEND_EXISTING, P_WIRING_OK] }),
  low_voltage_pass_through: cat("Low-voltage cable pass-through", "Electrical / lighting", false, ["cable pass-through", "pass through", "low voltage", "hdmi in wall"], { install: 35 }),
  floodlight_hardwired: cat("Floodlight (hardwired, replaces fixture)", "Electrical / lighting", true, ["hardwired floodlight", "floodlight camera"], { install: 60, remove: 25 }, { premiumFactors: ["electrical", "height"], prerequisites: [P_EXTERIOR_FIXTURE, P_WIRING_OK] }),
  // Storage
  wall_shelving: cat("Wall shelving system", "Storage", true, ["wall shelving", "track shelving"], { mount: 45 }),
  freestanding_shelving: cat("Freestanding shelving / rack", "Storage", false, ["shelving unit", "storage rack", "utility shelf", "utility shelves", "garage shelf", "wire rack"], { assemble: 35 }),
  closet_organizer: cat("Closet organizer", "Storage", true, ["closet organizer", "closet system"], { install: 60, assemble: 60 }),
  garage_organizer: cat("Garage organizer", "Storage", true, ["garage organizer", "garage storage"], { install: 50, assemble: 50 }),
  // Furniture
  desk: cat("Desk", "Furniture", false, ["desk", "desks", "standing desk"], { assemble: 60 }),
  table: cat("Table", "Furniture", false, ["table", "tables"], { assemble: 45 }),
  chair: cat("Chair / stool / bench", "Furniture", false, ["chair", "chairs", "stool", "stools", "bench", "benches"], { assemble: 25 }),
  bed: cat("Bed / bed frame", "Furniture", false, ["bed", "bed frame", "bedframe", "king bed", "queen bed", "crib"], { assemble: 75 }),
  nightstand: cat("Nightstand", "Furniture", false, ["nightstand", "nightstands", "night stand"], { assemble: 30 }),
  dresser: cat("Dresser", "Furniture", false, ["dresser", "dressers", "chest of drawers"], { assemble: 75 }),
  bookshelf: cat("Bookshelf", "Furniture", false, ["bookshelf", "bookshelves", "bookcase"], { assemble: 45 }),
  entertainment_center: cat("Entertainment center / TV stand", "Furniture", false, ["entertainment center", "tv stand", "media console"], { assemble: 60 }),
  cabinet: cat("Cabinet / wardrobe", "Furniture", false, ["cabinet", "cabinets", "wardrobe", "armoire", "pantry"], { assemble: 80 }),
  office_furniture: cat("Office furniture", "Furniture", false, ["office furniture", "filing cabinet", "conference table"], { assemble: 50 }),
  // Fitness / recreation
  exercise_equipment: cat("Exercise equipment", "Fitness", false, ["treadmill", "exercise bike", "elliptical", "weight bench", "squat rack", "exercise equipment", "peloton"], { assemble: 90 }),
  game_table: cat("Game table / recreation", "Fitness", false, ["game table", "pool table", "ping pong", "foosball"], { assemble: 90 }),
  // Office / commercial
  monitor: cat("Monitor / monitor arm", "Office", false, ["monitor", "monitors", "monitor arm"], { mount: 20, install: 30 }),
  conference_display: cat("Conference-room display", "Office", true, ["conference room display", "conference display"], { mount: 60 }),
  signage: cat("Signage", "Office", true, ["signage"], { mount: 30 }),
  // Other
  custom: cat("Custom / other item", "Other", true, ["thing", "item", "something"]),
};

const RECIPES: WorkConfig["recipes"] = {
  fasteners_stud: {
    label: "Stud-mount hardware",
    lines: [
      { label: "Lag / wood screws", qty: 1, unitCostCents: 200, kind: "hardware" },
      { label: "Washers and misc.", qty: 1, unitCostCents: 50, kind: "consumable" },
    ],
  },
  fasteners_light: {
    label: "Light-duty anchors",
    lines: [{ label: "Wall anchors and screws", qty: 1, unitCostCents: 250, kind: "hardware" }],
  },
  fasteners_masonry: {
    label: "Masonry anchors",
    lines: [
      { label: "Masonry anchors", qty: 1, unitCostCents: 800, kind: "hardware" },
      { label: "Drill bit wear", qty: 1, unitCostCents: 500, kind: "consumable" },
    ],
  },
  fasteners_steel: {
    label: "Steel-stud toggle anchors",
    lines: [{ label: "Toggle anchors", qty: 1, unitCostCents: 900, kind: "hardware" }],
  },
  fasteners_tile: {
    label: "Tile-safe anchoring",
    lines: [
      { label: "Anchors", qty: 1, unitCostCents: 400, kind: "hardware" },
      { label: "Tile drill bit wear", qty: 1, unitCostCents: 600, kind: "consumable" },
    ],
  },
  assembly_consumables: {
    label: "Assembly consumables",
    lines: [{ label: "Wood glue, felt pads, misc.", qty: 1, unitCostCents: 150, kind: "consumable" }],
  },
  teardown_supplies: {
    label: "Teardown supplies",
    lines: [{ label: "Hardware bags, labels, protective wrap", qty: 1, unitCostCents: 200, kind: "consumable" }],
  },
  furniture_anchor_kit: {
    label: "Anti-tip anchor kit",
    lines: [{ label: "Anti-tip strap / wall anchor", qty: 1, unitCostCents: 400, kind: "hardware" }],
  },
  patch_kit: {
    label: "Patch kit (minor holes)",
    lines: [
      { label: "Spackle / patch", qty: 1, unitCostCents: 300, kind: "consumable" },
      { label: "Sanding / touch-up supplies", qty: 1, unitCostCents: 200, kind: "consumable" },
    ],
  },
  rod_hardware: {
    label: "Curtain rod brackets and anchors",
    lines: [{ label: "Brackets / anchors", qty: 1, unitCostCents: 300, kind: "hardware" }],
  },
  shelf_brackets: {
    label: "Shelf brackets / cleat",
    lines: [{ label: "Brackets or cleat", qty: 1, unitCostCents: 500, kind: "hardware" }],
  },
  low_voltage_camera: {
    label: "Camera mount extras",
    lines: [{ label: "Cable clips, weather sealant", qty: 1, unitCostCents: 300, kind: "consumable" }],
  },
  ceiling_mount_hardware: {
    label: "Ceiling mount hardware",
    lines: [
      { label: "Lag bolts into joist / blocking", qty: 1, unitCostCents: 600, kind: "hardware" },
      { label: "Safety cable", qty: 1, unitCostCents: 800, kind: "hardware" },
    ],
  },
  electrical_connectors: {
    label: "Wire connectors and tape",
    lines: [{ label: "Wire nuts, tape, misc.", qty: 1, unitCostCents: 300, kind: "consumable" }],
  },
  outlet_extension: {
    label: "Outlet extension (existing circuit)",
    lines: [
      { label: "14/2 or 12/2 Romex (10 ft)", qty: 1, unitCostCents: 600, kind: "hardware" },
      { label: "Old-work box", qty: 1, unitCostCents: 250, kind: "hardware" },
      { label: "Receptacle", qty: 1, unitCostCents: 200, kind: "hardware" },
      { label: "Cover plate", qty: 1, unitCostCents: 150, kind: "hardware" },
    ],
  },
  low_voltage_plates: {
    label: "Low-voltage pass-through plates",
    lines: [{ label: "Brush / pass-through plate pair", qty: 1, unitCostCents: 700, kind: "hardware" }],
  },
};

const T = (
  label: string,
  category: string,
  action: WorkTemplate["action"],
  recipes: string[],
  extra: Partial<WorkTemplate> = {},
): WorkTemplate => ({ label, category, action, recipes, ...extra });

const TEMPLATES: Record<string, WorkTemplate> = {
  tv_standard_drywall: T("Standard drywall TV", "tv", "mount", [], { defaults: { surface: "drywall_studs", attachment: "vesa_bracket" }, notes: "Priced by the TV engine." }),
  tv_large_full_motion: T("Large full-motion TV", "tv", "mount", [], { defaults: { surface: "drywall_studs", attachment: "vesa_bracket", helper: "recommended" }, notes: "Priced by the TV engine." }),
  tv_unmount: T("TV take-down", "tv", "unmount", [], { laborMinutes: { unmount: 15 } }),
  floating_shelf: T("Floating shelf", "shelf", "mount", ["shelf_brackets"], { customerLabel: "Floating shelf", defaults: { surface: "drywall_studs", attachment: "rail_cleat" } }),
  large_mirror: T("Large mirror", "mirror", "mount", ["fasteners_stud"], { customerLabel: "Large mirror", laborMinutes: { mount: 35 }, defaults: { helper: "recommended", surface: "drywall_studs", weightLb: 40, attachment: "rail_cleat" } }),
  curtain_rod: T("Curtain rod", "curtain_rod", "mount", ["rod_hardware"], { customerLabel: "Curtain rod", defaults: { surface: "drywall_unknown_studs", attachment: "light_duty_anchors" } }),
  soundbar: T("Soundbar", "soundbar", "mount", ["fasteners_light"], { customerLabel: "Soundbar", defaults: { weightLb: 8, surface: "drywall_studs", attachment: "manufacturer_bracket" } }),
  whiteboard: T("Whiteboard", "board", "mount", ["fasteners_stud"], { customerLabel: "Whiteboard", defaults: { surface: "drywall_studs", attachment: "screws_fasteners" } }),
  camera: T("Camera", "camera", "mount", ["low_voltage_camera", "fasteners_light"], { customerLabel: "Camera", defaults: { weightLb: 2 } }),
  desk_assembly: T("Desk assembly", "desk", "assemble", ["assembly_consumables"], { customerLabel: "Desk", defaults: { surface: "freestanding", attachment: "freestanding_assembly", assembly: { hardwareComplexity: "medium", instructions: "available", twoPerson: false } } }),
  bed_frame_assembly: T("Bed-frame assembly", "bed", "assemble", ["assembly_consumables"], { customerLabel: "Bed", defaults: { surface: "freestanding", attachment: "freestanding_assembly", helper: "recommended", assembly: { hardwareComplexity: "medium", instructions: "available", twoPerson: false, leveling: true } } }),
  dresser_assembly: T("Dresser assembly", "dresser", "assemble", ["assembly_consumables", "furniture_anchor_kit"], { customerLabel: "Dresser", defaults: { surface: "freestanding", attachment: "freestanding_assembly", helper: "recommended", assembly: { hardwareComplexity: "high", instructions: "available", twoPerson: true, wallAnchoring: true } } }),
  bookshelf_assembly: T("Bookshelf assembly", "bookshelf", "assemble", ["assembly_consumables", "furniture_anchor_kit"], { customerLabel: "Bookshelf", defaults: { surface: "freestanding", attachment: "freestanding_assembly", assembly: { hardwareComplexity: "medium", instructions: "available", wallAnchoring: true } } }),
  furniture_disassembly: T("Furniture disassembly", "desk", "disassemble", ["teardown_supplies"], { defaults: { surface: "freestanding", attachment: "freestanding_assembly" } }),
  furniture_relocation: T("Furniture relocation", "dresser", "disassemble", ["teardown_supplies", "assembly_consumables"], { thenAction: "reassemble", defaults: { surface: "freestanding", attachment: "freestanding_assembly", helper: "recommended" } }),
  wall_shelf_removal: T("Wall shelf removal", "shelf", "remove", ["patch_kit"], { defaults: { restoration: "remove_hardware_only" } }),
  ceiling_tv_mount: T("Ceiling TV mount", "tv", "mount", ["ceiling_mount_hardware"], { customerLabel: "Ceiling TV", laborMinutes: { mount: 75 }, defaults: { surface: "ceiling", attachment: "lag_hardware", helper: "required" }, notes: "Joist/blocking must be verified; stays a reviewed custom item, not the standard TV price." }),
  ceiling_fan_existing_fixture: T("Ceiling fan (existing fixture)", "ceiling_fan", "install", ["electrical_connectors"], { customerLabel: "Ceiling fan", defaults: { surface: "ceiling", attachment: "manufacturer_bracket", hardwareSuppliedBy: "included" }, notes: "Replaces an existing light fixture. No new wiring runs." }),
  light_fixture_swap: T("Light fixture swap", "light_fixture", "install", ["electrical_connectors"], { customerLabel: "Light fixture", defaults: { surface: "ceiling", attachment: "manufacturer_bracket", hardwareSuppliedBy: "included" } }),
  outlet_add_existing_circuit: T("Add outlet (existing circuit)", "receptacle", "install", ["outlet_extension"], { customerLabel: "Outlet", defaults: { surface: "drywall_unknown_studs", attachment: "screws_fasteners", hardwareSuppliedBy: "pptv" } }),
  low_voltage_pass_through: T("Low-voltage pass-through", "low_voltage_pass_through", "install", ["low_voltage_plates"], { customerLabel: "Cable pass-through", defaults: { surface: "drywall_unknown_studs", attachment: "screws_fasteners", hardwareSuppliedBy: "pptv" } }),
  doorbell_chime: T("Doorbell chime", "doorbell_chime", "install", ["electrical_connectors"], { customerLabel: "Doorbell chime", defaults: { hardwareSuppliedBy: "included", attachment: "screws_fasteners" } }),
  floodlight_hardwired: T("Hardwired floodlight", "floodlight_hardwired", "install", ["electrical_connectors", "low_voltage_camera"], { customerLabel: "Floodlight", defaults: { hardwareSuppliedBy: "included", attachment: "manufacturer_bracket" } }),
};

export const DEFAULT_WORK_CONFIG: WorkConfig = {
  surfacePrerequisites: DEFAULT_SURFACE_PREREQUISITES,
  additionalUnitEfficiency: 0.85,
  minimumItemMinutes: 10,
  customDefaultMinutes: 30,
  unknownBandAllowanceMinutes: 10,
  actionBaseMinutes: { mount: 30, install: 30, assemble: 60, reassemble: 45, remount: 30, relocate: 20, unmount: 15, dismount: 15, remove: 15, disassemble: 35, teardown: 45 },
  reverseFactor: 0.6,
  disassembleFactor: 0.6,
  reassembleFactor: 0.85,
  surfaceMinutes: {
    drywall_studs: 0,
    drywall_unknown_studs: 8,
    brick: 20,
    concrete: 25,
    stone: 25,
    masonry: 20,
    steel_studs: 12,
    wood: 3,
    tile: 20,
    ceiling: 20,
    floor: 0,
    freestanding: 0,
    furniture_attachment: 5,
    unknown: 10,
  },
  attachmentMinutes: {
    light_duty_anchors: 0,
    stud_mounted: 3,
    lag_hardware: 5,
    masonry_anchors: 5,
    manufacturer_bracket: 3,
    vesa_bracket: 5,
    rail_cleat: 10,
    screws_fasteners: 0,
    adhesive_assisted: 0,
    freestanding_assembly: 0,
    unknown: 5,
  },
  access: { ladderMinutes: 10, stairsMinutes: 8, tightSpaceMinutes: 10, furnitureMovementMinutes: 10, obstructionsMinutes: 8, difficultMultiplier: 1.2, ladderHeightFt: 8 },
  assembly: {
    minutesPerPart: 1.2,
    minutesPerBox: 4,
    minutesPerMajorComponent: 5,
    hardwareComplexityMultiplier: { low: 0.9, medium: 1, high: 1.25 },
    instructionsMultiplier: { available: 1, poor: 1.2, none: 1.35, unknown: 1.1 },
    levelingMinutes: 5,
    wallAnchoringMinutes: 10,
    packagingCleanupMinutes: 5,
  },
  teardown: { protectivePrepMinutes: 5, disconnectionMinutes: 5, hardwareBaggingMinutes: 5 },
  restorationMinutes: { none: 0, leave_hardware: 0, remove_hardware_only: 3, minor_patch: 15, major_repair: 0 },
  relocationMinutes: { none: 0, same_room: 8, between_rooms: 15, between_addresses: 5 },
  disposal: {
    packaging: { minutes: 5, costCents: 0 },
    debris: { minutes: 10, costCents: 500 },
    old_hardware: { minutes: 3, costCents: 0 },
    old_item: { minutes: 20, costCents: 1_500 },
  },
  bands: [
    { key: "small_light", label: "Small / light", maxWeightLb: 10, maxLongestIn: 24, handlingMinutes: 0, helper: "none" },
    { key: "standard", label: "Standard", maxWeightLb: 35, maxLongestIn: 48, handlingMinutes: 3, helper: "none" },
    { key: "large", label: "Large", maxWeightLb: 60, maxLongestIn: 72, handlingMinutes: 8, helper: "recommended" },
    { key: "two_person", label: "Two-person", maxWeightLb: 100, maxLongestIn: 96, handlingMinutes: 12, helper: "required" },
    { key: "oversized", label: "Oversized", maxWeightLb: 150, maxLongestIn: 120, handlingMinutes: 20, helper: "required" },
  ],
  helper: { requiredShare: 0.8, recommendedShare: 0.5, coordinationMinutes: 10, costRecommended: true },
  extraSite: { setupMinutes: 15 },
  limits: {
    manualReviewWeightLb: 150,
    notSupportedWeightLb: 400,
    manualReviewLongestIn: 120,
    manualReviewHeightFt: 12,
    notSupportedHeightFt: 20,
    unknownSurfaceReviewWeightLb: 25,
    ceilingMountRequiresReview: true,
    transportSupported: false,
    paintSupported: false,
  },
  risk: {
    notSupported: ["gas_line", "roof_work", "high_voltage_or_panel", "new_circuit", "load_bearing", "permit_or_license_required", "hazardous_material", "outside_capability"],
    manualReview: ["structural_modification", "plumbing_work", "unsafe_height", "unknown_structure", "ceiling_suspension", "commercial_rigging", "unsafe_electrical_condition"],
  },
  surfaceRecipes: {
    drywall_studs: "fasteners_stud",
    drywall_unknown_studs: "fasteners_light",
    brick: "fasteners_masonry",
    concrete: "fasteners_masonry",
    stone: "fasteners_masonry",
    masonry: "fasteners_masonry",
    steel_studs: "fasteners_steel",
    wood: "fasteners_stud",
    tile: "fasteners_tile",
    ceiling: "fasteners_stud",
    unknown: "fasteners_light",
  },
  recipes: RECIPES,
  categories: CATEGORIES,
  templates: TEMPLATES,
};
