import { lazy, Suspense } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Flame,
  MapPin,
  MessageSquare,
  Phone,
  Plug,
  Star,
  Tv,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";

const QuoteTool = lazy(() => import("@/components/ui/QuoteTool"));

const PHONE_DISPLAY = "404-702-4748";
const PHONE_HREF = "4047024748";

const services = [
  {
    icon: Tv,
    title: "TV mounting",
    copy: "Clean, level mounting on standard drywall for TVs of all common sizes.",
    detail: "Starts at $100",
  },
  {
    icon: Flame,
    title: "Fireplace mounting",
    copy: "Placement above fireplaces and mantels with the wall and viewing angle considered up front.",
    detail: "Built into your quote",
  },
  {
    icon: Plug,
    title: "Cleaner cable setups",
    copy: "Wire-management and outlet add-ons for a cleaner finished look when the setup allows it.",
    detail: "See options instantly",
  },
  {
    icon: Wrench,
    title: "Dismounts & remounts",
    copy: "Moving? Take the TV down at one location and build the reinstall into the same job.",
    detail: "Great for move days",
  },
];

const steps = [
  {
    number: "01",
    title: "Tell us what you need",
    copy: "Build the setup TV by TV or describe the whole job in plain English.",
  },
  {
    number: "02",
    title: "See the price",
    copy: "Get an itemized estimate before you commit so the job makes sense before scheduling.",
  },
  {
    number: "03",
    title: "Pick your next step",
    copy: "Book a time, call, or text if you want to confirm anything first.",
  },
];

const gallery = [
  {
    src: "/images/my-work/0105b206d2cd697b03872faa63e6cbddb5a0501d96.jpg",
    alt: "TV mounted above a recessed electric fireplace with hidden wiring",
  },
  {
    src: "/images/my-work/0179e968420aeac4c69f7852a45ef9c781ecf59524.jpg",
    alt: "Clean TV installation on white drywall with no visible cables",
  },
  {
    src: "/images/my-work/01b414810c1682a926d49d9049ddc680859aa20fba.jpg",
    alt: "Large wall-mounted TV above a modern entertainment console",
  },
  {
    src: "/images/my-work/01739ae21f82c211e1f5709ff11676ccdccc66262c.jpg",
    alt: "Bedroom TV installation on a dark accent wall with blue lighting",
  },
];

const reviews = [
  {
    quote:
      "Service was great and price was great. He was prompt and communication was perfect. He has did 3 prior installs and will be doing more in the near future.",
    name: "Sean Solomon",
    service: "Repeat customer",
  },
  {
    quote:
      "Justin walked me through all the TV mounting options he offered and explained each one. He mounted two TVs for me at a good price for the high quality work that was done.",
    name: "Josh B",
    service: "Multi-TV mount",
  },
  {
    quote:
      "Amazing!!! Justin did an amazing job and had great customer service! Completed the installation in a timely manner. Will definitely recommend to family/friends in the area!",
    name: "Khamari Whaley",
    service: "TV installation",
  },
];

const areas = [
  "Atlanta",
  "Decatur",
  "Midtown",
  "Buckhead",
  "Marietta",
  "Alpharetta",
  "Roswell",
  "Lawrenceville",
];

function QuoteFallback() {
  return (
    <div className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
      <div className="bg-slate-900 p-6 md:p-8">
        <div className="h-5 w-36 animate-pulse rounded-full bg-slate-700" />
        <div className="mt-4 h-8 w-2/3 animate-pulse rounded-xl bg-slate-700" />
      </div>
      <div className="space-y-4 p-6 md:p-8">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
      </div>
    </div>
  );
}

