import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Trash2 } from "lucide-react";

import AdminGate from "@/components/jobos/AdminGate";
import OwnerNav from "@/components/jobos/OwnerNav";
import { Field, Notice, Segmented, Stat, Toggle, inputClass } from "@/components/jobos/controls";
import EconomicsPanel, { type PanelEconomics, type PanelPricing } from "@/components/jobos/EconomicsPanel";
import QuickIntake, { type ApplyMode } from "./QuickIntake";
import ItemsStep, { itemPayload, newItemFrom, type ItemDraft, type WorkCfg } from "./ItemsStep";
import { Button } from "@/components/ui/button";
import { adminFetch, describeError, money } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

// Owner Job Builder: Customer → Location → Items → (TV Mount → Wall → Wires → Power, only when TVs are
// on the job) → Access → Schedule → Recommendation. Any ordinary item is action + item + quantity. Designed for one-handed iPhone use: one decision per screen,
// 44px targets, a sticky price bar. All pricing comes from the server engine; nothing here
// does money math. Internal numbers (floor, margin, cost) are visible ONLY on this owner page.

type Tv = {
  id: string;
  site: number;
  sizeBand: "32-55" | "56+";
  location: "standard" | "fireplace" | "high_wall";
  wall: "drywall" | "brick" | "stone" | "steel" | "unknown";
  mountSource: "customer" | "pptv";
  mountType: "fixed" | "tilt" | "full_motion" | null;
  wire: "visible" | "raceway" | "in_wall";
  power: "existing" | "outlet" | "unknown";
  removal: { tvRemoval: boolean; mountRemoval: boolean; remount: boolean };
};
type Extra = { kind: string; qty: number };
type Draft = {
  title: string;
  customerLabel: string;
  zip: string;
  tvs: Tv[];
  items: ItemDraft[];
  secondStop: { enabled: boolean; legMiles: string; legMinutes: string };
  extras: Extra[];
  access: { level: "normal" | "difficult"; furnitureMovement: boolean; ladderHeight: boolean; helper: boolean };
  cleanup: "standard" | "patching" | "haul_away";
  route: { oneWayMiles: string; oneWayDriveMinutes: string; trafficMultiplier: string };
  schedule: { appointmentTime: string; weekday: string; sameDay: boolean; awkwardGap: boolean };
  /** Intake (message + photos) this job came from; its private images are attached on save. */
  intakeId: string | null;
};

const TV_STEPS = ["Mount", "Wall", "Wires", "Power"] as const;
const ALL_STEPS = ["Customer", "Location", "Items", ...TV_STEPS, "Access", "Schedule", "Recommendation"] as const;
const EXTRA_OPTIONS = [
  { value: "soundbar", label: "Soundbar" },
  { value: "shelf", label: "Shelf" },
  { value: "artwork", label: "Artwork" },
  { value: "camera", label: "Camera" },
  { value: "doorbell", label: "Doorbell" },
  { value: "floodlight", label: "Floodlight" },
  { value: "av", label: "AV setup" },
  { value: "specialty", label: "Specialty" },
];
const ADJUST_REASONS = [
  { value: "courtesy", label: "Courtesy" },
  { value: "returning_customer", label: "Returning" },
  { value: "competitive", label: "Competitive" },
  { value: "scope_uncertainty", label: "Scope unsure" },
  { value: "bundle", label: "Bundle" },
  { value: "other", label: "Other" },
];

const newItemDefaults = () => newItemFrom(null, { action: "mount", quantity: 1 });
const newTv = (n: number): Tv => ({ id: `tv-${n}`, site: 0, sizeBand: "56+", location: "standard", wall: "drywall", mountSource: "customer", mountType: null, wire: "visible", power: "existing", removal: { tvRemoval: false, mountRemoval: false, remount: false } });
const initialDraft = (): Draft => ({
  title: "",
  customerLabel: "",
  zip: "",
  tvs: [],
  items: [],
  secondStop: { enabled: false, legMiles: "", legMinutes: "" },
  extras: [],
  access: { level: "normal", furnitureMovement: false, ladderHeight: false, helper: false },
  cleanup: "standard",
  route: { oneWayMiles: "", oneWayDriveMinutes: "", trafficMultiplier: "" },
  schedule: { appointmentTime: "", weekday: "", sameDay: false, awkwardGap: false },
  intakeId: null,
});

