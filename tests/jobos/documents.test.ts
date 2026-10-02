import assert from "node:assert/strict";
import test from "node:test";

import { buildEstimateDocument, buildInvoiceDocument } from "../../shared/jobos";
import { findInternalKeys } from "../../shared/pricing/customerView";
import { renderCustomerDocumentPdf } from "../../server/jobos/pdf";

const job = {
  id: "11111111-1111-4111-8111-111111111111",
  title: "Living room TV install",
  customerLabel: "Sample Customer",
  zip: "30309",
} as never;

test("estimate document uses only customer-safe quote data and renders a valid PDF", () => {
  const quote = { id: "22222222-2222-4222-8222-222222222222", status: "sent" } as never;
  const version = {
    version: 2,
    createdAt: "2026-10-02T12:00:00.000Z",
    customerView: {
      version: 2,
      lines: [
        { label: '65" TV mounting', detail: "Drywall", amountCents: 10000 },
        { label: "Outlet behind TV", amountCents: 10000 },
      ],
      subtotalCents: 20000,
      totalCents: 20000,
      notes: ["Final placement will be confirmed on site."],
      requiresReview: false,
      createdAt: "2026-10-02T12:00:00.000Z",
    },
  } as never;
  const doc = buildEstimateDocument({ job, quote, version });
  assert.deepEqual(findInternalKeys(doc), []);
  assert.equal(doc.totalCents, 20000);
  const pdf = renderCustomerDocumentPdf(doc);
  assert.equal(pdf.subarray(0, 8).toString("ascii"), "%PDF-1.4");
  const text = pdf.toString("ascii");
  assert.match(text, /Picture Perfect TV Install/);
  assert.match(text, /Outlet behind TV/);
  for (const secret of ["floor", "margin", "helper", "cost to serve", "recommended"]) assert.ok(!text.toLowerCase().includes(secret));
});

test("invoice and paid receipt documents use recorded invoice/payment facts only", () => {
  const invoice = {
    invoiceNumber: "INV-2026-0042",
    status: "paid",
    lines: [{ description: "TV mounting", qty: 2, unitCents: 10000 }],
    subtotalCents: 20000,
    discountCents: 0,
    taxCents: 0,
    totalCents: 20000,
    paidCents: 20000,
    taxConfigSnapshot: { enabled: false, rateBps: 0, label: "" },
    createdAt: "2026-10-02T12:00:00.000Z",
  } as never;
  const payments = [{ amountCents: 20000, method: "zelle", tipCents: 0, receivedAt: "2026-10-02T14:00:00.000Z" }] as never;
  const inv = buildInvoiceDocument({ job, invoice, payments });
  const rec = buildInvoiceDocument({ job, invoice, payments, receipt: true });
  assert.equal(inv.kind, "invoice");
  assert.equal(rec.kind, "receipt");
  assert.equal(rec.balanceCents, 0);
  assert.deepEqual(findInternalKeys(inv), []);
  assert.deepEqual(findInternalKeys(rec), []);
  assert.match(renderCustomerDocumentPdf(rec).toString("ascii"), /Paid Receipt/);
});
