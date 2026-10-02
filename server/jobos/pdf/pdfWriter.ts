import { deflateSync, inflateSync } from "node:zlib";

// Minimal, deterministic PDF 1.4 writer for business documents (estimates, invoices, receipts).
// No dependency and no browser: text in the standard Helvetica fonts (WinAnsi), lines, rectangles and RGB images.
// Same input -> byte-identical output (no clock; the creation date comes from the document).
// Coordinates are in points from the TOP-LEFT of a US Letter page (612 x 792).

export const PAGE_W = 612;
export const PAGE_H = 792;

export type FontKey = "R" | "B";
export type RGB = [number, number, number];

// Standard Helvetica / Helvetica-Bold advance widths (1/1000 em) for WinAnsi 32..126.
// prettier-ignore
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
// prettier-ignore
const HELV_B = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
// WinAnsi codes above 127 that documents use, with [regular, bold] widths.
const EXTRA: Record<string, { code: number; w: [number, number] }> = {
  "’": { code: 0x92, w: [222, 278] },
  "‘": { code: 0x91, w: [222, 278] },
  "“": { code: 0x93, w: [333, 500] },
  "”": { code: 0x94, w: [333, 500] },
  "•": { code: 0x95, w: [350, 350] },
  "–": { code: 0x96, w: [556, 556] },
  "—": { code: 0x97, w: [1000, 1000] },
  "×": { code: 0xd7, w: [584, 584] },
  "©": { code: 0xa9, w: [737, 737] },
  "°": { code: 0xb0, w: [400, 400] },
  "é": { code: 0xe9, w: [556, 556] },
  "ñ": { code: 0xf1, w: [556, 611] },
};
const REPLACE: Record<string, string> = { "″": '"', "′": "'", "…": "...", " ": " ", "→": "->", "✓": "" };

/** Map a JS string to WinAnsi codes; anything the standard fonts cannot show becomes "?". */
export function toWinAnsi(text: string): number[] {
  const out: number[] = [];
  for (const raw of Array.from(text)) {
    const ch = REPLACE[raw] ?? raw;
    for (const c of Array.from(ch)) {
      const code = c.codePointAt(0)!;
      if (code >= 32 && code <= 126) out.push(code);
      else if (EXTRA[c]) out.push(EXTRA[c]!.code);
      else if (code === 9) out.push(32);
      else if (code >= 0xa0 && code <= 0xff) out.push(code);
      else if (code >= 32) out.push(63);
    }
  }
  return out;
}

export function textWidth(text: string, font: FontKey, size: number): number {
  const table = font === "B" ? HELV_B : HELV;
  let w = 0;
  for (const code of toWinAnsi(text)) {
    if (code >= 32 && code <= 126) w += table[code - 32]!;
    else {
      const extra = Object.values(EXTRA).find((e) => e.code === code);
      w += extra ? extra.w[font === "B" ? 1 : 0] : 556;
    }
  }
  return (w / 1000) * size;
}

/** Greedy word wrap; words longer than the line are split. */
export function wrapText(text: string, maxWidth: number, font: FontKey, size: number): string[] {
  const lines: string[] = [];
  for (const para of text.split(/\n/)) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, font, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      let rest = word;
      while (textWidth(rest, font, size) > maxWidth) {
        let cut = rest.length - 1;
        while (cut > 1 && textWidth(rest.slice(0, cut), font, size) > maxWidth) cut--;
        lines.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      line = rest;
    }
    lines.push(line);
  }
  return lines;
}

