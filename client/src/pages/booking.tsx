import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Check } from "lucide-react";
import { useLocation } from "wouter";

import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

import BookingLoadingState from "@/pages/booking/BookingLoadingState";
import {
  QUOTE_KEY,
  buildReviewItems,
  calculateRoughEstimate,
  createInitialDetails,
  createInitialQuickDetails,
  getAvailableSlots,
  nextAvailableDate,
  validateDetails,
  type BookingStep,
  type Details,
  type EntryMode,
  type PendingQuote,
  type QuickDetails,
} from "@/pages/booking/shared";

const QuoteSummaryCard = lazy(() => import("@/pages/booking/QuoteSummaryCard"));
const BookingEntryFlow = lazy(() => import("@/pages/booking/BookingEntryFlow"));
const BookingDateTimeStep = lazy(() => import("@/pages/booking/BookingDateTimeStep"));
const BookingDetailsStep = lazy(() => import("@/pages/booking/BookingDetailsStep"));
const BookingReviewStep = lazy(() => import("@/pages/booking/BookingReviewStep"));

export default function Booking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [pendingQuote, setPendingQuote] = useState<PendingQuote | null>(null);
  const [quoteExpanded, setQuoteExpanded] = useState(false);
  const [entryMode, setEntryMode] = useState<EntryMode>(null);
  const [directConfigured, setDirectConfigured] = useState(false);
  const [step, setStep] = useState<BookingStep>(1);
  const [date, setDate] = useState<Date>();
  const [time, setTime] = useState("");
  const [heldSlot, setHeldSlot] = useState("");
  const [takenSlots, setTakenSlots] = useState<string[]>([]);
  const [suggestedSlots, setSuggestedSlots] = useState<string[]>([]);
  const [slotConflict, setSlotConflict] = useState("");
  const [sameDayMessage, setSameDayMessage] = useState("");
  const [sameDayJump, setSameDayJump] = useState<Date | null>(null);
  const [sameDayJumpSlot, setSameDayJumpSlot] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof Details, string>>>({});
  const [details, setDetails] = useState<Details>(createInitialDetails);
  const [quickDetails, setQuickDetails] = useState<QuickDetails>(createInitialQuickDetails);

  useEffect(() => {
    trackEvent("booking_page_visit", { path: "/booking" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(QUOTE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as PendingQuote;
      setPendingQuote(parsed);
      if (parsed.zipCode) {
        setDetails((current) => ({ ...current, zipCode: parsed.zipCode || "" }));
      }
    } catch (error) {
      console.error("Could not parse pending quote:", error);
    }
  }, []);

  useEffect(() => {
    if (!date) {
      setTakenSlots([]);
      setSameDayMessage("");
      return;
    }

    fetch(`/api/availability?date=${format(date, "yyyy-MM-dd")}`)
      .then((response) => response.json())
      .then((data: string[]) => {
        setTakenSlots(data);
        const isToday = date.toDateString() === new Date().toDateString();
        const availableToday = getAvailableSlots(date, data);
        if (isToday && availableToday.length === 0) {
          const jump = nextAvailableDate(new Date(), {
            [format(date, "yyyy-MM-dd")]: data,
          });
          if (jump) {
            setSameDayJump(jump.date);
            setSameDayJumpSlot(jump.slot);
            setSameDayMessage(`No more slots available today - the next available time is ${format(jump.date, "EEE, MMM d")} at ${jump.slot}.`);
          } else {
            setSameDayJump(null);
            setSameDayJumpSlot("");
            setSameDayMessage("No more same-day slots are available right now.");
          }
        } else {
          setSameDayMessage("");
          setSameDayJump(null);
          setSameDayJumpSlot("");
        }
      })
      .catch((error) => console.error("Availability error:", error));
  }, [date]);

  const isQuoteFlow = Boolean(pendingQuote);
  const roughEstimate = useMemo(() => calculateRoughEstimate(isQuoteFlow, entryMode, quickDetails), [entryMode, isQuoteFlow, quickDetails]);
  const estimatedTotal = pendingQuote?.total ?? roughEstimate?.high ?? 0;
  const availableSlots = useMemo(() => (date ? getAvailableSlots(date, takenSlots) : []), [date, takenSlots]);
  const earliestAvailable = availableSlots[0] ?? "";
  const reviewItems = useMemo(() => buildReviewItems(pendingQuote, entryMode, quickDetails), [entryMode, pendingQuote, quickDetails]);

  async function findNextASAP() {
    setIsSearching(true);
    try {
      const response = await fetch("/api/next-slot");
      if (!response.ok) throw new Error("No slots found");
      const next = (await response.json()) as { date: string; time: string };
      const nextDate = new Date(`${next.date}T12:00:00`);
      setDate(nextDate);
      setTime(next.time);
      setHeldSlot(next.time);
      setSlotConflict("");
      setSuggestedSlots([]);
      trackEvent("booking_earliest_slot_selected", { date: next.date, time: next.time });
      toast({ title: "Earliest available selected", description: `${format(nextDate, "MMM d")} at ${next.time}` });
    } catch {
      toast({ title: "No slots found", description: "We couldn't find an opening in the next 14 days.", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }

  function continueFromDetails() {
    const nextErrors = validateDetails(details);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setStep(3);
    }
  }

  async function submitBooking() {
    if (!date || !time) {
      toast({ title: "Choose a time slot", description: "Please pick a date and time first.", variant: "destructive" });
      setStep(1);
      return;
    }

    const nextErrors = validateDetails(details);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStep(2);
      return;
    }

    setIsSubmitting(true);
    const pricingBreakdown = pendingQuote
      ? JSON.stringify({ source: "quote_generated", quoteSummary: pendingQuote.summary, quoteGroups: pendingQuote.groups, quoteFlags: pendingQuote.flags ?? [], promoCode: pendingQuote.promoCode })
      : JSON.stringify({
          source: "direct_booking",
          entryMode,
          quickDetails,
          estimateRange: roughEstimate,
          items: reviewItems.map((item) => ({ name: item.name, price: Math.abs(item.lineTotal), qty: 1, lineTotal: Math.abs(item.lineTotal) })),
        });

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${details.firstName.trim()} ${details.lastName.trim()}`,
          email: details.email.trim(),
          phone: details.phone.trim(),
          streetAddress: details.streetAddress.trim(),
          city: details.city.trim(),
          state: details.state,
          zipCode: details.zipCode.trim(),
          notes: details.notes.trim(),
          specialInstructions: details.notes.trim(),
          serviceType: pendingQuote ? "quote_generated" : `booking_${entryMode ?? "custom"}`,
          preferredDate: format(date, "yyyy-MM-dd"),
          appointmentTime: time,
          pricingTotal: String(estimatedTotal),
          pricingBreakdown,
          birthday: details.birthday || undefined,
          emailMarketingOptIn: details.emailMarketingOptIn,
          transactionalSmsOptIn: details.transactionalSmsOptIn,
          transactionalSmsConsentSource: "booking_form",
          smsMarketingOptIn: details.smsMarketingOptIn,
          birthdayPromoOptIn: details.birthdayPromoOptIn,
          consentSource: "booking_form",
          status: "active",
        }),
      });

      if (response.status === 409) {
        const refreshed = await fetch(`/api/availability?date=${format(date, "yyyy-MM-dd")}`).then((res) => res.json() as Promise<string[]>);
        setTakenSlots(refreshed);
        setSlotConflict("Someone just grabbed that slot! Here are the next available times:");
        setSuggestedSlots(getAvailableSlots(date, refreshed).slice(0, 3));
        setStep(1);
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) throw new Error("Booking failed");
      if (typeof window !== "undefined" && pendingQuote) window.localStorage.removeItem(QUOTE_KEY);
      trackEvent("booking_submitted", { source: pendingQuote ? "quote" : "direct" });
      setLocation("/confirmation");
    } catch (error) {
      console.error(error);
      toast({
        title: "Booking didn't go through",
        description: (
          <span>
            Call or text{" "}
            <a href="tel:4047024748" className="font-bold underline">404-702-4748</a>
            {" "}and we&apos;ll get you scheduled manually.{" "}
            <a href="sms:4047024748" className="font-bold underline">Text us</a>
          </span>
        ),
        variant: "destructive",
      });
      setIsSubmitting(false);
    }
  }

  const stepFlow: Array<{ id: BookingStep; label: string }> = [
    { id: 1, label: "Date and Time" },
    { id: 2, label: "Your Details" },
    { id: 3, label: "Confirm" },
  ];

  if (!isQuoteFlow && !directConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 pb-24 pt-24">
        <div className="container mx-auto max-w-5xl px-4">
          <Suspense fallback={<BookingLoadingState />}>
            <BookingEntryFlow
              isQuoteFlow={isQuoteFlow}
              entryMode={entryMode}
              quickDetails={quickDetails}
              roughEstimate={roughEstimate}
              setEntryMode={setEntryMode}
              setDirectConfigured={setDirectConfigured}
              setStep={setStep}
              setQuickDetails={setQuickDetails}
            />
          </Suspense>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 pt-24">
      <div className="container mx-auto max-w-5xl px-4">
        <Suspense fallback={null}>
          <QuoteSummaryCard pendingQuote={pendingQuote} quoteExpanded={quoteExpanded} onToggleExpanded={() => setQuoteExpanded((current) => !current)} />
        </Suspense>

        <div className="mb-8 rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            {stepFlow.map((entry, index) => {
              const complete = step > entry.id;
              const active = step === entry.id;
              return (
                <div key={entry.id} className="flex flex-1 items-center gap-2">
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-full border text-sm font-bold", complete ? "border-blue-600 bg-blue-600 text-white" : active ? "border-blue-600 text-blue-600" : "border-slate-200 text-slate-400")}>{complete ? <Check className="h-4 w-4" /> : entry.id}</div>
                  <p className={cn("text-sm font-semibold", active || complete ? "text-blue-600" : "text-slate-400")}>{entry.label}</p>
                  {index < 2 ? <div className="hidden h-px flex-1 bg-slate-200 md:block" /> : null}
                </div>
              );
            })}
          </div>
        </div>

        <Suspense fallback={<BookingLoadingState />}>
          {step === 1 ? (
            <BookingDateTimeStep
              isQuoteFlow={isQuoteFlow}
              roughEstimate={roughEstimate}
              date={date}
              time={time}
              heldSlot={heldSlot}
              sameDayMessage={sameDayMessage}
              sameDayJump={sameDayJump}
              sameDayJumpSlot={sameDayJumpSlot}
              slotConflict={slotConflict}
              suggestedSlots={suggestedSlots}
              availableSlots={availableSlots}
              estimatedTotal={estimatedTotal}
              earliestAvailable={earliestAvailable}
              isSearching={isSearching}
              setTime={setTime}
              setDate={setDate}
              setHeldSlot={setHeldSlot}
              setSlotConflict={setSlotConflict}
              setSuggestedSlots={setSuggestedSlots}
              onBackToEntry={() => { setStep(1); setEntryMode(null); setDirectConfigured(false); }}
              onFindNextASAP={findNextASAP}
              onContinue={() => setStep(2)}
            />
          ) : null}

          {step === 2 ? (
            <BookingDetailsStep
              details={details}
              errors={errors}
              setDetails={setDetails}
              onBack={() => setStep(1)}
              onContinue={continueFromDetails}
            />
          ) : null}

          {step === 3 ? (
            <BookingReviewStep
              date={date}
              time={time}
              details={details}
              pendingQuote={pendingQuote}
              reviewItems={reviewItems}
              estimatedTotal={estimatedTotal}
              isSubmitting={isSubmitting}
              onBack={() => setStep(2)}
              onSubmit={submitBooking}
            />
          ) : null}
        </Suspense>
      </div>
    </div>
  );
}
