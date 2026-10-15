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
      <Card className="mx-auto w-full max-w-5xl overflow-clip rounded-[32px] border-slate-200 bg-white shadow-2xl">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="bg-slate-900 px-5 py-5 text-white md:px-8 md:py-6">
          <div className="flex items-start gap-4">
            <div className="hidden rounded-2xl bg-blue-600/20 p-3 text-blue-300 sm:block">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-300 md:text-sm">Instant Estimate</p>
              <h3 className="text-xl font-extrabold leading-tight md:text-3xl">Build your setup, see your price</h3>
              <p className="max-w-2xl text-sm text-slate-300 md:text-base">
                The total updates as you go. Rather talk? <a href={telHref} className="font-semibold text-white underline-offset-2 hover:underline">Call or text {businessPhone}</a>.
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
          {step !== "loading" ? (() => {
            const currentIndex = stepFlow.findIndex((item) => item.key === step);
            return (
              <div className="border-b border-slate-100 px-5 py-3 md:px-8 md:py-4">
                <ol className="flex items-center gap-2 md:gap-3" aria-label="Quote progress">
                  {stepFlow.map((stepItem, index) => {
                    const active = index === currentIndex;
                    const completed = currentIndex > index;
                    return (
                      <li
                        key={stepItem.key}
                        aria-current={active ? "step" : undefined}
                        className={cn(
                          "flex min-w-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-bold transition-all md:flex-1 md:justify-center md:rounded-2xl md:px-3 md:py-2.5 md:text-sm",
                          active ? "flex-1 border-blue-600 bg-blue-50 text-blue-700" : completed ? "border-green-200 bg-green-50 text-green-700" : "border-slate-200 bg-slate-50 text-slate-400",
                        )}
                      >
                        <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px]", active ? "bg-blue-600 text-white" : completed ? "bg-green-600 text-white" : "bg-slate-200 text-slate-500")}>
                          {completed ? "✓" : index + 1}
                        </span>
                        <span className={cn("truncate", active ? "inline" : "hidden md:inline")}>{stepItem.label}</span>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })() : null}

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
