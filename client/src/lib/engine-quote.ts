import type { QuoteFormState, QuoteLineItem } from "@/lib/quote-calculator";
import type { DisplayQuote, StandaloneServices } from "@/components/ui/quote-tool/shared";

// Bridge from the public QuoteTool to the server pricing endpoint. The browser's catalog calculator stays the
// instant, always-available price. The server decides only in "engine" (dynamic) mode, which the owner must
// explicitly turn on. Every call here fails safe: any error returns null and the catalog price stays on screen.

export type PriceSource = "catalog" | "engine";

export type PublicPriceResponse =
  | { source: "catalog"; totalCents: number }
  | { source: "engine"; totalCents: number | null; status: "firm" | "estimate" | "review"; lines: Array<{ label: string; detail?: string; amountCents: number | null }>; notes: string[] };

async function withTimeout(input: string, init: RequestInit, ms: number): Promise<Response | null> {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), ms) : null;
  try {
    return await fetch(input, { ...init, signal: controller?.signal, credentials: "same-origin" });
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function fetchPriceSource(): Promise<PriceSource> {
  const res = await withTimeout("/api/quote/price-source", { method: "GET" }, 3_000);
  if (!res?.ok) return "catalog";
  try {
    const body = (await res.json()) as { source?: string };
    return body.source === "engine" ? "engine" : "catalog";
  } catch {
    return "catalog";
  }
}

/** Never throws. The customer's free-text notes are not sent. */
export async function requestEnginePrice(form: QuoteFormState, standalone: StandaloneServices, stage: "live" | "review", timeoutMs = 4_000): Promise<PublicPriceResponse | null> {
  const { notes: _notes, ...rest } = form;
  const res = await withTimeout(
    "/api/quote/price",
    { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ form: rest, standalone, stage }) },
    timeoutMs,
  );
  if (!res?.ok) return null;
  try {
    const body = (await res.json()) as PublicPriceResponse;
    if (body.source !== "catalog" && body.source !== "engine") return null;
    if (body.totalCents !== null && (!Number.isFinite(body.totalCents) || body.totalCents < 0)) return null;
    return body;
  } catch {
    return null;
  }
}

export const CONFIRM_PRICE_NOTE = "We'll confirm the final price after reviewing a few details with you.";

/** Show the engine price in the existing review layout. Falls back to the catalog quote with a note when needed. */
export function engineDisplayQuote(local: DisplayQuote, res: PublicPriceResponse | null): DisplayQuote {
  if (!res || res.source !== "engine" || res.totalCents === null) {
    return { ...local, flags: Array.from(new Set([...(local.flags ?? []), ...(res && res.source === "engine" ? res.notes : []), CONFIRM_PRICE_NOTE])) };
  }
  const items: QuoteLineItem[] = res.lines.map((l) => ({
    name: l.detail ? `${l.label} (${l.detail})` : l.label,
    price: (l.amountCents ?? 0) / 100,
    qty: 1,
    lineTotal: (l.amountCents ?? 0) / 100,
    isDiscount: (l.amountCents ?? 0) < 0,
  }));
  const total = res.totalCents / 100;
  return {
    ...local,
    groups: [{ title: "Your project", items, subtotal: total }],
    subtotal: total,
    discount: 0,
    total,
    flags: res.notes,
  };
}
