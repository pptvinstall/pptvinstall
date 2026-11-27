import { ExternalLink, MapPin, PackageCheck } from "lucide-react";
import { Link } from "wouter";

import { DEAL_CATEGORY_LABELS, DEAL_CONDITION_LABELS, type Deal } from "@/data/deals";
import { formatPrice } from "@/data/pricing-data";
import {
  isDealExpired,
  lowestStorePrice,
  PICKUP_CLAIM_LABELS,
  pickupClaim,
  purchaseUrl,
  quoteHandoffUrl,
  sameConditionSavings,
} from "@/lib/deals";
import AffiliateDisclosure from "@/components/deals/AffiliateDisclosure";
import { Button } from "@/components/ui/button";

/**
 * One deal card (Issue #35 S-13). Shows the product, condition, disclosures,
 * and per-store verified availability. The purchase stays with the retailer;
 * the quote CTA hands ONLY product/model/source to the quote flow — no
 * installation price is ever shown or implied on a deal.
 */
export default function DealCard({ deal, now }: { deal: Deal; now: Date }) {
  const expired = isDealExpired(deal, now);
  const lowest = lowestStorePrice(deal);
  const savings = sameConditionSavings(deal);
  const purchase = purchaseUrl(deal, now);

  return (
    <article className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide">
        <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">{DEAL_CATEGORY_LABELS[deal.category]}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{DEAL_CONDITION_LABELS[deal.condition]}</span>
        {expired ? <span className="rounded-full bg-red-50 px-3 py-1 text-red-700">Expired</span> : null}
      </div>

      <h3 className="mt-3 text-xl font-extrabold text-slate-900">{deal.productName}</h3>
      <p className="mt-1 text-sm text-slate-500">
        Model {deal.model} · Sold by {deal.seller} via {deal.retailer}
      </p>

      {lowest !== null ? (
        <p className="mt-3 text-3xl font-extrabold text-slate-900">
          {formatPrice(lowest)}
          {savings !== null ? <span className="ml-2 align-middle text-sm font-bold text-green-700">Save {formatPrice(savings)} vs the regular price for this condition</span> : null}
        </p>
      ) : (
        <p className="mt-3 text-lg font-bold text-slate-700">Store pricing being verified</p>
      )}

      <dl className="mt-4 space-y-1 text-sm text-slate-600">
        <div><dt className="inline font-semibold text-slate-800">Warranty: </dt><dd className="inline">{deal.warranty}</dd></div>
        <div><dt className="inline font-semibold text-slate-800">Returns: </dt><dd className="inline">{deal.returns}</dd></div>
        <div><dt className="inline font-semibold text-slate-800">In the box: </dt><dd className="inline">{deal.completeness}</dd></div>
      </dl>

      <div className="mt-4 space-y-3">
        {deal.availability.map((record) => {
          const claim = pickupClaim(record, now);
          return (
            <div key={`${record.storeId}-${record.checkedAt}`} className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
              <p className="flex items-center gap-1 font-bold text-slate-900">
                <MapPin className="h-4 w-4 text-blue-600" /> {record.storeName} — {formatPrice(record.price)}
              </p>
              <p className="mt-1 text-slate-600">{record.address} · ZIP {record.zip}</p>
              <p className="mt-1 font-semibold text-slate-800">
                {record.fulfillment === "pickup" ? PICKUP_CLAIM_LABELS[claim] : "Delivery"}
                {record.membershipRequired ? ` · ${record.membershipRequired}` : ""}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Verified {new Date(record.checkedAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET ·{" "}
                <a className="text-blue-600 underline" href={record.evidenceUrl} target="_blank" rel="noreferrer">Store listing</a>
              </p>
            </div>
          );
        })}
        {deal.availability.length === 0 ? (
          <p className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">Availability unknown — we recheck store stock before featuring a deal here.</p>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-slate-500">Deal expires {new Date(deal.expiresAt).toLocaleString("en-US", { timeZone: "America/New_York" })} ET. Prices and stock can change — the retailer listing is the source of truth.</p>

      <div className="mt-4 flex flex-col gap-2">
        <a href={purchase.url} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-900 hover:bg-slate-50">
          View at {deal.retailer} <ExternalLink className="h-4 w-4" />
        </a>
        {purchase.isAffiliate ? <AffiliateDisclosure affiliate={deal.affiliate} /> : null}
        <Link href={quoteHandoffUrl(deal)}>
          <Button className="h-12 w-full rounded-2xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-500">
            <PackageCheck className="mr-2 h-4 w-4" /> Get an install quote for this product
          </Button>
        </Link>
        <p className="text-xs text-slate-500">You buy it from the retailer; we quote the installation separately. YOU BUY IT. WE MOUNT IT.</p>
      </div>
    </article>
  );
}
