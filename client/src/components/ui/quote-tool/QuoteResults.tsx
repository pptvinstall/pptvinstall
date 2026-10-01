import { motion } from "framer-motion";
import { AlertCircle, ArrowRight } from "lucide-react";

import { formatPrice } from "@/data/pricing-data";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  OUTLET_DISTANCE_QUESTION,
  type OutletDistanceAnswer,
} from "@/components/ui/quote-tool/shared";
import { SelectorButton } from "@/components/ui/quote-tool/QuoteComponents";
import { useQuoteContext } from "@/components/ui/quote-tool/useQuoteState";

export default function QuoteResults() {
  const {
    quote,
    reviewGroups,
    reviewFlags,
    reviewDiscountLabel,
    reviewNeedsPhotoHelper,
    formState,
    describeOutletFollowUpNeeded,
    describeOutletAnswer,
    setDescribeOutletAnswer,
    promoCodeInput,
    seasonalTheme,
    setError,
    handleReviewApproval,
    handleEditQuote,
    step,
  } = useQuoteContext();

  if (step !== "review" || !quote) return null;

  return (
    <motion.div
      key="review"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="space-y-6 p-6 md:p-8"
    >
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Review Your Quote</p>
        <h4 className="text-3xl font-extrabold text-slate-900">Make sure everything looks right</h4>
        <p className="text-base leading-7 text-slate-700">{quote.summary}</p>
      </div>

      {describeOutletFollowUpNeeded ? (
        <div className="rounded-[28px] border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">Quick Clarification</p>
            <h5 className="text-lg font-bold text-slate-900">{OUTLET_DISTANCE_QUESTION}</h5>
            <p className="text-sm text-slate-600">This only applies to the standard wire-concealment part of your quote, not the fireplace portion.</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
              { value: "not_sure", label: "Not sure" },
            ].map((option) => (
              <SelectorButton
                key={option.value}
                selected={describeOutletAnswer === option.value}
                onClick={() => {
                  setDescribeOutletAnswer(option.value as OutletDistanceAnswer);
                  setError("");
                }}
              >
                {option.label}
              </SelectorButton>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            {describeOutletAnswer === "yes"
              ? "Great — we'll keep the standard concealment path."
              : describeOutletAnswer === "no"
                ? "Thanks — we'll keep the current estimate and clearly note that extra work may be needed."
                : describeOutletAnswer === "not_sure"
                  ? "No problem — we'll keep the estimate and note that a quick confirmation may be needed."
                  : "A quick answer helps us present the cleanest review and set expectations clearly."}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] bg-slate-900 p-5 text-white shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Estimated Total</p>
          <p className="mt-3 text-4xl font-extrabold">{formatPrice(quote.total)}</p>
          <p className="mt-2 text-sm text-slate-300">Custom-quote items are confirmed before booking and are not included until priced.</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Travel / Route</p>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">Reviewed</p>
          <p className="mt-2 text-sm text-slate-500">Distance, access, and route fit are confirmed before final booking.</p>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Promo</p>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">{promoCodeInput ? promoCodeInput : "None"}</p>
          <p className="mt-2 text-sm text-slate-500">{promoCodeInput ? "Promo will be verified before final payment." : "No promo applied right now."}</p>
        </div>
      </div>

      {reviewFlags.length > 0 ? reviewFlags.map((flag) => (
        <Alert key={flag} className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>{flag}</AlertDescription>
        </Alert>
      )) : null}

      {reviewNeedsPhotoHelper ? (
        <p className="text-sm text-slate-500">
          Photos help us confirm pricing faster for fireplace, brick, or custom concealment jobs.
        </p>
      ) : null}

      {formState.notes.trim() ? (
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">Your notes</p>
          <p className="mt-2 leading-6">{formState.notes}</p>
        </div>
      ) : null}

      <div className="space-y-4">
        {reviewGroups.map((group) => (
          <div key={group.title} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h4 className="text-lg font-bold text-slate-900">{group.title}</h4>
              {group.subtitle ? <p className="text-sm text-slate-500">{group.subtitle}</p> : null}
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={`${group.title}-${item.name}-${item.lineTotal}`} className="flex items-start justify-between gap-4 text-sm">
                  <div className="text-slate-700">{item.qty && item.qty > 1 ? `${item.qty}x ${item.name}` : item.name}</div>
                  <div className={cn("shrink-0 font-semibold", item.lineTotal < 0 ? "text-green-700" : "text-slate-900")}>
                    {item.lineTotal === 0 && /custom quote|scope review|assessment required/i.test(item.name)
                      ? "Custom"
                      : <>{item.lineTotal < 0 ? "-" : ""}{formatPrice(Math.abs(item.lineTotal))}</>}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-bold">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-slate-900">{formatPrice(group.subtotal)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-[28px] bg-slate-900 p-5 text-white">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-300">Subtotal</span>
          <span>{formatPrice(quote.subtotal)}</span>
        </div>
        {quote.discount > 0 ? (
          <div className="mt-2 flex items-center justify-between text-sm text-green-300">
            <span>{reviewDiscountLabel}</span>
            <span>-{formatPrice(quote.discount)}</span>
          </div>
        ) : null}
        {quote.travelFee !== "out_of_range" && quote.travelFee > 0 ? (
          <div className="mt-2 flex items-center justify-between text-sm text-slate-200">
            <span>Travel fee</span>
            <span>+{formatPrice(quote.travelFee)}</span>
          </div>
        ) : null}
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-xl font-extrabold">
          <span>TOTAL</span>
          <span>{formatPrice(quote.total)}</span>
        </div>
      </div>

      {quote.followUp && quote.followUp !== OUTLET_DISTANCE_QUESTION ? (
        <Alert className="border-amber-200 bg-amber-50 text-amber-900">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>One thing to confirm</AlertTitle>
          <AlertDescription>{quote.followUp}</AlertDescription>
        </Alert>
      ) : null}

      {seasonalTheme.promoCode ? (
        <div className="rounded-3xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          Promo available this season: <strong>{seasonalTheme.promoCode}</strong>. We&apos;ll verify it during booking rather than auto-applying it here.
        </div>
      ) : null}

      <p className="text-xs font-medium text-slate-500">
        Final pricing may vary for complex installs. We confirm anything unusual before work begins.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <Button
          className="h-14 rounded-2xl bg-blue-600 text-base font-bold text-white hover:bg-blue-500 disabled:opacity-60"
          disabled={describeOutletFollowUpNeeded && !describeOutletAnswer}
          onClick={handleReviewApproval}
        >
          Looks Good <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" className="h-14 rounded-2xl" onClick={handleEditQuote}>
          Edit Quote
        </Button>
      </div>
    </motion.div>
  );
}
