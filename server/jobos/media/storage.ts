import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client, type S3ClientConfig } from "@aws-sdk/client-s3";

// Private object storage for customer media (photos, screenshots, receipts). The database keeps only metadata
// and a storage key; bytes never go into normal DB rows. Nothing here is served from a public/static path:
// bytes are returned only through authenticated, id-addressed endpoints.
//
// Production fails closed unless a private S3/R2 bucket is configured or the operator explicitly confirms
// MEDIA_DIR is on a persistent disk. Status describes configuration, not a live connectivity/privacy check.

export interface MediaStorageStatus {
  readonly kind: string;
  readonly enabled: boolean;
  readonly durable: boolean;
  readonly reason: string | null;
}

export interface MediaStorage extends MediaStorageStatus {
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

/** Only these fields may be returned to the owner; never credentials, endpoints, bucket names or paths. */
export function mediaStorageStatus(storage?: MediaStorage): MediaStorageStatus {
  return storage
    ? { kind: storage.kind, enabled: storage.enabled, durable: storage.durable, reason: storage.reason }
    : { kind: "disabled", enabled: false, durable: false, reason: "Media storage is not configured. Manual quoting is available." };
}

export class MediaStorageUnavailableError extends Error {
  readonly code = "MEDIA_NOT_CONFIGURED";
  constructor() {
    super("Media storage is disabled. Configure private durable storage; manual quoting is available.");
    this.name = "MediaStorageUnavailableError";
  }
}

export class DisabledMediaStorage implements MediaStorage {
  readonly kind = "disabled";
  readonly enabled = false;
  readonly durable = false;
  constructor(readonly reason: string) {}
  async put(): Promise<void> { throw new MediaStorageUnavailableError(); }
  async get(): Promise<Buffer | null> { throw new MediaStorageUnavailableError(); }
  async delete(): Promise<void> { throw new MediaStorageUnavailableError(); }
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;
export function assertSafeKey(key: string): string {
  if (!SAFE_KEY.test(key) || key.includes("..") || key.includes("//")) throw new Error("Invalid media storage key");
  return key;
}

export const MAX_STORED_MEDIA_BYTES = 12 * 1024 * 1024;
function assertObjectData(data: Buffer, contentType: string) {
  if (!Buffer.isBuffer(data) || data.length === 0 || data.length > MAX_STORED_MEDIA_BYTES) throw new Error("Invalid media object size");
  // The upload service already validates magic bytes and re-encodes to JPEG with metadata removed.
  if (contentType !== "image/jpeg") throw new Error("Media storage accepts normalized JPEG images only");
}

export class MemoryMediaStorage implements MediaStorage {
  readonly kind = "memory";
  readonly enabled = true;
  readonly durable = false;
  readonly reason = "Temporary test storage; images are lost when the process restarts.";
  private objects = new Map<string, Buffer>();
  async put(key: string, data: Buffer, contentType = "image/jpeg") {
    assertObjectData(data, contentType);
    this.objects.set(assertSafeKey(key), Buffer.from(data));
  }
  async get(key: string) {
    const v = this.objects.get(assertSafeKey(key));
    return v ? Buffer.from(v) : null;
  }
  async delete(key: string) {
    this.objects.delete(assertSafeKey(key));
  }
  /** Test helper. */
  size() {
    return this.objects.size;
  }
}

export class DiskMediaStorage implements MediaStorage {
  readonly kind = "disk";
  readonly enabled = true;
  readonly reason: string | null;
  constructor(private readonly root: string, readonly durable = false) {
    this.reason = durable ? null : "Temporary local storage; durability is not configured.";
  }
  private resolve(key: string) {
    const full = path.resolve(this.root, assertSafeKey(key));
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid media storage key");
    return full;
  }
  async put(key: string, data: Buffer, contentType = "image/jpeg") {
    assertObjectData(data, contentType);
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true, mode: 0o700 });
    await writeFile(full, data, { mode: 0o600 });
  }
  async get(key: string) {
    try {
      return await readFile(this.resolve(key));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }
  async delete(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

type ObjectCommand = PutObjectCommand | GetObjectCommand | DeleteObjectCommand;
/** Small seam for deterministic tests; production uses the AWS SDK client with signed requests. */
export interface MediaObjectClient {
  send(command: ObjectCommand, options?: { abortSignal?: AbortSignal }): Promise<unknown>;
}

export interface S3MediaOptions {
  bucket: string;
  prefix?: string;
}

export class S3MediaStorage implements MediaStorage {
  readonly kind = "s3";
  readonly enabled = true;
  readonly durable = true;
  readonly reason = null;
  private readonly prefix: string;
  constructor(private readonly client: MediaObjectClient, private readonly options: S3MediaOptions) {
    this.prefix = assertSafeKey(options.prefix || "pptv-media");
  }
  private key(key: string) {
    return `${this.prefix}/${assertSafeKey(key)}`;
  }
  async put(key: string, data: Buffer, contentType: string) {
    assertObjectData(data, contentType);
    // No ACL, public URL or presigned URL. Bucket policy must deny public access (see setup runbook).
    await this.client.send(new PutObjectCommand({
      Bucket: this.options.bucket,
      Key: this.key(key),
      Body: data,
      ContentType: contentType,
      ContentLength: data.length,
      CacheControl: "private, no-store",
    }), { abortSignal: AbortSignal.timeout(15_000) });
  }
  async get(key: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.options.bucket, Key: this.key(key) }), {
        abortSignal: AbortSignal.timeout(15_000),
      }) as { Body?: AsyncIterable<Uint8Array> & { destroy?: () => void }; ContentLength?: number };
      const body = result.Body;
      if (!body) throw new Error("Media object body is missing");
      try {
        if (result.ContentLength !== undefined && result.ContentLength > MAX_STORED_MEDIA_BYTES) throw new Error("Media object exceeds size limit");
        const chunks: Buffer[] = [];
        let length = 0;
        for await (const chunk of body) {
          length += chunk.byteLength;
          if (length > MAX_STORED_MEDIA_BYTES) throw new Error("Media object exceeds size limit");
          chunks.push(Buffer.from(chunk));
        }
        return Buffer.concat(chunks, length);
      } finally {
        body.destroy?.();
      }
    } catch (err) {
      // AccessDenied, network/provider failures, or a missing bucket must not masquerade as a missing photo.
      if (typeof err === "object" && err !== null && "name" in err && err.name === "NoSuchKey") return null;
      throw err;
    }
  }
  async delete(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.options.bucket, Key: this.key(key) }), {
      abortSignal: AbortSignal.timeout(15_000),
    });
  }
}

