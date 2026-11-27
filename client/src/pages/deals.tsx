import { useMemo, useState } from "react";
import { Search } from "lucide-react";

import { deals as allDeals, DEAL_CATEGORY_LABELS, DEAL_CONDITION_LABELS, type DealCategory, type DealCondition, type FulfillmentType } from "@/data/deals";
import { filterDeals, type DealFilters } from "@/lib/deals";
import DealCard from "@/components/deals/DealCard";
import { Input } from "@/components/ui/input";
import { SelectorButton } from "@/components/ui/quote-tool/QuoteComponents";

/**
 * Atlanta Electronics Deals (Issue #35 S-13).
 *
 * Every deal here is verified before it is published: store-level price and
 * availability evidence, a verification timestamp, and an expiry. Stale
 * "pickup today" claims are suppressed automatically by the claim logic in
 * client/src/lib/deals.ts. Purchase happens at the retailer; PPTV quotes the
 * installation separately — no install price is attached to a deal.
 */
export default function DealsPage() {
  const [zip, setZip] = useState("");
  const [retailer, setRetailer] = useState("");
  const [category, setCategory] = useState<DealCategory | "">("");
  const [condition, setCondition] = useState<DealCondition | "">("");
  const [fulfillment, setFulfillment] = useState<FulfillmentType | "">("");
  const [budget, setBudget] = useState("");
  const [freshOnly, setFreshOnly] = useState(false);
  const [showExpired, setShowExpired] = useState(false);

  const now = useMemo(() => new Date(), []);
  const retailers = useMemo(() => Array.from(new Set(allDeals.map((d) => d.retailer))).sort(), []);

  const filters: DealFilters = {
    zip,
    retailer,
    category,
    condition,
    fulfillment,
    budget: budget ? Number(budget) : null,
    freshOnly,
    includeExpired: showExpired,
  };
  const shown = filterDeals(allDeals, filters, now);

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-20 pt-10 md:pt-14">
      <header className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Atlanta Electronics Deals</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">Verified local deals. We handle the install.</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
          TVs, mounts, soundbars, gaming, monitors and more from established Atlanta-area retailers — checked store by store before we list them. You buy it from the retailer; we mount it. Prices and stock change fast, so every deal shows when it was last verified and when it expires.
        </p>
      </header>

      <section className="mx-auto mt-10 max-w-6xl rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="flex items-center gap-2 text-sm font-bold text-slate-900"><Search className="h-4 w-4 text-blue-600" /> Filter deals</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1 text-sm font-semibold text-slate-800">
            ZIP code (manual)
            <Input value={zip} inputMode="numeric" maxLength={5} placeholder="e.g. 30308" className="h-11 rounded-xl" onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-800">
            Retailer
            <select value={retailer} onChange={(e) => setRetailer(e.target.value)} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="">All retailers</option>
              {retailers.map((r) => (<option key={r} value={r}>{r}</option>))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-800">
            Category
            <select value={category} onChange={(e) => setCategory(e.target.value as DealCategory | "")} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="">All categories</option>
              {Object.entries(DEAL_CATEGORY_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-800">
            Condition
            <select value={condition} onChange={(e) => setCondition(e.target.value as DealCondition | "")} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="">All conditions</option>
              {Object.entries(DEAL_CONDITION_LABELS).map(([value, label]) => (<option key={value} value={value}>{label}</option>))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-800">
            Budget (max price)
            <Input value={budget} inputMode="numeric" placeholder="e.g. 500" className="h-11 rounded-xl" onChange={(e) => setBudget(e.target.value.replace(/[^0-9]/g, ""))} />
          </label>
          <label className="space-y-1 text-sm font-semibold text-slate-800">
            Fulfillment
            <select value={fulfillment} onChange={(e) => setFulfillment(e.target.value as FulfillmentType | "")} className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm">
              <option value="">Pickup or delivery</option>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
            </select>
          </label>
          <div className="flex items-end gap-2 pb-1">
            <SelectorButton selected={freshOnly} onClick={() => setFreshOnly((v) => !v)} className="text-xs">Verified fresh only</SelectorButton>
            <SelectorButton selected={showExpired} onClick={() => setShowExpired((v) => !v)} className="text-xs">Show expired</SelectorButton>
          </div>
        </div>
      </section>

      <main className="mx-auto mt-8 max-w-6xl">
        {shown.length === 0 ? (
          <div className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-extrabold text-slate-900">No verified deals match right now</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-600">
              We only list deals after store-level verification, and expired or stale deals drop off automatically. Check back soon — new verified deals are added as they are confirmed. Need a TV mounted in the meantime? Standard mounting starts at $100 with your mount.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {shown.map((deal) => (<DealCard key={deal.id} deal={deal} now={now} />))}
          </div>
        )}
      </main>
    </div>
  );
}
