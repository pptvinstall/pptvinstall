import { useEffect } from "react";
import { Link } from "wouter";
import { MapPin, CheckCircle2, Star, Phone, CalendarDays, Tv, Camera, Bell, Plug, Speaker, Wrench, Smartphone, Trash2 } from "lucide-react";

import { siteConfig } from "@/config/cms";
import { pricingData } from "@/data/pricing-data";
import { type CityPageData } from "@/data/city-pages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const PHONE = siteConfig.businessInfo.phone;
const TEL_HREF = `tel:${PHONE.replace(/\D/g, "")}`;

const SERVICES = [
  { icon: Tv, label: "TV Mounting", price: `from ${pricingData.tvMounting.standard.price}` },
  { icon: Plug, label: "Outlet Behind TV", price: `${pricingData.wireConcealment.standard.price}` },
  { icon: Camera, label: "Security Cameras", price: "Custom quote" },
  { icon: Bell, label: "Smart Doorbell", price: "Custom quote" },
  { icon: Speaker, label: "Soundbar Setup", price: "Custom quote" },
  { icon: Wrench, label: "AV Troubleshooting", price: "Custom quote" },
  { icon: Smartphone, label: "Device Setup", price: "Custom quote" },
  { icon: Trash2, label: "TV Removal", price: `${pricingData.otherServices.tvUnmounting.price} each` },
];

const TRUST_POINTS = [
  "10+ years of TV mounting experience",
  "TV and mount compatibility checked before install",
  "Clear scope and pricing before work begins",
  "Clean, level, secure installation",
  "Evening and weekend availability",
];

type Props = { city: CityPageData };

export default function CityPage({ city }: Props) {
  // Set page title on mount
  useEffect(() => {
    document.title = `${city.name} TV Mounting & Smart Home Install | Picture Perfect TV Install`;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute(
        "content",
        `Professional TV mounting and selective smart-home installation in ${city.name}, ${city.county}. Evening and weekend appointments; same-day may be possible. Starting at $100 — call ${PHONE}.`,
      );
    }
  }, [city]);

  // JSON-LD LocalBusiness schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "Picture Perfect TV Install",
    description: `Professional TV mounting and smart home installation in ${city.name}, GA`,
    telephone: PHONE,
    email: siteConfig.businessInfo.email,
    url: `https://pptvinstall.com/areas/${city.slug}`,
    areaServed: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: city.county,
      },
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "17:30",
        closes: "19:00",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday"],
        opens: "11:00",
        closes: "19:00",
      },
    ],
    priceRange: "$$",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "TV Mounting & Smart Home Services",
      itemListElement: SERVICES.map((service) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.label,
        },
      })),
    },
  };

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-white">
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className="bg-slate-900 px-6 py-16 text-white md:px-8 md:py-24">
          <div className="mx-auto max-w-4xl">
            <div className="mb-4 flex items-center gap-2 text-blue-300">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-semibold uppercase tracking-widest">{city.name}, {city.county}</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">{city.headline}</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">{city.subheadline}</p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/booking">
                <Button className="h-14 rounded-2xl bg-blue-600 px-8 text-base font-bold text-white hover:bg-blue-500">
                  <CalendarDays className="mr-2 h-5 w-5" />
                  Book Now — Pick Your Time
                </Button>
              </Link>
              <a href={TEL_HREF}>
                <Button variant="outline" className="h-14 rounded-2xl border-slate-600 bg-transparent px-8 text-base font-bold text-white hover:bg-slate-800">
                  <Phone className="mr-2 h-5 w-5" />
                  Call {PHONE}
                </Button>
              </a>
            </div>
          </div>
        </section>

        {/* ── Area blurb ──────────────────────────────────────────────────── */}
        <section className="px-6 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <p className="text-lg leading-8 text-slate-700">{city.areaBlurb}</p>
            <div className="mt-6 flex flex-wrap gap-2">
              {city.neighborhoods.map((n) => (
                <span key={n} className="rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm font-medium text-slate-700">
                  {n}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Services ────────────────────────────────────────────────────── */}
        <section className="bg-slate-50 px-6 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900">Services in {city.name}</h2>
            <p className="mt-2 text-slate-500">Same pricing as our full service area — no {city.name} surcharge on listed services.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {SERVICES.map(({ icon: Icon, label, price }) => (
                <Card key={label} className="rounded-[20px] border-slate-200 shadow-sm">
                  <CardContent className="p-5">
                    <Icon className="h-6 w-6 text-blue-600" />
                    <p className="mt-3 font-bold text-slate-900">{label}</p>
                    <p className="mt-1 text-sm text-slate-500">{price}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/services">
                <Button variant="outline" className="rounded-2xl border-slate-300 px-6">
                  See full pricing →
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust signals ───────────────────────────────────────────────── */}
        <section className="px-6 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Why {city.name} homeowners choose us</h2>
                <ul className="mt-6 space-y-3">
                  {TRUST_POINTS.map((point) => (
                    <li key={point} className="flex items-start gap-3 text-sm text-slate-700">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-6">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="mt-4 text-base leading-7 text-slate-700">
                  "Fast, professional, and extremely clean work. Had two TVs mounted and wires hidden in under 2 hours. Will absolutely use again."
                </blockquote>
                <p className="mt-4 text-sm font-semibold text-slate-900">— Verified Google Review, Metro Atlanta</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ─────────────────────────────────────────────────────────── */}
        <section className="bg-slate-50 px-6 py-12 md:px-8">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-extrabold text-slate-900">Frequently asked questions — {city.name}</h2>
            <div className="mt-8 space-y-4">
              {city.faq.map(({ question, answer }) => (
                <div key={question} className="rounded-[20px] border border-slate-200 bg-white p-5">
                  <h3 className="font-bold text-slate-900">{question}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────────────────── */}
        <section className="px-6 py-16 md:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-extrabold text-slate-900">Ready to book in {city.name}?</h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-500">
              Use our online booking tool to pick a date and time. Evening and weekend slots available. Your quote is ready before you book.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/booking">
                <Button className="h-14 rounded-2xl bg-blue-600 px-10 text-base font-bold text-white hover:bg-blue-500">
                  Book Your Install
                </Button>
              </Link>
              <a href={TEL_HREF} className="text-base font-semibold text-slate-700 hover:text-slate-900">
                Or call {PHONE}
              </a>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