export function createMediaStorage(env: NodeJS.ProcessEnv = process.env): MediaStorage {
  const appEnv = env.APP_ENV?.trim().toLowerCase();
  // Only explicit staging/test may use temporary adapters with a production Node build. An unknown APP_ENV
  // (including a typo) must not silently defeat the production storage gate.
  const production = appEnv === "production" || (env.NODE_ENV?.trim().toLowerCase() === "production" && appEnv !== "staging" && appEnv !== "test");
  const mode = (env.MEDIA_STORAGE || (production ? "disabled" : env.JOBOS_STORE === "memory" ? "memory" : "disk")).trim().toLowerCase();
  if (mode === "disabled" || mode === "none") return new DisabledMediaStorage("Uploads are disabled until private durable storage is configured. Manual quoting is available.");
  if (mode === "memory") return production
    ? new DisabledMediaStorage("Memory storage is temporary and cannot be used for production uploads.")
    : new MemoryMediaStorage();
  if (mode === "disk") {
    const durable = env.MEDIA_DISK_PERSISTENT === "true";
    if (production && (!durable || !env.MEDIA_DIR?.trim() || !path.isAbsolute(env.MEDIA_DIR.trim()))) {
      return new DisabledMediaStorage("Production disk storage requires an absolute MEDIA_DIR on a mounted persistent disk and MEDIA_DISK_PERSISTENT=true.");
    }
    return new DiskMediaStorage(path.resolve(env.MEDIA_DIR || path.join(process.cwd(), ".media")), durable);
  }
  if (mode !== "s3" && mode !== "r2") return new DisabledMediaStorage("Unrecognized MEDIA_STORAGE. Use disabled, memory, disk, s3 or r2.");

  const required = ["MEDIA_S3_BUCKET", "MEDIA_S3_REGION", "MEDIA_S3_ACCESS_KEY_ID", "MEDIA_S3_SECRET_ACCESS_KEY"] as const;
  const missing: string[] = required.filter((key) => !env[key]?.trim());
  if (mode === "r2" && !env.MEDIA_S3_ENDPOINT?.trim()) missing.push("MEDIA_S3_ENDPOINT");
  if (missing.length) return new DisabledMediaStorage(`Private object storage is missing: ${missing.join(", ")}.`);
  try {
    const bucket = env.MEDIA_S3_BUCKET!.trim();
    if (!/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) || bucket.includes("..") || /^\d+\.\d+\.\d+\.\d+$/.test(bucket)) {
      return new DisabledMediaStorage("MEDIA_S3_BUCKET must be a valid private bucket name.");
    }
    const prefix = assertSafeKey(env.MEDIA_S3_PREFIX?.trim() || "pptv-media");
    const endpoint = env.MEDIA_S3_ENDPOINT?.trim();
    if (endpoint) {
      const url = new URL(endpoint);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
        return new DisabledMediaStorage("MEDIA_S3_ENDPOINT must be an HTTPS service endpoint without credentials, path, query or fragment.");
      }
    }
    if (env.MEDIA_S3_FORCE_PATH_STYLE && !["true", "false"].includes(env.MEDIA_S3_FORCE_PATH_STYLE)) {
      return new DisabledMediaStorage("MEDIA_S3_FORCE_PATH_STYLE must be true or false.");
    }
    const config: S3ClientConfig = {
      region: env.MEDIA_S3_REGION!.trim(),
      endpoint,
      forcePathStyle: env.MEDIA_S3_FORCE_PATH_STYLE === "true",
      maxAttempts: 2,
      // R2 supports SHA checksums, but not every SDK default CRC feature. Use only required checksums.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
      credentials: {
        accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID!.trim(),
        secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY!.trim(),
        sessionToken: env.MEDIA_S3_SESSION_TOKEN?.trim() || undefined,
      },
    };
    return new S3MediaStorage(new S3Client(config), { bucket, prefix });
  } catch {
    return new DisabledMediaStorage("Invalid private object storage configuration. Review MEDIA_S3_ENDPOINT and MEDIA_S3_PREFIX.");
  }
}
