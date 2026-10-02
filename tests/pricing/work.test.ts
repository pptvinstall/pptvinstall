import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_ECONOMICS_CONFIG,
  QuotePolicyError,
  composeQuote,
  findInternalKeys,
  itemFromTemplate,
  normalizeScope,
  parseJobScope,
  priceScope,
  toCustomerView,
  validateEconomicsConfig,
  type EconomicsConfig,
  type WorkItemInput,
} from "../../shared/pricing";
import { cfg, nearby } from "./helpers";

// Universal work model: representative generalized jobs, review rules, invariants.
// All numbers come from UNCALIBRATED DEFAULT assumptions; these tests lock behavior and
// invariants (labor present, helper/materials included, no NaN, separation), not dollar values.

const C = cfg();
const price = (items: WorkItemInput[], extra: Record<string, unknown> = {}, ctx: Record<string, unknown> = nearby, c: EconomicsConfig = C) => priceScope({ items, ...extra } as never, ctx as never, c);
const tpl = (id: string, over: Partial<WorkItemInput> = {}, c: EconomicsConfig = C) => itemFromTemplate(id, c, { id: over.id ?? id, ...over });
const sturdy = { weightLb: 12, hardwareSuppliedBy: "pptv" } as const;

function finiteEverywhere(value: unknown, path = "result"): void {
  if (typeof value === "number") assert.ok(Number.isFinite(value), `${path} is not finite: ${value}`);
  else if (Array.isArray(value)) value.forEach((v, i) => finiteEverywhere(v, `${path}[${i}]`));
  else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) finiteEverywhere(v, `${path}.${k}`);
}

function assertSane(r: ReturnType<typeof price>, label: string) {
  finiteEverywhere(r, label);
  assert.ok(r.labor.minutes > 0, `${label}: labor present`);
  assert.ok(r.labor.tasks.every((t) => t.minutes > 0), `${label}: no non-positive task`);
  assert.ok(r.floorCents > 0, `${label}: no accidental zero-price work`);
  assert.ok(r.recommendedCents >= r.floorCents, `${label}: recommended >= floor`);
  assert.ok(r.costToServeCents >= r.materials.costCents + r.labor.helperCostCents, `${label}: materials and helper included in cost`);
  assert.ok(r.work.items.every((i) => i.minutes >= C.work.minimumItemMinutes && i.quantity >= 1), `${label}: every item has real labor`);
}

// ---------------------------------------------------------------- single-item wall mounts
test("single shelf mount: labor, materials and travel flow through the generic engine", () => {
  const r = price([tpl("floating_shelf", { ...sturdy })]);
  assertSane(r, "shelf");
  assert.equal(r.work.items.length, 1);
  assert.ok(r.materials.costCents > 0, "bracket + stud fastening materials");
  assert.ok(r.travel.costCents > 0, "same travel engine");
  assert.equal(r.status, "priced", "weight and hardware stated, template known, route known");
  assert.equal(r.work.items[0]!.customerText, "Floating shelf mounting");
});

test("multiple shelves cost less per unit than one but more than one in total; materials scale with quantity", () => {
  const one = price([tpl("floating_shelf", { ...sturdy })]);
  const six = price([tpl("floating_shelf", { ...sturdy, quantity: 6 })]);
  const oneMin = one.work.items[0]!.minutes;
  const sixMin = six.work.items[0]!.minutes;
  assert.ok(sixMin > oneMin && sixMin < oneMin * 6, `${sixMin} between ${oneMin} and ${oneMin * 6}`);
  assert.equal(six.work.items[0]!.materialsCostCents, one.work.items[0]!.materialsCostCents * 6);
  assertSane(six, "6 shelves");
});

test("mirror, curtain rod, soundbar, camera, whiteboard all price from the same engine", () => {
  const cases: Array<[string, Partial<WorkItemInput>]> = [
    ["large_mirror", { hardwareSuppliedBy: "pptv" }],
    ["curtain_rod", { weightLb: 3, hardwareSuppliedBy: "pptv", environment: { surface: "drywall_unknown_studs" } }],
    ["soundbar", { hardwareSuppliedBy: "pptv", environment: { surface: "drywall_studs" } }],
    ["camera", { hardwareSuppliedBy: "pptv", attachment: "screws_fasteners", environment: { surface: "wood" } }],
    ["whiteboard", { weightLb: 20, hardwareSuppliedBy: "pptv" }],
  ];
  for (const [id, over] of cases) {
    const r = price([tpl(id, over)]);
    assertSane(r, id);
    assert.ok(r.materials.costCents > 0, `${id} has materials`);
    assert.ok(r.work.items[0]!.customerText.length > 0);
  }
});

