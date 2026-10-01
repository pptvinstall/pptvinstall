import type { EconomicsConfig } from "./config";
import type { LaborTask } from "./labor";
import type { MaterialLine } from "./materials";
import { safeCents, type Cents } from "./money";
import type { JobScope, TvScope } from "./scope";
import {
  actionPhrase,
  parseWorkItem,
  phasesOf,
  PLACE_ACTIONS,
  type HelperMode,
  type Surface,
  type WorkAction,
  type WorkItem,
  type WorkItemInput,
  type WorkStatus,
} from "./work";
import type { WorkConfig, WorkTemplate } from "./workConfig";

// Generic work engine: labor, materials, helper and review status for ANY work item.
// Pure and deterministic: integer cents, no clock, no network, no AI. Labor is compositional:
//   base action minutes (template > category > derived) + handling band + surface + attachment
//   + assembly/teardown + environment/access + relocation + restoration + disposal,
// scaled by quantity efficiency, with a hard per-item minimum so no real work prices at zero.

export const STATUS_RANK: Record<WorkStatus, number> = { priced: 0, estimate_with_confirmation: 1, manual_review_required: 2, not_supported: 3 };
export const worstStatus = (a: WorkStatus, b: WorkStatus): WorkStatus => (STATUS_RANK[b] > STATUS_RANK[a] ? b : a);

export interface WorkReason {
  code: string;
  severity: "confirm" | "manual_review" | "not_supported";
  message: string;
  itemId?: string;
}
export interface WorkQuestion {
  itemId?: string;
  field: string;
  question: string;
}

export interface WorkItemResult {
  itemId: string;
  index: number;
  /** Customer-facing label, e.g. "King bed". */
  label: string;
  /** Customer-facing line, e.g. "King bed assembly". */
  customerText: string;
  category: string;
  categoryLabel: string;
  templateId: string | null;
  action: WorkAction;
  thenAction: WorkAction | null;
  quantity: number;
  site: number;
  bandKey: string | null;
  bandLabel: string;
  minutes: number;
  helperMode: HelperMode;
  helperMinutes: number;
  materialsCostCents: Cents;
  templatePriceCents: Cents | null;
  status: WorkStatus;
  confidence: "high" | "medium" | "low";
  reasons: WorkReason[];
  questions: WorkQuestion[];
}

export interface WorkComputation {
  items: WorkItemResult[];
  tasks: LaborTask[];
  /** Owner on-site minutes from work items (before the job-level difficult-access multiplier). */
  minutes: number;
  helperMinutes: number;
  materialLines: MaterialLine[];
  reasons: WorkReason[];
  questions: WorkQuestion[];
  exclusions: string[];
  status: WorkStatus;
  templatePriceCents: Cents;
  /** True when at least one item has no owner-defined template price. */
  hasUnpricedItems: boolean;
}

export const EMPTY_WORK: WorkComputation = {
  items: [],
  tasks: [],
  minutes: 0,
  helperMinutes: 0,
  materialLines: [],
  reasons: [],
  questions: [],
  exclusions: [],
  status: "priced",
  templatePriceCents: 0,
  hasUnpricedItems: false,
};

// ------------------------------------------------------------------ normalisation

function wallFromSurface(surface: Surface): TvScope["wall"] {
  switch (surface) {
    case "brick":
    case "masonry":
    case "concrete":
      return "brick";
    case "stone":
      return "stone";
    case "steel_studs":
      return "steel";
    case "drywall_studs":
    case "drywall_unknown_studs":
      return "drywall";
    default:
      return "unknown";
  }
}

/** A fresh TV mount/install is handled by the specialised TV engine, one TvScope per unit. */
export function isSpecialisedTvItem(item: WorkItem): boolean {
  return item.category === "tv" && item.tv !== undefined && phasesOf(item).some((a) => a === "mount" || a === "install");
}

