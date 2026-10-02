import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { assertDocumentSafe, type CustomerDocument } from "@shared/jobos/documents";
import { PAGE_H, PAGE_W, PdfDocument, textWidth, wrapText, type PdfImage, type RGB } from "./pdfWriter";

// Lays out a CustomerDocument as a US Letter PDF. Pure layout: every number shown comes from the document model.
// Deterministic for a given document (the logo is read once and cached).

const M = 48; // margin
const W = PAGE_W - 2 * M;
const NAVY: RGB = [15, 23, 42];
const SLATE: RGB = [71, 85, 105];
const MUTED: RGB = [100, 116, 139];
const RULE: RGB = [226, 232, 240];
const BAND: RGB = [241, 245, 249];
const BLUE: RGB = [29, 78, 216];
const GREEN: RGB = [21, 128, 61];
const RED: RGB = [185, 28, 28];
const BOTTOM = PAGE_H - 64;

export function formatMoney(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
export function formatDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  return Number.isFinite(d.getTime()) ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : ymd;
}

let logoCache: Promise<PdfImage | null> | null = null;
export function loadLogo(): Promise<PdfImage | null> {
  if (!logoCache) {
    logoCache = (async () => {
      const candidates = [path.resolve(process.cwd(), "client/public/assets/logo.jpeg"), path.resolve(process.cwd(), "dist/public/assets/logo.jpeg")];
      const file = candidates.find((f) => existsSync(f));
      if (!file) return null;
      try {
        const meta = await sharp(file).metadata();
        const side = Math.min(meta.width ?? 0, meta.height ?? 0);
        if (!side) return null;
        const { data, info } = await sharp(file)
          .extract({ left: Math.floor(((meta.width ?? side) - side) / 2), top: Math.floor(((meta.height ?? side) - side) / 2), width: side, height: side })
          .resize(160, 160)
          .flatten({ background: "#ffffff" })
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        return { name: "Logo", width: info.width, height: info.height, rgb: data };
      } catch {
        return null;
      }
    })();
  }
  return logoCache;
}

export function documentFilename(doc: CustomerDocument): string {
  const kind = doc.kind === "estimate" ? "Estimate" : doc.kind === "invoice" ? "Invoice" : "Receipt";
  return `PPTVInstall-${kind}-${doc.fileNumber.replace(/[^A-Za-z0-9-]/g, "")}.pdf`;
}

