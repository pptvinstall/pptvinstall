import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Copy, Loader2, RefreshCw } from "lucide-react";

import AdminGate from "@/components/jobos/AdminGate";
import OwnerNav from "@/components/jobos/OwnerNav";
import { Field, Notice, Segmented, Stat, inputClass } from "@/components/jobos/controls";
import { Button } from "@/components/ui/button";
import { adminFetch, describeError, money } from "@/lib/adminApi";
import { cn } from "@/lib/utils";

type Job = { id: string; title: string; status: string; customerLabel: string | null; zip: string | null; bookingId: number | null; createdAt: string; source: string };
type Version = { id: string; version: number; customerAmountCents: number; recommendedCents: number; floorCents: number; discountCents: number; configVersion: number; createdAt: string; acceptedAt: string | null };
type Invoice = { id: string; invoiceNumber: string; status: string; totalCents: number; paidCents: number; taxCents: number; sentAt: string | null };
type Payment = { id: string; invoiceId: string; amountCents: number; method: string; tipCents: number; receivedAt: string };
type Detail = {
  job: Job;
  quote: { id: string; status: string; shareToken: string } | null;
  versions: Version[];
  invoices: Invoice[];
  payments: Payment[];
  actuals: { actuals: Record<string, any>; profitability: Profit | null } | null;
};
type Profit = {
  note: string;
  quotedCents: number;
  collectedCents: number;
  tipCents: number;
  quotedVsCollectedCents: number;
  actualOutOfPocketCents: number;
  actualOwnerMinutes: number;
  estimatedGrossProfitCents: number;
  estimatedGrossMarginPct: number;
  effectiveGrossPerHourCents: number;
  estimatedNetAfterOwnerTimeCents: number;
  estimatedNetMarginPct: number;
  variances: Record<string, { estimate: number; actual: number; delta: number; ratio: number | null }>;
};

