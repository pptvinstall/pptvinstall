import { z } from "zod";
import { DEFAULT_WORK_CONFIG, type WorkConfig } from "../pricing/workConfig";
import { parseJobScope, type JobScopeInput, type TvScope } from "../pricing/scope";
import { WORK_ACTIONS, type WorkItemInput } from "../pricing/work";
import type { AiScopeIntake, ScopeDraft } from "./intake";

// Unified intake: typed text, pasted messages, voice transcripts, screenshots, photos and manual selections all
// become ONE reviewable proposal of structured facts. Every fact carries a value, a confidence, its sources, an
// optional observation and whether a person must confirm it. Nothing here produces a price: the confirmed proposal
// becomes a JobScope and Pricing Engine V2 prices it. Vision/OCR output that contains anything else is rejected.

// ------------------------------------------------------------------ provider contract (vision / OCR)

export const IMAGE_KINDS = [
  "room_photo",
  "fireplace",
  "tv",
  "tv_label",
  "tv_packaging",
  "mount",
  "outlet",
  "wire_location",
  "ceiling",
  "fixture",
  "doorbell",
  "camera_floodlight",
  "conversation_screenshot",
  "product_listing",
  "receipt",
  "handwritten_note",
  "other",
] as const;
export type ImageKind = (typeof IMAGE_KINDS)[number];

const slug = z.string().regex(/^[a-z0-9_]{1,40}$/);
const ref = z.string().regex(/^[a-z0-9_-]{1,24}$/);
function obs<T extends z.ZodTypeAny>(value: T) {
  return z
    .object({
      value,
      confidence: z.number().min(0).max(1),
      /** What in the image supports it, in a few words. */
      observation: z.string().max(200).optional(),
    })
    .strict();
}

/** Photo wall types. Mapped onto the TV engine's wall types (concrete -> stone/masonry; tile -> unknown). */
export const PHOTO_WALLS = ["drywall", "brick", "stone", "concrete", "tile", "steel", "wood", "unknown"] as const;

export const photoTvSchema = z
  .object({
    /** Same ref across images = the same TV seen in several photos. */
    ref,
    sizeInches: obs(z.number().int().min(19).max(120)).optional(),
    modelNumber: obs(z.string().min(2).max(40)).optional(),
    location: obs(z.enum(["standard", "fireplace", "high_wall", "ceiling"])).optional(),
    wall: obs(z.enum(PHOTO_WALLS)).optional(),
    mountPresent: obs(z.boolean()).optional(),
    mountType: obs(z.enum(["fixed", "tilt", "full_motion"])).optional(),
    outletPresent: obs(z.boolean()).optional(),
    outletLocation: obs(z.enum(["behind_tv", "below_tv", "beside_tv", "far", "none_visible"])).optional(),
    visibleWires: obs(z.boolean()).optional(),
    racewayPresent: obs(z.boolean()).optional(),
  })
  .strict();

export const photoItemSchema = z
  .object({
    ref,
    /** Taxonomy slug (ceiling_fan, light_fixture, doorbell, camera, floodlight, soundbar, shelf, mirror, ...). */
    category: slug,
    action: obs(z.enum(WORK_ACTIONS)).optional(),
    quantity: obs(z.number().int().min(1).max(20)).optional(),
    /** A fixture/box is visible where the item goes. Never proves the box rating or the wiring. */
    fixturePresent: obs(z.boolean()).optional(),
    /** What the photo seems to show about the ceiling box. Observation only: a photo cannot verify a fan rating. */
    fanRatedBoxVisible: obs(z.boolean()).optional(),
    ceilingHeightFt: obs(z.number().min(6).max(30)).optional(),
  })
  .strict();