function tvScopeFromItem(item: WorkItem, unit: number): TvScope {
  const tv = item.tv!;
  const band: TvScope["sizeBand"] = tv.inches !== undefined ? (tv.inches >= 56 ? "56+" : "32-55") : tv.sizeBand;
  const takesDown = phasesOf(item).some((a) => a === "unmount" || a === "dismount" || a === "remove" || a === "teardown");
  return {
    id: `${item.id}-${unit}`.slice(0, 64),
    site: item.site,
    sizeBand: band,
    ...(tv.inches !== undefined ? { inches: tv.inches } : {}),
    wall: wallFromSurface(item.environment.surface),
    location: tv.location,
    mountSource: tv.mountSource,
    mountType: tv.mountType,
    wire: tv.wire,
    power: tv.power,
    removal: { tvRemoval: takesDown, mountRemoval: false, remount: false },
  };
}

/** Fold specialised TV items into scope.tvs so the existing TV engine prices them; the rest stay generic items. */
export function normalizeScope(scope: JobScope): JobScope {
  const derived: TvScope[] = [];
  const rest: WorkItem[] = [];
  for (const item of scope.items) {
    if (isSpecialisedTvItem(item)) for (let u = 1; u <= item.quantity; u++) derived.push(tvScopeFromItem(item, u));
    else rest.push(item);
  }
  return derived.length ? { ...scope, tvs: [...scope.tvs, ...derived], items: rest } : scope;
}

// ------------------------------------------------------------------ labels

export function categoryOf(W: WorkConfig, slug: string) {
  return W.categories[slug] ?? null;
}

export function itemLabel(item: WorkItem, W: WorkConfig): string {
  const tpl = item.templateId ? W.templates[item.templateId] : undefined;
  return item.name?.trim() || tpl?.customerLabel || tpl?.label || categoryOf(W, item.category)?.label || "Item";
}

export function customerText(item: WorkItem, W: WorkConfig): string {
  const qty = item.quantity > 1 ? ` ×${item.quantity}` : "";
  return `${itemLabel(item, W)} ${actionPhrase(item.action, item.thenAction)}${qty}`;
}

/** Build a pre-filled item from an owner template. Every field stays editable afterwards. */
export function itemFromTemplate(templateId: string, cfg: EconomicsConfig, overrides: Partial<WorkItemInput> = {}): WorkItem {
  const tpl = cfg.work.templates[templateId];
  if (!tpl) throw new Error(`Unknown work template "${templateId}"`);
  const d = tpl.defaults ?? {};
  const base: WorkItemInput = {
    id: overrides.id ?? "item-1",
    action: tpl.action,
    ...(tpl.thenAction ? { thenAction: tpl.thenAction } : {}),
    category: tpl.category,
    ...(tpl.subcategory ? { subcategory: tpl.subcategory } : {}),
    templateId,
    name: tpl.customerLabel ?? tpl.label,
    ...(d.hardwareSuppliedBy ? { hardwareSuppliedBy: d.hardwareSuppliedBy } : {}),
    ...(d.helper ? { helper: d.helper } : {}),
    ...(d.weightLb ? { weightLb: d.weightLb } : {}),
    ...(d.dimensions ? { dimensions: d.dimensions } : {}),
    ...(d.restoration ? { restoration: d.restoration } : {}),
    ...(d.disposal ? { disposal: d.disposal } : {}),
    ...(d.riskFlags ? { riskFlags: d.riskFlags } : {}),
    ...(d.attachment ? { attachment: d.attachment } : {}),
    ...(d.surface ? { environment: { surface: d.surface } } : {}),
    ...(d.assembly ? { assembly: d.assembly } : {}),
  };
  return parseWorkItem({ ...base, ...overrides });
}

// ------------------------------------------------------------------ helpers

const num = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) && x > 0 ? x : 0);