const STATUS_STYLE: Record<string, string> = {
  lead: "bg-slate-100 text-slate-700",
  scoped: "bg-slate-100 text-slate-700",
  quoted: "bg-blue-100 text-blue-800",
  scheduled: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-amber-100 text-amber-800",
  completed: "bg-emerald-100 text-emerald-800",
  invoiced: "bg-purple-100 text-purple-800",
  paid: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function JobsPage() {
  return (
    <AdminGate title="Jobs">
      <OwnerNav />
      <JobsInner />
    </AdminGate>
  );
}

function JobsInner() {
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"jobs" | "insights">("jobs");
  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      {selected ? (
        <JobDetail id={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <Segmented label="Jobs view" value={tab} onChange={setTab} options={[{ value: "jobs", label: "Jobs" }, { value: "insights", label: "Pricing insights" }]} />
          <div className="mt-4">{tab === "jobs" ? <JobList onOpen={setSelected} /> : <Insights />}</div>
        </>
      )}
    </main>
  );
}

function JobList({ onOpen }: { onOpen: (id: string) => void }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(() => {
    setError("");
    adminFetch<Job[]>("/jobs").then(setJobs).catch((e) => setError(describeError(e)));
  }, []);
  useEffect(load, [load]);

  if (error) return <div className="space-y-2"><Notice tone="error">{error}</Notice><Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Retry</Button></div>;
  if (!jobs) return <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading jobs…</div>;
  if (!jobs.length) return <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center"><p className="font-semibold text-slate-800">No jobs yet</p><p className="mt-1 text-sm text-slate-500">Build your first job to see quotes, actuals and invoices here.</p><Link href="/admin/job-builder" className="mt-4 inline-flex h-12 items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white">Open Job Builder</Link></div>;
  return (
    <ul className="space-y-2">
      {jobs.map((j) => (
        <li key={j.id}>
          <button type="button" onClick={() => onOpen(j.id)} className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
            <span>
              <span className="block font-semibold text-slate-900">{j.title}</span>
              <span className="block text-xs text-slate-500">{[j.customerLabel, j.zip, new Date(j.createdAt).toLocaleDateString()].filter(Boolean).join(" · ")}{j.source === "synthetic" ? " · SYNTHETIC" : ""}</span>
            </span>
            <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[j.status] ?? "bg-slate-100")}>{j.status.replace("_", " ")}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function JobDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const load = useCallback(() => {
    adminFetch<Detail>(`/jobs/${id}`).then((d) => { setDetail(d); setError(""); }).catch((e) => setError(describeError(e)));
  }, [id]);
  useEffect(load, [load]);

  async function run<T>(label: string, fn: () => Promise<T>, success: string) {
    setBusy(label);
    setNotice(null);
    try {
      await fn();
      setNotice({ tone: "success", text: success });
      load();
    } catch (e) {
      setNotice({ tone: "error", text: describeError(e) });
    } finally {
      setBusy("");
    }
  }

  if (error) return <div className="space-y-2"><Button variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /> Jobs</Button><Notice tone="error">{error}</Notice></div>;
  if (!detail) return <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;

  const { job, quote, versions, invoices, payments } = detail;
  const latest = versions[versions.length - 1];
  const invoice = invoices[invoices.length - 1];

  async function copyLink() {
    if (!quote) return;
    await run("send", async () => {
      const res = await adminFetch<{ customerPath: string }>(`/quotes/${quote.id}/send`, { method: "POST", body: {} });
      const url = `${window.location.origin}${res.customerPath}`;
      try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy this customer link", url); }
    }, "Quote marked sent and customer link copied.");
  }

  return (
    <div className="space-y-5">
      <Button variant="ghost" onClick={onBack} className="-ml-2"><ArrowLeft className="h-4 w-4" /> Jobs</Button>
      <header>
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-extrabold text-slate-900">{job.title}</h1>
          <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", STATUS_STYLE[job.status])}>{job.status.replace("_", " ")}</span>
        </div>
        <p className="text-xs text-slate-500">{[job.customerLabel, job.zip, job.bookingId ? `Booking #${job.bookingId}` : null].filter(Boolean).join(" · ")}</p>
      </header>
      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <section aria-labelledby="quote-h" className="space-y-2">
        <h2 id="quote-h" className="text-lg font-bold">Quote</h2>
        {!latest ? <p className="text-sm text-slate-500">No quote yet. Use the Job Builder to create one.</p> : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Customer" value={money(latest.customerAmountCents)} sub={`v${latest.version}${latest.acceptedAt ? " · accepted" : ""}`} />
              <Stat label="Recommended" value={money(latest.recommendedCents)} tone="muted" />
              <Stat label="Floor" value={money(latest.floorCents)} tone={latest.customerAmountCents < latest.floorCents ? "warn" : "muted"} />
            </div>
            <p className="text-xs text-slate-500">{versions.length} version{versions.length > 1 ? "s" : ""}. Each version keeps the config it was priced with (v{latest.configVersion}); later config changes never rewrite it.</p>
            {quote ? <Button variant="outline" className="h-12 w-full" disabled={busy === "send"} onClick={copyLink}>{busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} {quote.status === "draft" ? "Mark sent & copy customer link" : `Copy customer link (${quote.status})`}</Button> : null}
          </>
        )}
      </section>

      <ActualsForm jobId={id} existing={detail.actuals} disabled={!latest} onSaved={load} />

      <section aria-labelledby="inv-h" className="space-y-2">
        <h2 id="inv-h" className="text-lg font-bold">Invoice & payment</h2>
        {!invoice ? (
          <Button className="h-12 w-full" disabled={!latest || busy === "invoice"} onClick={() => run("invoice", () => adminFetch(`/jobs/${id}/invoice`, { method: "POST", body: {} }), "Invoice created from the quote.")}>
            {busy === "invoice" ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create invoice from quote
          </Button>
        ) : (
          <InvoiceCard invoice={invoice} payments={payments.filter((p) => p.invoiceId === invoice.id)} onChanged={load} />
        )}
        <p className="text-xs text-slate-500">Records what you tell it. It does not verify Zelle, Venmo, Apple Pay or cash receipts, and applies tax only if you configure it.</p>
      </section>
    </div>
  );
}

function ActualsForm({ jobId, existing, disabled, onSaved }: { jobId: string; existing: Detail["actuals"]; disabled: boolean; onSaved: () => void }) {
  const a = existing?.actuals ?? {};
  const [f, setF] = useState({
    laborMinutes: String(a.laborMinutes ?? ""),
    helperMinutes: String(a.helperMinutes ?? ""),
    travelMinutes: String(a.travelMinutes ?? ""),
    mileage: String(a.mileage ?? ""),
    materials: a.actualMaterialsCents ? String(a.actualMaterialsCents / 100) : "",
    otherSpend: a.otherSpendCents ? String(a.otherSpendCents / 100) : "",
    collected: a.collectedCents ? String(a.collectedCents / 100) : "",
    tip: a.tipCents ? String(a.tipCents / 100) : "",
    method: (a.paymentMethod as string) ?? "cash",
    notes: a.notes ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const n = (s: string) => (s.trim() === "" ? 0 : Number(s));
  const cents = (s: string) => Math.round(n(s) * 100);
  const invalid = f.laborMinutes.trim() === "" || [f.laborMinutes, f.helperMinutes, f.travelMinutes, f.mileage, f.materials, f.otherSpend, f.collected, f.tip].some((v) => v.trim() !== "" && !(Number(v) >= 0));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await adminFetch(`/jobs/${jobId}/actuals`, { method: "POST", body: { laborMinutes: n(f.laborMinutes), helperMinutes: n(f.helperMinutes), travelMinutes: n(f.travelMinutes), mileage: n(f.mileage), actualMaterialsCents: cents(f.materials), otherSpendCents: cents(f.otherSpend), collectedCents: cents(f.collected), tipCents: cents(f.tip), ...(cents(f.collected) > 0 ? { paymentMethod: f.method } : {}), ...(f.notes.trim() ? { notes: f.notes.trim() } : {}) } });
      setMsg({ tone: "success", text: "Actuals saved." });
      onSaved();
    } catch (e) {
      setMsg({ tone: "error", text: describeError(e) });
    } finally {
      setSaving(false);
    }
  }
  const field = (key: keyof typeof f, label: string, hint?: string) => (
    <Field label={label} htmlFor={`act-${key}`} hint={hint}><input id={`act-${key}`} inputMode="decimal" className={inputClass} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} /></Field>
  );
  const p = existing?.profitability;
  return (
    <section aria-labelledby="act-h" className="space-y-3">
      <h2 id="act-h" className="text-lg font-bold">Actuals</h2>
      {disabled ? <p className="text-sm text-slate-500">Create a quote first so actuals can be compared with the estimate.</p> : null}
      <div className="grid grid-cols-2 gap-3">
        {field("laborMinutes", "On-site minutes")}
        {field("helperMinutes", "Helper minutes")}
        {field("travelMinutes", "Drive minutes (total)")}
        {field("mileage", "Miles (round trip)")}
        {field("materials", "Materials spent ($)")}
        {field("otherSpend", "Other spend ($)")}
        {field("collected", "Collected ($)")}
        {field("tip", "Tip ($)", "Not counted as revenue")}
      </div>
      <Field label="Payment method"><Segmented label="Payment method" columns={3} value={f.method} onChange={(v) => setF({ ...f, method: v })} options={[{ value: "cash", label: "Cash" }, { value: "zelle", label: "Zelle" }, { value: "venmo", label: "Venmo" }, { value: "apple_pay", label: "Apple Pay" }, { value: "other", label: "Other" }]} /></Field>
      <Field label="Notes" htmlFor="act-notes"><textarea id="act-notes" className="min-h-[72px] w-full rounded-xl border border-slate-300 p-3 text-base" value={f.notes} maxLength={2000} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
      <Button className="h-12 w-full" disabled={saving || invalid || disabled} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save actuals</Button>
      {p ? (
        <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Profitability (estimate)</p>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Quoted vs collected" value={`${money(p.quotedCents)} → ${money(p.collectedCents)}`} />
            <Stat label="Gross profit" value={money(p.estimatedGrossProfitCents)} sub={`${(p.estimatedGrossMarginPct * 100).toFixed(0)}% of collected`} />
            <Stat label="Effective gross/hr" value={money(p.effectiveGrossPerHourCents)} sub={`${p.actualOwnerMinutes} min of your time`} />
            <Stat label="After valuing your time" value={money(p.estimatedNetAfterOwnerTimeCents)} tone={p.estimatedNetAfterOwnerTimeCents < 0 ? "warn" : "default"} sub={`${(p.estimatedNetMarginPct * 100).toFixed(0)}%`} />
          </div>
          <ul className="space-y-1 text-xs text-slate-600">
            {Object.entries(p.variances).filter(([k]) => k !== "priceVsCollectedCents").map(([k, v]) => (
              <li key={k} className="flex justify-between"><span>{k.replace(/([A-Z])/g, " $1").toLowerCase()}</span><span>est {k.endsWith("Cents") ? money(v.estimate) : v.estimate} → actual {k.endsWith("Cents") ? money(v.actual) : v.actual}</span></li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">{p.note}</p>
        </div>
      ) : null}
    </section>
  );
}

function InvoiceCard({ invoice, payments, onChanged }: { invoice: Invoice; payments: Payment[]; onChanged: () => void }) {
  const [amount, setAmount] = useState("");
  const [tip, setTip] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const balance = invoice.totalCents - invoice.paidCents;

  async function call(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: success });
      setAmount("");
      setTip("");
      onChanged();
    } catch (e) {
      setMsg({ tone: "error", text: describeError(e) });
    } finally {
      setBusy(false);
    }
  }
  const dollars = Number(amount);
  const amountOk = amount.trim() !== "" && dollars > 0 && Math.round(dollars * 100) <= balance;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center justify-between">
        <p className="font-bold">{invoice.invoiceNumber}</p>
        <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", invoice.status === "paid" ? "bg-green-100 text-green-800" : invoice.status === "void" ? "bg-red-100 text-red-800" : "bg-slate-100 text-slate-700")}>{invoice.status.replace("_", " ")}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Total" value={money(invoice.totalCents)} sub={invoice.taxCents ? `incl. ${money(invoice.taxCents)} tax` : "no tax configured"} />
        <Stat label="Paid" value={money(invoice.paidCents)} />
        <Stat label="Balance" value={money(balance)} tone={balance > 0 ? "warn" : "good"} />
      </div>
      {payments.length ? <ul className="space-y-1 text-xs text-slate-600">{payments.map((p) => <li key={p.id} className="flex justify-between"><span>{new Date(p.receivedAt).toLocaleDateString()} · {p.method.replace("_", " ")}{p.tipCents ? ` · tip ${money(p.tipCents)}` : ""}</span><span>{money(p.amountCents)}</span></li>)}</ul> : null}
      {invoice.status !== "paid" && invoice.status !== "void" ? (
        <div className="space-y-2">
          {!invoice.sentAt ? <Button variant="outline" className="h-11 w-full" disabled={busy} onClick={() => call(() => adminFetch(`/invoices/${invoice.id}/send`, { method: "POST", body: {} }), "Marked as sent (nothing was emailed).")}>Mark as sent</Button> : null}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Payment ($)" htmlFor="pay-amt"><input id="pay-amt" inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance / 100)} /></Field>
            <Field label="Tip ($)" htmlFor="pay-tip"><input id="pay-tip" inputMode="decimal" className={inputClass} value={tip} onChange={(e) => setTip(e.target.value)} /></Field>
          </div>
          <Segmented label="Payment method" columns={3} value={method} onChange={setMethod} options={[{ value: "cash", label: "Cash" }, { value: "zelle", label: "Zelle" }, { value: "venmo", label: "Venmo" }, { value: "apple_pay", label: "Apple Pay" }, { value: "other", label: "Other" }]} />
          {amount.trim() !== "" && !amountOk ? <Notice tone="warn">Enter an amount between $0.01 and the balance of {money(balance)}. Tips are entered separately.</Notice> : null}
          <Button className="h-12 w-full" disabled={busy || !amountOk} onClick={() => call(() => adminFetch(`/invoices/${invoice.id}/payments`, { method: "POST", body: { amountCents: Math.round(dollars * 100), method, tipCents: Math.round(Number(tip || 0) * 100) } }), "Payment recorded.")}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Record payment</Button>
          {invoice.paidCents === 0 ? <Button variant="ghost" className="h-11 w-full text-red-700" disabled={busy} onClick={() => call(() => adminFetch(`/invoices/${invoice.id}/void`, { method: "POST", body: {} }), "Invoice voided.")}>Void invoice</Button> : null}
        </div>
      ) : null}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </div>
  );
}

function Insights() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [synthetic, setSynthetic] = useState(false);
  useEffect(() => {
    setData(null);
    adminFetch<any>(`/intelligence?includeSynthetic=${synthetic}`).then(setData).catch((e) => setError(describeError(e)));
  }, [synthetic]);
  if (error) return <Notice tone="error">{error}</Notice>;
  if (!data) return <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  const r = data.report;
  const ratio = (s: any) => (s.median === null ? "—" : `${(s.median * 100).toFixed(0)}% (n=${s.n})`);
  return (
    <div className="space-y-3">
      <Notice tone="info">{r.note}</Notice>
      <label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5" checked={synthetic} onChange={(e) => setSynthetic(e.target.checked)} /> Include synthetic/test jobs</label>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Completed jobs used" value={r.sampleSize} sub={r.syntheticExcluded ? `${r.syntheticExcluded} synthetic excluded` : undefined} />
        <Stat label="Labor: actual/estimate" value={ratio(r.ratios.laborMinutes)} sub="median" />
        <Stat label="Travel: actual/estimate" value={ratio(r.ratios.travelMinutes)} sub="median" />
        <Stat label="Materials: actual/estimate" value={ratio(r.ratios.materialsCents)} sub="median" />
        <Stat label="Collected / quoted" value={ratio(r.ratios.collectedOverQuoted)} sub="median" />
        <Stat label="Effective gross/hr" value={r.effectiveGrossPerHourCents.median === null ? "—" : money(Math.round(r.effectiveGrossPerHourCents.median))} sub="median" />
      </div>
      {r.suggestions.map((s: any) => <Notice key={s.metric} tone="warn">{s.message}</Notice>)}
    </div>
  );
}