export const receiptExtractionSchema = z
  .object({
    merchant: obs(z.string().min(1).max(80)).optional(),
    date: obs(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
    items: z
      .array(
        z
          .object({
            description: z.string().min(1).max(120),
            quantity: z.number().min(0).max(1_000),
            /** As printed on the receipt. Read, not calculated. */
            totalCents: z.number().int().min(-1_000_000).max(10_000_000),
            unitCents: z.number().int().min(-1_000_000).max(10_000_000).optional(),
            confidence: z.number().min(0).max(1),
          })
          .strict(),
      )
      .max(60),
    subtotalCents: obs(z.number().int().min(0).max(10_000_000)).optional(),
    taxCents: obs(z.number().int().min(0).max(1_000_000)).optional(),
    totalCents: obs(z.number().int().min(0).max(10_000_000)).optional(),
  })
  .strict();
export type ReceiptExtraction = z.infer<typeof receiptExtractionSchema>;

export const imageObservationSchema = z
  .object({
    imageId: z.string().min(1).max(64),
    kind: z.enum(IMAGE_KINDS),
    summary: z.string().max(240),
    /** Visible text (OCR): conversation screenshots, TV labels, packaging, product listings, handwritten notes. */
    text: z.string().max(3_000).optional(),
    tvs: z.array(photoTvSchema).max(8).default([]),
    items: z.array(photoItemSchema).max(12).default([]),
    site: z
      .object({
        stairs: obs(z.boolean()).optional(),
        highCeiling: obs(z.boolean()).optional(),
        furnitureMovement: obs(z.boolean()).optional(),
        obstacles: obs(z.string().max(120)).optional(),
      })
      .strict()
      .optional(),
    receipt: receiptExtractionSchema.optional(),
  })
  .strict();
export type ImageObservation = z.infer<typeof imageObservationSchema>;

/** The ONLY shape a vision provider may return. Strict: a price, total or any unknown key fails validation. */
export const imageAnalysisResultSchema = z
  .object({
    images: z.array(imageObservationSchema).max(12),
    notes: z.array(z.string().max(200)).max(10).default([]),
  })
  .strict();
export type ImageAnalysisResult = z.infer<typeof imageAnalysisResultSchema>;

export class ImageAnalysisValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Image analysis output rejected: ${issues.slice(0, 5).join("; ")}`);
    this.name = "ImageAnalysisValidationError";
  }
}

/** Parse provider text. Tolerates a fenced code block; anything that is not the strict schema is rejected. */
export function parseImageAnalysis(raw: string, knownImageIds: string[]): ImageAnalysisResult {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  let json: unknown;
  try {
    json = JSON.parse(trimmed);
  } catch {
    throw new ImageAnalysisValidationError(["not valid JSON"]);
  }
  const parsed = imageAnalysisResultSchema.safeParse(json);
  if (!parsed.success) throw new ImageAnalysisValidationError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`));
  // Observations about images we never sent are dropped (a provider cannot invent sources).
  const known = new Set(knownImageIds);
  return { ...parsed.data, images: parsed.data.images.filter((img) => known.has(img.imageId)) };
}

// ------------------------------------------------------------------ deterministic helpers

/**
 * Screen size from a TV model number, when the brand's pattern encodes it. Deterministic and conservative:
 * returns null rather than guess. Examples: QN65Q80C -> 65, UN55TU7000 -> 55, OLED77C3PUA -> 77,
 * 55UR8000 -> 55, XR-85X90L -> 85, 65U8K -> 65, M65Q7-J01 -> 65, 43S455 -> 43.
 */
export function sizeFromModelNumber(model: string): number | null {
  const m = model.toUpperCase().replace(/\s+/g, "");
  const valid = (n: number) => (n >= 24 && n <= 100 ? n : null);
  const patterns: RegExp[] = [
    /^(?:QN|UN|LS|LH|QE|UE)(\d{2})/, // Samsung
    /^OLED(\d{2})/, // LG OLED
    /^(?:XR|KD|XBR|K)-?(\d{2})/, // Sony
    /^[A-Z]{1,2}(\d{2})[A-Z]/, // Vizio M65Q7, V55-
    /^(\d{2})(?:UR|UQ|UP|UN|NANO|QNED|UT|S\d|Q\d|R\d|U\d|A\d|H\d|C\d)/, // LG/TCL/Hisense 55UR.., 65U8K, 43S455, 55A6
  ];
  for (const p of patterns) {
    const hit = p.exec(m);
    if (hit) return valid(Number(hit[1]));
  }
  return null;
}

/** Ask for anything an image can suggest but never verify. */
const HIDDEN_CONDITION_NOTE = "A photo can suggest this but cannot verify it.";

// ------------------------------------------------------------------ proposal

export type SourceKind = "text" | "voice" | "screenshot" | "photo" | "manual";
export interface SourceRef {
  kind: SourceKind;
  /** Media id for screenshots/photos. */
  id?: string;
}

export interface Fact<T> {
  value: T;
  confidence: number;
  sources: SourceRef[];
  observation?: string;
  /** True when a person must confirm before this becomes part of an authoritative quote. */
  requiresConfirmation: boolean;
  /** Other values seen for the same fact (conflicting observations). */
  alternatives?: Array<{ value: T; confidence: number; sources: SourceRef[] }>;
}

export interface ProposedTv {
  key: string;
  /** Where this TV came from: the customer's words, photos, or both. */
  origin: "text" | "photo" | "both";
  facts: {
    inches?: Fact<number>;
    sizeBand?: Fact<"32-55" | "56+">;
    modelNumber?: Fact<string>;
    location?: Fact<"standard" | "fireplace" | "high_wall" | "ceiling">;
    wall?: Fact<"drywall" | "brick" | "stone" | "steel" | "unknown">;
    mountSource?: Fact<"customer" | "pptv">;
    mountType?: Fact<"fixed" | "tilt" | "full_motion">;
    power?: Fact<"existing" | "outlet" | "unknown">;
    wire?: Fact<"visible" | "raceway" | "in_wall">;
    tvRemoval?: Fact<boolean>;
  };
}

