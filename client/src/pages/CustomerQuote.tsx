import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { Check, Download, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { businessPhone, telHref } from "@/components/ui/quote-tool/useQuoteState";

// Public customer quote page (/q/:token). Receives CUSTOMER-SAFE data only from the API:
// line items and a total. There is nothing internal to hide here because none is sent.

type View = { version: number; lines: Array<{ label: string; detail?: string; amountCents: number | null }>; totalCents: number; notes: string[]; requiresReview: boolean };
type State = { view: View; status: "sent" | "accepted" | "declined" | "expired" | "draft" | "superseded" };

const fmt = (cents: number) => `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 === 0 ? 0 : 2 })}`;

export default function CustomerQuotePage() {
  const [, params] = useRoute("/q/:token");
  const token = params?.token ?? "";
  const [data, setData] = useState<State | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    fetch(`/api/quotes/${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (cancelled) return;
        if (res.status === 404) return setState("missing");
        if (!res.ok) return setState("error");
        setData(await res.json());
        setState("ready");
      })
      .catch(() => !cancelled && setState("error"));
    return () => { cancelled = true; };
  }, [token]);

  async function accept() {
    setAccepting(true);
    setAcceptError("");
    try {
      const res = await fetch(`/api/quotes/${encodeURIComponent(token)}/accept`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      setAcceptError(`We couldn't record that. Please try again or call ${businessPhone}.`);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-extrabold text-slate-900">Your Picture Perfect TV Install quote</h1>
      {state === "loading" ? <div className="mt-8 flex items-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading your quote…</div> : null}
      {state === "missing" ? <p className="mt-6 rounded-2xl border border-slate-200 p-4 text-slate-700">We couldn't find that quote. The link may be incomplete. Please <a className="font-semibold underline" href={telHref}>call or text {businessPhone}</a>.</p> : null}
      {state === "error" ? <p role="alert" className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">Something went wrong loading your quote. Please refresh, or <a className="font-semibold underline" href={telHref}>call {businessPhone}</a>.</p> : null}
      {state === "ready" && data ? (
        <div className="mt-6 space-y-4">
          <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
            {data.view.lines.map((l, i) => (
              <li key={`${l.label}-${i}`} className="flex items-start justify-between gap-4 p-3 text-sm">
                <span className="text-slate-700">{l.detail ? <span className="block text-xs text-slate-400">{l.detail}</span> : null}{l.label}</span>
                <span className={`shrink-0 font-semibold ${l.amountCents !== null && l.amountCents < 0 ? "text-green-700" : "text-slate-900"}`}>{l.amountCents === null ? "We'll confirm" : fmt(l.amountCents)}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white"><span className="font-semibold">Total</span><span className="text-3xl font-extrabold">{fmt(data.view.totalCents)}</span></div>
          <a href={`/api/quotes/${encodeURIComponent(token)}/pdf`} className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"><Download className="h-4 w-4" /> Download estimate PDF</a>
          {data.view.requiresReview ? <p className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Some details will be confirmed before work begins. Anything unusual is discussed with you first.</p> : null}
          {data.view.notes.map((n) => <p key={n} className="text-xs text-slate-500">{n}</p>)}
          {data.status === "accepted" ? (
            <p role="status" className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 p-4 font-semibold text-green-800"><Check className="h-5 w-5" /> Thank you. This quote is accepted and we will be in touch to confirm your appointment.</p>
          ) : data.status === "sent" ? (
            <>
              {acceptError ? <p role="alert" className="text-sm text-red-600">{acceptError}</p> : null}
              <Button className="h-14 w-full text-base" disabled={accepting} onClick={accept}>{accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Accept this quote</Button>
              <p className="text-center text-xs text-slate-500">Questions? <a className="underline" href={telHref}>Call or text {businessPhone}</a></p>
            </>
          ) : <p className="text-sm text-slate-500">This quote is no longer open. Please contact us for an updated one.</p>}
        </div>
      ) : null}
    </main>
  );
}
