import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { DbJobOsStore } from "../../server/jobos/dbStore";
import { MemoryJobOsStore } from "../../server/jobos/memoryStore";
import { ConflictError, JobOsService } from "../../server/jobos/service";
import type { JobOsStore } from "../../server/jobos/store";
import { DEFAULT_ECONOMICS_CONFIG, QuotePolicyError, findInternalKeys, itemFromTemplate, parseJobScope, priceScope } from "../../shared/pricing";
import {
  aiScopeIntakeSchema,
  buildIntakePrompt,
  heuristicIntake,
  intakeToScopeDraft,
  sanitizeWorkItems,
  verifyEvidence,
  workItemIntakeSchema,
  type WorkItemIntake,
} from "../../shared/jobos";
import { createTestDb } from "./pg";

const W = DEFAULT_ECONOMICS_CONFIG.work;
const draftFor = (message: string) => {
  const intake = verifyEvidence(heuristicIntake(message), message).intake;
  return intakeToScopeDraft(intake, "heuristic", W);
};
const summary = (message: string) => {
  const d = draftFor(message);
  const scope = d.scope as { tvs: unknown[]; extras: Array<{ kind: string; qty: number }>; items: Array<Record<string, unknown>> };
  return { draft: d, scope, items: scope.items.map((i) => `${i.action}${i.thenAction ? "+" + i.thenAction : ""}:${i.category}x${i.quantity}${i.site ? "@" + i.site : ""}`) };
};

// ----------------------------------------------------------------------------- intake examples
test("intake: owner's example messages become separate structured candidate items", () => {
  const a = summary("Need a 75 mounted over the fireplace and a floating shelf under it.");
  assert.equal(a.scope.tvs.length, 1, "the 75 is a TV mount on the specialised TV path");
  assert.deepEqual(a.items, ["mount:shelfx1"]);
  assert.equal((a.scope.tvs[0] as { location: string }).location, "fireplace");

  assert.deepEqual(summary("Take down 4 TVs and six wire shelves.").items, ["unmount:tvx4", "unmount:shelfx6"]);
  assert.deepEqual(summary("Put together a king bed, dresser, two nightstands and mount a mirror.").items, ["assemble:bedx1", "assemble:dresserx1", "assemble:nightstandx2", "mount:mirrorx1"]);
  assert.deepEqual(summary("Move a TV from downstairs to upstairs and remount it.").items, ["unmount+remount:tvx1"]);
  assert.deepEqual(summary("Take apart this desk because I'm moving.").items, ["disassemble:deskx1"]);
  assert.deepEqual(summary("Mount three curtain rods and two mirrors.").items, ["mount:curtain_rodx3", "mount:mirrorx2"]);
  assert.deepEqual(summary("Customer bought some big cabinet thing from IKEA and wants it put together.").items, ["assemble:cabinetx1"]);
});

test("intake: relocation between rooms is captured from the customer's words", () => {
  const { scope } = summary("Move a TV from downstairs to upstairs and remount it.");
  const item = scope.items[0]!;
  assert.equal(item.relocation, "between_rooms");
  assert.deepEqual(item.environment, { stairs: true });
});

test("intake: the north-star move decomposes into separate work items across two addresses and prices", () => {
  const message = "She moving out. Take down 4 TVs, remove six wire shelves, take apart a king bed and dresser, then at the new place put the bed back together and mount two of the TVs.";
  const { draft, scope, items } = summary(message);
  assert.deepEqual(items, ["unmount:tvx4", "remove:shelfx6", "disassemble:bedx1", "disassemble:dresserx1", "reassemble:bedx1@1", "mount:tvx2@1"]);
  assert.equal(draft.needsOwnerConfirmation, true);
  assert.ok(draft.unresolved.length > 0);

  const r = priceScope(scope as never, { oneWayMiles: 12, oneWayDriveMinutes: 25, extraStops: [{ legMiles: 9, legMinutes: 20 }] }, DEFAULT_ECONOMICS_CONFIG);
  assert.equal(r.siteCount, 2);
  assert.ok(r.labor.minutes > 300 && r.labor.workMinutes > 0, "realistic multi-hour job");
  assert.ok(r.materials.costCents > 0 && r.travel.costCents > 0);
  assert.ok(r.floorCents > 0 && r.recommendedCents >= r.floorCents);
  assert.ok(r.questions.length >= 3, "uncertainties are identified");
  assert.equal(r.status, "estimate_with_confirmation");
  assert.ok(r.work.items.some((i) => i.customerText === "TV unmounting ×4"));
  assert.equal(r.legacy.totalCents, 4 * 5_000 + 2 * 10_000, "4 catalog unmounts + 2 catalog TV mounts");
});

