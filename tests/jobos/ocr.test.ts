import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import sharp from "sharp";
import { LocalOcrProvider, ocrObservation, type OcrProvider } from "../../server/jobos/ocr";
import { MemoryJobOsStore } from "../../server/jobos/memoryStore";
import { DbJobOsStore } from "../../server/jobos/dbStore";
import { JobOsService, ConflictError } from "../../server/jobos/service";
import { MemoryMediaStorage, DisabledMediaStorage, type MediaStorage } from "../../server/jobos/media/storage";
import { MockVisionProvider } from "../../server/jobos/vision";
import { createTestDb } from "./pg";

const photo = (n: number) => sharp({ create: { width: 200 + n, height: 120, channels: 3, background: "#fff" } }).jpeg().toBuffer();
test("local OCR reads synthetic printed text using bundled data without a paid provider", async () => {
  const image = await sharp(Buffer.from('<svg width="1000" height="250"><rect width="100%" height="100%" fill="white"/><text x="30" y="100" font-family="Arial" font-size="60" fill="black">Mount my 65 inch TV</text><text x="30" y="180" font-family="Arial" font-size="60" fill="black">on drywall</text></svg>')).png().toBuffer();
  const result = await new LocalOcrProvider().read(image);
  assert.match(result.text, /65 inch TV/i);
  assert.ok(result.confidence > 0.65);
});
test("OCR labels use deterministic model or printed size, low confidence remains unusable", () => {
  assert.equal(ocrObservation("id", "label", { text: "QN65Q80C", confidence: 0.3 }), null);
  const a = ocrObservation("abcdef-1", "label", { text: "SCREEN SIZE 65 IN", confidence: 0.98 })!;
  assert.equal(a.tvs[0].sizeInches?.value, 65);
  const b = ocrObservation("abcdef-2", "label", { text: "Model QN75Q80C", confidence: 0.98 })!;
  assert.equal(b.tvs[0].modelNumber?.value, "QN75Q80C");
  assert.notEqual(a.tvs[0].ref, b.tvs[0].ref);
});