function toPayload(d: Draft) {
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? undefined : Number(s));
  return {
    scope: {
      tvs: d.tvs.map((t) => ({ ...t, site: d.secondStop.enabled ? t.site : 0, mountType: t.mountSource === "pptv" ? t.mountType ?? "fixed" : null })),
      items: d.items.map((i) => itemPayload(i, d.secondStop.enabled)),
      extras: d.extras,
      access: d.access,
      cleanup: d.cleanup,
    },
    context: {
      ...(/^\d{5}$/.test(d.zip) ? { zip: d.zip } : {}),
      oneWayMiles: num(d.route.oneWayMiles),
      oneWayDriveMinutes: num(d.route.oneWayDriveMinutes),
      ...(d.secondStop.enabled ? { extraStops: [{ label: "Second address", legMiles: num(d.secondStop.legMiles), legMinutes: num(d.secondStop.legMinutes) }] } : {}),
      trafficMultiplier: num(d.route.trafficMultiplier),
      appointmentTime: /^\d{2}:\d{2}$/.test(d.schedule.appointmentTime) ? d.schedule.appointmentTime : undefined,
      weekday: d.schedule.weekday === "" ? undefined : Number(d.schedule.weekday),
      sameDay: d.schedule.sameDay,
      awkwardGap: d.schedule.awkwardGap,
    },
  };
}

type Reason = { code: string; severity: "confirm" | "manual_review" | "not_supported"; message: string; itemId?: string };
type WorkItemRow = { itemId: string; customerText: string; label: string; action: string; quantity: number; minutes: number; helperMinutes: number; materialsCostCents: number; bandLabel: string; status: string; reasons: Reason[] };
const STATUS_LABEL: Record<string, string> = { priced: "PRICED", estimate_with_confirmation: "ESTIMATE WITH CONFIRMATION", manual_review_required: "MANUAL REVIEW REQUIRED", not_supported: "NOT SUPPORTED" };
type Preview = {
  gate: { code: "NOT_SUPPORTED" | "MANUAL_REVIEW_REQUIRED"; message: string } | null;
  composition: {
    customerTotalCents: number;
    requiresReview: boolean;
    belowFloor: boolean;
    internalFlags: string[];
    customerLines: Array<{ label: string; detail?: string; amountCents: number | null }>;
    economics: PanelEconomics;
  } | null;
  atRecommended?: PanelEconomics;
  pricing: PanelPricing & {
    status: string;
    statusReasons: Reason[];
    questions: Array<{ itemId?: string; field: string; question: string }>;
    exclusions: string[];
    siteCount: number;
    floorCents: number;
    recommendedCents: number;
    premiumCents: number;
    costToServeCents: number;
    totalOwnerMinutes: number;
    labor: { minutes: number; ownerCostCents: number; helperCostCents: number; helperMinutes: number };
    materials: { costCents: number; chargeCents: number };
    uncertainties: string[];
    flags: string[];
    why: string[];
    empty: boolean;
    work: { items: WorkItemRow[] };
  };
  configVersion: number;
  pricingMode: string;
};

export default function JobBuilderPage() {
  return (
    <AdminGate title="Job Builder">
      <OwnerNav />
      <Builder />
    </AdminGate>
  );
}

