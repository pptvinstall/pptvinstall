import { z } from "zod";
import { RELOCATIONS, RISK_FLAGS, SURFACES, WORK_ACTIONS, HARDWARE_SUPPLIERS, ASSEMBLY_STATES, ATTACHMENTS, type WorkAction, type WorkItemInput } from "../pricing/work";
import type { WorkConfig } from "../pricing/workConfig";

// Intake for the universal work model. AI (or the offline parser) proposes CANDIDATE work
// items from messy language: action, item/category, quantity and only the attributes the
// customer actually stated. Hard rules, enforced in code rather than hoped for:
//   - no prices anywhere (strict schema; price-like keys are rejected)
//   - "protected" facts (dimensions, weight, wall/surface, attachment, hardware supplier,
//     assembly state, structural risk) are NEVER accepted unless the customer stated them,
//     with evidence found in the message. Inferred values for them are dropped.
//   - the owner confirms every candidate before it becomes real scope.

export const WORK_FIELD_STATUS = ["known", "inferred", "unknown", "needs_confirmation"] as const;
export type WorkFieldStatus = (typeof WORK_FIELD_STATUS)[number];

function field<T extends z.ZodTypeAny>(value: T) {
  return z
    .object({
      value: value.nullable(),
      status: z.enum(WORK_FIELD_STATUS),
      /** Verbatim snippet from the customer's message supporting the value. */
      evidence: z.string().max(300).optional(),
      confidence: z.number().min(0).max(1).optional(),
    })
    .strict();
}

export const workItemIntakeSchema = z
  .object({
    action: field(z.enum(WORK_ACTIONS)),
    thenAction: field(z.enum(WORK_ACTIONS)),
    /** Taxonomy slug. Unrecognised things are "custom" (never rejected). */
    category: field(z.string().regex(/^[a-z0-9_]{1,40}$/)),
    name: field(z.string().max(120)),
    quantity: field(z.number().int().min(1).max(50)),
    weightLb: field(z.number().min(0.01).max(5_000)),
    widthIn: field(z.number().min(0.1).max(400)),
    heightIn: field(z.number().min(0.1).max(400)),
    depthIn: field(z.number().min(0.1).max(400)),
    surface: field(z.enum(SURFACES)),
    attachment: field(z.enum(ATTACHMENTS)),
    hardwareSuppliedBy: field(z.enum(HARDWARE_SUPPLIERS)),
    assemblyState: field(z.enum(ASSEMBLY_STATES)),
    relocation: field(z.enum(RELOCATIONS)),
    /** 0 = first address; 1 = the second address (e.g. "at the new place"). */
    site: field(z.number().int().min(0).max(4)),
    stairs: field(z.boolean()),
    haulAway: field(z.boolean()),
    tvInches: field(z.number().int().min(19).max(120)),
    tvLocation: field(z.enum(["standard", "fireplace", "high_wall"])),
    reviewFlags: z.array(z.enum(RISK_FLAGS)).max(14).default([]),
    /** Questions the owner should ask about THIS item. */
    questions: z.array(z.string().max(200)).max(8).default([]),
    /** Overall confidence in the interpretation of this item. */
    confidence: z.number().min(0).max(1).default(0.5),
    customerDescription: z.string().max(300).optional(),
  })
  .strict();

export type WorkItemIntake = z.infer<typeof workItemIntakeSchema>;

const PROTECTED = ["weightLb", "widthIn", "heightIn", "depthIn", "surface", "attachment", "hardwareSuppliedBy", "assemblyState"] as const;
const NUMERIC_PROTECTED = ["weightLb", "widthIn", "heightIn", "depthIn"] as const;

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9"' .]+/g, " ").replace(/\s+/g, " ").trim();

/**
 * Hallucination guard for work items.
 *  - known fields need evidence that appears in the source message, else they drop to inferred
 *  - protected fields that are not known are DISCARDED (value null, status unknown)
 *  - a known number (weight/dimension) must literally appear in the evidence
 *  - structural/regulated review flags are kept (they only make quoting more cautious)
 */