export default function HomeV2() {
  const scrollToQuote = () => {
    document.getElementById("instant-quote")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.28),transparent_42%),radial-gradient(circle_at_85%_20%,rgba(239,68,68,0.14),transparent_32%)]" />
        <div className="container relative mx-auto px-4 pb-16 pt-14 md:pb-24 md:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur">
                <MapPin className="h-4 w-4 text-blue-400" />
                TV mounting across Metro Atlanta
              </div>

              <h1 className="mt-6 text-4xl font-black leading-[1.02] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
                Get your TV mounted right — without guessing what it&apos;ll cost.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
                Build your setup, see an itemized estimate, and book when you&apos;re ready. Standard TV mounting starts at $100, with fireplace, specialty-wall, outlet, and move-day options priced around your actual job.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  onClick={scrollToQuote}
                  className="h-14 rounded-2xl bg-blue-600 px-7 text-base font-extrabold text-white shadow-lg shadow-blue-950/30 hover:bg-blue-500"
                >
                  Get my instant estimate
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Link href="/booking">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 w-full rounded-2xl border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white hover:text-slate-950 sm:w-auto"
                  >
                    <CalendarDays className="mr-2 h-5 w-5" />
                    Book installation
                  </Button>
                </Link>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-3 text-sm font-semibold text-slate-300">
                <a href={`tel:${PHONE_HREF}`} className="inline-flex items-center gap-2 transition hover:text-white">
                  <Phone className="h-4 w-4 text-blue-400" />
                  Call {PHONE_DISPLAY}
                </a>
                <a
                  href={`sms:${PHONE_HREF}?body=Hi! I'm interested in a TV installation.`}
                  className="inline-flex items-center gap-2 transition hover:text-white"
                >
                  <MessageSquare className="h-4 w-4 text-blue-400" />
                  Text for a quick question
                </a>
              </div>

              <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
                {[
                  "Clear upfront pricing",
                  "Real installation photos",
                  "Quote, book, call or text",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 rounded-[36px] bg-gradient-to-br from-blue-600/25 to-transparent blur-2xl" />
              <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur">
                <img
                  src="/images/my-work/0105b206d2cd697b03872faa63e6cbddb5a0501d96.jpg"
                  alt="Picture Perfect TV Install fireplace TV mounting example"
                  className="aspect-[4/5] w-full rounded-[24px] object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
                  fetchPriority="high"
                />
                <div className="absolute bottom-7 left-7 right-7 rounded-2xl border border-white/15 bg-slate-950/80 p-4 backdrop-blur-md">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Real installation</p>
                  <p className="mt-1 text-sm font-semibold text-white">Clean placement. Cleaner finish. No stock-photo promises.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="instant-quote" className="scroll-mt-24 border-b border-slate-200 bg-slate-50 py-14 md:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-8 max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Start here</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Build the job before you book it.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
              No digging through a price sheet. Tell the estimator what you&apos;re mounting and add the extras that apply to your setup.
            </p>
          </div>

          <div className="mx-auto mb-6 grid max-w-5xl gap-3 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <span className="text-sm font-black tracking-wider text-blue-600">{step.number}</span>
                  <div>
                    <h3 className="font-extrabold text-slate-950">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{step.copy}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Suspense fallback={<QuoteFallback />}>
            <QuoteTool />
          </Suspense>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Popular jobs</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">The stuff people actually call us for.</h2>
            </div>
            <Link href="/services" className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700">
              See all services <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <div key={service.title} className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-extrabold text-slate-950">{service.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{service.copy}</p>
                  <p className="mt-5 text-sm font-bold text-blue-600">{service.detail}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-16 text-white md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-400">Simple pricing</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight md:text-5xl">Start at $100. Add only what your setup needs.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                Standard mounting is the baseline. Fireplace placement, specialty walls, outlets, dismounts, remounts, and other add-ons are handled as part of the same quote instead of making you guess from a giant menu.
              </p>
              <Button type="button" onClick={scrollToQuote} className="mt-7 h-12 rounded-xl bg-white px-6 font-extrabold text-slate-950 hover:bg-slate-100">
                Price my setup
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ["$100", "Standard mounting starts here"],
                ["Upfront", "Itemized estimate before booking"],
                ["Flexible", "One TV, multiple TVs, or move-day jobs"],
                ["Direct", "Call or text if the estimator needs context"],
              ].map(([value, label]) => (
                <div key={value + label} className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                  <div className="text-3xl font-black text-white">{value}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Real work</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">See the finish before you book.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600 md:text-lg">A few recent-style installs from the actual Picture Perfect gallery.</p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
            {gallery.map((image) => (
              <Link key={image.src} href="/gallery" className="group overflow-hidden rounded-2xl bg-slate-100 md:rounded-[28px]">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="aspect-[4/5] h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              </Link>
            ))}
          </div>

          <div className="mt-7 text-center">
            <Link href="/gallery" className="inline-flex items-center gap-2 font-bold text-blue-600 hover:text-blue-700">
              Browse the full gallery <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50 py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Customer feedback</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Good work should make the next call easier.</h2>
            </div>
            <a
              href="https://g.page/r/CR7z0j9VraqQEAI/review"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-blue-600 hover:text-blue-700"
            >
              View Google reviews
            </a>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {reviews.map((review) => (
              <figure key={review.name} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex gap-1 text-amber-500" aria-label="5 out of 5 stars">
                  {[0, 1, 2, 3, 4].map((star) => (
                    <Star key={star} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-7 text-slate-700">“{review.quote}”</blockquote>
                <figcaption className="mt-5">
                  <div className="font-extrabold text-slate-950">{review.name}</div>
                  <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{review.service}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-blue-600">Service area</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 md:text-5xl">Based in Metro Atlanta. Built for local jobs.</h2>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-600">
                We regularly serve Atlanta and nearby communities. If you&apos;re not sure whether your address is in range, text the ZIP code and we&apos;ll confirm it.
              </p>
              <a href={`sms:${PHONE_HREF}?body=Hi! Can you confirm whether you service my ZIP code?`}>
                <Button variant="outline" className="mt-7 h-12 rounded-xl border-slate-300 px-6 font-extrabold text-slate-950">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Check my area by text
                </Button>
              </a>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
              {areas.map((area) => (
                <div key={area} className="flex min-h-20 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-center text-sm font-extrabold text-slate-800">
                  {area}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-blue-600 py-14 text-white md:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
            <div>
              <h2 className="text-3xl font-black tracking-tight md:text-4xl">Ready when you are.</h2>
              <p className="mt-2 text-blue-100">Price the job, book it, or ask a quick question first.</p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button type="button" onClick={scrollToQuote} className="h-12 rounded-xl bg-white px-6 font-extrabold text-blue-700 hover:bg-blue-50">
                Get estimate
              </Button>
              <Link href="/booking">
                <Button variant="outline" className="h-12 w-full rounded-xl border-white/40 bg-transparent px-6 font-extrabold text-white hover:bg-white hover:text-blue-700 sm:w-auto">
                  Book now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
