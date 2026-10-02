import { Card, CardContent } from "@/components/ui/card";
import { formatPrice, pricingData } from "@/data/pricing-data";
import { Camera, Flame, MonitorSmartphone, Move3D, PanelTopClose, ScanSearch, ShieldCheck, Speaker, Wrench } from "lucide-react";

const mountCards = [
  {
    title: "Fixed / low-profile mount",
    icon: PanelTopClose,
    price: `${formatPrice(pricingData.tvMounts.fixedSmall.price)}-${formatPrice(pricingData.tvMounts.fixedBig.price)}`,
    bestFor: "A clean, flush look in bedrooms, offices, and straightforward living room installs.",
    watchFor: "Great when you mostly watch straight-on. Not ideal if you need to tilt or pull the TV away from the wall.",
  },
  {
    title: "Tilting mount",
    icon: MonitorSmartphone,
    price: `${formatPrice(pricingData.tvMounts.tiltingSmall.price)}-${formatPrice(pricingData.tvMounts.tiltingBig.price)}`,
    bestFor: "Reducing glare or slightly angling a higher TV down toward the couch or bed.",
    watchFor: "A smart middle ground for many medium and large TVs. It moves less than a full-motion mount.",
  },
  {
    title: "Full-motion mount",
    icon: Move3D,
    price: `${formatPrice(pricingData.tvMounts.fullMotionSmall.price)}-${formatPrice(pricingData.tvMounts.fullMotionBig.price)}`,
    bestFor: "Corner installs, larger rooms, or setups where you want the TV to swivel and extend.",
    watchFor: "Best when you need flexibility. Larger TVs usually benefit from a quality full-motion mount and solid framing.",
  },
  {
    title: "Fireplace / specialty setup",
    icon: Flame,
    price: `Install starts at ${formatPrice(pricingData.tvMounting.fireplace.price)}`,
    bestFor: "Fireplace walls, stone, brick, and other specialty installs that need more planning.",
    watchFor: "Fireplace and masonry jobs sometimes need photos before we confirm concealment or final complexity.",
  },
];

const trustCards = [
  {
    title: "Bring your mount or let us supply one",
    icon: ShieldCheck,
    description: "Already have the right mount? Great. Need one? We can bring a fixed, tilting, or full-motion option and match it to your TV size.",
  },
  {
    title: "Drywall is simpler than brick or fireplace work",
    icon: Wrench,
    description: "Standard drywall jobs are the easiest to price instantly. Brick, stone, steel stud, and fireplace installs may need a quick confirmation.",
  },
  {
    title: "Wire concealment depends on outlet location",
    icon: ScanSearch,
    description: "For standard installs, the cleanest pricing assumes an outlet is already close to where the TV will sit. If the outlet is farther away, we may need to confirm extra work.",
  },
  {
    title: "Photos make tricky installs easier to quote",
    icon: Camera,
    description: "A quick photo of the wall, fireplace, and nearest outlet helps us confirm soundbar placement, masonry drilling, and fireplace wire paths before booking.",
  },
  {
    title: "Soundbar and add-on setup can be bundled in",
    icon: Speaker,
    description: "Soundbars, cameras, doorbells, troubleshooting, and device setup can all be folded into the same visit so your whole setup works together.",
  },
];

export function QuoteEducation() {
  return (
    <section className="space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">Mount Guide</p>
        <h2 className="mt-2 text-3xl font-extrabold text-slate-900 md:text-4xl">Choose the right mount and know what affects pricing</h2>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-7 text-slate-600 md:text-base">
          Smaller TVs often do great on fixed or tilting mounts. Bigger screens, corner installs, and fireplaces usually need a stronger or more specialized option.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {mountCards.map((card) => (
          <Card key={card.title} className="rounded-[28px] border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <card.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{card.title}</h3>
                <p className="mt-1 text-sm font-semibold text-blue-600">{card.price}</p>
              </div>
              <p className="text-sm leading-6 text-slate-600">{card.bestFor}</p>
              <p className="text-sm leading-6 text-slate-500">{card.watchFor}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {trustCards.map((card) => (
          <Card key={card.title} className="rounded-[28px] border-slate-200 bg-slate-50 shadow-sm">
            <CardContent className="space-y-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-slate-900 shadow-sm">
                <card.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{card.title}</h3>
              <p className="text-sm leading-6 text-slate-600">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