export interface ProposedItem {
  key: string;
  origin: "text" | "photo" | "both";
  item: WorkItemInput;
  /** Suggested prerequisite answers (e.g. existing_fixture: yes). Applied only when the owner accepts them. */
  conditions: Record<string, Fact<"yes" | "no">>;
}

export interface IntakeQuestion {
  /** Fact or condition this question resolves, when there is one. */
  factKey?: string;
  owner: string;
  /** Plain customer wording (no confidence numbers, no internal terms). */
  customer: string;
}

export interface ReceiptProposal {
  imageId: string;
  merchant: Fact<string> | null;
  date: Fact<string> | null;
  items: ReceiptExtraction["items"];
  subtotalCents: number | null;
  taxCents: number | null;
  totalCents: number | null;
  /** Deterministic check: printed line totals vs printed subtotal/total. Never used to price anything. */
  lineSumCents: number;
  mismatch: boolean;
}

export interface UnifiedProposal {
  tvs: ProposedTv[];
  items: ProposedItem[];
  extras: Array<{ kind: string; qty: number; sources: SourceRef[] }>;
  access: { furnitureMovement?: Fact<boolean>; ladderHeight?: Fact<boolean>; stairs?: Fact<boolean>; helper?: Fact<boolean> };
  cleanup?: string;
  questions: IntakeQuestion[];
  conflicts: string[];
  receipts: ReceiptProposal[];
  images: Array<{ imageId: string; kind: ImageKind; summary: string }>;
  /** Text read from screenshots / notes that was fed into the text intake. */
  extractedText: string;
  /** OCR-derived counts/actions and facts require an explicit full-scope review. */
  requiresOcrConfirmation?: boolean;
}

const fact = <T,>(value: T, confidence: number, sources: SourceRef[], requiresConfirmation: boolean, observation?: string): Fact<T> => ({
  value,
  confidence: Math.round(Math.min(1, Math.max(0, confidence)) * 100) / 100,
  sources,
  requiresConfirmation,
  ...(observation ? { observation } : {}),
});

/** Merge a new candidate into an existing fact. Disagreement keeps the stronger value and flags a conflict. */
function mergeFact<T>(current: Fact<T> | undefined, next: Fact<T> | undefined, conflicts: string[], label: string, preferCurrent = false): Fact<T> | undefined {
  if (!next) return current;
  if (!current) return next;
  if (JSON.stringify(current.value) === JSON.stringify(next.value)) {
    return {
      ...current,
      confidence: Math.max(current.confidence, next.confidence),
      sources: [...current.sources, ...next.sources],
      requiresConfirmation: current.requiresConfirmation && next.requiresConfirmation,
      observation: current.observation ?? next.observation,
    };
  }
  const [winner, loser] = preferCurrent || current.confidence >= next.confidence ? [current, next] : [next, current];
  if (loser.confidence >= 0.4) conflicts.push(`${label}: ${String(winner.value)} vs ${String(loser.value)}`);
  return {
    ...winner,
    requiresConfirmation: winner.requiresConfirmation || loser.confidence >= 0.4,
    alternatives: [...(winner.alternatives ?? []), { value: loser.value, confidence: loser.confidence, sources: loser.sources }],
  };
}

// --- text side: reuse the existing (heuristic or AI) text intake, field by field
function textTvFacts(tv: AiScopeIntake["tvs"][number], src: SourceRef): ProposedTv["facts"] {
  const out: ProposedTv["facts"] = {};
  const f = <K extends keyof AiScopeIntake["tvs"][number]>(key: K) => tv[key] as { value: unknown; status: string; confidence?: number; evidence?: string };
  const take = (key: keyof AiScopeIntake["tvs"][number]) => {
    const x = f(key);
    if (x.status === "unknown" || x.value === null) return null;
    const known = x.status === "known";
    return { value: x.value, confidence: x.confidence ?? (known ? 0.95 : 0.5), requiresConfirmation: !known, observation: x.evidence ? `“${x.evidence.slice(0, 120)}”` : undefined };
  };
  const set = <K extends keyof ProposedTv["facts"]>(key: K, from: keyof AiScopeIntake["tvs"][number]) => {
    const t = take(from);
    if (t) (out as Record<string, unknown>)[key] = fact(t.value, t.confidence, [src], t.requiresConfirmation, t.observation);
  };
  set("inches", "inches");
  set("sizeBand", "sizeBand");
  set("location", "location");
  set("wall", "wall");
  set("mountSource", "mountSource");
  set("mountType", "mountType");
  set("power", "power");
  set("wire", "wire");
  const removal = take("tvRemoval");
  if (removal && removal.value === true) out.tvRemoval = fact(true, removal.confidence, [src], removal.requiresConfirmation);
  return out;
}

// --- photo side
const TEXT_SOURCED_KINDS: ReadonlySet<ImageKind> = new Set<ImageKind>(["tv_label", "tv_packaging", "product_listing", "conversation_screenshot", "handwritten_note"]);

