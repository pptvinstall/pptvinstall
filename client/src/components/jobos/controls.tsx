import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Small touch-friendly controls shared by the owner screens (44px minimum targets).

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-slate-800">{label}</label>
      {children}
      {hint ? <p className="text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange, columns }: { label: string; value: T | null; options: Array<{ value: T; label: string }>; onChange: (v: T) => void; columns?: number }) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("grid gap-2", columns === 3 ? "grid-cols-3" : columns === 1 ? "grid-cols-1" : "grid-cols-2")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "min-h-[44px] rounded-xl border px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            value === o.value ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500", checked ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white")}
    >
      <span>
        <span className="block font-semibold text-slate-800">{label}</span>
        {hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}
      </span>
      <span className={cn("h-6 w-11 shrink-0 rounded-full p-0.5 transition-colors", checked ? "bg-blue-600" : "bg-slate-300")} aria-hidden>
        <span className={cn("block h-5 w-5 rounded-full bg-white transition-transform", checked ? "translate-x-5" : "translate-x-0")} />
      </span>
    </button>
  );
}

export function Stat({ label, value, tone, sub }: { label: string; value: ReactNode; tone?: "default" | "good" | "warn" | "muted"; sub?: ReactNode }) {
  return (
    <div className={cn("rounded-2xl border p-3", tone === "warn" ? "border-amber-300 bg-amber-50" : tone === "good" ? "border-green-200 bg-green-50" : "border-slate-200 bg-white")}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn("mt-1 text-xl font-extrabold", tone === "muted" ? "text-slate-500" : "text-slate-900")}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function Notice({ tone, children }: { tone: "error" | "warn" | "info" | "success"; children: ReactNode }) {
  const styles = { error: "border-red-200 bg-red-50 text-red-800", warn: "border-amber-200 bg-amber-50 text-amber-900", info: "border-blue-200 bg-blue-50 text-blue-900", success: "border-green-200 bg-green-50 text-green-900" } as const;
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("rounded-xl border px-3 py-2 text-sm", styles[tone])}>
      {children}
    </div>
  );
}

export const inputClass = "h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50";
