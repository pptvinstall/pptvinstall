import assert from "node:assert/strict";
import test from "node:test";
import {
  ImageAnalysisValidationError,
  buildUnifiedProposal,
  combineIntakeText,
  customerFindings,
  heuristicIntake,
  intakeToScopeDraft,
  parseImageAnalysis,
  proposalToScope,
  sizeFromModelNumber,
  verifyEvidence,
  type ImageAnalysisResult,
} from "../../shared/jobos";
import { DEFAULT_ECONOMICS_CONFIG, priceScope } from "../../shared/pricing";

const W = DEFAULT_ECONOMICS_CONFIG.work;
const near = { oneWayMiles: 8, oneWayDriveMinutes: 20 };
const textSide = (message: string) => {
  if (!message.trim()) return { textIntake: null, textDraft: null };
  const intake = verifyEvidence(heuristicIntake(message, W), message).intake;
  return { textIntake: intake, textDraft: intakeToScopeDraft(intake, "heuristic", W) };
};
const propose = (message: string, images: ImageAnalysisResult | null) => {
  const { text, extractedText } = combineIntakeText(message, images);
  return buildUnifiedProposal({ ...textSide(text), textSource: "text", images, extractedText }, W);
};
const img = (imageId: string, kind: string, extra: Record<string, unknown> = {}) => ({ imageId, kind, summary: `${kind} photo`, tvs: [], items: [], ...extra });

test("vision contract: strict schema, prices rejected, malformed rejected, unknown image ids dropped", () => {
  const good = JSON.stringify({ images: [img("m1", "room_photo", { tvs: [{ ref: "tv-a", wall: { value: "brick", confidence: 0.7 } }] }), img("ghost", "tv")], notes: [] });
  const parsed = parseImageAnalysis("```json\n" + good + "\n```", ["m1"]);
  assert.equal(parsed.images.length, 1, "observations about images we never sent are dropped");
  assert.throws(() => parseImageAnalysis("not json at all", ["m1"]), ImageAnalysisValidationError);
  const priced = JSON.stringify({ images: [img("m1", "tv", { tvs: [{ ref: "tv-a", sizeInches: { value: 65, confidence: 0.9 }, priceCents: 15_000 }] })] });
  assert.throws(() => parseImageAnalysis(priced, ["m1"]), ImageAnalysisValidationError, "a price-like key fails validation");
  const total = JSON.stringify({ images: [img("m1", "tv")], recommendedTotal: 250 });
  assert.throws(() => parseImageAnalysis(total, ["m1"]), ImageAnalysisValidationError);
  const badConfidence = JSON.stringify({ images: [img("m1", "tv", { tvs: [{ ref: "tv-a", wall: { value: "brick", confidence: 7 } }] })] });
  assert.throws(() => parseImageAnalysis(badConfidence, ["m1"]), ImageAnalysisValidationError);
});

test("TV model numbers give a size deterministically, or nothing", () => {
  for (const [model, inches] of [["QN65Q80C", 65], ["UN55TU7000FXZA", 55], ["OLED77C3PUA", 77], ["55UR8000AUA", 55], ["XR-85X90L", 85], ["65U8K", 65], ["M65Q7-J01", 65], ["43S455", 43], ["KD-50X80K", 50]] as const) {
    assert.equal(sizeFromModelNumber(model), inches, model);
  }
  for (const model of ["ABC", "X1", "SERIAL123456"]) assert.equal(sizeFromModelNumber(model), null, model);
});

test("multiple images of the same TV merge; a label beats a room-photo estimate; disagreement is surfaced", () => {
  const images: ImageAnalysisResult = {
    images: [
      img("room", "room_photo", { tvs: [{ ref: "tv-a", sizeInches: { value: 75, confidence: 0.6 }, location: { value: "fireplace", confidence: 0.9 }, wall: { value: "brick", confidence: 0.9 } }] }),
      img("label", "tv_label", { text: "Model QN65Q80C", tvs: [{ ref: "tv-a", modelNumber: { value: "QN65Q80C", confidence: 0.95 } }] }),
    ] as never,
    notes: [],
  };
  const p = propose("", images);
  assert.equal(p.tvs.length, 1, "the same TV in two photos is one TV");
  const tv = p.tvs[0]!;
  assert.equal(tv.facts.inches!.value, 65, "the label's model number wins over the room estimate");
  assert.equal(tv.facts.modelNumber!.value, "QN65Q80C");
  assert.ok(tv.facts.inches!.alternatives?.some((a) => a.value === 75), "the conflicting estimate is kept as an alternative");
  assert.ok(p.conflicts.length > 0);
  assert.ok(tv.facts.wall!.requiresConfirmation || tv.facts.wall!.confidence <= 0.85, "photos never prove the substrate");
  assert.equal(tv.facts.location!.value, "fireplace");
});