test("intake: a plain TV request still takes the original TV path", () => {
  const { scope } = summary("Mount my 65 inch TV on brick, hide the wires, and a soundbar");
  assert.equal(scope.tvs.length, 1);
  assert.deepEqual(scope.extras.map((e) => e.kind), ["soundbar"]);
  assert.deepEqual(scope.items, []);
});

test("intake: AI/heuristic output never invents dimensions, weight, wall type or attachment", () => {
  for (const message of [
    "Mount three curtain rods and two mirrors.",
    "Put together a king bed, dresser, two nightstands and mount a mirror.",
    "Customer bought some big cabinet thing from IKEA and wants it put together.",
  ]) {
    for (const item of summary(message).scope.items) {
      assert.equal(item.weightLb, undefined, "no weight");
      assert.equal(item.dimensions, undefined, "no dimensions");
      assert.equal(item.attachment, undefined, "no attachment");
      assert.equal(item.hardwareSuppliedBy, undefined, "no hardware supplier");
      assert.equal((item.environment as { surface?: string } | undefined)?.surface, undefined, "no surface");
    }
  }
});

function fakeAiItem(over: Partial<Record<keyof WorkItemIntake, unknown>>): WorkItemIntake {
  const unknown = { value: null, status: "unknown" };
  return workItemIntakeSchema.parse({
    action: { value: "mount", status: "known", evidence: "mount" },
    thenAction: unknown,
    category: { value: "mirror", status: "known", evidence: "mirror" },
    name: unknown,
    quantity: { value: 1, status: "known", evidence: "a mirror" },
    weightLb: unknown,
    widthIn: unknown,
    heightIn: unknown,
    depthIn: unknown,
    surface: unknown,
    attachment: unknown,
    hardwareSuppliedBy: unknown,
    assemblyState: unknown,
    relocation: unknown,
    site: unknown,
    stairs: unknown,
    haulAway: unknown,
    tvInches: unknown,
    tvLocation: unknown,
    ...over,
  });
}

test("intake guard: protected facts survive only when the customer stated them with matching evidence", () => {
  const message = "Please mount a mirror, it is about 40 lbs";
  const items = [
    fakeAiItem({ weightLb: { value: 40, status: "known", evidence: "about 40 lbs" }, surface: { value: "brick", status: "inferred" }, attachment: { value: "stud_mounted", status: "inferred" } }),
    fakeAiItem({ weightLb: { value: 85, status: "known", evidence: "about 85 lbs" } }),
    fakeAiItem({ widthIn: { value: 30, status: "known", evidence: "it is about 40 lbs" } }),
    fakeAiItem({ heightIn: { value: 36, status: "inferred" } }),
  ];
  const { items: out, downgraded } = sanitizeWorkItems(items, message);
  assert.equal(out[0]!.weightLb.value, 40, "stated and evidenced");
  assert.equal(out[0]!.surface.value, null, "inferred wall type is discarded");
  assert.equal(out[0]!.attachment.value, null, "inferred structural method is discarded");
  assert.equal(out[1]!.weightLb.value, null, "evidence not in the message");
  assert.equal(out[2]!.widthIn.value, null, "number not in its own evidence");
  assert.equal(out[3]!.heightIn.value, null, "inferred dimension discarded");
  assert.ok(downgraded.length >= 4);
});

