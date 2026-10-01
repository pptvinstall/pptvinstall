import type { Request } from "express";
import twilio from "twilio";

export type SmsProviderName = "twilio";
export type SmsSendStatus = "queued" | "sent" | "delivered" | "failed" | "undelivered" | "skipped";

export type SmsSendRequest = {
  to: string;
  body: string;
  messageType: string;
  bookingId?: number | null;
  crmContactId?: number | null;
};

export type SmsSendResult = {
  provider: SmsProviderName;
  providerMessageId?: string;
  status: SmsSendStatus;
};

export type TwilioWebhookValidation = {
  valid: boolean;
  status: number;
  reason?: string;
};

const STOP_KEYWORDS = new Set(["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);

function getOptionalEnv(name: string) {
  const value = process.env[name]?.trim();
  return value || "";
}

export function normalizePhoneForSms(value?: string | null) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return digits;
  return digits;
}

export function isStopKeyword(body?: string | null) {
  return STOP_KEYWORDS.has(String(body || "").trim().toUpperCase());
}

export function isSmsEnabled() {
  return getOptionalEnv("SMS_ENABLED").toLowerCase() === "true";
}

export function getSmsProviderConfig() {
  return {
    enabled: isSmsEnabled(),
    provider: "twilio" as const,
    accountSid: getOptionalEnv("TWILIO_ACCOUNT_SID"),
    authToken: getOptionalEnv("TWILIO_AUTH_TOKEN"),
    fromNumber: getOptionalEnv("TWILIO_FROM_NUMBER"),
    messagingServiceSid: getOptionalEnv("TWILIO_MESSAGING_SERVICE_SID"),
  };
}

function getTwilioClient() {
  const config = getSmsProviderConfig();
  if (!config.enabled) throw new Error("SMS is disabled. Set SMS_ENABLED=true to send messages.");
  if (!config.accountSid || !config.authToken) throw new Error("Twilio credentials are not configured.");
  if (!config.fromNumber && !config.messagingServiceSid) {
    throw new Error("Twilio sender is not configured. Set TWILIO_FROM_NUMBER or TWILIO_MESSAGING_SERVICE_SID.");
  }
  return { client: twilio(config.accountSid, config.authToken), config };
}

export async function sendSmsMessage(request: SmsSendRequest): Promise<SmsSendResult> {
  const { client, config } = getTwilioClient();
  const response = await client.messages.create({
    body: request.body,
    to: request.to,
    ...(config.messagingServiceSid
      ? { messagingServiceSid: config.messagingServiceSid }
      : { from: config.fromNumber }),
  });

  return {
    provider: "twilio",
    providerMessageId: response.sid,
    status: (response.status as SmsSendStatus) || "queued",
  };
}

// Compatibility wrapper for existing manual notification paths. Automatic appointment SMS is not enabled in Phase 2A.
export async function sendSMS(to: string, body: string) {
  return sendSmsMessage({ to, body, messageType: "manual" });
}

export function validateTwilioWebhookRequest(req: Request): TwilioWebhookValidation {
  const authToken = getOptionalEnv("TWILIO_AUTH_TOKEN");
  const signature = req.header("x-twilio-signature") || "";
  const publicAppUrl = getOptionalEnv("PUBLIC_APP_URL").replace(/\/$/, "");
  const requestUrl = publicAppUrl
    ? `${publicAppUrl}${req.originalUrl}`
    : `${req.protocol}://${req.get("host")}${req.originalUrl}`;

  if (!authToken || !signature) {
    if (process.env.NODE_ENV === "production") {
      return { valid: false, status: 403, reason: "Twilio webhook signature validation is not configured." };
    }
    return { valid: true, status: 200, reason: "Signature validation skipped outside production." };
  }

  const valid = twilio.validateRequest(authToken, signature, requestUrl, req.body || {});
  return valid
    ? { valid: true, status: 200 }
    : { valid: false, status: 403, reason: "Invalid Twilio webhook signature." };
}
