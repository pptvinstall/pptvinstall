import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, X } from "lucide-react";

import { Field, Notice, Segmented, Toggle, inputClass } from "@/components/jobos/controls";
import { Button } from "@/components/ui/button";
import { adminFetch, describeError } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

// The universal "Add item" flow. One item = ACTION + ITEM + QUANTITY; everything else (surface, weight,
// hardware, helper, disposal...) sits behind "Details" and is only needed when it changes the price.
// All pricing and review decisions come from the server engine; this file only collects facts.

export type ItemDraft = {
  id: string;
  action: string;
  thenAction?: string;
  category: string;
  templateId?: string;
  name?: string;
  description?: string;
  quantity: number;
  site: number;
  weightLb?: number;
  dimensions?: { widthIn?: number; heightIn?: number; depthIn?: number };
  hardwareSuppliedBy: string;
  assemblyState: string;
  attachment: string;
  environment: { surface: string; ladder: boolean; stairs: boolean; tightSpace: boolean; furnitureMovement: boolean; obstructions: boolean; difficultAccess: boolean; heightFt?: number };
  relocation: string;
  helper: string;
  restoration: string;
  disposal: string[];
  riskFlags: string[];
  recipes: string[];
  [k: string]: unknown;
};

export type WorkCfg = {
  categories: Record<string, { label: string; group: string; keywords: string[] }>;
  templates: Record<string, { label: string; customerLabel?: string; category: string; action: string; thenAction?: string; recipes: string[]; fixedPriceCents?: number; defaults?: Record<string, unknown> }>;
};

const ACTIONS = [
  ["mount", "Mount"], ["install", "Install"], ["assemble", "Assemble"], ["reassemble", "Reassemble"], ["remount", "Remount"], ["relocate", "Relocate"],
  ["unmount", "Unmount"], ["dismount", "Dismount"], ["remove", "Remove"], ["disassemble", "Disassemble"], ["teardown", "Teardown"],
] as const;
export const actionLabel = (a: string) => ACTIONS.find((x) => x[0] === a)?.[1] ?? a;
const WORKFLOWS = [
  { id: "single", label: "One action" },
  { id: "unmount:remount", label: "Take down + put back" },
  { id: "disassemble:reassemble", label: "Take apart + reassemble" },
  { id: "remove:install", label: "Remove + replace" },
];
const SURFACES = [
  ["drywall_studs", "Drywall (studs)"], ["drywall_unknown_studs", "Drywall (studs unknown)"], ["brick", "Brick"], ["concrete", "Concrete"], ["stone", "Stone"], ["masonry", "Masonry"],
  ["steel_studs", "Steel studs"], ["wood", "Wood"], ["tile", "Tile"], ["ceiling", "Ceiling"], ["floor", "Floor"], ["freestanding", "Freestanding"], ["furniture_attachment", "Attached to furniture"], ["unknown", "Not sure"],
] as const;
const ATTACHMENTS = [
  ["unknown", "Not sure"], ["light_duty_anchors", "Light-duty anchors"], ["stud_mounted", "Stud mounted"], ["lag_hardware", "Lag hardware"], ["masonry_anchors", "Masonry anchors"], ["manufacturer_bracket", "Manufacturer bracket"],
  ["vesa_bracket", "VESA bracket"], ["rail_cleat", "Rail / cleat"], ["screws_fasteners", "Screws"], ["adhesive_assisted", "Adhesive assisted"], ["freestanding_assembly", "Freestanding"],
] as const;
const RISKS = [
  ["structural_modification", "Structural change"], ["load_bearing", "Load-bearing"], ["roof_work", "Roof work"], ["gas_line", "Gas line"], ["plumbing_work", "Plumbing"], ["high_voltage_or_panel", "High voltage / panel"],
  ["new_circuit", "New circuit"], ["permit_or_license_required", "Permit / license"], ["unsafe_height", "Unsafe height"], ["unknown_structure", "Unknown structure"], ["ceiling_suspension", "Ceiling suspension"],
  ["commercial_rigging", "Commercial rigging"], ["hazardous_material", "Hazardous material"], ["outside_capability", "Outside our capability"],
] as const;

export const itemTitle = (i: ItemDraft, cfg: WorkCfg | null) => i.name || (cfg?.templates[i.templateId ?? ""]?.label ?? cfg?.categories[i.category]?.label ?? "Custom item");