function photoTvFacts(img: ImageObservation, tv: z.infer<typeof photoTvSchema>): ProposedTv["facts"] {
  const src: SourceRef[] = [{ kind: img.kind === "conversation_screenshot" ? "screenshot" : "photo", id: img.imageId }];
  const textual = TEXT_SOURCED_KINDS.has(img.kind);
  const out: ProposedTv["facts"] = {};
  if (tv.sizeInches) {
    // A label/listing states the size; a room photo can only estimate it.
    const c = textual ? Math.min(0.97, tv.sizeInches.confidence + 0.1) : Math.min(0.6, tv.sizeInches.confidence);
    out.inches = fact(tv.sizeInches.value, c, src, c < 0.8, tv.sizeInches.observation);
  }
  if (tv.modelNumber) {
    out.modelNumber = fact(tv.modelNumber.value.toUpperCase(), tv.modelNumber.confidence, src, tv.modelNumber.confidence < 0.8, tv.modelNumber.observation);
    const fromModel = sizeFromModelNumber(tv.modelNumber.value);
    if (fromModel) {
      const c = Math.min(0.95, tv.modelNumber.confidence);
      out.inches = mergeFact(out.inches, fact(fromModel, c, src, c < 0.8, `model ${tv.modelNumber.value.toUpperCase()}`), [], "size");
    }
  }
  if (tv.location) out.location = fact(tv.location.value, tv.location.confidence, src, tv.location.confidence < 0.8, tv.location.observation);
  if (tv.wall) {
    const v = tv.wall.value;
    const mapped: "drywall" | "brick" | "stone" | "steel" | "unknown" = v === "concrete" ? "stone" : v === "tile" || v === "wood" ? "unknown" : v;
    const note = v === "tile" ? "tile over an unknown substrate" : v === "wood" ? "wood paneling over an unknown substrate" : tv.wall.observation;
    // A photo can suggest the surface; it cannot prove the substrate suits this mounting method.
    if (mapped !== "unknown") out.wall = fact(mapped, Math.min(0.85, tv.wall.confidence), src, tv.wall.confidence < 0.85, note);
  }
  if (tv.mountPresent?.value === true) {
    // A mount on the wall may be the customer's new mount or an old one to remove: always ask.
    out.mountSource = fact("customer", Math.min(0.6, tv.mountPresent.confidence), src, true, tv.mountPresent.observation ?? "a mount appears in the photo");
  }
  if (tv.mountType) out.mountType = fact(tv.mountType.value, Math.min(0.7, tv.mountType.confidence), src, true, tv.mountType.observation);
  if (tv.outletPresent || tv.outletLocation) {
    const behind = tv.outletLocation?.value === "behind_tv" || tv.outletLocation?.value === "below_tv";
    const none = tv.outletPresent?.value === false || tv.outletLocation?.value === "none_visible" || tv.outletLocation?.value === "far";
    const c = Math.min(0.6, tv.outletPresent?.confidence ?? tv.outletLocation?.confidence ?? 0.4);
    // Photos rarely show what is behind a TV; outlet findings always need confirmation.
    if (behind) out.power = fact("existing", c, src, true, tv.outletLocation?.observation ?? tv.outletPresent?.observation);
    else if (none) out.power = fact("outlet", c, src, true, tv.outletLocation?.observation ?? tv.outletPresent?.observation ?? "no outlet visible near the TV location");
  }
  if (tv.racewayPresent?.value === true) out.wire = fact("raceway", Math.min(0.7, tv.racewayPresent.confidence), src, true, tv.racewayPresent.observation);
  return out;
}

function sizeBandOf(inches: number): "32-55" | "56+" {
  return inches >= 56 ? "56+" : "32-55";
}

const PHOTO_ITEM_DEFAULT_ACTION: Record<string, (typeof WORK_ACTIONS)[number]> = {
  ceiling_fan: "install",
  light_fixture: "install",
  receptacle: "install",
  doorbell: "install",
  doorbell_chime: "install",
  floodlight: "mount",
  floodlight_hardwired: "install",
  camera: "mount",
};

export interface UnifiedInput {
  /** Existing text intake (heuristic or AI) for typed/pasted/voice text plus OCR text from screenshots. */
  textIntake: AiScopeIntake | null;
  textSource: SourceKind;
  /** The text intake's own draft (work items + unresolved questions), from intakeToScopeDraft. */
  textDraft: ScopeDraft | null;
  images: ImageAnalysisResult | null;
  /** Text read from screenshots/notes, for display and audit. */
  extractedText?: string;
}

