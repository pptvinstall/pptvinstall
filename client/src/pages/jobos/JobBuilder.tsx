import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Check, Copy, Loader2, Minus, Plus, Sparkles } from "lucide-react";

import AdminGate from "@/components/jobos/AdminGate";
import OwnerNav from "@/components/jobos/OwnerNav";
import { Field, Notice, Segmented, Stat, Toggle, inputClass } from "@/components/jobos/controls";
import { Button } from "@/components/ui/button";
import { adminFetch, describeError, money } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

// Owner Job Builder: Customer → Location → TVs → Mount → Wall → Wires → Power → Extras →
// Schedule → Recommendation. Designed for one-handed iPhone use: one decision per screen,
// 44px targets, a sticky price bar. All pricing comes from the server engine; nothing here
// does money math. Internal numbers (floor, margin, cost) are visible ONLY on this owner page.

type Tv = {
  id: string;
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
  extras: Extra[];
  access: { level: "normal" | "difficult"; furnitureMovement: boolean; ladderHeight: boolean; helper: boolean };
  cleanup: "standard" | "patching" | "haul_away";
  route: { oneWayMiles: string; oneWayDriveMinutes: string; trafficMultiplier: string };
  schedule: { appointmentTime: string; weekday: string; sameDay: boolean; awkwardGap: boolean };
};

const STEPS = ["Customer", "Location", "TVs", "Mount", "Wall", "Wires", "Power", "Extras", "Schedule", "Recommendation"] as const;
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

const newTv = (n: number): Tv => ({ id: `tv-${n}`, sizeBand: "56+", location: "standard", wall: "drywall", mountSource: "customer", mountType: null, wire: "visible", power: "existing", removal: { tvRemoval: false, mountRemoval: false, remount: false } });
const initialDraft = (): Draft => ({
  title: "",
  customerLabel: "",
  zip: "",
  tvs: [newTv(1)],
  extras: [],
  access: { level: "normal", furnitureMovement: false, ladderHeight: false, helper: false },
  cleanup: "standard",
  route: { oneWayMiles: "", oneWayDriveMinutes: "", trafficMultiplier: "" },
  schedule: { appointmentTime: "", weekday: "", sameDay: false, awkwardGap: false },
});

function toPayload(d: Draft) {
  const num = (s: string) => (s.trim() === "" || Number.isNaN(Number(s)) ? undefined : Number(s));
  return {
    scope: {
      tvs: d.tvs.map((t) => ({ ...t, mountType: t.mountSource === "pptv" ? t.mountType ?? "fixed" : null })),
      extras: d.extras,
      access: d.access,
      cleanup: d.cleanup,
    },
    context: {
      ...(/^\d{5}$/.test(d.zip) ? { zip: d.zip } : {}),
      oneWayMiles: num(d.route.oneWayMiles),
      oneWayDriveMinutes: num(d.route.oneWayDriveMinutes),
      trafficMultiplier: num(d.route.trafficMultiplier),
      appointmentTime: /^\d{2}:\d{2}$/.test(d.schedule.appointmentTime) ? d.schedule.appointmentTime : undefined,
      weekday: d.schedule.weekday === "" ? undefined : Number(d.schedule.weekday),
      sameDay: d.schedule.sameDay,
      awkwardGap: d.schedule.awkwardGap,
    },
  };
}

