import { z } from "zod";

// Universal work-item model. Every piece of work PPTV can be asked to do is expressed as
//   ACTION + ITEM + QUANTITY + dimensions/weight + environment + attachment/assembly method
//   + access/complexity + materials + labor + removal/disposal + risk/review requirements
// and priced by ONE engine (workEngine.ts). Item types are DATA (category slugs and
// templates in the economics config), never code or database columns, so a new kind of
// item needs a config edit, not a migration or a new algorithm.
//
// TV installation stays a specialised workflow: a work item may carry a `tv` extension and
// is then priced by the existing TV engine (see normalizeScope in workEngine.ts).

export const WORK_ACTIONS = ["mount", "install", "assemble", "reassemble", "remount", "relocate", "unmount", "dismount", "remove", "disassemble", "teardown"] as const;
export type WorkAction = (typeof WORK_ACTIONS)[number];

/** Actions that put something in place (wall, ceiling, floor position). */
export const PLACE_ACTIONS: readonly WorkAction[] = ["mount", "install", "remount", "relocate"];
/** Actions that build furniture/equipment from parts. */
export const BUILD_ACTIONS: readonly WorkAction[] = ["assemble", "reassemble"];
/** Actions that take something down or apart. */
export const TAKEDOWN_ACTIONS: readonly WorkAction[] = ["unmount", "dismount", "remove", "disassemble", "teardown", "relocate"];

export const SURFACES = [
  "drywall_studs",
  "drywall_unknown_studs",
  "brick",
  "concrete",
  "stone",
  "masonry",
  "steel_studs",
  "wood",
  "tile",
  "ceiling",
  "floor",
  "freestanding",
  "furniture_attachment",
  "unknown",
] as const;
export type Surface = (typeof SURFACES)[number];

export const ATTACHMENTS = [
  "light_duty_anchors",
  "stud_mounted",
  "lag_hardware",
  "masonry_anchors",
  "manufacturer_bracket",
  "vesa_bracket",
  "rail_cleat",
  "screws_fasteners",
  "adhesive_assisted",
  "freestanding_assembly",
  "unknown",
] as const;
export type Attachment = (typeof ATTACHMENTS)[number];

export const HARDWARE_SUPPLIERS = ["customer", "pptv", "included", "unknown"] as const;
export const ASSEMBLY_STATES = ["boxed", "partially_assembled", "assembled", "unknown"] as const;
export const ATTACHMENT_STATES = ["not_installed", "mounted", "assembled", "partially_disassembled", "unknown"] as const;
export const HELPER_MODES = ["none", "recommended", "required"] as const;
export type HelperMode = (typeof HELPER_MODES)[number];
export const RELOCATIONS = ["none", "same_room", "between_rooms", "between_addresses"] as const;
export type Relocation = (typeof RELOCATIONS)[number];
export const RESTORATIONS = ["none", "leave_hardware", "remove_hardware_only", "minor_patch", "major_repair"] as const;
export type Restoration = (typeof RESTORATIONS)[number];
export const DISPOSALS = ["packaging", "debris", "old_hardware", "old_item"] as const;
export type Disposal = (typeof DISPOSALS)[number];
export const HARDWARE_COMPLEXITY = ["low", "medium", "high"] as const;
export const INSTRUCTIONS = ["available", "poor", "none", "unknown"] as const;

/** Facts the owner (or AI, always confirmed by the owner) can attach to flag work outside ordinary mounting/assembly. */
export const RISK_FLAGS = [
  "structural_modification",
  "load_bearing",
  "roof_work",
  "gas_line",
  "plumbing_work",
  "high_voltage_or_panel",
  "new_circuit",
  "permit_or_license_required",
  "unsafe_height",
  "unknown_structure",
  "ceiling_suspension",
  "commercial_rigging",
  "hazardous_material",
  "outside_capability",
] as const;
export type RiskFlag = (typeof RISK_FLAGS)[number];

export const WORK_STATUSES = ["priced", "estimate_with_confirmation", "manual_review_required", "not_supported"] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