function Builder() {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [workCfg, setWorkCfg] = useState<WorkCfg | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [stableRec, setStableRec] = useState<number | null>(null);
  const [minAdjust, setMinAdjust] = useState(500);
  const [adjType, setAdjType] = useState<"none" | "discount" | "override">("none");
  const [adjDollars, setAdjDollars] = useState("");
  const [adjReason, setAdjReason] = useState("courtesy");
  const [adjNote, setAdjNote] = useState("");
  const [deep, setDeep] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState<{ jobId: string; quoteId: string; shareToken: string; version: number } | null>(null);
  const [linkState, setLinkState] = useState<"idle" | "sending" | "copied" | "error">("idle");
  const [intakeMsg, setIntakeMsg] = useState<{ tone: "info" | "error" | "warn"; text: string; questions?: string[] } | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const reqSeq = useRef(0);

  const loadConfig = useCallback(() => {
    adminFetch<{ config: { business: { minimumMeaningfulAdjustmentCents: number }; work: WorkCfg } }>("/config").then((c) => { setMinAdjust(c.config.business.minimumMeaningfulAdjustmentCents); setWorkCfg(c.config.work); }).catch(() => undefined);
  }, []);
  useEffect(() => {
    loadConfig();
    adminFetch<{ aiEnabled: boolean }>("/intake/status").then((s) => setAiAvailable(s.aiEnabled)).catch(() => undefined);
  }, [loadConfig]);

  // TV detail steps exist only when the job has TVs.
  const hasTvs = draft.tvs.length > 0;
  const STEPS = useMemo(() => ALL_STEPS.filter((x) => hasTvs || !(TV_STEPS as readonly string[]).includes(x)), [hasTvs]);

  const payload = useMemo(() => toPayload(draft), [draft]);
  const payloadKey = JSON.stringify(payload);

  // Debounced live preview from the server engine.
  useEffect(() => {
    const seq = ++reqSeq.current;
    setPreviewing(true);
    const t = setTimeout(async () => {
      try {
        const res = await adminFetch<Preview>("/price", { method: "POST", body: payload });
        if (seq !== reqSeq.current) return;
        setPreview(res);
        setPreviewError("");
        // Price stability: ignore sub-threshold wobble in the shown recommendation.
        setStableRec((prev) => (prev === null || Math.abs(res.pricing.recommendedCents - prev) >= minAdjust ? res.pricing.recommendedCents : prev));
      } catch (e) {
        if (seq === reqSeq.current) setPreviewError(describeError(e));
      } finally {
        if (seq === reqSeq.current) setPreviewing(false);
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payloadKey, minAdjust]);

  const patchTv = useCallback((i: number, patch: Partial<Tv>) => setDraft((d) => ({ ...d, tvs: d.tvs.map((t, idx) => (idx === i ? { ...t, ...patch } : t)) })), []);
  const addTv = () => setDraft((d) => ({ ...d, tvs: [...d.tvs, { ...newTv(d.tvs.length + 1), id: `tv-${Date.now().toString(36)}-${d.tvs.length}`, ...(d.tvs[0] ? { sizeBand: d.tvs[0].sizeBand, wall: d.tvs[0].wall } : {}) }] }));
  const removeTv = (id: string) => setDraft((d) => ({ ...d, tvs: d.tvs.filter((t) => t.id !== id) }));
  const setItems = useCallback((fn: (prev: ItemDraft[]) => ItemDraft[]) => setDraft((d) => ({ ...d, items: fn(d.items) })), []);
  const toggleExtra = (kind: string) => setDraft((d) => ({ ...d, extras: d.extras.some((e) => e.kind === kind) ? d.extras.filter((e) => e.kind !== kind) : [...d.extras, { kind, qty: 1 }] }));

  /** Put an intake scope (confirmed facts only) into the builder. */
  function applyScope(s: { tvs?: Tv[]; items?: ItemDraft[]; extras?: Extra[]; access?: Partial<Draft["access"]>; cleanup?: Draft["cleanup"] }, intakeId: string | null) {
    // A fresh TV mount (e.g. at the second address) belongs on the TV path so size, wall, wires and power can be set.
    const isTvMount = (i: ItemDraft) => i.category === "tv" && (i.action === "mount" || i.action === "install") && !i.thenAction && i.templateId !== "ceiling_tv_mount";
    const foldedTvs: Tv[] = (s.items ?? []).filter(isTvMount).flatMap((i, n) => Array.from({ length: i.quantity || 1 }, (_, k) => ({ ...newTv(1), ...((i as { tv?: Partial<Tv> }).tv ?? {}), id: `tv-ai-${n}-${k}`, site: i.site ?? 0 } as Tv)));
    const items = (s.items ?? []).filter((i) => !isTvMount(i)).map((i, n) => ({ ...newItemDefaults(), ...i, id: i.id || `ai-${n}`, environment: { ...newItemDefaults().environment, ...(i.environment ?? {}) }, conditions: (i.conditions as ItemDraft["conditions"]) ?? {} }));
    const tvs = [...(s.tvs ?? []).map((t) => ({ ...newTv(1), ...t })), ...foldedTvs];
    const secondSite = [...tvs, ...items].some((x) => (x.site ?? 0) > 0);
    setDraft((d) => ({ ...d, intakeId: intakeId ?? d.intakeId, tvs, items, secondStop: secondSite ? { ...d.secondStop, enabled: true } : d.secondStop, extras: s.extras ?? [], access: { ...d.access, ...(s.access ?? {}) }, cleanup: s.cleanup ?? d.cleanup }));
  }

  function onIntakeApplied(scope: Parameters<typeof applyScope>[0], intakeId: string, pending: number, mode: ApplyMode) {
    applyScope(scope, intakeId);
    setIntakeMsg({ tone: pending ? "warn" : "info", text: pending ? `Applied. ${pending} unconfirmed detail${pending > 1 ? "s stay" : " stays"} unknown, so the price is an estimate until confirmed.` : "Applied. Everything used was confirmed." });
    // Steps depend on whether TVs exist; compute the target from the scope, not the stale list.
    const hasTvsNext = (scope.tvs?.length ?? 0) > 0 || (scope.items ?? []).some((i) => i.category === "tv" && (i.action === "mount" || i.action === "install") && !i.thenAction && i.templateId !== "ceiling_tv_mount");
    const steps = ALL_STEPS.filter((x) => hasTvsNext || !(TV_STEPS as readonly string[]).includes(x));
    setStep(mode === "confirm" ? steps.length - 1 : steps.indexOf("Items"));
  }

  function adjustmentPayload() {
    if (adjType === "none") return undefined;
    const cents = Math.round(Number(adjDollars) * 100);
    if (!Number.isFinite(cents) || cents < 0) return undefined;
    const base = { reason: adjReason, ...(adjNote.trim() ? { note: adjNote.trim() } : {}) };
    return adjType === "discount" ? { type: "discount", discountCents: cents, ...base } : { type: "override", amountCents: cents, ...(deep ? { acknowledgeDeepDiscount: true } : {}), ...base };
  }
  const adjustmentInvalid = adjType !== "none" && (adjDollars.trim() === "" || !(Number(adjDollars) >= (adjType === "discount" ? 0.01 : 0)) || (adjReason === "other" && adjNote.trim().length < 3));

  async function save() {
    setSaving(true);
    setSaveError("");
    try {
      const count = draft.items.reduce((n, i) => n + i.quantity, 0) + draft.tvs.length;
      const title = draft.title.trim() || `${count} item job`;
      const job = await adminFetch<{ id: string }>("/jobs", { method: "POST", body: { title, customerLabel: draft.customerLabel.trim() || null, zip: /^\d{5}$/.test(draft.zip) ? draft.zip : null, source: draft.intakeId ? "ai_intake" : "manual", scope: payload.scope, context: payload.context, ...(draft.intakeId ? { intakeId: draft.intakeId } : {}) } });
      const q = await adminFetch<{ quote: { id: string; shareToken: string }; version: { version: number } }>(`/jobs/${job.id}/quote`, { method: "POST", body: { adjustment: adjustmentPayload() } });
      setSaved({ jobId: job.id, quoteId: q.quote.id, shareToken: q.quote.shareToken, version: q.version.version });
    } catch (e) {
      setSaveError(describeError(e));
    } finally {
      setSaving(false);
    }
  }

  async function sendAndCopy() {
    if (!saved) return;
    setLinkState("sending");
    try {
      const res = await adminFetch<{ customerPath: string }>(`/quotes/${saved.quoteId}/send`, { method: "POST", body: {} });
      const url = `${window.location.origin}${res.customerPath}`;
      try {
        await navigator.clipboard.writeText(url);
        setLinkState("copied");
      } catch {
        window.prompt("Copy this customer link", url);
        setLinkState("copied");
      }
    } catch {
      setLinkState("error");
    }
  }

  const p = preview?.pricing;
  const comp = preview?.composition ?? null;
  const gate = preview?.gate ?? null;
  // Work the catalog cannot price (null-amount lines) or work in manual review needs the owner's own price before saving.
  const unpricedLines = Boolean(comp?.customerLines.some((l) => l.amountCents === null));
  const needsPrice = gate?.code === "MANUAL_REVIEW_REQUIRED" || unpricedLines;
  const stepIdx = Math.min(step, STEPS.length - 1);
  const last = stepIdx === STEPS.length - 1;
  const stepName = STEPS[stepIdx]!;

  if (saved) {
    return (
      <main className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <Notice tone="success"><Check className="mr-1 inline h-4 w-4" /> Job saved with quote v{saved.version}. Nothing has been sent to the customer.</Notice>
        <Button className="h-12 w-full" onClick={sendAndCopy} disabled={linkState === "sending"}>
          {linkState === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} {linkState === "copied" ? "Link copied (quote marked sent)" : "Mark sent & copy customer link"}
        </Button>
        {linkState === "error" ? <Notice tone="error">Could not prepare the link. Try again from the Jobs page.</Notice> : null}
        <p className="text-xs text-slate-500">The link shows only the customer price and line items. Floor, margin and cost never appear on it.</p>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/admin/jobs" className="flex h-12 items-center justify-center rounded-xl border border-slate-300 text-sm font-semibold">Open jobs</Link>
          <Button variant="outline" className="h-12" onClick={() => { setSaved(null); setDraft(initialDraft()); setStep(0); setLinkState("idle"); setAdjType("none"); setAdjDollars(""); setStableRec(null); }}>New job</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-4 pb-44 pt-4">
      <header className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Step {stepIdx + 1} of {STEPS.length}</p>
        <h1 className="text-2xl font-extrabold text-slate-900">{stepName}</h1>
        <div className="mt-2 flex gap-1" aria-hidden>
          {STEPS.map((s, i) => <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= stepIdx ? "bg-blue-600" : "bg-slate-200")} />)}
        </div>
      </header>

      <div className="space-y-4">
        {stepName === "Customer" ? (
          <>
            <Field label="Job name" htmlFor="jb-title"><input id="jb-title" className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Living room + bedroom" maxLength={120} /></Field>
            <Field label="Customer (short label)" htmlFor="jb-label" hint="Just enough for you to recognize the job. Contact details stay on the booking."><input id="jb-label" className={inputClass} value={draft.customerLabel} onChange={(e) => setDraft({ ...draft, customerLabel: e.target.value })} maxLength={120} /></Field>
            <QuickIntake aiAvailable={aiAvailable} onApply={onIntakeApplied} />
            {intakeMsg ? <Notice tone={intakeMsg.tone}>{intakeMsg.text}</Notice> : null}
          </>
        ) : null}

        {stepName === "Location" ? (
          <>
            <Field label="ZIP" htmlFor="jb-zip"><input id="jb-zip" inputMode="numeric" pattern="\d{5}" maxLength={5} className={inputClass} value={draft.zip} onChange={(e) => setDraft({ ...draft, zip: e.target.value.replace(/\D/g, "") })} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="One-way miles" htmlFor="jb-mi"><input id="jb-mi" inputMode="decimal" className={inputClass} value={draft.route.oneWayMiles} onChange={(e) => setDraft({ ...draft, route: { ...draft.route, oneWayMiles: e.target.value } })} /></Field>
              <Field label="One-way minutes" htmlFor="jb-min"><input id="jb-min" inputMode="numeric" className={inputClass} value={draft.route.oneWayDriveMinutes} onChange={(e) => setDraft({ ...draft, route: { ...draft.route, oneWayDriveMinutes: e.target.value } })} /></Field>
            </div>
            <Field label="Traffic multiplier (optional)" htmlFor="jb-traffic" hint="1 = normal. Clamped by your economics settings."><input id="jb-traffic" inputMode="decimal" className={inputClass} value={draft.route.trafficMultiplier} onChange={(e) => setDraft({ ...draft, route: { ...draft.route, trafficMultiplier: e.target.value } })} /></Field>
            <Toggle label="Work at a second address" hint="e.g. take down at the old place, set up at the new one" checked={draft.secondStop.enabled} onChange={(v) => setDraft({ ...draft, secondStop: { ...draft.secondStop, enabled: v } })} />
            {draft.secondStop.enabled ? (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Address 1 → 2 miles" htmlFor="jb-s2mi"><input id="jb-s2mi" inputMode="decimal" className={inputClass} value={draft.secondStop.legMiles} onChange={(e) => setDraft({ ...draft, secondStop: { ...draft.secondStop, legMiles: e.target.value } })} /></Field>
                <Field label="Address 1 → 2 minutes" htmlFor="jb-s2min"><input id="jb-s2min" inputMode="numeric" className={inputClass} value={draft.secondStop.legMinutes} onChange={(e) => setDraft({ ...draft, secondStop: { ...draft.secondStop, legMinutes: e.target.value } })} /></Field>
              </div>
            ) : null}
            {draft.route.oneWayMiles === "" && draft.route.oneWayDriveMinutes === "" ? <Notice tone="warn">Route unknown: the engine assumes a typical drive and flags it. Enter miles and minutes from your maps app for a firm number. No live traffic or fuel data is used.</Notice> : null}
          </>
        ) : null}

        {stepName === "Items" ? (
          <ItemsStep
            cfg={workCfg}
            items={draft.items}
            setItems={setItems}
            tvCount={draft.tvs.length}
            addTv={addTv}
            hasSecondSite={draft.secondStop.enabled}
            onTemplatesChanged={loadConfig}
            tvList={draft.tvs.map((tv, i) => (
              <div key={tv.id} className="space-y-3 rounded-2xl border border-slate-200 p-3" data-testid="tv-card">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-900">TV {i + 1}{draft.secondStop.enabled && tv.site > 0 ? " · address 2" : ""}</p>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove TV ${i + 1}`} onClick={() => removeTv(tv.id)}><Trash2 /></Button>
                </div>
                <Segmented label={`TV ${i + 1} size`} value={tv.sizeBand} onChange={(v) => patchTv(i, { sizeBand: v })} options={[{ value: "32-55", label: '32"–55"' }, { value: "56+", label: '56"+' }]} />
                <Segmented label={`TV ${i + 1} location`} columns={3} value={tv.location} onChange={(v) => patchTv(i, { location: v })} options={[{ value: "standard", label: "Standard" }, { value: "fireplace", label: "Fireplace" }, { value: "high_wall", label: "High wall" }]} />
                {draft.secondStop.enabled ? <Segmented label={`TV ${i + 1} address`} value={String(tv.site)} onChange={(v) => patchTv(i, { site: Number(v) })} options={[{ value: "0", label: "Address 1" }, { value: "1", label: "Address 2" }]} /> : null}
              </div>
            ))}
          />
        ) : null}

        {stepName === "Mount" ? draft.tvs.map((tv, i) => (
          <div key={tv.id} className="space-y-3 rounded-2xl border border-slate-200 p-3">
            <p className="text-sm font-bold text-slate-900">TV {i + 1}</p>
            <Segmented label={`TV ${i + 1} mount source`} value={tv.mountSource} onChange={(v) => patchTv(i, { mountSource: v, mountType: v === "pptv" ? tv.mountType ?? "fixed" : null })} options={[{ value: "customer", label: "Customer has mount" }, { value: "pptv", label: "We supply mount" }]} />
            {tv.mountSource === "pptv" ? <Segmented label={`TV ${i + 1} mount type`} columns={3} value={tv.mountType ?? "fixed"} onChange={(v) => patchTv(i, { mountType: v })} options={[{ value: "fixed", label: "Fixed" }, { value: "tilt", label: "Tilt" }, { value: "full_motion", label: "Full motion" }]} /> : null}
            <Toggle label="Remove existing TV" checked={tv.removal.tvRemoval} onChange={(v) => patchTv(i, { removal: { ...tv.removal, tvRemoval: v } })} />
            <Toggle label="Remove old mount" checked={tv.removal.mountRemoval} onChange={(v) => patchTv(i, { removal: { ...tv.removal, mountRemoval: v } })} />
            <Toggle label="Remount / relocate" checked={tv.removal.remount} onChange={(v) => patchTv(i, { removal: { ...tv.removal, remount: v } })} />
          </div>
        )) : null}

        {stepName === "Wall" ? draft.tvs.map((tv, i) => (
          <div key={tv.id} className="space-y-3 rounded-2xl border border-slate-200 p-3">
            <p className="text-sm font-bold text-slate-900">TV {i + 1} wall</p>
            <Segmented label={`TV ${i + 1} wall type`} value={tv.wall} onChange={(v) => patchTv(i, { wall: v })} options={[{ value: "drywall", label: "Drywall" }, { value: "brick", label: "Brick" }, { value: "stone", label: "Stone / masonry" }, { value: "steel", label: "Steel / high-rise" }, { value: "unknown", label: "Not sure" }]} />
            {tv.wall === "unknown" ? <Notice tone="warn">Hidden conditions stay unverified until you inspect. The quote will be marked for review.</Notice> : null}
          </div>
        )) : null}

        {stepName === "Wires" ? draft.tvs.map((tv, i) => (
          <div key={tv.id} className="space-y-3 rounded-2xl border border-slate-200 p-3">
            <p className="text-sm font-bold text-slate-900">TV {i + 1} cables</p>
            <Segmented label={`TV ${i + 1} wire appearance`} columns={3} value={tv.wire} onChange={(v) => patchTv(i, { wire: v })} options={[{ value: "visible", label: "Visible" }, { value: "raceway", label: "Raceway" }, { value: "in_wall", label: "In-wall" }]} />
          </div>
        )) : null}

        {stepName === "Power" ? draft.tvs.map((tv, i) => (
          <div key={tv.id} className="space-y-3 rounded-2xl border border-slate-200 p-3">
            <p className="text-sm font-bold text-slate-900">TV {i + 1} power</p>
            <Segmented label={`TV ${i + 1} power`} columns={3} value={tv.power} onChange={(v) => patchTv(i, { power: v })} options={[{ value: "existing", label: "Existing outlet" }, { value: "outlet", label: "Install outlet" }, { value: "unknown", label: "Not sure" }]} />
          </div>
        )) : null}

        {stepName === "Access" ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              {EXTRA_OPTIONS.map((o) => <Toggle key={o.value} label={o.label} checked={draft.extras.some((e) => e.kind === o.value)} onChange={() => toggleExtra(o.value)} />)}
            </div>
            <Field label="Access">
              <Segmented label="Access level" value={draft.access.level} onChange={(v) => setDraft({ ...draft, access: { ...draft.access, level: v } })} options={[{ value: "normal", label: "Normal" }, { value: "difficult", label: "Difficult" }]} />
            </Field>
            <Toggle label="Furniture to move" checked={draft.access.furnitureMovement} onChange={(v) => setDraft({ ...draft, access: { ...draft.access, furnitureMovement: v } })} />
            <Toggle label="Ladder / height work" checked={draft.access.ladderHeight} onChange={(v) => setDraft({ ...draft, access: { ...draft.access, ladderHeight: v } })} />
            <Toggle label="Helper needed" checked={draft.access.helper} onChange={(v) => setDraft({ ...draft, access: { ...draft.access, helper: v } })} />
            <Field label="Cleanup">
              <Segmented label="Cleanup" columns={3} value={draft.cleanup} onChange={(v) => setDraft({ ...draft, cleanup: v })} options={[{ value: "standard", label: "Standard" }, { value: "patching", label: "Patching" }, { value: "haul_away", label: "Haul-away" }]} />
            </Field>
          </>
        ) : null}

        {stepName === "Schedule" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Appointment time" htmlFor="jb-time"><input id="jb-time" type="time" className={inputClass} value={draft.schedule.appointmentTime} onChange={(e) => setDraft({ ...draft, schedule: { ...draft.schedule, appointmentTime: e.target.value } })} /></Field>
              <Field label="Day" htmlFor="jb-day">
                <select id="jb-day" className={inputClass} value={draft.schedule.weekday} onChange={(e) => setDraft({ ...draft, schedule: { ...draft.schedule, weekday: e.target.value } })}>
                  <option value="">Not set</option>
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => <option key={d} value={i}>{d}</option>)}
                </select>
              </Field>
            </div>
            <Toggle label="Same-day request" checked={draft.schedule.sameDay} onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, sameDay: v } })} />
            <Toggle label="Awkward gap in my day" checked={draft.schedule.awkwardGap} onChange={(v) => setDraft({ ...draft, schedule: { ...draft.schedule, awkwardGap: v } })} />
            <p className="text-xs text-slate-500">Schedule effects (rush hour, late evening, weekend, same-day, gaps) change your internal cost only. They never add a customer charge unless you enable that rule in Economics.</p>
          </>
        ) : null}

        {last ? (
          <div className="space-y-3">
            {previewError ? <Notice tone="error">{previewError}</Notice> : null}
            {!p ? <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Calculating…</div> : (
              <>
                <div className={cn("rounded-2xl border p-3", p.status === "priced" ? "border-green-200 bg-green-50" : p.status === "estimate_with_confirmation" ? "border-amber-300 bg-amber-50" : "border-red-300 bg-red-50")} data-testid="work-status">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-700">{STATUS_LABEL[p.status] ?? p.status}</p>
                  {p.status === "estimate_with_confirmation" ? <p className="mt-1 text-sm text-slate-700">Quotable as an estimate. Confirm the open questions before the customer accepts.</p> : null}
                  {gate?.code === "MANUAL_REVIEW_REQUIRED" ? <p className="mt-1 text-sm text-slate-700">Review the work, then set the price yourself below. The recommendation is a starting point only.</p> : null}
                  {gate?.code === "NOT_SUPPORTED" ? <p className="mt-1 text-sm text-slate-700">PPTV does not do this work, so a quote can't be created. Remove the item or the flag.</p> : null}
                  {p.statusReasons.length ? <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-700">{Array.from(new Set(p.statusReasons.filter((r) => r.severity !== "confirm").map((r) => r.message))).slice(0, 8).map((m) => <li key={m}>{m}</li>)}</ul> : null}
                </div>
                <EconomicsPanel
                  pricing={p}
                  economics={comp?.economics ?? preview!.atRecommended ?? null}
                  customerCents={comp ? comp.customerTotalCents : null}
                  customerSub={!comp ? "Set after review" : preview!.pricingMode === "dynamic" ? "Engine recommendation" : "Catalog price customers see"}
                />
                {p.work.items.length ? (
                  <details className="rounded-2xl border border-slate-200 p-3 text-sm" data-testid="item-breakdown">
                    <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-slate-800">Per-item breakdown ({p.work.items.length})</summary>
                    <ul className="mt-1 divide-y divide-slate-100">
                      {p.work.items.map((w) => (
                        <li key={w.itemId} className="py-2">
                          <p className="font-semibold text-slate-900">{w.customerText}</p>
                          <p className="text-xs text-slate-600">{w.minutes} min{w.helperMinutes ? ` + helper ${w.helperMinutes}` : ""} · materials {money(w.materialsCostCents)} · {w.bandLabel} · {STATUS_LABEL[w.status] ?? w.status}</p>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
                {[...(comp?.internalFlags ?? []), ...p.uncertainties].length ? (
                  <div className="space-y-1.5">{Array.from(new Set([...(comp?.internalFlags ?? []), ...p.uncertainties])).slice(0, 12).map((f) => <Notice key={f} tone="warn">{f}</Notice>)}</div>
                ) : null}
                {p.exclusions.length ? <p className="text-xs text-slate-600">Not included: {p.exclusions.join(" ")}</p> : null}
                {gate?.code !== "NOT_SUPPORTED" ? (
                  <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
                    <p className="text-sm font-bold text-slate-900">Owner adjustment</p>
                    <Segmented label="Adjustment type" columns={3} value={adjType} onChange={setAdjType} options={[{ value: "none", label: "None" }, { value: "discount", label: "Discount" }, { value: "override", label: "Set price" }]} />
                    {needsPrice ? (
                      <Button type="button" variant="outline" className="h-11 w-full" onClick={() => { setAdjType("override"); setAdjDollars(((stableRec ?? p.recommendedCents) / 100).toFixed(2)); setAdjReason("scope_uncertainty"); }}>Use recommended {money(stableRec ?? p.recommendedCents)} as my price</Button>
                    ) : null}
                    {adjType !== "none" ? (
                      <>
                        <Field label={adjType === "discount" ? "Discount ($)" : "Customer price ($)"} htmlFor="jb-adj"><input id="jb-adj" inputMode="decimal" className={inputClass} value={adjDollars} onChange={(e) => setAdjDollars(e.target.value)} /></Field>
                        <Field label="Reason (internal)"><Segmented label="Adjustment reason" columns={3} value={adjReason} onChange={setAdjReason} options={ADJUST_REASONS} /></Field>
                        {adjReason === "other" ? <Field label="Note (work-related only)" htmlFor="jb-note"><input id="jb-note" className={inputClass} value={adjNote} onChange={(e) => setAdjNote(e.target.value)} maxLength={200} /></Field> : null}
                        {adjType === "override" ? <Toggle label="Allow a deep discount" hint="Required if this is far below the catalog price" checked={deep} onChange={setDeep} /> : null}
                        <p className="text-xs text-slate-500">Reasons are internal and never shown to the customer. Only one adjustment applies; they do not stack.</p>
                      </>
                    ) : null}
                  </div>
                ) : null}
                {saveError ? <Notice tone="error">{saveError}</Notice> : null}
                <Button className="h-14 w-full text-base" disabled={saving || adjustmentInvalid || p.empty || gate?.code === "NOT_SUPPORTED" || (needsPrice && adjType !== "override")} onClick={save}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save job & create quote"}
                </Button>
                {needsPrice && adjType !== "override" ? <p className="text-center text-xs text-slate-500">Part of this work has no catalog price: set your own price to continue.</p> : null}
                {p.empty ? <p className="text-center text-xs text-slate-500">Add at least one item to quote.</p> : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Sticky price bar + navigation */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm" aria-live="polite">
            <span className="text-slate-500">Quote <strong className="text-slate-900">{comp ? money(comp.customerTotalCents) : "—"}</strong></span>
            <span className="text-slate-500">Rec. <strong className="text-slate-900">{p ? money(stableRec ?? p.recommendedCents) : "—"}</strong></span>
            <span className={cn("text-slate-500", comp?.belowFloor && "text-amber-700")}>Floor <strong>{p ? money(p.floorCents) : "—"}</strong></span>
            {previewing ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Updating" /> : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12" disabled={stepIdx === 0} onClick={() => setStep(stepIdx - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button className="h-12" disabled={last} onClick={() => setStep(stepIdx + 1)}>Next <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </main>
  );
}
