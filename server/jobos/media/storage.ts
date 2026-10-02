import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Private object storage for customer media (photos, screenshots, receipts). The database keeps only metadata
// and a storage key; bytes never go into normal DB rows. Nothing here is served from a public/static path:
// bytes are returned only through authenticated, id-addressed endpoints.
//
// Implementations:
//  - DiskMediaStorage: files under MEDIA_DIR (default ./.media, git-ignored). Needs a PERSISTENT volume in
//    production; Render's free plan has none, so production media needs a disk or an S3/R2 adapter first.
//  - MemoryMediaStorage: tests and staging test mode.
// An S3-compatible adapter only has to implement this interface; nothing else in Job OS changes.

export interface MediaStorage {
  readonly kind: string;
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
}

const SAFE_KEY = /^[a-z0-9][a-z0-9/_.-]{0,200}$/;
export function assertSafeKey(key: string): string {
  if (!SAFE_KEY.test(key) || key.includes("..") || key.includes("//")) throw new Error("Invalid media storage key");
  return key;
}

export class MemoryMediaStorage implements MediaStorage {
  readonly kind = "memory";
  private objects = new Map<string, Buffer>();
  async put(key: string, data: Buffer) {
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
  constructor(private readonly root: string) {}
  private resolve(key: string) {
    const full = path.resolve(this.root, assertSafeKey(key));
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("Invalid media storage key");
    return full;
  }
  async put(key: string, data: Buffer) {
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

export function createMediaStorage(env: NodeJS.ProcessEnv = process.env): MediaStorage {
  const mode = (env.MEDIA_STORAGE || (env.JOBOS_STORE === "memory" ? "memory" : "disk")).trim().toLowerCase();
  if (mode === "memory") return new MemoryMediaStorage();
  return new DiskMediaStorage(path.resolve(env.MEDIA_DIR || path.join(process.cwd(), ".media")));
}