test("intake contract: prices are rejected, unknown must be null, taxonomy and rules are in the prompt", () => {
  const ok = { tvs: [], extras: [], items: [], summary: "x", openQuestions: [] };
  assert.doesNotThrow(() => aiScopeIntakeSchema.parse(ok));
  assert.throws(() => aiScopeIntakeSchema.parse({ ...ok, price: 120 }));
  assert.throws(() => aiScopeIntakeSchema.parse({ ...ok, items: [{ ...fakeAiItem({}), priceCents: 5_000 }] }));
  const prompt = buildIntakePrompt("Mount a mirror", W);
  assert.match(prompt, /NEVER invent dimensions, weight/);
  assert.match(prompt, /kayak|bed \(Bed/i);
  assert.match(prompt, /Never include any price/);
});

test("intake: the draft suggests a template (labor, recipes) but never applies wall or weight defaults", () => {
  const { scope } = summary("Mount two mirrors.");
  const mirror = scope.items[0]!;
  assert.equal(mirror.templateId, "large_mirror");
  assert.equal(mirror.weightLb, undefined, "template default weight is not copied");
  const r = priceScope(scope as never, { oneWayMiles: 8, oneWayDriveMinutes: 20 }, DEFAULT_ECONOMICS_CONFIG);
  assert.ok(r.questions.some((q) => /weigh/i.test(q.question)));
  assert.ok(r.questions.some((q) => /going on|made of/i.test(q.question)));
});

// ----------------------------------------------------------------------------- service on both stores
let pg: Awaited<ReturnType<typeof createTestDb>>;
before(async () => {
  pg = await createTestDb();
});
after(async () => {
  await pg.client.close();
});

const nearby = { oneWayMiles: 8, oneWayDriveMinutes: 20 };
const impls: Array<[string, () => JobOsStore]> = [
  ["memory", () => new MemoryJobOsStore()],
  ["postgres", () => new DbJobOsStore(pg.db as never)],
];

const bed = () => itemFromTemplate("bed_frame_assembly", DEFAULT_ECONOMICS_CONFIG, { id: "bed", name: "King bed", assembly: { instructions: "available" } });
const shelf = () => itemFromTemplate("floating_shelf", DEFAULT_ECONOMICS_CONFIG, { id: "shelf", weightLb: 9, hardwareSuppliedBy: "pptv", attachment: "stud_mounted", environment: { surface: "drywall_studs" } });

for (const [name, makeStore] of impls) {
  const t = (title: string, fn: () => Promise<void>) =>
    test(`[${name}] ${title}`, async () => {
      if (name === "postgres") {
        await pg.client.exec(
          "TRUNCATE pricing_configs, pricing_config_events, jobs, scope_items, quotes, quote_versions, travel_estimates, material_estimates, invoice_counters, invoices, payments, job_actuals, ai_intake_cache RESTART IDENTITY",
        );
      }
      await fn();
    });
  const fresh = () => new JobOsService(makeStore());

  t("an items-only job can be scoped, quoted with a reviewed price, shared safely, and accepted", async () => {
    const svc = fresh();
    const job = await svc.createJob({ title: "Bedroom set (synthetic)", scope: { items: [bed(), shelf()] }, context: nearby });
    assert.equal(job.status, "scoped");
    const { version, quote } = await svc.createQuoteVersion(job.id, { adjustment: { type: "override", amountCents: 28_000, reason: "other", note: "Owner price" } });
    assert.equal(version.customerAmountCents, 28_000);
    assert.equal(version.snapshot.composition.pricing.work.items.length, 2, "the quote snapshot keeps the per-item breakdown");
    await svc.markQuoteSent(quote.id);
    const shared = await svc.getCustomerQuote(quote.shareToken);
    const text = JSON.stringify(shared.view);
    assert.deepEqual(findInternalKeys(shared.view), []);
    assert.match(text, /King bed assembly/);
    assert.match(text, /Floating shelf mounting/);
    assert.ok(!/floor|margin|helper|recommended/i.test(text));
    assert.equal((await svc.acceptCustomerQuote(quote.shareToken)).status, "accepted");
  });

  t("unsupported and manual-review scopes are gated at quote time", async () => {
    const svc = fresh();
    const gas = await svc.createJob({ title: "Gas (synthetic)", scope: { items: [{ id: "g", action: "install", category: "custom", riskFlags: ["gas_line"] }] }, context: nearby });
    await assert.rejects(() => svc.createQuoteVersion(gas.id, {}), (e: unknown) => e instanceof QuotePolicyError && e.code === "NOT_SUPPORTED");
    const ceiling = await svc.createJob({ title: "Ceiling (synthetic)", scope: { items: [{ id: "p", action: "mount", category: "projector", environment: { surface: "ceiling" } }] }, context: nearby });
    await assert.rejects(() => svc.createQuoteVersion(ceiling.id, {}), (e: unknown) => e instanceof QuotePolicyError && e.code === "MANUAL_REVIEW_REQUIRED");
    const ok = await svc.createQuoteVersion(ceiling.id, { adjustment: { type: "override", amountCents: 45_000, reason: "other", note: "Reviewed on site" } });
    assert.equal(ok.version.customerAmountCents, 45_000);
    const preview = await svc.previewPrice({ items: [{ id: "g", action: "install", category: "custom", riskFlags: ["gas_line"] }] }, nearby);
    assert.equal(preview.composition, null);
    assert.equal(preview.gate?.code, "NOT_SUPPORTED");
    assert.equal(preview.pricing.status, "not_supported", "the owner preview explains why instead of failing");
    const review = await svc.previewPrice({ items: [{ id: "p", action: "mount", category: "projector", environment: { surface: "ceiling" } }] }, nearby);
    assert.equal(review.gate?.code, "MANUAL_REVIEW_REQUIRED");
    assert.ok(review.pricing.recommendedCents > 0, "the owner still sees a recommendation to start from");
  });

  t("owner templates and categories are config: audited, validated, versioned, no code or migration", async () => {
    const svc = fresh();
    const v1 = await svc.getActiveConfig();
    assert.ok(!v1.config.work.templates.kayak_rack);

    await svc.upsertWorkCategory("kayak_rack", { label: "Kayak rack", group: "Storage", weightRelevant: true, keywords: ["kayak rack"], actionMinutes: { install: 70 } }, "owner");
    const v3 = await svc.upsertWorkTemplate("kayak_rack", { label: "Kayak rack", category: "kayak_rack", action: "install", recipes: ["fasteners_masonry"], fixedPriceCents: 17_500, defaults: { surface: "masonry", weightLb: 30 } }, "owner", "added kayak rack");
    assert.equal(v3.version, 3);
    assert.equal(v3.config.calibration, "owner-edited");
    const events = await svc.listConfigEventsForAdmin();
    assert.ok(events.filter((e) => e.action === "created").length >= 2 && events.some((e) => /template kayak_rack saved|added kayak rack/.test(e.details ?? "")), "template change is audited");

    // The new template works immediately, with no code change.
    const item = itemFromTemplate("kayak_rack", v3.config, { id: "k" });
    const job = await svc.createJob({ title: "Kayak rack (synthetic)", scope: { items: [item] }, context: nearby });
    const q = await svc.createQuoteVersion(job.id, {});
    assert.equal(q.version.customerAmountCents, 17_500, "owner-defined template price is the customer price in legacy mode");

    // Bad template (unknown recipe) is rejected and nothing is saved.
    await assert.rejects(() => svc.upsertWorkTemplate("bad_one", { label: "Bad", category: "shelf", action: "mount", recipes: ["nope"] }, "owner"), /unknown recipe/);
    assert.equal((await svc.getActiveConfig()).version, 3);

    const v4 = await svc.deleteWorkTemplate("kayak_rack", "owner");
    assert.ok(!v4.config.work.templates.kayak_rack);
    await assert.rejects(() => svc.deleteWorkTemplate("kayak_rack", "owner"), /not found/i);
    await assert.rejects(() => svc.upsertWorkTemplate("Bad Slug!", { label: "x", category: "shelf", action: "mount", recipes: [] }, "owner"));
    // Rolling back restores the earlier config.
    const back = await svc.rollbackConfig(1, "owner");
    assert.ok(!back.config.work.templates.kayak_rack);
  });

  t("actuals work for every item: per-item estimate vs actual, scope changes and unexpected conditions", async () => {
    const svc = fresh();
    const job = await svc.createJob({ title: "Move (synthetic)", scope: { items: [bed(), shelf()] }, context: nearby });
    const { version } = await svc.createQuoteVersion(job.id, { adjustment: { type: "override", amountCents: 30_000, reason: "other", note: "Owner price" } });
    const est = version.snapshot.composition.pricing.work.items;
    const rec = await svc.recordActuals(job.id, {
      laborMinutes: 150,
      helperMinutes: 40,
      travelMinutes: 45,
      mileage: 16,
      actualMaterialsCents: 900,
      collectedCents: 30_000,
      paymentMethod: "zelle",
      unexpectedConditions: ["missing_parts", "heavier_than_expected"],
      scopeChanges: [{ description: "Added two nightstands", amountDeltaCents: 4_000, kind: "added" }],
      items: [
        { itemId: "bed", actualMinutes: est[0]!.minutes + 30, helperMinutes: 30, actualMaterialsCents: 300, note: "missing a bolt" },
        { itemId: "shelf", actualMinutes: est[1]!.minutes },
        { itemId: "not-in-quote", actualMinutes: 10 },
      ],
    });
    const items = rec.profitability!.items;
    assert.equal(items.length, 2, "only items that were quoted are compared");
    assert.equal(items[0]!.deltaMinutes, 30);
    assert.equal(items[0]!.label, "King bed assembly");
    assert.equal(items[1]!.deltaMinutes, 0);
    assert.equal(rec.actuals.unexpectedConditions.length, 2);
    assert.equal(rec.actuals.scopeChanges[0]!.kind, "added");
  });

  t("intelligence learns by action, category, template, band, surface and complexity; synthetic excluded; advisory only", async () => {
    const svc = fresh();
    for (let i = 0; i < 6; i++) {
      const job = await svc.createJob({ title: `Desk ${i} (synthetic)`, source: i < 2 ? "synthetic" : "manual", scope: { items: [itemFromTemplate("desk_assembly", DEFAULT_ECONOMICS_CONFIG, { id: "desk", assembly: { instructions: "available" } })] }, context: nearby });
      const { version } = await svc.createQuoteVersion(job.id, { adjustment: { type: "override", amountCents: 20_000, reason: "other", note: "Owner price" } });
      const est = version.snapshot.composition.pricing.work.items[0]!.minutes;
      await svc.recordActuals(job.id, { laborMinutes: est, collectedCents: 20_000, paymentMethod: "cash", items: [{ itemId: "desk", actualMinutes: Math.round(est * 1.4) }] });
    }
    const real = await svc.intelligence();
    assert.equal(real.itemReport.sampleSize, 4);
    assert.equal(real.itemReport.syntheticExcluded, 2);
    const byDimension = (d: string) => real.itemReport.groups.filter((g) => g.dimension === d).map((g) => `${g.value}:${g.n}`);
    assert.deepEqual(byDimension("action"), ["assemble:4"]);
    assert.deepEqual(byDimension("category"), ["desk:4"]);
    assert.deepEqual(byDimension("template"), ["(no template):4"].length ? byDimension("template") : []);
    assert.ok(byDimension("band").length && byDimension("surface").includes("freestanding:4") && byDimension("complexity").includes("simple:4"));
    assert.ok(real.itemReport.groups.every((g) => !g.sufficient || g.suggestion === null || /nothing has been changed/.test(g.suggestion)));
    const all = await svc.intelligence({ includeSynthetic: true });
    const action = all.itemReport.groups.find((g) => g.dimension === "action")!;
    assert.equal(action.n, 6);
    assert.ok(action.sufficient);
    assert.match(action.suggestion ?? "", /140%/);
    assert.equal((await svc.getActiveConfig()).version, 1, "never changes configuration");
  });

  t("intake through the service uses the owner's config taxonomy (a new category is recognised with no code)", async () => {
    const svc = fresh();
    await svc.upsertWorkCategory("kayak_rack", { label: "Kayak rack", group: "Storage", weightRelevant: true, keywords: ["kayak rack"], actionMinutes: { install: 70 } }, "owner");
    const out = await svc.parseIntake("Please install a kayak rack in the garage.", { allowAi: false });
    const scope = parseJobScope(out.draft.scope);
    assert.equal(scope.items.length, 1);
    assert.equal(scope.items[0]!.category, "kayak_rack");
    assert.equal(out.draft.needsOwnerConfirmation, true);
    assert.equal(out.aiUsed, false);
  });

  t("config backward compatibility: a conflicting empty change is still rejected", async () => {
    const svc = fresh();
    const v1 = await svc.getActiveConfig();
    await assert.rejects(() => svc.updateConfig({ config: v1.config, reason: "no change" }, "owner"), ConflictError);
  });
}
