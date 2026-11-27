import "../env";
import { pricingData } from "../../client/src/data/pricing-data";
import { catalogPublicQuoteResult, publicQuoteRequestSchema } from "../../shared/pricing/publicQuote";
import { outboundSuppressed } from "../outbound";

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
    // AI is never reachable while outbound is suppressed (staging test mode).
    enabled: Boolean(anthropicApiKey) && !outboundSuppressed(),
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
    '{"groups":[{"title":"string","subtitle":"optional string","items":[{"name":"string","price":0,"qty":1,"lineTotal":0,"isDiscount":false}],"subtotal":0}],"subtotal":0,"discount":0,"total":0,"summary":"string","flags":["string"],"followUp":"optional string","scope":{"form":{"tvs":[{"size":"32-55 or 56+","exactInches":null,"model":null,"wallType":"drywall","location":"standard","hasMount":true,"mountType":null,"wireConcealment":false,"outletDistance":null,"unmounting":false}],"cameras":[],"doorbell":false,"doorbellBrand":"","soundbar":false,"surroundSound":false,"floodlight":false,"handymanMinutes":0,"zipCode":""},"standalone":{"removalCount":0,"troubleshootingMinutes":0,"wireManagementLocations":0,"deviceSetup":false,"sharedUnmountCount":0}}}',
    "The scope object is a factual extraction of the job for our deterministic pricing engine — it must contain ONLY facts the customer stated, never prices. Use the defaults shown for anything the customer did not specify. size is \"56+\" when the TV is 56 inches or larger, otherwise \"32-55\". exactInches is the exact diagonal when the customer gave one, else null. model is the exact model text when given, else null. hasMount is true unless the customer needs us to supply a mount; mountType is the requested mount type (fixed, tilting, or fullMotion) when we supply it, else null. outletDistance is \"near\" or \"far\" only when the customer clearly described the outlet distance, else null.",
    "Use TV groups plus one Shared Services group whenever appropriate.",
    "Evaluate wall type, fireplace risk, and wire concealment per TV group, not globally across the whole job.",
    "A fireplace TV should use one coherent fireplace pricing path per TV. Do not stack Standard TV Mounting, Over Fireplace TV Mounting, and Non-Drywall add-on together for the same fireplace TV.",
    "For a TV over a brick fireplace with a customer-provided mount, prefer a single fireplace mounting line item such as 'Fireplace TV Mounting (Customer's Mount)' rather than overlapping complexity lines.",
    "Fireplace mounting starts at $200 on any surface and is the complete starting charge for that fireplace TV. Do not add a separate non-drywall or brick/masonry surcharge to the same fireplace TV. On drywall the $200 fireplace price is firm. For a brick or stone fireplace, $200 is a STARTING price only: add a flag asking the customer for photos of the fireplace and stating the final price is confirmed after a quick photo review — never present a brick/stone fireplace total as final.",
    "Do not apply automatic discounts. Set quote-level discount to 0 unless an explicitly approved promotion is provided in the customer request.",
    "Multi-TV, repeat-customer, referral, mount-bundle, and multi-outlet discounts are owner-approved case-by-case and must never be invented by the quote assistant.",
    "Custom-quote policy: soundbars, outdoor installs, commercial work, projector/projector-screen assistance, selective smart-home devices, unusual specialty finishes, very large TVs, helper-required jobs, troubleshooting, and complex high-rise access must NOT receive an invented fixed price.",
    "A TV the customer describes as 86 inches or larger must NEVER receive a fixed mounting price: use a $0 line item ending in '— custom quote', record its exactInches and model in the scope object, and add a flag that we confirm the exact model, weight, VESA pattern, and mount compatibility before quoting. 85 inches and smaller follows normal pricing.",
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
    `Fixed-price condition: fireplace placement starts at $${pricingData.tvMounting.fireplace.price} for the base fireplace mounting path before any separately confirmed extra scope (firm on drywall; a starting price on brick/stone, confirmed after photo review).`,
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
  return requestAnthropicText("Return only valid JSON for a full structured quote.", buildAiQuotePrompt(message), 1400);
}

function parseAiQuoteJson(content: string): Record<string, unknown> | null {
  const trimmed = content.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 0;
  return Math.min(max, Math.max(min, n));
}

/**
 * Issue #35 S-10 — deterministic pricing convergence for the AI quote entry.
 *
 * The AI's job is scope extraction only (the same principle as JobOS intake:
 * "AI extracts scope, never sets price"). When the AI response carries a usable
 * `scope` extraction, the customer-facing groups/subtotal/discount/total are
 * REPLACED with the deterministic catalog calculation for that exact scope, so
 * the text/voice entry quotes the same price as the form entry for the same
 * confirmed scope. The AI's summary, follow-up and flags are kept (merged with
 * the deterministic flags).
 *
 * Failure behaviour is deliberate: if the response has no parseable scope, the
 * original AI content is returned unchanged (the pre-existing behaviour), so a
 * malformed extraction can never break the quote flow. That fallback is the
 * known remaining gap documented in docs/issue-35-implementation-notes.md.
 */
