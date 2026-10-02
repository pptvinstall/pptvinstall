import type { Express, Request, Response } from "express";
import { ZodError, z } from "zod";
import { ConfigValidationError, InternalDataLeakError, QuotePolicyError } from "@shared/pricing";
import { IntakeValidationError, InvoicePolicyError, JOB_STATUSES } from "@shared/jobos";
import { getOutbox, describeOutboundState } from "../outbound";
import { createRateLimiter } from "./rateLimit";
import { ConflictError, JobOsService } from "./service";
import { NotFoundError } from "./store";

// Job OS HTTP API.
//  - /api/admin/job-os/*  : owner only. The caller (routes.ts) mounts this AFTER the global
//    `app.use("/api/admin", requireAdminToken)` so every handler here is admin-protected.
//  - /api/quotes/:token   : public, token-addressed, returns CUSTOMER-SAFE data only.

const uuid = z.string().uuid();

export function sendError(res: Response, err: unknown) {
  if (err instanceof ZodError) return res.status(400).json({ message: "Invalid request", issues: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })) });
  if (err instanceof NotFoundError) return res.status(404).json({ message: err.message });
  if (err instanceof ConflictError) return res.status(409).json({ message: err.message, code: err.code });
  if (err instanceof InvoicePolicyError) return res.status(409).json({ message: err.message, code: err.code });
  if (err instanceof QuotePolicyError) return res.status(422).json({ message: err.message, code: err.code });
  if (err instanceof ConfigValidationError) return res.status(422).json({ message: "Invalid pricing configuration", issues: err.issues });
  if (err instanceof IntakeValidationError) return res.status(422).json({ message: err.message, issues: err.issues });
  if (err instanceof InternalDataLeakError) {
    console.error("[jobos] blocked internal data leak:", err.leakedKeys.join(","));
    return res.status(500).json({ message: "Quote unavailable" });
  }
  console.error("[jobos] unexpected error:", err);
  return res.status(500).json({ message: "Something went wrong. Please try again." });
}

export function jobOsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = (env.JOB_OS_ENABLED || "").trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  // Default: on everywhere except production, where it must be switched on explicitly.
  return env.NODE_ENV !== "production" && (env.APP_ENV || "").toLowerCase() !== "production";
}

export interface JobOsRouteDeps {
  service: JobOsService;
  getClientIp: (req: Request) => string;
  lookupBooking?: (id: number) => Promise<{ id: number; name?: string; zipCode?: string; serviceType?: string } | undefined>;
  aiEnabled: () => boolean;
}