export async function renderDocumentPdf(input: CustomerDocument, opts: { logo?: PdfImage | null } = {}): Promise<Buffer> {
  const doc = assertDocumentSafe(input);
  const logo = opts.logo === undefined ? await loadLogo() : opts.logo;
  const pdf = new PdfDocument();
  let page = pdf.addPage();
  let y = M;

  const newPage = () => {
    page = pdf.addPage();
    y = M;
    pdf.text(page, M, y + 10, `${doc.business.name} · ${doc.heading} ${doc.number} (continued)`, { size: 9, color: MUTED });
    y += 28;
  };
  const ensure = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  // ---- header
  const logoSize = 54;
  if (logo) pdf.image(page, logo, M, y, logoSize, logoSize);
  const nameX = logo ? M + logoSize + 12 : M;
  pdf.text(page, nameX, y + 20, doc.business.name, { font: "B", size: 16, color: NAVY });
  pdf.text(page, nameX, y + 36, `TV mounting & home installation · ${doc.business.serviceArea}`, { size: 9, color: SLATE });
  pdf.text(page, nameX, y + 49, `${doc.business.phone} · ${doc.business.email} · ${doc.business.website}`, { size: 9, color: SLATE });
  pdf.textRight(page, M + W, y + 22, doc.heading.toUpperCase(), { font: "B", size: 20, color: doc.kind === "receipt" ? GREEN : BLUE });
  pdf.textRight(page, M + W, y + 38, doc.number, { font: "B", size: 11, color: NAVY });
  const statusColor: RGB = /paid|accepted/i.test(doc.statusLabel) ? GREEN : /void|declined|expired/i.test(doc.statusLabel) ? RED : SLATE;
  pdf.textRight(page, M + W, y + 52, doc.statusLabel, { font: "B", size: 9, color: statusColor });
  y += logoSize + 18;
  pdf.line(page, M, y, M + W, y, { color: RULE, width: 1 });
  y += 18;

  // ---- parties + dates
  const colW = W / 2 - 10;
  const leftStart = y;
  pdf.text(page, M, y, doc.kind === "estimate" ? "PREPARED FOR" : "BILL TO", { font: "B", size: 8, color: MUTED });
  y += 14;
  for (const name of wrapText(doc.customer.name ?? "Customer", colW, "B", 11)) {
    pdf.text(page, M, y, name, { font: "B", size: 11, color: NAVY });
    y += 14;
  }
  for (const l of [...doc.customer.addressLines, doc.customer.phone, doc.customer.email].filter((x): x is string => Boolean(x))) {
    for (const w of wrapText(l, colW, "R", 10)) {
      pdf.text(page, M, y, w, { size: 10, color: SLATE });
      y += 13;
    }
  }
  const leftEnd = y;
  let ry = leftStart;
  const dateRows: Array<[string, string]> = [
    [doc.kind === "estimate" ? "Estimate date" : doc.kind === "invoice" ? "Invoice date" : "Invoice date", formatDate(doc.issuedDate)],
    ...(doc.expiresDate ? [["Valid until", formatDate(doc.expiresDate)] as [string, string]] : []),
    ...(doc.dueDate && doc.kind === "invoice" ? [["Due date", formatDate(doc.dueDate)] as [string, string]] : []),
    ...(doc.paidDate ? [["Paid on", formatDate(doc.paidDate)] as [string, string]] : []),
    ["Job", doc.jobTitle],
  ];
  const labelX = M + W / 2 + 10;
  for (const [label, value] of dateRows) {
    pdf.text(page, labelX, ry, label, { size: 9, color: MUTED });
    const vLines = wrapText(value, W / 2 - 100, "B", 10);
    vLines.forEach((v, i) => pdf.textRight(page, M + W, ry + i * 12, v, { font: "B", size: 10, color: NAVY }));
    ry += 12 * Math.max(1, vLines.length) + 4;
  }
  y = Math.max(leftEnd, ry) + 14;

  // ---- line items
  const cQty = M + W - 190;
  const cUnit = M + W - 100;
  const cAmt = M + W;
  const descW = cQty - M - 40;
  const header = () => {
    pdf.rect(page, M, y - 12, W, 20, { fill: BAND });
    pdf.text(page, M + 8, y + 2, "Description", { font: "B", size: 9, color: SLATE });
    pdf.textRight(page, cQty, y + 2, "Qty", { font: "B", size: 9, color: SLATE });
    pdf.textRight(page, cUnit, y + 2, "Unit price", { font: "B", size: 9, color: SLATE });
    pdf.textRight(page, cAmt - 8, y + 2, "Amount", { font: "B", size: 9, color: SLATE });
    y += 22;
  };
  ensure(60);
  header();
  for (const l of doc.lines) {
    const desc = wrapText(l.description, descW, "R", 10);
    const detail = l.detail ? wrapText(l.detail, descW, "R", 8.5) : [];
    // Baselines: description lines every 13pt, detail lines every 11pt; the rule sits 7pt under the last baseline
    // and the next row's baseline 15pt under the rule (clear of its ascenders).
    const lastBaseline = (desc.length - 1) * 13 + detail.length * 11;
    const h = lastBaseline + 7 + 15;
    if (y + h > BOTTOM) {
      newPage();
      header();
    }
    desc.forEach((d, i) => pdf.text(page, M + 8, y + i * 13, d, { size: 10, color: NAVY }));
    detail.forEach((d, i) => pdf.text(page, M + 8, y + (desc.length - 1) * 13 + (i + 1) * 11, d, { size: 8.5, color: MUTED }));
    pdf.textRight(page, cQty, y, String(l.qty), { size: 10, color: NAVY });
    pdf.textRight(page, cUnit, y, l.unitCents === null ? "—" : formatMoney(l.unitCents), { size: 10, color: NAVY });
    pdf.textRight(page, cAmt - 8, y, l.amountCents === null ? "To be confirmed" : formatMoney(l.amountCents), { font: l.amountCents === null ? "R" : "B", size: 10, color: l.amountCents === null ? MUTED : NAVY });
    pdf.line(page, M, y + lastBaseline + 7, M + W, y + lastBaseline + 7, { color: RULE, width: 0.5 });
    y += h;
  }
  y += 6;

  // ---- totals
  const rows: Array<{ label: string; value: string; strong?: boolean; color?: RGB }> = [{ label: "Subtotal", value: formatMoney(doc.subtotalCents) }];
  if (doc.discountCents > 0) rows.push({ label: "Discount", value: formatMoney(-doc.discountCents), color: GREEN });
  if (doc.taxLabel) rows.push({ label: doc.taxLabel, value: formatMoney(doc.taxCents) });
  rows.push({ label: "Total", value: formatMoney(doc.totalCents), strong: true });
  if (doc.kind === "estimate" && doc.depositCents) rows.push({ label: "Deposit to book", value: formatMoney(doc.depositCents) }, { label: "Remaining after deposit", value: formatMoney(doc.totalCents - doc.depositCents) });
  if (doc.kind !== "estimate") rows.push({ label: "Paid", value: formatMoney(-doc.paidCents), color: GREEN }, { label: doc.kind === "receipt" ? "Balance" : "Balance due", value: formatMoney(doc.balanceCents), strong: true, color: doc.balanceCents > 0 ? NAVY : GREEN });
  ensure(rows.length * 18 + 20);
  const tx = M + W - 230;
  for (const r of rows) {
    if (r.strong) {
      pdf.rect(page, tx - 8, y - 13, 238, 22, { fill: BAND });
    }
    pdf.text(page, tx, y + 2, r.label, { font: r.strong ? "B" : "R", size: r.strong ? 12 : 10, color: r.strong ? NAVY : SLATE });
    pdf.textRight(page, cAmt - 8, y + 2, r.value, { font: "B", size: r.strong ? 12 : 10, color: r.color ?? NAVY });
    y += r.strong ? 26 : 18;
  }
  if (doc.kind === "receipt") {
    const stamp = "PAID IN FULL";
    const sw = textWidth(stamp, "B", 18) + 24;
    pdf.rect(page, M, y - 54, sw, 30, { stroke: GREEN, width: 2 });
    pdf.text(page, M + 12, y - 33, stamp, { font: "B", size: 18, color: GREEN });
  }
  y += 10;

  // ---- payments
  if (doc.payments.length) {
    const paymentHeader = () => {
      pdf.text(page, M, y, "PAYMENTS RECEIVED", { font: "B", size: 9, color: MUTED });
      y += 16;
    };
    ensure(40);
    paymentHeader();
    for (const p of doc.payments) {
      const paymentLines = wrapText(`${formatDate(p.date)} · ${p.method}${p.reference ? ` · ref ${p.reference}` : ""}`, W - 110, "R", 10);
      const rowHeight = paymentLines.length * 13 + 5;
      if (y + rowHeight > BOTTOM) {
        newPage();
        paymentHeader();
      }
      paymentLines.forEach((line, i) => pdf.text(page, M, y + i * 13, line, { size: 10, color: NAVY }));
      pdf.textRight(page, cAmt - 8, y, formatMoney(p.amountCents), { font: "B", size: 10, color: NAVY });
      y += rowHeight;
    }
    ensure(20);
    pdf.text(page, M, y, "Payments are recorded by Picture Perfect TV Install as received; this is not a card processor statement.", { size: 8, color: MUTED });
    y += 20;
  }

  // ---- text sections
  const section = (title: string, items: string[], bullet = true) => {
    if (!items.length) return;
    ensure(14 + Math.min(wrapText(items[0]!, W - 14, "R", 9.5).length * 12 + 4, 28));
    pdf.text(page, M, y, title.toUpperCase(), { font: "B", size: 9, color: MUTED });
    y += 14;
    for (const item of items) {
      const lines = wrapText(item, W - 14, "R", 9.5);
      // Split even a single long note across pages; one block can exceed a whole page.
      ensure(Math.min(lines.length * 12 + 4, 28));
      lines.forEach((l, i) => {
        ensure(12);
        if (i === 0 && bullet) pdf.text(page, M, y, "•", { size: 9.5, color: SLATE });
        pdf.text(page, M + (bullet ? 12 : 0), y, l, { size: 9.5, color: NAVY });
        y += 12;
      });
      y += 3;
    }
    y += 8;
  };
  section("Notes", doc.notes, false);
  section("To confirm before work begins", doc.confirmations);
  section("This price assumes", doc.assumptions);
  section("Conditions and exclusions", doc.exclusions);
  section("Scheduling", doc.schedulingNotes);
  if (doc.acceptance) {
    section("Acceptance", [doc.acceptance.accepted ? `Accepted${doc.acceptance.acceptedDate ? ` on ${formatDate(doc.acceptance.acceptedDate)}` : ""} (version ${doc.acceptance.version}).` : `Not yet accepted (version ${doc.acceptance.version}). Accept from your quote link or reply to our message.`], false);
  }
  section("Terms", doc.terms);

  // ---- footer on every page
  for (let i = 0; i < pdf.pageCount; i++) {
    pdf.line(i, M, PAGE_H - 44, M + W, PAGE_H - 44, { color: RULE, width: 0.75 });
    pdf.text(i, M, PAGE_H - 30, `${doc.business.name} · ${doc.business.phone} · ${doc.business.website}`, { size: 8, color: MUTED });
    pdf.textRight(i, M + W, PAGE_H - 30, `${doc.number} · Page ${i + 1} of ${pdf.pageCount}`, { size: 8, color: MUTED });
  }

  return pdf.build({ title: `${doc.heading} ${doc.number}`, author: doc.business.name, subject: doc.jobTitle, createdAt: `${doc.paidDate ?? doc.issuedDate}T12:00:00Z` });
}
