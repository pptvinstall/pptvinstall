import { lazy, Suspense } from "react";
import { CheckCircle2, MessageSquare, Phone } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const QuoteEducation = lazy(() => import("@/components/ui/QuoteEducation").then((module) => ({ default: module.QuoteEducation })));
const QuoteTool = lazy(() => import("@/components/ui/QuoteTool"));

const PHONE_DISPLAY = "404-702-4748";
const PHONE_HREF = "4047024748";

export default function QuotePage() {
  const loadingCard = (
    <Card className="rounded-[28px] border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-8">
        <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-20 pt-10 md:pt-14">
      <header className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">No-obligation estimate</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 md:text-6xl">Price your installation before you book.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
          Build each TV and add only the services that apply. Standard TV mounting starts at $100, and the estimator shows the job as an itemized total.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-bold text-slate-700">
          {["Itemized estimate", "Multiple-TV friendly", "Book after you review"].map((item) => (
            <span key={item} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {item}
            </span>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-600">
          <a href={`tel:${PHONE_HREF}`} className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700">
            <Phone className="h-4 w-4" />
            Call {PHONE_DISPLAY}
          </a>
          <a
            href={`sms:${PHONE_HREF}?body=Hi! I need a TV mounting quote in Atlanta.`}
            className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700"
          >
            <MessageSquare className="h-4 w-4" />
            Text a question
          </a>
        </div>
      </header>

      <main className="mx-auto mt-10 max-w-6xl">
        <Suspense fallback={loadingCard}>
          <QuoteTool />
        </Suspense>

        <section className="mt-16">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Need help choosing?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">A quick guide to the options.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              If you&apos;re not sure which mount, wall type, or add-on applies, this explains the choices without getting in the way of the quote.
            </p>
          </div>
          <Suspense fallback={loadingCard}>
            <QuoteEducation />
          </Suspense>
        </section>
      </main>
    </div>
  );
}
