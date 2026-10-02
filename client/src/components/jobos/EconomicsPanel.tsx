import { Notice, Stat } from "@/components/jobos/controls";
import { money } from "@/lib/adminApi";

// Owner-only economics panel. Everything here is internal: it is rendered only on admin-token pages and the data
// comes from admin endpoints. Customer pages never receive these fields (the server strips and checks them).

export type PanelPricing = {
  floorCents: number;
  recommendedCents: number;
  premiumCents: number;
  totalOwnerMinutes: number;
  overheadCents: number;
  status: string;
  confidence: string;
  labor: { minutes: number; helperMinutes: number };
  materials: { costCents: number; chargeCents: number };
  travel: { costCents?: number; fuelCents: number; vehicleCents: number; timeCents: number; roundTripMiles: number; roundTripDriveMinutes: number; source: string; routeProvider?: string | null; routeAsOf?: string | null };
  premium?: { pct: number; complexity: string; factors: Array<{ key: string; label: string; pct: number; because: string }> };
  helperPay?: { mode: string; sharePct: number };
  priceDrivers?: Array<{ key: string; label: string; cents: number; detail?: string }>;
  questions: Array<{ question: string }>;
  why: string[];
  siteCount?: number;
};

export type PanelEconomics = {
  helperCostCents?: number;
  outOfPocketCents?: number;
  costToServeCents?: number;
  ownerNetCents?: number;
  marginPct: number;
  effectiveGrossPerHourCents: number;
  belowFloor: boolean;
};

const STATUS_LABEL: Record<string, string> = { priced: "Priced", estimate_with_confirmation: "Estimate with confirmation", manual_review_required: "Manual review required", not_supported: "Not supported" };
const hm = (min: number) => `${Math.floor(min / 60)}h ${Math.round(min % 60)}m`;

export default function EconomicsPanel({ pricing: p, economics: e, customerCents, customerSub }: { pricing: PanelPricing; economics: PanelEconomics | null; customerCents: number | null; customerSub?: string }) {
  const travelCost = p.travel.costCents ?? p.travel.fuelCents + p.travel.vehicleCents + p.travel.timeCents;
  const premiumFactors = p.premium?.factors ?? [];
  return (
    <div className="space-y-3" data-testid="economics-panel">
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Customer quote" value={customerCents === null ? "—" : money(customerCents)} sub={customerSub} />
        <Stat label="Recommended" value={money(p.recommendedCents)} sub="Internal" />
        <Stat label="Floor" value={money(p.floorCents)} tone={e?.belowFloor ? "warn" : "default"} sub={e?.belowFloor ? "Quote is below floor" : "Minimum profitable"} />
        <Stat label="Premium reference" value={money(p.premiumCents)} tone="muted" sub="Internal" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="On-site time" value={hm(p.labor.minutes)} sub={p.labor.helperMinutes ? `helper ${p.labor.helperMinutes} min` : "no helper"} />
        <Stat label="Total owner time" value={hm(p.totalOwnerMinutes)} sub={`${p.travel.roundTripDriveMinutes} min driving`} />
        <Stat label="Helper cost" value={money(e?.helperCostCents ?? 0)} sub={p.helperPay?.mode === "labor_revenue_share" ? `${Math.round(p.helperPay.sharePct * 100)}% of labor revenue` : p.helperPay?.mode === "hourly" ? "hourly" : "none"} />
        <Stat label="Materials" value={money(p.materials.costCents)} sub={`charged ${money(p.materials.chargeCents)}`} />
        <Stat label="Travel cost" value={money(travelCost)} sub={`${p.travel.roundTripMiles} mi${(p.siteCount ?? 1) > 1 ? ` · ${p.siteCount} addresses` : ""} · ${p.travel.source === "reference_table" ? "ZIP table" : p.travel.source === "assumed_unknown_route" ? "route assumed" : p.travel.source === "provider" ? "live route" : "your miles"}`} />
        <Stat label="Business overhead" value={money(p.overheadCents)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Stat label="Cost to serve" value={e?.costToServeCents === undefined ? "—" : money(e.costToServeCents)} sub="incl. your time" />
        <Stat label="Your net" value={e?.ownerNetCents === undefined ? "—" : money(e.ownerNetCents)} tone={(e?.ownerNetCents ?? 0) < 0 ? "warn" : "default"} sub="after cash costs" />
        <Stat label="Effective rate" value={e ? `${money(e.effectiveGrossPerHourCents)}/hr` : "—"} sub="your net per hour" />
        <Stat label="Margin" value={e ? `${(e.marginPct * 100).toFixed(0)}%` : "—"} tone={e && e.marginPct < 0.12 ? "warn" : "good"} sub="after valuing your time" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Complexity" value={p.premium?.complexity ?? "—"} />
        <Stat label="Confidence" value={p.confidence} />
        <Stat label="Status" value={STATUS_LABEL[p.status] ?? p.status} tone={p.status === "priced" ? "good" : "warn"} />
      </div>
      {premiumFactors.length ? (
        <Notice tone="info">
          Risk / complexity: {premiumFactors.map((f) => `${f.label} +${Math.round(f.pct * 100)}%`).join(", ")}
          {p.premium && p.premium.pct < premiumFactors.reduce((s, f) => s + f.pct, 0) ? ` (capped at ${Math.round(p.premium.pct * 100)}%)` : ""}
        </Notice>
      ) : null}
      {p.priceDrivers?.length ? (
        <details className="rounded-2xl border border-slate-200 p-3 text-sm" open>
          <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-slate-800">Why the price is where it is</summary>
          <ul className="mt-1 space-y-1 text-slate-700">
            {p.priceDrivers.map((d) => (
              <li key={d.key} className="flex justify-between gap-3">
                <span>{d.label}{d.detail ? <span className="block text-xs text-slate-500">{d.detail}</span> : null}</span>
                <span className="shrink-0 font-semibold">{money(d.cents)}</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {p.questions.length ? (
        <details className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-sm" open={p.questions.length <= 4}>
          <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-slate-800">Questions before the price is firm ({p.questions.length})</summary>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-700">{p.questions.slice(0, 20).map((q, i) => <li key={`${i}-${q.question}`}>{q.question}</li>)}</ul>
        </details>
      ) : null}
      <details className="rounded-2xl border border-slate-200 p-3 text-sm">
        <summary className="min-h-[44px] cursor-pointer py-2 font-semibold text-slate-800">Full explanation</summary>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-slate-600">{p.why.map((w) => <li key={w}>{w}</li>)}</ul>
        {p.travel.routeAsOf ? <p className="mt-2 text-xs text-slate-500">Route: {p.travel.routeProvider} ({p.travel.routeAsOf})</p> : null}
      </details>
    </div>
  );
}
