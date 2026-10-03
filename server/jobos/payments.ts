export interface HostedCheckoutLinkInput {
  invoiceId: string;
  invoiceNumber: string;
  amountCents: number;
}

export interface HostedCheckoutLink {
  provider: string;
  url: string;
  amountCents: number;
}

export interface HostedCheckoutProvider {
  readonly name: string;
  enabled(): boolean;
  createLink(input: HostedCheckoutLinkInput): Promise<HostedCheckoutLink>;
}

type FetchLike = typeof fetch;

function checkoutBaseUrl(env: NodeJS.ProcessEnv) {
  const candidate = env.STRIPE_CHECKOUT_BASE_URL?.trim() || env.PUBLIC_BASE_URL?.trim() || "https://pptvinstall.com";
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
    return url.origin;
  } catch {
    throw new Error("Stripe checkout base URL must be an absolute http(s) URL.");
  }
}

function createStripeCheckoutProvider(env: NodeJS.ProcessEnv, fetchImpl: FetchLike): HostedCheckoutProvider | null {
  const secretKey = env.STRIPE_SECRET_KEY?.trim() || "";
  if (!secretKey) return null;
  const baseUrl = checkoutBaseUrl(env);

  return {
    name: "stripe",
    enabled: () => true,
    async createLink(input) {
      if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Checkout amount must be a positive integer number of cents.");

      const body = new URLSearchParams();
      body.set("mode", "payment");
      body.set("success_url", `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`);
      body.set("cancel_url", `${baseUrl}/payment/cancelled`);
      body.set("client_reference_id", input.invoiceId);
      body.set("metadata[invoice_id]", input.invoiceId);
      body.set("metadata[invoice_number]", input.invoiceNumber);
      body.set("payment_intent_data[metadata][invoice_id]", input.invoiceId);
      body.set("payment_intent_data[metadata][invoice_number]", input.invoiceNumber);
      body.set("line_items[0][price_data][currency]", "usd");
      body.set("line_items[0][price_data][product_data][name]", `PPTVInstall ${input.invoiceNumber}`);
      body.set("line_items[0][price_data][unit_amount]", String(input.amountCents));
      body.set("line_items[0][quantity]", "1");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      let response: Response;
      try {
        response = await fetchImpl("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${secretKey}`,
            "Content-Type": "application/x-www-form-urlencoded",
            "Idempotency-Key": `pptv-${input.invoiceId}-${input.amountCents}`.slice(0, 255),
          },
          body,
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error(`Stripe checkout request failed with status ${response.status}.`);
      const json = await response.json() as { url?: string | null };
      const url = json.url;
      if (!url || !/^https:\/\//i.test(url)) throw new Error("Stripe Checkout did not return a valid hosted URL.");
      return { provider: "stripe", url, amountCents: input.amountCents };
    },
  };
}

function createSquareCheckoutProvider(env: NodeJS.ProcessEnv, fetchImpl: FetchLike): HostedCheckoutProvider | null {
  const token = env.SQUARE_ACCESS_TOKEN?.trim() || "";
  const locationId = env.SQUARE_LOCATION_ID?.trim() || "";
  if (!token || !locationId) return null;

  const sandbox = (env.SQUARE_ENVIRONMENT || "").trim().toLowerCase() === "sandbox";
  const baseUrl = sandbox ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com";
  const apiVersion = env.SQUARE_API_VERSION?.trim() || "2026-09-16";

  return {
    name: "square",
    enabled: () => true,
    async createLink(input) {
      if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) throw new Error("Checkout amount must be a positive integer number of cents.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10_000);
      let response: Response;
      try {
        response = await fetchImpl(`${baseUrl}/v2/online-checkout/payment-links`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Square-Version": apiVersion,
          },
          body: JSON.stringify({
            idempotency_key: `pptv-${input.invoiceId}-${input.amountCents}`.slice(0, 192),
            description: `PPTVInstall ${input.invoiceNumber}`,
            quick_pay: {
              name: `PPTVInstall ${input.invoiceNumber}`,
              price_money: { amount: input.amountCents, currency: "USD" },
              location_id: locationId,
            },
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) throw new Error(`Square checkout request failed with status ${response.status}.`);
      const body = await response.json() as { payment_link?: { url?: string } };
      const url = body.payment_link?.url;
      if (!url || !/^https:\/\//i.test(url)) throw new Error("Square checkout did not return a valid payment link.");
      return { provider: "square", url, amountCents: input.amountCents };
    },
  };
}

/**
 * Secure hosted checkout provider.
 * Stripe is preferred when configured because PPTVInstall's live payout account is on Stripe.
 * Square remains a backwards-compatible fallback until its old credentials are removed.
 */
export function createHostedCheckoutProvider(env: NodeJS.ProcessEnv = process.env, fetchImpl: FetchLike = fetch): HostedCheckoutProvider | null {
  return createStripeCheckoutProvider(env, fetchImpl) ?? createSquareCheckoutProvider(env, fetchImpl);
}
