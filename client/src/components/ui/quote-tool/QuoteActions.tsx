import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
} from "lucide-react";

import { formatPrice } from "@/data/pricing-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuoteContext, businessPhone, telHref, mailtoHref } from "@/components/ui/quote-tool/useQuoteState";

export default function QuoteActions() {
  const {
    quote,
    step,
    setStep,
    setLocation,
    quoteRequest,
    setQuoteRequest,
    quoteRequestError,
    quoteRequestStatus,
    nextStepIntent,
    copyStatus,
    handleScheduleNow,
    handleFollowUpRequest,
    handleEditQuote,
    copyPhoneNumber,
    resetTool,
  } = useQuoteContext();

  return (
    <>
      {/* ── Contact Step ──────────────────────────────────────────────────── */}
      {step === "contact" && quote ? (
        <motion.div
          key="contact"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-6 p-6 md:p-8"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Contact Info</p>
              <h4 className="text-3xl font-extrabold text-slate-900">How should we follow up?</h4>
              <p className="text-sm text-slate-500">Add your contact details, then choose whether to schedule now or get a follow-up first.</p>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <div className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div>
                <p className="text-sm font-semibold text-slate-900">Contact details</p>
                <p className="text-xs text-slate-500">We only use this to hold your quote and follow up.</p>
              </div>
              <Input
                value={quoteRequest.name}
                onChange={(event) => setQuoteRequest((current) => ({ ...current, name: event.target.value }))}
                placeholder="Your name"
                className="h-12 rounded-xl"
              />
              <Input
                value={quoteRequest.phone}
                onChange={(event) => setQuoteRequest((current) => ({ ...current, phone: event.target.value }))}
                placeholder="Phone number"
                inputMode="tel"
                className="h-12 rounded-xl"
              />
              <Input
                value={quoteRequest.email}
                onChange={(event) => setQuoteRequest((current) => ({ ...current, email: event.target.value }))}
                placeholder="Email (optional)"
                inputMode="email"
                className="h-12 rounded-xl"
              />
              {quoteRequestError ? <p className="text-sm text-red-600">{quoteRequestError}</p> : null}
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                <p>Most installs take 30–90 minutes.</p>
                <p className="mt-2">Final pricing may vary for complex installs, unusual walls, or custom cable paths.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-[28px] bg-slate-900 p-5 text-white shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Estimated Total</p>
                <p className="mt-3 text-4xl font-extrabold">{formatPrice(quote.total)}</p>
                <p className="mt-2 text-sm text-slate-300">Travel: reviewed before booking</p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Choose your next step</p>
                <button
                  type="button"
                  onClick={handleScheduleNow}
                  className="w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900">Schedule Now</p>
                      <p className="text-sm text-slate-500">Save this quote and move to the booking calendar.</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={quoteRequestStatus === "submitting"}
                  onClick={() => handleFollowUpRequest("send_quote")}
                  className="w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900">Send Me This Quote</p>
                      <p className="text-sm text-slate-500">We&apos;ll send the quote details and follow up.</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={quoteRequestStatus === "submitting"}
                  onClick={() => handleFollowUpRequest("text_confirm")}
                  className="w-full rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-bold text-slate-900">Request Follow-Up</p>
                      <p className="text-sm text-slate-500">We&apos;ll follow up using the contact info you entered.</p>
                    </div>
                  </div>
                </button>

                {quoteRequestStatus === "submitting" ? (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Saving your next step...</span>
                  </div>
                ) : null}

                <div className="grid gap-3 md:grid-cols-2">
                  <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={() => setStep("review")}>
                    Back to Review
                  </Button>
                  <Button type="button" variant="ghost" className="h-12 rounded-2xl" onClick={handleEditQuote}>
                    Edit Quote
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      ) : null}

      {/* ── Booking Step ──────────────────────────────────────────────────── */}
      {step === "booking" && quote ? (
        <motion.div
          key="booking"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          className="space-y-6 p-6 md:p-8"
        >
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600"
            >
              <CheckCircle2 className="h-8 w-8" />
            </motion.div>
            <div className="space-y-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Next Step</p>
              <h4 className="text-3xl font-extrabold text-slate-900">
                {nextStepIntent === "schedule" ? "Ready to schedule" : nextStepIntent === "send_quote" ? "Your quote request is in" : "Follow-up requested"}
              </h4>
              <p className="text-base text-slate-600">
                {nextStepIntent === "schedule"
                  ? "Your quote is saved. Continue to booking whenever you're ready."
                  : nextStepIntent === "send_quote"
                    ? "We'll use your contact info to follow up with this quote shortly."
                    : "We'll use your contact info to confirm details before you book."}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Quote total</p>
                <p className="text-xs text-slate-500">Held under {quoteRequest.name || "your"} quote request</p>
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{formatPrice(quote.total)}</p>
            </div>
            <div className="mt-4 text-sm text-slate-600">
              <p>Phone: {quoteRequest.phone || businessPhone}</p>
              {quoteRequest.email ? <p className="mt-1">Email: {quoteRequest.email}</p> : null}
            </div>
          </div>

          <div className="space-y-3">
            {nextStepIntent === "schedule" ? (
              <Button className="h-14 w-full rounded-2xl bg-blue-600 text-base font-bold text-white hover:bg-blue-500" onClick={() => setLocation("/booking")}>
                Continue to Scheduling <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                We have your details and will follow up using the contact info you entered.
              </div>
            )}

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <a href={telHref} className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-bold text-slate-900">Call to book</p>
                  <p className="text-sm text-slate-500">{businessPhone}</p>
                </div>
              </a>
              <div className="mt-4 flex items-center gap-3">
                <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={copyPhoneNumber}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copyStatus === "copied" ? "Copied" : "Copy number"}
                </Button>
                <a href={mailtoHref} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email quote
                  </span>
                </a>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <Button type="button" variant="outline" className="h-12 rounded-2xl" onClick={() => setStep("contact")}>
                Back
              </Button>
              <Button type="button" variant="ghost" className="h-12 rounded-2xl" onClick={resetTool}>
                Start over
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </>
  );
}