test("large mirror is a heavier handling band with a costed recommended helper", () => {
  const r = price([tpl("large_mirror", { hardwareSuppliedBy: "pptv" })]);
  const item = r.work.items[0]!;
  assert.ok(["large", "two_person"].includes(item.bandKey ?? ""), `band ${item.bandKey}`);
  assert.notEqual(item.helperMode, "none");
  assert.ok(r.labor.helperMinutes > 0 && r.labor.helperCostCents > 0);
});

// ---------------------------------------------------------------- assembly
test("desk, bed, dresser and bookshelf assembly", () => {
  for (const id of ["desk_assembly", "bed_frame_assembly", "dresser_assembly", "bookshelf_assembly"]) {
    const r = price([tpl(id)]);
    assertSane(r, id);
    assert.equal(r.work.items[0]!.action, "assemble");
  }
});

test("assembly is driven by attributes, not per-model pricing", () => {
  const base = price([tpl("desk_assembly", { assembly: { instructions: "available", hardwareComplexity: "medium" } })]).work.items[0]!.minutes;
  const noManual = price([tpl("desk_assembly", { assembly: { instructions: "none", hardwareComplexity: "medium" } })]).work.items[0]!.minutes;
  const complex = price([tpl("desk_assembly", { assembly: { instructions: "available", hardwareComplexity: "high" } })]).work.items[0]!.minutes;
  const parts = price([tpl("desk_assembly", { assembly: { instructions: "available", hardwareComplexity: "medium", partCount: 120, boxes: 4 } })]).work.items[0]!.minutes;
  const owner = price([tpl("desk_assembly", { assembly: { ownerMinutesPerUnit: 200 } })]).work.items[0]!.minutes;
  assert.ok(noManual > base, "missing instructions take longer");
  assert.ok(complex > base, "complex hardware takes longer");
  assert.ok(parts > base, "120 parts and 4 boxes take longer than the default desk");
  assert.ok(owner >= 200, "owner estimate is honored");
});

test("assembly extras: leveling, wall anchoring, packaging cleanup and a required two-person helper", () => {
  const plain = price([tpl("dresser_assembly", { assembly: { instructions: "available", twoPerson: false } })]);
  const full = price([tpl("dresser_assembly", { assembly: { instructions: "available", twoPerson: true, leveling: true, wallAnchoring: true, packagingCleanup: true } })]);
  assert.ok(full.work.items[0]!.minutes > plain.work.items[0]!.minutes);
  assert.equal(full.work.items[0]!.helperMode, "required");
  assert.ok(full.labor.helperMinutes > 0);
  const keys = full.labor.tasks.map((t) => t.key).join(",");
  assert.match(keys, /level/);
  assert.match(keys, /anchor/);
  assert.match(keys, /packaging/);
});

// ---------------------------------------------------------------- teardown
test("teardown is real work, not negative installation", () => {
  const desk = price([tpl("furniture_disassembly", { assembly: { instructions: "available" } })]);
  assertSane(desk, "disassemble desk");
  assert.ok(desk.work.items[0]!.minutes > 0);
  assert.match(desk.labor.tasks.map((t) => t.key).join(","), /bagging/, "hardware is sorted, bagged and labelled");

  const unmountTv = price([{ id: "tv-down", action: "unmount", category: "tv", name: "TV", tv: { sizeBand: "56+" } }]);
  assertSane(unmountTv, "unmount TV");
  assert.equal(unmountTv.legacy.totalCents, 5_000, "catalog unmount price is the legacy figure");

  const shelves = price([tpl("wall_shelf_removal", { quantity: 3, restoration: "minor_patch", weightLb: 8 })]);
  assertSane(shelves, "remove wall shelves");
  assert.ok(shelves.materials.lines.some((l) => l.recipe === "patch_kit"), "minor patch uses the patch kit");
});

test("removal and wall restoration stay separate scope choices", () => {
  const leave = price([tpl("wall_shelf_removal", { restoration: "leave_hardware", weightLb: 8 })]);
  const hardwareOnly = price([tpl("wall_shelf_removal", { restoration: "remove_hardware_only", weightLb: 8 })]);
  const patch = price([tpl("wall_shelf_removal", { restoration: "minor_patch", weightLb: 8 })]);
  const m = (r: typeof leave) => r.work.items[0]!.minutes;
  assert.ok(m(hardwareOnly) >= m(leave) && m(patch) > m(hardwareOnly));
  const major = price([tpl("wall_shelf_removal", { restoration: "major_repair", weightLb: 8 })]);
  assert.equal(major.status, "manual_review_required", "larger repair is not ordinary patching");
});

test("disassemble + reassemble a bed prices both phases", () => {
  const bed = (o: Partial<WorkItemInput>) => tpl("bed_frame_assembly", { assembly: { instructions: "available", ownerMinutesPerUnit: 90 }, helper: "none", ...o });
  const only = price([bed({ action: "disassemble", id: "b1" })]).work.items[0]!;
  const asm = price([bed({ action: "assemble", id: "b2" })]).work.items[0]!;
  const both = price([bed({ action: "disassemble", thenAction: "reassemble", id: "b3" })]).work.items[0]!;
  assert.ok(both.minutes > only.minutes && both.minutes > asm.minutes);
  assert.equal(both.customerText, "Bed disassembly and reassembly");
});

