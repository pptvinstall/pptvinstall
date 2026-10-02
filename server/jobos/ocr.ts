import { createRequire } from "node:module";
import { createWorker, type Worker } from "tesseract.js";
import type { ImageObservation } from "@shared/jobos/unifiedIntake";
import { sizeFromModelNumber } from "@shared/jobos/unifiedIntake";

export interface OcrProvider {
  readonly name: string;
  readonly model: string;
  enabled(): boolean;
  read(jpeg: Buffer): Promise<{ text: string; confidence: number }>;
}
export const OCR_SCHEMA_VERSION = "pptv-ocr-1";
export const textImageHint = (hint: string) => ["screenshot", "label", "receipt", "other"].includes(hint);

/** Local OCR. Bundled English data; no customer bytes or runtime model downloads leave the server. */
export class LocalOcrProvider implements OcrProvider {
  readonly name = "tesseract";
  readonly model = "eng-lstm-7";
  private busy = false;
  constructor(private readonly on = true) {}
  enabled() { return this.on; }
  async read(jpeg: Buffer) {
    // Bound server memory/CPU. Concurrent intakes can still use text and manual confirmation.
    if (this.busy) throw new Error("OCR_BUSY");
    this.busy = true;
    let worker: Worker | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    try {
      const require = createRequire(import.meta.url);
      const lang = require("@tesseract.js-data/eng") as { langPath: string; gzip: boolean };
      const task = (async () => {
        worker = await createWorker("eng", 1, { langPath: lang.langPath, gzip: lang.gzip, cacheMethod: "none", errorHandler: () => undefined });
        if (stopped) { await worker.terminate(); throw new Error("OCR_TIMEOUT"); }
        const { data } = await worker.recognize(jpeg);
        return { text: data.text.slice(0, 3000), confidence: data.confidence / 100 };
      })();
      return await Promise.race([task, new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("OCR_TIMEOUT")), 20_000);
      })]);
    } finally {
      stopped = true;
      if (timer) clearTimeout(timer);
      if (worker) await worker.terminate().catch(() => undefined);
      this.busy = false;
    }
  }
}

export function ocrObservation(id: string, hint: string, result: { text: string; confidence: number }): ImageObservation | null {
  const text = result.text.trim().slice(0, 3000);
  if (result.confidence < 0.65 || text.replace(/\W/g, "").length < 5) return null;
  const models = text.toUpperCase().match(/\b[A-Z0-9][A-Z0-9-]{4,24}\b/g) ?? [];
  const model = hint === "label" ? models.find((m) => /[A-Z]/.test(m) && sizeFromModelNumber(m) !== null) : undefined;
  const statedSize = hint === "label" ? /\b(\d{2,3})\s*(?:inches|inch|in\b|["″])/i.exec(text) : null;
  const inches = statedSize ? Number(statedSize[1]) : null;
  return {
    imageId: id,
    kind: hint === "label" ? "tv_label" : hint === "receipt" ? "receipt" : hint === "other" ? "handwritten_note" : "conversation_screenshot",
    summary: "Visible text extracted locally. Confirm it against the image.",
    text,
    tvs: model || (inches && inches >= 19 && inches <= 120) ? [{ ref: `ocr-${id.slice(0, 12)}`, ...(model ? { modelNumber: { value: model, confidence: Math.min(0.79, result.confidence), observation: "OCR model label; confirm against the image" } } : {}), ...(inches && inches >= 19 && inches <= 120 ? { sizeInches: { value: inches, confidence: Math.min(0.79, result.confidence) } } : {}) }] : [],
    items: [],
  };
}
