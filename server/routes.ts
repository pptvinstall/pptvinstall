import type { Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
import { timingSafeEqual } from "crypto";
import { createGuardedTransport, describeOutboundState } from "./outbound";
import { storage } from "./storage";
import { sendBookingEmails, sendCancellationEmail, sendContactMessageEmail, sendRescheduleEmail } from "./email";
import { crmContacts, insertBookingSchema, insertContactMessageSchema, promotions, smsMessages, smsOptOuts } from "@shared/schema";
import { addDays, format } from "date-fns";
import { generateICS } from "./services/calendarService";
import { monitoring } from "./monitoring";
import { db } from "./db";
import { isStopKeyword, normalizePhoneForSms, validateTwilioWebhookRequest } from "./services/smsService";
import {
  checkAiQuoteRateLimit,
  getAiQuoteProtectionConfig,
  requestAnthropicQuote,
  requestAnthropicText,
  requestAnthropicVision,
  verifyTurnstileToken,
} from "./services/aiQuoteService";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { ZodError } from "zod";
import { registerJobOsRoutes } from "./jobos/routes";
import { JobOsService, type IntakeProvider } from "./jobos/service";
import { createMediaStorage } from "./jobos/media/storage";
import { createVisionProvider, type VisionProvider } from "./jobos/vision";
import { DbJobOsStore } from "./jobos/dbStore";
import { MemoryJobOsStore } from "./jobos/memoryStore";

function getAdminTokens() {
  const configuredTokens = [
    process.env.ADMIN_API_TOKEN?.trim(),
    process.env.ADMIN_PASSWORD?.trim(),
  ].filter((token): token is string => Boolean(token));

  if (configuredTokens.length) return [...new Set(configuredTokens)];

  // Local development fallback only. Production must explicitly configure an admin credential.
  if (process.env.NODE_ENV !== "production") return ["dev-admin-token"];

  return [];
}

function tokensMatch(providedToken: string, configuredToken: string) {
  const provided = Buffer.from(providedToken);
  const configured = Buffer.from(configuredToken);
  if (provided.length !== configured.length) return false;
  return timingSafeEqual(provided, configured);
}

function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const configuredTokens = getAdminTokens();
  if (!configuredTokens.length) {
    return res.status(503).json({ message: "Admin API is not configured." });
  }

  const providedToken = req.header("x-admin-token")?.trim() || "";
  let authorized = false;
  if (providedToken) {
    for (const configuredToken of configuredTokens) {
      // Evaluate every configured credential so matching the first vs second credential does not
      // change the comparison path. Never log or return either secret.
      authorized = tokensMatch(providedToken, configuredToken) || authorized;
    }
  }
  if (!authorized) {
    return res.status(401).json({ message: "Admin authorization required." });
  }

  next();
}

export function registerRoutes(app: Express): Server {
  app.get("/api/promotions", async (_req, res) => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const rows = await db
        .select()
        .from(promotions)
        .where(
          and(
            eq(promotions.isActive, true),
            or(isNull(promotions.startDate), lte(promotions.startDate, today)),
            or(isNull(promotions.endDate), gte(promotions.endDate, today)),
          ),
        )
        .orderBy(desc(promotions.priority), desc(promotions.updatedAt));

      res.json({
        promotions: rows.map((row) => ({
          id: row.id,
          name: row.title,
          description: row.description ?? "",
          linkText: row.linkText ?? undefined,
          linkUrl: row.linkUrl ?? undefined,
          backgroundColor: row.backgroundColor ?? undefined,
          textColor: row.textColor ?? undefined,
        })),
      });
    } catch (error) {
      console.error("Promotions route error:", error);
      res.json({ promotions: [] });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const message = insertContactMessageSchema.parse(req.body);
      await sendContactMessageEmail(message);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn("Contact route validation failed");
      } else {
        console.error("Contact route error:", error);
      }
      res.status(400).json({ message: "We couldn't send that message right now. Please call or text us instead." });
    }
  });

  function getClientIpAddress(req: Express["request"]) {
    const forwardedFor = req.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string") {
      return forwardedFor.split(",")[0]?.trim() || req.ip || "unknown";
    }
    return req.ip || "unknown";
  }

  function getBriefServices(pricingBreakdown: string | undefined, fallback: string) {
    try {
      const data = JSON.parse(pricingBreakdown || "{}");
      if (Array.isArray(data.items)) {