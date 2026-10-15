import { getCityBySlug } from "../cityPages";

// One source of truth for each public page's title, description and canonical URL.
// The server injects these into index.html (what Google and link previews read),
// and the client re-applies them on in-app navigation.

export const SITE_URL = "https://pptvinstall.com";
const BRAND = "Picture Perfect TV Install";

export type PageMeta = {
  title: string;
  description: string;
  /** Canonical path, e.g. "/services". */
  path: string;
  /** Keep out of search results (owner tools, one-off customer pages). */
  noindex?: boolean;
};

const staticPages: Record<string, Omit<PageMeta, "path">> = {
  "/": {
    title: `TV Mounting Atlanta | ${BRAND}`,
    description:
      "TV mounting in Atlanta and Metro Atlanta starting at $100. Get an itemized estimate, view real installations, or book Picture Perfect TV Install online.",
  },
  "/services": {
    title: `TV Mounting Services in Atlanta | ${BRAND}`,
    description:
      "TV mounting, wire concealment, fireplace and brick installs, soundbars, cameras, doorbells and TV removal across Metro Atlanta. See what's included and starting prices.",
  },
  "/quote": {
    title: `Instant TV Mounting Quote | ${BRAND}`,
    description:
      "Get an itemized TV mounting price for your Atlanta home in about a minute. Tap through your setup, type it out, or send a voice note.",
  },
  "/booking": {
    title: `Book TV Mounting in Atlanta | ${BRAND}`,
    description:
      "Pick your service and an open time slot for TV mounting or smart-home installation in Metro Atlanta. Evening and weekend appointments available.",
  },
  "/gallery": {
    title: `TV Mounting Photos & Recent Installs | ${BRAND}`,
    description:
      "Real TV mounting installs from around Atlanta: fireplace mounts, hidden wires, bedroom and living room setups.",
  },
  "/faq": {
    title: `TV Mounting FAQ: Pricing, Mounts & Walls | ${BRAND}`,
    description:
      "Answers about TV mounting prices, mount types, wall types, wire concealment, scheduling and what to have ready before your Atlanta install.",
  },
  "/contact": {
    title: `Contact Us: Call or Text 404-702-4748 | ${BRAND}`,
    description:
      "Call, text or message Picture Perfect TV Install about TV mounting and smart-home installation in Metro Atlanta.",
  },
  "/partners": {
    title: `Partners & Referrals for Property Managers, Realtors & Movers | ${BRAND}`,
    description:
      "Referral and partner program for Atlanta property managers, realtors, movers and short-term rental hosts who need reliable TV mounting.",
  },
};

const noindexPages: Record<string, string> = {
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

function normalizePath(pathname: string): string {
  const withoutQuery = pathname.split(/[?#]/)[0] || "/";
  const trimmed = withoutQuery.length > 1 ? withoutQuery.replace(/\/+$/, "") : withoutQuery;
  return trimmed || "/";
}

/**
 * Returns the page's meta, or null when the path isn't a page on this site
 * (the server answers those with a 404 status).
 */
export function getPageMeta(pathname: string): PageMeta | null {
  const path = normalizePath(pathname);

  const page = staticPages[path];
  if (page) return { ...page, path };

  const noindexTitle = noindexPages[path];
  if (noindexTitle) {
    return { title: `${noindexTitle} | ${BRAND}`, description: staticPages["/"].description, path, noindex: true };
  }

  if (path.startsWith("/q/") && path.length > 3) {
    return { title: `Your Quote | ${BRAND}`, description: staticPages["/"].description, path, noindex: true };
  }

  const cityMatch = path.match(/^\/areas\/([a-z0-9-]+)$/);
  if (cityMatch) {
    const city = getCityBySlug(cityMatch[1]);
    if (!city) return null;
    return {
      title: `TV Mounting in ${city.name}, GA | ${BRAND}`,
      description: `TV mounting and selective smart-home installation in ${city.name}, ${city.county}. Wires hidden, fireplace and brick mounts, evening and weekend appointments. From $100 per TV.`,
      path,
    };
  }

  return null;
}

export function notFoundMeta(pathname: string): PageMeta {
  return { title: `Page Not Found | ${BRAND}`, description: staticPages["/"].description, path: normalizePath(pathname), noindex: true };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Absolute canonical URL for a page path ("/" keeps its trailing slash). */
export function canonicalUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/** Rewrites title, description, canonical, robots, Open Graph and Twitter tags in index.html. */
export function applyPageMeta(html: string, meta: PageMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = canonicalUrl(meta.path);

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${description}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(<meta\s+name="twitter:description"\s+content=")[^"]*(")/, `$1${description}$2`);

  if (meta.noindex) {
    out = /<meta\s+name="robots"/.test(out)
      ? out.replace(/(<meta\s+name="robots"\s+content=")[^"]*(")/, "$1noindex,follow$2")
      : out.replace("</head>", `    <meta name="robots" content="noindex,follow" />\n  </head>`);
  }
  return out;
}
