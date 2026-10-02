import nodemailer from "nodemailer";

// Outbound safety layer: the single place that decides whether the app may talk to the
// outside world (customer email, SMS, push, AI providers). In staging, outbound is
// SUPPRESSED by default so a staging deploy can never email, text or notify a real
// customer, even if production-like credentials are present by mistake. Suppressed
// messages are recorded in a bounded in-memory outbox (recipients masked) for inspection.

export type AppEnv = "development" | "staging" | "production";
export type OutboundChannel = "email" | "sms" | "push" | "ai";

export function getAppEnv(): AppEnv {
  const explicit = (process.env.APP_ENV || "").trim().toLowerCase();
  if (explicit === "staging" || explicit === "production" || explicit === "development") return explicit;
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

/**
 * OUTBOUND_MODE=suppress|live overrides everything. Otherwise staging suppresses and
 * development/production send (development usually has no credentials, so sends fail closed).
 */
export function outboundSuppressed(): boolean {
  const mode = (process.env.OUTBOUND_MODE || "").trim().toLowerCase();
  if (mode === "suppress") return true;
  if (mode === "live") return getAppEnv() === "staging" && process.env.STAGING_ALLOW_LIVE_OUTBOUND !== "true";
  return getAppEnv() === "staging";
}

export interface OutboxEntry {
  at: string;
  channel: OutboundChannel;
  to: string;
  summary: string;
}

const MAX_OUTBOX = 200;
const outbox: OutboxEntry[] = [];

export function maskRecipient(to: unknown): string {
  const raw = Array.isArray(to) ? String(to[0] ?? "") : String(to ?? "");
  if (raw.includes("@")) return `***@${raw.split("@")[1] ?? "?"}`;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 4 ? `***${digits.slice(-2)}` : "***";
}

export function recordSuppressed(channel: OutboundChannel, to: unknown, summary: string): void {
  outbox.push({ at: new Date().toISOString(), channel, to: maskRecipient(to), summary: summary.slice(0, 120) });
  if (outbox.length > MAX_OUTBOX) outbox.shift();
  console.log(`[outbound:suppressed] ${channel} -> ${maskRecipient(to)}`);
}

export function getOutbox(): OutboxEntry[] {
  return outbox.slice();
}
export function clearOutbox(): void {
  outbox.length = 0;
}

type MailOptions = { to?: unknown; subject?: string } & Record<string, unknown>;

/** Drop-in replacement for nodemailer.createTransport that honours outbound suppression. */
export function createGuardedTransport(options: Record<string, unknown>) {
  const real = nodemailer.createTransport(options as never);
  return {
    async sendMail(mail: MailOptions) {
      if (outboundSuppressed()) {
        recordSuppressed("email", mail.to, String(mail.subject ?? "(no subject)"));
        return { messageId: "suppressed", accepted: [], rejected: [], suppressed: true } as unknown as Awaited<ReturnType<typeof real.sendMail>>;
      }
      return real.sendMail(mail as Parameters<typeof real.sendMail>[0]);
    },
  };
}

/** Refuse to boot staging against what looks like the production database. */
export function assertSafeBoot(env: NodeJS.ProcessEnv = process.env): void {
  if (getAppEnv() !== "staging") return;
  const prodHost = (env.PRODUCTION_DB_HOST || "").trim();
  const dbUrl = env.DATABASE_URL || "";
  if (prodHost && dbUrl.includes(prodHost)) {
    throw new Error("Refusing to start in staging: DATABASE_URL points at the production database host (PRODUCTION_DB_HOST).");
  }
  if (!env.ADMIN_API_TOKEN) {
    throw new Error("Refusing to start in staging without ADMIN_API_TOKEN (admin routes must never be open).");
  }
}

export function describeOutboundState() {
  return { appEnv: getAppEnv(), outboundSuppressed: outboundSuppressed() };
}
