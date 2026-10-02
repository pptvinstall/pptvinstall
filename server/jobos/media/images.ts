import { createHash } from "node:crypto";
import sharp from "sharp";

// Upload validation and normalization. Every upload is:
//  1. size-limited before decoding;
//  2. identified by its magic bytes (the declared Content-Type and file name are never trusted);
//  3. decoded by libvips with a pixel limit (no decompression bombs), auto-rotated, resized and re-encoded as JPEG.
// Re-encoding drops ALL metadata (EXIF, GPS location, camera serials), so stored and analyzed images carry no
// location data, and nothing executable or non-image (SVG, PDF, HTML) can ever be stored as "an image".

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
export const MAX_IMAGE_PIXELS = 60_000_000;
export const STORED_MAX_EDGE = 2048;
export const THUMB_MAX_EDGE = 480;
export const VISION_MAX_EDGE = 1568;

export type SniffedType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";

export class MediaValidationError extends Error {
  constructor(message: string, public readonly code: "TOO_LARGE" | "EMPTY" | "UNSUPPORTED_TYPE" | "HEIC_NOT_SUPPORTED" | "UNDECODABLE") {
    super(message);
    this.name = "MediaValidationError";
  }
}

export function sniffImageType(buf: Buffer): SniffedType | "heic" | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("latin1") === "RIFF" && buf.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString("latin1"))) return "image/gif";
  if (buf.length >= 12 && buf.subarray(4, 8).toString("latin1") === "ftyp" && /^(heic|heix|hevc|hevx|mif1|msf1)$/.test(buf.subarray(8, 12).toString("latin1"))) return "heic";
  return null;
}

export interface NormalizedImage {
  data: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
  sha256: string;
  originalType: SniffedType;
  originalBytes: number;
}

export async function normalizeImage(input: Buffer): Promise<NormalizedImage> {
  if (!input.length) throw new MediaValidationError("The file is empty.", "EMPTY");
  if (input.length > MAX_UPLOAD_BYTES) throw new MediaValidationError(`Images must be ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB or smaller.`, "TOO_LARGE");
  const type = sniffImageType(input);
  if (type === "heic") throw new MediaValidationError("HEIC photos are not supported yet. On iPhone, share the photo as JPEG (Settings → Camera → Formats → Most Compatible).", "HEIC_NOT_SUPPORTED");
  if (!type) throw new MediaValidationError("Only JPEG, PNG, WebP or GIF images can be uploaded.", "UNSUPPORTED_TYPE");
  try {
    const base = () => sharp(input, { limitInputPixels: MAX_IMAGE_PIXELS, failOn: "error", animated: false }).rotate();
    const { data, info } = await base()
      .resize({ width: STORED_MAX_EDGE, height: STORED_MAX_EDGE, fit: "inside", withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const thumb = await sharp(data).resize({ width: THUMB_MAX_EDGE, height: THUMB_MAX_EDGE, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72 }).toBuffer();
    return { data, thumb, width: info.width, height: info.height, sha256: createHash("sha256").update(data).digest("hex"), originalType: type, originalBytes: input.length };
  } catch (err) {
    if (err instanceof MediaValidationError) throw err;
    throw new MediaValidationError("That image could not be read. Try a different photo or screenshot.", "UNDECODABLE");
  }
}

/** Smaller copy sent to a vision provider (bandwidth, cost, provider limits). */
export async function visionCopy(stored: Buffer): Promise<Buffer> {
  return sharp(stored).resize({ width: VISION_MAX_EDGE, height: VISION_MAX_EDGE, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 80 }).toBuffer();
}
