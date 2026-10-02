import assert from "node:assert/strict";
import test, { after, before } from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DbJobOsStore } from "../../server/jobos/dbStore";
import { MemoryJobOsStore } from "../../server/jobos/memoryStore";
import { JobOsService } from "../../server/jobos/service";
import { NotFoundError, type JobOsStore } from "../../server/jobos/store";
import { documentFilename, formatMoney, renderDocumentPdf } from "../../server/jobos/pdf/renderDocument";
import { extractPdfText, wrapText } from "../../server/jobos/pdf/pdfWriter";
import { DEFAULT_ECONOMICS_CONFIG, InternalDataLeakError, findInternalKeys } from "../../shared/pricing";
import { DocumentNotAvailableError, assertDocumentSafe, type CustomerDocument } from "../../shared/jobos/documents";
import { createTestDb } from "./pg";

// Customer documents (estimate, invoice, paid receipt) are built from canonical records and rendered
// to PDF on the server. These tests run on the in-memory store AND real Postgres (PGlite), check the
// fields a customer expects, and check that no internal economics can reach a document.

let pg: Awaited<ReturnType<typeof createTestDb>>;
before(async () => {
  pg = await createTestDb();
});
after(async () => {
  await pg.client.close();
});

const NOW = new Date("2026-10-02T15:00:00Z");
const nearby = { oneWayMiles: 8, oneWayDriveMinutes: 20 };
const scope = {
  tvs: [
    { id: "tv-1", sizeBand: "56+", inches: 75, wall: "brick", location: "fireplace", mountSource: "pptv", mountType: "full_motion", wire: "visible", power: "outlet" },
    { id: "tv-2", sizeBand: "32-55", wall: "drywall", location: "standard", mountSource: "customer", wire: "visible", power: "existing" },
  ],
};
const contact = { name: "Jordan Example", phone: "404-555-0100", email: "jordan@example.com", street: "123 Peachtree St NE", city: "Atlanta", state: "GA", zip: "30303" };

/** Words and numbers that must never appear in a customer document. */
const INTERNAL_WORDS = /margin|floor|cost to serve|overhead|helper|recommended|risk|calibrat|labor value|\/hr|per hour|owner/i;

const pdfText = (pdf: Buffer) => extractPdfText(pdf).join("\n");

const impls: Array<[string, () => JobOsStore]> = [
  ["memory", () => new MemoryJobOsStore()],
  ["postgres", () => new DbJobOsStore(pg.db as never)],
];

