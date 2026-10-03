import { useMemo } from "react";
import { Check } from "lucide-react";

import { packagesForFormState } from "@shared/pricing/formState";
import { formatPrice } from "@/data/pricing-data";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useQuoteContext } from "@/components/ui/quote-tool/useQuoteState";

// Essential / Clean / Complete. Every package is built from real catalog components for the
// TVs the customer configured; totals are the exact sum of the listed lines. There are no
// crossed-out prices and no invented savings. Shown only when there is a real choice to make.
export default function QuotePackages() {
  const { formState, quote, quoteSourceMode, applyPackage } = useQuoteContext();
  const packages = useMemo(() => packagesForFormState(formState), [formState]);

  if (quoteSourceMode !== "form" || !quote || packages.length < 2) return null;

  const isMoveProject = Boolean(formState.moveProject?.enabled);

  return (
    <section aria-labelledby="packages-heading" className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">Compare setup options</p>
        <h5 id="packages-heading" className="mt-1 text-xl font-extrabold text-slate-900">Choose the finish you want</h5>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {isMoveProject
            ? "Every price below is the total for your entire two-home project. Previous-home removal, teardown, coordination, and the rest of your move scope stay included — only the new-TV setup level changes."
            : "Every price below is the total for this job. Same installer and visit — only the TV setup level changes."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {packages.map((pkg) => {
          const selected = Math.round(quote.total * 100) === pkg.totalCents;
          return (
            <div
              key={pkg.id}
              className={cn("flex flex-col rounded-[24px] border bg-white p-4 shadow-sm", selected ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200")}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-slate-900">{pkg.name}</p>
                  <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">Whole-project total</p>
                </div>
                {selected ? (
                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">Current</span>
                ) : null}
              </div>

              <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{formatPrice(pkg.totalCents / 100)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{pkg.summary}</p>

              {isMoveProject ? (
                <div className="mt-3 rounded-xl border border-green-100 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800">
                  Previous-home work + move scope included
                </div>
              ) : null}

              <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Included in this total</p>
              <ul className="mt-2 flex-1 space-y-1.5 text-sm text-slate-700">
                {pkg.components.slice(0, 7).map((component, index) => (
                  <li key={`${component.label}-${index}`} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                    <span className="flex-1">{component.label}</span>
                    <span className="shrink-0 font-medium">{component.amountCents === null ? "Custom" : formatPrice(component.amountCents / 100)}</span>
                  </li>
                ))}
              </ul>
              {pkg.components.length > 7 ? (
                <p className="mt-2 text-xs font-medium text-slate-500">+ {pkg.components.length - 7} more line {pkg.components.length - 7 === 1 ? "item" : "items"} in the itemized estimate below.</p>
              ) : null}

              <Button
                type="button"
                variant={selected ? "secondary" : "outline"}
                className="mt-4 h-11 rounded-xl"
                disabled={selected}
                aria-pressed={selected}
                onClick={() => applyPackage(pkg.id)}
              >
                {selected ? "Selected" : `Choose ${pkg.name}`}
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
