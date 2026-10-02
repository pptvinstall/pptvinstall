import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Copy, FileDown, Loader2, RefreshCw } from "lucide-react";

import AdminGate from "@/components/jobos/AdminGate";
import OwnerNav from "@/components/jobos/OwnerNav";
import { Field, Notice, Segmented, Stat, inputClass } from "@/components/jobos/controls";
import EconomicsPanel, { type PanelEconomics, type PanelPricing } from "@/components/jobos/EconomicsPanel";
import { Button } from "@/components/ui/button";
import { adminDownload, adminFetch, adminObjectUrl, describeError, money } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import { isComparableCatalogSample, SHADOW_FILTERS, shadowSampleMatches, type ShadowFilter } from "@shared/jobos/shadowFilters";
import type { ShadowSampleRecord } from "@shared/jobos/types";

type Contact = { name: string; phone?: string; email?: string; street?: string; city?: string; state?: string; zip?: string };
type Job = { id: string; title: string; status: string; customerLabel: string | null; zip: string | null; bookingId: number | null; createdAt: string; source: string; contact?: Contact | null };
type Media = { id: string; hint: string; width: number; height: number; analysisStatus: string; kind: string | null; summary: string | null; createdAt: string };
type Version = {
  id: string;
  version: number;
  customerAmountCents: number;
  recommendedCents: number;
  floorCents: number;
  discountCents: number;
  configVersion: number;
  createdAt: string;
  acceptedAt: string | null;
  snapshot?: { pricingMode?: string; composition?: { pricing?: PanelPricing; economics?: PanelEconomics } };
};
type Invoice = { id: string; invoiceNumber: string; status: string; totalCents: number; paidCents: number; taxCents: number; sentAt: string | null; dueDate?: string | null; notes?: string | null };
type Payment = { id: string; invoiceId: string; amountCents: number; method: string; tipCents: number; receivedAt: string };
type Detail = {
  job: Job;
  quote: { id: string; status: string; shareToken: string; quoteNumber?: number | null } | null;
  versions: Version[];
  invoices: Invoice[];
  payments: Payment[];
  actuals: { actuals: Record<string, any>; profitability: Profit | null } | null;
  media?: Media[];
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
  const [tab, setTab] = useState<"jobs" | "website" | "insights">("jobs");
  return (
    <main className="mx-auto max-w-2xl px-4 py-4">
      {selected ? (
        <JobDetail id={selected} onBack={() => setSelected(null)} />
      ) : (
        <>
          <Segmented label="Jobs view" columns={3} value={tab} onChange={setTab} options={[{ value: "jobs", label: "Jobs" }, { value: "website", label: "Website quotes" }, { value: "insights", label: "Insights" }]} />
          <div className="mt-4">{tab === "jobs" ? <JobList onOpen={setSelected} /> : tab === "website" ? <WebsiteQuotes onOpenJob={setSelected} /> : <Insights />}</div>
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

  async function download(label: string, path: string, fallback: string) {
    setBusy(label);
    setNotice(null);
    try {
      await adminDownload(path, fallback);
    } catch (e) {
      setNotice({ tone: "error", text: describeError(e) });
    } finally {
      setBusy("");
    }
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

      <CustomerSection job={job} onSaved={load} />
      {detail.media?.length ? <JobPhotos media={detail.media} /> : null}

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
            {latest.snapshot?.composition?.pricing && latest.snapshot.composition.pricing.why ? (
              <details className="rounded-2xl border border-slate-200 p-3">
                <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold">Economics for v{latest.version}</summary>
                <div className="mt-2">
                  <EconomicsPanel pricing={latest.snapshot.composition.pricing} economics={latest.snapshot.composition.economics ?? null} customerCents={latest.customerAmountCents} customerSub={latest.snapshot.pricingMode === "dynamic" ? "Engine price" : "Catalog / owner price"} />
                </div>
              </details>
            ) : null}
            {quote ? <Button variant="outline" className="h-12 w-full" disabled={busy === "send"} onClick={copyLink}>{busy === "send" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} {quote.status === "draft" ? "Mark sent & copy customer link" : `Copy customer link (${quote.status})`}</Button> : null}
            {quote ? (
              <Button variant="outline" className="h-12 w-full" data-testid="estimate-pdf" disabled={busy === "estimate-pdf"} onClick={() => download("estimate-pdf", `/quotes/${quote.id}/estimate.pdf`, "PPTVInstall-Estimate.pdf")}>
                {busy === "estimate-pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Estimate PDF{versions.length > 1 ? ` (${quote.status === "accepted" ? "accepted version" : `v${latest.version}`})` : ""}
              </Button>
            ) : null}
          </>
        )}
      </section>

      <ActualsForm jobId={id} existing={detail.actuals} disabled={!latest} onSaved={load} />

      <section aria-labelledby="inv-h" className="space-y-2">
        <h2 id="inv-h" className="text-lg font-bold">Invoice & payment</h2>
        {!invoice ? (
          <NewInvoice disabled={!latest} busy={busy === "invoice"} onCreate={(body) => run("invoice", () => adminFetch(`/jobs/${id}/invoice`, { method: "POST", body }), "Invoice created from the quote.")} />
        ) : (
          <InvoiceCard invoice={invoice} payments={payments.filter((p) => p.invoiceId === invoice.id)} onChanged={load} onDownload={download} busyLabel={busy} />
        )}
        <p className="text-xs text-slate-500">Records what you tell it. It does not verify Zelle, Venmo, Apple Pay or cash receipts, and applies tax only if you configure it.</p>
      </section>
    </div>
  );
}

/** Name and service address printed on estimates and invoices. A linked booking's details take priority. */
function CustomerSection({ job, onSaved }: { job: Job; onSaved: () => void }) {
  const c = job.contact ?? null;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: c?.name ?? job.customerLabel ?? "", phone: c?.phone ?? "", email: c?.email ?? "", street: c?.street ?? "", city: c?.city ?? "", state: c?.state ?? "GA", zip: c?.zip ?? job.zip ?? "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const emailOk = !f.email.trim() || /^\S+@\S+\.\S+$/.test(f.email.trim());
  const zipOk = !f.zip.trim() || /^\d{5}$/.test(f.zip.trim());
  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const body: Record<string, string> = { name: f.name.trim() };
      for (const k of ["phone", "email", "street", "city", "state", "zip"] as const) if (f[k].trim()) body[k] = f[k].trim();
      await adminFetch(`/jobs/${job.id}/contact`, { method: "PATCH", body });
      setMsg({ tone: "success", text: "Customer details saved." });
      setOpen(false);
      onSaved();
    } catch (e) {
      setMsg({ tone: "error", text: describeError(e) });
    } finally {
      setSaving(false);
    }
  }
  const summary = c ? [c.name, c.street, [c.city, c.state].filter(Boolean).join(", ")].filter(Boolean).join(" · ") : null;
  const input = (key: keyof typeof f, label: string, extra: Record<string, string> = {}) => (
    <Field label={label} htmlFor={`ct-${key}`}><input id={`ct-${key}`} className={inputClass} value={f[key]} onChange={(e) => setF({ ...f, [key]: e.target.value })} {...extra} /></Field>
  );
  return (
    <section aria-labelledby="cust-h" className="space-y-2" data-testid="customer-section">
      <div className="flex items-center justify-between gap-2">
        <h2 id="cust-h" className="text-lg font-bold">Customer</h2>
        {!open ? <Button variant="ghost" className="h-11" onClick={() => setOpen(true)}>{c ? "Edit" : "Add details"}</Button> : null}
      </div>
      {!open ? (
        <p className="text-sm text-slate-600">{summary ?? "No name or address yet. Estimates and invoices will show the job label only."}</p>
      ) : (
        <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
          {job.bookingId ? <Notice tone="info">This job is linked to booking #{job.bookingId}. Documents use the booking's name and address when it has them.</Notice> : null}
          {input("name", "Name", { autoComplete: "name" })}
          <div className="grid grid-cols-2 gap-3">
            {input("phone", "Phone", { inputMode: "tel", autoComplete: "tel" })}
            {input("email", "Email", { inputMode: "email", autoComplete: "email" })}
          </div>
          {input("street", "Service address", { autoComplete: "street-address" })}
          <div className="grid grid-cols-[1fr_4.5rem_6rem] gap-2">
            {input("city", "City")}
            {input("state", "State", { maxLength: "2" })}
            {input("zip", "ZIP", { inputMode: "numeric", maxLength: "5" })}
          </div>
          {!emailOk || !zipOk ? <Notice tone="warn">{!emailOk ? "Check the email address. " : ""}{!zipOk ? "ZIP should be 5 digits." : ""}</Notice> : null}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-12" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="h-12" disabled={saving || !f.name.trim() || !emailOk || !zipOk} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save</Button>
          </div>
          <p className="text-xs text-slate-500">Phone and email appear on your copy of documents. The customer's share-link estimate never shows them.</p>
        </div>
      )}
      {msg ? <Notice tone={msg.tone}>{msg.text}</Notice> : null}
    </section>
  );
}

/** Photos attached from intake. Loaded with the owner token; never a public URL. */
function JobPhotos({ media }: { media: Media[] }) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    let alive = true;
    const made: string[] = [];
    Promise.all(
      media.slice(0, 12).map(async (m) => {
        try {
          const u = await adminObjectUrl(`/media/${m.id}?variant=thumb`);
          made.push(u);
          return [m.id, u] as const;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      if (alive) setUrls(Object.fromEntries(pairs.filter((p): p is readonly [string, string] => p !== null)));
    });
    return () => {
      alive = false;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [media]);
  async function openFull(id: string) {
    try {
      const u = await adminObjectUrl(`/media/${id}`);
      window.open(u, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(u), 60_000);
    } catch {
      /* thumbnail stays */
    }
  }
  return (
    <section aria-labelledby="photos-h" className="space-y-2">
      <h2 id="photos-h" className="text-lg font-bold">Photos</h2>
      <ul className="grid grid-cols-4 gap-2" data-testid="job-photos">
        {media.map((m) => (
          <li key={m.id}>
            <button type="button" onClick={() => openFull(m.id)} className="block aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100" aria-label={m.summary ?? `Photo (${m.hint})`}>
              {urls[m.id] ? <img src={urls[m.id]} alt="" className="h-full w-full object-cover" /> : null}
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500">Private to you. Stored without location or camera data.</p>
    </section>
  );
}

function NewInvoice({ disabled, busy, onCreate }: { disabled: boolean; busy: boolean; onCreate: (body: { dueDate?: string; notes?: string }) => void }) {
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  return (
    <div className="space-y-3">
      <details className="rounded-2xl border border-slate-200 p-3">
        <summary className="min-h-[44px] cursor-pointer py-2 text-sm font-semibold">Due date and note (optional)</summary>
        <div className="mt-2 space-y-3">
          <Field label="Due date" htmlFor="inv-due" hint="Blank = your default from Economics → Documents"><input id="inv-due" type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field>
          <Field label="Note to the customer" htmlFor="inv-notes"><textarea id="inv-notes" className="min-h-[72px] w-full rounded-xl border border-slate-300 p-3 text-base" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Thank you for your business!" /></Field>
        </div>
      </details>
      <Button className="h-12 w-full" disabled={disabled || busy} onClick={() => onCreate({ ...(dueDate ? { dueDate } : {}), ...(notes.trim() ? { notes: notes.trim() } : {}) })}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create invoice from quote
      </Button>
    </div>
  );
}

function ActualsForm({ jobId, existing, disabled, onSaved }:{ jobId: string; existing: Detail["actuals"]; disabled: boolean; onSaved: () => void }) {
  const a = existing?.actuals ?? {};
  const [f, setF] = useState({
    laborMinutes: String(a.laborMinutes ?? ""),
    helperMinutes: String(a.helperMinutes ?? ""),
    helperPaid: a.helperPaidCents !== undefined ? String(a.helperPaidCents / 100) : "",
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
  const invalid = f.laborMinutes.trim() === "" || [f.laborMinutes, f.helperMinutes, f.helperPaid, f.travelMinutes, f.mileage, f.materials, f.otherSpend, f.collected, f.tip].some((v) => v.trim() !== "" && !(Number(v) >= 0));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await adminFetch(`/jobs/${jobId}/actuals`, { method: "POST", body: { laborMinutes: n(f.laborMinutes), helperMinutes: n(f.helperMinutes), ...(f.helperPaid.trim() !== "" ? { helperPaidCents: cents(f.helperPaid) } : {}), travelMinutes: n(f.travelMinutes), mileage: n(f.mileage), actualMaterialsCents: cents(f.materials), otherSpendCents: cents(f.otherSpend), collectedCents: cents(f.collected), tipCents: cents(f.tip), ...(cents(f.collected) > 0 ? { paymentMethod: f.method } : {}), ...(f.notes.trim() ? { notes: f.notes.trim() } : {}) } });
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
        {field("helperPaid", "Helper paid ($)", "Blank = use your helper rule")}
        {field("travelMinutes", "Drive minutes (total)")}
        {field("mileage", "Miles (round trip)")}
        {field("materials", "Materials spent ($)")}
        {field("otherSpend", "Other spend ($)")}
        {field("collected", "Collected ($)")}
        {field("tip", "Tip ($)", "Not counted as revenue")}
      </div>
      <Field label="Payment method"><Segmented label="Payment method" columns={3} value={f.method} onChange={(v) => setF({ ...f, method: v })} options={[{ value: "cash", label: "Cash" }, { value: "zelle", label: "Zelle" }, { value: "venmo", label: "Venmo" }, { value: "apple_pay", label: "Apple Pay" }, { value: "card", label: "Card" }, { value: "other", label: "Other" }]} /></Field>
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
              <li key={k} className="flex justify-between gap-2"><span>{k.replace(/(Cents|Pct)$/, "").replace(/([A-Z])/g, " $1").toLowerCase()}</span><span>est {fmtVar(k, v.estimate)} → actual {fmtVar(k, v.actual)}</span></li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">{p.note}</p>
        </div>
      ) : null}
    </section>
  );
}

function fmtVar(key: string, v: number) {
  if (key.endsWith("Cents")) return money(Math.round(v));
  if (key.endsWith("Pct")) return `${(v * 100).toFixed(0)}%`;
  return Math.round(v * 10) / 10;
}

type ShadowReport = { samples: ShadowSampleRecord[]; stats: { count: number; comparableCount: number; shownBelowFloor: number; shownBelowRecommended: number; medianShownCents: number | null; medianRecommendedCents: number | null; medianGapCents: number | null; medianEffectivePerHourAtShownCents: number | null; statusCounts: Record<string, number> }; note: string };

const STATUS_SHORT: Record<string, string> = { priced: "Priced", estimate_with_confirmation: "Estimate", manual_review_required: "Review", not_supported: "Not supported" };

/** Shadow mode: website quotes, what the customer saw vs what the engine recommends. Owner-only. */
function WebsiteQuotes({ onOpenJob }: { onOpenJob: (id: string) => void }) {
  const [data, setData] = useState<ShadowReport | null>(null);
  const [mode, setMode] = useState("");
  const [targetPerHourCents, setTargetPerHourCents] = useState(0);
  const [filters, setFilters] = useState<ShadowFilter[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const load = useCallback(() => {
    setError("");
    Promise.all([adminFetch<ShadowReport>("/shadow-samples?limit=100"), adminFetch<{ config: { pricingMode: string; labor: { targetLaborPerHourCents: number } } }>("/config")])
      .then(([r, c]) => {
        setData(r);
        setMode(c.config.pricingMode);
        setTargetPerHourCents(c.config.labor.targetLaborPerHourCents);
      })
      .catch((e) => setError(describeError(e)));
  }, []);
  useEffect(load, [load]);
  async function toJob(id: string) {
    setBusy(id);
    try {
      const job = await adminFetch<{ id: string }>(`/shadow-samples/${id}/job`, { method: "POST", body: {} });
      onOpenJob(job.id);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy("");
    }
  }
  if (error) return <div className="space-y-2"><Notice tone="error">{error}</Notice><Button variant="outline" onClick={load}><RefreshCw className="h-4 w-4" /> Retry</Button></div>;
  if (!data) return <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>;
  const st = data.stats;
  const filtered = data.samples.filter((sample) => shadowSampleMatches(sample, filters, targetPerHourCents));
  const toggleFilter = (filter: ShadowFilter) => setFilters((selected) => selected.includes(filter) ? selected.filter((x) => x !== filter) : [...selected, filter]);
  return (
    <div className="space-y-3" data-testid="website-quotes">
      {mode === "legacy" ? <Notice tone="warn">Shadow comparison is off. Switch pricing mode to Shadow under Economics: customers keep seeing catalog prices and each website quote is priced by the engine here.</Notice> : <Notice tone="info">{mode === "shadow" ? "Shadow mode: customers see catalog prices. " : "Dynamic mode: customers see engine prices. "}{data.note}</Notice>}
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Website quotes" value={st.count} sub={`${st.comparableCount} fully priced by the catalog`} />
        <Stat label="Catalog under floor" value={`${st.shownBelowFloor} / ${st.comparableCount}`} tone={st.shownBelowFloor ? "warn" : "default"} />
        <Stat label="Median catalog" value={st.medianShownCents === null ? "—" : money(st.medianShownCents)} />
        <Stat label="Median engine" value={st.medianRecommendedCents === null ? "—" : money(st.medianRecommendedCents)} sub={st.medianGapCents === null ? undefined : `gap ${money(st.medianGapCents)}`} />
        <Stat label="Your $/hr at catalog" value={st.medianEffectivePerHourAtShownCents === null ? "—" : `${money(st.medianEffectivePerHourAtShownCents)}/hr`} sub="median, after cash costs" />
        <Stat label="Needs review" value={(st.statusCounts.manual_review_required ?? 0) + (st.statusCounts.estimate_with_confirmation ?? 0)} sub="estimate or review" />
      </div>
      {data.samples.length ? <section className="space-y-2 rounded-2xl border border-slate-200 p-3" aria-label="Website quote filters">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{filtered.length} of {data.samples.length} recent quotes</p>
          {filters.length ? <Button variant="ghost" className="h-11" onClick={() => setFilters([])}>Clear filters</Button> : null}
        </div>
        <p className="text-xs text-slate-500">Matches all selected filters. Rate target: {money(targetPerHourCents)}/hr from your current rules. Price filters exclude incomplete catalog totals and engine-priced samples.</p>
        <div className="flex flex-wrap gap-2">
          {SHADOW_FILTERS.map((filter) => <Button key={filter.id} variant={filters.includes(filter.id) ? "default" : "outline"} className="min-h-11 h-auto whitespace-normal px-3 py-2 text-left text-xs" aria-pressed={filters.includes(filter.id)} onClick={() => toggleFilter(filter.id)}>{filter.label} ({data.samples.filter((sample) => shadowSampleMatches(sample, [filter.id], targetPerHourCents)).length})</Button>)}
        </div>
      </section> : null}
      {!data.samples.length ? <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No website quotes recorded yet.</p> : null}
      {data.samples.length && !filtered.length ? <p className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No quotes match these filters.</p> : null}
      <ul className="space-y-2">
        {filtered.map((x) => (
          <li key={x.id} className="rounded-2xl border border-slate-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-900">{money(x.shownCents)} <span className="text-xs font-normal text-slate-500">{x.summary.shownSource === "catalog" ? "catalog shown" : "engine shown"}</span></p>
                <p className="text-xs text-slate-500">{[x.zip, x.day, STATUS_SHORT[x.status] ?? x.status, x.summary.complexity, `${x.summary.confidence} confidence`].filter(Boolean).join(" · ")}</p>
              </div>
              <span className={cn("shrink-0 rounded-full px-2 py-1 text-xs font-semibold", !isComparableCatalogSample(x) || x.shownCents < x.floorCents ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800")}>{!isComparableCatalogSample(x) ? "not comparable" : x.shownCents < x.floorCents ? "under floor" : "above floor"}</span>
            </div>
            {x.summary.catalogHasCustomQuoteLines ? <p className="mt-2 text-xs font-semibold text-amber-800">Catalog leaves some work unpriced. The shown total is incomplete; confirm that scope before choosing a price.</p> : null}
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-600">
              <p>V2 floor<br /><strong>{money(x.floorCents)}</strong></p>
              <p>Recommended<br /><strong>{money(x.recommendedCents)}</strong></p>
              <p>Premium<br /><strong>{money(x.summary.premiumCents)}</strong></p>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <p>On-site: {Math.round(x.summary.onsiteMinutes)} min</p>
              <p>Your total time: {Math.round(x.summary.totalOwnerMinutes)} min</p>
              <p>Helper: {Math.round(x.summary.helperMinutes)} min</p>
              <p>Materials at cost: {money(x.summary.materialsCostCents)}</p>
              <p>Travel cost: {money(x.summary.travelCostCents)}</p>
              <p>Travel: {x.summary.travelSource.replace(/_/g, " ")}</p>
            </div>
            <table className="mt-3 w-full text-xs text-slate-600">
              <caption className="mb-1 text-left text-slate-500">Estimated economics. Net pays for your time; margin also deducts its configured value.</caption>
              <thead><tr><th className="py-1 text-left font-normal">At price</th><th className="py-1 text-right">Shown</th><th className="py-1 text-right">Recommended</th></tr></thead>
              <tbody>
                <tr><th className="py-1 text-left font-normal">Cost to serve</th><td className="text-right">{money(x.summary.atShown.costToServeCents)}</td><td className="text-right">{money(x.summary.atRecommended.costToServeCents)}</td></tr>
                <tr><th className="py-1 text-left font-normal">Owner net</th><td className="text-right">{money(x.summary.atShown.ownerNetCents)}</td><td className="text-right">{money(x.summary.atRecommended.ownerNetCents)}</td></tr>
                <tr><th className="py-1 text-left font-normal">Owner $/hr</th><td className="text-right">{money(x.summary.atShown.effectivePerHourCents)}</td><td className="text-right">{money(x.summary.atRecommended.effectivePerHourCents)}</td></tr>
                <tr><th className="py-1 text-left font-normal">Margin</th><td className="text-right">{(x.summary.atShown.marginPct * 100).toFixed(1)}%</td><td className="text-right">{(x.summary.atRecommended.marginPct * 100).toFixed(1)}%</td></tr>
                <tr><th className="py-1 text-left font-normal">Helper pay</th><td className="text-right">{money(x.summary.atShown.helperCostCents)}</td><td className="text-right">{money(x.summary.atRecommended.helperCostCents)}</td></tr>
              </tbody>
            </table>
            {x.summary.premiumFactors.length ? <p className="text-xs text-slate-500">Factors: {x.summary.premiumFactors.join(", ")}</p> : null}
            <details className="mt-1 text-xs text-slate-600">
              <summary className="min-h-[44px] cursor-pointer py-2 font-semibold">Why and open questions</summary>
              {x.summary.flags.length ? <ul className="mb-2 list-disc space-y-1 pl-5 text-amber-800">{x.summary.flags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}
              <ul className="list-disc space-y-1 pl-5">{x.summary.why.map((w) => <li key={w}>{w}</li>)}</ul>
              {x.summary.questions.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">{x.summary.questions.map((q) => <li key={q}>{q}</li>)}</ul> : null}
            </details>
            {x.jobId ? (
              <Button variant="outline" className="mt-1 h-11 w-full" onClick={() => onOpenJob(x.jobId!)}>Open job</Button>
            ) : (
              <Button variant="outline" className="mt-1 h-11 w-full" disabled={busy === x.id} onClick={() => toJob(x.id)}>{busy === x.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create job from this quote</Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvoiceCard({ invoice, payments, onChanged, onDownload, busyLabel }: { invoice: Invoice; payments: Payment[]; onChanged: () => void; onDownload: (label: string, path: string, fallback: string) => void; busyLabel: string }) {
  const [amount, setAmount] = useState("");
  const [tip, setTip] = useState("");
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState("");
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
  async function createCheckoutLink() {
    setBusy(true);
    setMsg(null);
    try {
      const link = await adminFetch<{ url: string; provider: string; amountCents: number }>(`/invoices/${invoice.id}/payment-link`, { method: "POST", body: {} });
      setCheckoutUrl(link.url);
      try { await navigator.clipboard.writeText(link.url); } catch { /* Clipboard can be blocked; the Open button remains. */ }
      setMsg({ tone: "success", text: "Secure card / Apple Pay payment link ready. Link copied when your browser allows it." });
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
      {invoice.dueDate || invoice.notes ? <p className="text-xs text-slate-500">{[invoice.dueDate ? `Due ${invoice.dueDate}` : null, invoice.notes ? `Note: ${invoice.notes}` : null].filter(Boolean).join(" · ")}</p> : null}
      {payments.length ? <ul className="space-y-1 text-xs text-slate-600">{payments.map((p) => <li key={p.id} className="flex justify-between"><span>{new Date(p.receivedAt).toLocaleDateString()} · {p.method.replace("_", " ")}{p.tipCents ? ` · tip ${money(p.tipCents)}` : ""}</span><span>{money(p.amountCents)}</span></li>)}</ul> : null}
      <div className={cn("grid gap-2", invoice.status === "paid" ? "grid-cols-2" : "grid-cols-1")}>
        <Button variant="outline" className="h-11" data-testid="invoice-pdf" disabled={busyLabel === "invoice-pdf"} onClick={() => onDownload("invoice-pdf", `/invoices/${invoice.id}/invoice.pdf`, `PPTVInstall-Invoice.pdf`)}>
          {busyLabel === "invoice-pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Invoice PDF
        </Button>
        {invoice.status === "paid" ? (
          <Button variant="outline" className="h-11" data-testid="receipt-pdf" disabled={busyLabel === "receipt-pdf"} onClick={() => onDownload("receipt-pdf", `/invoices/${invoice.id}/receipt.pdf`, `PPTVInstall-Receipt.pdf`)}>
            {busyLabel === "receipt-pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />} Paid receipt
          </Button>
        ) : null}
      </div>
      {invoice.status !== "paid" && invoice.status !== "void" ? (
        <div className="space-y-2">
          {!invoice.sentAt ? <Button variant="outline" className="h-11 w-full" disabled={busy} onClick={() => call(() => adminFetch(`/invoices/${invoice.id}/send`, { method: "POST", body: {} }), "Marked as sent (nothing was emailed).")}>Mark as sent</Button> : null}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Payment ($)" htmlFor="pay-amt"><input id="pay-amt" inputMode="decimal" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(balance / 100)} /></Field>
            <Field label="Tip ($)" htmlFor="pay-tip"><input id="pay-tip" inputMode="decimal" className={inputClass} value={tip} onChange={(e) => setTip(e.target.value)} /></Field>
          </div>
          <Segmented label="Payment method" columns={3} value={method} onChange={setMethod} options={[{ value: "cash", label: "Cash" }, { value: "zelle", label: "Zelle" }, { value: "venmo", label: "Venmo" }, { value: "apple_pay", label: "Apple Pay" }, { value: "card", label: "Card" }, { value: "other", label: "Other" }]} />
          <Button type="button" variant="outline" className="h-12 w-full" disabled={busy || balance <= 0} onClick={createCheckoutLink}>Create secure card / Apple Pay link</Button>
          {checkoutUrl ? <a className="flex h-11 w-full items-center justify-center rounded-xl border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-800" href={checkoutUrl} target="_blank" rel="noreferrer">Open secure checkout</a> : null}
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