test("low confidence never becomes authoritative without a person: unconfirmed facts fall back to unknown", () => {
  const images = { images: [img("p1", "room_photo", { tvs: [{ ref: "a", wall: { value: "stone", confidence: 0.5 }, outletLocation: { value: "none_visible", confidence: 0.4 } }] })], notes: [] } as never;
  const p = propose("Mount my 65 inch TV", images);
  const tv = p.tvs[0]!;
  assert.equal(tv.origin, "both");
  assert.equal(tv.facts.wall!.requiresConfirmation, true);
  assert.equal(tv.facts.power!.value, "outlet");
  assert.equal(tv.facts.power!.requiresConfirmation, true, "photos cannot see behind a TV");

  const pending = proposalToScope(p);
  const t0 = (pending.scope.tvs as Array<Record<string, unknown>>)[0]!;
  assert.equal(t0.wall, "unknown");
  assert.equal(t0.power, "unknown");
  assert.equal(t0.inches, 65, "what the customer stated is applied");
  assert.ok(pending.pending.includes("tvs.0.wall"));
  const unconfirmed = priceScope(pending.scope, near, DEFAULT_ECONOMICS_CONFIG);
  assert.notEqual(unconfirmed.status, "priced", "unconfirmed scope is an estimate, never a firm price");

  const confirmed = proposalToScope(p, { decisions: { "tvs.0.wall": "accept", "tvs.0.power": "accept" } });
  const t1 = (confirmed.scope.tvs as Array<Record<string, unknown>>)[0]!;
  assert.equal(t1.wall, "stone");
  assert.equal(t1.power, "outlet");
  assert.equal(priceScope(confirmed.scope, near, DEFAULT_ECONOMICS_CONFIG).status, "priced");
  const overridden = proposalToScope(p, { overrides: { "tvs.0.wall": "drywall" } });
  assert.equal((overridden.scope.tvs as Array<Record<string, unknown>>)[0]!.wall, "drywall");
});

test("text + photos: the customer's TVs are kept, photos fill in, extra photo TVs can be removed", () => {
  const images = {
    images: [
      img("f", "fireplace", { tvs: [{ ref: "fp", location: { value: "fireplace", confidence: 0.95 }, wall: { value: "brick", confidence: 0.9 }, sizeInches: { value: 70, confidence: 0.5 } }] }),
      img("b", "room_photo", { tvs: [{ ref: "bed", wall: { value: "drywall", confidence: 0.9 }, mountPresent: { value: true, confidence: 0.8 } }] }),
    ],
    notes: [],
  } as never;
  const p = propose("Need 3 TVs hung, one over fireplace, probably need an outlet.", images);
  assert.equal(p.tvs.length, 3);
  const fireplace = p.tvs.find((t) => t.facts.location?.value === "fireplace")!;
  assert.equal(fireplace.origin, "both", "the fireplace photo lands on the customer's fireplace TV");
  assert.equal(fireplace.facts.wall!.value, "brick");
  assert.ok(p.tvs.some((t) => t.facts.mountSource?.requiresConfirmation), "a visible mount is a question, not a fact");
  const removed = proposalToScope(p, { removed: [p.tvs[2]!.key] });
  assert.equal(removed.scope.tvs!.length, 2);
});

test("safety prerequisites: photos may suggest a fixture, never a fan-rated box, joist or wiring", () => {
  const images = {
    images: [img("c", "ceiling", { items: [{ ref: "fan", category: "ceiling_fan", fixturePresent: { value: true, confidence: 0.9, observation: "light fixture on ceiling" }, fanRatedBoxVisible: { value: true, confidence: 0.9 } }] })],
    notes: [],
  } as never;
  const p = propose("", images);
  const fan = p.items.find((i) => i.item.category === "ceiling_fan")!;
  assert.ok(fan.conditions.existing_fixture?.requiresConfirmation);
  assert.equal(fan.conditions.fan_rated_box, undefined, "a photo can never mark the box fan-rated");
  assert.ok(p.questions.some((q) => /fan/i.test(q.customer)));
  const unconfirmed = proposalToScope(p);
  assert.deepEqual((unconfirmed.scope.items![0] as { conditions?: unknown }).conditions, undefined);
  const accepted = proposalToScope(p, { decisions: { "items.0.conditions.existing_fixture": "accept" } });
  const item = accepted.scope.items![0] as { conditions: Record<string, string> };
  assert.deepEqual(item.conditions, { existing_fixture: "yes" });
  const r = priceScope({ ...accepted.scope, items: [{ ...item, weightLb: 18 }] } as never, near, DEFAULT_ECONOMICS_CONFIG);
  assert.equal(r.status, "estimate_with_confirmation", "fan-rated box and wiring are still unverified");
  assert.ok(r.questions.some((q) => /fan-rated/.test(q.question)));

  const ceilingTv = propose("", { images: [img("x", "ceiling", { tvs: [{ ref: "c", location: { value: "ceiling", confidence: 0.9 } }] })], notes: [] } as never);
  assert.equal(ceilingTv.tvs.length, 0);
  assert.equal(ceilingTv.items[0]!.item.templateId, "ceiling_tv_mount");
  const ceilingPrice = priceScope(proposalToScope(ceilingTv).scope, near, DEFAULT_ECONOMICS_CONFIG);
  assert.equal(ceilingPrice.status, "manual_review_required", "a ceiling TV from a photo is never quoted as routine");
});

