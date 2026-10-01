import { format } from "date-fns";
import { ArrowLeft, CalendarDays, CheckCircle2, Loader2, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import type { Details, PendingQuote } from "@/pages/booking/shared";

type ReviewItem = { name: string; lineTotal: number; qty?: number };

type Props = {
  date?: Date;
  time: string;
  details: Details;
  pendingQuote: PendingQuote | null;
  reviewItems: ReviewItem[];
  estimatedTotal: number;
  isSubmitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export default function BookingReviewStep({
  date,
  time,
  details,
  pendingQuote,
  reviewItems,
  estimatedTotal,
  isSubmitting,
  onBack,
  onSubmit,
}: Props) {
  return (
    <div className="space-y-6">
      <Button variant="ghost" className="pl-0" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Back to details</Button>
      <Card className="rounded-[28px] p-6 shadow-sm">
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold text-slate-900">Review and confirm</h1>
          <p className="text-slate-500">No payment required now. We confirm within 1 hour.</p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900"><CalendarDays className="h-4 w-4 text-blue-600" /><span className="font-semibold">Appointment</span></div>
              <p className="mt-2 text-sm text-slate-700">{date ? format(date, "EEEE, MMMM d, yyyy") : ""} at {time}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-900"><MapPin className="h-4 w-4 text-blue-600" /><span className="font-semibold">Customer details</span></div>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p>{details.firstName} {details.lastName}</p>
                <p>{details.phone}</p>
                <p>{details.email}</p>
                <p>{details.streetAddress}</p>
                <p>{details.city}, {details.state} {details.zipCode}</p>
                <p>{details.notes.trim() || "No special instructions provided."}</p>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">{pendingQuote ? "Quote summary" : "Service summary"}</p>
              <div className="mt-4 space-y-2">
                {reviewItems.map((item) => (
                  <div key={item.name} className="flex items-start justify-between gap-3 text-sm text-slate-700">
                    <span>{item.name}</span>
                    <span className="font-semibold">${Math.abs(item.lineTotal)}</span>
                  </div>
                ))}
              </div>
              {pendingQuote ? <p className="mt-4 text-sm text-slate-500">{pendingQuote.summary}</p> : null}
            </div>
            <div className="rounded-2xl bg-slate-900 p-5 text-white">
              <div className="flex items-center justify-between text-sm"><span className="text-slate-300">Estimated total</span><span className="text-2xl font-extrabold">${estimatedTotal}</span></div>
              <p className="mt-3 text-xs text-slate-300">No payment required now. We confirm within 1 hour.</p>
            </div>
          </div>
        </div>
        <div className="mt-8 flex justify-end">
          <Button className="h-14 rounded-2xl bg-green-600 px-8 text-base font-bold text-white hover:bg-green-500" disabled={isSubmitting} onClick={onSubmit}>{isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}Confirm my booking</Button>
        </div>
      </Card>
    </div>
  );
}
