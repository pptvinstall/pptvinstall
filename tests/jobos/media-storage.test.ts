import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import {
  createMediaStorage, DiskMediaStorage, MAX_STORED_MEDIA_BYTES, mediaStorageStatus,
  MediaStorageUnavailableError, MemoryMediaStorage, S3MediaStorage, type MediaObjectClient,
} from "../../server/jobos/media/storage";

const s3Env = {
  APP_ENV: "production", MEDIA_STORAGE: "s3", MEDIA_S3_BUCKET: "synthetic-private-media", MEDIA_S3_REGION: "us-east-1",
  MEDIA_S3_ACCESS_KEY_ID: "synthetic-test-id", MEDIA_S3_SECRET_ACCESS_KEY: "synthetic-test-secret",
};

test("production refuses implicit disk, memory, missing object credentials, and unknown storage modes without stopping boot", async () => {
  for (const env of [
    { APP_ENV: "production" }, { NODE_ENV: "production" },
    { APP_ENV: " Production " }, { APP_ENV: "production-typo", NODE_ENV: "production" },
    { APP_ENV: "production", JOBOS_STORE: "memory" },
    { APP_ENV: "production", MEDIA_STORAGE: "memory" },
    { APP_ENV: "production", MEDIA_STORAGE: "disk" },
    { APP_ENV: "production", MEDIA_STORAGE: "disk", MEDIA_DIR: path.resolve(".media") },
    { APP_ENV: "production", MEDIA_STORAGE: "disk", MEDIA_DIR: "relative", MEDIA_DISK_PERSISTENT: "true" },
    { APP_ENV: "production", MEDIA_STORAGE: "s3" },
    { ...s3Env, MEDIA_STORAGE: "r2" },
    { ...s3Env, MEDIA_STORAGE: "s33" },
  ]) {
    const storage = createMediaStorage(env);
    assert.equal(storage.enabled, false);
    assert.equal(storage.durable, false);
    assert.ok(storage.reason);
    await assert.rejects(() => storage.put("owner/test.jpg", Buffer.from("image"), "image/jpeg"), MediaStorageUnavailableError);
    await assert.rejects(() => storage.get("owner/test.jpg"), MediaStorageUnavailableError);
    await assert.rejects(() => storage.delete("owner/test.jpg"), MediaStorageUnavailableError);
  }
  const persisted = createMediaStorage({ APP_ENV: "production", MEDIA_STORAGE: "disk", MEDIA_DIR: path.resolve("synthetic-volume"), MEDIA_DISK_PERSISTENT: "true" });
  assert.equal(persisted.enabled, true);
  assert.equal(persisted.durable, true);
  assert.equal(persisted.kind, "disk");
});

test("dev and staging test adapters remain usable and report their temporary status honestly", () => {
  assert.equal(createMediaStorage({}).kind, "disk");
  assert.equal(createMediaStorage({}).durable, false);
  assert.equal(createMediaStorage({ JOBOS_STORE: "memory" }).kind, "memory");
  assert.equal(createMediaStorage({ APP_ENV: "staging", NODE_ENV: "production", JOBOS_STORE: "memory" }).kind, "memory");
  assert.deepEqual(mediaStorageStatus(), { kind: "disabled", enabled: false, durable: false, reason: "Media storage is not configured. Manual quoting is available." });
});

test("object configuration only enables explicit valid private S3/R2 setup; owner status contains no configuration secrets", () => {
  for (const env of [s3Env, { ...s3Env, MEDIA_STORAGE: "r2", MEDIA_S3_REGION: "auto", MEDIA_S3_ENDPOINT: "https://synthetic-account.r2.cloudflarestorage.com" }]) {
    const storage = createMediaStorage(env);
    assert.deepEqual(mediaStorageStatus(storage), { kind: "s3", enabled: true, durable: true, reason: null });
    const visible = JSON.stringify(mediaStorageStatus(storage));
    assert.ok(!visible.includes(env.MEDIA_S3_ACCESS_KEY_ID));
    assert.ok(!visible.includes(env.MEDIA_S3_SECRET_ACCESS_KEY));
    assert.ok(!visible.includes(env.MEDIA_S3_BUCKET));
  }
  for (const extra of [
    { MEDIA_S3_ENDPOINT: "http://synthetic.local" },
    { MEDIA_S3_ENDPOINT: "https://synthetic-user:synthetic-password@synthetic.local" },
    { MEDIA_S3_ENDPOINT: "https://synthetic.local/private" },
    { MEDIA_S3_ENDPOINT: "https://synthetic.local/?key=synthetic" },
    { MEDIA_S3_ENDPOINT: "invalid endpoint" },
    { MEDIA_S3_BUCKET: "../outside" },
    { MEDIA_S3_PREFIX: "../outside" },
    { MEDIA_S3_FORCE_PATH_STYLE: "maybe" },
  ]) {
    const storage = createMediaStorage({ ...s3Env, ...extra });
    assert.equal(storage.enabled, false);
    assert.ok(!JSON.stringify(mediaStorageStatus(storage)).includes("synthetic-password"));
  }
});

