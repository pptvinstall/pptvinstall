import { useCallback, useEffect, useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

import AdminGate from "@/components/jobos/AdminGate";
import OwnerNav from "@/components/jobos/OwnerNav";
import { Field, Notice, Segmented, Toggle, inputClass } from "@/components/jobos/controls";
import { Button } from "@/components/ui/button";
import { adminFetch, describeError, money } from "@/lib/adminApi";

// Owner economics settings. Versioned and audited on the server: every save creates a new
// immutable version with who/why/what changed, and any version can be re-activated. Quote
// versions keep the config they were priced with. No secret or credential fields exist here;
// the server rejects any secret-shaped key.

type Cfg = any;
type Stored = { version: number; name: string; isActive: boolean; config: Cfg; createdAt: string; createdBy: string; changeReason: string | null; changedPaths: string[] };
type EventRow = { id: number; version: number; action: string; actor: string; at: string; details: string | null };

export default function PricingConfigPage() {
  return (
    <AdminGate title="Economics">
      <OwnerNav />
      <Inner />
    </AdminGate>
  );
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

function Inner() {
  const [active, setActive] = useState<Stored | null>(null);
  const [versions, setVersions] = useState<Stored[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [draft, setDraft] = useState<Cfg | null>(null);
  const [reason, setReason] = useState("");
  const [confirmDynamic, setConfirmDynamic] = useState("");
  const [advanced, setAdvanced] = useState("");
  const [advancedError, setAdvancedError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const [cur, vs, ev] = await Promise.all([adminFetch<Stored>("/config"), adminFetch<Stored[]>("/config/versions"), adminFetch<EventRow[]>("/config/events")]);
      setActive(cur);
      setVersions(vs);
      setEvents(ev);
      setDraft(clone(cur.config));
      setAdvanced(JSON.stringify(cur.config, null, 2));
    } catch (e) {
      setLoadError(describeError(e));
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (loadError) return <main className="mx-auto max-w-lg space-y-2 px-4 py-6"><Notice tone="error">{loadError}</Notice><Button variant="outline" onClick={() => void load()}>Retry</Button></main>;
  if (!draft || !active) return <main className="flex items-center gap-2 px-4 py-10 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</main>;

  const set = (path: string[], value: unknown) => setDraft((d: Cfg) => {
    const next = clone(d);
    let o = next;
    for (const k of path.slice(0, -1)) o = o[k];
    o[path[path.length - 1]!] = value;
    return next;
  });
  const get = (path: string[]) => path.reduce((o: any, k) => o?.[k], draft);

  // Dollar-valued cents field
  const dollars = (label: string, path: string[], hint?: string) => (
    <Field label={label} htmlFor={path.join("-")} hint={hint}>
      <input id={path.join("-")} inputMode="decimal" className={inputClass} defaultValue={(get(path) / 100).toString()} key={`${path.join(".")}-${active.version}`} onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0) set(path, Math.round(v * 100)); }} />
    </Field>
  );
  const plain = (label: string, path: string[], hint?: string, scale = 1) => (
    <Field label={label} htmlFor={path.join("-")} hint={hint}>
      <input id={path.join("-")} inputMode="decimal" className={inputClass} defaultValue={(get(path) * scale).toString()} key={`${path.join(".")}-${active.version}`} onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0) set(path, v / scale); }} />
    </Field>
  );

  const changingMode = draft.pricingMode !== active.config.pricingMode;
  const dynamicBlocked = changingMode && draft.pricingMode === "dynamic" && confirmDynamic.trim().toLowerCase() !== "change customer prices";
  const unchanged = JSON.stringify(draft) === JSON.stringify(active.config);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await adminFetch("/config", { method: "PUT", body: { config: draft, reason: reason.trim(), ...(draft.pricingMode === "dynamic" ? { confirmDynamic: confirmDynamic.trim() } : {}) } });
      setMsg({ tone: "success", text: "Saved as a new version and activated." });
      setReason("");
      setConfirmDynamic("");
      await load();
    } catch (e) {
      setMsg({ tone: "error", text: describeError(e) });
    } finally {
      setSaving(false);
    }
  }

  async function rollback(version: number) {
    setSaving(true);
    setMsg(null);
    try {
      await adminFetch("/config/rollback", { method: "POST", body: { version, ...(confirmDynamic.trim() ? { confirmDynamic: confirmDynamic.trim() } : {}) } });
      setMsg({ tone: "success", text: `Version ${version} is active again.` });
      await load();
    } catch (e) {
      setMsg({ tone: "error", text: describeError(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg space-y-5 px-4 pb-32 pt-4">
      <header>
        <h1 className="text-2xl font-extrabold text-slate-900">Economics</h1>
        <p className="text-sm text-slate-500">Active: v{active.version} · {active.config.calibration.replace(/-/g, " ")}</p>
      </header>
      {active.config.calibration === "uncalibrated-default" ? <Notice tone="warn">These are starting assumptions, not measured values. Set your own labor value, vehicle costs and margins, then tune them with real job actuals.</Notice> : null}

      <section className="space-y-3" aria-labelledby="mode-h">
        <h2 id="mode-h" className="text-lg font-bold">Customer pricing mode</h2>
        <Segmented label="Pricing mode" columns={1} value={draft.pricingMode} onChange={(v) => set(["pricingMode"], v)} options={[{ value: "legacy", label: "Legacy — customers see today's catalog prices" }, { value: "shadow", label: "Shadow — customers see catalog prices; you see the engine side by side" }, { value: "dynamic", label: "Dynamic — customers see the engine recommendation" }]} />
        {draft.pricingMode === "shadow" ? <Notice tone="info">Customer prices do not change. Every website quote is also priced by the engine and stored for you under Jobs → Website quotes.</Notice> : null}
        {draft.pricingMode === "dynamic" ? (
          <Notice tone="warn">Dynamic mode changes what customers are quoted. Leave on Legacy until you have reviewed the engine against real jobs.{changingMode ? (<span className="mt-2 block"><label htmlFor="confirm-dyn" className="font-semibold">Type "change customer prices" to confirm</label><input id="confirm-dyn" className={`${inputClass} mt-1`} value={confirmDynamic} onChange={(e) => setConfirmDynamic(e.target.value)} /></span>) : null}</Notice>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="labor-h">
        <h2 id="labor-h" className="text-lg font-bold">Labor & business</h2>
        {dollars("Your labor value per hour ($)", ["labor", "targetLaborPerHourCents"], "What your hands-on time is worth in cost-to-serve. Customers never see an hourly rate.")}
        <Field label="How your helper is paid">
          <Segmented label="Helper pay" columns={1} value={draft.labor.helperCompensation?.mode ?? "hourly"} onChange={(v) => set(["labor", "helperCompensation"], { mode: v, laborRevenueSharePct: draft.labor.helperCompensation?.laborRevenueSharePct ?? 0.2, appliesTo: "whole_job" })} options={[{ value: "labor_revenue_share", label: "Share of labor revenue (not materials, mounts or travel fee)" }, { value: "hourly", label: "Hourly rate" }]} />
        </Field>
        {(draft.labor.helperCompensation?.mode ?? "hourly") === "labor_revenue_share"
          ? plain("Helper share of labor revenue (%)", ["labor", "helperCompensation", "laborRevenueSharePct"], "e.g. 20 = helper gets $20 of every $100 of labor.", 100)
          : dollars("Helper cost per hour ($)", ["labor", "helperPerHourCents"])}
        {dollars("Minimum ticket ($)", ["business", "minimumTicketCents"])}
        {dollars("Minimum trip economics ($)", ["business", "minimumTripEconomicsCents"], "Least you must keep after out-of-pocket costs to make a trip worthwhile.")}
        {dollars("Overhead per job ($)", ["business", "overheadPerJobCents"])}
        {plain("Minimum margin (%)", ["business", "minimumMarginPct"], "Floor price keeps at least this margin after valuing your time.", 100)}
        {plain("Desired margin (%)", ["business", "desiredMarginPct"], "Recommended price targets this.", 100)}
        {plain("Material markup (%)", ["business", "materialMarkupPct"], undefined, 100)}
        {plain("Max discount (% of quote)", ["business", "maxDiscountPct"], "Owner adjustments beyond this need explicit confirmation.", 100)}
        {dollars("Round prices to ($)", ["business", "roundingStepCents"])}
        {dollars("Ignore price changes under ($)", ["business", "minimumMeaningfulAdjustmentCents"], "Keeps the recommendation steady when inputs wobble slightly.")}
      </section>

      <section className="space-y-3" aria-labelledby="risk-h">
        <h2 id="risk-h" className="text-lg font-bold">Complexity & risk pricing</h2>
        <Toggle label="Add margin for complexity and risk" hint="Fireplace, masonry, height, ceiling, helper, rush, multi-stop, unconfirmed details… Raises the recommendation only, never the floor." checked={Boolean(draft.business.riskPremium?.enabled)} onChange={(v) => set(["business", "riskPremium"], { ...(draft.business.riskPremium ?? { maxTotalPct: 0.15, factors: {} }), enabled: v })} />
        {draft.business.riskPremium?.enabled ? (
          <>
            {plain("Cap on total premium (%)", ["business", "riskPremium", "maxTotalPct"], undefined, 100)}
            <details className="rounded-2xl border border-slate-200 p-3">
              <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold">Premium per factor (%)</summary>
              <div className="mt-2 grid grid-cols-2 gap-3">
                {Object.keys(draft.business.riskPremium.factors ?? {}).map((k) => <div key={k}>{plain(k.replace(/_/g, " "), ["business", "riskPremium", "factors", k], undefined, 100)}</div>)}
              </div>
            </details>
          </>
        ) : null}
      </section>

      <section className="space-y-3" aria-labelledby="travel-h">
        <h2 id="travel-h" className="text-lg font-bold">Vehicle & travel</h2>
        <Field label="Vehicle label" htmlFor="veh-label"><input id="veh-label" className={inputClass} value={draft.travel.vehicleLabel} onChange={(e) => set(["travel", "vehicleLabel"], e.target.value)} maxLength={80} /></Field>
        {plain("MPG", ["travel", "mpg"], "Your real-world average. Default is a ~20 MPG estimate for the Atlas.")}
        {dollars("Fuel price per gallon ($)", ["travel", "fuelPricePerGalCents"], "A reference you set. Not live fuel data.")}
        <Field label="Fuel price as of" htmlFor="fuel-asof" hint="When you last checked the price, e.g. 2026-10-02 GasBuddy Atlanta."><input id="fuel-asof" className={inputClass} maxLength={40} value={draft.travel.fuelPriceAsOf} onChange={(e) => set(["travel", "fuelPriceAsOf"], e.target.value)} /></Field>
        {dollars("Vehicle cost per mile ($)", ["travel", "vehicleCostPerMileCents"], "Wear, tires, maintenance, depreciation.")}
        {dollars("Your time while driving, per hour ($)", ["travel", "ownerTimeValuePerHourCents"])}
        {plain("Default traffic multiplier", ["travel", "defaultTrafficMultiplier"], "1 = normal. No live traffic data is used.")}
        <Field label="Charge customers a travel fee?"><Segmented label="Customer travel fee" value={draft.travel.customerFeePolicy} onChange={(v) => set(["travel", "customerFeePolicy"], v)} options={[{ value: "none", label: "No (current policy)" }, { value: "per_round_trip_mile", label: "Per mile beyond free" }]} /></Field>
        {draft.travel.customerFeePolicy === "per_round_trip_mile" ? (<>{dollars("Fee per round-trip mile ($)", ["travel", "customerFeePerRoundTripMileCents"])}{plain("Free round-trip miles", ["travel", "customerFeeFreeRoundTripMiles"])}</>) : null}
      </section>

      <section className="space-y-3" aria-labelledby="tax-h">
        <h2 id="tax-h" className="text-lg font-bold">Invoice tax</h2>
        <Toggle label="Apply tax on invoices" checked={draft.business.tax.enabled} onChange={(v) => set(["business", "tax", "enabled"], v)} hint="Off by default. The system never assumes a tax rule." />
        {draft.business.tax.enabled ? (
          <>
            <Field label="Label" htmlFor="tax-label"><input id="tax-label" className={inputClass} maxLength={40} value={draft.business.tax.label} onChange={(e) => set(["business", "tax", "label"], e.target.value)} /></Field>
            <Field label="Rate (%)" htmlFor="tax-rate" hint="Enter the rate your accountant gives you."><input id="tax-rate" inputMode="decimal" className={inputClass} defaultValue={(draft.business.tax.rateBps / 100).toString()} onBlur={(e) => { const v = Number(e.target.value); if (Number.isFinite(v) && v >= 0 && v <= 25) set(["business", "tax", "rateBps"], Math.round(v * 100)); }} /></Field>
          </>
        ) : null}
      </section>

      {draft.documents ? (
        <section className="space-y-3" aria-labelledby="docs-h" data-testid="document-settings">
          <h2 id="docs-h" className="text-lg font-bold">Estimates & invoices</h2>
          <p className="text-xs text-slate-500">What customers see on PDF estimates, invoices and receipts. Your costs, margins and floor are never printed.</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estimate valid (days)" htmlFor="doc-valid"><input id="doc-valid" inputMode="numeric" className={inputClass} defaultValue={String(draft.documents.estimateValidDays)} key={`valid-${active.version}`} onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (v >= 1 && v <= 365) set(["documents", "estimateValidDays"], v); }} /></Field>
            <Field label="Invoice due (days)" htmlFor="doc-due" hint="0 = due on receipt"><input id="doc-due" inputMode="numeric" className={inputClass} defaultValue={String(draft.documents.invoiceDueDays)} key={`due-${active.version}`} onBlur={(e) => { const v = Math.round(Number(e.target.value)); if (v >= 0 && v <= 120) set(["documents", "invoiceDueDays"], v); }} /></Field>
          </div>
          {plain("Deposit on estimates (%)", ["documents", "depositPct"], "0 = no deposit line. Rounded to whole dollars.", 100)}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Website" htmlFor="doc-web"><input id="doc-web" className={inputClass} maxLength={80} value={draft.documents.website} onChange={(e) => set(["documents", "website"], e.target.value)} /></Field>
            <Field label="Service area" htmlFor="doc-area"><input id="doc-area" className={inputClass} maxLength={80} value={draft.documents.serviceArea} onChange={(e) => set(["documents", "serviceArea"], e.target.value)} /></Field>
          </div>
          <Field label="Scheduling note" htmlFor="doc-sched"><textarea id="doc-sched" className="min-h-[64px] w-full rounded-xl border border-slate-300 p-3 text-base" maxLength={300} value={draft.documents.schedulingNote} onChange={(e) => set(["documents", "schedulingNote"], e.target.value)} /></Field>
          <Field label="Terms (one per line)" htmlFor="doc-terms" hint="Up to 10 lines, printed on estimates and invoices.">
            <textarea id="doc-terms" className="min-h-[120px] w-full rounded-xl border border-slate-300 p-3 text-sm" defaultValue={draft.documents.terms.join("\n")} key={`terms-${active.version}`} onBlur={(e) => set(["documents", "terms"], e.target.value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 10).map((s) => s.slice(0, 300)))} />
          </Field>
        </section>
      ) : null}

      <details className="rounded-2xl border border-slate-200 p-3">
        <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold">Advanced: labor minutes, material recipes, mount costs (JSON)</summary>
        <textarea aria-label="Advanced configuration JSON" className="mt-2 h-64 w-full rounded-xl border border-slate-300 p-2 font-mono text-xs" value={advanced} onChange={(e) => setAdvanced(e.target.value)} spellCheck={false} />
        {advancedError ? <p role="alert" className="text-sm text-red-600">{advancedError}</p> : null}
        <Button type="button" variant="outline" className="mt-2 h-11" onClick={() => { try { setDraft(JSON.parse(advanced)); setAdvancedError(""); } catch { setAdvancedError("That is not valid JSON."); } }}>Load JSON into form</Button>
        <p className="mt-1 text-xs text-slate-500">Secrets and API keys cannot be stored here; the server rejects them.</p>
      </details>

      <section className="space-y-2" aria-labelledby="hist-h">
        <h2 id="hist-h" className="text-lg font-bold">History</h2>
        <ul className="space-y-2">
          {versions.map((v) => (
            <li key={v.version} className="rounded-2xl border border-slate-200 p-3 text-sm">
              <div className="flex items-center justify-between"><span className="font-semibold">v{v.version}{v.isActive ? " · active" : ""}</span><span className="text-xs text-slate-500">{new Date(v.createdAt).toLocaleString()}</span></div>
              <p className="text-slate-600">{v.changeReason ?? "Initial defaults"} <span className="text-xs text-slate-400">by {v.createdBy}</span></p>
              {v.changedPaths.length ? <p className="text-xs text-slate-500">Changed: {v.changedPaths.slice(0, 6).join(", ")}{v.changedPaths.length > 6 ? "…" : ""}</p> : null}
              {!v.isActive && v.config?.pricingMode === "dynamic" && active.config.pricingMode !== "dynamic" ? (
                <span className="mt-2 block"><label htmlFor={`confirm-rb-${v.version}`} className="text-xs font-semibold">This version uses dynamic pricing. Type "change customer prices" to re-activate it.</label><input id={`confirm-rb-${v.version}`} className={`${inputClass} mt-1`} value={confirmDynamic} onChange={(e) => setConfirmDynamic(e.target.value)} /></span>
              ) : null}
              {!v.isActive ? <Button variant="outline" className="mt-2 h-11" disabled={saving} onClick={() => rollback(v.version)}><RotateCcw className="h-4 w-4" /> Make active</Button> : null}
            </li>
          ))}
        </ul>
        <details className="text-xs text-slate-500"><summary className="min-h-[44px] cursor-pointer py-2">Audit log ({events.length})</summary><ul className="space-y-1">{events.map((e) => <li key={e.id}>{new Date(e.at).toLocaleString()} · v{e.version} {e.action} by {e.actor}{e.details ? ` — ${e.details}` : ""}</li>)}</ul></details>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
        <div className="mx-auto max-w-lg space-y-2">
          {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
          <input aria-label="Reason for this change" placeholder="Why are you changing this? (required)" className={inputClass} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
          <Button className="h-12 w-full" disabled={saving || unchanged || reason.trim().length < 3 || dynamicBlocked} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save new version {unchanged ? "(no changes)" : ""}</Button>
        </div>
      </div>
      <p className="hidden">{money(0)}</p>
    </main>
  );
}
