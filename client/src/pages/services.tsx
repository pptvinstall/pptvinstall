import { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Check, Flame, Settings, Shield, Star, Tv, Video, Wrench, XCircle, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const tvServices = [
  {
    title: "Basic Mounting",
    price: "$100",
    description: "Customer provides the TV and mount.",
    features: ["Level, secure installation", "TV size and wall conditions reviewed for safe mounting", "Basic cable cleanup"],
    mostPopular: true,
  },
  {
    title: "Hardware Bundle",
    price: "$130+",
    description: "We provide the mount and install it.",
    features: ["PPTV-supplied mount available", "Fixed, tilt, or full motion options", "Mount add-on varies by TV size and style"],
    mostPopular: false,
  },
  {
    title: "Fireplace Mounting",
    price: "$200+",
    description: "Specialized over-fireplace setups.",
    features: ["Drywall or masonry", "Placement and wall conditions reviewed", "Fireplace wire concealment requires assessment"],
    mostPopular: false,
  },
];

const smartHomeServices = [
  {
    title: "Smart Doorbell",
    price: "Custom quote",
    description: "Device-specific installation and setup after we review the exact model and wiring.",
    features: ["Existing setup reviewed", "Device-specific installation scope", "App setup when applicable"],
  },
  {
    title: "Security Camera",
    price: "Custom quote",
    description: "Selective camera installation after device, wiring, location, and access review.",
    features: ["Mounting location reviewed", "Power/wiring needs reviewed", "Device setup when applicable"],
  },
  {
    title: "Floodlight Cam",
    price: "Custom quote",
    description: "Outdoor smart-floodlight installation after device and existing-wiring review.",
    features: ["Outdoor location reviewed", "Existing wiring required for standard scope", "Device setup when applicable"],
  },
];

const troubleshootingServices = [
  {
    title: "AV Troubleshooting",
    price: "Custom quote",
    description: "Remote issues, input problems, sound not working, TV won't connect. We diagnose and fix your existing setup.",
    icon: Wrench,
    features: [
      "Remote and input configuration",
      "Sound system sync",
      "Network and streaming issues",
      "HDMI and cable troubleshooting",
    ],
    quoteOnly: true,
  },
  {
    title: "Device & Smart Home Setup",
    price: "Custom quote",
    description: "Streaming-device, cable-box, or smart-TV setup priced after we review the exact scope.",
    icon: Settings,
    features: [
      "Smart TV initial setup",
      "Streaming app configuration",
      "Alexa / Google Home linking",
      "WiFi and network setup",
    ],
    quoteOnly: true,
  },
  {
    title: "TV Removal / Unmounting",
    price: "$50 per TV",
    description: "Moving or redecorating? We'll safely remove your wall-mounted TV and prep the space for storage or a future install.",
    icon: XCircle,
    features: [
      "Safe TV removal",
      "Mount hardware removed",
      "Mount removal and area left ready for your next step",
      "Prep for new install or storage",
    ],
    quoteOnly: false,
  },
];

export default function Services() {
  useEffect(() => {
    document.title = "TV Mounting Services in Atlanta | Picture Perfect TV Install";
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <section className="relative overflow-hidden bg-slate-900 pb-24 pt-32 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute left-[10%] top-[10%] h-[600px] w-[600px] rounded-full bg-blue-600 blur-[100px]" />
          <div className="absolute bottom-[10%] right-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600 blur-[100px]" />
        </div>

        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
              Expert <span className="text-blue-500">Solutions</span> for Every Screen
            </h1>
            <p className="text-lg text-slate-300">
              TV mounting services in Atlanta, wire concealment, fireplace installs, smart home setup, and troubleshooting across Midtown, Buckhead, Decatur, Marietta, Alpharetta, Roswell, Lawrenceville, and more.
            </p>
            <p className="text-sm text-slate-400">
              Need help fast? <a href="tel:14047024748" className="font-semibold text-white hover:underline">Call 404-702-4748</a> for Metro Atlanta TV installation support.
            </p>
          </motion.div>
        </div>
      </section>

      {/* TV MOUNTING — hero from my-work/ (used ONLY here; homepage + gallery use different files) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-3 text-blue-600"><Tv className="h-6 w-6" /></div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">TV Mounting</h2>
              <p className="text-slate-500">Secure, level, and clean installations.</p>
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-2xl shadow-lg max-h-72">
            <img
              src="/images/my-work/01a47d71ff9be4d24847ffba6739e8968b87cd7b49.jpg"
              alt="TV mounted on a high-rise condo column with stunning Atlanta city skyline views"
              className="w-full h-72 object-cover"
              loading="lazy"
            />
          </div>

          <div className="mb-4 flex items-center gap-2 text-sm text-slate-500">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            Available evenings &amp; weekends — same-day may be possible when a slot is open
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tvServices.map((service) => (
              <Card key={service.title} className={`border-l-4 border-slate-200 shadow-sm card-elevated flex flex-col ${service.mostPopular ? "border-l-blue-600 ring-2 ring-blue-100" : "border-l-blue-500"}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="text-xl font-bold text-slate-900">{service.title}</CardTitle>
                      {service.mostPopular ? (
                        <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                          <Star className="mr-1 h-3 w-3 fill-blue-600" />
                          Most Popular
                        </Badge>
                      ) : null}
                    </div>
                    <div className="text-2xl font-black text-blue-600 whitespace-nowrap">{service.price}</div>
                  </div>
                  <CardDescription className="text-slate-500">{service.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-3 text-sm text-slate-600">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href="/booking" className="w-full">
                    <Button className="w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-500">Book This Service</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-3 text-indigo-600"><Video className="h-6 w-6" /></div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">Smart Home</h2>
              <p className="text-slate-500">Automation and security installs done cleanly.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {smartHomeServices.map((service) => (
              <Card key={service.title} className="border-l-4 border-l-purple-500 border-slate-200 shadow-sm card-elevated flex flex-col">
                <CardContent className="flex flex-col flex-1 space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{service.title}</h3>
                      <p className="mt-1 text-2xl font-black text-purple-600">{service.price}</p>
                      <p className="mt-2 text-sm text-slate-500">{service.description}</p>
                    </div>
                    {service.title === "Smart Doorbell" ? <Video className="h-6 w-6 flex-shrink-0 text-purple-400" /> : service.title === "Security Camera" ? <Shield className="h-6 w-6 flex-shrink-0 text-purple-400" /> : <Zap className="h-6 w-6 flex-shrink-0 text-purple-400" />}
                  </div>
                  <ul className="flex-1 space-y-3 text-sm text-slate-600">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href="/quote">
                    <Button variant="outline" className="w-full rounded-2xl border-purple-200 text-purple-700 hover:bg-purple-50">Get Custom Quote</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AV HELP — hero from my-work/ (used ONLY here; homepage + gallery use different files) */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-10 flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-3 text-amber-600"><Wrench className="h-6 w-6" /></div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900">AV Help &amp; Troubleshooting</h2>
              <p className="text-slate-500">Already have everything installed but something isn&apos;t working right?</p>
            </div>
          </div>

          <div className="mb-8 overflow-hidden rounded-2xl shadow-lg max-h-72">
            <img
              src="/images/my-work/01d8ee3eb78977aec05311a317405928e4669999ce.jpg"
              alt="TV mounted in a professional office conference room — commercial installation"
              className="w-full h-72 object-cover"
              loading="lazy"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {troubleshootingServices.map((service) => (
              <Card key={service.title} className="border-l-4 border-l-amber-500 border-slate-200 shadow-sm card-elevated flex flex-col">
                <CardContent className="flex flex-col flex-1 space-y-5 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">{service.title}</h3>
                      <p className="mt-1 text-2xl font-black text-amber-600">{service.price}</p>
                      <p className="mt-2 text-sm text-slate-600">{service.description}</p>
                    </div>
                    <service.icon className="h-6 w-6 flex-shrink-0 text-amber-500" />
                  </div>
                  <ul className="flex-1 space-y-3 text-sm text-slate-600">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link href={service.quoteOnly ? "/quote" : "/booking"}>
                    <Button variant="outline" className="w-full rounded-2xl border-amber-200 text-amber-700 hover:bg-amber-50">{service.quoteOnly ? "Get Custom Quote" : "Book This Service"}</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-start justify-between gap-8 rounded-3xl bg-slate-900 p-8 text-white md:flex-row md:items-center md:p-12">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
                <Flame className="h-4 w-4" />
                Specialty Installs
              </div>
              <h2 className="text-3xl font-bold">Need fireplace, brick, or wire concealment work?</h2>
              <p className="max-w-xl text-slate-300">
                Use the quote tool for the fastest exact pricing before you book.
              </p>
            </div>
            <Link href="/quote">
              <Button className="rounded-2xl bg-white px-8 text-slate-900 hover:bg-slate-100">Get a Quote</Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
