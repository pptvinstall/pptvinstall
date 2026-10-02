import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, Sparkles, Trash2, X } from "lucide-react";

import { Notice } from "@/components/jobos/controls";
import { Button } from "@/components/ui/button";
import { adminFetch, adminUpload, describeError } from "@/lib/adminApi";
import { cn } from "@/lib/utils";
import type { IntakeMetrics } from "@shared/jobos/intakeMetrics";

// Owner quick quote: paste the customer's message, add their screenshots and photos, tap Analyze, review what was
// found, confirm. Uploads go straight to private storage (admin token, no public URL). The server reads the images
// and text into facts; nothing here prices anything. Facts that need a person are unchecked until the owner
// confirms them, and only confirmed facts become scope. Works without AI: text keyword parsing + manual review.

type Src = { kind: string; id?: string };
type Fact = { value: unknown; confidence: number; sources: Src[]; observation?: string; requiresConfirmation: boolean; alternatives?: Array<{ value: unknown; confidence: number; sources: Src[] }> };
type ProposedTv = { key: string; origin: string; facts: Record<string, Fact | undefined> };
type ProposedItem = { key: string; origin: string; item: { category?: string; name?: string; action?: string; quantity?: number }; conditions: Record<string, Fact> };
type Proposal = {
  tvs: ProposedTv[];
  items: ProposedItem[];
  extras: Array<{ kind: string; qty: number }>;
  access: Record<string, Fact | undefined>;
  questions: Array<{ factKey?: string; owner: string; customer: string }>;
  conflicts: string[];
  receipts: unknown[];
  images: Array<{ imageId: string; kind: string; summary: string }>;
  extractedText: string;
  requiresOcrConfirmation?: boolean;
};
type Upload = { localId: string; file: File; url: string; hint: "photo" | "screenshot" | "label" | "receipt" | "other"; progress: number; mediaId?: string; error?: string };
type AnalyzeResponse = { intakeId: string; proposal: Proposal; images: Array<{ id: string; analysisStatus: string; summary: string | null }>; vision: { available: boolean; provider: string | null; error: string | null }; metrics: IntakeMetrics };
type IntakeStatus = { media: { enabled: boolean; durable: boolean; reason: string | null }; metrics: { sampleCount: number; zeroAiPercent: number | null; aiAssistedPercent: number | null; calls: number } };

export type ApplyMode = "confirm" | "edit" | "add";

const LABEL: Record<string, string> = { inches: "Size", sizeBand: "Size", modelNumber: "Model", location: "Location", wall: "Wall", mountSource: "Mount", mountType: "Mount type", power: "Power", wire: "Wires", tvRemoval: "Take down old TV" };
const VALUE: Record<string, Record<string, string>> = {
  mountSource: { customer: "customer has one", pptv: "we supply" },
  power: { existing: "outlet already there", outlet: "needs an outlet", unknown: "not sure" },
  location: { standard: "standard wall", fireplace: "above fireplace", high_wall: "high wall", ceiling: "ceiling" },
  wire: { visible: "visible", raceway: "raceway", in_wall: "hidden in wall" },
};
const show = (key: string, v: unknown) => (key === "inches" ? `${v}"` : key === "sizeBand" ? (v === "56+" ? '56"+' : '32"–55"') : typeof v === "boolean" ? (v ? "yes" : "no") : VALUE[key]?.[String(v)] ?? String(v));
const srcText = (srcs: Src[]) => {
  const kinds = Array.from(new Set(srcs.map((s) => (s.kind === "text" ? "message" : s.kind))));
  return kinds.join(" + ");
};