test("local adapters isolate bytes, refuse traversal, enforce size/type limits and delete private objects", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "pptv-media-storage-test-"));
  try {
    for (const storage of [new MemoryMediaStorage(), new DiskMediaStorage(root)]) {
      const input = Buffer.from("synthetic normalized image");
      await storage.put("owner/2026/10/synthetic.jpg", input, "image/jpeg");
      input.fill(0);
      assert.equal((await storage.get("owner/2026/10/synthetic.jpg"))?.toString(), "synthetic normalized image");
      const output = (await storage.get("owner/2026/10/synthetic.jpg"))!;
      output.fill(0);
      assert.equal((await storage.get("owner/2026/10/synthetic.jpg"))?.toString(), "synthetic normalized image");
      for (const key of ["../escape.jpg", "owner/../../escape.jpg", "/absolute.jpg", "owner\\escape.jpg", "owner//double.jpg"]) {
        await assert.rejects(() => storage.put(key, Buffer.from("image"), "image/jpeg"));
        await assert.rejects(() => storage.get(key));
        await assert.rejects(() => storage.delete(key));
      }
      await assert.rejects(() => storage.put("owner/large.jpg", Buffer.alloc(MAX_STORED_MEDIA_BYTES + 1), "image/jpeg"));
      await assert.rejects(() => storage.put("owner/empty.jpg", Buffer.alloc(0), "image/jpeg"));
      await assert.rejects(() => storage.put("owner/wrong.jpg", Buffer.from("<svg>"), "image/svg+xml"));
      await storage.delete("owner/2026/10/synthetic.jpg");
      assert.equal(await storage.get("owner/2026/10/synthetic.jpg"), null);
    }
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir()) + path.sep));
    await rm(root, { recursive: true, force: true });
  }
});

test("S3 adapter writes privately, reads a bounded stream, deletes the exact key and never emits public URLs", async () => {
  const commands: Array<PutObjectCommand | GetObjectCommand | DeleteObjectCommand> = [];
  const client: MediaObjectClient = { async send(command, options) {
    commands.push(command);
    assert.ok(options?.abortSignal, "provider requests are bounded");
    if (command instanceof GetObjectCommand) return { Body: Readable.from([Buffer.from("image"), Buffer.from(" bytes")]), ContentLength: 11 };
    return {};
  } };
  const storage = new S3MediaStorage(client, { bucket: "synthetic-private-media", prefix: "jobs" });
  await storage.put("owner/random-id.jpg", Buffer.from("image bytes"), "image/jpeg");
  assert.equal((await storage.get("owner/random-id.jpg"))?.toString(), "image bytes");
  await storage.delete("owner/random-id.jpg");
  assert.equal(commands.length, 3);
  for (const command of commands) {
    assert.equal(command.input.Bucket, "synthetic-private-media");
    assert.equal(command.input.Key, "jobs/owner/random-id.jpg");
  }
  const put = commands[0] as PutObjectCommand;
  assert.equal(put.input.ACL, undefined);
  assert.equal(put.input.CacheControl, "private, no-store");
  assert.equal(put.input.ContentType, "image/jpeg");
  assert.equal(put.input.ContentLength, 11);
  await assert.rejects(() => storage.get("../escape.jpg"));
  await assert.rejects(() => storage.put("owner/large.jpg", Buffer.alloc(MAX_STORED_MEDIA_BYTES + 1), "image/jpeg"));
  assert.equal(commands.length, 3, "invalid objects never reach the provider");
});

test("S3 missing keys are distinct from inaccessible buckets; oversized streams are stopped", async () => {
  for (const name of ["NoSuchKey", "NoSuchBucket", "AccessDenied", "NetworkError"]) {
    const storage = new S3MediaStorage({ async send() { throw Object.assign(new Error("synthetic provider error"), { name }); } }, { bucket: "synthetic-private-media" });
    if (name === "NoSuchKey") assert.equal(await storage.get("owner/test.jpg"), null);
    else await assert.rejects(() => storage.get("owner/test.jpg"), (err: Error) => err.name === name);
  }
  for (const hasLength of [true, false]) {
    const body = Readable.from([Buffer.alloc(MAX_STORED_MEDIA_BYTES), Buffer.alloc(1)]);
    const storage = new S3MediaStorage({ async send() { return { Body: body, ContentLength: hasLength ? MAX_STORED_MEDIA_BYTES + 1 : undefined }; } }, { bucket: "synthetic-private-media" });
    await assert.rejects(() => storage.get("owner/test.jpg"), /size limit/);
    assert.ok(body.destroyed, "oversized objects are not downloaded further");
  }
});
