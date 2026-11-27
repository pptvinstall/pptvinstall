import type { AffiliateInfo } from "@/data/deals";

/**
 * Affiliate disclosure, rendered adjacent to a compensated purchase link
 * (Issue #35 S-13). Ordinary retailer links are the default; this component
 * renders ONLY when an approved affiliate link is actually in use, and shows
 * that program's disclosure text.
 */
export default function AffiliateDisclosure({ affiliate }: { affiliate?: AffiliateInfo }) {
  if (!affiliate || affiliate.status !== "approved" || !affiliate.affiliateUrl) return null;
  return (
    <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
      {affiliate.disclosureText ||
        "This is an affiliate link — if you buy through it, Picture Perfect TV Install may earn a commission at no extra cost to you."}
    </p>
  );
}