test("relocate + remount a TV: catalog take-down and remount, between-rooms move and stairs", () => {
  const r = price([{ id: "tv-move", action: "unmount", thenAction: "remount", category: "tv", name: "TV", relocation: "between_rooms", environment: { stairs: true }, tv: { sizeBand: "56+", inches: 65 } }]);
  assertSane(r, "relocate TV");
  assert.equal(r.legacy.totalCents, 10_000, "unmount $50 + remount $50 from the existing catalog");
  const keys = r.labor.tasks.map((t) => t.key).join(",");
  assert.match(keys, /move/);
  assert.match(keys, /stairs/);
});

// ---------------------------------------------------------------- mixed jobs
test("mixed job: TV + mirror + shelf + dresser assembly, priced together with one setup", () => {
  const items: WorkItemInput[] = [
    { id: "tv", action: "mount", category: "tv", name: "TV", tv: { sizeBand: "56+", inches: 65 }, environment: { surface: "drywall_studs" } },
    tpl("large_mirror", { id: "mir", hardwareSuppliedBy: "pptv" }),
    tpl("floating_shelf", { id: "shf", ...sturdy }),
    tpl("dresser_assembly", { id: "drs" }),
  ];
  const r = price(items);
  assertSane(r, "mixed");
  assert.equal(r.labor.tasks.filter((t) => t.key === "setup").length, 1, "one visit setup");
  assert.equal(r.work.items.length, 3, "the mounted TV is priced by the TV engine");
  assert.ok(r.labor.tasks.some((t) => /^tv1\./.test(t.key)), "TV specialisation preserved");
  assert.ok(r.legacy.totalCents >= 10_000, "catalog TV price still applies");
  assert.equal(r.siteCount, 1);
});

test("large mixed job: many mounting and assembly items stay coherent", () => {
  const items: WorkItemInput[] = [
    tpl("floating_shelf", { id: "a", quantity: 4, ...sturdy }),
    tpl("large_mirror", { id: "b", quantity: 2, hardwareSuppliedBy: "pptv" }),
    tpl("curtain_rod", { id: "c", quantity: 5 }),
    tpl("desk_assembly", { id: "d", quantity: 2 }),
    tpl("bed_frame_assembly", { id: "e" }),
    tpl("dresser_assembly", { id: "f" }),
    tpl("bookshelf_assembly", { id: "g", quantity: 3 }),
    tpl("soundbar", { id: "h", environment: { surface: "drywall_studs" } }),
    tpl("camera", { id: "i", quantity: 2, hardwareSuppliedBy: "pptv", attachment: "screws_fasteners", environment: { surface: "wood" } }),
    tpl("furniture_disassembly", { id: "j", quantity: 2, assembly: { instructions: "available" } }),
  ];
  const r = price(items, { access: { level: "difficult", helper: true } });
  assertSane(r, "large mixed");
  assert.ok(r.labor.minutes > 400);
  assert.ok(r.labor.helperMinutes > 0);
  const taskSum = r.labor.tasks.reduce((s, t) => s + t.minutes, 0);
  assert.equal(taskSum, r.labor.minutes, "task list adds up to total minutes");
});

// ---------------------------------------------------------------- uncertainty / custom
test("unknown custom item raises questions, is an estimate, and still prices", () => {
  const r = price([{ id: "x", action: "mount", category: "custom", name: "Weird thing" }]);
  assertSane(r, "custom");
  assert.equal(r.status, "estimate_with_confirmation");
  assert.equal(r.confidence, "low");
  assert.ok(r.questions.length >= 3, "weight/size, dimensions, surface, attachment, photos");
  assert.ok(r.questions.some((q) => /weigh/i.test(q.question)));
  assert.ok(r.questions.some((q) => /photos/i.test(q.question)));
});

test("an unknown category slug never fails; it is priced as custom and flagged", () => {
  const r = price([{ id: "x", action: "install", category: "hot_tub_cover" }]);
  assertSane(r, "unknown category");
  assert.equal(r.status, "estimate_with_confirmation");
  assert.ok(r.statusReasons.some((x) => x.code === "category_unknown"));
});

test("weight unknown on relevant work asks instead of guessing; known weight removes the question", () => {
  const unknown = price([{ id: "m", action: "mount", category: "mirror", name: "Mirror", environment: { surface: "drywall_studs" }, attachment: "rail_cleat", hardwareSuppliedBy: "pptv" }]);
  assert.ok(unknown.questions.some((q) => /weigh/i.test(q.question)));
  assert.equal(unknown.work.items[0]!.bandKey, null, "no band is invented");
  const known = price([{ id: "m", action: "mount", category: "mirror", name: "Mirror", weightLb: 18, environment: { surface: "drywall_studs" }, attachment: "rail_cleat", hardwareSuppliedBy: "pptv" }]);
  assert.ok(!known.questions.some((q) => /weigh/i.test(q.question)));
  assert.equal(known.work.items[0]!.bandKey, "standard");
});

