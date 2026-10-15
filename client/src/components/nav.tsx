import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Menu, MessageSquare, Phone, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "FAQ", href: "/faq" },
  { label: "Contact", href: "/contact" },
];

const PHONE_HREF = "4047024748";

export default function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  const closeMenu = () => setMobileMenuOpen(false);

  useEffect(() => {
    closeMenu();
  }, [location]);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMenu();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-xl" aria-label="Main navigation">
        <div className="container mx-auto flex min-h-[68px] items-center justify-between gap-4 px-4">
          <Logo variant="dark" />

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = location === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-sm font-bold transition-colors ${
                    active ? "bg-blue-50 text-blue-700" : "text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link href="/quote">
              <Button variant="outline" className="h-11 rounded-xl border-slate-300 px-4 text-sm font-bold text-slate-900 hover:bg-slate-50">
                <Sparkles className="mr-2 h-4 w-4" />
                Get Quote
              </Button>
            </Link>
            <Link href="/booking">
              <Button className="h-11 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-500">
                <CalendarDays className="mr-2 h-4 w-4" />
                Book Now
              </Button>
            </Link>
            <a href={`tel:${PHONE_HREF}`} aria-label="Call Picture Perfect TV Install">
              <Button variant="ghost" size="icon" className="h-11 w-11 rounded-xl text-slate-700 hover:bg-slate-100">
                <Phone className="h-5 w-5" />
              </Button>
            </a>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <a href={`tel:${PHONE_HREF}`} aria-label="Call Picture Perfect TV Install">
              <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-slate-300">
                <Phone className="h-5 w-5" />
              </Button>
            </a>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((current) => !current)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 transition hover:bg-slate-50"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm md:hidden"
            onClick={closeMenu}
          >
            <motion.div
              id="mobile-navigation"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="ml-auto flex h-full w-[min(92vw,390px)] flex-col bg-white pt-20 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Mobile navigation"
            >
              <div className="border-b border-slate-100 px-5 pb-5">
                <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-400">What do you need?</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link href="/quote" onClick={closeMenu} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-3 text-sm font-extrabold text-white">
                    <Sparkles className="h-4 w-4" />
                    Get Quote
                  </Link>
                  <Link href="/booking" onClick={closeMenu} className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-3 text-sm font-extrabold text-white">
                    <CalendarDays className="h-4 w-4" />
                    Book Now
                  </Link>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3">
                {navLinks.map((link) => {
                  const active = location === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={closeMenu}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[58px] items-center border-b border-slate-100 text-lg font-extrabold ${
                        active ? "text-blue-600" : "text-slate-900"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>

              <div className="border-t border-slate-100 bg-slate-50 p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
                <div className="grid grid-cols-2 gap-3">
                  <a href={`tel:${PHONE_HREF}`} onClick={closeMenu} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900">
                    <Phone className="h-4 w-4 text-blue-600" />
                    Call
                  </a>
                  <a href={`sms:${PHONE_HREF}`} onClick={closeMenu} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-900">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                    Text
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
