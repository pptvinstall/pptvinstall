import { Link } from "wouter";
import { CalendarDays, MessageSquare, Phone, Sparkles } from "lucide-react";

const PHONE_HREF = "4047024748";

export default function MobileFAB() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        <Link
          href="/quote"
          className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl bg-blue-600 px-2 text-[11px] font-extrabold text-white"
          aria-label="Get an instant quote"
        >
          <Sparkles className="h-5 w-5" />
          Quote
        </Link>
        <Link
          href="/booking"
          className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-extrabold text-slate-800 transition hover:bg-slate-100"
          aria-label="Book an installation"
        >
          <CalendarDays className="h-5 w-5 text-slate-600" />
          Book
        </Link>
        <a
          href={`tel:${PHONE_HREF}`}
          className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-extrabold text-slate-800 transition hover:bg-slate-100"
          aria-label="Call Picture Perfect TV Install"
        >
          <Phone className="h-5 w-5 text-slate-600" />
          Call
        </a>
        <a
          href={`sms:${PHONE_HREF}?body=Hi! I'm interested in a TV installation.`}
          className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-xl px-2 text-[11px] font-extrabold text-slate-800 transition hover:bg-slate-100"
          aria-label="Text Picture Perfect TV Install"
        >
          <MessageSquare className="h-5 w-5 text-slate-600" />
          Text
        </a>
      </div>
    </div>
  );
}
