import { Link } from "wouter";
import {
  Building,
  Building2,
  CheckCircle2,
  Handshake,
  Home,
  Mail,
  MoveRight,
  Phone,
  Store,
  Truck,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const partnerTypes = [
  { icon: Truck, title: "Movers & relocation teams", copy: "Add TV dismount, remount, soundbar and setup support to moves without adding another in-house crew." },
  { icon: Home, title: "Realtors & apartment locators", copy: "Give buyers, renters and move-in clients a trusted local option for TVs, artwork and basic setup work." },
  { icon: Building2, title: "Property managers & communities", copy: "Use us for resident move-ins, turnover-related mounting, common-area displays and scheduled install days." },
  { icon: Users, title: "Senior living communities", copy: "Offer resident tech-help days for TV mounting, streaming-device setup, soundbars, pictures and simple home-tech support." },
  { icon: Building, title: "Short-term rental operators", copy: "Get a local install partner for replacement TVs, streaming setups, wall mounting and repeat property work." },
  { icon: Store, title: "Designers, stagers & home-service pros", copy: "Hand off the technical finishing work while your team stays focused on the room, move or project." },
];

const services = [
  "TV mounting and remounting",
  "TV dismount + move coordination",
  "Fireplace and specialty-wall mounting",
  "Soundbar and streaming-device setup",
  "Existing-outlet relocation behind TVs when appropriate",
  "Pictures, mirrors, shelves and select wire-rack installs",
  "Existing-fixture ceiling-fan swaps when scope is appropriate",
  "Multi-unit, repeat-location and overflow install work",
];

export default function Partners() {
  return (
    <div className="min-h-screen bg-slate-50">
      <section className="relative overflow-hidden bg-slate-950 pb-24 pt-32 text-white">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-[10%] top-[10%] h-[420px] w-[420px] rounded-full bg-blue-600 blur-[110px]" />
          <div className="absolute right-[10%] top-[30%] h-[320px] w-[320px] rounded-full bg-indigo-500 blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-bold text-blue-200">
              <Handshake className="h-4 w-4" />
              Metro Atlanta Partner Program
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
              Give your clients a reliable <span className="text-blue-400">installation partner</span>
            </h1>
            <p className="mx-auto max-w-3xl text-lg leading-8 text-slate-300">
              Picture Perfect TV Install works with movers, realtors, property managers, apartment communities,
              senior living teams, designers, short-term-rental operators and other service companies that need dependable TV and home-install support.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <a href="mailto:pptvinstall@gmail.com?subject=PPTV%20Partner%20Inquiry">
                <Button size="lg" className="w-full rounded-2xl bg-blue-600 px-7 font-bold text-white hover:bg-blue-500 sm:w-auto">
                  <Mail className="mr-2 h-5 w-5" /> Start a Partnership
                </Button>
              </a>
              <a href="tel:4047024748">
                <Button size="lg" variant="outline" className="w-full rounded-2xl border-slate-600 bg-transparent px-7 font-bold text-white hover:bg-white hover:text-slate-900 sm:w-auto">
                  <Phone className="mr-2 h-5 w-5" /> 404-702-4748
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">Built for repeat business</p>
            <h2 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">Ways we can work together</h2>
            <p className="mt-4 text-slate-600">Send one client, build a preferred-vendor relationship, schedule a resident install day, or use us for overflow when your own team is booked.</p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {partnerTypes.map(({ icon: Icon, title, copy }) => (
              <Card key={title} className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600"><Icon className="h-6 w-6" /></div>
                  <h3 className="text-lg font-extrabold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.22em] text-blue-600">Our scope</p>
              <h2 className="mt-3 text-3xl font-extrabold text-slate-900">A useful add-on to the service you already sell</h2>
              <p className="mt-4 leading-7 text-slate-600">
                We focus on practical, repeatable install work. Partners can refer a customer directly or contact us first for a multi-unit, repeat-location or subcontract conversation.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {services.map((service) => (
                  <div key={service} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                    <span className="text-sm font-semibold text-slate-800">{service}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-none bg-slate-900 text-white shadow-xl">
              <CardContent className="p-8">
                <h3 className="text-2xl font-extrabold">Simple partner workflow</h3>
                <div className="mt-7 space-y-6">
                  {[
                    ["1", "Send the lead or scope", "Email, call or text us with the customer/project basics."],
                    ["2", "We quote the install", "We confirm scope, travel, wall type, TV size and any add-ons before locking the job."],
                    ["3", "We complete the work", "We handle the install and keep the handoff clean and professional."],
                    ["4", "Build the repeat lane", "For ongoing relationships, we can agree on preferred-vendor, overflow or referral terms in writing."],
                  ].map(([step, title, copy]) => (
                    <div key={step} className="flex gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-black">{step}</div>
                      <div>
                        <div className="font-bold">{title}</div>
                        <div className="mt-1 text-sm leading-6 text-slate-300">{copy}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800/70 p-5 text-sm leading-6 text-slate-300">
                  No exclusivity is required. Referral, subcontract and volume terms are agreed before work begins. We do not take on new-circuit electrical work.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-blue-600 py-16 text-white">
        <div className="container mx-auto max-w-4xl px-4 text-center">
          <h2 className="text-3xl font-extrabold md:text-4xl">Have a customer or property that needs help now?</h2>
          <p className="mx-auto mt-4 max-w-2xl text-blue-100">Send us the project details and we’ll tell you quickly whether it fits our scope and schedule.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/contact"><Button size="lg" className="w-full rounded-2xl bg-white px-7 font-bold text-blue-700 hover:bg-blue-50 sm:w-auto">Contact PPTV <MoveRight className="ml-2 h-5 w-5" /></Button></Link>
            <a href="sms:4047024748?body=Hi%20PPTV%2C%20I%20have%20a%20partner%20or%20referral%20project%20to%20discuss."><Button size="lg" variant="outline" className="w-full rounded-2xl border-blue-300 bg-transparent px-7 font-bold text-white hover:bg-blue-700 sm:w-auto">Text Partner Lead</Button></a>
          </div>
        </div>
      </section>
    </div>
  );
}