function pickBand(W: WorkConfig, item: WorkItem) {
  const bands = W.bands;
  const dims = item.dimensions ? [item.dimensions.widthIn, item.dimensions.heightIn, item.dimensions.depthIn].map(num).filter((n) => n > 0) : [];
  const longest = dims.length ? Math.max(...dims) : 0;
  const weight = num(item.weightLb);
  const idxFor = (value: number, key: "maxWeightLb" | "maxLongestIn") => {
    const i = bands.findIndex((b) => value <= b[key]);
    return i === -1 ? bands.length - 1 : i;
  };
  let idx = -1;
  if (weight > 0) idx = Math.max(idx, idxFor(weight, "maxWeightLb"));
  if (longest > 0) idx = Math.max(idx, idxFor(longest, "maxLongestIn"));
  // TV size is a proxy for handling when weight is unknown (never presented as a measured weight).
  if (idx === -1 && item.tv) {
    const big = (item.tv.inches ?? (item.tv.sizeBand === "56+" ? 60 : 40)) >= 56;
    idx = big ? Math.min(2, bands.length - 1) : Math.min(1, bands.length - 1);
    return { band: bands[idx]!, known: true, weight, longest };
  }
  if (idx === -1) return { band: bands[Math.min(1, bands.length - 1)]!, known: false, weight, longest };
  return { band: bands[idx]!, known: true, weight, longest };
}

function rank(mode: HelperMode): number {
  return mode === "required" ? 2 : mode === "recommended" ? 1 : 0;
}

// ------------------------------------------------------------------ per-item computation

interface ItemCtx {
  cfg: EconomicsConfig;
  W: WorkConfig;
  jobDifficult: boolean;
}

