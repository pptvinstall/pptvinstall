import { useState } from "react";
import { Link } from "wouter";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, HelpCircle, MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

const faqs = [
  {
    category: "Booking & Payments",
    items: [
      { q: "How much does it cost to mount a TV in Atlanta?", a: "Standard TV mounting starts at $100 with your mount. Fireplace mounting starts at $200, and wire concealment or specialty walls can change the final estimate. Our quote tool gives the fastest exact pricing for Atlanta-area installs." },
      { q: "How far in advance do I need to book?", a: "Same-day booking is available with 2 hours notice. We recommend 1-2 days ahead for best slot selection." },
      { q: "Do I need to pay a deposit?", a: "No. There is no payment required until after the job is complete." },
      { q: "What payment methods do you accept?", a: "Cash, Zelle, Cash App, Venmo, and all major credit cards. Payment due after job is complete." },
    ],
  },
  {
    category: "Service Area & Prep",
    items: [
      { q: "Do you serve my area?", a: "We serve greater Atlanta metro including Buckhead, Decatur, Marietta, Alpharetta, Roswell, Lawrenceville and more. Enter your zip in our quote tool for exact travel fee info." },
      { q: "Do I need to provide anything?", a: "Just the TV and access to your space. We bring all tools. We can provide a mount if needed (see pricing)." },
      { q: "How long does a typical install take?", a: "Single TV mount takes 45-90 minutes. Multiple TVs or wire concealment may take 2-4 hours." },
    ],
  },
  {
    category: "Installation Details",
    items: [
      { q: "Do I need to buy my own mount?", a: "No. You can bring your own mount or we can supply one. Fixed mounts are the most affordable, tilting mounts help with glare, and full-motion mounts are great when you need more flexibility." },
      { q: "Do you hide the wires?", a: "Yes. We offer wire concealment and can quote it instantly in our quote tool for most standard installs." },
      { q: "Can you hide wires behind the wall?", a: "Yes, in many standard drywall installs we can conceal wires cleanly. Some setups require a nearby outlet, and fireplace or custom paths may need a quick photo review before we confirm final pricing." },
      { q: "How long does TV mounting take?", a: "Most single TV mounts take 30-90 minutes. Fireplace installs, brick walls, multiple TVs, or wire concealment can take longer." },
      { q: "Can you mount over a fireplace?", a: "Yes. Fireplace installs are one of our specialties, including drywall, brick, and stone surfaces." },
      { q: "Do you install on brick or concrete?", a: "Yes. We mount on brick, stone, and other masonry surfaces with the right hardware and tools." },
    ],
  },
  {
    category: "AV Help & Troubleshooting",
    items: [
      { q: "Do you help with TVs that are already mounted but having issues?", a: "Yes! We offer AV troubleshooting starting at $100/hr. Whether it's remote issues, HDMI problems, sound not working, or streaming setup, we can come diagnose and fix your existing setup." },
      { q: "Can you just remove/unmount my TV without reinstalling it?", a: "Absolutely. TV unmounting is $50 per TV. We'll safely remove it from the wall. We can also patch the mount holes — just mention it when you book." },
      { q: "Do you set up new smart TVs or streaming devices?", a: "Yes — device setup and configuration is $75 flat. That covers smart TV initial setup, streaming apps, Alexa/Google Home linking, and network config." },
      { q: "What if I just need someone to figure out why my sound isn't working?", a: "That falls under our AV troubleshooting service ($100/hr). Most sound issues take 30-60 minutes to diagnose and fix." },
    ],
  },
];

function AccordionItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <button type="button" onClick={() => setOpen((current) => !current)} className="flex w-full items-center justify-between py-4 text-left">
        <span className={`text-sm font-bold md:text-lg ${open ? "text-blue-600" : "text-slate-900"}`}>{question}</span>
        <ChevronDown className={`h-5 w-5 text-slate-400 transition-transform ${open ? "rotate-180 text-blue-600" : ""}`} />
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="pb-4 text-sm leading-relaxed text-slate-600">{answer}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default function FAQ() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <section className="relative overflow-hidden bg-slate-900 pb-24 pt-32 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute bottom-[20%] left-[10%] h-[500px] w-[500px] rounded-full bg-indigo-600 blur-[100px]" />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">
              Frequently Asked <span className="text-blue-500">Questions</span>
            </h1>
            <p className="text-lg text-slate-300">Everything you need to know before you book.</p>
          </motion.div>
        </div>
      </section>

      <section className="relative z-20 -mt-10 py-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="space-y-8">
            {faqs.map((category) => (
              <motion.div key={category.category} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-100 bg-slate-50 px-6 py-4">
                    <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-slate-500">
                      <HelpCircle className="h-4 w-4" />
                      {category.category}
                    </h2>
                  </div>
                  <div className="p-6 md:p-8">
                    {category.items.map((item) => (
                      <AccordionItem key={item.q} question={item.q} answer={item.a} />
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <h3 className="mb-4 text-2xl font-bold text-slate-900">Still have questions?</h3>
            <p className="mb-8 text-slate-500">Reach out and we&apos;ll help you figure out the best setup.</p>
            <Link href="/contact">
              <Button className="rounded-2xl bg-blue-600 px-8 text-white hover:bg-blue-500">
                <MessageCircle className="mr-2 h-5 w-5" />
                Contact Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
