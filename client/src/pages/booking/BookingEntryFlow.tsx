import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { ENTRY_CARDS, type EntryMode, type QuickDetails } from "@/pages/booking/shared";

type Props = {
  isQuoteFlow: boolean;
  entryMode: EntryMode;
  quickDetails: QuickDetails;
  roughEstimate: { low: number; high: number } | null;
  setEntryMode: (mode: EntryMode) => void;
  setDirectConfigured: (configured: boolean) => void;
  setStep: (step: 1 | 2 | 3) => void;
  setQuickDetails: React.Dispatch<React.SetStateAction<QuickDetails>>;
};

export default function BookingEntryFlow({
  isQuoteFlow,
  entryMode,
  quickDetails,
  roughEstimate,
  setEntryMode,
  setDirectConfigured,
  setStep,
  setQuickDetails,
}: Props) {
  if (isQuoteFlow) return null;

  if (!entryMode) {
    return (
      <div className="space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">What do you need?</h1>
          <p className="text-slate-500">Pick the closest option and we&apos;ll guide you from there.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {ENTRY_CARDS.map((card) => (
            <button key={card.id} type="button" onClick={() => setEntryMode(card.id)} className="rounded-[28px] border border-slate-200 bg-white p-6 text-left shadow-sm transition-all hover:border-blue-200 hover:shadow-md">
              <div className="text-4xl">{card.icon}</div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{card.subtitle}</p>
            </button>
          ))}
          <Link href="/quote">
            <button type="button" className="rounded-[28px] border border-blue-200 bg-blue-50 p-6 text-left shadow-sm transition-all hover:border-blue-300 hover:shadow-md">
              <div className="text-4xl">✨</div>
              <h2 className="mt-4 text-xl font-bold text-slate-900">Not sure — get a custom quote first</h2>
              <p className="mt-2 text-sm text-slate-600">Most customers use our quote tool for an exact price before booking.</p>
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="pl-0" onClick={() => { setEntryMode(null); setDirectConfigured(false); }}>
        Back
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900">Quick details</h1>
        <p className="text-slate-500">This gives you a rough estimate before you pick a time.</p>
      </div>
      <Card className="rounded-[28px] p-6 shadow-sm">
        {entryMode === "smart_home" ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>How many smart devices?</Label>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((count) => (
                  <Button key={count} type="button" variant={quickDetails.smartCount === count ? "default" : "outline"} className="h-12 rounded-2xl" onClick={() => setQuickDetails((current) => ({ ...current, smartCount: count }))}>{count}</Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { key: "cameras", label: "Security cameras" },
                { key: "doorbell", label: "Doorbell install" },
                { key: "floodlight", label: "Floodlight install" },
              ].map((option) => (
                <button key={option.key} type="button" onClick={() => setQuickDetails((current) => ({ ...current, [option.key]: !current[option.key as keyof QuickDetails] }))} className={cn("rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-all", quickDetails[option.key as keyof QuickDetails] ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700")}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>How many TVs?</Label>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((count) => (
                  <Button key={count} type="button" variant={quickDetails.tvCount === count ? "default" : "outline"} className="h-12 rounded-2xl" onClick={() => setQuickDetails((current) => ({ ...current, tvCount: count }))}>{count === 4 ? "4+" : count}</Button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { key: "fireplace", label: "Above a fireplace" },
                { key: "brick", label: "On brick or stone wall" },
                { key: "concealment", label: "Need wires hidden" },
                { key: "mountProvided", label: "Need a mount provided" },
              ].map((option) => (
                <button key={option.key} type="button" onClick={() => setQuickDetails((current) => ({ ...current, [option.key]: !current[option.key as keyof QuickDetails] }))} className={cn("rounded-2xl border px-4 py-4 text-left text-sm font-semibold transition-all", quickDetails[option.key as keyof QuickDetails] ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700")}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {roughEstimate ? (
          <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Rough estimate</p>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">${roughEstimate.low}–${roughEstimate.high}</p>
            <p className="mt-2 text-sm text-slate-600">Based on what you selected, your estimate is shown as a range until we confirm the exact setup.</p>
          </div>
        ) : null}
        <div className="mt-8 flex justify-end">
          <Button className="h-12 rounded-2xl bg-blue-600 px-6 font-bold text-white hover:bg-blue-500" onClick={() => { setDirectConfigured(true); setStep(1); }}>
            Continue to schedule
          </Button>
        </div>
      </Card>
    </div>
  );
}