test("unknown wall/surface and attachment trigger confirmation questions", () => {
  const r = price([{ id: "s", action: "mount", category: "shelf", name: "Shelf", weightLb: 9, hardwareSuppliedBy: "pptv" }]);
  assert.equal(r.status, "estimate_with_confirmation");
  assert.ok(r.questions.some((q) => /going on|made of|drywall/i.test(q.question)));
  assert.ok(r.questions.some((q) => /attach/i.test(q.question)));
});

// ---------------------------------------------------------------- manual review / unsupported
test("manual-review and unsupported rules", () => {
  const base = { id: "x", action: "mount", category: "shelf", name: "Shelf", weightLb: 9, hardwareSuppliedBy: "pptv", attachment: "stud_mounted", environment: { surface: "drywall_studs" } } as const;
  const status = (over: Partial<WorkItemInput>) => price([{ ...base, ...over } as WorkItemInput]).status;

  assert.equal(status({}), "priced");
  for (const flag of ["gas_line", "roof_work", "high_voltage_or_panel", "new_circuit", "load_bearing", "permit_or_license_required", "hazardous_material", "outside_capability"] as const) {
    assert.equal(status({ riskFlags: [flag] }), "not_supported", flag);
  }
  for (const flag of ["structural_modification", "plumbing_work", "unsafe_height", "unknown_structure", "ceiling_suspension", "commercial_rigging"] as const) {
    assert.equal(status({ riskFlags: [flag] }), "manual_review_required", flag);
  }
  assert.equal(status({ weightLb: 200 }), "manual_review_required", "very heavy");
  assert.equal(status({ weightLb: 500 }), "not_supported", "beyond limit");
  assert.equal(status({ environment: { surface: "ceiling" } }), "manual_review_required", "ceiling mount needs the structure verified");
  assert.equal(status({ environment: { surface: "drywall_studs", heightFt: 15 } }), "manual_review_required", "unsafe height");
  assert.equal(status({ environment: { surface: "drywall_studs", heightFt: 25 } }), "not_supported");
  assert.equal(status({ dimensions: { widthIn: 150 } }), "manual_review_required", "oversized");
  assert.equal(status({ environment: { surface: "unknown" }, weightLb: 80 }), "manual_review_required", "heavy item on unknown substrate");
  assert.equal(status({ relocation: "between_addresses", pptvTransports: true }), "manual_review_required", "transport is not ordinary mounting");
});

test("review gates stop quoting: unsupported never quotes; manual review needs an owner-reviewed price", () => {
  const unsafe = { items: [{ id: "g", action: "install", category: "custom", riskFlags: ["gas_line"] }] };
  try {
    composeQuote({ scope: unsafe as never, context: nearby, config: C });
    assert.fail("should throw");
  } catch (e) {
    assert.ok(e instanceof QuotePolicyError);
    assert.equal((e as QuotePolicyError).code, "NOT_SUPPORTED");
  }
  assert.throws(() => composeQuote({ scope: unsafe as never, context: nearby, config: C, adjustment: { type: "override", amountCents: 50_000, reason: "other", note: "reviewed" } }), /NOT_SUPPORTED|do not do|does not do/i);

  const review = { items: [{ id: "c", action: "mount", category: "projector", environment: { surface: "ceiling" } }] };
  assert.throws(() => composeQuote({ scope: review as never, context: nearby, config: C }), (e: unknown) => (e as QuotePolicyError).code === "MANUAL_REVIEW_REQUIRED");
  assert.throws(() => composeQuote({ scope: review as never, context: nearby, config: C, adjustment: { type: "discount", discountCents: 1_000, reason: "bundle" } }), (e: unknown) => (e as QuotePolicyError).code === "MANUAL_REVIEW_REQUIRED");
  const reviewed = composeQuote({ scope: review as never, context: nearby, config: C, adjustment: { type: "override", amountCents: 40_000, reason: "other", note: "Site visit done; structure verified" } });
  assert.equal(reviewed.customerTotalCents, 40_000);
  assert.equal(reviewed.requiresReview, true);
});

test("paint is excluded and the exclusion is customer-visible", () => {
  const r = price([tpl("wall_shelf_removal", { weightLb: 8, paintRequested: true, restoration: "minor_patch" })]);
  assert.deepEqual(r.exclusions, ["Painting is not included."]);
  const quote = composeQuote({ scope: { items: [tpl("wall_shelf_removal", { weightLb: 8, paintRequested: true, restoration: "minor_patch" })] } as never, context: nearby, config: C, adjustment: { type: "override", amountCents: 20_000, reason: "other", note: "Owner confirmed price" } });
  const view = toCustomerView(quote, { version: 1, createdAt: "2026-01-01T00:00:00.000Z" });
  assert.ok(view.notes.includes("Painting is not included."));
});