for (const [name, makeStore] of impls) {
  const t = (title: string, fn: () => Promise<void>) =>
    test(`[${name}] ${title}`, async () => {
      if (name === "postgres") {
        await pg.client.exec(
          "TRUNCATE pricing_configs, pricing_config_events, jobs, scope_items, quotes, quote_versions, travel_estimates, material_estimates, invoice_counters, invoices, payments, job_actuals, ai_intake_cache, pricing_shadow_samples, job_media, intake_sessions, document_counters RESTART IDENTITY",
        );
      }
      await fn();
    });
  const fresh = (opts: ConstructorParameters<typeof JobOsService>[1] = {}) => new JobOsService(makeStore(), { now: () => NOW, ...opts });
  const quoted = async (svc: JobOsService, withContact = true) => {
    const job = await svc.createJob({ title: "Living room TVs (synthetic)", zip: "30303", scope, context: nearby });
    if (withContact) await svc.setJobContact(job.id, contact);
    const { quote, version } = await svc.createQuoteVersion(job.id, {});
    return { job, quote, version };
  };

  t("estimate: number, dates, customer, lines and total come from the canonical quote version", async () => {
    const svc = fresh();
    const { quote, version } = await quoted(svc);
    const doc = await svc.estimateDocument(quote.id);
    assert.equal(doc.kind, "estimate");
    assert.equal(doc.heading, "Estimate");
    assert.equal(doc.number, "EST-1001");
    assert.equal(doc.issuedDate, "2026-10-02");
    assert.equal(doc.expiresDate, "2026-11-01", "valid for the configured 30 days");
    assert.equal(doc.customer.name, "Jordan Example");
    assert.deepEqual(doc.customer.addressLines, ["123 Peachtree St NE", "Atlanta, GA 30303"]);
    assert.equal(doc.customer.phone, "404-555-0100");
    assert.equal(doc.totalCents, version.customerAmountCents, "estimate total is the quoted price, not recomputed");
    assert.equal(
      doc.lines.reduce((s, l) => s + (l.amountCents ?? 0), 0) - doc.discountCents,
      doc.totalCents,
    );
    assert.equal(doc.taxLabel, null, "tax is off unless the owner enabled it");
    assert.equal(doc.acceptance?.accepted, false);
    assert.ok(doc.terms.length > 0);
    assert.deepEqual(findInternalKeys(doc), []);

    // Numbers are assigned once per quote and stay stable.
    assert.equal((await svc.estimateDocument(quote.id)).number, "EST-1001");
    const second = await quoted(svc);
    assert.equal((await svc.estimateDocument(second.quote.id)).number, "EST-1002");
    assert.equal((await svc.estimateDocument(quote.id)).number, "EST-1001");
    await assert.rejects(() => svc.estimateDocument(quote.id, { version: 9 }), NotFoundError);
  });

  t("estimate: accepted version, discount line and a named version", async () => {
    const svc = fresh();
    const { job, quote } = await quoted(svc);
    const v2 = await svc.createQuoteVersion(job.id, { adjustment: { type: "discount", discountCents: 2_000, reason: "bundle" } });
    await svc.markQuoteSent(quote.id);
    await svc.acceptCustomerQuote(quote.shareToken);
    const doc = await svc.estimateDocument(quote.id);
    assert.equal(doc.acceptance?.accepted, true);
    assert.equal(doc.acceptance?.version, 2);
    assert.equal(doc.acceptance?.acceptedDate, "2026-10-02");
    assert.equal(doc.statusLabel, "Accepted");
    assert.equal(doc.totalCents, v2.version.customerAmountCents);
    assert.equal(doc.discountCents, 2_000);
    const v1 = await svc.estimateDocument(quote.id, { version: 1 });
    assert.equal(v1.acceptance?.accepted, false, "an older version is not the accepted one");
    assert.equal(v1.discountCents, 0);
  });

  t("customer share link: drafts are unavailable; sent estimates carry no phone or email", async () => {
    const svc = fresh();
    const { quote } = await quoted(svc);
    await assert.rejects(() => svc.customerEstimateDocument(quote.shareToken), NotFoundError);
    await svc.markQuoteSent(quote.id);
    const doc = await svc.customerEstimateDocument(quote.shareToken);
    assert.equal(doc.customer.name, "Jordan Example");
    assert.equal(doc.customer.phone, undefined);
    assert.equal(doc.customer.email, undefined);
    const text = pdfText(await renderDocumentPdf(doc, { logo: null }));
    assert.ok(!text.includes("404-555-0100") && !text.includes("jordan@example.com"));
    await assert.rejects(() => svc.customerEstimateDocument("00000000-0000-4000-8000-000000000000"), NotFoundError);
  });

  t("booking details are canonical for the customer block when a booking is linked", async () => {
    const svc = fresh({
      lookupBookingContact: async (id) => (id === 77 ? { name: "Booked Customer", phone: "770-555-0199", street: "9 Oak Ln", city: "Decatur", state: "GA", zip: "30030" } : null),
    });
    const job = await svc.createJob({ title: "Booked job (synthetic)", bookingId: 77, scope, context: nearby });
    await svc.setJobContact(job.id, contact);
    const { quote } = await svc.createQuoteVersion(job.id, {});
    const doc = await svc.estimateDocument(quote.id);
    assert.equal(doc.customer.name, "Booked Customer");
    assert.deepEqual(doc.customer.addressLines, ["9 Oak Ln", "Decatur, GA 30030"]);
  });

  t("invoice: due date, notes and payments; paid receipt only once fully paid", async () => {
    const svc = fresh();
    const { job } = await quoted(svc);
    const invoice = await svc.createInvoice(job.id, { notes: "Thank you!" });
    assert.equal(invoice.dueDate, "2026-10-09", "defaults to the configured 7 days");
    assert.equal(invoice.notes, "Thank you!");
    const custom = await svc.createInvoice(job.id, { dueDate: "2026-10-31", lines: [{ description: "Extra bracket", qty: 2, unitCents: 1_500 }] });
    assert.equal(custom.dueDate, "2026-10-31");
    assert.equal(custom.notes, null);

    const doc = await svc.invoiceDocument(invoice.id);
    assert.equal(doc.heading, "Invoice");
    assert.match(doc.number, /^INV-2026-\d{4}$/);
    assert.equal(doc.dueDate, "2026-10-09");
    assert.deepEqual(doc.notes, ["Thank you!"]);
    assert.equal(doc.totalCents, invoice.totalCents);
    assert.equal(doc.balanceCents, invoice.totalCents);
    assert.equal(doc.customer.email, "jordan@example.com");

    await assert.rejects(() => svc.receiptDocument(invoice.id), DocumentNotAvailableError);
    await svc.sendInvoice(invoice.id);
    await svc.recordPayment(invoice.id, { amountCents: 5_000, method: "zelle", reference: "ZL-1", receivedAt: "2026-10-03T22:00:00Z" });
    const partial = await svc.invoiceDocument(invoice.id);
    assert.equal(partial.statusLabel, "Partially paid");
    assert.equal(partial.paidCents, 5_000);
    assert.equal(partial.balanceCents, invoice.totalCents - 5_000);
    assert.deepEqual(partial.payments, [{ date: "2026-10-03", method: "Zelle", amountCents: 5_000, reference: "ZL-1" }]);
    await assert.rejects(() => svc.receiptDocument(invoice.id), DocumentNotAvailableError);

    await svc.recordPayment(invoice.id, { amountCents: invoice.totalCents - 5_000, method: "cash", receivedAt: "2026-10-04T01:00:00Z" });
    const receipt = await svc.receiptDocument(invoice.id);
    assert.equal(receipt.heading, "Paid Receipt");
    assert.equal(receipt.balanceCents, 0);
    assert.equal(receipt.paidCents, invoice.totalCents);
    assert.equal(receipt.paidDate, "2026-10-03", "last payment date in Atlanta time");
    assert.equal(documentFilename(receipt), `PPTVInstall-Receipt-${receipt.fileNumber}.pdf`);
    await assert.rejects(() => svc.invoiceDocument("00000000-0000-4000-8000-000000000000"), NotFoundError);
  });

  t("a job with no contact still produces documents (customer label as the name)", async () => {
    const svc = fresh();
    const job = await svc.createJob({ title: "No contact (synthetic)", customerLabel: "Sam", scope, context: nearby });
    const { quote } = await svc.createQuoteVersion(job.id, {});
    const doc = await svc.estimateDocument(quote.id);
    assert.equal(doc.customer.name, "Sam");
    assert.deepEqual(doc.customer.addressLines, []);
    const pdf = await renderDocumentPdf(doc, { logo: null });
    assert.ok(pdf.subarray(0, 8).toString("latin1").startsWith("%PDF-1."));
  });

  t("tax appears only when the owner enabled it", async () => {
    const svc = fresh();
    const cfg = JSON.parse(JSON.stringify(DEFAULT_ECONOMICS_CONFIG));
    cfg.business.tax = { enabled: true, rateBps: 890, label: "Sales tax" };
    await svc.updateConfig({ config: cfg, reason: "enable tax for test" }, "owner");
    const { quote, version } = await quoted(svc);
    const doc = await svc.estimateDocument(quote.id);
    assert.equal(doc.taxLabel, "Sales tax");
    assert.ok(doc.taxCents > 0);
    assert.equal(doc.totalCents, version.customerAmountCents + doc.taxCents);
  });
}

