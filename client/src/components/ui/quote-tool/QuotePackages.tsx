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

  return (
    <section aria-labelledby="packages-heading" className="space-y-3">
      <div>
        <h5 id="packages-heading" className="text-lg font-bold text-slate-900">Choose how clean you want it</h5>
        <p className="text-sm text-slate-500">{formState.moveProject?.enabled ? "Each option keeps your previous-home work and move scope included; only the TV setup level changes." : "Same installer, same visit. Each option lists exactly what is included."}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {packages.map((pkg) => {
          const selected = Math.round(quote.total * 100) === pkg.totalCents;
          return (
            <div
              key={pkg.id}
              className={cn("flex flex-col rounded-[24px] border bg-white p-4 shadow-sm", selected ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200")}
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-base font-bold text-slate-900">{pkg.name}</p>
                <p className="text-xl font-extrabold text-slate-900">{formatPrice(pkg.totalCents / 100)}</p>
              </div>
              <p className="mt-1 text-sm text-slate-500">{pkg.summary}</p>
              <ul className="mt-3 flex-1 space-y-1.5 text-sm text-slate-700">
                {pkg.components.map((component, index) => (
                  <li key={`${component.label}-${index}`} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" aria-hidden />
                    <span className="flex-1">{component.label}</span>
                    <span className="shrink-0 font-medium">{component.amountCents === null ? "Custom" : formatPrice(component.amountCents / 100)}</span>
                  </li>
                ))}
              </ul>
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
