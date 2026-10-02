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

export function createHostedCheckoutProvider(env: NodeJS.ProcessEnv = process.env, fetchImpl: FetchLike = fetch): HostedCheckoutProvider | null {
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
