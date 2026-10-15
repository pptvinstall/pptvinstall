const BRAND = "Picture Perfect TV Install";
const ORIGIN = "https://pptvinstall.com";

const pages: Record<string, { title: string; description: string }> = {
  "/": {
    title: "TV Mounting & Installation Atlanta",
    description: "Professional TV mounting across Atlanta and Metro Atlanta. Drywall mounting starts at $100 with your mount. Evening and weekend appointments. Get an itemized quote.",
  },
  "/services": {
    title: "TV Mounting & Smart Home Services",
    description: "Explore TV mounting, fireplace installs, outlet-behind-TV work, and selectively quoted smart home setup across Metro Atlanta.",
  },
  "/quote": {
    title: "Get an Instant TV Installation Quote",
    description: "Build your TV installation or describe the job for an itemized estimate. Review mounting, wall types, mounts, and add-ons before booking.",
  },
  "/booking": {
    title: "Book TV Installation in Atlanta",
    description: "Choose an available evening or weekend appointment for professional TV mounting across Metro Atlanta. Review your details before submitting.",
  },
  "/gallery": {
    title: "TV Installation Gallery",
    description: "See real Picture Perfect TV Install projects, including drywall and fireplace TV mounting across Metro Atlanta.",
  },
  "/contact": {
    title: "Contact Your Atlanta TV Installer",
    description: "Call or text 404-702-4748 for TV mounting quotes and scheduling across Atlanta, Decatur, and Metro Atlanta.",
  },
  "/faq": {
    title: "TV Mounting Questions & Answers",
    description: "Find answers about TV installation pricing, mounts, wall types, cable management, scheduling, and service areas in Metro Atlanta.",
  },
  "/partners": {
    title: "Installation Partners & Referrals",
    description: "Connect with Picture Perfect TV Install for TV mounting partnerships and referrals across Metro Atlanta.",
  },
};

export function getPageMetadata(path: string, city?: { name: string; county: string; slug: string }) {
  // Tracking parameters and customer tokens never belong in public canonical URLs.
  const pathname = path.split(/[?#]/, 1)[0];
  const page = pages[pathname] ?? (city ? {
    title: `${city.name} TV Mounting & Smart Home Install`,
    description: `Professional TV mounting and selective smart-home installation in ${city.name}, ${city.county}. Evening and weekend appointments. Starting at $100 with your mount.`,
  } : null);
  return {
    title: page ? `${page.title} | ${BRAND}` : `Booking & Account | ${BRAND}`,
    description: page?.description ?? "Manage your installation with Picture Perfect TV Install. Call or text 404-702-4748 for help.",
    canonical: page ? `${ORIGIN}${pathname}` : null,
    robots: page ? "index, follow" : "noindex, nofollow",
  };
}