function pdfString(text: string): string {
  let s = "(";
  for (const code of toWinAnsi(text)) {
    if (code === 0x28 || code === 0x29 || code === 0x5c) s += `\\${String.fromCharCode(code)}`;
    else if (code < 32 || code > 126) s += `\\${code.toString(8).padStart(3, "0")}`;
    else s += String.fromCharCode(code);
  }
  return `${s})`;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();
const color = (c: RGB) => c.map((v) => num(v / 255)).join(" ");

export interface PdfImage {
  name: string;
  width: number;
  height: number;
  /** Raw 8-bit RGB pixels, row-major. */
  rgb: Buffer;
}

export class PdfDocument {
  private pages: string[][] = [];
  private images = new Map<string, PdfImage>();

  addPage(): number {
    this.pages.push([]);
    return this.pages.length - 1;
  }
  get pageCount() {
    return this.pages.length;
  }
  private ops(page: number) {
    const p = this.pages[page];
    if (!p) throw new Error("no such page");
    return p;
  }

  text(page: number, x: number, y: number, text: string, opts: { font?: FontKey; size?: number; color?: RGB } = {}) {
    const size = opts.size ?? 10;
    // y is the text baseline measured from the top of the page.
    this.ops(page).push(`BT /${opts.font === "B" ? "F2" : "F1"} ${num(size)} Tf ${color(opts.color ?? [17, 24, 39])} rg ${num(x)} ${num(PAGE_H - y)} Td ${pdfString(text)} Tj ET`);
  }
  textRight(page: number, xRight: number, y: number, text: string, opts: { font?: FontKey; size?: number; color?: RGB } = {}) {
    this.text(page, xRight - textWidth(text, opts.font ?? "R", opts.size ?? 10), y, text, opts);
  }
  line(page: number, x1: number, y1: number, x2: number, y2: number, opts: { color?: RGB; width?: number } = {}) {
    this.ops(page).push(`${color(opts.color ?? [203, 213, 225])} RG ${num(opts.width ?? 0.75)} w ${num(x1)} ${num(PAGE_H - y1)} m ${num(x2)} ${num(PAGE_H - y2)} l S`);
  }
  rect(page: number, x: number, y: number, w: number, h: number, opts: { fill?: RGB; stroke?: RGB; width?: number } = {}) {
    const box = `${num(x)} ${num(PAGE_H - y - h)} ${num(w)} ${num(h)} re`;
    if (opts.fill && opts.stroke) this.ops(page).push(`${color(opts.fill)} rg ${color(opts.stroke)} RG ${num(opts.width ?? 0.75)} w ${box} B`);
    else if (opts.fill) this.ops(page).push(`${color(opts.fill)} rg ${box} f`);
    else this.ops(page).push(`${color(opts.stroke ?? [203, 213, 225])} RG ${num(opts.width ?? 0.75)} w ${box} S`);
  }
  image(page: number, img: PdfImage, x: number, y: number, w: number, h: number) {
    this.images.set(img.name, img);
    this.ops(page).push(`q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(PAGE_H - y - h)} cm /${img.name} Do Q`);
  }

  /** Serialize. `createdAt` (ISO) and `title` go in the document info; nothing depends on the clock. */
  build(meta: { title: string; author: string; subject?: string; createdAt: string }): Buffer {
    const objects: Array<string | Buffer> = [];
    const add = (body: string | Buffer) => {
      objects.push(body);
      return objects.length;
    };
    const catalog = add("");
    const pagesObj = add("");
    const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const imageRefs: string[] = [];
    for (const img of Array.from(this.images.values())) {
      const data = deflateSync(img.rgb, { level: 9 });
      const id = add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode /Length ${data.length} >>\nstream\n`, "latin1"), data, Buffer.from("\nendstream", "latin1")]));
      imageRefs.push(`/${img.name} ${id} 0 R`);
    }
    const resources = `<< /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${imageRefs.length ? ` /XObject << ${imageRefs.join(" ")} >>` : ""} >>`;
    const kids: number[] = [];
    for (const ops of this.pages) {
      const content = deflateSync(Buffer.from(ops.join("\n"), "latin1"), { level: 9 });
      const contentId = add(Buffer.concat([Buffer.from(`<< /Length ${content.length} /Filter /FlateDecode >>\nstream\n`, "latin1"), content, Buffer.from("\nendstream", "latin1")]));
      kids.push(add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources ${resources} /Contents ${contentId} 0 R >>`));
    }
    objects[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
    objects[pagesObj - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
    const d = new Date(meta.createdAt);
    const pad = (n: number) => String(n).padStart(2, "0");
    const pdfDate = Number.isFinite(d.getTime()) ? `D:${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z` : "D:20260101000000Z";
    const info = add(`<< /Title ${pdfString(meta.title)} /Author ${pdfString(meta.author)}${meta.subject ? ` /Subject ${pdfString(meta.subject)}` : ""} /Producer (PPTVInstall Job OS) /CreationDate (${pdfDate}) >>`);

    const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
    let offset = chunks[0]!.length;
    const offsets: number[] = [];
    objects.forEach((body, i) => {
      offsets.push(offset);
      const head = Buffer.from(`${i + 1} 0 obj\n`, "latin1");
      const payload = typeof body === "string" ? Buffer.from(body, "latin1") : body;
      const tail = Buffer.from("\nendobj\n", "latin1");
      chunks.push(head, payload, tail);
      offset += head.length + payload.length + tail.length;
    });
    const xref = [`xref\n0 ${objects.length + 1}\n`, "0000000000 65535 f \n", ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
    chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${offset}\n%%EOF\n`, "latin1"));
    return Buffer.concat(chunks);
  }
}

/** Test/inspection helper: every text string drawn in a PDF this writer produced, in drawing order. */
export function extractPdfText(pdf: Buffer): string[] {
  const out: string[] = [];
  const src = pdf.toString("latin1");
  const re = /<< \/Length (\d+) \/Filter \/FlateDecode >>\nstream\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    const body = inflateSync(pdf.subarray(start, start + Number(m[1]))).toString("latin1");
    const strings = body.match(/\((?:\\.|[^\\)])*\) Tj/g) ?? [];
    for (const s of strings) {
      const inner = s.slice(1, -4);
      out.push(inner.replace(/\\([0-7]{3}|.)/g, (_x, g: string) => (g.length === 3 ? decodeWinAnsi(parseInt(g, 8)) : g)));
    }
  }
  return out;
}

function decodeWinAnsi(code: number): string {
  const extra = Object.entries(EXTRA).find(([, e]) => e.code === code);
  return extra ? extra[0] : String.fromCharCode(code);
}
