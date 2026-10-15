import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, Menu, Phone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const navLinks = [
  { label: "Services", href: "/services" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "/contact" },
  { label: "FAQ", href: "/faq" },
  { label: "Get a Quote", href: "/quote" },
];

export default function Nav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => { setMobileMenuOpen(false); }, [location]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setMobileMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const updateHeight = () => document.documentElement.style.setProperty("--site-nav-height", `${nav.offsetHeight}px`);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-nav-height");
    };
  }, []);

  return (
    <nav ref={navRef} aria-label="Main navigation" className="fixed left-0 right-0 top-0 z-50 border-b border-slate-200 bg-white/95 py-3 shadow-sm backdrop-blur">
      <div className="container mx-auto flex items-center justify-between px-4">
        <Logo variant="dark" />
        <div className="hidden items-center gap-6 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} aria-current={location === link.href ? "page" : undefined}
              className={`text-sm font-bold transition-colors hover:text-blue-600 ${location === link.href ? "text-blue-600" : "text-slate-900"}`}>
              {link.label}
            </Link>
          ))}
          <Button asChild className="rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500">
            <Link href="/booking"><CalendarDays aria-hidden="true" className="h-4 w-4" />Book Now</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-2xl border-slate-300 px-5 text-sm font-bold text-slate-900 hover:bg-slate-50">
            <a href="tel:4047024748"><Phone aria-hidden="true" className="h-4 w-4" />Call</a>
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild variant="outline" size="icon" className="rounded-2xl border-slate-300">
            <a href="tel:4047024748" aria-label="Call Picture Perfect TV Install"><Phone aria-hidden="true" className="h-5 w-5" /></a>
          </Button>
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="icon" aria-label="Open navigation menu" className="rounded-2xl">
                <Menu aria-hidden="true" className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto bg-white pt-14">
              <SheetTitle>Picture Perfect TV Install</SheetTitle>
              <SheetDescription>Explore our services or schedule your installation.</SheetDescription>
              <div className="mt-6">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setMobileMenuOpen(false)}
                    aria-current={location === link.href ? "page" : undefined}
                    className="flex min-h-14 items-center border-b border-slate-100 text-lg font-bold text-slate-900 hover:text-blue-600">
                    {link.label}
                  </Link>
                ))}
                <Button asChild className="mt-6 w-full rounded-2xl">
                  <Link href="/booking" onClick={() => setMobileMenuOpen(false)}><CalendarDays aria-hidden="true" />Book installation</Link>
                </Button>
                <a href="tel:4047024748" onClick={() => setMobileMenuOpen(false)} className="mt-3 flex min-h-11 items-center justify-center gap-2 font-semibold text-blue-700">
                  <Phone aria-hidden="true" className="h-4 w-4" />404-702-4748
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