export default function QuickIntake({ aiAvailable, onApply }: { aiAvailable: boolean; onApply: (scope: any, intakeId: string, pending: number, mode: ApplyMode) => void }) {
  const [message, setMessage] = useState("");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [intakeId, setIntakeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [decisions, setDecisions] = useState<Record<string, "accept" | "reject">>({});
  const [overrides, setOverrides] = useState<Record<string, string | number | boolean>>({});
  const [removed, setRemoved] = useState<string[]>([]);
  const [useAi, setUseAi] = useState(false);
  const [imageHint, setImageHint] = useState<Upload["hint"]>("screenshot");
  const [status, setStatus] = useState<IntakeStatus | null>(null);
  const [checkedOcr, setCheckedOcr] = useState(false);
  const uploadRef = useRef<Upload[]>([]);
  const intakeRef = useRef<string | null>(null);
  const photoInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => { uploadRef.current = uploads; }, [uploads]);
  useEffect(() => {
    adminFetch<IntakeStatus>("/intake/status").then(setStatus).catch(() => undefined);
    return () => uploadRef.current.forEach((u) => URL.revokeObjectURL(u.url));
  }, []);

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setResult(null);
    const fresh: Upload[] = Array.from(files)
      .slice(0, 12 - uploads.length)
      .map((file, i) => ({ localId: `${Date.now()}-${i}-${file.name}`, file, url: URL.createObjectURL(file), hint: imageHint, progress: 0 }));
    setUploads((u) => [...u, ...fresh]);
    // Sequential so the first upload creates the intake and the rest join it.
    for (const up of fresh) {
      try {
        const q = new URLSearchParams({ hint: up.hint, ...(intakeRef.current ? { intakeId: intakeRef.current } : {}) });
        const res = await adminUpload<{ intakeId: string; media: { id: string } }>(`/intake/media?${q}`, up.file, (p) => setUploads((all) => all.map((x) => (x.localId === up.localId ? { ...x, progress: p } : x))));
        intakeRef.current = res.intakeId;
        setIntakeId(res.intakeId);
        setUploads((all) => all.map((x) => (x.localId === up.localId ? { ...x, progress: 1, mediaId: res.media.id } : x)));
      } catch (e) {
        setUploads((all) => all.map((x) => (x.localId === up.localId ? { ...x, error: describeError(e) } : x)));
      }
    }
  }

  async function remove(up: Upload) {
    setResult(null);
    setUploads((all) => all.filter((x) => x.localId !== up.localId));
    URL.revokeObjectURL(up.url);
    if (up.mediaId) await adminFetch(`/media/${up.mediaId}`, { method: "DELETE" }).catch(() => undefined);
  }

  async function changeHint(up: Upload, hint: Upload["hint"]) {
    if (!up.mediaId) return;
    setResult(null);
    try {
      await adminFetch(`/media/${up.mediaId}/hint`, { method: "PATCH", body: { hint } });
      setUploads((all) => all.map((u) => u.localId === up.localId ? { ...u, hint } : u));
    } catch (e) { setError(describeError(e)); }
  }

  async function analyze() {
    if (message.trim().length < 5 && !uploads.some((u) => u.mediaId)) {
      setError("Paste the customer's message or add a photo or screenshot first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch<AnalyzeResponse>("/intake/analyze", { method: "POST", body: { intakeId: intakeRef.current, message, useAi: useAi && aiAvailable } });
      intakeRef.current = res.intakeId;
      setIntakeId(res.intakeId);
      setResult(res);
      setCheckedOcr(false);
      // Facts that don't need a person are accepted; the rest wait for a tap.
      setDecisions({});
      setOverrides({});
      setRemoved([]);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  async function apply(mode: ApplyMode) {
    if (!result) return;
    setBusy(true);
    setError("");
    try {
      const res = await adminFetch<{ scope: any; pending: string[] }>(`/intake/${result.intakeId}/review`, { method: "POST", body: { decisions, overrides, removed, confirmExtractedText: checkedOcr } });
      onApply(res.scope, result.intakeId, res.pending.length, mode);
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }

  const toggle = (key: string) => setDecisions((d) => ({ ...d, [key]: d[key] === "accept" ? "reject" : "accept" }));
  const p = result?.proposal;
  const pendingCount = p
    ? [...p.tvs.flatMap((tv, i) => Object.entries(tv.facts).filter(([, f]) => f?.requiresConfirmation).map(([k]) => `tvs.${i}.${k}`)), ...p.items.flatMap((it, i) => Object.entries(it.conditions).filter(([, f]) => f.requiresConfirmation).map(([k]) => `items.${i}.conditions.${k}`))].filter((k) => decisions[k] !== "accept" && !(k in overrides)).length
    : 0;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-3" data-testid="quick-intake">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Sparkles className="h-4 w-4 text-blue-600" aria-hidden /> Quick quote from the customer</p>
      <textarea aria-label="Customer message" disabled={busy} className="min-h-[88px] w-full rounded-xl border border-slate-300 p-3 text-base" value={message} onChange={(e) => { setMessage(e.target.value); setResult(null); }} maxLength={4000} placeholder="Paste their text or email, or dictate with your phone keyboard…" />
      {status && !status.media.enabled ? <Notice tone="warn">Photos are unavailable until private storage is configured. Paste the message or continue in the builder.</Notice> : status && !status.media.durable ? <Notice tone="warn">Photo storage is temporary here. Keep your originals.</Notice> : null}
      <label className="block text-sm">Image type
        <select aria-label="Image type" className="mt-1 h-11 w-full rounded-xl border bg-white px-3 text-base" value={imageHint} disabled={busy} onChange={(e) => setImageHint(e.target.value as Upload["hint"])}>
          <option value="screenshot">Text or product screenshot</option><option value="photo">Room photo</option><option value="label">TV model label</option><option value="receipt">Receipt</option><option value="other">Printed note</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" disabled={busy || status?.media.enabled === false} variant="outline" className="h-11" onClick={() => cameraInput.current?.click()}><Camera className="h-4 w-4" /> Take photo</Button>
        <Button type="button" disabled={busy || status?.media.enabled === false} variant="outline" className="h-11" onClick={() => photoInput.current?.click()}><ImagePlus className="h-4 w-4" /> Add images</Button>
      </div>
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
      <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} data-testid="photo-input" />
      {uploads.length ? (
        <ul className="grid grid-cols-3 gap-2" aria-label="Uploaded images">
          {uploads.map((u) => (
            <li key={u.localId} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img src={u.url} alt="" className="h-24 w-full object-cover" />
              {/* The site's global CSS forces buttons to position:relative, so the wrapper carries the positioning. */}
              <span className="absolute right-1 top-1 z-10"><button disabled={busy} type="button" aria-label="Remove image" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow" onClick={() => void remove(u)}><X className="h-4 w-4" /></button></span>
              <select aria-label="Change uploaded image type" value={u.hint} disabled={busy || !u.mediaId} onChange={(e) => void changeHint(u, e.target.value as Upload["hint"])} className="min-h-[44px] w-full bg-white text-xs">
                <option value="photo">Room photo</option><option value="screenshot">Screenshot</option><option value="label">TV label</option><option value="receipt">Receipt</option><option value="other">Note</option>
              </select>
              {u.error ? <p className="text-xs text-red-600">failed</p> : u.progress < 1 ? <p className="text-xs">{Math.round(u.progress * 100)}%</p> : null}
              {u.progress < 1 && !u.error ? <span className="absolute inset-x-0 bottom-8 h-1 bg-slate-200"><span className="block h-1 bg-blue-600" style={{ width: `${Math.round(u.progress * 100)}%` }} /></span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {uploads.some((u) => u.error) ? <Notice tone="error">{uploads.find((u) => u.error)!.error}</Notice> : null}
      {aiAvailable ? <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" checked={useAi} disabled={busy} onChange={(e) => setUseAi(e.target.checked)} />Allow paid reading if rules or OCR need help</label> : null}
      <Button type="button" className="h-12 w-full" disabled={busy || uploads.some((u) => u.progress < 1 && !u.error)} onClick={analyze}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {result ? "Analyze again" : "Analyze"}
      </Button>
      <p className="text-xs text-slate-500">Messages use rules first. Screenshots, labels, receipts and notes use local text reading first. You review the scope before pricing.</p>
      {error ? <Notice tone="error">{error}</Notice> : null}

      {p ? (
        <div className="space-y-3 rounded-2xl border border-blue-200 bg-white p-3" data-testid="we-found">
          <p className="text-base font-extrabold text-slate-900">We found</p>
          {result!.vision.error && uploads.length ? <Notice tone="warn">{result!.vision.error} Review the message and any text read from images below.</Notice> : null}
          <details className="text-xs text-slate-600"><summary className="min-h-[44px] cursor-pointer py-2 font-semibold">Reading usage</summary>
            <p>{result!.metrics.ocrImages} image(s) read locally; {result!.metrics.cachedImages} cached; {result!.metrics.textCalls + result!.metrics.visionCalls} paid call(s) this read; {result!.metrics.totalTextCalls + result!.metrics.totalVisionCalls} this intake.</p>
            <p>{result!.metrics.provider ? `${result!.metrics.provider} / ${result!.metrics.model ?? "model unavailable"}. ` : "No paid provider. "}{result!.metrics.escalationReason ?? "Rules or local text reading."} Cost: {result!.metrics.estimatedCostUsd === 0 ? "$0" : "unavailable"}.</p>
            {status?.metrics.sampleCount ? <p>Last {status.metrics.sampleCount} measured intakes: {status.metrics.zeroAiPercent}% zero AI, {status.metrics.aiAssistedPercent}% AI assisted.</p> : null}
          </details>
          {!p.tvs.length && !p.items.length && !p.extras.length ? <p className="text-sm text-slate-600">Nothing clear yet. Add details or build the job manually.</p> : null}
          {p.tvs.map((tv, i) =>
            removed.includes(tv.key) ? null : (
              <div key={tv.key} className="rounded-xl border border-slate-200 p-2" data-testid="found-tv">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold">TV {i + 1} <span className="text-xs font-normal text-slate-500">from {tv.origin === "both" ? "message + photos" : tv.origin === "photo" ? srcText(Object.values(tv.facts).flatMap((f) => f?.sources ?? [])) || "photos" : "message"}</span></p>
                  <Button type="button" variant="ghost" size="icon" aria-label={`Remove TV ${i + 1}`} onClick={() => setRemoved((r) => [...r, tv.key])}><Trash2 /></Button>
                </div>
                <ul className="mt-1 space-y-1">
                  {Object.entries(tv.facts).filter(([k, f]) => f && k !== "sizeBand" && !(k === "sizeBand" && tv.facts.inches)).map(([k, f]) => {
                    const key = `tvs.${i}.${k}`;
                    const fact = f!;
                    const confirmed = !fact.requiresConfirmation || decisions[key] === "accept" || key in overrides;
                    return (
                      <li key={k} className="text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span><span className="text-slate-500">{LABEL[k] ?? k}:</span> <strong>{show(k, key in overrides ? overrides[key] : fact.value)}</strong>{fact.observation ? <span className="block text-xs text-slate-500">{fact.observation}</span> : null}</span>
                          {fact.requiresConfirmation ? (
                            <button type="button" role="switch" aria-checked={confirmed} aria-label={`Confirm ${LABEL[k] ?? k} for TV ${i + 1}`} onClick={() => toggle(key)} className={cn("shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold", confirmed ? "border-green-600 bg-green-50 text-green-800" : "border-amber-400 bg-amber-50 text-amber-800")}>
                              {confirmed ? <><Check className="inline h-3 w-3" /> confirmed</> : "confirm?"}
                            </button>
                          ) : <span className="shrink-0 text-xs font-semibold text-green-700"><Check className="inline h-3 w-3" /> stated</span>}
                        </div>
                        {fact.alternatives?.length ? (
                          <div className="mt-1 flex flex-wrap gap-1" aria-label={`Choose ${LABEL[k] ?? k}`}>
                            <span className="text-xs text-amber-800">Sources disagree:</span>
                            {[fact.value, ...fact.alternatives.map((a) => a.value)].map((v) => (
                              <button key={String(v)} type="button" className={cn("rounded-full border px-2 py-0.5 text-xs", overrides[key] === v ? "border-blue-600 bg-blue-50" : "border-slate-300")} onClick={() => setOverrides((o) => ({ ...o, [key]: v as string | number | boolean }))}>{show(k, v)}</button>
                            ))}
                          </div>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ),
          )}
          {p.items.length || p.extras.length ? (
            <div className="rounded-xl border border-slate-200 p-2">
              <p className="text-sm font-bold">Other work</p>
              <ul className="mt-1 space-y-1 text-sm">
                {p.items.map((it, i) =>
                  removed.includes(it.key) ? null : (
                    <li key={it.key}>
                      <div className="flex items-center justify-between gap-2">
                        <span>{it.item.name ?? (it.item.category ?? "item").replace(/_/g, " ")} <span className="text-xs text-slate-500">{it.item.action}{(it.item.quantity ?? 1) > 1 ? ` ×${it.item.quantity}` : ""}</span></span>
                        <Button type="button" variant="ghost" size="icon" aria-label="Remove item" onClick={() => setRemoved((r) => [...r, it.key])}><Trash2 /></Button>
                      </div>
                      {Object.entries(it.conditions).map(([c, f]) => {
                        const key = `items.${i}.conditions.${c}`;
                        const ok = decisions[key] === "accept";
                        return (
                          <button key={c} type="button" role="switch" aria-checked={ok} onClick={() => toggle(key)} className={cn("mt-1 rounded-full border px-2.5 py-1 text-xs font-semibold", ok ? "border-green-600 bg-green-50 text-green-800" : "border-amber-400 bg-amber-50 text-amber-800")}>
                            {c.replace(/_/g, " ")}: {String(f.value)} {ok ? "(confirmed)" : "(photo suggests — confirm?)"}
                          </button>
                        );
                      })}
                    </li>
                  ),
                )}
                {p.extras.map((e) => <li key={e.kind}>{e.kind}{e.qty > 1 ? ` ×${e.qty}` : ""}</li>)}
              </ul>
            </div>
          ) : null}
          {p.questions.length ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-2">
              <p className="text-sm font-bold text-slate-900">Needs confirmation</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">{p.questions.slice(0, 10).map((q) => <li key={q.owner}>{q.customer || q.owner}</li>)}</ul>
            </div>
          ) : null}
          {p.extractedText ? <details className="text-xs text-slate-600"><summary className="min-h-[44px] cursor-pointer py-2 font-semibold">Text read from screenshots</summary><p className="whitespace-pre-wrap">{p.extractedText}</p></details> : null}
          {p.requiresOcrConfirmation ? <label className="flex min-h-[44px] items-center gap-3 text-sm"><input type="checkbox" checked={checkedOcr} onChange={(e) => setCheckedOcr(e.target.checked)} />I checked the text, quantities and actions against the images.</label> : null}
          <p className="text-xs text-slate-500">
            {pendingCount ? `${pendingCount} suggestion${pendingCount > 1 ? "s" : ""} not confirmed. ` : ""}
            {pendingCount || p.questions.length ? "Anything unconfirmed or unanswered stays unknown, so the price is an estimate until it's settled. You can fix details on the next screens." : "Everything shown is confirmed."}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <Button type="button" className="h-12" disabled={busy || (p.requiresOcrConfirmation && !checkedOcr)} onClick={() => apply("confirm")}>Confirm</Button>
            <Button type="button" variant="outline" className="h-12" disabled={busy || (p.requiresOcrConfirmation && !checkedOcr)} onClick={() => apply("edit")}>Edit</Button>
            <Button type="button" variant="outline" className="h-12" disabled={busy || (p.requiresOcrConfirmation && !checkedOcr)} onClick={() => apply("add")}>Add item</Button>
          </div>
        </div>
      ) : null}
      {intakeId && !p ? <p className="text-xs text-slate-500">Images are private to you and will be attached to this job.</p> : null}
    </div>
  );
}