test("screenshot intake: conversation text read from a screenshot goes through the same text intake", () => {
  const images = { images: [img("s", "conversation_screenshot", { text: "Hey! Can you mount my 75 inch TV above the brick fireplace? I have the mount already." })], notes: [] } as never;
  const p = propose("", images);
  assert.match(p.extractedText, /75 inch/);
  assert.equal(p.tvs.length, 1);
  assert.equal(p.tvs[0]!.facts.inches?.value, 75);
  assert.equal(p.tvs[0]!.facts.location?.value, "fireplace");
});

test("receipts are read, never calculated; a mismatch is flagged for the owner", () => {
  const images = {
    images: [
      img("r", "receipt", {
        receipt: {
          merchant: { value: "Home Depot", confidence: 0.95 },
          date: { value: "2026-10-01", confidence: 0.9 },
          items: [
            { description: "Old work box", quantity: 1, totalCents: 248, confidence: 0.9 },
            { description: "Receptacle 15A", quantity: 1, totalCents: 379, confidence: 0.9 },
            { description: "Wall plate", quantity: 1, totalCents: 125, confidence: 0.9 },
          ],
          subtotalCents: { value: 852, confidence: 0.9 },
          taxCents: { value: 76, confidence: 0.9 },
          totalCents: { value: 928, confidence: 0.9 },
        },
      }),
    ],
    notes: [],
  } as never;
  const p = propose("", images);
  const r = p.receipts[0]!;
  assert.equal(r.merchant!.value, "Home Depot");
  assert.equal(r.lineSumCents, 752);
  assert.equal(r.mismatch, true, "lines add to $7.52 but the printed subtotal reads $8.52");
  assert.ok(p.questions.some((q) => /Receipt/.test(q.owner)));
  assert.equal(p.tvs.length, 0, "a receipt never invents scope");
});

test("customer findings are plain language: no confidence numbers or internal terms", () => {
  const images = { images: [img("p", "room_photo", { tvs: [{ ref: "a", wall: { value: "brick", confidence: 0.54 } }] })], notes: [] } as never;
  const f = customerFindings(propose("", images));
  const text = JSON.stringify(f);
  assert.ok(f.questions.includes("We couldn't tell whether there is an outlet behind TV 1."));
  assert.ok(!/0\.\d|confidence|requiresConfirmation|floor|margin|price/i.test(text), text);
});

test("no AI arithmetic: the engine prices the reviewed scope; identical facts price identically whatever the source", () => {
  const fromText = proposalToScope(propose("Mount my 65 inch TV on brick, I have a mount.", null), { overrides: { "tvs.0.power": "existing" } }).scope;
  const images = { images: [img("p", "tv_label", { tvs: [{ ref: "a", modelNumber: { value: "QN65Q80C", confidence: 0.95 }, wall: { value: "brick", confidence: 0.95 } }] })], notes: [] } as never;
  const p = propose("", images);
  const fromPhoto = proposalToScope(p, { decisions: Object.fromEntries(p.questions.filter((q) => q.factKey).map((q) => [q.factKey!, "accept"])), overrides: { "tvs.0.power": "existing", "tvs.0.mountSource": "customer" } }).scope;
  const a = priceScope(fromText, near, DEFAULT_ECONOMICS_CONFIG);
  const b = priceScope(fromPhoto, near, DEFAULT_ECONOMICS_CONFIG);
  assert.equal(a.recommendedCents, b.recommendedCents);
  assert.equal(a.legacy.totalCents, b.legacy.totalCents);
});
