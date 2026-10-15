const BRAND = "Picture Perfect TV Install";
const ORIGIN = "https://pptvinstall.com";

const publicPages: Record<string, { title: string; description: string }> = {
  "/": {
    title: "TV Mounting Atlanta",
    description: "Professional TV mounting across Atlanta and Metro Atlanta. Drywall mounting starts at $100 with your mount. Evening and weekend appointments. Get an itemized quote.",
  },
  "/services": {
    title: "TV Mounting & Smart Home Services Atlanta",
    description: "Explore TV mounting, fireplace installs, outlet-behind-TV work, and selectively quoted smart home setup across Metro Atlanta.",
  },
  "/quote": {
    title: "Instant TV Installation Quote Atlanta",
    description: "Build your TV installation or describe the job for an itemized estimate. Review mounting, wall types, mounts, and add-ons before booking.",
  },
  "/booking": {
    title: "Book TV Installation in Atlanta",
    description: "Choose an available evening or weekend appointment for professional TV mounting across Metro Atlanta. Review your details before submitting.",
  },
  "/gallery": {
    title: "TV Installation Gallery Atlanta",
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
    title: "Installation Partners & Referrals Atlanta",
    description: "Connect with Picture Perfect TV Install for TV mounting partnerships and referrals across Metro Atlanta.",
  },
};

const privatePages: Record<string, string> = {
  "/review": "Leave a Review",
  "/confirmation": "Booking Confirmed",
  "/payment/success": "Payment Received",
  "/payment/cancelled": "Payment Cancelled",
  "/dashboard": "Owner Dashboard",
  "/admin": "Admin",
  "/admin/job-builder": "Job Builder",
  "/admin/jobs": "Jobs",
  "/admin/pricing-config": "Pricing Config",
};

const PRIVATE_DESCRIPTION = "Manage your installation with Picture Perfect TV Install. Call or text 404-702-4748 for help.";

export function normalizePagePath(path: string) {
  const raw = path.split(/[?#]/, 1)[0] || "/";
  return raw.length > 1 ? raw.replace(/\/+$/, "") : raw;
}

export function getPageMetadata(path: string, city?: { name: string; county: string; slug: string }) {
  const pathname = normalizePagePath(path);
  const page = publicPages[pathname] ?? (city ? {
    title: `TV Mounting in ${city.name}, GA`,
    description: `Professional TV mounting and selective smart-home installation in ${city.name}, ${city.county}. Evening and weekend appointments. Starting at $100 with your mount.`,
  } : null);

  if (page) {
    return {
      title: `${page.title} | ${BRAND}`,
      description: page.description,
      canonical: `${ORIGIN}${pathname}`,
      robots: "index, follow" as const,
      known: true,
      sensitive: false,
    };
  }

  const privateTitle = privatePages[pathname]
    ?? (pathname.startsWith("/q/") ? "Your Quote" : null);
  if (privateTitle) {
    return {
      title: `${privateTitle} | ${BRAND}`,
      description: PRIVATE_DESCRIPTION,
      canonical: pathname === "/review" ? `${ORIGIN}/review` : null,
      robots: "noindex, nofollow" as const,
      known: true,
      sensitive: pathname !== "/review",
    };
  }

  return {
    title: `Page Not Found | ${BRAND}`,
    description: PRIVATE_DESCRIPTION,
    canonical: null,
    robots: "noindex, nofollow" as const,
    known: false,
    sensitive: false,
  };
}