let seq = 0;
export function newItemFrom(cfg: WorkCfg | null, opts: { action: string; templateId?: string; category?: string; quantity: number; name?: string; site?: number }): ItemDraft {
  const tpl = opts.templateId ? cfg?.templates[opts.templateId] : undefined;
  const d = (tpl?.defaults ?? {}) as Record<string, unknown>;
  const surface = (d.surface as string) ?? "unknown";
  return {
    id: `item-${Date.now().toString(36)}-${++seq}`,
    action: opts.action || tpl?.action || "mount",
    ...(tpl?.thenAction && opts.action === tpl.action ? { thenAction: tpl.thenAction } : {}),
    category: tpl?.category ?? opts.category ?? "custom",
    ...(opts.templateId && tpl ? { templateId: opts.templateId } : {}),
    ...(opts.name?.trim() ? { name: opts.name.trim() } : tpl ? { name: tpl.customerLabel ?? tpl.label } : {}),
    quantity: opts.quantity,
    site: opts.site ?? 0,
    // Template defaults are pre-filled and editable; weight/surface only when the owner's template says so.
    ...(typeof d.weightLb === "number" ? { weightLb: d.weightLb } : {}),
    ...(d.dimensions ? { dimensions: d.dimensions as ItemDraft["dimensions"] } : {}),
    hardwareSuppliedBy: (d.hardwareSuppliedBy as string) ?? "unknown",
    assemblyState: "unknown",
    attachment: (d.attachment as string) ?? "unknown",
    environment: { surface, ladder: false, stairs: false, tightSpace: false, furnitureMovement: false, obstructions: false, difficultAccess: false },
    relocation: "none",
    helper: (d.helper as string) ?? "none",
    restoration: (d.restoration as string) ?? "none",
    disposal: (d.disposal as string[]) ?? [],
    riskFlags: (d.riskFlags as string[]) ?? [],
    recipes: [],
    ...(d.assembly ? { assembly: d.assembly } : {}),
  };
}

/** Strip UI-only blanks so the server schema's own defaults apply. */
export function itemPayload(i: ItemDraft, allowSites: boolean) {
  const dims = i.dimensions && Object.values(i.dimensions).some((v) => v !== undefined) ? i.dimensions : undefined;
  return { ...i, dimensions: dims, site: allowSites ? i.site : 0 };
}

function NumInput({ label, value, onChange, unit, id }: { label: string; value: number | undefined; onChange: (v: number | undefined) => void; unit: string; id: string }) {
  return (
    <Field label={`${label} (${unit})`} htmlFor={id}>
      <input id={id} inputMode="decimal" className={inputClass} value={value ?? ""} onChange={(e) => { const n = e.target.value.trim() === "" ? undefined : Number(e.target.value); onChange(n === undefined || Number.isNaN(n) || n <= 0 ? undefined : n); }} />
    </Field>
  );
}
function Select({ label, value, options, onChange, id }: { label: string; value: string; options: ReadonlyArray<readonly [string, string]>; onChange: (v: string) => void; id: string }) {
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} className={inputClass} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  );
}
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);