test("PDFs: expected customer fields, file names, US Letter, deterministic, valid structure", async () => {
  const svc = new JobOsService(new MemoryJobOsStore(), { now: () => NOW });
  const job = await svc.createJob({ title: "Living room TVs (synthetic)", scope, context: nearby });
  await svc.setJobContact(job.id, contact);
  const { quote, version } = await svc.createQuoteVersion(job.id, {});
  const est = await svc.estimateDocument(quote.id);
  const pdf = await renderDocumentPdf(est);
  assert.equal(pdf.subarray(0, 8).toString("latin1"), "%PDF-1.4");
  assert.ok(pdf.toString("latin1").includes("/MediaBox [0 0 612 792]"), "US Letter");
  assert.equal(documentFilename(est), "PPTVInstall-Estimate-1001.pdf");
  const text = pdfText(pdf);
  for (const expected of ["Estimate", "EST-1001", "Picture Perfect TV Install", "404-702-4748", "Jordan Example", "123 Peachtree St NE", "Atlanta, GA 30303", "Living room TVs (synthetic)", "Oct 2, 2026", "Nov 1, 2026", "Total", formatMoney(version.customerAmountCents), "Terms"]) {
    assert.ok(text.toLowerCase().includes(expected.toLowerCase()), `estimate PDF shows ${expected}`);
  }
  assert.ok(!INTERNAL_WORDS.test(text), `no internal economics wording: ${text.match(INTERNAL_WORDS)?.[0]}`);
  for (const n of [version.floorCents, version.recommendedCents]) {
    if (n !== version.customerAmountCents && n > 0) assert.ok(!text.includes(formatMoney(n)), `internal amount ${formatMoney(n)} not printed`);
  }
  assert.deepEqual(await renderDocumentPdf(est), pdf, "same document → byte-identical PDF");

  const invoice = await svc.createInvoice(job.id, { notes: "Thank you!" });
  await svc.recordPayment(invoice.id, { amountCents: invoice.totalCents, method: "zelle", receivedAt: "2026-10-03T22:00:00Z" });
  const invPdf = await renderDocumentPdf(await svc.invoiceDocument(invoice.id));
  const invText = pdfText(invPdf);
  for (const expected of ["Invoice", invoice.invoiceNumber, "Bill to", "Due date", "Oct 9, 2026", "Thank you!", "Payments received", "Zelle"]) {
    assert.ok(invText.toLowerCase().includes(expected.toLowerCase()), `invoice PDF shows ${expected}`);
  }
  assert.ok(!INTERNAL_WORDS.test(invText));
  const rcText = pdfText(await renderDocumentPdf(await svc.receiptDocument(invoice.id)));
  for (const expected of ["PAID RECEIPT", "PAID IN FULL", invoice.invoiceNumber, "$0.00"]) assert.ok(rcText.includes(expected), `receipt shows ${expected}`);

  // Structural check with qpdf when it is installed locally (CI may not have it).
  let qpdf = false;
  try {
    execFileSync("qpdf", ["--version"], { stdio: "ignore" });
    qpdf = true;
  } catch {
    /* not installed */
  }
  if (qpdf) {
    const dir = mkdtempSync(join(tmpdir(), "pptv-pdf-"));
    for (const [n, b] of [["e.pdf", pdf], ["i.pdf", invPdf]] as const) {
      writeFileSync(join(dir, n), b);
      execFileSync("qpdf", ["--check", join(dir, n)], { stdio: "pipe" });
    }
  }
});