// ---------------------------------------------------------------- helper, materials, disposal
test("helper economics: required helper adds hours, cost and schedule coordination to internal cost", () => {
  const solo = price([tpl("dresser_assembly", { helper: "none", assembly: { instructions: "available", twoPerson: false } })]);
  const crew = price([tpl("dresser_assembly", { helper: "required", assembly: { instructions: "available", twoPerson: false } })]);
  assert.equal(solo.labor.helperMinutes, 0);
  assert.ok(crew.labor.helperMinutes > C.work.helper.coordinationMinutes);
  assert.ok(crew.costToServeCents > solo.costToServeCents + 0);
  assert.ok(crew.labor.helperCostCents > 0 && crew.outOfPocketCents >= crew.labor.helperCostCents);
});

test("recommended helper is costed by default and can be set to flag-only", () => {
  const item = tpl("bed_frame_assembly", { helper: "recommended", assembly: { instructions: "available", twoPerson: false } });
  assert.ok(price([item]).labor.helperMinutes > 0);
  const flagOnly = cfg((c) => { c.work.helper.costRecommended = false; });
  const r = price([item], {}, nearby, flagOnly);
  assert.equal(r.labor.helperMinutes, 0);
  assert.ok(r.questions.some((q) => /helper/i.test(q.question)));
});

test("materials: customer-supplied hardware is tracked at zero cost; PPTV-supplied is costed", () => {
  const mine = price([tpl("floating_shelf", { weightLb: 12, hardwareSuppliedBy: "customer" })]);
  const ours = price([tpl("floating_shelf", { weightLb: 12, hardwareSuppliedBy: "pptv" })]);
  assert.ok(mine.materials.lines.some((l) => l.supplier === "customer" && l.costCents === 0 && l.unitCostCents > 0), "listed, quantity and unit cost tracked");
  assert.ok(ours.materials.costCents > mine.materials.costCents);
  assert.ok(ours.costToServeCents > mine.costToServeCents);
  const custom = price([{ id: "z", action: "mount", category: "shelf", weightLb: 5, hardwareSuppliedBy: "pptv", attachment: "stud_mounted", environment: { surface: "drywall_studs" }, materials: [{ label: "Special brackets", qty: 2, unitCostCents: 1_250, supplier: "pptv" }] }]);
  assert.ok(custom.materials.lines.some((l) => l.label === "Special brackets" && l.costCents === 2_500));
});

test("disposal is never assumed free", () => {
  const without = price([tpl("furniture_disassembly", { assembly: { instructions: "available" } })]);
  const withHaul = price([tpl("furniture_disassembly", { assembly: { instructions: "available" }, disposal: ["old_item", "debris", "packaging"] })]);
  assert.ok(withHaul.work.items[0]!.minutes > without.work.items[0]!.minutes);
  assert.ok(withHaul.materials.costCents > without.materials.costCents);
  assert.ok(withHaul.materials.lines.some((l) => l.recipe === "disposal"));
});

// ---------------------------------------------------------------- environment / travel
test("surface and attachment complexity: masonry costs more time and materials than drywall studs", () => {
  const drywall = price([tpl("floating_shelf", { ...sturdy, environment: { surface: "drywall_studs" } })]);
  const brick = price([tpl("floating_shelf", { ...sturdy, environment: { surface: "brick" } })]);
  assert.ok(brick.work.items[0]!.minutes > drywall.work.items[0]!.minutes);
  assert.ok(brick.materials.costCents > drywall.materials.costCents);
});

test("height above the ladder threshold adds ladder time without a flag", () => {
  const low = price([tpl("curtain_rod", { weightLb: 3 })]);
  const high = price([tpl("curtain_rod", { weightLb: 3, environment: { surface: "drywall_unknown_studs", heightFt: 10 } })]);
  assert.ok(high.labor.tasks.some((t) => /ladder/.test(t.key)));
  assert.ok(!low.labor.tasks.some((t) => /ladder/.test(t.key)));
});

test("multi-address jobs use the same travel engine: legs, return trip, extra-site setup, and missing distances are flagged", () => {
  const items: WorkItemInput[] = [tpl("furniture_disassembly", { id: "a", assembly: { instructions: "available" } }), tpl("bed_frame_assembly", { id: "b", action: "reassemble", site: 1, assembly: { instructions: "available" } })];
  const one = price([items[0]!]);
  const two = price(items, {}, { oneWayMiles: 12, oneWayDriveMinutes: 25, extraStops: [{ legMiles: 9, legMinutes: 20 }] });
  assert.equal(two.siteCount, 2);
  assert.equal(two.travel.roundTripMiles, 15 + 10 + 15, "banded outbound + leg + return");
  assert.ok(two.travel.roundTripMiles > one.travel.roundTripMiles);
  assert.ok(two.labor.tasks.some((t) => t.key === "site2.setup"));
  const missing = price(items, {}, { oneWayMiles: 12, oneWayDriveMinutes: 25 });
  assert.equal(missing.siteCount, 2, "an item at site 1 creates the stop");
  assert.ok(missing.uncertainties.some((u) => /Distance to stop 2 not entered/.test(u)));
  assert.equal(missing.status, "estimate_with_confirmation");
});

