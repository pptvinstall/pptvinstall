import type { Express, NextFunction, Request, Response } from "express";
import { createServer, type Server } from "http";
import { timingSafeEqual } from "crypto";
import nodemailer from "nodemailer";
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
  verifyTurnstileToken,
} from "./services/aiQuoteService";
import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { ZodError } from "zod";

function getAdminToken() {
  const configuredToken = process.env.ADMIN_API_TOKEN?.trim() || process.env.ADMIN_PASSWORD?.trim();
  if (configuredToken) return configuredToken;

  // Local development fallback only. Production must explicitly configure an admin token.
  if (process.env.NODE_ENV !== "production") return "dev-admin-token";

  return "";
}

function tokensMatch(providedToken: string, configuredToken: string) {
  const provided = Buffer.from(providedToken);
  const configured = Buffer.from(configuredToken);
  if (provided.length !== configured.length) return false;
  return timingSafeEqual(provided, configured);
}

function requireAdminToken(req: Request, res: Response, next: NextFunction) {
  const configuredToken = getAdminToken();
  if (!configuredToken) {
    return res.status(503).json({ message: "Admin API is not configured." });
  }

  const providedToken = req.header("x-admin-token")?.trim() || "";
  if (!providedToken || !tokensMatch(providedToken, configuredToken)) {
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
        return data.items.slice(0, 3).map((item: { name?: string }) => item.name || "Service").join(", ");
      }
      if (Array.isArray(data.quoteGroups)) {
        return data.quoteGroups
          .flatMap((group: { title?: string; items?: Array<{ name?: string }> }) =>
            (group.items || []).map((item) => (group.title === "Shared Services" ? item.name || "Service" : `${group.title} - ${item.name || "Service"}`)),
          )
          .slice(0, 3)
          .join(", ");
      }
    } catch (error) {
      console.error("Could not parse service list:", error);
    }
    return fallback;
  }

  async function upsertCustomerCrmRecord(booking: any, consentSource = "booking_form", ipAddress?: string) {
    const normalizedEmail = String(booking.email || "").trim().toLowerCase();
    const normalizedPhone = normalizePhoneForSms(booking.phone);
    if (!normalizedEmail && !normalizedPhone) return;

    const emailOptIn = booking.emailMarketingOptIn === true;
    const transactionalSmsOptIn = booking.transactionalSmsOptIn === true;
    const smsOptIn = booking.smsMarketingOptIn === true;
    const birthdayOptIn = booking.birthdayPromoOptIn === true;
    const hasMarketingConsent = emailOptIn || smsOptIn || birthdayOptIn;
    const now = new Date();
    const latestBookingDate = booking.preferredDate ? new Date(`${booking.preferredDate}T12:00:00`) : null;
    const latestServiceSummary = getBriefServices(booking.pricingBreakdown, booking.serviceType);

    const updateSet: Record<string, unknown> = {
      fullName: booking.name,
      email: booking.email || null,
      normalizedEmail: normalizedEmail || null,
      phone: normalizedPhone || booking.phone,
      normalizedPhone: normalizedPhone || null,
      cityArea: booking.city,
      lastBookingId: Number(booking.id),
      latestServiceSummary,
      latestBookingDate,
      updatedAt: now,
    };

    if (booking.birthday) updateSet.birthday = booking.birthday;
    if (emailOptIn) updateSet.emailMarketingOptIn = true;
    if (transactionalSmsOptIn) updateSet.transactionalSmsOptIn = true;
    if (smsOptIn) updateSet.smsMarketingOptIn = true;
    if (birthdayOptIn) updateSet.birthdayPromoOptIn = true;
    if (hasMarketingConsent) {
      updateSet.marketingConsentAt = now;
      updateSet.marketingConsentSource = consentSource;
      if (ipAddress) updateSet.consentIpAddress = ipAddress;
    }

    const matchConditions = [
      normalizedEmail ? eq(crmContacts.normalizedEmail, normalizedEmail) : null,
      normalizedPhone ? eq(crmContacts.normalizedPhone, normalizedPhone) : null,
    ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));

    const [existingContact] = await db
      .select()
      .from(crmContacts)
      .where(matchConditions.length === 1 ? matchConditions[0] : or(...matchConditions))
      .limit(1);

    if (existingContact) {
      await db
        .update(crmContacts)
        .set(updateSet)
        .where(eq(crmContacts.id, existingContact.id));
      return;
    }

    await db
      .insert(crmContacts)
      .values({
        fullName: booking.name,
        email: booking.email || null,
        normalizedEmail: normalizedEmail || null,
        phone: normalizedPhone || booking.phone || null,
        normalizedPhone: normalizedPhone || null,
        birthday: booking.birthday || null,
        cityArea: booking.city,
        emailMarketingOptIn: emailOptIn,
        transactionalSmsOptIn,
        smsMarketingOptIn: smsOptIn,
        smsReachableStatus: "unknown",
        birthdayPromoOptIn: birthdayOptIn,
        marketingConsentAt: hasMarketingConsent ? now : null,
        marketingConsentSource: hasMarketingConsent ? consentSource : null,
        consentIpAddress: hasMarketingConsent ? ipAddress || null : null,
        lastBookingId: Number(booking.id),
        latestServiceSummary,
        latestBookingDate,
        updatedAt: now,
      });
  }
  
  // --- HELPER: GET SLOTS FOR A SPECIFIC DATE ---
  function getSlots(date: Date) {
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    if (!isWeekend) {
      return ["5:30 PM", "6:00 PM", "6:30 PM", "7:00 PM"];
    }

    const slots: string[] = [];
    for (let hour = 11; hour <= 19; hour += 1) {
      slots.push(format(new Date(2026, 0, 1, hour, 0), "h:mm a"));
      if (hour < 19) {
        slots.push(format(new Date(2026, 0, 1, hour, 30), "h:mm a"));
      }
    }
    return slots;
  }

  function parseSlotTime(date: Date, slot: string): Date {
    const [timePart, meridiemPart] = slot.split(" ");
    const [hoursPart, minutesPart] = timePart.split(":");
    let hours = Number(hoursPart);
    const minutes = Number(minutesPart);
    const meridiem = meridiemPart.toUpperCase();
    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes, 0, 0);
  }

  function getAvailableSlots(date: Date, bookedSlots: string[]) {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    let allSlots = getSlots(date);
    if (isToday) {
      const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      allSlots = allSlots.filter((slot) => parseSlotTime(date, slot) >= twoHoursFromNow);
    }
    return allSlots.filter((slot) => !bookedSlots.includes(slot));
  }

  // --- 1. FIND NEXT AVAILABLE SLOT (SERVER SIDE LOGIC) ---
  app.get("/api/next-slot", async (req, res) => {
    try {
      const allBookings = await storage.getAllBookings();

      let checkDate = new Date();
      let foundSlot = null;
      let foundDate = null;

      for (let i = 0; i <= 14; i++) {
        const targetDate = addDays(checkDate, i);
        const dateStr = format(targetDate, 'yyyy-MM-dd');

        const takenOnDay = allBookings
          .filter(b => b.preferredDate === dateStr && b.status !== 'cancelled')
          .map(b => b.appointmentTime);

        const firstFree = getAvailableSlots(targetDate, takenOnDay)[0];

        if (firstFree) {
          foundSlot = firstFree;
          foundDate = dateStr;
          break;
        }
      }

      if (foundDate && foundSlot) {
        res.json({ date: foundDate, time: foundSlot });
      } else {
        res.status(404).json({ message: "No slots found soon" });
      }
    } catch (error) {
      console.error("ASAP Error:", error);
      res.status(500).json({ message: "Error calculating slots" });
    }
  });

  // --- 2. CHECK AVAILABILITY (For Calendar Grid) ---
  app.get("/api/availability", async (req, res) => {
    try {
      const date = req.query.date as string;
      if (!date) return res.json([]);

      const allBookings = await storage.getAllBookings();
      const takenTimes = allBookings
        .filter(b => b.preferredDate === date && b.status !== 'cancelled')
        .map(b => b.appointmentTime);

      res.json(takenTimes);
    } catch (error) {
      res.status(500).json([]);
    }
  });

  app.get("/api/ai-quote/config", (_req, res) => {
    const config = getAiQuoteProtectionConfig();
    res.json(config);
  });

  app.post("/api/ai-quote", async (req, res) => {
    const {
      message,
      mode,
      description,
      zipCode,
      turnstileToken,
      honeypot,
    } = req.body as {
      message?: string;
      mode?: string;
      description?: string;
      zipCode?: string;
      turnstileToken?: string;
      honeypot?: string;
    };

    const structuredDescription = typeof description === "string" ? description.trim() : "";
    const structuredZipCode = typeof zipCode === "string" ? zipCode.trim() : "";
    const aiMessage = structuredDescription
      ? [
          mode ? `Mode: ${mode}` : null,
          structuredZipCode ? `ZIP: ${structuredZipCode}` : null,
          `Request: ${structuredDescription}`,
        ]
          .filter(Boolean)
          .join("\n")
      : message?.trim() || "";

    if (typeof honeypot === "string" && honeypot.trim()) {
      return res.status(400).json({ message: "We couldn't process that quote request. Please try again." });
    }

    if (!aiMessage) {
      return res.status(400).json({ message: "Please describe the job before requesting an AI quote." });
    }

    const config = getAiQuoteProtectionConfig();
    if (!config.enabled) {
      return res.status(503).json({ message: "AI quote requests are temporarily unavailable. Please call or text us instead." });
    }

    const ipAddress = getClientIpAddress(req);

    try {
      // Only verify Turnstile when it is configured (production). Skip in local dev.
      if (config.turnstileRequired) {
        const turnstilePassed = await verifyTurnstileToken(turnstileToken || "", ipAddress);
        if (!turnstilePassed) {
          return res.status(400).json({ message: "Please complete the quick verification before requesting an AI quote." });
        }
      }

      const rateLimitResult = checkAiQuoteRateLimit(ipAddress);
      if (!rateLimitResult.allowed) {
        return res.status(429).json({
          error: {
            code: rateLimitResult.code,
            message: rateLimitResult.message,
            retryAfterSeconds: rateLimitResult.retryAfterSeconds,
          },
        });
      }

      const content = await requestAnthropicQuote(aiMessage);
      return res.json({ content });
    } catch (error) {
      console.error("AI quote route error:", error);
      return res.status(500).json({ message: "We couldn't generate that AI quote right now. Please try again or call us directly." });
    }
  });

  // --- 3. CREATE BOOKING (With Bouncer) ---
  app.post("/api/bookings", async (req, res) => {
    try {
      const data = insertBookingSchema.parse(req.body);
      const requestedDate = new Date(`${data.preferredDate}T12:00:00`);

      if (Number.isNaN(requestedDate.getTime())) {
        return res.status(400).json({ message: "Please select a valid appointment date." });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const requestedDay = new Date(requestedDate);
      requestedDay.setHours(0, 0, 0, 0);

      if (requestedDay < today) {
        return res.status(400).json({ message: "Please select a future appointment date." });
      }

      if (!getSlots(requestedDate).includes(data.appointmentTime)) {
        return res.status(400).json({ message: "That appointment time is outside our available hours." });
      }

      if (
        requestedDay.getTime() === today.getTime() &&
        parseSlotTime(requestedDate, data.appointmentTime).getTime() < Date.now() + 2 * 60 * 60 * 1000
      ) {
        return res.status(409).json({ message: "Same-day appointments require at least two hours notice." });
      }

      const booking = await storage.createBookingIfAvailable(data);
      if (!booking) {
        console.log(`Blocked duplicate booking for ${data.preferredDate} @ ${data.appointmentTime}`);
        return res.status(409).json({ message: "That time slot was just booked. Please select another time." });
      }

      // CRM capture only: transactional booking emails/texts remain separate from marketing consent.
      upsertCustomerCrmRecord(
        {
          ...booking,
          birthday: data.birthday,
          emailMarketingOptIn: data.emailMarketingOptIn,
          transactionalSmsOptIn: data.transactionalSmsOptIn,
          smsMarketingOptIn: data.smsMarketingOptIn,
          birthdayPromoOptIn: data.birthdayPromoOptIn,
        },
        data.consentSource || "booking_form",
        getClientIpAddress(req),
      ).catch((err) => console.error("CRM capture error:", {
        bookingId: booking.id,
        hasEmail: Boolean(booking.email),
        phoneLast4: String(booking.phone || "").replace(/\D/g, "").slice(-4),
        error: err,
      }));

      sendBookingEmails(booking).catch(err => console.error("Email Error:", err));
      // Phase 2A SMS foundation only: transactional SMS sends are intentionally disabled
      // until reminder/confirmation jobs are added with dedupe and delivery logging.
      
      res.json(booking);
    } catch (error) {
      if (error instanceof ZodError) {
        console.warn("Booking validation failed");
        return res.status(400).json({ message: "Invalid booking data" });
      }

      console.error("Booking Error:", error);
      return res.status(500).json({
        message: "We couldn't complete that booking right now. Please try again or call us directly.",
      });
    }
  });

  app.get("/api/bookings/:id/calendar", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const token = typeof req.query.token === "string" ? req.query.token.trim() : "";

      if (!Number.isInteger(id) || id <= 0 || !token) {
        return res.status(404).json({ message: "Booking not found" });
      }

      const booking = await storage.getBookingById(id);

      // Treat an invalid token exactly like a missing booking so this endpoint
      // cannot be used to enumerate appointment/customer data by sequential ID.
      if (!booking?.managementToken || !tokensMatch(token, booking.managementToken)) {
        return res.status(404).json({ message: "Booking not found" });
      }

      let summary = booking.serviceType;
      try {
        const parsed = JSON.parse(booking.pricingBreakdown || "{}");
        if (Array.isArray(parsed.items)) {
          summary = parsed.items.map((item: { name?: string }) => item.name || "Service").join(", ");
        } else if (Array.isArray(parsed.quoteGroups)) {
          summary = parsed.quoteGroups
            .flatMap((group: { title?: string; items?: Array<{ name?: string }> }) =>
              (group.items || []).map((item) => (group.title === "Shared Services" ? item.name || "Service" : `${group.title} - ${item.name || "Service"}`)),
            )
            .join(", ");
        }
      } catch (error) {
        console.error("Calendar summary parse error:", error);
      }

      const ics = generateICS({
        customerName: booking.name,
        customerEmail: booking.email,
        date: booking.preferredDate,
        time: booking.appointmentTime,
        address: booking.streetAddress,
        city: booking.city,
        zip: booking.zipCode,
        summary,
        total: Number(booking.pricingTotal || 0),
      });

      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="pptvinstall-appointment.ics"');
      return res.send(ics);
    } catch (error) {
      console.error("Calendar endpoint error:", error);
      return res.status(500).json({ message: "Could not generate calendar file" });
    }
  });

  app.post("/api/quote-request", async (req, res) => {
    const {
      name,
      phone,
      quoteTotal,
      quoteItems,
      quoteSummary,
      zipCode,
    } = req.body as {
      name?: string;
      phone?: string;
      quoteTotal?: number;
      quoteItems?: Array<{ name?: string; price?: number; qty?: number }>;
      quoteSummary?: string;
      zipCode?: string;
    };

    if (!name || !phone || quoteTotal === undefined || !Array.isArray(quoteItems)) {
      return res.status(400).json({ success: false, error: "Missing quote request fields" });
    }

    const itemsList = quoteItems
      .map((item) => `  • ${item.name ?? "Service"}: $${Number(item.price ?? 0) * Number(item.qty ?? 1)}`)
      .join("\n");

    const ownerMessage =
      `NEW QUOTE REQUEST\n` +
      `Customer: ${name}\n` +
      `Phone: ${phone}\n` +
      `Zip: ${zipCode ?? "N/A"}\n` +
      `Total: $${quoteTotal}\n\n` +
      `Services:\n${itemsList}\n\n` +
      `Summary: ${quoteSummary ?? "No summary provided."}`;

    const customerMessage =
      `Hey ${name}! We got your quote request for $${quoteTotal}. ` +
      `We'll reach out within 2 hours to schedule your install. ` +
      `Questions? Call 404-702-4748. - Picture Perfect TV Install`;

    try {
      // Phase 2A SMS foundation only: quote request SMS is intentionally disabled
      // until outbound SMS sends are added with consent checks and message logging.
      try {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: process.env.EMAIL_FROM || "Picture Perfect TV Install <pptvinstall@gmail.com>",
          to: process.env.ADMIN_EMAIL || "pptvinstall@gmail.com",
          subject: `New Quote Request - ${name} - $${quoteTotal}`,
          text: ownerMessage,
        });

        return res.json({ success: true, method: "email" });
      } catch (emailError) {
        console.error("Quote request email failed:", emailError);
        return res.status(500).json({ success: false, error: "Could not send notification" });
      }
    } catch (error) {
      console.error("Quote request notification failed:", error);
      return res.status(500).json({ success: false, error: "Could not send notification" });
    }
  });

  app.post("/api/sms/twilio/inbound", async (req, res) => {
    const twilioResponse = (message?: string) => {
      const body = message ? `<Message>${message}</Message>` : "";
      return `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`;
    };

    try {
      const validation = validateTwilioWebhookRequest(req);
      if (!validation.valid) {
        console.warn("Twilio inbound webhook rejected:", validation.reason);
        return res.status(validation.status).type("text/xml").send(twilioResponse());
      }

      const fromPhone = typeof req.body?.From === "string" ? req.body.From : "";
      const inboundBody = typeof req.body?.Body === "string" ? req.body.Body : "";
      const normalizedPhone = normalizePhoneForSms(fromPhone);
      const tenDigitPhone = normalizedPhone.length === 11 && normalizedPhone.startsWith("1") ? normalizedPhone.slice(1) : normalizedPhone;

      if (!normalizedPhone) {
        return res.status(400).type("text/xml").send(twilioResponse());
      }

      if (!isStopKeyword(inboundBody)) {
        return res.type("text/xml").send(twilioResponse());
      }

      const now = new Date();
      await db
        .insert(smsOptOuts)
        .values({
          normalizedPhone,
          optedOutAt: now,
          source: "twilio_inbound",
          provider: "twilio",
          rawMessage: inboundBody.trim().slice(0, 80),
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: smsOptOuts.normalizedPhone,
          set: {
            optedOutAt: now,
            source: "twilio_inbound",
            provider: "twilio",
            rawMessage: inboundBody.trim().slice(0, 80),
            updatedAt: now,
          },
        });

      await db
        .update(crmContacts)
        .set({
          smsReachableStatus: "opted_out",
          transactionalSmsOptOutAt: now,
          updatedAt: now,
        })
        .where(or(eq(crmContacts.normalizedPhone, normalizedPhone), eq(crmContacts.normalizedPhone, tenDigitPhone)));

      return res
        .type("text/xml")
        .send(twilioResponse("You have been opted out of Picture Perfect TV Install text messages. Reply START to resubscribe."));
    } catch (error) {
      console.error("Twilio inbound webhook error:", error);
      return res.status(500).type("text/xml").send(twilioResponse());
    }
  });

  // --- ADMIN ROUTES ---
  app.use("/api/admin", requireAdminToken);

  app.get("/api/admin/bookings", async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (e) { res.status(500).json([]); }
  });

  app.get("/api/admin/customers", async (_req, res) => {
    try {
      const contactRows = await db
        .select()
        .from(crmContacts)
        .orderBy(desc(crmContacts.updatedAt));
      const smsRows = await db
        .select()
        .from(smsMessages)
        .orderBy(desc(smsMessages.createdAt));
      const latestSmsByPhone = new Map<string, typeof smsRows[number]>();
      for (const message of smsRows) {
        if (!latestSmsByPhone.has(message.normalizedPhone)) {
          latestSmsByPhone.set(message.normalizedPhone, message);
        }
      }

      res.json({
        customers: contactRows.map((contact) => {
          const latestSms = contact.normalizedPhone ? latestSmsByPhone.get(contact.normalizedPhone) : null;
          return {
            id: contact.id,
            name: contact.fullName,
            phone: contact.phone,
            email: contact.email,
            birthday: contact.birthday,
            cityArea: contact.cityArea,
            emailMarketingOptIn: contact.emailMarketingOptIn === true,
            transactionalSmsOptIn: contact.transactionalSmsOptIn === true,
            smsMarketingOptIn: contact.smsMarketingOptIn === true,
            smsReachableStatus: contact.smsReachableStatus || "unknown",
            transactionalSmsOptOutAt: contact.transactionalSmsOptOutAt?.toISOString(),
            birthdayPromoOptIn: contact.birthdayPromoOptIn === true,
            marketingConsentAt: contact.marketingConsentAt?.toISOString(),
            marketingConsentSource: contact.marketingConsentSource,
            latestSmsStatus: latestSms?.status,
            latestSmsMessageType: latestSms?.messageType,
            latestSmsAt: latestSms?.sentAt?.toISOString() || latestSms?.createdAt?.toISOString(),
            latestBookingDate: contact.latestBookingDate?.toISOString(),
            latestBookingService: contact.latestServiceSummary,
            lastBookingId: contact.lastBookingId,
            createdAt: contact.createdAt?.toISOString(),
            updatedAt: contact.updatedAt?.toISOString(),
          };
        }),
      });
    } catch (error) {
      console.error("Admin customers route error:", error);
      res.status(500).json({ customers: [] });
    }
  });

  app.post("/api/admin/bookings/:id/reschedule", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const preferredDate = String(req.body?.preferredDate ?? req.body?.date ?? "").trim();
      const appointmentTime = String(req.body?.appointmentTime ?? req.body?.time ?? "").trim();

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid booking ID." });
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate)) {
        return res.status(400).json({ message: "Please choose a valid appointment date." });
      }

      const requestedDate = new Date(`${preferredDate}T12:00:00`);
      if (Number.isNaN(requestedDate.getTime())) {
        return res.status(400).json({ message: "Please choose a valid appointment date." });
      }

      const today = new Date();
      const requestedDay = new Date(requestedDate);
      today.setHours(0, 0, 0, 0);
      requestedDay.setHours(0, 0, 0, 0);

      if (requestedDay < today) {
        return res.status(400).json({ message: "Appointments cannot be moved to a past date." });
      }

      if (!getSlots(requestedDate).includes(appointmentTime)) {
        return res.status(400).json({ message: "That time is outside the current booking hours." });
      }

      if (
        requestedDay.getTime() === today.getTime() &&
        parseSlotTime(requestedDate, appointmentTime).getTime() <= Date.now()
      ) {
        return res.status(400).json({ message: "Appointments cannot be moved to a time that has already passed." });
      }

      const updated = await storage.rescheduleBookingIfAvailable(id, preferredDate, appointmentTime);
      if (!updated) {
        return res.status(409).json({ message: "That time is already booked. Choose another slot." });
      }

      sendRescheduleEmail(updated).catch((error) => console.error("Reschedule email error:", error));
      return res.json(updated);
    } catch (error) {
      console.error("Admin reschedule error:", error);
      return res.status(500).json({ message: "Could not reschedule this appointment right now." });
    }
  });

  app.post("/api/admin/bookings/:id/cancel", async (req, res) => {
    const id = parseInt(req.params.id);
    const updated = await storage.updateBooking(id, {
      status: "cancelled",
      cancellationReason: req.body?.reason,
    });
    sendCancellationEmail(updated).catch(e => console.error(e));
    res.json(updated);
  });

  app.get("/api/health", async (_req, res) => {
    try {
      const health = await monitoring.getSystemHealth();
      const statusCode = health.status === "unhealthy" ? 503 : 200;
      res.status(statusCode).json(health);
    } catch (error) {
      console.error("Health route error:", error);
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        message: "Health check failed",
      });
    }
  });

  app.get("/api/ready", async (_req, res) => {
    try {
      const health = await monitoring.getSystemHealth();
      if (!health.database) {
        return res.status(503).json({
          status: "not_ready",
          timestamp: health.timestamp,
          database: health.database,
        });
      }

      res.json({
        status: "ready",
        timestamp: health.timestamp,
        database: health.database,
      });
    } catch (error) {
      console.error("Readiness route error:", error);
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