export function registerJobOsRoutes(app: Express, deps: JobOsRouteDeps) {
  const { service } = deps;
  const publicLimiter = createRateLimiter({ max: 60, windowMs: 60_000 });
  const acceptLimiter = createRateLimiter({ max: 10, windowMs: 60_000 });
  const intakeLimiter = createRateLimiter({ max: 30, windowMs: 60 * 60_000 });
  const priceLimiter = createRateLimiter({ max: 90, windowMs: 60_000 });
  const actor = "owner";

  if (!jobOsEnabled()) {
    // Public /quote falls back to the browser's catalog calculator when these return 404.
    app.use(["/api/admin/job-os", "/api/quotes", "/api/quote/price", "/api/quote/price-source"], (_req, res) => res.status(404).json({ message: "Not found" }));
    return;
  }

  const A = "/api/admin/job-os";
  const wrap = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
    try {
      await fn(req, res);
    } catch (err) {
      sendError(res, err);
    }
  };
  const idParam = (req: Request, name = "id") => uuid.parse(req.params[name]);

  // ---- config (versioned + audited)
  app.get(`${A}/config`, wrap(async (_req, res) => res.json(await service.getActiveConfig())));
  app.get(`${A}/config/versions`, wrap(async (_req, res) => res.json(await service.listVersionsForAdmin())));
  app.get(`${A}/config/events`, wrap(async (_req, res) => res.json(await service.listConfigEventsForAdmin())));
  app.put(`${A}/config`, wrap(async (req, res) => res.json(await service.updateConfig(req.body, actor))));
  app.post(`${A}/config/rollback`, wrap(async (req, res) => {
    const { version, confirmDynamic } = z.object({ version: z.number().int().min(1), confirmDynamic: z.string().max(60).optional() }).parse(req.body);
    res.json(await service.rollbackConfig(version, actor, confirmDynamic));
  }));

  // ---- stateless pricing preview (owner)
  app.post(`${A}/price`, wrap(async (req, res) => {
    const { scope, context } = z.object({ scope: z.unknown(), context: z.unknown().optional() }).parse(req.body);
    res.json(await service.previewPrice(scope, context ?? {}));
  }));

  // ---- jobs
  app.get(`${A}/jobs`, wrap(async (req, res) => {
    const status = typeof req.query.status === "string" ? z.enum(JOB_STATUSES).parse(req.query.status) : undefined;
    res.json(await service.listJobs({ status, limit: 100 }));
  }));
  app.post(`${A}/jobs`, wrap(async (req, res) => res.status(201).json(await service.createJob(req.body))));
  app.post(`${A}/jobs/from-booking/:bookingId`, wrap(async (req, res) => {
    const bookingId = z.coerce.number().int().positive().parse(req.params.bookingId);
    const booking = deps.lookupBooking ? await deps.lookupBooking(bookingId) : undefined;
    if (!booking) throw new NotFoundError("Booking");
    // Reuse the existing booking as the customer record: store the link, not a copy of the customer's details.
    const job = await service.createJob({ title: `Booking #${booking.id}`, bookingId: booking.id, zip: booking.zipCode && /^\d{5}$/.test(booking.zipCode) ? booking.zipCode : null, source: "booking" });
    res.status(201).json(job);
  }));
  app.get(`${A}/jobs/:id`, wrap(async (req, res) => res.json(await service.jobDetail(idParam(req)))));
  app.patch(`${A}/jobs/:id/scope`, wrap(async (req, res) => {
    const { scope, context } = z.object({ scope: z.unknown(), context: z.unknown().optional() }).parse(req.body);
    res.json(await service.updateScope(idParam(req), scope, context));
  }));

  // ---- quotes
  app.post(`${A}/jobs/:id/quote`, wrap(async (req, res) => res.status(201).json(await service.createQuoteVersion(idParam(req), req.body))));
  app.post(`${A}/quotes/:id/send`, wrap(async (req, res) => {
    const quote = await service.markQuoteSent(idParam(req));
    res.json({ quote, customerPath: `/q/${quote.shareToken}` });
  }));

  // ---- actuals & profitability
  app.post(`${A}/jobs/:id/actuals`, wrap(async (req, res) => res.status(201).json(await service.recordActuals(idParam(req), req.body))));
  app.get(`${A}/jobs/:id/profitability`, wrap(async (req, res) => res.json(await service.getProfitability(idParam(req)))));

  // ---- invoices & payments
  app.post(`${A}/jobs/:id/invoice`, wrap(async (req, res) => res.status(201).json(await service.createInvoice(idParam(req), req.body))));
  app.post(`${A}/invoices/:id/send`, wrap(async (req, res) => res.json(await service.sendInvoice(idParam(req)))));
  app.post(`${A}/invoices/:id/void`, wrap(async (req, res) => res.json(await service.voidInvoice(idParam(req)))));
  app.post(`${A}/invoices/:id/payments`, wrap(async (req, res) => res.status(201).json(await service.recordPayment(idParam(req), req.body))));

  // ---- work templates and taxonomy (owner config; new item types need no code or migration)
  app.put(`${A}/work-templates/:id`, wrap(async (req, res) => {
    const body = z.object({ template: z.unknown(), reason: z.string().max(200).optional() }).parse(req.body);
    res.json(await service.upsertWorkTemplate(String(req.params.id), body.template, actor, body.reason));
  }));
  app.delete(`${A}/work-templates/:id`, wrap(async (req, res) => res.json(await service.deleteWorkTemplate(String(req.params.id), actor))));
  app.put(`${A}/work-categories/:id`, wrap(async (req, res) => {
    const body = z.object({ category: z.unknown() }).parse(req.body);
    res.json(await service.upsertWorkCategory(String(req.params.id), body.category, actor));
  }));

  // ---- pricing intelligence (advisory only)
  app.get(`${A}/intelligence`, wrap(async (req, res) => {
    const comparableTo = typeof req.query.comparableTo === "string" ? uuid.parse(req.query.comparableTo) : undefined;
    res.json(await service.intelligence({ includeSynthetic: req.query.includeSynthetic === "true", comparableTo }));
  }));

  // ---- AI scope intake (optional; manual UI never needs it)
  app.get(`${A}/intake/status`, wrap(async (_req, res) => res.json({ aiEnabled: deps.aiEnabled(), photoIntake: "not_configured", ...describeOutboundState() })));
  app.post(`${A}/intake/parse`, wrap(async (req, res) => {
    const body = z.object({ message: z.string().min(5).max(4_000), useAi: z.boolean().default(false) }).parse(req.body);
    const ip = deps.getClientIp(req);
    if (body.useAi) {
      const limit = intakeLimiter.check(ip);
      if (!limit.allowed) return res.status(429).json({ message: "AI intake limit reached. Try again later or use manual entry.", retryAfterSeconds: limit.retryAfterSeconds });
    }
    res.json(await service.parseIntake(body.message, { allowAi: body.useAi && deps.aiEnabled() }));
  }));
  app.post(`${A}/intake/photos`, (_req, res) =>
    res.status(501).json({ status: "not_configured", message: "Photo intake is not configured: no vision provider is wired. Photo suggestions would always require on-site verification.", contract: "shared/jobos/intake.ts#photoIntakeResultSchema" }),
  );

  // ---- staging inspection: what outbound traffic was suppressed
  app.get(`${A}/outbox`, wrap(async (_req, res) => res.json({ ...describeOutboundState(), entries: getOutbox() })));

  // ---- shadow pricing (owner only)
  app.get(`${A}/shadow-samples`, wrap(async (req, res) => {
    const limit = typeof req.query.limit === "string" ? z.coerce.number().int().min(1).max(500).parse(req.query.limit) : 100;
    res.json(await service.shadowReport(limit));
  }));
  app.post(`${A}/shadow-samples/:id/job`, wrap(async (req, res) => res.status(201).json(await service.createJobFromShadowSample(idParam(req)))));

  // ---- public /quote tool pricing (customer-safe only; the browser falls back to its catalog calculator on any error)
  app.get("/api/quote/price-source", wrap(async (_req, res) => {
    res.set("Cache-Control", "no-store").json(await service.publicPriceSource());
  }));
  app.post("/api/quote/price", wrap(async (req, res) => {
    const limit = priceLimiter.check(deps.getClientIp(req));
    if (!limit.allowed) return res.status(429).set("Retry-After", String(limit.retryAfterSeconds)).json({ message: "Too many requests" });
    res.set("Cache-Control", "no-store").json(await service.publicPrice(req.body));
  }));

  // ---- public customer quote (token addressed, customer-safe only)
  app.get("/api/quotes/:token", wrap(async (req, res) => {
    const limit = publicLimiter.check(deps.getClientIp(req));
    if (!limit.allowed) return res.status(429).set("Retry-After", String(limit.retryAfterSeconds)).json({ message: "Too many requests" });
    const token = uuid.safeParse(req.params.token);
    if (!token.success) throw new NotFoundError("Quote");
    res.set("Cache-Control", "no-store").json(await service.getCustomerQuote(token.data));
  }));
  app.post("/api/quotes/:token/accept", wrap(async (req, res) => {
    const limit = acceptLimiter.check(deps.getClientIp(req));
    if (!limit.allowed) return res.status(429).set("Retry-After", String(limit.retryAfterSeconds)).json({ message: "Too many requests" });
    const token = uuid.safeParse(req.params.token);
    if (!token.success) throw new NotFoundError("Quote");
    res.set("Cache-Control", "no-store").json(await service.acceptCustomerQuote(token.data));
  }));
}