const slug = z.string().regex(/^[a-z0-9_]{1,40}$/, "use lowercase letters, digits and underscores");

export const workEnvironmentSchema = z
  .object({
    surface: z.enum(SURFACES).default("unknown"),
    /** Height of the work area / mounting point in feet. */
    heightFt: z.number().min(0).max(40).optional(),
    ladder: z.boolean().default(false),
    stairs: z.boolean().default(false),
    tightSpace: z.boolean().default(false),
    furnitureMovement: z.boolean().default(false),
    obstructions: z.boolean().default(false),
    difficultAccess: z.boolean().default(false),
  })
  .default({ surface: "unknown", ladder: false, stairs: false, tightSpace: false, furnitureMovement: false, obstructions: false, difficultAccess: false });

export const workAssemblySchema = z.object({
  partCount: z.number().int().min(1).max(2_000).optional(),
  boxes: z.number().int().min(1).max(50).optional(),
  majorComponents: z.number().int().min(1).max(100).optional(),
  /** Owner estimate of assembly minutes per unit. Replaces the part-count estimate when present. */
  ownerMinutesPerUnit: z.number().min(1).max(1_440).optional(),
  hardwareComplexity: z.enum(HARDWARE_COMPLEXITY).default("medium"),
  instructions: z.enum(INSTRUCTIONS).default("unknown"),
  powerTools: z.boolean().default(false),
  twoPerson: z.boolean().default(false),
  leveling: z.boolean().default(false),
  wallAnchoring: z.boolean().default(false),
  packagingCleanup: z.boolean().default(false),
});

export const workTeardownSchema = z.object({
  protectivePrep: z.boolean().default(false),
  disconnection: z.boolean().default(false),
  hardwareBagging: z.boolean().default(true),
});

export const workMaterialSchema = z.object({
  label: z.string().min(1).max(80),
  qty: z.number().min(0).max(1_000),
  unitCostCents: z.number().int().min(0).max(5_000_000),
  supplier: z.enum(["pptv", "customer"]).default("pptv"),
});

/** TV specialisation carried on a work item (size, mount type, fireplace, concealment, outlet). */
export const tvExtensionSchema = z.object({
  sizeBand: z.enum(["32-55", "56+"]).default("56+"),
  inches: z.number().int().min(19).max(120).optional(),
  location: z.enum(["standard", "fireplace", "high_wall"]).default("standard"),
  mountSource: z.enum(["customer", "pptv"]).default("customer"),
  mountType: z.enum(["fixed", "tilt", "full_motion"]).nullable().default(null),
  wire: z.enum(["visible", "raceway", "in_wall"]).default("visible"),
  power: z.enum(["existing", "outlet", "unknown"]).default("existing"),
});
export type TvExtension = z.infer<typeof tvExtensionSchema>;

