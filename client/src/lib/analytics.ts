type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    __pptvAnalyticsEvents__?: Array<{
      name: string;
      payload: AnalyticsPayload;
      timestamp: string;
    }>;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// ── GA4 bootstrap ─────────────────────────────────────────────────────────────

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;

function bootstrapGA4() {
  if (!GA_ID || typeof window === "undefined") return;
  if (window.gtag) return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function (..._args: unknown[]) {
    // eslint-disable-next-line prefer-rest-params
    (window.dataLayer as IArguments[]).push(arguments as unknown as IArguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);
}

if (typeof window !== "undefined") {
  bootstrapGA4();
}

// ── Core event emitter ────────────────────────────────────────────────────────

export function trackEvent(name: string, payload: AnalyticsPayload = {}) {
  if (typeof window === "undefined") return;

  const event = { name, payload, timestamp: new Date().toISOString() };
  window.__pptvAnalyticsEvents__ = window.__pptvAnalyticsEvents__ ?? [];
  window.__pptvAnalyticsEvents__.push(event);
  window.dispatchEvent(new CustomEvent("pptv:track", { detail: event }));

  if (GA_ID && window.gtag) {
    window.gtag("event", name, payload);
  }

  if (import.meta.env.DEV) {
    console.info("[analytics]", name, payload);
  }
}

// ── Page view ─────────────────────────────────────────────────────────────────

export function trackPageView(path: string) {
  if (!GA_ID || typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_title: document.title,
  });
  if (import.meta.env.DEV) {
    console.info("[analytics] page_view", path);
  }
}

// ── Typed event helpers ───────────────────────────────────────────────────────

export function trackBookingStarted(params: { entryMode?: string } = {}) {
  trackEvent("booking_started", params);
}

export function trackBookingCompleted(params: { total?: number; date?: string; time?: string } = {}) {
  trackEvent("booking_completed", params);
}

export function trackQuoteRequested(params: { mode?: string; total?: number } = {}) {
  trackEvent("quote_requested", params);
}

export function trackContactSubmitted(params: { source?: string } = {}) {
  trackEvent("contact_submitted", params);
}

export function trackPhoneClicked(params: { location?: string } = {}) {
  trackEvent("phone_clicked", params);
}
