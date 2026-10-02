import { AnimatePresence } from "framer-motion";
import { AlertCircle, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { QuoteToolContext, useQuoteState, telHref, businessPhone } from "@/components/ui/quote-tool/useQuoteState";
import QuoteStepForm from "@/components/ui/quote-tool/QuoteStepForm";
import QuoteResults from "@/components/ui/quote-tool/QuoteResults";
import QuoteActions from "@/components/ui/quote-tool/QuoteActions";

export default function QuoteTool() {
  const state = useQuoteState();
  const { step, stepFlow, error } = state;

  return (
    <QuoteToolContext.Provider value={state}>
      <Card className="mx-auto w-full max-w-5xl overflow-hidden rounded-[32px] border-slate-200 bg-white shadow-2xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 px-6 py-6 text-white md:px-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-600/20 p-3 text-blue-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">Instant Estimate Builder</p>
              <h3 className="text-2xl font-extrabold leading-tight md:text-3xl">Build each TV exactly the way you want it</h3>
              <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                Configure every TV, add shared services, and watch the estimate update in real time.
              </p>
              <p className="text-sm text-slate-300">
                Need a faster answer? <a href={telHref} className="font-semibold text-white hover:underline">Call or text {businessPhone}</a>.
              </p>
            </div>
          </div>
        </div>

        <CardContent className="relative p-0">
          {error ? (
            <div className="px-6 pt-6 md:px-8">
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>We couldn't build that quote</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            </div>
          ) : null}

          {/* ── Step navigation ────────────────────────────────────────────── */}
          {step !== "loading" ? (
            <div className="border-b border-slate-100 px-6 py-4 md:px-8">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {stepFlow.map((stepItem, index) => {
                  const active = stepItem.key === step;
                  const currentIndex = stepFlow.findIndex((item) => item.key === step);
                  const completed = currentIndex > index;

                  return (
                    <div
                      key={stepItem.key}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-center transition-all",
                        active ? "border-blue-600 bg-blue-50 text-blue-700" : completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-400",
                      )}
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Step {index + 1}</p>
                      <p className="mt-1 text-sm font-bold">{stepItem.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {/* ── Step content ───────────────────────────────────────────────── */}
          <AnimatePresence mode="wait">
            {(step === "build" || step === "loading") ? <QuoteStepForm key="form-steps" /> : null}
            {step === "review" ? <QuoteResults key="review" /> : null}
            {(step === "contact" || step === "booking") ? <QuoteActions key="action-steps" /> : null}
          </AnimatePresence>
        </CardContent>
      </Card>
    </QuoteToolContext.Provider>
  );
}
