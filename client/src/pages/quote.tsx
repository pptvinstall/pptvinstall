import { lazy, Suspense } from "react";
import { MessageSquareText, ReceiptText, CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

const QuoteEducation = lazy(() => import("@/components/ui/QuoteEducation").then((module) => ({ default: module.QuoteEducation })));
const QuoteTool = lazy(() => import("@/components/ui/QuoteTool"));

const steps = [
  {
    icon: MessageSquareText,
    title: "Tell us what you need",
    description: "Use the builder, type it out, or send a voice note.",
  },
  {
    icon: ReceiptText,
    title: "Get an instant itemized price",
    description: "We break down your estimate clearly before you book.",
  },
  {
    icon: CalendarDays,
    title: "Pick your time and we show up",
    description: "Choose your slot and we handle the rest.",
  },
];

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
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-6xl pt-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
          Get an instant quote
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
          Get an instant quote for TV mounting in Atlanta and across Metro Atlanta. Build each TV your way, add shared services, or just describe the whole job.
        </p>
        <p className="mx-auto mt-3 max-w-3xl text-sm text-slate-500">
          Serving Midtown, Buckhead, Decatur, Marietta, Alpharetta, Roswell, Lawrenceville, and nearby Atlanta-area neighborhoods. Need a faster answer? <a href="tel:14047024748" className="font-semibold text-blue-600 hover:underline">Call 404-702-4748</a> or <a href="sms:4047024748?body=Hi! I need a TV mounting quote in Atlanta." className="font-semibold text-blue-600 hover:underline">text us</a>.
        </p>
      </div>

      <section className="mx-auto mt-10 max-w-6xl">
        <div className="mb-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">How It Works</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <Card key={step.title} className="rounded-[28px] border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-6 text-left">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                  <step.icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{step.title}</h2>
                <p className="text-sm text-slate-600">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-6xl">
        <Suspense fallback={loadingCard}>
          <QuoteEducation />
        </Suspense>
      </section>

      <div className="mx-auto mt-10 max-w-6xl">
        <Suspense fallback={loadingCard}>
          <QuoteTool />
        </Suspense>
      </div>
    </div>
  );
}