test("long content paginates and every page has a footer", async () => {
  const svc = new JobOsService(new MemoryJobOsStore(), { now: () => NOW });
  const job = await svc.createJob({ title: "Big job (synthetic)", scope, context: nearby });
  const { quote } = await svc.createQuoteVersion(job.id, {});
  const base = await svc.estimateDocument(quote.id);
  const many: CustomerDocument = {
    ...base,
    lines: Array.from({ length: 60 }, (_, i) => ({ description: `Line item number ${i + 1} with a reasonably long description that wraps across the column`, qty: 1, unitCents: 1_000, amountCents: 1_000 })),
  };
  const pdf = await renderDocumentPdf(many, { logo: null });
  const pages = (pdf.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length;
  assert.ok(pages >= 3, `expected several pages, got ${pages}`);
  const text = pdfText(pdf);
  assert.ok(text.includes(`Page ${pages} of ${pages}`));
  assert.ok(text.includes("Line item number 60"));
});

test("text helpers: wrapping keeps words and handles non-ASCII safely", () => {
  const lines = wrapText("Mount the 75” TV — over the fireplace — and hide the cords", 120, "R", 10);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(" "), "Mount the 75” TV — over the fireplace — and hide the cords");
  assert.equal(formatMoney(123_456), "$1,234.56");
  assert.equal(formatMoney(-500), "-$5.00");
});

test("assertDocumentSafe blocks internal keys and internal economics wording", async () => {
  const svc = new JobOsService(new MemoryJobOsStore(), { now: () => NOW });
  const job = await svc.createJob({ title: "Safety (synthetic)", scope, context: nearby });
  const { quote } = await svc.createQuoteVersion(job.id, {});
  const doc = await svc.estimateDocument(quote.id);
  assert.doesNotThrow(() => assertDocumentSafe(doc));
  assert.throws(() => assertDocumentSafe({ ...doc, floorCents: 1 } as unknown as CustomerDocument), InternalDataLeakError);
  assert.throws(() => assertDocumentSafe({ ...doc, assumptions: ["Includes a 30% margin"] }), InternalDataLeakError);
  assert.throws(() => assertDocumentSafe({ ...doc, lines: [{ description: "Helper pay", qty: 1, unitCents: 100, amountCents: 100 }] }), InternalDataLeakError);
  assert.throws(() => assertDocumentSafe({ ...doc, notes: ["Owner rate $100/hr"] }), InternalDataLeakError);
  // Ordinary customer words are fine.
  assert.doesNotThrow(() => assertDocumentSafe({ ...doc, assumptions: ["TV is mounted on the first floor"] }));
});