export function applyDeterministicPricing(content: string): string {
  try {
    const parsed = parseAiQuoteJson(content);
    if (!parsed) return content;
    const scope = asRecord(parsed.scope);
    const formIn = asRecord(scope.form);
    if (!Array.isArray(formIn.tvs)) return content;
    const standaloneIn = asRecord(scope.standalone);

    const tvs = (formIn.tvs as unknown[]).map((raw, i) => {
      const tv = asRecord(raw);
      const exactInches =
        typeof tv.exactInches === "number" && Number.isFinite(tv.exactInches) && tv.exactInches >= 19 && tv.exactInches <= 120
          ? Math.trunc(tv.exactInches)
          : null;
      return {
        id: `ai-tv-${i + 1}`,
        size: tv.size === "32-55" ? "32-55" : "56+",
        exactInches,
        model: typeof tv.model === "string" ? tv.model.slice(0, 120) : null,
        wallType: tv.wallType === "brick" || tv.wallType === "highrise" ? tv.wallType : "drywall",
        location: tv.location === "fireplace" ? "fireplace" : "standard",
        hasMount: tv.hasMount !== false,
        mountType: tv.mountType === "fixed" || tv.mountType === "tilting" || tv.mountType === "fullMotion" ? tv.mountType : null,
        wireConcealment: tv.wireConcealment === true,
        outletDistance: tv.outletDistance === "near" || tv.outletDistance === "far" ? tv.outletDistance : null,
        unmounting: tv.unmounting === true,
      };
    });
    const cameras = (Array.isArray(formIn.cameras) ? (formIn.cameras as unknown[]) : []).slice(0, 20).map((raw, i) => {
      const cam = asRecord(raw);
      return {
        id: `ai-cam-${i + 1}`,
        brand: ["ring", "blink", "google", "arlo", "wyze", "other"].includes(String(cam.brand)) ? String(cam.brand) : "other",
        type: ["wireless_smart", "wired_smart", "wired_dvr"].includes(String(cam.type)) ? String(cam.type) : "wireless_smart",
        location: cam.location === "indoor" ? "indoor" : "outdoor",
      };
    });
    const zipRaw = typeof formIn.zipCode === "string" ? formIn.zipCode : "";
    const candidate = {
      form: {
        tvs,
        cameras,
        doorbell: formIn.doorbell === true,
        doorbellBrand: typeof formIn.doorbellBrand === "string" ? formIn.doorbellBrand.slice(0, 40) : "",
        soundbar: formIn.soundbar === true,
        surroundSound: formIn.surroundSound === true,
        floodlight: formIn.floodlight === true,
        handymanMinutes: clampInt(formIn.handymanMinutes, 0, 600),
        zipCode: /^\d{5}$/.test(zipRaw) ? zipRaw : "",
      },
      standalone: {
        removalCount: clampInt(standaloneIn.removalCount, 0, 20),
        troubleshootingMinutes: clampInt(standaloneIn.troubleshootingMinutes, 0, 600),
        wireManagementLocations: clampInt(standaloneIn.wireManagementLocations, 0, 20),
        deviceSetup: standaloneIn.deviceSetup === true,
        sharedUnmountCount: clampInt(standaloneIn.sharedUnmountCount, 0, 20),
      },
      stage: "review" as const,
    };

    const validated = publicQuoteRequestSchema.safeParse(candidate);
    if (!validated.success) return content;

    const quote = catalogPublicQuoteResult(validated.data);
    const aiFlags = Array.isArray(parsed.flags) ? parsed.flags.filter((f): f is string => typeof f === "string") : [];
    const replacement = {
      groups: quote.groups,
      subtotal: quote.subtotal,
      discount: quote.discount,
      total: quote.total,
      summary: typeof parsed.summary === "string" && parsed.summary.trim() ? parsed.summary : "Here is the estimate based on the details you shared.",
      flags: Array.from(new Set([...quote.flags, ...aiFlags])),
      ...(typeof parsed.followUp === "string" && parsed.followUp.trim() ? { followUp: parsed.followUp } : {}),
      requiresReview: quote.requiresReview ?? false,
      reviewReasons: quote.reviewReasons ?? [],
      pricedBy: "deterministic",
    };
    return JSON.stringify(replacement);
  } catch {
    return content;
  }
}

/** Generic single-turn text request used by the quote assistant and the Job OS scope intake. */
export async function requestAnthropicText(system: string, prompt: string, maxTokens: number) {
  if (outboundSuppressed()) {
    throw new Error("AI requests are suppressed in this environment (staging test mode).");
  }
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
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
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

/** Single-turn multimodal request (images + instructions). Used only for Job OS scope/receipt extraction. */
export async function requestAnthropicVision(system: string, prompt: string, images: Array<{ id: string; jpeg: Buffer }>, maxTokens: number, model = process.env.ANTHROPIC_VISION_MODEL || "claude-sonnet-4-20250514") {
  if (outboundSuppressed()) {
    throw new Error("AI requests are suppressed in this environment (staging test mode).");
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }
  const content = [
    ...images.flatMap((img, i) => [
      { type: "text", text: `Image ${i + 1} id=${img.id}` },
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data: img.jpeg.toString("base64") } },
    ]),
    { type: "text", text: prompt },
  ];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "anthropic-version": "2023-06-01", "x-api-key": apiKey },
      body: JSON.stringify({ model, max_tokens: maxTokens, system, messages: [{ role: "user", content }] }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Anthropic vision request failed with status ${response.status}.`);
    const data = (await response.json()) as { content?: Array<{ type?: string; text?: string }> };
    const text = data.content?.find((block) => block.type === "text")?.text;
    if (!text) throw new Error("The AI vision service returned an empty response.");
    return text;
  } finally {
    clearTimeout(timer);
  }
}