/** Deterministically merge text and image findings into one proposal. No prices, no arithmetic. */
export function buildUnifiedProposal(input: UnifiedInput, work: WorkConfig = DEFAULT_WORK_CONFIG): UnifiedProposal {
  const conflicts: string[] = [];
  const questions: IntakeQuestion[] = [];
  const textSrc: SourceRef = { kind: input.textSource };

  // TVs from the customer's words.
  const tvs: ProposedTv[] = (input.textIntake?.tvs ?? []).map((tv, i) => ({ key: `tv-${i + 1}`, origin: "text", facts: textTvFacts(tv, textSrc) }));
  // Text TVs that the draft folded from work items (TV mounts) are already in textIntake.tvs via intakeToScopeDraft.
  const draftTvs = ((input.textDraft?.scope.tvs ?? []) as TvScope[]).slice(tvs.length);
  for (const t of draftTvs) {
    tvs.push({
      key: `tv-${tvs.length + 1}`,
      origin: "text",
      facts: {
        ...(t.inches ? { inches: fact(t.inches, 0.95, [textSrc], false) } : {}),
        ...(t.location && t.location !== "standard" ? { location: fact(t.location, 0.9, [textSrc], false) } : {}),
      },
    });
  }

  // TVs from photos: group sightings by ref across images, then align with the text TVs.
  const photoTvs = new Map<string, ProposedTv["facts"]>();
  const photoOrder: string[] = [];
  for (const img of input.images?.images ?? []) {
    for (const tv of img.tvs) {
      const facts = photoTvFacts(img, tv);
      const prev = photoTvs.get(tv.ref);
      if (!prev) {
        photoTvs.set(tv.ref, facts);
        photoOrder.push(tv.ref);
        continue;
      }
      const merged: ProposedTv["facts"] = { ...prev };
      for (const k of Object.keys(facts) as Array<keyof ProposedTv["facts"]>) {
        (merged as Record<string, unknown>)[k] = mergeFact(prev[k] as Fact<unknown> | undefined, facts[k] as Fact<unknown>, conflicts, `Photo TV ${tv.ref} ${k}`);
      }
      photoTvs.set(tv.ref, merged);
    }
  }
  const used = new Set<number>();
  for (const r of photoOrder) {
    const pf = photoTvs.get(r)!;
    const loc = pf.location?.value;
    let idx = tvs.findIndex((t, i) => !used.has(i) && loc !== undefined && t.facts.location?.value === loc);
    if (idx < 0) idx = tvs.findIndex((t, i) => !used.has(i) && (loc === undefined || t.facts.location === undefined || t.facts.location.value === "standard"));
    if (idx < 0) {
      tvs.push({ key: `tv-${tvs.length + 1}`, origin: "photo", facts: pf });
      used.add(tvs.length - 1);
      continue;
    }
    used.add(idx);
    const t = tvs[idx]!;
    const merged: ProposedTv["facts"] = { ...t.facts };
    for (const k of Object.keys(pf) as Array<keyof ProposedTv["facts"]>) {
      // What the customer stated wins over a photo estimate, but a disagreement is always surfaced.
      (merged as Record<string, unknown>)[k] = mergeFact(t.facts[k] as Fact<unknown> | undefined, pf[k] as Fact<unknown>, conflicts, `TV ${idx + 1} ${k}`, true);
    }
    tvs[idx] = { ...t, origin: "both", facts: merged };
  }

  // Ceiling TVs are not the standard TV job: they become a reviewed ceiling-mount work item.
  const items: ProposedItem[] = [];
  const keptTvs: ProposedTv[] = [];
  for (const tv of tvs) {
    if (tv.facts.location?.value === "ceiling") {
      items.push({
        key: `item-${items.length + 1}`,
        origin: tv.origin,
        item: { id: `ceiling-${tv.key}`, action: "mount", category: "tv", templateId: "ceiling_tv_mount", name: "Ceiling TV", quantity: 1, environment: { surface: "ceiling" }, helper: "required" },
        conditions: {},
      });
      questions.push({ owner: `${tv.key}: ceiling mount needs a verified joist or approved blocking.`, customer: "Is there a ceiling joist where the TV would hang? We'll confirm this before quoting a ceiling mount." });
      continue;
    }
    keptTvs.push(tv);
  }
  keptTvs.forEach((tv, i) => {
    tv.key = `tv-${i + 1}`;
    if (tv.facts.inches && !tv.facts.sizeBand) tv.facts.sizeBand = { ...tv.facts.inches, value: sizeBandOf(tv.facts.inches.value), alternatives: undefined };
  });

  // Work items from the text draft (already conservative inputs from the work intake).
  for (const it of (input.textDraft?.scope.items ?? []) as WorkItemInput[]) {
    items.push({ key: `item-${items.length + 1}`, origin: "text", item: it, conditions: {} });
  }
  // Work items from photos.
  for (const img of input.images?.images ?? []) {
    const src: SourceRef[] = [{ kind: "photo", id: img.imageId }];
    for (const p of img.items) {
      if (!work.categories[p.category]) continue;
      const existing = items.find((x) => x.item.category === p.category);
      const conditions: ProposedItem["conditions"] = {};
      if (p.fixturePresent?.value === true) {
        conditions.existing_fixture = fact("yes", Math.min(0.7, p.fixturePresent.confidence), src, true, p.fixturePresent.observation ?? "a fixture is visible");
      }
      if (p.fanRatedBoxVisible) {
        questions.push({ factKey: `${p.category}.fan_rated_box`, owner: `Fan-rated box: ${HIDDEN_CONDITION_NOTE} ${p.fanRatedBoxVisible.observation ?? ""}`.trim(), customer: "Do you know if the ceiling box is rated for a fan? If not, we'll check it on site." });
      }
      if (existing) {
        existing.origin = existing.origin === "photo" ? "photo" : "both";
        for (const [k, v] of Object.entries(conditions)) existing.conditions[k] = mergeFact(existing.conditions[k], v, conflicts, `${p.category} ${k}`, true)!;
        continue;
      }
      const action = p.action?.value ?? PHOTO_ITEM_DEFAULT_ACTION[p.category] ?? "mount";
      items.push({
        key: `item-${items.length + 1}`,
        origin: "photo",
        item: {
          id: `photo-${p.ref}`.slice(0, 64),
          action,
          category: p.category,
          quantity: p.quantity?.value ?? 1,
          ...(p.ceilingHeightFt ? { environment: { surface: p.category === "ceiling_fan" || p.category === "light_fixture" ? "ceiling" : "unknown", heightFt: p.ceilingHeightFt.value } } : p.category === "ceiling_fan" || p.category === "light_fixture" ? { environment: { surface: "ceiling" } } : {}),
        },
        conditions,
      });
    }
  }

  // Site / access suggestions (always confirmed by a person).
  const access: UnifiedProposal["access"] = {};
  for (const img of input.images?.images ?? []) {
    const src: SourceRef[] = [{ kind: "photo", id: img.imageId }];
    if (img.site?.furnitureMovement?.value) access.furnitureMovement = mergeFact(access.furnitureMovement, fact(true, Math.min(0.7, img.site.furnitureMovement.confidence), src, true, img.site.furnitureMovement.observation), conflicts, "furniture");
    if (img.site?.highCeiling?.value) access.ladderHeight = mergeFact(access.ladderHeight, fact(true, Math.min(0.7, img.site.highCeiling.confidence), src, true, img.site.highCeiling.observation), conflicts, "height");
    if (img.site?.stairs?.value) access.stairs = mergeFact(access.stairs, fact(true, Math.min(0.7, img.site.stairs.confidence), src, true, img.site.stairs.observation), conflicts, "stairs");
  }
  const textAccess = input.textIntake?.access;
  if (textAccess?.helperNeeded.value === true) access.helper = fact(true, 0.9, [textSrc], textAccess.helperNeeded.status !== "known");

  // Receipts: read, never calculated. A deterministic line-sum check only flags mismatches for the owner.
  const receipts: ReceiptProposal[] = [];
  for (const img of input.images?.images ?? []) {
    if (!img.receipt) continue;
    const r = img.receipt;
    const src: SourceRef[] = [{ kind: "photo", id: img.imageId }];
    const lineSumCents = r.items.reduce((s, l) => s + l.totalCents, 0);
    const printed = r.subtotalCents?.value ?? null;
    receipts.push({
      imageId: img.imageId,
      merchant: r.merchant ? fact(r.merchant.value, r.merchant.confidence, src, true) : null,
      date: r.date ? fact(r.date.value, r.date.confidence, src, true) : null,
      items: r.items,
      subtotalCents: printed,
      taxCents: r.taxCents?.value ?? null,
      totalCents: r.totalCents?.value ?? null,
      lineSumCents,
      mismatch: printed !== null && Math.abs(printed - lineSumCents) > 1,
    });
  }

  // Questions: every fact that needs a person, in owner and customer language.
  keptTvs.forEach((tv, i) => {
    const n = i + 1;
    const F = tv.facts;
    const k = (field: string) => `tvs.${i}.${field}`;
    if (!F.inches && !F.sizeBand) questions.push({ factKey: k("inches"), owner: `TV ${n}: size not found.`, customer: `What size is TV ${n}?` });
    else if (F.inches?.alternatives?.length) questions.push({ factKey: k("inches"), owner: `TV ${n}: sizes disagree (${[F.inches.value, ...F.inches.alternatives.map((a) => a.value)].join('" vs ')}").`, customer: `We saw different sizes for TV ${n}. Which is right?` });
    else if (F.inches?.requiresConfirmation) questions.push({ factKey: k("inches"), owner: `TV ${n}: size ${F.inches.value}" is an estimate.`, customer: `Is TV ${n} about ${F.inches.value} inches?` });
    if (!F.wall) questions.push({ factKey: k("wall"), owner: `TV ${n}: wall type not found.`, customer: `What is the wall behind TV ${n} made of (drywall, brick, stone)?` });
    else if (F.wall.requiresConfirmation) questions.push({ factKey: k("wall"), owner: `TV ${n}: wall looks like ${F.wall.value} (${HIDDEN_CONDITION_NOTE.toLowerCase()} the substrate).`, customer: `It looks like TV ${n} goes on ${F.wall.value}. Is that right?` });
    if (!F.power) questions.push({ factKey: k("power"), owner: `TV ${n}: outlet situation unknown.`, customer: `We couldn't tell whether there is an outlet behind TV ${n}.` });
    else if (F.power.requiresConfirmation) questions.push({ factKey: k("power"), owner: `TV ${n}: ${F.power.value === "outlet" ? "may need an outlet" : "outlet appears to be there"} (photo).`, customer: F.power.value === "outlet" ? `It looks like TV ${n} may need an outlet behind it. Is that right?` : `Is there already an outlet behind TV ${n}?` });
    if (!F.mountSource) questions.push({ factKey: k("mountSource"), owner: `TV ${n}: mount source unknown.`, customer: `Do you already have a mount for TV ${n}, or should we bring one?` });
    else if (F.mountSource.requiresConfirmation) questions.push({ factKey: k("mountSource"), owner: `TV ${n}: a mount is visible; is it the customer's new mount?`, customer: `We saw a mount for TV ${n}. Is that the one you want us to use?` });
    if (F.location?.requiresConfirmation) questions.push({ factKey: k("location"), owner: `TV ${n}: location ${F.location.value.replace("_", " ")} from photo.`, customer: F.location.value === "fireplace" ? `Is TV ${n} going above the fireplace?` : `Where exactly will TV ${n} go?` });
  });
  items.forEach((it, i) => {
    for (const [cond, f] of Object.entries(it.conditions)) {
      if (f.requiresConfirmation) {
        questions.push({
          factKey: `items.${i}.conditions.${cond}`,
          owner: `${it.item.name ?? it.item.category}: ${cond.replace(/_/g, " ")} suggested by a photo.`,
          customer: cond === "existing_fixture" ? "Is there an existing light fixture where this will go?" : `Can you confirm the ${cond.replace(/_/g, " ")}?`,
        });
      }
    }
  });
  for (const u of input.textDraft?.unresolved ?? []) {
    if (u.path.startsWith("tvs[")) continue; // TV facts are asked above from the merged facts
    if (!questions.some((q) => q.owner === u.question)) questions.push({ owner: u.question, customer: u.question });
  }
  for (const r of receipts) if (r.mismatch) questions.push({ owner: `Receipt ${r.merchant?.value ?? ""}: printed lines add to ${(r.lineSumCents / 100).toFixed(2)}, subtotal reads ${((r.subtotalCents ?? 0) / 100).toFixed(2)}. Check it.`.replace("  ", " "), customer: "" });

  const extras = (input.textIntake?.extras ?? []).filter((e) => e.status !== "unknown").map((e) => ({ kind: e.kind, qty: e.qty, sources: [textSrc] }));
  for (const img of input.images?.images ?? []) {
    for (const p of img.items) {
      if (p.category === "soundbar" && !extras.some((e) => e.kind === "soundbar") && !items.some((x) => x.item.category === "soundbar")) extras.push({ kind: "soundbar", qty: 1, sources: [{ kind: "photo", id: img.imageId }] });
    }
  }

  return {
    tvs: keptTvs,
    items,
    extras,
    access,
    ...(input.textIntake?.cleanup?.value ? { cleanup: input.textIntake.cleanup.value } : {}),
    questions: questions.filter((q, i, all) => all.findIndex((x) => x.owner === q.owner) === i),
    conflicts: Array.from(new Set(conflicts)),
    receipts,
    images: (input.images?.images ?? []).map((img) => ({ imageId: img.imageId, kind: img.kind, summary: img.summary })),
    extractedText: input.extractedText ?? "",
  };
}

