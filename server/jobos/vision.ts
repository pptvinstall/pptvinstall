import { IMAGE_KINDS, PHOTO_WALLS, parseImageAnalysis, type ImageAnalysisResult } from "@shared/jobos/unifiedIntake";
import type { WorkConfig } from "@shared/pricing/workConfig";

// Vision / OCR provider boundary. Job OS only ever sees the stable PPTV schema (imageAnalysisResultSchema);
// providers can change without touching the domain. Providers never see prices and never return them.
// When no provider is available, intake still works from text and manual entry: analysis is "skipped".

export interface VisionImage {
  id: string;
  /** JPEG bytes, already normalized (metadata stripped) and resized for vision. */
  jpeg: Buffer;
  /** What the owner/customer said it is (photo, screenshot, receipt, label). A hint, not a fact. */
  hint: string;
}

export interface VisionProvider {
  readonly name: string;
  readonly model: string;
  enabled(): boolean;
  /** Returns the provider's raw text; the caller validates it against the strict schema. */
  analyze(images: VisionImage[], prompt: string): Promise<string>;
}

export const VISION_SCHEMA_VERSION = "pptv-vision-1";

export function buildVisionPrompt(images: VisionImage[], work: WorkConfig): string {
  const categories = Object.entries(work.categories)
    .filter(([k]) => k !== "custom")
    .map(([k, c]) => `${k} (${c.label})`)
    .join(", ");
  return [
    "You analyze customer photos and screenshots for Picture Perfect TV Install, a TV mounting and home installation business.",
    "Return ONLY JSON matching the schema below. No prose, no markdown.",
    "",
    "RULES",
    "- Describe what is VISIBLE. Never invent facts. If you cannot tell, leave the field out.",
    "- confidence is 0..1 for how sure you are from the image alone.",
    "- NEVER include prices, costs, totals, estimates or labor times (except printed receipt amounts, read exactly as printed, in cents).",
    "- You cannot verify hidden conditions from a photo: wall studs/substrate suitability, whether a ceiling box is fan-rated, ceiling joists, wiring condition, circuits. Never claim them; at most describe what is visible in `observation`.",
    "- The same TV in several images must use the same `ref`.",
    "- Room photos can only roughly estimate TV size: use low confidence. A label, packaging or listing that states the size or model can be high confidence.",
    "- For screenshots of conversations, notes or product listings, copy the visible text into `text` (no phone numbers, emails or addresses).",
    `- Item categories must be one of: ${categories}.`,
    "",
    "SCHEMA",
    JSON.stringify({
      images: [
        {
          imageId: "<one of the ids below>",
          kind: IMAGE_KINDS.join("|"),
          summary: "<= 240 chars, what the image shows",
          text: "optional visible text",
          tvs: [
            {
              ref: "tv-a",
              sizeInches: { value: 65, confidence: 0.3, observation: "optional" },
              modelNumber: { value: "QN65Q80C", confidence: 0.9 },
              location: { value: "standard|fireplace|high_wall|ceiling", confidence: 0.8 },
              wall: { value: PHOTO_WALLS.join("|"), confidence: 0.7 },
              mountPresent: { value: true, confidence: 0.6 },
              mountType: { value: "fixed|tilt|full_motion", confidence: 0.5 },
              outletPresent: { value: false, confidence: 0.4 },
              outletLocation: { value: "behind_tv|below_tv|beside_tv|far|none_visible", confidence: 0.4 },
              visibleWires: { value: true, confidence: 0.8 },
              racewayPresent: { value: false, confidence: 0.6 },
            },
          ],
          items: [
            {
              ref: "item-a",
              category: "ceiling_fan",
              action: { value: "install", confidence: 0.7 },
              quantity: { value: 1, confidence: 0.9 },
              fixturePresent: { value: true, confidence: 0.8 },
              fanRatedBoxVisible: { value: false, confidence: 0.2, observation: "box not visible" },
              ceilingHeightFt: { value: 9, confidence: 0.4 },
            },
          ],
          site: { stairs: { value: true, confidence: 0.6 }, highCeiling: { value: false, confidence: 0.5 }, furnitureMovement: { value: true, confidence: 0.6 }, obstacles: { value: "sectional sofa under the wall", confidence: 0.6 } },
          receipt: {
            merchant: { value: "Home Depot", confidence: 0.95 },
            date: { value: "2026-10-01", confidence: 0.9 },
            items: [{ description: "Old work box", quantity: 1, totalCents: 248, unitCents: 248, confidence: 0.9 }],
            subtotalCents: { value: 248, confidence: 0.9 },
            taxCents: { value: 22, confidence: 0.9 },
            totalCents: { value: 270, confidence: 0.9 },
          },
        },
      ],
      notes: ["optional short notes"],
    }),
    "Every field except imageId, kind, summary is optional. Omit what does not apply (e.g. receipt only for receipts).",
    "",
    "IMAGES (in order):",
    ...images.map((img, i) => `${i + 1}. id=${img.id} (uploaded as: ${img.hint})`),
  ].join("\n");
}

