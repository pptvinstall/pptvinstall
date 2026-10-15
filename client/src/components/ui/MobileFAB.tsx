import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, MessageSquare, Phone, Sparkles } from "lucide-react";

const PHONE_HREF = "4047024748";

export default function MobileFAB() {
  const [location] = useLocation();
  const isFocusedFlow =
    location.startsWith("/quote") ||
    location.startsWith("/booking") ||
    location.startsWith("/confirmation") ||
    location.startsWith("/payment") ||
    location.startsWith("/q/") ||
    location.startsWith("/review") ||
    location.startsWith("/dashboard") ||
    location.startsWith("/admin");
  const onHome = location === "/";
  const [quoteInView, setQuoteInView] = useState(false);

  // On the homepage the quote tool has its own sticky price bar with the
  // "Get My Quote" button. Slide this bar away while the tool is on screen so
  // the two don't stack on top of each other.
  useEffect(() => {
    setQuoteInView(false);
    if (!onHome || typeof IntersectionObserver === "undefined") return;

    let observer: IntersectionObserver | null = null;
    let attempts = 0;
    let timer = 0;
    const attach = () => {
      const target = document.getElementById("instant-quote");
      if (!target) {
        // The homepage is lazy-loaded; keep looking briefly.
        if (attempts++ < 40) timer = window.setTimeout(attach, 250);
        return;
      }
      observer = new IntersectionObserver(([entry]) => setQuoteInView(entry.isIntersecting), { rootMargin: "-80px 0px -80px 0px" });
      observer.observe(target);
    };
    timer = window.setTimeout(attach, 0);

    return () => {
      window.clearTimeout(timer);
      observer?.disconnect();
    };
  }, [onHome]);

  if (isFocusedFlow) return null;

  // On the homepage, "Quote" scrolls to the tool already on the page instead of loading /quote.
  const handleQuoteClick = (event: React.MouseEvent) => {
    const target = document.getElementById("instant-quote");
    if (!onHome || !target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_30px_rgba(15,23,42,0.12)] backdrop-blur-xl transition-transform duration-300 md:hidden ${quoteInView ? "translate-y-full" : ""}`}
    >
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        <Link
          href="/quote"
          onClick={handleQuoteClick}
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