// ------------------------------------------------------------------ review -> JobScope

export const reviewDecisionsSchema = z
  .object({
    /** factKey -> accept / reject. Facts that do not require confirmation are accepted unless rejected. */
    decisions: z.record(z.string().max(80), z.enum(["accept", "reject"])).default({}),
    /** Keys of proposed TVs / items the owner removed (e.g. a duplicate TV seen in two photos). */
    removed: z.array(z.string().max(40)).max(40).default([]),
    /** Owner-entered values for facts (e.g. tvs.0.inches = 65). Validated by the JobScope schema. */
    overrides: z.record(z.string().max(80), z.union([z.string().max(40), z.number(), z.boolean()])).default({}),
    confirmExtractedText: z.boolean().default(false),
  })
  .strict();
export type ReviewDecisions = z.infer<typeof reviewDecisionsSchema>;

/**
 * Build the JobScope from a reviewed proposal. A fact that requires confirmation is applied ONLY when accepted;
 * otherwise the conservative unknown/default is used so the engine keeps asking (estimate / review status).
 * Safety prerequisites are only set from accepted suggestions; hidden conditions are never set from photos.
 */
export function proposalToScope(p: UnifiedProposal, review: Partial<ReviewDecisions> = {}): { scope: JobScopeInput; applied: string[]; pending: string[] } {
  const decisions = review.decisions ?? {};
  const removed = new Set(review.removed ?? []);
  const overrides = review.overrides ?? {};
  const applied: string[] = [];
  const pending: string[] = [];
  const use = <T,>(key: string, f: Fact<T> | undefined): T | undefined => {
    if (key in overrides) {
      applied.push(key);
      return overrides[key] as unknown as T;
    }
    if (!f) return undefined;
    const d = decisions[key];
    if (d === "reject") return undefined;
    if (f.requiresConfirmation && d !== "accept") {
      pending.push(key);
      return undefined;
    }
    applied.push(key);
    return f.value;
  };

  const tvs = p.tvs
    .map((tv, i) => ({ tv, i }))
    .filter(({ tv }) => !removed.has(tv.key))
    .map(({ tv, i }, n) => {
      const k = (f: string) => `tvs.${i}.${f}`;
      const inches = use(k("inches"), tv.facts.inches);
      const band = inches !== undefined ? sizeBandOf(Number(inches)) : use(k("sizeBand"), tv.facts.sizeBand) ?? "56+";
      const mountSource = use(k("mountSource"), tv.facts.mountSource) ?? "customer";
      const mountType = use(k("mountType"), tv.facts.mountType);
      const location = use(k("location"), tv.facts.location);
      return {
        id: `tv-${n + 1}`,
        sizeBand: band,
        ...(inches !== undefined ? { inches: Number(inches) } : {}),
        wall: use(k("wall"), tv.facts.wall) ?? "unknown",
        location: (location === "fireplace" || location === "high_wall" ? location : "standard") as "standard" | "fireplace" | "high_wall",
        mountSource,
        mountType: mountSource === "pptv" ? mountType ?? "fixed" : null,
        wire: use(k("wire"), tv.facts.wire) ?? "visible",
        power: use(k("power"), tv.facts.power) ?? "unknown",
        removal: { tvRemoval: use(k("tvRemoval"), tv.facts.tvRemoval) === true, mountRemoval: false, remount: false },
      };
    });

  const items = p.items
    .map((it, i) => ({ it, i }))
    .filter(({ it }) => !removed.has(it.key))
    .map(({ it, i }) => {
      const conditions: Record<string, "yes" | "no" | "unknown"> = { ...((it.item.conditions as Record<string, "yes" | "no" | "unknown">) ?? {}) };
      for (const [cond, f] of Object.entries(it.conditions)) {
        const v = use(`items.${i}.conditions.${cond}`, f);
        if (v) conditions[cond] = v;
      }
      return { ...it.item, ...(Object.keys(conditions).length ? { conditions } : {}) };
    });

  const scope: JobScopeInput = {
    tvs,
    extras: p.extras.map((e) => ({ kind: e.kind as never, qty: e.qty })),
    items,
    access: {
      level: "normal",
      furnitureMovement: use("access.furnitureMovement", p.access.furnitureMovement) === true,
      ladderHeight: use("access.ladderHeight", p.access.ladderHeight) === true,
      helper: use("access.helper", p.access.helper) === true,
    },
    ...(p.cleanup ? { cleanup: p.cleanup as never } : {}),
  };
  // Always a structurally valid scope; anything else is a bug, not a guess.
  parseJobScope(scope);
  return { scope, applied, pending };
}

