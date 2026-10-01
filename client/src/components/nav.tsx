import { useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, Menu, Phone, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Get a Quote", href: "/quote" },
];

export default function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <>
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 py-3 shadow-sm backdrop-blur">
        <div className="container mx-auto flex items-center justify-between px-4">
          <Logo variant="dark" />

          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className="cursor-pointer text-sm font-bold text-slate-900 transition-colors hover:text-blue-600">
                  {link.label}
                </span>
              </Link>
            ))}
            <Link href="/booking">
              <Button className="rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500">
                <CalendarDays className="h-4 w-4" />
                Book Now
              </Button>
            </Link>
            <a href="tel:4047024748" className="inline-flex items-center">
              <Button variant="outline" className="rounded-2xl border-slate-300 px-5 text-sm font-bold text-slate-900 hover:bg-slate-50">
                <Phone className="h-4 w-4" />
                Call
              </Button>
            </a>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <a href="tel:4047024748" className="inline-flex items-center">
              <Button variant="outline" size="icon" className="rounded-2xl border-slate-300">
                <Phone className="h-5 w-5" />
              </Button>
            </a>
            <button type="button" onClick={() => setMobileMenuOpen((current) => !current)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-900">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur md:hidden">
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
              className="ml-auto flex h-full w-full max-w-sm flex-col bg-white pt-24 shadow-2xl"
            >
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <button type="button" onClick={closeMenu} className={`flex min-h-[56px] w-full items-center border-b border-slate-100 text-left text-lg font-bold ${link.href === "/quote" ? "text-blue-600" : "text-slate-900"}`}>
                      {link.label}
                    </button>
                  </Link>
                ))}
                <a href="tel:4047024748" onClick={closeMenu} className="flex min-h-[56px] w-full items-center border-b border-slate-100 text-left text-lg font-bold text-slate-900">
                  Call Us
                </a>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