test("travel for a single address is unchanged by the multi-stop code", () => {
  const r = priceScope({ tvs: [{ id: "t", sizeBand: "56+" }] } as never, { oneWayMiles: 8, oneWayDriveMinutes: 20 }, C);
  assert.equal(r.travel.roundTripMiles, 20);
  assert.equal(r.travel.roundTripDriveMinutes, 40);
});

// ---------------------------------------------------------------- templates and config
test("templates pre-fill but every field stays editable; owner templates need no code", () => {
  const item = itemFromTemplate("desk_assembly", C, { id: "d", quantity: 3, name: "Standing desk", weightLb: 90 });
  assert.equal(item.templateId, "desk_assembly");
  assert.equal(item.action, "assemble");
  assert.equal(item.environment.surface, "freestanding");
  assert.equal(item.quantity, 3);
  assert.equal(item.name, "Standing desk");

  const custom = cfg((c) => {
    c.work.categories.kayak_rack = { label: "Kayak rack", group: "Storage", weightRelevant: true, keywords: ["kayak rack"], actionMinutes: { install: 70 } };
    c.work.templates.kayak_rack_install = { label: "Kayak rack", category: "kayak_rack", action: "install", recipes: ["fasteners_masonry"], fixedPriceCents: 17_500, defaults: { surface: "masonry", weightLb: 30 } };
  });
  validateEconomicsConfig(custom);
  const it = itemFromTemplate("kayak_rack_install", custom, { id: "k" });
  const r = price([it], {}, nearby, custom);
  assertSane(r, "new template");
  assert.equal(r.work.items[0]!.categoryLabel, "Kayak rack");
  assert.equal(r.work.items[0]!.templatePriceCents, 17_500);
  assert.equal(r.legacy.totalCents, 17_500, "an owner-defined template price is a legitimate catalog price");
});

test("config validation: templates must reference real recipes; old configs without `work` still load", () => {
  const bad = cfg((c) => { c.work.templates.oops = { label: "Oops", category: "shelf", action: "mount", recipes: ["does_not_exist"] }; });
  assert.throws(() => validateEconomicsConfig(bad), /unknown recipe/);
  const legacyStored = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
  delete legacyStored.work;
  const loaded = validateEconomicsConfig(legacyStored);
  assert.ok(Object.keys(loaded.work.templates).length > 5);
});

test("a missing template falls back to the category and is flagged", () => {
  const r = price([{ id: "x", action: "mount", category: "shelf", templateId: "deleted_template", weightLb: 5, hardwareSuppliedBy: "pptv", attachment: "stud_mounted", environment: { surface: "drywall_studs" } }]);
  assert.ok(r.statusReasons.some((x) => x.code === "template_missing"));
  assertSane(r, "missing template");
});

// ---------------------------------------------------------------- TV specialisation
test("TV specialisation is preserved: a TV work item prices identically to the specialised TV scope", () => {
  const viaItem = priceScope(
    { items: [{ id: "tv", action: "mount", category: "tv", name: "TV", environment: { surface: "brick" }, tv: { sizeBand: "56+", inches: 75, location: "fireplace", mountSource: "pptv", mountType: "full_motion", wire: "raceway", power: "outlet" } }] } as never,
    nearby,
    C,
  );
  const viaTv = priceScope({ tvs: [{ id: "tv-1", sizeBand: "56+", inches: 75, wall: "brick", location: "fireplace", mountSource: "pptv", mountType: "full_motion", wire: "raceway", power: "outlet" }] } as never, nearby, C);
  assert.equal(viaItem.labor.minutes, viaTv.labor.minutes);
  assert.equal(viaItem.materials.costCents, viaTv.materials.costCents);
  assert.equal(viaItem.floorCents, viaTv.floorCents);
  assert.equal(viaItem.legacy.totalCents, viaTv.legacy.totalCents);
  assert.equal(viaItem.work.items.length, 0, "priced by the TV engine, not duplicated");
});

test("normalizeScope folds only fresh TV mounts; take-down and remount stay generic", () => {
  const scope = parseJobScope({
    items: [
      { id: "a", action: "mount", category: "tv", tv: { sizeBand: "56+" }, quantity: 2 },
      { id: "b", action: "unmount", category: "tv", quantity: 3 },
      { id: "c", action: "remove", thenAction: "install", category: "tv", tv: { sizeBand: "32-55" } },
    ],
  });
  const n = normalizeScope(scope);
  assert.equal(n.tvs.length, 3, "2 mounts + remove-and-replace install");
  assert.equal(n.items.length, 1);
  assert.ok(n.tvs.some((t) => t.removal.tvRemoval), "remove-and-replace includes the old TV take-down");
});