/** Customer-safe findings: plain sentences and questions. No confidence numbers, sources or internal terms. */
export function customerFindings(p: UnifiedProposal): { found: string[]; questions: string[] } {
  const found: string[] = [];
  if (p.tvs.length) found.push(`${p.tvs.length} TV${p.tvs.length > 1 ? "s" : ""}`);
  p.tvs.forEach((tv, i) => {
    const parts: string[] = [];
    if (tv.facts.inches) parts.push(`about ${tv.facts.inches.value}"`);
    if (tv.facts.location?.value === "fireplace") parts.push("above a fireplace");
    if (tv.facts.wall && tv.facts.wall.value !== "unknown") parts.push(`${tv.facts.wall.value} wall`);
    if (parts.length) found.push(`TV ${i + 1}: ${parts.join(", ")}`);
  });
  for (const it of p.items) found.push(`${it.item.name ?? (it.item.category ?? "item").replace(/_/g, " ")}`);
  for (const e of p.extras) found.push(e.kind === "soundbar" ? "Soundbar" : e.kind);
  return { found, questions: p.questions.map((q) => q.customer).filter(Boolean).slice(0, 8) };
}

/** Text a person wrote (message, transcript) plus text read from screenshots / notes / listings, for the text intake. */
export function combineIntakeText(message: string, images: ImageAnalysisResult | null): { text: string; extractedText: string } {
  const read = (images?.images ?? [])
    .filter((img) => img.text && (img.kind === "conversation_screenshot" || img.kind === "handwritten_note" || img.kind === "product_listing" || img.kind === "tv_packaging"))
    .map((img) => img.text!.trim())
    .filter(Boolean);
  const extractedText = read.join("\n").slice(0, 4_000);
  const text = [message.trim(), extractedText].filter(Boolean).join("\n").slice(0, 4_000);
  return { text, extractedText };
}