function computeItem(item: WorkItem, index: number, ctx: ItemCtx): { result: WorkItemResult; tasks: LaborTask[]; lines: MaterialLine[]; exclusions: string[] } {
  const { cfg, W } = ctx;
  const n = index + 1;
  const key = `item${n}`;
  const label = itemLabel(item, W);
  const tpl: WorkTemplate | undefined = item.templateId ? W.templates[item.templateId] : undefined;
  const categoryKnown = categoryOf(W, item.category);
  const category = categoryKnown ?? W.categories.custom;
  const isCustom = !categoryKnown || item.category === "custom";
  const phases = phasesOf(item);
  const placePhases = phases.filter((a) => PLACE_ACTIONS.includes(a));
  const hasPlace = placePhases.length > 0;
  const hasTakedown = phases.some((a) => a === "unmount" || a === "dismount" || a === "remove" || a === "disassemble" || a === "teardown" || a === "relocate");
  const hasBuild = phases.some((a) => a === "assemble" || a === "reassemble");
  const reasons: WorkReason[] = [];
  const questions: WorkQuestion[] = [];
  const confirm = (code: string, message: string, field?: string, question?: string) => {
    reasons.push({ code, severity: "confirm", message: `${label}: ${message}`, itemId: item.id });
    if (field && question) questions.push({ itemId: item.id, field, question });
  };
  const review = (code: string, message: string) => reasons.push({ code, severity: "manual_review", message: `${label}: ${message}`, itemId: item.id });
  const unsupported = (code: string, message: string) => reasons.push({ code, severity: "not_supported", message: `${label}: ${message}`, itemId: item.id });

  const tasks: LaborTask[] = [];
  const addTask = (suffix: string, text: string, minutes: number) => {
    if (minutes > 0) tasks.push({ key: `${key}.${suffix}`, label: `${label}: ${text}`, minutes });
  };

  // ---- complexity band
  const { band, known: bandKnown, weight, longest } = pickBand(W, item);
  const weightRelevant = (isCustom ? true : category.weightRelevant) && (hasPlace || hasTakedown);
  if (!bandKnown && weightRelevant) {
    confirm("weight_unknown", "weight and size not entered; handling is an allowance, not a measurement.", "weightLb", `What does the ${label.toLowerCase()} weigh, and roughly how big is it?`);
  }
  if (item.category === "tv" && !item.tv && !bandKnown) {
    questions.push({ itemId: item.id, field: "tv.sizeBand", question: "What size is the TV?" });
  }
  if (isCustom && longest === 0) confirm("dimensions_unknown", "dimensions not entered for a custom item.", "dimensions", `What are the dimensions of the ${label.toLowerCase()}?`);

  // ---- limits (review / refusal)
  const L = W.limits;
  if (weight >= L.notSupportedWeightLb) unsupported("too_heavy", `weight ${weight} lb is beyond what PPTV handles.`);
  else if (weight >= L.manualReviewWeightLb) review("heavy", `weight ${weight} lb needs manual review (equipment, crew and structure).`);
  if (longest > L.manualReviewLongestIn) review("oversize", `longest dimension ${longest} in needs manual review.`);
  const height = num(item.environment.heightFt);
  if (height > L.notSupportedHeightFt) unsupported("too_high", `work height ${height} ft is beyond safe ladder work.`);
  else if (height > L.manualReviewHeightFt) review("high", `work height ${height} ft needs manual review (ladder/lift and safety).`);
  for (const flag of item.riskFlags) {
    if (W.risk.notSupported.includes(flag)) unsupported(`risk_${flag}`, `${flag.replace(/_/g, " ")} is outside PPTV's scope.`);
    else if (W.risk.manualReview.includes(flag)) review(`risk_${flag}`, `${flag.replace(/_/g, " ")} requires manual review.`);
    else confirm(`risk_${flag}`, `${flag.replace(/_/g, " ")} noted; confirm before quoting.`);
  }

  const surface = item.environment.surface;
  if (hasPlace || (hasBuild && item.assembly?.wallAnchoring)) {
    if (surface === "ceiling" && L.ceilingMountRequiresReview) review("ceiling", "ceiling mounting needs the structure verified; manual review required.");
    if (surface === "unknown" && hasPlace) {
      if (weight >= L.unknownSurfaceReviewWeightLb) review("unknown_surface_heavy", `heavy item (${weight} lb) on an unknown surface; the substrate must be verified first.`);
      else confirm("surface_unknown", "wall/surface type unknown; hidden conditions are unverified until inspection.", "environment.surface", `What is the ${label.toLowerCase()} going on (drywall with studs, brick, concrete, tile, other)?`);
    }
    if (item.attachment === "unknown" && hasPlace && surface !== "freestanding" && surface !== "floor") {
      confirm("attachment_unknown", "attachment method unknown (studs, anchors, bracket, cleat).", "attachment", `How will the ${label.toLowerCase()} attach (studs, anchors, manufacturer bracket, rail/cleat)?`);
    }
  }
  if (item.relocation === "between_addresses" && item.pptvTransports && !L.transportSupported) {
    review("transport", "PPTV transporting items between addresses is not supported by default; manual review.");
  }
  if (item.restoration === "major_repair") review("major_repair", "larger wall repair is outside ordinary patching; manual review.");
  const exclusions: string[] = [];
  if (item.paintRequested && !L.paintSupported) {
    confirm("paint_excluded", "paint requested but painting is not offered; tell the customer it is excluded.");
    exclusions.push("Painting is not included.");
  }
  if (item.templateId && !tpl) confirm("template_missing", `template "${item.templateId}" no longer exists; priced from the category.`);
  if (!categoryKnown) confirm("category_unknown", `category "${item.category}" is not in the taxonomy; priced as a custom item.`);
  else if (isCustom) confirm("custom_item", "custom item priced from an allowance; confirm scope before quoting firmly.");
  if (isCustom && item.photoCount === 0) questions.push({ itemId: item.id, field: "photoCount", question: `Can the customer send photos of the ${label.toLowerCase()} (and the wall, if mounting)?` });

  // ---- labor
  const hasOwnerEstimate = item.ownerMinutesPerUnit !== undefined || item.assembly?.ownerMinutesPerUnit !== undefined;
  const act = (a: WorkAction): number | undefined => tpl?.laborMinutes?.[a] ?? category.actionMinutes?.[a];
  const customBase = W.customDefaultMinutes;
  const mountBase = act("mount") ?? act("install") ?? (isCustom ? customBase : W.actionBaseMinutes.mount);
  const hasMountMinutes = act("mount") !== undefined || act("install") !== undefined;
  const assembleBase = act("assemble") ?? (isCustom ? customBase : W.actionBaseMinutes.assemble);

  const A = W.assembly;
  const asm = item.assembly;
  let assembleEstimate: number;
  if (asm?.ownerMinutesPerUnit !== undefined) {
    assembleEstimate = asm.ownerMinutesPerUnit;
  } else {
    let m = assembleBase;
    const fromParts = num(asm?.partCount) * A.minutesPerPart + num(asm?.boxes) * A.minutesPerBox + num(asm?.majorComponents) * A.minutesPerMajorComponent;
    if (fromParts > 0) m = fromParts;
    m *= A.hardwareComplexityMultiplier[asm?.hardwareComplexity ?? "medium"] * A.instructionsMultiplier[asm?.instructions ?? "unknown"];
    assembleEstimate = m;
  }
  if ((phases.includes("assemble") || phases.includes("reassemble")) && asm?.ownerMinutesPerUnit === undefined) {
    const instr = asm?.instructions ?? "unknown";
    if (instr === "unknown" && !asm?.partCount && !asm?.boxes) {
      confirm("assembly_unknown", "assembly size unknown (manual, boxes, parts).", "assembly.instructions", `Is the assembly manual available, and about how many boxes/parts is the ${label.toLowerCase()}?`);
    } else if (instr === "none" || instr === "poor") {
      reasons.push({ code: "instructions_poor", severity: "confirm", message: `${label}: instructions ${instr === "none" ? "missing" : "poor"}; assembly time may run long.`, itemId: item.id });
    }
  }

  const baseFor = (a: WorkAction, primary: boolean): { minutes: number; basis: string } => {
    if (primary && item.ownerMinutesPerUnit !== undefined) return { minutes: item.ownerMinutesPerUnit, basis: "owner estimate" };
    const explicit = act(a);
    const buildType = !hasMountMinutes && act("assemble") !== undefined; // furniture-like
    switch (a) {
      case "mount":
      case "install":
        return { minutes: explicit ?? mountBase, basis: explicit !== undefined ? "template/category" : "default" };
      case "remount":
        return { minutes: explicit ?? mountBase, basis: explicit !== undefined ? "template/category" : "mount time" };
      case "assemble":
        return { minutes: assembleEstimate, basis: asm?.ownerMinutesPerUnit !== undefined ? "owner estimate" : "assembly estimate" };
      case "reassemble":
        return { minutes: explicit ?? assembleEstimate * W.reassembleFactor, basis: explicit !== undefined ? "template/category" : "assembly estimate x reassemble factor" };
      case "disassemble":
        return { minutes: explicit ?? assembleEstimate * W.disassembleFactor, basis: explicit !== undefined ? "template/category" : "assembly estimate x disassemble factor" };
      case "unmount":
      case "dismount":
      case "remove":
        if (explicit !== undefined) return { minutes: explicit, basis: "template/category" };
        if (buildType) return { minutes: assembleEstimate * W.disassembleFactor, basis: "breakdown of assembled item" };
        return { minutes: (isCustom && !hasMountMinutes ? customBase : mountBase) * W.reverseFactor, basis: "mount time x reverse factor" };
      case "teardown":
        if (explicit !== undefined) return { minutes: explicit, basis: "template/category" };
        return buildType
          ? { minutes: assembleEstimate * W.disassembleFactor, basis: "breakdown of assembled item" }
          : { minutes: mountBase * W.reverseFactor, basis: "mount time x reverse factor" };
      case "relocate":
        return { minutes: explicit ?? mountBase * (1 + W.reverseFactor), basis: explicit !== undefined ? "template/category" : "take down + put up" };
    }
  };

  phases.forEach((a, i) => {
    const b = baseFor(a, i === 0);
    addTask(`phase${i + 1}`, `${a} (${b.basis})`, Math.max(0, b.minutes));
  });

  // Handling band: once per phase.
  const handling = (bandKnown ? band.handlingMinutes : band.handlingMinutes + (weightRelevant ? W.unknownBandAllowanceMinutes : 0)) * phases.length;
  addTask("handling", `handling (${bandKnown ? band.label : `${band.label}, size unverified`})`, handling);

  // Environment: only for put-in-place phases.
  if (hasPlace) {
    addTask("surface", `${surface.replace(/_/g, " ")} surface`, W.surfaceMinutes[surface] * placePhases.length);
    addTask("attach", `${item.attachment.replace(/_/g, " ")} attachment`, W.attachmentMinutes[item.attachment] * placePhases.length);
  }
  if (hasBuild) {
    if (asm?.leveling) addTask("level", "leveling / alignment", A.levelingMinutes);
    if (asm?.wallAnchoring) addTask("anchor", "anchor to wall", A.wallAnchoringMinutes);
    if (asm?.packagingCleanup) addTask("packaging", "packaging cleanup", A.packagingCleanupMinutes);
  }
  if (hasTakedown) {
    const td = item.teardown;
    const full = phases.includes("teardown");
    if (td?.protectivePrep || full) addTask("prep", "protective prep", W.teardown.protectivePrepMinutes);
    if (td?.disconnection) addTask("disconnect", "disconnect cables / power", W.teardown.disconnectionMinutes);
    const sorting = (phases.includes("disassemble") || phases.includes("teardown") || phases.includes("reassemble")) && (td?.hardwareBagging ?? true);
    if (sorting) addTask("bagging", "sort, bag and label hardware", W.teardown.hardwareBaggingMinutes);
    if (item.restoration !== "none" && item.restoration !== "major_repair") addTask("restore", `restoration: ${item.restoration.replace(/_/g, " ")}`, W.restorationMinutes[item.restoration]);
  }
  if (item.relocation !== "none") addTask("move", `relocation: ${item.relocation.replace(/_/g, " ")}`, W.relocationMinutes[item.relocation]);

  // TV extension on a generic TV phase (take-down / remount / relocate): reuse the TV config.
  if (item.tv && hasPlace && !isSpecialisedTvItem(item)) {
    const L2 = cfg.labor;
    addTask("tv.location", `${item.tv.location.replace("_", " ")} location`, L2.locationMinutes[item.tv.location] ?? 0);
    addTask("tv.wire", `${item.tv.wire.replace("_", " ")} wiring`, L2.wireMinutes[item.tv.wire] ?? 0);
    if (item.tv.power === "outlet") addTask("tv.outlet", "outlet / clean-cord", L2.outletInstallMinutes);
    if (item.tv.power === "unknown") addTask("tv.power", "power not verified (allowance)", L2.powerUnknownMinutes);
  }

  // Access.
  const E = item.environment;
  const AC = W.access;
  const needsLadder = E.ladder || height > AC.ladderHeightFt;
  if (needsLadder) addTask("ladder", "ladder / height work", AC.ladderMinutes);
  if (E.stairs) addTask("stairs", "stairs", AC.stairsMinutes);
  if (E.tightSpace) addTask("tight", "tight workspace", AC.tightSpaceMinutes);
  if (E.furnitureMovement) addTask("furniture", "move furniture", AC.furnitureMovementMinutes);
  if (E.obstructions) addTask("obstructions", "obstructions", AC.obstructionsMinutes);

  // Disposal is never free.
  for (const kind of item.disposal) {
    addTask(`dispose_${kind}`, `disposal: ${kind.replace(/_/g, " ")}`, W.disposal[kind].minutes);
  }

  // Quantity: every unit after the first takes a fraction of the time. Disposal time scales plainly below.
  const unitFactor = 1 + (item.quantity - 1) * W.additionalUnitEfficiency;
  const scaled: LaborTask[] = tasks.map((t) => ({ ...t, minutes: Math.round(t.minutes * unitFactor) })).filter((t) => t.minutes > 0);
  let subtotal = scaled.reduce((s, t) => s + t.minutes, 0);

  if (E.difficultAccess && !ctx.jobDifficult) {
    const extra = Math.round(subtotal * (AC.difficultMultiplier - 1));
    if (extra > 0) {
      scaled.push({ key: `${key}.difficult`, label: `${label}: difficult access`, minutes: extra });
      subtotal += extra;
    }
  }
  if (subtotal < W.minimumItemMinutes) {
    const top = Math.ceil(W.minimumItemMinutes - subtotal);
    scaled.push({ key: `${key}.minimum`, label: `${label}: minimum time per item`, minutes: top });
    subtotal += top;
  }

  // ---- helper
  let helper: HelperMode = item.helper;
  if (rank(band.helper) > rank(helper) && (bandKnown || weightRelevant)) helper = band.helper;
  if (asm?.twoPerson) helper = "required";
  if (helper === "recommended" && !W.helper.costRecommended) confirm("helper_recommended", "a helper is recommended but not costed; confirm the plan.", "helper", `Will a helper be on site for the ${label.toLowerCase()}?`);
  const share = helper === "required" ? W.helper.requiredShare : helper === "recommended" && W.helper.costRecommended ? W.helper.recommendedShare : 0;
  const helperMinutes = Math.round(subtotal * share);

  // ---- materials
  const lines: MaterialLine[] = [];
  const customerHardware = item.hardwareSuppliedBy === "customer";
  const addRecipe = (recipeId: string, basis: string) => {
    const recipe = W.recipes[recipeId];
    if (!recipe) {
      confirm("recipe_missing", `material recipe "${recipeId}" is not configured.`);
      return;
    }
    for (const line of recipe.lines) {
      const qty = line.qty * item.quantity;
      const supplied = line.kind === "hardware" && customerHardware ? "customer" : "pptv";
      lines.push({
        recipe: recipeId,
        label: line.label,
        qty,
        unitCostCents: line.unitCostCents,
        costCents: supplied === "customer" ? 0 : safeCents(qty * line.unitCostCents),
        basis: `${label}: ${basis}${supplied === "customer" ? " (customer supplied)" : ""}`,
        supplier: supplied,
        itemId: item.id,
      });
    }
  };
  const used = new Set<string>();
  const useRecipe = (id: string | undefined, basis: string) => {
    if (!id || used.has(id)) return;
    used.add(id);
    addRecipe(id, basis);
  };
  for (const id of tpl?.recipes ?? []) useRecipe(id, "template recipe");
  for (const id of item.recipes) useRecipe(id, "owner-added recipe");
  if (hasPlace && surface !== "freestanding" && surface !== "floor" && item.attachment !== "freestanding_assembly") useRecipe(W.surfaceRecipes[surface], `${surface.replace(/_/g, " ")} fastening`);
  if (item.restoration === "minor_patch") useRecipe("patch_kit", "minor patching");
  if (item.tv && hasPlace && !isSpecialisedTvItem(item)) {
    if (item.tv.power === "outlet" && cfg.recipes.outlet_clean_cord) addRecipeFrom(cfg.recipes.outlet_clean_cord, "outlet_clean_cord", "outlet / clean-cord");
    if (item.tv.wire === "raceway" && cfg.recipes.surface_raceway) addRecipeFrom(cfg.recipes.surface_raceway, "surface_raceway", "raceway");
    if (item.tv.wire === "in_wall" && cfg.recipes.in_wall_low_voltage) addRecipeFrom(cfg.recipes.in_wall_low_voltage, "in_wall_low_voltage", "in-wall low-voltage");
  }
  function addRecipeFrom(recipe: EconomicsConfig["recipes"][string], id: string, basis: string) {
    for (const line of recipe.lines) {
      const qty = line.qty * item.quantity;
      lines.push({ recipe: id, label: line.label, qty, unitCostCents: line.unitCostCents, costCents: safeCents(qty * line.unitCostCents), basis: `${label}: ${basis}`, supplier: "pptv", itemId: item.id });
    }
  }
  if (hasPlace && !customerHardware && item.hardwareSuppliedBy === "unknown" && !isCustom) {
    confirm("hardware_unknown", "who supplies the mounting hardware is not set; hardware is included in cost.", "hardwareSuppliedBy", `Is the customer supplying the mounting hardware for the ${label.toLowerCase()}, or should PPTV?`);
  }
  for (const m of item.materials) {
    const supplied = m.supplier;
    lines.push({
      recipe: "item_materials",
      label: m.label,
      qty: m.qty * item.quantity,
      unitCostCents: m.unitCostCents,
      costCents: supplied === "customer" ? 0 : safeCents(m.qty * item.quantity * m.unitCostCents),
      basis: `${label}: owner-entered${supplied === "customer" ? " (customer supplied)" : ""}`,
      supplier: supplied,
      itemId: item.id,
    });
  }
  for (const kind of item.disposal) {
    const fee = W.disposal[kind].costCents;
    if (fee > 0) {
      lines.push({ recipe: "disposal", label: `Disposal: ${kind.replace(/_/g, " ")}`, qty: item.quantity, unitCostCents: fee, costCents: safeCents(fee * item.quantity), basis: `${label}: disposal fee`, supplier: "pptv", itemId: item.id });
    }
  }
  const materialsCost = lines.reduce((s, l) => s + l.costCents, 0);

  // ---- status / confidence
  let status: WorkStatus = "priced";
  for (const r of reasons) {
    const s: WorkStatus = r.severity === "not_supported" ? "not_supported" : r.severity === "manual_review" ? "manual_review_required" : "estimate_with_confirmation";
    status = worstStatus(status, s);
  }
  if (questions.length) status = worstStatus(status, "estimate_with_confirmation");
  const confidence: WorkItemResult["confidence"] = status === "manual_review_required" || status === "not_supported" || (isCustom && !hasOwnerEstimate) ? "low" : status === "estimate_with_confirmation" ? "medium" : "high";

  const result: WorkItemResult = {
    itemId: item.id,
    index,
    label,
    customerText: customerText(item, W),
    category: item.category,
    categoryLabel: category.label,
    templateId: item.templateId ?? null,
    action: item.action,
    thenAction: item.thenAction ?? null,
    quantity: item.quantity,
    site: item.site,
    bandKey: bandKnown ? band.key : null,
    bandLabel: bandKnown ? band.label : "Unknown size",
    minutes: subtotal,
    helperMode: helper,
    helperMinutes,
    materialsCostCents: materialsCost,
    templatePriceCents: tpl?.fixedPriceCents !== undefined ? safeCents(tpl.fixedPriceCents * item.quantity) : null,
    status,
    confidence,
    reasons,
    questions,
  };
  return { result, tasks: scaled, lines, exclusions };
}

