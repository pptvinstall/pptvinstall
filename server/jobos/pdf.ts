import type { CustomerDocumentModel } from "@shared/jobos/documents";

type Draw = { text: string; x: number; y: number; size: number; bold?: boolean };

const PAGE_W = 612;
const PAGE_H = 792;
const LEFT = 52;
const RIGHT = 560;

function ascii(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x20-\x7E]/g, " ");
}

function esc(input: string): string {
  return ascii(input).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function money(cents: number | null): string {
  if (cents === null) return "To be confirmed";
  const sign = cents < 0 ? "-" : "";
  return `${sign}$${(Math.abs(cents) / 100).toFixed(2)}`;
}

function dateText(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return iso.slice(0, 10);
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "America/New_York" }).format(d);
}

function wrap(text: string, max = 78): string[] {
  const words = ascii(text).replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  if (!words.length) return [""];
  const out: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line) line = word;
    else if ((line + " " + word).length <= max) line += " " + word;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

function pdfObject(n: number, body: string): string {
  return `${n} 0 obj\n${body}\nendobj\n`;
}

export function renderCustomerDocumentPdf(doc: CustomerDocumentModel): Buffer {
  const pages: Array<{ draws: Draw[]; rules: Array<{ y: number }> }> = [];
  let page = { draws: [] as Draw[], rules: [] as Array<{ y: number }> };
  let y = 744;

  const pushPage = () => {
    pages.push(page);
    page = { draws: [], rules: [] };
    y = 744;
  };
  const need = (height: number) => {
    if (y - height < 62) pushPage();
  };
  const text = (value: string, x = LEFT, size = 10, bold = false) => {
    page.draws.push({ text: value, x, y, size, bold });
  };
  const wrapped = (value: string, opts: { x?: number; size?: number; bold?: boolean; max?: number; gap?: number } = {}) => {
    const lines = wrap(value, opts.max ?? 78);
    need(lines.length * (opts.gap ?? 14) + 4);
    for (const line of lines) {
      page.draws.push({ text: line, x: opts.x ?? LEFT, y, size: opts.size ?? 10, bold: opts.bold });
      y -= opts.gap ?? 14;
    }
  };
  const rule = () => {
    page.rules.push({ y });
    y -= 14;
  };
  const rightText = (value: string, size = 10, bold = false) => {
    const width = ascii(value).length * size * 0.52;
    page.draws.push({ text: value, x: Math.max(LEFT + 260, RIGHT - width), y, size, bold });
  };

  // Header.
  text(doc.businessName, LEFT, 18, true);
  page.draws.push({ text: doc.title, x: 430, y: 744, size: 16, bold: true });
  y -= 22;
  text("Professional TV mounting & home installation - Metro Atlanta", LEFT, 9);
  y -= 18;
  rule();

  text(doc.documentNumber, LEFT, 11, true);
  rightText(dateText(doc.createdAt), 10);
  y -= 18;
  text(`Status: ${doc.status.replace(/_/g, " ")}`, LEFT, 9);
  y -= 22;

  if (doc.customerLabel) {
    text("Customer", LEFT, 9, true);
    y -= 14;
    wrapped(doc.customerLabel, { size: 11, max: 52 });
  }
  text("Job", LEFT, 9, true);
  y -= 14;
  wrapped(doc.jobTitle, { size: 11, max: 64 });
  if (doc.serviceZip) {
    text(`Service ZIP: ${doc.serviceZip}`, LEFT, 9);
    y -= 18;
  }
  y -= 4;
  rule();

  text("Description", LEFT, 10, true);
  page.draws.push({ text: "Amount", x: 490, y, size: 10, bold: true });
  y -= 18;

  for (const line of doc.lines) {
    need(42);
    const label = line.qty && line.qty !== 1 ? `${line.qty} x ${line.description}` : line.description;
    const pieces = wrap(label, 58);
    for (let i = 0; i < pieces.length; i++) {
      page.draws.push({ text: pieces[i]!, x: LEFT, y, size: 10, bold: i === 0 });
      if (i === 0) rightText(money(line.amountCents), 10, true);
      y -= 13;
    }
    if (line.detail) {
      for (const detail of wrap(line.detail, 62)) {
        page.draws.push({ text: detail, x: LEFT + 12, y, size: 8 });
        y -= 11;
      }
    }
    if (line.qty && line.unitCents !== undefined && line.qty > 1) {
      page.draws.push({ text: `${money(line.unitCents)} each`, x: LEFT + 12, y, size: 8 });
      y -= 11;
    }
    y -= 5;
  }

  rule();
  const totalRow = (label: string, cents: number, bold = false) => {
    need(18);
    text(label, 350, 10, bold);
    rightText(money(cents), 10, bold);
    y -= 16;
  };
  totalRow("Subtotal", doc.subtotalCents);
  if (doc.discountCents > 0) totalRow("Discount", -doc.discountCents);
  if (doc.taxCents > 0) totalRow("Tax", doc.taxCents);
  totalRow("Total", doc.totalCents, true);
  if (doc.kind !== "estimate") {
    totalRow("Paid", -doc.paidCents);
    totalRow("Balance", doc.balanceCents, true);
  }

  if (doc.payments.length) {
    y -= 8;
    need(32);
    text("Payments", LEFT, 11, true);
    y -= 16;
    for (const p of doc.payments) {
      need(18);
      const method = p.method.replace(/_/g, " ");
      text(`${dateText(p.receivedAt)} - ${method}`, LEFT, 9);
      rightText(money(p.amountCents), 9, true);
      y -= 14;
      if (p.tipCents > 0) {
        text(`Tip: ${money(p.tipCents)}`, LEFT + 12, 8);
        y -= 12;
      }
    }
  }

  if (doc.notes.length) {
    y -= 10;
    need(28);
    text("Notes", LEFT, 11, true);
    y -= 16;
    for (const note of doc.notes) {
      wrapped(`- ${note}`, { x: LEFT, size: 8.5, max: 88, gap: 12 });
      y -= 2;
    }
  }

  y -= 12;
  wrapped("Thank you for choosing Picture Perfect TV Install.", { size: 9, bold: true, max: 80 });
  text("Generated by PPTVInstall Job OS", LEFT, 7);
  if (!pages.includes(page)) pages.push(page);

  const objects = new Map<number, string>();
  const fontNormal = 3;
  const fontBold = 4;
  objects.set(fontNormal, pdfObject(fontNormal, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
  objects.set(fontBold, pdfObject(fontBold, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));

  const kids: string[] = [];
  pages.forEach((p, index) => {
    const pageObj = 5 + index * 2;
    const contentObj = pageObj + 1;
    kids.push(`${pageObj} 0 R`);
    const commands: string[] = [];
    for (const r of p.rules) commands.push(`0.75 w 0.82 G ${LEFT} ${r.y} m ${RIGHT} ${r.y} l S`);
    for (const d of p.draws) commands.push(`BT /${d.bold ? "F2" : "F1"} ${d.size} Tf ${d.x} ${d.y} Td (${esc(d.text)}) Tj ET`);
    const stream = commands.join("\n") + "\n";
    objects.set(
      contentObj,
      pdfObject(contentObj, `<< /Length ${Buffer.byteLength(stream, "ascii")} >>\nstream\n${stream}endstream`),
    );
    objects.set(
      pageObj,
      pdfObject(
        pageObj,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontNormal} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentObj} 0 R >>`,
      ),
    );
  });

  objects.set(2, pdfObject(2, `<< /Type /Pages /Kids [${kids.join(" ")}] /Count ${pages.length} >>`));
  objects.set(1, pdfObject(1, "<< /Type /Catalog /Pages 2 0 R >>"));

  const maxObj = Math.max(...objects.keys());
  let body = "%PDF-1.4\n%PPTV\n";
  const offsets = new Array<number>(maxObj + 1).fill(0);
  for (let i = 1; i <= maxObj; i++) {
    const obj = objects.get(i);
    if (!obj) continue;
    offsets[i] = Buffer.byteLength(body, "ascii");
    body += obj;
  }
  const xref = Buffer.byteLength(body, "ascii");
  body += `xref\n0 ${maxObj + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= maxObj; i++) body += `${String(offsets[i] || 0).padStart(10, "0")} 00000 n \n`;
  body += `trailer\n<< /Size ${maxObj + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(body, "ascii");
}