let pg: Awaited<ReturnType<typeof createTestDb>>;
before(async () => { pg = await createTestDb(); });
after(async () => { await pg.client.close(); });
for (const mode of ["memory", "postgres"] as const) {
  const store = () => mode === "memory" ? new MemoryJobOsStore() : new DbJobOsStore(pg.db);
  test(`[${mode}] OCR first, content cache across intakes, whole-scope confirmation and no price arithmetic`, async () => {
    let reads = 0;
    const ocr: OcrProvider = { name: "tesseract", model: "test", enabled: () => true, read: async () => { reads++; return { text: "Mount my 65 inch TV on drywall. I have the mount.", confidence: 0.96 }; } };
    const vision = new MockVisionProvider(() => { throw new Error("Paid vision must not run"); });
    const svc = new JobOsService(store(), { media: new MemoryMediaStorage(), ocr, vision });
    const bytes = await photo(1);
    const up = await svc.uploadMedia({ data: bytes, source: "owner", hint: "screenshot" });
    const a = await svc.analyzeIntake({ intakeId: up.intakeId, allowAi: true, source: "owner" });
    assert.equal(a.metrics.visionCalls, 0);
    assert.equal(a.metrics.estimatedCostUsd, 0);
    assert.equal(a.proposal.requiresOcrConfirmation, true);
    assert.ok(a.proposal.tvs[0].facts.inches?.requiresConfirmation);
    await assert.rejects(() => svc.reviewIntake(up.intakeId, {}), (e: unknown) => e instanceof ConflictError && e.code === "OCR_REVIEW_REQUIRED");
    await assert.rejects(() => svc.createJob({ title: "Synthetic", intakeId: up.intakeId }), (e: unknown) => e instanceof ConflictError && e.code === "OCR_REVIEW_REQUIRED");
    await svc.reviewIntake(up.intakeId, { confirmExtractedText: true });
    assert.ok((await svc.createJob({ title: "Synthetic OCR", source: "synthetic", intakeId: up.intakeId })).id);
    const again = await svc.analyzeIntake({ intakeId: up.intakeId, allowAi: true, source: "owner" });
    assert.equal(again.metrics.cachedImages, 1);
    const other = await svc.uploadMedia({ data: bytes, source: "owner", hint: "screenshot" });
    const cached = await svc.analyzeIntake({ intakeId: other.intakeId, allowAi: true, source: "owner" });
    assert.equal(reads, 1);
    assert.equal(cached.metrics.cachedImages, 1);
    const receipt = await svc.uploadMedia({ data: await photo(2), source: "owner", hint: "receipt" });
    const ref = await svc.analyzeIntake({ intakeId: receipt.intakeId, allowAi: false, source: "owner" });
    assert.ok(ref.proposal.extractedText);
    assert.equal(ref.proposal.tvs.length, 0, "receipt text does not become TV pricing scope");
  });
  test(`[${mode}] one paid vision batch, persistent failure budget and hash cache across intakes`, async () => {
    let calls = 0;
    const vision = new MockVisionProvider((images) => {
      calls++;
      assert.ok(images.length <= 8);
      return { images: images.map((m) => ({ imageId: m.id, kind: "room_photo", summary: "Room", tvs: [], items: [] })), notes: [] };
    });
    const st = store();
    const media = new MemoryMediaStorage();
    const svc = new JobOsService(st, { media, vision });
    const up = await svc.uploadMedia({ data: await photo(100), source: "owner" });
    for (let n = 101; n < 109; n++) await svc.uploadMedia({ intakeId: up.intakeId, data: await photo(n), source: "owner" });
    const a = await svc.analyzeIntake({ intakeId: up.intakeId, allowAi: true, source: "owner" });
    assert.equal(a.metrics.visionCalls, 1);
    await svc.analyzeIntake({ intakeId: up.intakeId, allowAi: true, source: "owner" });
    assert.equal(calls, 1);
    const other = await svc.uploadMedia({ data: await photo(100), source: "owner" });
    const cache = await svc.analyzeIntake({ intakeId: other.intakeId, allowAi: true, source: "owner" });
    assert.equal(calls, 1);
    assert.equal(cache.metrics.cachedImages, 1);
    assert.equal(cache.metrics.visionCalls, 0);
    const failure = new MockVisionProvider(() => { calls++; throw new Error("outage"); });
    const failSvc = new JobOsService(st, { media, vision: failure });
    const f = await failSvc.uploadMedia({ data: await photo(200), source: "owner" });
    await failSvc.analyzeIntake({ intakeId: f.intakeId, allowAi: true, source: "owner" });
    const restarted = new JobOsService(st, { media, vision: failure });
    const b = await restarted.analyzeIntake({ intakeId: f.intakeId, allowAi: true, source: "owner" });
    assert.equal(calls, 2);
    assert.equal(b.metrics.totalVisionCalls, 1);
  });

  test(`[${mode}] OCR confirmation expires after relabeling, adding or deleting an image and after a new proposal`, async () => {
    const st = store();
    const ocr: OcrProvider = { name: "tesseract", model: "freshness-test", enabled: () => true, read: async () => ({ text: "Mount my 75 inch TV on drywall. I have the mount.", confidence: 0.96 }) };
    const svc = new JobOsService(st, { media: new MemoryMediaStorage(), ocr });
    const up = await svc.uploadMedia({ data: await photo(500), source: "owner", hint: "screenshot" });
    const analyze = () => svc.analyzeIntake({ intakeId: up.intakeId, allowAi: false, source: "owner" });
    const create = () => svc.createJob({ title: "Synthetic OCR freshness", source: "synthetic", intakeId: up.intakeId });
    const requiresReview = (err: unknown) => err instanceof ConflictError && err.code === "OCR_REVIEW_REQUIRED";

    await analyze();
    await svc.reviewIntake(up.intakeId, { confirmExtractedText: true });
    assert.equal((await st.getIntakeSession(up.intakeId))?.status, "reviewed");
    await svc.setMediaHint(up.media.id, "label");
    assert.equal((await st.getIntakeSession(up.intakeId))?.review, null);
    await assert.rejects(create, requiresReview, "old confirmation cannot authorize relabeled evidence");
    await analyze();
    await assert.rejects(() => svc.reviewIntake(up.intakeId, {}), requiresReview);
    await svc.reviewIntake(up.intakeId, { confirmExtractedText: true });

    const second = await svc.uploadMedia({ intakeId: up.intakeId, data: await photo(501), source: "owner", hint: "screenshot" });
    await assert.rejects(create, requiresReview, "old confirmation cannot authorize an expanded image set");
    await analyze();
    await assert.rejects(() => svc.reviewIntake(up.intakeId, {}), requiresReview);
    await svc.reviewIntake(up.intakeId, { confirmExtractedText: true });

    await svc.deleteMedia(second.media.id);
    await assert.rejects(create, requiresReview, "deleted evidence invalidates its previous confirmation");
    await analyze();
    await svc.reviewIntake(up.intakeId, { confirmExtractedText: true });
    await analyze();
    await assert.rejects(create, requiresReview, "a new proposal must be reviewed even when analysis is cached");
    await svc.reviewIntake(up.intakeId, { confirmExtractedText: true });
    assert.ok((await create()).id, "confirmed current proposal can still create a job");
  });

  test(`[${mode}] unreadable historical photos preserve text/manual proposal and do not spend a vision call`, async () => {
    const st = store();
    const initial = new JobOsService(st, { media: new MemoryMediaStorage() });
    let calls = 0;
    const vision = new MockVisionProvider(() => { calls++; throw new Error("Unreadable photos must never reach paid vision"); });
    const failed: MediaStorage = { kind: "s3", enabled: true, durable: true, reason: null, put: async () => undefined, get: async () => { throw new Error("Synthetic object provider outage"); }, delete: async () => undefined };
    for (const [n, media] of [[510, new DisabledMediaStorage("Not configured")], [511, new MemoryMediaStorage()], [512, failed]] as const) {
      const up = await initial.uploadMedia({ data: await photo(n), source: "owner", hint: "photo" });
      const restarted = new JobOsService(st, { media, vision });
      const result = await restarted.analyzeIntake({ intakeId: up.intakeId, message: "Mount my 65 inch TV on drywall. I have the mount.", allowAi: true, source: "owner" });
      assert.equal(result.proposal.tvs.length, 1);
      assert.equal(result.metrics.visionCalls, 0);
      assert.equal(result.metrics.totalVisionCalls, 0);
      assert.equal(result.metrics.textCalls, 0);
      assert.equal(result.images[0].analysisStatus, "skipped");
      assert.match(result.vision.error ?? "", /storage/);
      const reviewed = await restarted.reviewIntake(up.intakeId, {});
      assert.ok((await restarted.createJob({ title: "Synthetic manual after storage loss", source: "synthetic", intakeId: up.intakeId, scope: reviewed.scope })).id);
    }
    assert.equal(calls, 0);
  });
}
test("paid reading off and disabled storage preserve manual intake", async () => {
  const st = new MemoryJobOsStore();
  const vision = new MockVisionProvider(() => { throw new Error("Must stay off"); });
  const svc = new JobOsService(st, { media: new MemoryMediaStorage(), vision });
  const up = await svc.uploadMedia({ data: await photo(400), source: "owner" });
  const a = await svc.analyzeIntake({ intakeId: up.intakeId, message: "Mount my 65 inch TV", allowAi: false, source: "owner" });
  assert.equal(a.metrics.visionCalls, 0);
  assert.equal(a.proposal.tvs.length, 1);
  const off = new JobOsService(st, { media: new DisabledMediaStorage("Not configured") });
  const count = (await st.listIntakeSessions(100)).length;
  await assert.rejects(async () => off.uploadMedia({ data: await photo(401), source: "owner" }), ConflictError);
  assert.equal((await st.listIntakeSessions(100)).length, count);
  assert.equal((await off.analyzeIntake({ message: "Mount my 55 inch TV", allowAi: false, source: "owner" })).proposal.tvs.length, 1);
});