// ------------------------------------------------------------------ job-level

export function computeWork(scope: JobScope, cfg: EconomicsConfig, opts: { siteCount?: number } = {}): WorkComputation {
  if (!scope.items.length) return EMPTY_WORK;
  const W = cfg.work;
  const ctx: ItemCtx = { cfg, W, jobDifficult: scope.access.level === "difficult" };
  const items: WorkItemResult[] = [];
  const tasks: LaborTask[] = [];
  const lines: MaterialLine[] = [];
  const reasons: WorkReason[] = [];
  const questions: WorkQuestion[] = [];
  const exclusions: string[] = [];
  let helperMinutes = 0;
  let status: WorkStatus = "priced";
  let templatePrice = 0;
  let unpriced = false;

  scope.items.forEach((item, i) => {
    const r = computeItem(item, i, ctx);
    items.push(r.result);
    tasks.push(...r.tasks);
    lines.push(...r.lines);
    reasons.push(...r.result.reasons);
    questions.push(...r.result.questions);
    for (const e of r.exclusions) if (!exclusions.includes(e)) exclusions.push(e);
    helperMinutes += r.result.helperMinutes;
    status = worstStatus(status, r.result.status);
    if (r.result.templatePriceCents === null) unpriced = true;
    else templatePrice += r.result.templatePriceCents;
  });

  const sites = Math.max(1, opts.siteCount ?? 1);
  for (let s = 2; s <= sites; s++) tasks.push({ key: `site${s}.setup`, label: `Setup at stop ${s}`, minutes: W.extraSite.setupMinutes });
  if (helperMinutes > 0 && W.helper.coordinationMinutes > 0) helperMinutes += W.helper.coordinationMinutes;

  const minutes = tasks.reduce((sum, t) => sum + t.minutes, 0);
  return { items, tasks, minutes, helperMinutes, materialLines: lines, reasons, questions, exclusions, status, templatePriceCents: safeCents(templatePrice), hasUnpricedItems: unpriced };
}
