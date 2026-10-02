import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import sharp from "sharp";
import { DbJobOsStore } from "../../server/jobos/dbStore";
import { MemoryJobOsStore } from "../../server/jobos/memoryStore";
import { ConflictError, JobOsService } from "../../server/jobos/service";
import type { JobOsStore } from "../../server/jobos/store";
import { MemoryMediaStorage } from "../../server/jobos/media/storage";
import { MAX_UPLOAD_BYTES, MediaValidationError, normalizeImage, sniffImageType } from "../../server/jobos/media/images";
import { MockVisionProvider, createVisionProvider, type VisionImage } from "../../server/jobos/vision";
import { NotFoundError } from "../../server/jobos/store";
import { DEFAULT_ECONOMICS_CONFIG, priceScope } from "../../shared/pricing";
import { createTestDb } from "./pg";

// Private media + unified intake on the in-memory store AND real Postgres (PGlite). Vision is always mocked here.

async function photo(color: string, w = 1200, h = 800, exif = false): Promise<Buffer> {
  let img = sharp({ create: { width: w, height: h, channels: 3, background: color } }).jpeg();
  if (exif) img = img.withExif({ IFD0: { Copyright: "Customer Name 404-555-0100", Artist: "GPS 33.7490,-84.3880" } });
  return img.toBuffer();
}

let pg: Awaited<ReturnType<typeof createTestDb>>;
before(async () => {
  pg = await createTestDb();
});
after(async () => {
  await pg.client.close();
});

test("upload validation: magic bytes decide the type; HEIC, SVG, HTML, PDF, scripts and empty files are refused", async () => {
  assert.equal(sniffImageType(await photo("#123456")), "image/jpeg");
  assert.equal(sniffImageType(await sharp({ create: { width: 4, height: 4, channels: 3, background: "#fff" } }).png().toBuffer()), "image/png");
  const bad: Array<[string, Buffer, string]> = [
    ["svg", Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'), "UNSUPPORTED_TYPE"],
    ["html", Buffer.from("<html><body>hi</body></html>"), "UNSUPPORTED_TYPE"],
    ["pdf", Buffer.from("%PDF-1.7\n1 0 obj"), "UNSUPPORTED_TYPE"],
    ["exe", Buffer.from("MZ\x90\x00\x03\x00\x00\x00", "latin1"), "UNSUPPORTED_TYPE"],
    ["heic", Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from("ftypheic"), Buffer.alloc(16)]), "HEIC_NOT_SUPPORTED"],
    ["empty", Buffer.alloc(0), "EMPTY"],
    ["truncated jpeg", Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10]), "UNDECODABLE"],
  ];
  for (const [name, buf, code] of bad) {
    await assert.rejects(() => normalizeImage(buf), (e: unknown) => e instanceof MediaValidationError && e.code === code, name);
  }
  const huge = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(MAX_UPLOAD_BYTES)]);
  await assert.rejects(() => normalizeImage(huge), (e: unknown) => e instanceof MediaValidationError && e.code === "TOO_LARGE", "size is checked before decoding");
});

test("normalization strips EXIF/GPS, auto-sizes, and makes a thumbnail", async () => {
  const input = await photo("#336699", 4000, 3000, true);
  assert.ok((await sharp(input).metadata()).exif, "fixture really has EXIF");
  const out = await normalizeImage(input);
  const meta = await sharp(out.data).metadata();
  assert.equal(meta.format, "jpeg");
  assert.equal(meta.exif, undefined, "no EXIF (location, names, serials) is kept");
  assert.ok(Math.max(meta.width!, meta.height!) <= 2048);
  assert.ok(Math.max((await sharp(out.thumb).metadata()).width!, 0) <= 480);
  assert.match(out.sha256, /^[a-f0-9]{64}$/);
  assert.ok(!out.data.includes(Buffer.from("404-555-0100")));
});

test("vision provider choice: mock never runs in production; missing provider means skipped, not broken", () => {
  assert.ok(createVisionProvider({ env: { VISION_PROVIDER: "mock", APP_ENV: "staging" } }) instanceof MockVisionProvider);
  assert.equal(createVisionProvider({ env: { VISION_PROVIDER: "mock", APP_ENV: "production" } }), null);
  assert.equal(createVisionProvider({ env: { VISION_PROVIDER: "mock", NODE_ENV: "production" } }), null);
  assert.equal(createVisionProvider({ env: {} }), null);
});

const impls: Array<[string, () => JobOsStore]> = [
  ["memory", () => new MemoryJobOsStore()],
  ["postgres", () => new DbJobOsStore(pg.db as never)],
];