export const workItemSchema = z
  .object({
    id: z.string().min(1).max(64).default("item-1"),
    action: z.enum(WORK_ACTIONS),
    /** Second phase of a compound workflow, e.g. unmount then remount, disassemble then reassemble. */
    thenAction: z.enum(WORK_ACTIONS).optional(),
    /** Free slug. Unknown slugs are treated as custom items (never rejected). */
    category: slug.default("custom"),
    subcategory: z.string().max(60).optional(),
    templateId: slug.optional(),
    /** Customer-facing name ("King bed"). */
    name: z.string().max(120).optional(),
    /** Customer's own description, mainly for custom items. */
    description: z.string().max(500).optional(),
    manufacturer: z.string().max(80).optional(),
    model: z.string().max(80).optional(),
    quantity: z.number().int().min(1).max(50).default(1),
    dimensions: z
      .object({
        widthIn: z.number().min(0.1).max(400).optional(),
        heightIn: z.number().min(0.1).max(400).optional(),
        depthIn: z.number().min(0.1).max(400).optional(),
      })
      .optional(),
    weightLb: z.number().min(0.01).max(5_000).optional(),
    itemSupplier: z.enum(["customer", "pptv"]).default("customer"),
    hardwareSuppliedBy: z.enum(HARDWARE_SUPPLIERS).default("unknown"),
    assemblyState: z.enum(ASSEMBLY_STATES).default("unknown"),
    currentAttachmentState: z.enum(ATTACHMENT_STATES).default("unknown"),
    destination: z.string().max(120).optional(),
    /** 0 = primary site; 1.. = extra stops entered in the job context. */
    site: z.number().int().min(0).max(4).default(0),
    environment: workEnvironmentSchema,
    attachment: z.enum(ATTACHMENTS).default("unknown"),
    assembly: workAssemblySchema.optional(),
    teardown: workTeardownSchema.optional(),
    relocation: z.enum(RELOCATIONS).default("none"),
    /** PPTV physically transporting the item between addresses. Off by default; triggers review when on. */
    pptvTransports: z.boolean().default(false),
    helper: z.enum(HELPER_MODES).default("none"),
    disposal: z.array(z.enum(DISPOSALS)).max(4).default([]),
    restoration: z.enum(RESTORATIONS).default("none"),
    paintRequested: z.boolean().default(false),
    materials: z.array(workMaterialSchema).max(20).default([]),
    /** Extra material recipe ids from the config (templates add theirs automatically). */
    recipes: z.array(slug).max(10).default([]),
    /** Owner override of base minutes per unit for the primary phase. Band, environment and access still add. */
    ownerMinutesPerUnit: z.number().min(1).max(1_440).optional(),
    photoCount: z.number().int().min(0).max(20).default(0),
    riskFlags: z.array(z.enum(RISK_FLAGS)).max(14).default([]),
    tv: tvExtensionSchema.optional(),
    customerNote: z.string().max(300).optional(),
  })
  .superRefine((item, ctx) => {
    if (item.thenAction && item.thenAction === item.action) {
      ctx.addIssue({ code: "custom", path: ["thenAction"], message: "thenAction must differ from action" });
    }
    if (item.tv && item.tv.mountSource === "pptv" && !item.tv.mountType) {
      ctx.addIssue({ code: "custom", path: ["tv", "mountType"], message: "mountType is required when PPTV supplies the mount" });
    }
  });

export type WorkItem = z.infer<typeof workItemSchema>;
export type WorkItemInput = z.input<typeof workItemSchema>;

export function parseWorkItem(input: unknown): WorkItem {
  return workItemSchema.parse(input);
}

/** Common compound workflows, as presets over action + thenAction. Pure data for the UI and intake. */
export const WORKFLOWS = [
  { id: "single", label: "Single action", action: null, thenAction: null },
  { id: "unmount_remount", label: "Take down and put back up", action: "unmount", thenAction: "remount" },
  { id: "disassemble_reassemble", label: "Take apart and reassemble", action: "disassemble", thenAction: "reassemble" },
  { id: "remove_replace", label: "Remove and replace", action: "remove", thenAction: "install" },
  { id: "relocate", label: "Relocate", action: "relocate", thenAction: null },
] as const;

const PHRASE: Record<WorkAction, string> = {
  mount: "mounting",
  install: "installation",
  assemble: "assembly",
  reassemble: "reassembly",
  remount: "remounting",
  relocate: "relocation",
  unmount: "unmounting",
  dismount: "dismounting",
  remove: "removal",
  disassemble: "disassembly",
  teardown: "teardown",
};

export function actionPhrase(action: WorkAction, thenAction?: WorkAction): string {
  return thenAction ? `${PHRASE[action]} and ${PHRASE[thenAction]}` : PHRASE[action];
}

export function hasPlacePhase(item: Pick<WorkItem, "action" | "thenAction">): boolean {
  return PLACE_ACTIONS.includes(item.action) || (item.thenAction !== undefined && PLACE_ACTIONS.includes(item.thenAction));
}

export function phasesOf(item: Pick<WorkItem, "action" | "thenAction">): WorkAction[] {
  return item.thenAction ? [item.action, item.thenAction] : [item.action];
}