export function sanitizeWorkItems(items: WorkItemIntake[], sourceText: string): { items: WorkItemIntake[]; downgraded: string[] } {
  const haystack = norm(sourceText);
  const downgraded: string[] = [];
  const out: WorkItemIntake[] = JSON.parse(JSON.stringify(items));
  out.forEach((item, i) => {
    for (const [key, f] of Object.entries(item) as Array<[string, unknown]>) {
      if (!f || typeof f !== "object" || !("status" in (f as object))) continue;
      const fv = f as { value: unknown; status: WorkFieldStatus; evidence?: string };
      if (fv.status === "known") {
        const ev = fv.evidence ? norm(fv.evidence) : "";
        if (!ev || !haystack.includes(ev)) {
          fv.status = "inferred";
          downgraded.push(`items[${i}].${key}`);
        }
      }
      if (fv.status === "unknown") fv.value = null;
    }
    for (const key of NUMERIC_PROTECTED) {
      const fv = item[key];
      if (fv.status === "known" && fv.value !== null) {
        const digits = String(fv.value).replace(/\.0+$/, "");
        const ev = fv.evidence ?? "";
        if (!ev.includes(digits)) {
          item[key] = { value: null, status: "unknown" };
          downgraded.push(`items[${i}].${key} (number not in evidence)`);
        }
      }
    }
    for (const key of PROTECTED) {
      const fv = item[key] as { value: unknown; status: WorkFieldStatus };
      if (fv.status !== "known" && fv.value !== null) {
        (item as Record<string, unknown>)[key] = { value: null, status: "unknown" };
        downgraded.push(`items[${i}].${key} (not stated by customer)`);
      }
    }
  });
  return { items: out, downgraded };
}

// ------------------------------------------------------------------------------------------
// Offline parser: deterministic, keyword and verb based. Marks a field KNOWN only when the
// words are literally in the message. Used when AI is off, unconfigured, or in staging.

const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12 };

interface VerbMatch {
  index: number;
  end: number;
  action: WorkAction;
  evidence: string;
  participle: boolean;
  /** The verb match already contains its noun (e.g. "put the bed back together"). */
  selfContained: boolean;
}

const VERBS: Array<{ re: RegExp; action: WorkAction; participle?: boolean; selfContained?: boolean }> = [
  { re: /\bput (?:the |a |an |my |this |that )?[a-z ]{0,30}?back together\b/g, action: "reassemble", selfContained: true },
  { re: /\bre-?assembl\w*\b/g, action: "reassemble" },
  { re: /\b(?:re-?mount(?:ed|ing)?|put (?:it |them )?back up|hang (?:it |them )?back up)\b/g, action: "remount" },
  { re: /\b(?:take|taking|took) (?:it |them |this |that )?apart\b|\bdisassembl\w*\b|\bdismantl\w*\b|\bbreak(?:ing)? down\b/g, action: "disassemble" },
  { re: /\b(?:take|taking) down\b|\bun-?mount\w*\b|\bdismount\w*\b/g, action: "unmount" },
  { re: /\b(?:remov(?:e|ed|ing|al of)|get rid of)\b/g, action: "remove", participle: false },
  { re: /\b(?:relocat\w+|move)\b(?= (?:the|a|an|my|this|that|one|two|three|four|five|six|\d))/g, action: "relocate" },
  { re: /\b(?:assembl(?:e|ed|ing)|put(?:ting)? together|build)\b/g, action: "assemble", participle: undefined },
  { re: /\b(?:mount(?:ed|ing)?|hang(?:ing)?|hung|put up)\b/g, action: "mount" },
  { re: /\binstall(?:ed|ing|ation)?\b/g, action: "install" },
  { re: /\b(?:add(?:ed|ing)?|swap(?:ped|ping)?(?: out)?|replac(?:e|ed|ing))\b(?= (?:a|an|the|my|this|that|one|two|three|four|five|six|new|\d))/g, action: "install" },
];

