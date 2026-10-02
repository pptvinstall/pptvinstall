import { format, isBefore, startOfDay } from "date-fns";
import { ArrowLeft, CalendarDays, Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { getAllSlots } from "@/pages/booking/shared";

type Props = {
  isQuoteFlow: boolean;
  roughEstimate: { low: number; high: number } | null;
  date?: Date;
  time: string;
  heldSlot: string;
  sameDayMessage: string;
  sameDayJump: Date | null;
  sameDayJumpSlot: string;
  slotConflict: string;
  suggestedSlots: string[];
  availableSlots: string[];
  estimatedTotal: number;
  earliestAvailable: string;
  isSearching: boolean;
  setTime: (time: string) => void;
  setDate: (date?: Date) => void;
  setHeldSlot: (time: string) => void;
  setSlotConflict: (value: string) => void;
  setSuggestedSlots: (slots: string[]) => void;
  onBackToEntry: () => void;
  onFindNextASAP: () => void;
  onContinue: () => void;
};

export default function BookingDateTimeStep({
  isQuoteFlow,
  roughEstimate,
  date,
  time,
  heldSlot,
  sameDayMessage,
  sameDayJump,
  sameDayJumpSlot,
  slotConflict,
  suggestedSlots,
  availableSlots,
  estimatedTotal,
  earliestAvailable,
  isSearching,
  setTime,
  setDate,
  setHeldSlot,
  setSlotConflict,
  setSuggestedSlots,
  onBackToEntry,
  onFindNextASAP,
  onContinue,
}: Props) {
  return (
    <div className="space-y-6">
      {!isQuoteFlow ? <Button variant="ghost" className="pl-0" onClick={onBackToEntry}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button> : null}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div><h1 className="text-3xl font-extrabold text-slate-900">Pick your date and time</h1><p className="mt-2 text-slate-500">Choose what works best and we&apos;ll hold it while you finish booking.</p></div>
        <Button onClick={onFindNextASAP} disabled={isSearching} className="h-12 rounded-2xl bg-amber-400 px-6 font-bold text-amber-950 hover:bg-amber-300">{isSearching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}{isSearching ? "Finding earliest..." : "Earliest available"}</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Badge className="border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700"><ShieldCheck className="mr-2 h-3.5 w-3.5" />Same-day bookings require 2 hours notice</Badge>
        {!isQuoteFlow && roughEstimate ? <Badge className="border border-slate-200 bg-white px-3 py-1 text-slate-700"><Sparkles className="mr-2 h-3.5 w-3.5" />Rough estimate: ${roughEstimate.low}–${roughEstimate.high}</Badge> : null}
      </div>

      {slotConflict ? <Alert className="border-amber-200 bg-amber-50 text-amber-900"><CalendarDays className="h-4 w-4" /><AlertTitle>Slot update</AlertTitle><AlertDescription><p>{slotConflict}</p>{suggestedSlots.length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{suggestedSlots.map((slot) => <Button key={slot} type="button" variant="outline" className="h-10 rounded-xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100" onClick={() => { setTime(slot); setHeldSlot(slot); setSlotConflict(""); }}>{slot}</Button>)}</div> : null}</AlertDescription></Alert> : null}

      <div className="grid gap-6 lg:grid-cols-[360px,1fr]">
        <Card className="rounded-[28px] p-4 shadow-sm">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(value) => { setDate(value); setTime(""); setHeldSlot(""); setSlotConflict(""); setSuggestedSlots([]); }}
            disabled={(value) => isBefore(startOfDay(value), startOfDay(new Date())) || value.toDateString() === new Date().toDateString() && getAllSlots(value).length === 0}
            modifiers={{ unavailableToday: (value) => value.toDateString() === new Date().toDateString() && getAllSlots(value).length === 0 }}
            modifiersClassNames={{ unavailableToday: "opacity-40 line-through" }}
            className="rounded-2xl border shadow-none"
          />
        </Card>
        <Card className="rounded-[28px] p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-900">{date ? format(date, "EEEE, MMMM d") : "Select a date"}</h2><p className="mt-1 text-sm text-slate-500">{date ? (date.getDay() === 0 || date.getDay() === 6 ? "Weekend appointments run from 11:00 AM to 7:00 PM." : "Weekday appointments run from 5:30 PM to 7:00 PM.") : "Available times will appear here."}</p></div><Badge className="bg-blue-100 text-blue-800">${estimatedTotal}</Badge></div>
          {sameDayMessage ? <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-sm text-amber-900">{sameDayMessage}</p>{sameDayJump ? <Button type="button" variant="outline" className="mt-3 rounded-xl border-amber-300 bg-white text-amber-900 hover:bg-amber-100" onClick={() => { setDate(sameDayJump); setTime(sameDayJumpSlot); setHeldSlot(sameDayJumpSlot); }}>Jump to next available</Button> : null}</div> : null}
          {date ? availableSlots.length > 0 ? <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">{getAllSlots(date).map((slot) => { const unavailable = !availableSlots.includes(slot); const selected = time === slot; const suggested = suggestedSlots.includes(slot); return <Button key={slot} type="button" variant={selected ? "default" : "outline"} disabled={unavailable} onClick={() => { setTime(slot); setHeldSlot(slot); setSlotConflict(""); setSuggestedSlots([]); }} className={cn("h-12 rounded-2xl", unavailable && "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through hover:bg-slate-100", selected && "bg-blue-600 text-white hover:bg-blue-600", suggested && !unavailable && !selected && "border-amber-300 bg-amber-50 text-amber-900")}>{selected ? <Check className="mr-2 h-4 w-4" /> : null}{slot}</Button>; })}</div> : <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">No available slots for this day.</div> : null}
          {time ? <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"><div className="flex items-center justify-between gap-3"><span>Holding this slot...</span><span className="font-semibold">{time}</span></div></div> : null}
          {earliestAvailable && date ? <p className="mt-4 text-sm text-slate-500">Earliest available for this day: <span className="font-semibold text-slate-900">{earliestAvailable}</span></p> : null}
          <div className="mt-8 flex justify-end"><Button className="h-12 rounded-2xl bg-blue-600 px-6 font-bold text-white hover:bg-blue-500" disabled={!date || !time || heldSlot !== time} onClick={onContinue}>Continue</Button></div>
        </Card>
      </div>
    </div>
  );
}