test("TV take-down uses the catalog unmount price and TV size as handling proxy (never a measured weight)", () => {
  const r = price([{ id: "d", action: "unmount", category: "tv", quantity: 4, tv: { sizeBand: "56+" } }]);
  assert.equal(r.legacy.totalCents, 20_000);
  assert.equal(r.work.items[0]!.bandKey, "large");
});

// ---------------------------------------------------------------- customer / internal separation
test("customer view is understandable and contains no internal economics", () => {
  const scope = {
    items: [
      tpl("bed_frame_assembly", { id: "bed", name: "King bed", assembly: { instructions: "available", twoPerson: true } }),
      tpl("nightstand_x" in C.work.templates ? "nightstand_x" : "desk_assembly", { id: "ns", name: "Nightstand", quantity: 2 }),
      tpl("large_mirror", { id: "mirror", name: "Mirror", hardwareSuppliedBy: "pptv" }),
      { id: "tv", action: "mount", category: "tv", name: "TV", tv: { sizeBand: "56+", inches: 65 }, environment: { surface: "drywall_studs" } },
    ],
  };
  const q = composeQuote({ scope: scope as never, context: nearby, config: C, adjustment: { type: "override", amountCents: 85_000, reason: "other", note: "Owner confirmed price" } });
  const view = toCustomerView(q, { version: 1, createdAt: "2026-01-01T00:00:00.000Z" });
  const text = JSON.stringify(view);
  assert.deepEqual(findInternalKeys(view), []);
  assert.match(text, /King bed assembly/);
  assert.match(text, /Mirror mounting/);
  for (const secret of ["floor", "margin", "cost to serve", "hourly", "labor", "helper", "recommended", "risk", "confidence", "uncalibrated", "owner"]) {
    assert.ok(!text.toLowerCase().includes(secret), `customer payload must not mention "${secret}"`);
  }
  assert.equal(view.totalCents, 85_000);
});

test("dynamic mode: customer lines use the item names and add up to the total", () => {
  const dyn = cfg((c) => { c.pricingMode = "dynamic"; });
  const items = [tpl("desk_assembly", { id: "d", name: "Desk" }), tpl("floating_shelf", { id: "s", name: "Floating shelf", ...sturdy })];
  const q = composeQuote({ scope: { items } as never, context: nearby, config: dyn });
  const labels = q.customerLines.map((l) => l.label);
  assert.ok(labels.some((l) => /Desk assembly/.test(l)));
  assert.ok(labels.some((l) => /Floating shelf mounting/.test(l)));
  assert.equal(q.customerLines.reduce((s, l) => s + (l.amountCents ?? 0), 0), q.customerTotalCents);
});

test("legacy mode: items without a catalog or template price are explicit custom-priced lines, never invented numbers", () => {
  const q = composeQuote({ scope: { items: [tpl("desk_assembly", { id: "d", name: "Desk" })] } as never, context: nearby, config: C, adjustment: { type: "override", amountCents: 12_000, reason: "other", note: "Owner price" } });
  // Without an owner price the catalog has nothing to say: an explicit unpriced line, not an invented number.
  const unpriced = composeQuote({ scope: { items: [tpl("desk_assembly", { id: "d", name: "Desk" })] } as never, context: nearby, config: C });
  assert.ok(unpriced.customerLines.some((l) => l.amountCents === null && /Desk assembly/.test(l.label)));
  // With the owner's reviewed price, that single unpriced line carries the owner's amount.
  assert.ok(q.customerLines.some((l) => l.amountCents === 12_000 && /Desk assembly/.test(l.label)));
  assert.ok(!q.customerLines.some((l) => l.amountCents === null));
  assert.equal(q.customerTotalCents, 12_000);
  assert.equal(q.baseSource, "legacy_catalog");
  assert.equal(q.baseCustomerCents, 0);
});