// A scripted provider: returns whatever the test says for the images it receives.
const scripted = (fn: (images: VisionImage[]) => unknown) => new MockVisionProvider(fn);
const tvObs = (id: string, tvs: unknown[], kind = "room_photo", extra: Record<string, unknown> = {}) => ({ imageId: id, kind, summary: "test image", tvs, items: [], ...extra });

for (const [name, makeStore] of impls) {
  const t = (title: string, fn: () => Promise<void>) =>
    test(`[${name}] ${title}`, async () => {
      if (name === "postgres") {
        await pg.client.exec(
          "TRUNCATE pricing_configs, pricing_config_events, jobs, scope_items, quotes, quote_versions, travel_estimates, material_estimates, invoice_counters, invoices, payments, job_actuals, ai_intake_cache, pricing_shadow_samples, job_media, intake_sessions RESTART IDENTITY",
        );
      }
      await fn();
    });
  const fresh = (vision: MockVisionProvider | null = null) => {
    const media = new MemoryMediaStorage();
    return { svc: new JobOsService(makeStore(), { media, vision }), media };
  };

  t("multiple images in one intake: stored privately, deduped, limited, deletable", async () => {
    const { svc, media } = fresh();
    const a = await svc.uploadMedia({ data: await photo("#111111"), hint: "photo", source: "owner" });
    const b = await svc.uploadMedia({ intakeId: a.intakeId, data: await photo("#222222"), hint: "screenshot", source: "owner" });
    const dup = await svc.uploadMedia({ intakeId: a.intakeId, data: await photo("#111111"), hint: "photo", source: "owner" });
    assert.equal(dup.media.id, a.media.id, "the same image twice is stored once");
    assert.equal((await svc.listMediaFor({ intakeId: a.intakeId })).length, 2);
    assert.equal(media.size(), 4, "full + thumbnail for each image");
    assert.ok(!("storageKey" in a.media), "storage keys never leave the server");
    const bytes = await svc.getMediaBytes(b.media.id, "thumb");
    assert.equal(sniffImageType(bytes), "image/jpeg");
    await svc.deleteMedia(b.media.id);
    await assert.rejects(() => svc.getMediaBytes(b.media.id, "full"), NotFoundError);
    assert.equal(media.size(), 2);

    // Customer intakes are capped lower, and owner/customer intakes cannot be mixed.
    // Distinct images (sizes differ, so the content hashes differ).
    const c = await svc.uploadMedia({ data: await photo("#808080", 300, 200), source: "customer" });
    for (let i = 2; i <= 6; i++) await svc.uploadMedia({ intakeId: c.intakeId, data: await photo("#808080", 300 + i * 10, 200), source: "customer" });
    const seventh = await photo("#808080", 400, 210);
    await assert.rejects(() => svc.uploadMedia({ intakeId: c.intakeId, data: seventh, source: "customer" }), (e: unknown) => e instanceof ConflictError && e.code === "TOO_MANY_IMAGES");
    await assert.rejects(() => svc.uploadMedia({ intakeId: c.intakeId, data: seventh, source: "owner" }), NotFoundError);
  });

  t("text + screenshots + photos become one proposal; review applies only confirmed facts; job gets the images", async () => {
    const vision = scripted((images) => ({
      images: [
        { ...tvObs(images[0]!.id, [], "conversation_screenshot"), text: "Need 2 TVs mounted. One is a 75 inch above the brick fireplace. I think I need two outlets." },
        tvObs(images[1]!.id, [{ ref: "fp", location: { value: "fireplace", confidence: 0.95 }, wall: { value: "brick", confidence: 0.9 }, outletLocation: { value: "none_visible", confidence: 0.5 } }]),
        tvObs(images[2]!.id, [{ ref: "fp", modelNumber: { value: "QN75Q80C", confidence: 0.95 } }], "tv_label"),
      ],
      notes: [],
    }));
    const { svc } = fresh(vision);
    const s = await svc.uploadMedia({ data: await photo("#aa0000"), hint: "screenshot", source: "owner" });
    await svc.uploadMedia({ intakeId: s.intakeId, data: await photo("#00aa00"), hint: "photo", source: "owner" });
    await svc.uploadMedia({ intakeId: s.intakeId, data: await photo("#0000aa"), hint: "label", source: "owner" });
    const res = await svc.analyzeIntake({ intakeId: s.intakeId, message: "", allowAi: true, source: "owner" });
    assert.equal(res.vision.available, true);
    assert.ok(res.images.every((i) => i.analysisStatus === "analyzed"));
    const p = res.proposal;
    assert.equal(p.tvs.length, 2, "two TVs from the screenshot text");
    const fp = p.tvs.find((tv) => tv.facts.location?.value === "fireplace")!;
    assert.equal(fp.facts.inches!.value, 75);
    assert.equal(fp.facts.wall!.value, "brick");
    assert.equal(fp.origin, "both");
    assert.ok(p.questions.length > 0);

    // Nothing confirmed yet: estimate only.
    const pending = await svc.reviewIntake(s.intakeId, {});
    assert.notEqual(priceScope(pending.scope, { oneWayMiles: 8, oneWayDriveMinutes: 20 }, DEFAULT_ECONOMICS_CONFIG).status, "priced");
    // The owner confirms; the engine prices the confirmed scope.
    const all = Object.fromEntries(p.questions.filter((q) => q.factKey).map((q) => [q.factKey!, "accept" as const]));
    const confirmed = await svc.reviewIntake(s.intakeId, { decisions: all, overrides: { "tvs.1.inches": 55, "tvs.1.wall": "drywall", "tvs.0.mountSource": "customer", "tvs.1.mountSource": "customer", "tvs.1.power": "existing" } });
    assert.ok(confirmed.applied.length > 3);
    const job = await svc.createJob({ title: "From photos (synthetic)", scope: confirmed.scope, context: { oneWayMiles: 8, oneWayDriveMinutes: 20 }, intakeId: s.intakeId });
    const detail = await svc.jobDetail(job.id);
    assert.equal(detail.media.length, 3, "the intake's images are attached to the job");
    const quote = await svc.createQuoteVersion(job.id, {});
    assert.ok(quote.version.customerAmountCents >= 10_000);
  });

  t("vision failures never break intake: provider error, malformed output, prices in output, or no provider", async () => {
    for (const vision of [
      scripted(() => {
        throw new Error("boom");
      }),
      new MockVisionProvider(() => "not json"),
      scripted((images) => ({ images: [tvObs(images[0]!.id, [{ ref: "a", sizeInches: { value: 65, confidence: 0.9 }, priceCents: 9_900 }])], notes: [] })),
      null,
    ]) {
      const { svc } = fresh(vision);
      const up = await svc.uploadMedia({ data: await photo("#abcdef"), source: "owner" });
      const res = await svc.analyzeIntake({ intakeId: up.intakeId, message: "Mount my 65 inch TV on drywall", allowAi: true, source: "owner" });
      assert.equal(res.proposal.tvs.length, 1, "the text still produces the TV");
      assert.equal(res.proposal.tvs[0]!.facts.inches!.value, 65);
      assert.ok(["failed", "skipped"].includes(res.images[0]!.analysisStatus));
      if (vision) assert.ok(res.vision.error, "the owner is told photo analysis did not work");
    }
  });

  t("low-confidence and conflicting photo facts stay questions until confirmed; safety conditions are never set from photos", async () => {
    const vision = scripted((images) => ({
      images: [
        tvObs(images[0]!.id, [{ ref: "a", sizeInches: { value: 70, confidence: 0.4 }, wall: { value: "stone", confidence: 0.45 } }]),
        tvObs(images[1]!.id, [{ ref: "a", sizeInches: { value: 55, confidence: 0.9 } }], "tv_packaging"),
        { imageId: images[2]!.id, kind: "ceiling", summary: "ceiling light", tvs: [], items: [{ ref: "fan", category: "ceiling_fan", fixturePresent: { value: true, confidence: 0.9 }, fanRatedBoxVisible: { value: true, confidence: 0.95 } }] },
      ],
      notes: [],
    }));
    const { svc } = fresh(vision);
    const up = await svc.uploadMedia({ data: await photo("#101010"), source: "owner" });
    await svc.uploadMedia({ intakeId: up.intakeId, data: await photo("#202020"), source: "owner", hint: "label" });
    await svc.uploadMedia({ intakeId: up.intakeId, data: await photo("#303030"), source: "owner" });
    const { proposal } = await svc.analyzeIntake({ intakeId: up.intakeId, allowAi: true, source: "owner" });
    const tv = proposal.tvs[0]!;
    assert.equal(tv.facts.inches!.value, 55, "packaging beats a room estimate");
    assert.ok(tv.facts.inches!.alternatives?.some((a) => a.value === 70));
    assert.ok(proposal.conflicts.length > 0);
    const r = await svc.reviewIntake(up.intakeId, {});
    const t0 = (r.scope.tvs as Array<Record<string, unknown>>)[0]!;
    assert.equal(t0.wall, "unknown", "a 45% stone guess is not applied");
    const fan = (r.scope.items as Array<{ category: string; conditions?: Record<string, string> }>).find((i) => i.category === "ceiling_fan")!;
    assert.equal(fan.conditions?.fan_rated_box, undefined);
    assert.equal(fan.conditions?.existing_fixture, undefined, "even the visible fixture waits for a person");
  });
}