function ItemCard({ item, cfg, hasSecondSite, onChange, onRemove, onSavedTemplate }: { item: ItemDraft; cfg: WorkCfg | null; hasSecondSite: boolean; onChange: (p: Partial<ItemDraft>) => void; onRemove: () => void; onSavedTemplate: () => void }) {
  const [open, setOpen] = useState(false);
  const [tplMsg, setTplMsg] = useState("");
  const env = (p: Partial<ItemDraft["environment"]>) => onChange({ environment: { ...item.environment, ...p } });
  const flow = item.thenAction ? `${item.action}:${item.thenAction}` : "single";
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const title = itemTitle(item, cfg);
  const known = Boolean(cfg?.categories[item.category]) && item.category !== "custom";

  async function saveTemplate() {
    const id = slugify(title);
    if (!id) return;
    setTplMsg("");
    try {
      const defaults: Record<string, unknown> = {};
      if (item.environment.surface !== "unknown") defaults.surface = item.environment.surface;
      if (item.attachment !== "unknown") defaults.attachment = item.attachment;
      if (item.hardwareSuppliedBy !== "unknown") defaults.hardwareSuppliedBy = item.hardwareSuppliedBy;
      if (item.weightLb) defaults.weightLb = item.weightLb;
      if (item.helper !== "none") defaults.helper = item.helper;
      await adminFetch(`/work-templates/${id}`, {
        method: "PUT",
        body: { template: { label: title, category: item.category, action: item.action, ...(item.thenAction ? { thenAction: item.thenAction } : {}), recipes: item.recipes, ...(Object.keys(defaults).length ? { defaults } : {}) }, reason: "saved from Job Builder" },
      });
      setTplMsg(`Saved “${title}” as a template.`);
      onSavedTemplate();
    } catch (e) {
      setTplMsg(describeError(e));
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 p-3" data-testid="item-card">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-900">{title}</p>
          <p className="text-xs text-slate-500">{actionLabel(item.action)}{item.thenAction ? ` → ${actionLabel(item.thenAction)}` : ""} · {known ? cfg!.categories[item.category]!.label : "custom (estimate only)"}{hasSecondSite && item.site > 0 ? " · address 2" : ""}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button type="button" variant="outline" size="icon" aria-label={`Fewer ${title}`} disabled={item.quantity <= 1} onClick={() => onChange({ quantity: item.quantity - 1 })}><Minus /></Button>
          <span className="w-7 text-center text-base font-extrabold" aria-live="polite">{item.quantity}</span>
          <Button type="button" variant="outline" size="icon" aria-label={`More ${title}`} disabled={item.quantity >= 50} onClick={() => onChange({ quantity: item.quantity + 1 })}><Plus /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Remove ${title}`} onClick={onRemove}><Trash2 /></Button>
        </div>
      </div>
      <button type="button" className="mt-1 min-h-[44px] text-sm font-semibold text-blue-700" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? "Hide details" : "Details (only if it changes the price)"}</button>
      {open ? (
        <div className="mt-2 space-y-3 border-t border-slate-100 pt-3">
          <Select id={`${item.id}-action`} label="Action" value={item.action} options={ACTIONS} onChange={(v) => onChange({ action: v, ...(item.thenAction === v ? { thenAction: undefined } : {}) })} />
          <Field label="Workflow"><Segmented label="Workflow" columns={1} value={flow} onChange={(v) => { const [a, t] = v.split(":"); onChange(v === "single" ? { thenAction: undefined } : { action: a!, thenAction: t }); }} options={WORKFLOWS.map((w) => ({ value: w.id, label: w.label }))} /></Field>
          {item.category === "custom" || !known ? (
            <Field label="What is it?" htmlFor={`${item.id}-name`}><input id={`${item.id}-name`} className={inputClass} value={item.name ?? ""} maxLength={120} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Kayak rack" /></Field>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <NumInput id={`${item.id}-w`} label="Weight" unit="lb" value={item.weightLb} onChange={(v) => onChange({ weightLb: v })} />
            <NumInput id={`${item.id}-h`} label="Longest side" unit="in" value={item.dimensions?.widthIn} onChange={(v) => onChange({ dimensions: { ...item.dimensions, widthIn: v } })} />
          </div>
          <Select id={`${item.id}-surface`} label="Surface / where" value={item.environment.surface} options={SURFACES} onChange={(v) => env({ surface: v })} />
          <Select id={`${item.id}-att`} label="How it attaches" value={item.attachment} options={ATTACHMENTS} onChange={(v) => onChange({ attachment: v })} />
          <Field label="Hardware supplied by"><Segmented label="Hardware supplied by" columns={3} value={item.hardwareSuppliedBy} onChange={(v) => onChange({ hardwareSuppliedBy: v })} options={[{ value: "customer", label: "Customer" }, { value: "pptv", label: "PPTV" }, { value: "unknown", label: "Not sure" }]} /></Field>
          <Field label="Condition"><Segmented label="Assembly state" columns={3} value={item.assemblyState} onChange={(v) => onChange({ assemblyState: v })} options={[{ value: "boxed", label: "In box" }, { value: "assembled", label: "Assembled" }, { value: "unknown", label: "Not sure" }]} /></Field>
          <Field label="Helper"><Segmented label="Helper" columns={3} value={item.helper} onChange={(v) => onChange({ helper: v })} options={[{ value: "none", label: "None" }, { value: "recommended", label: "Suggested" }, { value: "required", label: "Required" }]} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Toggle label="Ladder" checked={item.environment.ladder} onChange={(v) => env({ ladder: v })} />
            <Toggle label="Stairs" checked={item.environment.stairs} onChange={(v) => env({ stairs: v })} />
            <Toggle label="Tight space" checked={item.environment.tightSpace} onChange={(v) => env({ tightSpace: v })} />
            <Toggle label="Move furniture" checked={item.environment.furnitureMovement} onChange={(v) => env({ furnitureMovement: v })} />
          </div>
          <Select id={`${item.id}-rel`} label="Moving it?" value={item.relocation} options={[["none", "Staying put"], ["same_room", "Same room"], ["between_rooms", "Between rooms"], ["between_addresses", "Between addresses"]]} onChange={(v) => onChange({ relocation: v })} />
          <Select id={`${item.id}-rest`} label="Wall repair" value={item.restoration} options={[["none", "Not requested"], ["leave_hardware", "Leave hardware"], ["remove_hardware_only", "Remove hardware only"], ["minor_patch", "Minor patch (no paint)"], ["major_repair", "Major repair (review)"]]} onChange={(v) => onChange({ restoration: v })} />
          <Field label="Haul-away / disposal (priced separately)">
            <div className="grid grid-cols-2 gap-2">
              {([["packaging", "Packaging"], ["debris", "Debris"], ["old_hardware", "Old hardware"], ["old_item", "Old item"]] as const).map(([v, l]) => <Toggle key={v} label={l} checked={item.disposal.includes(v)} onChange={() => onChange({ disposal: toggle(item.disposal, v) })} />)}
            </div>
          </Field>
          {hasSecondSite ? <Field label="Where"><Segmented label="Address" value={String(item.site)} onChange={(v) => onChange({ site: Number(v) })} options={[{ value: "0", label: "Address 1" }, { value: "1", label: "Address 2" }]} /></Field> : null}
          <details className="rounded-xl border border-slate-200 p-2 text-sm">
            <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-slate-800">Risk flags (sends to review)</summary>
            <div className="mt-1 grid grid-cols-2 gap-2">{RISKS.map(([v, l]) => <Toggle key={v} label={l} checked={item.riskFlags.includes(v)} onChange={() => onChange({ riskFlags: toggle(item.riskFlags, v) })} />)}</div>
          </details>
          <Button type="button" variant="outline" className="h-11 w-full" onClick={saveTemplate}>Save as template</Button>
          {tplMsg ? <p className="text-xs text-slate-600">{tplMsg}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

type Preset = "mount" | "assemble" | "remove" | "custom";
const PRESET_ACTIONS: Record<Preset, string[]> = {
  mount: ["mount", "install", "remount", "relocate"],
  assemble: ["assemble", "reassemble", "disassemble"],
  remove: ["remove", "unmount", "dismount", "disassemble", "teardown"],
  custom: ["mount", "install", "assemble", "reassemble", "remount", "relocate", "unmount", "dismount", "remove", "disassemble", "teardown"],
};

export default function ItemsStep({
  cfg, items, setItems, tvCount, addTv, hasSecondSite, onTemplatesChanged, tvList,
}: {
  cfg: WorkCfg | null;
  items: ItemDraft[];
  setItems: (fn: (prev: ItemDraft[]) => ItemDraft[]) => void;
  tvCount: number;
  addTv: () => void;
  hasSecondSite: boolean;
  onTemplatesChanged: () => void;
  tvList: React.ReactNode;
}) {
  const [preset, setPreset] = useState<Preset | null>(null);
  const [action, setAction] = useState("mount");
  const [choice, setChoice] = useState("");
  const [customName, setCustomName] = useState("");
  const [qty, setQty] = useState(1);

  const templates = useMemo(() => {
    const all = Object.entries(cfg?.templates ?? {});
    const wanted = preset ? PRESET_ACTIONS[preset] : [];
    const first = all.filter(([, t]) => wanted.includes(t.action) && t.category !== "tv");
    const rest = all.filter(([, t]) => !first.some(([id]) => id === t.category) && !wanted.includes(t.action) && t.category !== "tv");
    return { first, rest };
  }, [cfg, preset]);
  const categories = useMemo(() => Object.entries(cfg?.categories ?? {}).filter(([k]) => k !== "custom" && k !== "tv").sort((a, b) => a[1].label.localeCompare(b[1].label)), [cfg]);

  function open(p: Preset) {
    setPreset(p);
    setAction(p === "mount" ? "mount" : p === "assemble" ? "assemble" : p === "remove" ? "remove" : "install");
    setChoice(p === "custom" ? "c:custom" : "");
    setCustomName("");
    setQty(1);
  }
  function add() {
    if (!preset || !choice) return;
    const isTemplate = choice.startsWith("t:");
    const item = newItemFrom(cfg, isTemplate ? { action, templateId: choice.slice(2), quantity: qty } : { action, category: choice.slice(2) || "custom", quantity: qty, name: customName });
    setItems((prev) => [...prev, item.templateId && cfg?.templates[item.templateId]?.action !== action ? { ...item, thenAction: undefined } : item]);
    setPreset(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Add to this job">
        <Button type="button" className="h-12" onClick={addTv}>+ TV</Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => open("mount")}>+ Mount item</Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => open("assemble")}>+ Assemble item</Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => open("remove")}>+ Remove item</Button>
        <Button type="button" variant="outline" className="col-span-2 h-12" onClick={() => open("custom")}>+ Custom</Button>
      </div>

      {preset ? (
        <div className="space-y-3 rounded-2xl border-2 border-blue-200 bg-blue-50/40 p-3" role="group" aria-label="Add item">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-900">Add item</p>
            <Button type="button" variant="ghost" size="icon" aria-label="Cancel" onClick={() => setPreset(null)}><X /></Button>
          </div>
          <Select id="add-action" label="Action" value={action} options={ACTIONS.filter(([a]) => PRESET_ACTIONS[preset].includes(a))} onChange={setAction} />
          <Field label="Item" htmlFor="add-item">
            <select id="add-item" className={inputClass} value={choice} onChange={(e) => setChoice(e.target.value)}>
              <option value="">Choose…</option>
              {templates.first.length ? <optgroup label="Templates">{templates.first.map(([id, t]) => <option key={id} value={`t:${id}`}>{t.label}</option>)}</optgroup> : null}
              {templates.rest.length ? <optgroup label="Other templates">{templates.rest.map(([id, t]) => <option key={id} value={`t:${id}`}>{t.label}</option>)}</optgroup> : null}
              <optgroup label="Category (no template)">{categories.map(([id, c]) => <option key={id} value={`c:${id}`}>{c.label}</option>)}</optgroup>
              <option value="c:custom">Something else (custom)</option>
            </select>
          </Field>
          {choice === "c:custom" ? (
            <Field label="What is it?" htmlFor="add-name" hint="Priced as an estimate with questions. It never fails on an unknown item."><input id="add-name" className={inputClass} value={customName} maxLength={120} onChange={(e) => setCustomName(e.target.value)} placeholder="e.g. Pergola swing" /></Field>
          ) : null}
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-800">Quantity</span>
            <Button type="button" variant="outline" size="icon" aria-label="Fewer" disabled={qty <= 1} onClick={() => setQty(qty - 1)}><Minus /></Button>
            <span className="w-8 text-center text-xl font-extrabold">{qty}</span>
            <Button type="button" variant="outline" size="icon" aria-label="More" disabled={qty >= 50} onClick={() => setQty(qty + 1)}><Plus /></Button>
          </div>
          <Button type="button" className="h-12 w-full" disabled={!choice} onClick={add}>Add to job</Button>
        </div>
      ) : null}

      {tvCount > 0 ? <div className="space-y-3">{tvList}</div> : null}
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          cfg={cfg}
          hasSecondSite={hasSecondSite}
          onChange={(p) => setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, ...p } : x)))}
          onRemove={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
          onSavedTemplate={onTemplatesChanged}
        />
      ))}
      {tvCount === 0 && items.length === 0 ? <Notice tone="info">Nothing added yet. Tap a button above, or paste the customer's message on the first step.</Notice> : null}
      <p className={cn("text-xs text-slate-500")}>Unknown details never block a quote: the engine asks for what it needs and marks the quote as an estimate or sends it to review.</p>
    </div>
  );
}
