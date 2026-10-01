import "../env";
import { pricingData } from "../../client/src/data/pricing-data";

type RateLimitEntry = {
  count: number;
  windowStartedAt: number;
  lastRequestAt: number;
};

type RateLimitSettings = {
  maxRequestsPerHour: number;
  windowMs: number;
  minimumCooldownMs: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

function getAiQuoteRateLimitSettings(): RateLimitSettings {
  const isProduction = process.env.NODE_ENV === "production";

  return isProduction
    ? {
        maxRequestsPerHour: 3,
        windowMs: 60 * 60 * 1000,
        minimumCooldownMs: 30 * 1000,
      }
    : {
        maxRequestsPerHour: 50,
        windowMs: 60 * 60 * 1000,
        minimumCooldownMs: 1500,
      };
}

export function getAiQuoteProtectionConfig() {
  const siteKey = process.env.VITE_TURNSTILE_SITE_KEY?.trim() || "";
  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim() || "";
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY?.trim() || "";
  const turnstileRequired = Boolean(siteKey && turnstileSecret);

  return {
    siteKey,
    enabled: Boolean(anthropicApiKey),
    turnstileRequired,
    requireTurnstile: turnstileRequired,
  };
}

export function buildAiQuotePrompt(message: string): string {
  return [
    "You are a pricing assistant for Picture Perfect TV Install.",
    "Use ONLY the canonical fixed-price data and policy rules below as the source of truth.",
    "Return ONLY valid JSON. No markdown. No preamble.",
    "Return this exact schema:",
    '{"groups":[{"title":"string","subtitle":"optional string","items":[{"name":"string","price":0,"qty":1,"lineTotal":0,"isDiscount":false}],"subtotal":0}],"subtotal":0,"discount":0,"total":0,"summary":"string","flags":["string"],"followUp":"optional string"}',
    "Use TV groups plus one Shared Services group whenever appropriate.",
    "Evaluate wall type, fireplace risk, and wire concealment per TV group, not globally across the whole job.",
    "A fireplace TV should use one coherent fireplace pricing path per TV. Do not stack Standard TV Mounting, Over Fireplace TV Mounting, and Non-Drywall add-on together for the same fireplace TV.",
    "For a TV over a brick fireplace with a customer-provided mount, prefer a single fireplace mounting line item such as 'Fireplace TV Mounting (Customer's Mount)' rather than overlapping complexity lines.",
    "Treat the fireplace mounting price as the complete mounting charge for that fireplace TV. Do not add a separate non-drywall or brick/masonry surcharge to the same fireplace TV unless the customer clearly described a separate extra service.",
    "Do not apply automatic discounts. Set quote-level discount to 0 unless an explicitly approved promotion is provided in the customer request.",
    "Multi-TV, repeat-customer, referral, mount-bundle, and multi-outlet discounts are owner-approved case-by-case and must never be invented by the quote assistant.",
    "Custom-quote policy: soundbars, outdoor installs, commercial work, projector/projector-screen assistance, selective smart-home devices, unusual specialty finishes, very large TVs, helper-required jobs, troubleshooting, and complex high-rise access must NOT receive an invented fixed price.",
    "For a custom-quote item, include a $0 line item whose name ends with '— custom quote' and add a flag explaining what must be reviewed.",
    "PPTVInstall is not a general handyman service. Do not quote furniture assembly, shelves, mirrors, ceiling fans, TV repair, or broad electrical/home-theater wiring as standard services.",
    "Travel policy: never add an automatic mileage or ZIP travel fee. Distance, route fit, access, schedule, and total ticket are reviewed case-by-case before final booking.",
    "If fireplace wire concealment is requested, include a $0 line item named 'Wire concealment assessment required' and add a flag about photo assessment.",
    "If one TV is over a fireplace and another TV is a standard drywall install, only the fireplace TV should use the assessment-only concealment line. The drywall TV should still receive the normal wire concealment price when requested.",
    "Do not let a fireplace TV or a masonry TV cause a second standard drywall TV to lose its normal wire concealment pricing.",
    "For standard non-fireplace wire concealment, if the customer clearly says the outlet is already close, nearby, directly below, or within 1–2 feet, keep the normal concealment pricing with no extra clarification.",
    "For standard non-fireplace wire concealment, if the customer clearly says the outlet is farther away or not nearby, keep the normal concealment pricing but add a flag that extra outlet work may need confirmation.",
    `If standard non-fireplace wire concealment is included and outlet distance is not clearly known, use this follow-up question exactly: "${"Is the existing outlet within 1–2 feet of where you want the TV mounted?"}"`,
    "If the ZIP is unfamiliar or farther away, add a route-review flag; do not reject it automatically.",
    "If a floodlight is included, make it a custom quote and add a flag about the exact device and existing outdoor wiring.",
    "If any camera system is included, make it a custom quote; wired DVR/NVR systems require especially careful scope review.",
    "Smart doorbells and other smart-home device installs are custom quotes until the exact device and scope are confirmed.",
    "Soundbar work is a custom quote. Full home-theater wiring is not a standard service.",
    "Streaming-device and cable-box setup may be offered, but price it as a custom quote until the exact scope is confirmed.",
    `Fixed-price service: standard drywall TV mounting with customer-supplied compatible mount is $${pricingData.tvMounting.standard.price}.`,
    `Fixed-price condition: fireplace placement is $${pricingData.tvMounting.fireplace.price} total for the base fireplace mounting path before any separately confirmed extra scope.`,
    `Fixed-price condition: brick/stone add-on is $${pricingData.tvMounting.nonDrywall.price}; high-rise/steel-stud working add-on is $${pricingData.tvMounting.highRise.price} when the job remains within normal scope.`,
    `Fixed-price service: outlet behind TV / clean-cord setup is $${pricingData.wireConcealment.standard.price}.`,
    `Fixed-price service: TV unmounting/removal only is $${pricingData.otherServices.tvUnmounting.price} per TV.`,
    `PPTV-supplied mount add-ons: fixed 32–55 $${pricingData.tvMounts.fixedSmall.price}, tilt 32–55 $${pricingData.tvMounts.tiltingSmall.price}, full motion 32–55 $${pricingData.tvMounts.fullMotionSmall.price}, fixed 56+ $${pricingData.tvMounts.fixedBig.price}, tilt 56+ $${pricingData.tvMounts.tiltingBig.price}, full motion 56+ $${pricingData.tvMounts.fullMotionBig.price}.`,
    `Customer request: ${message}`,
  ].join("\n");
}

export function checkAiQuoteRateLimit(ipAddress: string): { allowed: true } | { allowed: false; message: string; retryAfterSeconds: number; code: "AI_QUOTE_RATE_LIMITED" } {
  const settings = getAiQuoteRateLimitSettings();
  const now = Date.now();
  const existing = rateLimitStore.get(ipAddress);

  if (!existing || now - existing.windowStartedAt >= settings.windowMs) {
    rateLimitStore.set(ipAddress, {
      count: 1,
      windowStartedAt: now,
      lastRequestAt: now,
    });
    return { allowed: true };
  }

  const cooldownRemainingMs = settings.minimumCooldownMs - (now - existing.lastRequestAt);
  if (cooldownRemainingMs > 0) {
    return {
      allowed: false,
      code: "AI_QUOTE_RATE_LIMITED",
      message: process.env.NODE_ENV === "production"
        ? "Please wait a moment before trying another AI quote request."
        : "Please wait a second before trying another AI quote request in local dev.",
      retryAfterSeconds: Math.max(1, Math.ceil(cooldownRemainingMs / 1000)),
    };
  }

  if (existing.count >= settings.maxRequestsPerHour) {
    const windowRemainingMs = settings.windowMs - (now - existing.windowStartedAt);
    return {
      allowed: false,
      code: "AI_QUOTE_RATE_LIMITED",
      message: "You've reached the limit for AI quote requests right now. Please try again later or call us directly.",
      retryAfterSeconds: Math.max(1, Math.ceil(windowRemainingMs / 1000)),
    };
  }

  existing.count += 1;
  existing.lastRequestAt = now;
  rateLimitStore.set(ipAddress, existing);
  return { allowed: true };
}

export async function verifyTurnstileToken(token: string, ipAddress: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error("TURNSTILE_SECRET_KEY is not configured.");
  }

  if (!token) {
    return false;
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      secret,
      response: token,
      remoteip: ipAddress,
    }),
  });

  if (!response.ok) {
    return false;
  }

  const data = (await response.json()) as { success?: boolean };
  return data.success === true;
}

export async function requestAnthropicQuote(message: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1400,
      system: "Return only valid JSON for a full structured quote.",
      messages: [{ role: "user", content: buildAiQuotePrompt(message) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic request failed with status ${response.status}.`);
  }

  const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
  const content = data.content?.find((block) => block.type === "text")?.text;
  if (!content) {
    throw new Error("The AI quote service returned an empty response.");
  }

  return content;
}