// ---------------------------------------------------------------- invariants (seeded random)
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test("invariants over 500 random generalized scopes: no NaN, no negatives, no zero-price work, separation holds", () => {
  const rand = rng(20261001);
  const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
  const cats = [...Object.keys(C.work.categories), "totally_new_thing"];
  const actions = ["mount", "install", "assemble", "reassemble", "remount", "relocate", "unmount", "dismount", "remove", "disassemble", "teardown"] as const;
  const surfaces = ["drywall_studs", "drywall_unknown_studs", "brick", "concrete", "stone", "masonry", "steel_studs", "wood", "tile", "ceiling", "floor", "freestanding", "furniture_attachment", "unknown"] as const;
  let quoted = 0;
  for (let n = 0; n < 500; n++) {
    const count = 1 + Math.floor(rand() * 8);
    const items: WorkItemInput[] = [];
    for (let i = 0; i < count; i++) {
      const category = pick(cats);
      const action = pick(actions);
      items.push({
        id: `i${i}`,
        action,
        ...(rand() < 0.25 ? { thenAction: pick(actions.filter((a) => a !== action)) } : {}),
        category,
        quantity: 1 + Math.floor(rand() * 6),
        ...(rand() < 0.5 ? { weightLb: Math.round(rand() * 120 * 10) / 10 + 0.1 } : {}),
        ...(rand() < 0.3 ? { dimensions: { widthIn: 5 + Math.round(rand() * 80) } } : {}),
        hardwareSuppliedBy: pick(["customer", "pptv", "included", "unknown"] as const),
        attachment: pick(["unknown", "stud_mounted", "rail_cleat", "freestanding_assembly"] as const),
        helper: pick(["none", "recommended", "required"] as const),
        relocation: pick(["none", "same_room", "between_rooms"] as const),
        disposal: rand() < 0.2 ? ["old_item"] : [],
        restoration: pick(["none", "leave_hardware", "remove_hardware_only", "minor_patch"] as const),
        ...(rand() < 0.4 ? { site: Math.floor(rand() * 3) } : {}),
        environment: { surface: pick(surfaces), ...(rand() < 0.2 ? { heightFt: Math.round(rand() * 15) } : {}), ladder: rand() < 0.2, stairs: rand() < 0.2, tightSpace: rand() < 0.2, furnitureMovement: rand() < 0.2, obstructions: rand() < 0.2, difficultAccess: rand() < 0.2 },
        ...(rand() < 0.2 ? { assembly: { partCount: 1 + Math.floor(rand() * 200), boxes: 1 + Math.floor(rand() * 6), hardwareComplexity: pick(["low", "medium", "high"] as const), instructions: pick(["available", "poor", "none", "unknown"] as const), twoPerson: rand() < 0.3, leveling: rand() < 0.3, wallAnchoring: rand() < 0.3, packagingCleanup: rand() < 0.3 } } : {}),
        riskFlags: rand() < 0.08 ? [pick(["structural_modification", "gas_line", "ceiling_suspension"] as const)] : [],
        ...(category === "tv" && rand() < 0.5 ? { tv: { sizeBand: pick(["32-55", "56+"] as const) } } : {}),
      } as WorkItemInput);
    }
    const ctx = rand() < 0.5 ? { oneWayMiles: Math.round(rand() * 40), oneWayDriveMinutes: Math.round(rand() * 80) } : {};
    const r = priceScope({ items, access: { level: rand() < 0.2 ? "difficult" : "normal", helper: rand() < 0.2 } } as never, ctx, C);
    finiteEverywhere(r, `scope#${n}`);
    assert.ok(r.labor.minutes > 0 && r.labor.ownerCostCents >= 0 && r.labor.helperCostCents >= 0);
    assert.ok(r.labor.tasks.every((t) => t.minutes > 0), "no negative or zero task");
    assert.ok(r.materials.costCents >= 0 && r.materials.lines.every((l) => l.qty >= 0 && l.costCents >= 0));
    assert.ok(r.floorCents > 0, "no accidental zero-price work");
    assert.ok(r.recommendedCents >= r.floorCents && r.premiumCents >= r.recommendedCents);
    assert.ok(r.costToServeCents >= r.materials.costCents + r.labor.helperCostCents, "helper and materials in cost");
    assert.ok(r.work.items.every((i) => i.quantity >= 1 && i.minutes >= C.work.minimumItemMinutes));
    assert.equal(r.labor.tasks.reduce((s, t) => s + t.minutes, 0), r.labor.minutes);
    assert.ok(["priced", "estimate_with_confirmation", "manual_review_required", "not_supported"].includes(r.status));
    const hasNotSupported = r.statusReasons.some((x) => x.severity === "not_supported");
    if (hasNotSupported) assert.equal(r.status, "not_supported");
    // Unknown scope must raise questions.
    if (r.work.items.some((i) => i.category === "totally_new_thing")) assert.ok(r.questions.length > 0);

    // Quote gates are consistent with status, and the customer payload never leaks.
    const adj = { type: "override", amountCents: 50_000, acknowledgeDeepDiscount: true, reason: "other", note: "random owner review" };
    if (r.status === "not_supported") assert.throws(() => composeQuote({ scope: { items } as never, context: ctx, config: C, adjustment: adj }), QuotePolicyError);
    else {
      const q = composeQuote({ scope: { items, access: { level: "normal", helper: false } } as never, context: ctx, config: C, adjustment: adj });
      const view = toCustomerView(q, { version: 1, createdAt: "2026-01-01T00:00:00.000Z" });
      assert.deepEqual(findInternalKeys(view), []);
      quoted += 1;
    }
  }
  assert.ok(quoted > 300, `enough quotable scopes exercised (${quoted})`);
});