function findVerbs(t: string): VerbMatch[] {
  const all: VerbMatch[] = [];
  for (const v of VERBS) {
    for (const m of Array.from(t.matchAll(v.re))) {
      const text = m[0];
      // "I have a mount" names hardware, not another request to mount something.
      if (text === "mount" && /\b(?:a|an|the|my|your|our|their|his|her|this|that)\s+(?:tv\s+)?$/.test(t.slice(0, m.index))) continue;
      all.push({
        index: m.index ?? 0,
        end: (m.index ?? 0) + text.length,
        action: v.action,
        evidence: text,
        participle: /(?:ed|ung)$/.test(text) && v.action !== "relocate",
        selfContained: !!v.selfContained,
      });
    }
  }
  all.sort((a, b) => a.index - b.index || b.end - a.end);
  const picked: VerbMatch[] = [];
  for (const v of all) {
    const last = picked[picked.length - 1];
    if (last && v.index < last.end) continue;
    picked.push(v);
  }
  return picked;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface NounHit {
  index: number;
  end: number;
  category: string;
  keyword: string;
  base: string;
  qty: number | null;
  qtyEvidence?: string;
  qtyInferred: boolean;
}

function buildMatchers(W: WorkConfig) {
  const list: Array<{ kw: string; category: string }> = [];
  for (const [slug, cat] of Object.entries(W.categories)) for (const kw of cat.keywords) list.push({ kw: kw.toLowerCase(), category: slug });
  list.sort((a, b) => b.kw.length - a.kw.length);
  return list.map((e) => ({ ...e, re: new RegExp(`\\b${esc(e.kw)}(?:s|es)?\\b`, "g") }));
}

function nounsIn(region: string, offset: number, matchers: ReturnType<typeof buildMatchers>, claimed: Array<[number, number]>): NounHit[] {
  const hits: NounHit[] = [];
  const taken: Array<[number, number]> = [];
  const free = (a: number, b: number) => !taken.some(([s, e]) => a < e && b > s) && !claimed.some(([s, e]) => a + offset < e && b + offset > s);
  for (const pass of [false, true]) {
    for (const m of matchers) {
      if ((m.category === "custom") !== pass) continue;
      if (pass && hits.length) continue; // generic words ("thing") only when nothing specific matched
      for (const x of Array.from(region.matchAll(m.re))) {
        const a = x.index ?? 0;
        const b = a + x[0].length;
        if (!free(a, b)) continue;
        taken.push([a, b]);
        const before = region.slice(0, a);
        const tokens = before.trimEnd().split(/\s+/).slice(-3);
        let qty: number | null = null;
        let qtyEvidence: string | undefined;
        let qtyInferred = false;
        const tok = (s: string | undefined) => (s ?? "").replace(/[^a-z0-9]/g, "");
        const last = tok(tokens[tokens.length - 1]);
        const prev = tok(tokens[tokens.length - 2]);
        const prev2 = tok(tokens[tokens.length - 3]);
        const asNum = (w: string) => (/^\d{1,2}$/.test(w) ? Number(w) : NUMBER_WORDS[w] ?? null);
        if (["the", "these", "those", "my", "her", "his", "their", "our", "this", "that"].includes(last) && prev === "of" && asNum(prev2) !== null) {
          qty = asNum(prev2);
          qtyEvidence = `${prev2} of ${last}`;
        } else if (asNum(last) !== null && !(/^\d{2,3}$/.test(last) && Number(last) >= 19)) {
          qty = asNum(last);
          qtyEvidence = last;
        } else if (["the", "this", "that"].includes(last)) {
          qty = 1;
          qtyEvidence = `${last} ${x[0]}`;
        } else if (/^(?:king|queen|full|twin|big|large|small|new|old|wire|floating|standing|[a-z]+)$/.test(last) && asNum(prev) !== null && !(/^\d{2,3}$/.test(prev) && Number(prev) >= 19)) {
          qty = asNum(prev);
          qtyEvidence = `${prev} ${last}`;
        }
        const plural = /(?:s|es)$/.test(x[0]) && x[0] !== m.kw;
        if (qty === null) {
          if (plural) qty = null;
          else {
            qty = 1;
            qtyInferred = true;
          }
        }
        hits.push({ index: a + offset, end: b + offset, category: m.category, keyword: x[0], base: m.kw, qty, qtyEvidence, qtyInferred });
      }
    }
  }
  return hits.sort((p, q) => p.index - q.index);
}

export interface ParsedWork {
  action: WorkAction;
  thenAction?: WorkAction;
  actionEvidence: string;
  actionInferred: boolean;
  category: string;
  categoryEvidence: string;
  /** Customer's own word for the item, singularised, e.g. "king bed". */
  nameGuess: string;
  quantity: number | null;
  quantityEvidence?: string;
  quantityInferred: boolean;
  site: number;
  siteEvidence?: string;
  relocation?: "between_rooms";
  relocationEvidence?: string;
  stairsEvidence?: string;
  tvInches?: { value: number; evidence: string };
  tvLocation?: { value: "fireplace"; evidence: string };
  haulEvidence?: string;
}

function singular(word: string): string {
  const w = word.trim();
  if (/ves$/.test(w)) return w.replace(/ves$/, "f");
  if (/ies$/.test(w)) return w.replace(/ies$/, "y");
  if (/[^s]s$/.test(w)) return w.slice(0, -1);
  return w;
}

const SITE_RE = /\b(?:at|in|to) (?:the |her |his |their )?new (?:place|house|home|apartment|address|location)\b|\bat the second (?:address|location)\b/g;

/** Parse a message into candidate work items. Pure and deterministic. */
export function parseWorkText(text: string, W: WorkConfig): ParsedWork[] {
  const t = text.toLowerCase().replace(/[“”]/g, '"').replace(/\s+/g, " ");
  const verbs = findVerbs(t);
  if (!verbs.length) return [];
  const matchers = buildMatchers(W);
  const claimed: Array<[number, number]> = [];
  const sites = Array.from(t.matchAll(SITE_RE)).map((m) => ({ index: m.index ?? 0, evidence: m[0] }));
  const siteAt = (pos: number) => {
    const hit = sites.filter((s) => s.index <= pos).pop();
    return hit ? { site: 1, evidence: hit.evidence } : { site: 0, evidence: undefined };
  };
  const haul = /\b(?:haul(?:ed)? away|haul(?:ing)? off|dispose of|throw (?:it |them )?(?:out|away))\b/.exec(t)?.[0];

  const out: Array<ParsedWork & { _order: number; _verb: number }> = [];
  const regions: Array<{ vi: number; start: number; end: number }> = [];
  verbs.forEach((v, i) => {
    const nextStart = i + 1 < verbs.length ? verbs[i + 1]!.index : t.length;
    if (v.selfContained) {
      regions.push({ vi: i, start: v.index, end: v.end });
      return;
    }
    // A participle ("a 75 mounted ...") also owns the words before it, back to the previous verb.
    if (v.participle) regions.push({ vi: i, start: i > 0 ? verbs[i - 1]!.end : 0, end: v.index });
    // A requested action owns its object/list, not later sentences about existing equipment.
    const tail = t.slice(v.end, nextStart);
    const boundary = /\.(?!\d)|[!?;]|\b(?:i|we|they|he|she|customer)\s+(?:already\s+)?(?:have|has|own|bought|got)\b/.exec(tail);
    regions.push({ vi: i, start: v.end, end: boundary ? v.end + boundary.index : nextStart });
  });
  // Process participle pre-regions first so they claim their nouns before an earlier verb's tail does.
  const ordered = regions.slice().sort((a, b) => (a.end <= verbs[a.vi]!.index ? 0 : 1) - (b.end <= verbs[b.vi]!.index ? 0 : 1) || a.start - b.start);

  for (const r of ordered) {
    const v = verbs[r.vi]!;
    let region = t.slice(r.start, r.end);
    let hits = nounsIn(region, r.start, matchers, claimed);
    // "a 75 mounted": a bare TV-sized number right before a participle means a TV (inferred).
    if (!hits.length && r.end <= v.index) {
      const m = /(\d{2,3})\s*(?:"|-?inch(?:es)?|in)?\s*$/.exec(region);
      if (m && Number(m[1]) >= 19 && Number(m[1]) <= 120) {
        const a = r.start + (m.index ?? 0);
        hits = [{ index: a, end: r.end, category: "tv", keyword: m[0].trim(), base: "tv", qty: 1, qtyInferred: true }];
      }
    }
    for (const h of hits) {
      // "a shelf under the TV" requests a shelf; the TV is a spatial reference.
      if (/\b(?:behind|under|below|above|beside|next to|in front of)\s+(?:the|my|your|our|their|his|her|this|that)\s*$/.test(t.slice(r.start, h.index))) continue;
      claimed.push([h.index, h.end]);
      const site = siteAt(h.index);
      const pre = t.slice(Math.max(0, h.index - 14), h.index);
      const item: ParsedWork & { _order: number; _verb: number } = {
        action: v.action,
        actionEvidence: v.evidence,
        // A participle ("mounted") describes the noun before it; nouns listed after it inherit the verb by inference.
        actionInferred: v.participle && h.index > v.index,
        category: h.category,
        categoryEvidence: h.keyword,
        nameGuess: singular(h.base),
        quantity: h.qty,
        quantityEvidence: h.qtyEvidence,
        quantityInferred: h.qtyInferred,
        site: site.site,
        siteEvidence: site.evidence,
        _order: h.index,
        _verb: r.vi,
      };
      if (h.category === "tv") {
        const inch = /(\d{2,3})\s*(?:"|-?inch(?:es)?|in\b)\s*(?:tvs?|televisions?)?\s*$/.exec(pre + h.keyword) ?? /(\d{2,3})\s*(?:"|-?inch(?:es)?|in\b)?\s*$/.exec(pre);
        if (inch && Number(inch[1]) >= 19 && Number(inch[1]) <= 120) item.tvInches = { value: Number(inch[1]), evidence: inch[0].trim() };
        else if (/^\d{2,3}/.test(h.keyword)) item.tvInches = { value: Number(h.keyword.match(/^\d{2,3}/)![0]), evidence: h.keyword };
        const fire = /\b(?:over|above|on) (?:the |a |her |his )?fireplace\b/.exec(t.slice(h.end, h.end + 60));
        if (fire) item.tvLocation = { value: "fireplace", evidence: fire[0] };
      }
      if (/(?:upstairs|downstairs)/.test(t.slice(h.end, h.end + 60)) && v.action === "relocate") {
        item.relocation = "between_rooms";
        item.relocationEvidence = /from [a-z ]+ to [a-z ]+/.exec(t.slice(h.end, h.end + 60))?.[0] ?? "upstairs/downstairs";
        item.stairsEvidence = /(?:upstairs|downstairs)/.exec(t.slice(h.end, h.end + 60))?.[0];
      }
      if (haul) item.haulEvidence = haul;
      out.push(item);
    }
    // "remount it" / "put it back together" with no noun: compound the previous take-down items.
    let compounded = false;
    if (!hits.length && (v.action === "remount" || v.action === "reassemble")) {
      const prevVerb = r.vi - 1;
      const prior = out.filter((o) => o._verb === prevVerb);
      for (const p of prior) {
        if (!p.thenAction && (p.action === "relocate" || p.action === "unmount" || p.action === "disassemble")) {
          if (p.action === "relocate") p.action = "unmount";
          p.thenAction = v.action;
          compounded = true;
        }
      }
    }
    // Passive phrasing ("wants it put together"): the noun comes BEFORE the verb.
    if (!hits.length && !compounded && r.start >= v.end) {
      const preStart = r.vi > 0 ? verbs[r.vi - 1]!.end : 0;
      const preRegion = t.slice(preStart, v.index);
      const preHits = nounsIn(preRegion, preStart, matchers, claimed);
      for (const h of preHits) {
        claimed.push([h.index, h.end]);
        const site = siteAt(h.index);
        out.push({
          action: v.action,
          actionEvidence: v.evidence,
          actionInferred: false,
          category: h.category,
          categoryEvidence: h.keyword,
          nameGuess: singular(h.base),
          quantity: h.qty,
          quantityEvidence: h.qtyEvidence,
          quantityInferred: h.qtyInferred,
          site: site.site,
          siteEvidence: site.evidence,
          _order: h.index,
          _verb: r.vi,
        });
      }
    }
  }
  return out.sort((a, b) => a._order - b._order).map(({ _order, _verb, ...rest }) => rest);
}

// ------------------------------------------------------------------------------------------
// Parsed text -> intake fields -> candidate WorkItemInput (never priced, always owner-confirmed)

const unknownField = <T,>() => ({ value: null as T | null, status: "unknown" as WorkFieldStatus });
const knownField = <T,>(value: T, evidence: string) => ({ value, status: "known" as WorkFieldStatus, evidence });

export function parsedToIntake(parsed: ParsedWork[]): WorkItemIntake[] {
  return parsed.map((p) => {
    const nm = p.nameGuess === "tv" ? "TV" : p.nameGuess.charAt(0).toUpperCase() + p.nameGuess.slice(1);
    const generic = p.category === "custom";
    return {
      action: p.actionInferred ? { value: p.action, status: "inferred", evidence: p.actionEvidence } : knownField(p.action, p.actionEvidence),
      thenAction: p.thenAction ? knownField(p.thenAction, p.actionEvidence) : unknownField(),
      category: generic ? { value: p.category, status: "inferred" as WorkFieldStatus, evidence: p.categoryEvidence } : knownField(p.category, p.categoryEvidence),
      name: generic ? unknownField() : knownField(nm, p.categoryEvidence),
      quantity:
        p.quantity === null
          ? { value: null, status: "needs_confirmation" as WorkFieldStatus, evidence: p.categoryEvidence }
          : p.quantityInferred
            ? { value: p.quantity, status: "inferred" as WorkFieldStatus, evidence: p.categoryEvidence }
            : knownField(p.quantity, p.quantityEvidence ?? p.categoryEvidence),
      weightLb: unknownField(),
      widthIn: unknownField(),
      heightIn: unknownField(),
      depthIn: unknownField(),
      surface: unknownField(),
      attachment: unknownField(),
      hardwareSuppliedBy: unknownField(),
      assemblyState: unknownField(),
      relocation: p.relocation ? knownField(p.relocation, p.relocationEvidence ?? "") : unknownField(),
      site: p.siteEvidence ? knownField(p.site, p.siteEvidence) : unknownField(),
      stairs: p.stairsEvidence ? knownField(true, p.stairsEvidence) : unknownField(),
      haulAway: p.haulEvidence ? knownField(true, p.haulEvidence) : unknownField(),
      tvInches: p.tvInches ? knownField(p.tvInches.value, p.tvInches.evidence) : unknownField(),
      tvLocation: p.tvLocation ? knownField(p.tvLocation.value, p.tvLocation.evidence) : unknownField(),
      reviewFlags: [],
      questions: [],
      confidence: p.actionInferred || p.quantityInferred || generic ? 0.5 : 0.8,
    } satisfies WorkItemIntake;
  });
}

export interface WorkDraftIssue {
  path: string;
  status: WorkFieldStatus;
  question: string;
}

/** Suggest (never apply) a template that matches category + action. The owner confirms it. */
export function suggestTemplate(W: WorkConfig, category: string, action: WorkAction, thenAction?: WorkAction): string | undefined {
  const entries = Object.entries(W.templates);
  const exact = entries.find(([, t]) => t.category === category && t.action === action && (t.thenAction ?? undefined) === (thenAction ?? undefined));
  if (exact) return exact[0];
  const loose = thenAction ? undefined : entries.find(([, t]) => t.category === category && t.action === action && !t.thenAction);
  return loose?.[0];
}

/**
 * Convert sanitized intake items into candidate WorkItemInput. Only facts the customer stated are
 * copied; template suggestions set templateId (minutes, recipes) but NOT template defaults, so a wall
 * type, weight or attachment is never filled in by assumption.
 */
export function intakeItemsToWorkInputs(items: WorkItemIntake[], W: WorkConfig): { items: WorkItemInput[]; issues: WorkDraftIssue[] } {
  const issues: WorkDraftIssue[] = [];
  const out: WorkItemInput[] = [];
  items.forEach((it, i) => {
    const path = `items[${i}]`;
    const need = (f: { status: WorkFieldStatus }, key: string, q: string) => {
      if (f.status !== "known") issues.push({ path: `${path}.${key}`, status: f.status, question: q });
    };
    const action = (it.action.value ?? "mount") as WorkAction;
    const category = it.category.value && W.categories[it.category.value] ? it.category.value : "custom";
    const label = it.name.value ?? W.categories[category]?.label ?? "item";
    need(it.action, "action", `What work is needed for the ${label.toLowerCase()} (mount, assemble, take down, take apart, remove, move)?`);
    if (category === "custom") issues.push({ path: `${path}.category`, status: "needs_confirmation", question: `What kind of item is "${label}"?` });
    need(it.quantity, "quantity", `How many ${label.toLowerCase()}s?`);
    const thenAction = it.thenAction.value ?? undefined;
    const known = <T,>(f: { value: T | null; status: WorkFieldStatus }) => (f.status === "known" && f.value !== null ? f.value : undefined);
    const dims = { widthIn: known(it.widthIn), heightIn: known(it.heightIn), depthIn: known(it.depthIn) };
    const hasDims = Object.values(dims).some((d) => d !== undefined);
    const inches = known(it.tvInches);
    const surface = known(it.surface);
    const template = suggestTemplate(W, category, action, thenAction);
    const base: WorkItemInput = {
      id: `item-${i + 1}`,
      action,
      ...(thenAction ? { thenAction } : {}),
      category,
      ...(template ? { templateId: template } : {}),
      ...(it.name.value ? { name: it.name.value } : {}),
      quantity: it.quantity.value ?? 1,
      ...(known(it.weightLb) !== undefined ? { weightLb: known(it.weightLb) } : {}),
      ...(hasDims ? { dimensions: Object.fromEntries(Object.entries(dims).filter(([, v]) => v !== undefined)) } : {}),
      ...(known(it.hardwareSuppliedBy) ? { hardwareSuppliedBy: known(it.hardwareSuppliedBy) } : {}),
      ...(known(it.assemblyState) ? { assemblyState: known(it.assemblyState) } : {}),
      ...(known(it.attachment) ? { attachment: known(it.attachment) } : {}),
      ...(known(it.relocation) ? { relocation: known(it.relocation) } : {}),
      ...(known(it.site) !== undefined ? { site: known(it.site) } : {}),
      ...(surface || known(it.stairs) ? { environment: { ...(surface ? { surface } : {}), ...(known(it.stairs) ? { stairs: true } : {}) } } : {}),
      ...(known(it.haulAway) ? { disposal: ["old_item"] as Array<"old_item"> } : {}),
      ...(it.reviewFlags.length ? { riskFlags: it.reviewFlags } : {}),
      ...(category === "tv" && (action === "mount" || action === "install" || thenAction === "mount" || thenAction === "install")
        ? { tv: { ...(inches !== undefined ? { inches } : {}), sizeBand: inches !== undefined && inches < 56 ? ("32-55" as const) : ("56+" as const), location: known(it.tvLocation) ?? ("standard" as const) } }
        : category === "tv" && inches !== undefined
          ? { tv: { inches, sizeBand: inches >= 56 ? ("56+" as const) : ("32-55" as const), location: known(it.tvLocation) ?? ("standard" as const) } }
          : {}),
      ...(it.customerDescription ? { description: it.customerDescription } : {}),
    };
    for (const q of it.questions) issues.push({ path: `${path}.questions`, status: "needs_confirmation", question: q });
    out.push(base);
  });
  return { items: out, issues };
}