/** Run a provider and validate. Never throws for provider problems: returns a failure the caller can show. */
export async function runVision(provider: VisionProvider | null, images: VisionImage[], work: WorkConfig): Promise<{ status: "analyzed"; result: ImageAnalysisResult } | { status: "skipped" | "failed"; error: string }> {
  if (!images.length) return { status: "skipped", error: "no images" };
  if (!provider || !provider.enabled()) return { status: "skipped", error: "Photo analysis is not configured in this environment." };
  try {
    const raw = await provider.analyze(images, buildVisionPrompt(images, work));
    return { status: "analyzed", result: parseImageAnalysis(raw, images.map((i) => i.id)) };
  } catch (err) {
    // Log the failure class only; never the image or extracted text.
    console.warn(`[jobos] vision analysis failed: ${(err as Error).name}`);
    return { status: "failed", error: (err as Error).name === "ImageAnalysisValidationError" ? "Photo analysis returned an invalid result." : "Photo analysis is unavailable right now." };
  }
}

/**
 * Demo / test provider. Deterministic: describes each image from its upload hint only, with low confidence.
 * Allowed only outside production (see createVisionProvider).
 */
export class MockVisionProvider implements VisionProvider {
  readonly name = "mock";
  readonly model = "mock-1";
  constructor(private readonly respond?: (images: VisionImage[]) => unknown) {}
  enabled() {
    return true;
  }
  async analyze(images: VisionImage[]): Promise<string> {
    if (this.respond) return JSON.stringify(this.respond(images));
    let tv = 0;
    return JSON.stringify({
      images: images.map((img) => {
        if (img.hint === "screenshot") return { imageId: img.id, kind: "conversation_screenshot", summary: "Screenshot of a customer conversation (demo analysis).", text: "" };
        if (img.hint === "receipt") return { imageId: img.id, kind: "receipt", summary: "Receipt (demo analysis: no items read).", receipt: { items: [] } };
        tv += 1;
        return {
          imageId: img.id,
          kind: "room_photo",
          summary: "Room with a wall for a TV (demo analysis).",
          tvs: [{ ref: `tv-${tv}`, wall: { value: "drywall", confidence: 0.6, observation: "painted wall, looks like drywall" }, outletLocation: { value: "none_visible", confidence: 0.4 } }],
        };
      }),
      notes: ["Demo vision provider: results are illustrative, not real analysis."],
    });
  }
}

export function createVisionProvider(deps: { anthropic?: VisionProvider | null; env?: NodeJS.ProcessEnv }): VisionProvider | null {
  const env = deps.env ?? process.env;
  const choice = (env.VISION_PROVIDER || "").trim().toLowerCase();
  const production = (env.APP_ENV || "").toLowerCase() === "production" || (!env.APP_ENV && env.NODE_ENV === "production");
  if (choice === "mock" && !production) return new MockVisionProvider();
  if (choice === "none") return null;
  return deps.anthropic ?? null;
}