type Preview = {
  composition: {
    customerTotalCents: number;
    requiresReview: boolean;
    belowFloor: boolean;
    internalFlags: string[];
    customerLines: Array<{ label: string; detail?: string; amountCents: number | null }>;
    economics: { marginCents: number; marginPct: number; effectiveGrossPerHourCents: number };
    pricing: {
      floorCents: number;
      recommendedCents: number;
      premiumCents: number;
      costToServeCents: number;
      totalOwnerMinutes: number;
      labor: { minutes: number; ownerCostCents: number; helperCostCents: number };
      materials: { costCents: number; chargeCents: number };
      travel: { roundTripMiles: number; roundTripDriveMinutes: number; fuelCents: number; vehicleCents: number; timeCents: number; source: string };
      uncertainties: string[];
      flags: string[];
      why: string[];
      empty: boolean;
    };
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
  const [intakeText, setIntakeText] = useState("");
  const [intakeBusy, setIntakeBusy] = useState(false);
  const [intakeMsg, setIntakeMsg] = useState<{ tone: "info" | "error" | "warn"; text: string; questions?: string[] } | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const reqSeq = useRef(0);

  useEffect(() => {
    adminFetch<{ config: { business: { minimumMeaningfulAdjustmentCents: number } } }>("/config").then((c) => setMinAdjust(c.config.business.minimumMeaningfulAdjustmentCents)).catch(() => undefined);
    adminFetch<{ aiEnabled: boolean }>("/intake/status").then((s) => setAiAvailable(s.aiEnabled)).catch(() => undefined);
  }, []);

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
        setStableRec((prev) => (prev === null || Math.abs(res.composition.pricing.recommendedCents - prev) >= minAdjust ? res.composition.pricing.recommendedCents : prev));
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
  const setTvCount = (n: number) => setDraft((d) => ({ ...d, tvs: Array.from({ length: n }, (_, i) => d.tvs[i] ?? { ...newTv(i + 1), ...(d.tvs[0] ? { sizeBand: d.tvs[0].sizeBand, wall: d.tvs[0].wall } : {}) }) }));
  const toggleExtra = (kind: string) => setDraft((d) => ({ ...d, extras: d.extras.some((e) => e.kind === kind) ? d.extras.filter((e) => e.kind !== kind) : [...d.extras, { kind, qty: 1 }] }));

  async function runIntake(useAi: boolean) {
    if (intakeText.trim().length < 5) {
      setIntakeMsg({ tone: "error", text: "Paste at least a sentence from the customer." });
      return;
    }
    setIntakeBusy(true);
    setIntakeMsg(null);
    try {
      const res = await adminFetch<{ draft: { scope: { tvs: Tv[]; extras: Extra[]; access?: Draft["access"]; cleanup?: Draft["cleanup"] }; unresolved: Array<{ question: string }> }; aiUsed: boolean }>("/intake/parse", { method: "POST", body: { message: intakeText, useAi } });
      const s = res.draft.scope;
      setDraft((d) => ({ ...d, tvs: s.tvs.length ? s.tvs : d.tvs, extras: s.extras ?? [], access: s.access ?? d.access, cleanup: s.cleanup ?? d.cleanup }));
      const questions = Array.from(new Set(res.draft.unresolved.map((u) => u.question)));
      setIntakeMsg({ tone: questions.length ? "warn" : "info", text: `${res.aiUsed ? "AI-assisted" : "Keyword"} draft applied. Only details the customer stated are trusted; the rest are defaults to confirm.`, questions });
    } catch (e) {
      setIntakeMsg({ tone: "error", text: describeError(e) });
    } finally {
      setIntakeBusy(false);
    }
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
      const title = draft.title.trim() || `${draft.tvs.length} TV install`;
      const job = await adminFetch<{ id: string }>("/jobs", { method: "POST", body: { title, customerLabel: draft.customerLabel.trim() || null, zip: /^\d{5}$/.test(draft.zip) ? draft.zip : null, source: "manual", scope: payload.scope, context: payload.context } });
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

  const p = preview?.composition.pricing;
  const comp = preview?.composition;
  const last = step === STEPS.length - 1;
  const stepName = STEPS[step]!;

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
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Step {step + 1} of {STEPS.length}</p>
        <h1 className="text-2xl font-extrabold text-slate-900">{stepName}</h1>
        <div className="mt-2 flex gap-1" aria-hidden>
          {STEPS.map((s, i) => <span key={s} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-blue-600" : "bg-slate-200")} />)}
        </div>
      </header>

      <div className="space-y-4">
        {stepName === "Customer" ? (
          <>
            <Field label="Job name" htmlFor="jb-title"><input id="jb-title" className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="e.g. Living room + bedroom" maxLength={120} /></Field>
            <Field label="Customer (short label)" htmlFor="jb-label" hint="Just enough for you to recognize the job. Contact details stay on the booking."><input id="jb-label" className={inputClass} value={draft.customerLabel} onChange={(e) => setDraft({ ...draft, customerLabel: e.target.value })} maxLength={120} /></Field>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Sparkles className="h-4 w-4 text-blue-600" aria-hidden /> Start from the customer's message (optional)</p>
              <textarea aria-label="Customer message" className="mt-2 min-h-[96px] w-full rounded-xl border border-slate-300 p-3 text-base" value={intakeText} onChange={(e) => setIntakeText(e.target.value)} maxLength={4000} placeholder="Paste the text or email they sent…" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="h-11" disabled={intakeBusy} onClick={() => runIntake(false)}>{intakeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Quick fill (no AI)</Button>
                <Button type="button" variant="outline" className="h-11" disabled={intakeBusy || !aiAvailable} onClick={() => runIntake(true)} title={aiAvailable ? undefined : "AI is not available in this environment"}>AI fill</Button>
              </div>
              {!aiAvailable ? <p className="mt-1 text-xs text-slate-500">AI fill is off in this environment. Quick fill and manual entry work without it.</p> : null}
              {intakeMsg ? (
                <div className="mt-2 space-y-1"><Notice tone={intakeMsg.tone}>{intakeMsg.text}</Notice>{intakeMsg.questions?.length ? <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-600">{intakeMsg.questions.slice(0, 6).map((q) => <li key={q}>{q}</li>)}</ul> : null}</div>
              ) : null}
            </div>
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
            {draft.route.oneWayMiles === "" && draft.route.oneWayDriveMinutes === "" ? <Notice tone="warn">Route unknown: the engine assumes a typical drive and flags it. Enter miles and minutes from your maps app for a firm number. No live traffic or fuel data is used.</Notice> : null}
          </>
        ) : null}

        {stepName === "TVs" ? (
          <>
            <Field label="How many TVs?">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" size="icon" aria-label="Fewer TVs" disabled={draft.tvs.length <= 1} onClick={() => setTvCount(draft.tvs.length - 1)}><Minus /></Button>
                <span className="w-10 text-center text-2xl font-extrabold" aria-live="polite">{draft.tvs.length}</span>
                <Button type="button" variant="outline" size="icon" aria-label="More TVs" disabled={draft.tvs.length >= 8} onClick={() => setTvCount(draft.tvs.length + 1)}><Plus /></Button>
              </div>
            </Field>
            {draft.tvs.map((tv, i) => (
              <div key={tv.id} className="space-y-3 rounded-2xl border border-slate-200 p-3">
                <p className="text-sm font-bold text-slate-900">TV {i + 1}</p>
                <Segmented label={`TV ${i + 1} size`} value={tv.sizeBand} onChange={(v) => patchTv(i, { sizeBand: v })} options={[{ value: "32-55", label: '32"–55"' }, { value: "56+", label: '56"+' }]} />
                <Segmented label={`TV ${i + 1} location`} columns={3} value={tv.location} onChange={(v) => patchTv(i, { location: v })} options={[{ value: "standard", label: "Standard" }, { value: "fireplace", label: "Fireplace" }, { value: "high_wall", label: "High wall" }]} />
              </div>
            ))}
          </>
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

        {stepName === "Extras" ? (
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
                <div className="grid grid-cols-2 gap-2">
                  <Stat label="Customer quote" value={money(comp!.customerTotalCents)} sub={preview!.pricingMode === "legacy" ? "Current catalog price" : "Engine recommendation"} />
                  <Stat label="Recommended" value={money(stableRec ?? p.recommendedCents)} sub="Internal" />
                  <Stat label="Floor" value={money(p.floorCents)} tone={comp!.belowFloor ? "warn" : "default"} sub={comp!.belowFloor ? "Quote is below floor" : "Internal minimum"} />
                  <Stat label="Premium ref." value={money(p.premiumCents)} tone="muted" sub="Internal" />
                  <Stat label="Est. time" value={`${Math.floor(p.totalOwnerMinutes / 60)}h ${p.totalOwnerMinutes % 60}m`} sub={`${p.labor.minutes} min on site`} />
                  <Stat label="Materials" value={money(p.materials.costCents)} sub={`charge ${money(p.materials.chargeCents)}`} />
                  <Stat label="Travel cost" value={money(p.travel.fuelCents + p.travel.vehicleCents + p.travel.timeCents)} sub={`${p.travel.roundTripMiles} mi · ${p.travel.roundTripDriveMinutes} min`} />
                  <Stat label="Margin at quote" value={`${(comp!.economics.marginPct * 100).toFixed(0)}%`} tone={comp!.economics.marginPct < 0.12 ? "warn" : "good"} sub={`${money(comp!.economics.effectiveGrossPerHourCents)}/hr gross · estimate`} />
                </div>
                {[...comp!.internalFlags, ...p.uncertainties].length ? (
                  <div className="space-y-1.5">{Array.from(new Set([...comp!.internalFlags, ...p.uncertainties])).map((f) => <Notice key={f} tone="warn">{f}</Notice>)}</div>
                ) : null}
                <details className="rounded-2xl border border-slate-200 p-3 text-sm">
                  <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-slate-800">Why this price</summary>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">{p.why.map((w) => <li key={w}>{w}</li>)}</ul>
                </details>
                <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
                  <p className="text-sm font-bold text-slate-900">Owner adjustment</p>
                  <Segmented label="Adjustment type" columns={3} value={adjType} onChange={setAdjType} options={[{ value: "none", label: "None" }, { value: "discount", label: "Discount" }, { value: "override", label: "Set price" }]} />
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
                {saveError ? <Notice tone="error">{saveError}</Notice> : null}
                <Button className="h-14 w-full text-base" disabled={saving || adjustmentInvalid || p.empty} onClick={save}>
                  {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : "Save job & create quote"}
                </Button>
                {p.empty ? <p className="text-center text-xs text-slate-500">Add at least one TV or extra to quote.</p> : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Sticky price bar + navigation */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto max-w-lg">
          <div className="mb-2 flex items-center justify-between text-sm" aria-live="polite">
            <span className="text-slate-500">Quote <strong className="text-slate-900">{p ? money(comp!.customerTotalCents) : "—"}</strong></span>
            <span className="text-slate-500">Rec. <strong className="text-slate-900">{p ? money(stableRec ?? p.recommendedCents) : "—"}</strong></span>
            <span className={cn("text-slate-500", comp?.belowFloor && "text-amber-700")}>Floor <strong>{p ? money(p.floorCents) : "—"}</strong></span>
            {previewing ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-label="Updating" /> : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button className="h-12" disabled={last} onClick={() => setStep(step + 1)}>Next <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>
    </main>
  );
}
