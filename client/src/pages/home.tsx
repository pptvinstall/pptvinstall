import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ReviewCTA } from "@/components/ui/ReviewCTA";
import { getSeasonalTheme } from "@/lib/seasonal-theme";
import { cn } from "@/lib/utils";
import { CheckCircle2, Star, Shield, Clock, Trophy, ChevronRight, Tv, MapPin, Flame, Plug, Camera, Bell, Speaker, Wrench, Smartphone, Trash2, CalendarDays, Phone } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const QuoteEducation = lazy(() => import("@/components/ui/QuoteEducation").then((module) => ({ default: module.QuoteEducation })));
const QuoteTool = lazy(() => import("@/components/ui/QuoteTool"));

export default function Home() {
  const theme = getSeasonalTheme();
  const deferredQuoteFallback = (
    <Card className="rounded-[28px] border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-8">
        <div className="h-6 w-40 animate-pulse rounded-full bg-slate-200" />
        <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </CardContent>
    </Card>
  );

  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShowStickyBar(window.scrollY > 420);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToQuoteTool = useCallback(() => {
    if (typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const target =
      document.querySelector<HTMLElement>('[data-quote-tabs="true"]') ??
      document.getElementById("instant-quote-start");

    if (!target) {
      return;
    }

    const nav = document.querySelector("nav");
    const navHeight = nav instanceof HTMLElement ? nav.offsetHeight : 88;
    const top = target.getBoundingClientRect().top + window.scrollY - navHeight - 20;

    window.history.replaceState(null, "", "#instant-quote");
    window.scrollTo({ top: Math.max(top, 0), behavior: "smooth" });
  }, []);

  const servicePills = [
    { label: "TV Mounting", icon: Tv },
    { label: "Fireplace Mounting", icon: Flame },
    { label: "Wire Concealment", icon: Plug },
    { label: "Security Cameras", icon: Camera },
    { label: "Smart Doorbell", icon: Bell },
    { label: "Sound Systems", icon: Speaker },
    { label: "AV Troubleshooting", icon: Wrench },
    { label: "Device Setup", icon: Smartphone },
    { label: "TV Removal", icon: Trash2 },
  ];

  const testimonials = [
    {
      name: "Sean Solomon",
      location: "Atlanta, GA",
      stars: 5,
      text: "Service was great and price was great. He was prompt and communication was perfect. He has did 3 prior installs and will be doing more in the near future. I would highly recommend using Justin for all installation needs.",
      service: "Repeat Customer",
    },
    {
      name: "Collin Ivins",
      location: "Atlanta, GA",
      stars: 5,
      text: "Justin from Picture Perfect TV installation has exceeded my expectations mounting several TVs and sound bars for my household. Their service offers excellent customer service, great communication, and punctuality.",
      service: "TV Mount + Soundbar",
    },
    {
      name: "Khamari Whaley",
      location: "Atlanta, GA",
      stars: 5,
      text: "Amazing!!! Justin did an amazing job and had great customer service! Completed the installation in a timely manner. Will definitely recommend to family/friends in the area!",
      service: "TV Installation",
    },
    {
      name: "Jovan Hooper",
      location: "Atlanta, GA",
      stars: 5,
      text: "Reached out to this business to mount my 65in over my fireplace and they were extremely professional! Would definitely hire again and recommend.",
      service: "Fireplace Mount",
    },
    {
      name: "Kim Plater",
      location: "Atlanta, GA",
      stars: 5,
      text: "Justin was very professional and knowledgeable. He was punctual and neat. He cleaned up after himself. I couldn't believe that he was able to install on the same day I called.",
      service: "Same-Day Install",
    },
    {
      name: "Amnyst Davis",
      location: "Atlanta, GA",
      stars: 5,
      text: "Found them on Thumbtack. They were the first to respond very quickly. Said they had openings for the next following day, even sent me a link to schedule my time stamp. Communicated well and was here within my time window.",
      service: "TV Mount",
    },
    {
      name: "Samarra McGee",
      location: "Atlanta, GA",
      stars: 5,
      text: "Clean and professional work! Outstanding and highly recommended! Thanks, Justin!",
      service: "TV Installation",
    },
    {
      name: "Josh B",
      location: "Atlanta, GA",
      stars: 5,
      text: "Justin walked me through all the TV mounting options he offered and explained each one. He mounted two TVs for me at a good price for the high quality work that was done. Highly recommend, will use again!",
      service: "Multi-TV Mount",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky Book Now bar — appears after scrolling past the hero */}
      <AnimatePresence>
        {showStickyBar ? (
          <motion.div
            initial={{ y: -64, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -64, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 26 }}
            className="fixed left-0 right-0 top-[56px] z-40 hidden border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur md:block"
          >
            <div className="container mx-auto flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-semibold text-slate-700">5-star rated · 250+ customers · Metro Atlanta</span>
              </div>
              <div className="flex items-center gap-3">
                <a href="tel:4047024748" className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-slate-900">
                  <Phone className="h-4 w-4" />
                  404-702-4748
                </a>
                <Link href="/booking">
                  <Button className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-500">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    Book Now
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 pb-32 pt-24 text-white">
        <div className="absolute inset-0 opacity-5 hero-grid-pattern" />
        {theme.heroBgOverlay ? <div className={cn("absolute inset-0 z-0", theme.heroBgOverlay)} /> : null}

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mx-auto max-w-4xl space-y-6"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-700/50 bg-blue-900/50 px-3 py-1 text-xs font-medium text-blue-300 backdrop-blur-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
              {theme.heroBadge}
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Picture Perfect <br />
              <span className="text-red-500">TV</span> <span className="text-blue-500">Installation</span>
            </h1>

            <p className="mx-auto max-w-2xl text-lg leading-relaxed text-slate-300 md:text-xl">
              TV mounting in Atlanta with clean installs, wire concealment, fireplace mounting, and smart home setup across Midtown, Buckhead, Decatur, Marietta, Alpharetta, and more.
            </p>

            <div className="pt-8">
              <div className="mx-auto flex max-w-xl flex-col gap-4 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <Button
                  type="button"
                  onClick={scrollToQuoteTool}
                  className="h-14 w-full rounded-2xl bg-blue-600 px-8 text-lg font-bold text-white hover:bg-blue-500 sm:w-auto"
                >
                  ⚡ Get Instant Quote
                </Button>
                <div className="grid w-full grid-cols-2 gap-4 sm:flex sm:w-auto">
                  <a href="tel:4047024748" className="w-full sm:w-auto">
                    <Button type="button" variant="outline" className="h-12 w-full flex-1 rounded-2xl border-white/40 bg-white/10 px-6 text-base font-bold text-white transition-all hover:bg-white hover:text-slate-900 sm:h-14 sm:w-auto sm:min-w-[120px]">
                      📞 Call Us
                    </Button>
                  </a>
                  <a href="sms:4047024748?body=Hi! I'm interested in TV mounting services." className="w-full sm:w-auto">
                    <Button type="button" variant="outline" className="h-12 w-full flex-1 rounded-2xl border-white/40 bg-white/10 px-6 text-base font-bold text-white transition-all hover:bg-white hover:text-slate-900 sm:h-14 sm:w-auto sm:min-w-[120px]">
                      💬 Text Us
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 pt-12 text-sm font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-400" /> Licensed & Insured
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-400" /> Same-Day Service
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> 5-Star Rated
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="relative z-20 -mt-16 pb-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { label: "Happy Customers", value: "250+", icon: CheckCircle2 },
              { label: "TVs Mounted", value: "500+", icon: Tv },
              { label: "Average Rating", value: "5.0", icon: Star },
              { label: "Satisfaction", value: "100%", icon: Trophy },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="border-none bg-white/95 shadow-xl backdrop-blur">
                  <CardContent className="p-6 text-center">
                    <stat.icon className="mx-auto mb-2 h-8 w-8 text-blue-600 opacity-80" />
                    <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                    <div className="mt-1 text-sm font-semibold uppercase tracking-wider text-slate-500">{stat.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-12">
        <div className="container mx-auto px-4">
          <div className="flex gap-3 overflow-x-auto pb-2 md:flex-wrap md:justify-center">
            {servicePills.map((service) => (
              <button
                key={service.label}
                type="button"
                onClick={scrollToQuoteTool}
                className="flex min-w-max flex-shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:bg-blue-600 hover:text-white"
              >
                <service.icon className="h-4 w-4" />
                {service.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <Suspense fallback={deferredQuoteFallback}>
            <QuoteEducation />
          </Suspense>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Atlanta TV Mounting</p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">Looking for TV mounting in Atlanta?</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              If you&apos;re looking for TV mounting in Atlanta, Picture Perfect TV Install provides fast, professional installations with clear upfront pricing. We handle drywall, brick, and fireplace mounts, can hide wires for a cleaner look, and regularly serve Metro Atlanta neighborhoods like Midtown, Buckhead, Decatur, Marietta, Alpharetta, Roswell, and Lawrenceville.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Need a faster answer? <a href="tel:14047024748" className="font-semibold text-blue-600 hover:underline">Call 404-702-4748</a> or <a href="sms:4047024748?body=Hi! I'm interested in TV mounting services." className="font-semibold text-blue-600 hover:underline">text us now</a>.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl md:flex-row">
            <div className="flex flex-col justify-center p-8 md:w-3/5 md:p-12">
              <div className="mb-2 text-sm font-bold uppercase tracking-wide text-blue-600">Most Popular Choice</div>
              <h2 className="mb-4 text-3xl font-bold text-slate-900 md:text-4xl">Standard Mounting Package</h2>
              <p className="mb-6 text-lg text-slate-600">
                The perfect solution for most homes. We expertly mount your TV to the wall, level it perfectly, and handle basic cable management.
              </p>

              <ul className="mb-8 space-y-3">
                {["Level installation guaranteed", "Stud finding & secure mounting", "All TV sizes supported", "Basic cable management", "Post-install cleanup"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-slate-700">
                    <div className="rounded-full bg-green-100 p-1">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Button type="button" onClick={scrollToQuoteTool} className="w-fit rounded-full bg-slate-900 px-8 py-6 text-lg text-white hover:bg-slate-800">
                Get a Quote <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="relative flex flex-col items-center justify-center overflow-hidden bg-blue-600 p-8 text-center text-white md:w-2/5 md:p-12">
              <div className="absolute inset-0 rotate-45 scale-150 transform bg-blue-700 opacity-50"></div>
              <div className="relative z-10">
                <div className="mb-2 text-lg font-medium opacity-90">Flat Rate Pricing</div>
                <div className="mb-2 text-6xl font-black tracking-tight">$100</div>
                <div className="text-xl font-medium opacity-90">Per TV</div>
                <div className="mt-8 border-t border-blue-400 pt-4 text-sm opacity-75">
                  Mount not included.<br />We provide mounts starting at $40.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              22 Five-Star Reviews on Google
            </div>
            <h2 className="text-3xl font-bold text-slate-900">What Our Customers Say</h2>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-4">
            {testimonials.slice(0, 4).map((review, idx) => (
              <Card key={idx} className="card-elevated border-slate-100 bg-slate-50 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="mb-4 text-sm italic text-slate-600">"{review.text}"</p>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{review.name}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" /> {review.location}
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{review.service}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
            {testimonials.slice(4, 8).map((review, idx) => (
              <Card key={idx} className="card-elevated border-slate-100 bg-slate-50 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-3 flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => <Star key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                  <p className="mb-4 text-sm italic text-slate-600">"{review.text}"</p>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{review.name}</div>
                    <div className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3 w-3" /> {review.location}
                    </div>
                    <span className="mt-2 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">{review.service}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="https://g.page/r/CR7z0j9VraqQEAI/review"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-blue-600 hover:underline"
            >
              See all 22 reviews on Google →
            </a>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-600">Real Installations</p>
            <h2 className="text-4xl font-extrabold text-slate-900">See Our Work</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-slate-500">
              Every mount is level, every wire is hidden, every customer is happy.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {[
              { src: "/images/my-work/0105b206d2cd697b03872faa63e6cbddb5a0501d96.jpg", alt: "TV above a sleek recessed electric fireplace, zero visible wires" },
              { src: "/images/my-work/012df72991c0471338022ce94247139561cfa42c33.jpg", alt: "Large TV over a glowing electric fireplace with warm living room ambiance" },
              { src: "/images/my-work/01206089f35a6f3abec9f7d0ef4c2287d012e7509c.jpg", alt: "TV above a traditional white fireplace mantel with ceiling fan" },
              { src: "/images/my-work/0179e968420aeac4c69f7852a45ef9c781ecf59524.jpg", alt: "Clean TV mount on white drywall — minimalist living room, zero cables visible" },
              { src: "/images/my-work/01b414810c1682a926d49d9049ddc680859aa20fba.jpg", alt: "Large TV above a modern white entertainment credenza, no visible wiring" },
              { src: "/images/my-work/017196394ee2a4e2dc86b4b058be9ad8ddac1b287d.jpg", alt: "TV in a dark media room with dramatic navy accent walls" },
              { src: "/images/my-work/016a891a608dd140c3072b75ac9c2b9ac8e6cba151.jpg", alt: "Bedroom TV above dresser on a grey accent wall — perfect viewing angle" },
              { src: "/images/my-work/01739ae21f82c211e1f5709ff11676ccdccc66262c.jpg", alt: "Bedroom TV on dark accent wall with blue LED lighting — gaming room setup" },
            ].map((img, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <a href="/gallery" className="text-lg font-semibold text-blue-600 hover:underline">
              See full gallery →
            </a>
          </div>
        </div>
      </section>

      <section id="instant-quote" className="bg-slate-900 py-20 text-white">
        <div className="container mx-auto px-4 text-center">
          <div id="instant-quote-start" className="scroll-mt-28">
            <h2 className="mb-4 text-3xl font-extrabold md:text-4xl">Know your price before you book</h2>
            <p className="mx-auto mb-3 max-w-xl text-lg text-slate-400">
              Type it, fill it out, or just say it. Our AI quote tool gives you an itemized price in seconds for TV mounting in Atlanta and across Metro Atlanta.
            </p>
            <p className="mx-auto max-w-2xl text-sm text-slate-400">
              Start with Build It for the most exact setup, use Describe It for a quick typed request, or tap Voice Note if talking is easier.
            </p>
            <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300">
              Serving Decatur, Midtown, Buckhead, Marietta, Alpharetta, Roswell, Lawrenceville, and nearby Metro Atlanta areas. Need a faster answer? <a href="tel:14047024748" className="font-semibold text-white underline-offset-2 hover:underline">Call 404-702-4748</a>.
            </p>
          </div>
          {theme.promoDiscount ? (
            <div className={cn("mx-auto mb-8 mt-8 max-w-2xl rounded-[28px] border border-white/10 bg-gradient-to-r p-6 text-left shadow-2xl", theme.accentColor)}>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/80">
                {theme.emoji} {theme.label}
              </p>
              <h3 className="mt-2 text-2xl font-extrabold text-white">{theme.promoHeadline}</h3>
              <p className="mt-2 text-sm text-white/85">{theme.promoSubtext}</p>
              {theme.promoCode ? <p className="mt-3 text-sm font-semibold text-white">Use code {theme.promoCode} at booking</p> : null}
            </div>
          ) : null}
          <div className="mt-10">
            <Suspense fallback={deferredQuoteFallback}>
              <QuoteTool />
            </Suspense>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="container mx-auto max-w-2xl px-4">
          <ReviewCTA />
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-8 text-center text-white md:p-16">
            <div className="relative z-10 mx-auto max-w-2xl space-y-6">
              <h2 className="text-3xl font-bold md:text-5xl">Ready to upgrade your home?</h2>
              <p className="text-lg text-slate-300">
                Schedule your professional installation today and experience the difference.
              </p>
              <Button type="button" onClick={scrollToQuoteTool} size="lg" className="mt-4 h-14 rounded-full bg-blue-600 px-10 text-lg font-bold text-white shadow-lg hover:bg-blue-500">
                Get My Instant Quote →
              </Button>
            </div>

            <div className="absolute right-0 top-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-blue-600 opacity-20 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-indigo-600 opacity-20 blur-3xl"></div>
          </div>
        </div>
      </section>
    </div>
  );
}
