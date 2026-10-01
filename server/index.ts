import "./env";
import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import rateLimit from "express-rate-limit";
import { checkDatabaseConnection } from "./db";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { alertOnError } from "./services/errorAlertService";
import { startScheduler } from "./services/schedulerService";

const app = express();

// Render terminates HTTPS and forwards traffic through a single proxy hop.
// Trust exactly that hop so req.ip and express-rate-limit see the real client IP.
app.set("trust proxy", 1);

app.use(compression());
app.use(express.json({ limit: "256kb" }));
app.use(express.urlencoded({ extended: false, limit: "256kb" }));

// Lightweight liveness endpoint for the hosting platform.
// This intentionally does not depend on the database; /api/ready covers readiness.
app.get("/healthz", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    status: "ok",
    uptimeSeconds: Math.round(process.uptime()),
  });
});

// General API limiter: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: "Too many requests. Please slow down and try again shortly." });
  },
});

// Strict booking limiter: 5 attempts per hour per IP
const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ message: "Too many booking attempts from this device. Please wait before trying again." });
  },
});

// Apply general limiter to all /api routes
app.use("/api/", apiLimiter);

// Apply strict limiter specifically to POST /api/bookings (registered before routes)
app.post("/api/bookings", bookingLimiter);

// Middleware for request logging.
// Never serialize response bodies here: booking/admin responses can contain customer data.
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    if (!path.startsWith("/api")) return;

    const duration = Date.now() - start;
    log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Global Error Handler
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
      return next(err);
    }

    const status = Number(err?.status || err?.statusCode || 500);
    const internalMessage = err?.message || "Internal Server Error";
    const clientMessage = status >= 500 ? "Internal Server Error" : internalMessage;

    // Alert on 5xx errors only — 4xx are expected client errors.
    if (status >= 500) {
      alertOnError(
        err instanceof Error ? err : new Error(internalMessage),
        `HTTP ${status}`,
      );
    }

    // A handled HTTP error should end with the response, not be thrown again.
    return res.status(status).json({ message: clientMessage });
  });

  // Setup Vite or Static serving
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  if (app.get("env") === "production") {
    try {
      await checkDatabaseConnection(20000);
      log("database preflight passed");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "object" && error !== null
            ? JSON.stringify(error)
            : String(error);
      log(`database preflight failed; continuing startup: ${message}`);
    }
  }

  // Start Server (PORT env var for Render/hosting, fallback to 5000 locally)
  const PORT = Number(process.env.PORT) || 5000;
  server.listen(PORT, "0.0.0.0", () => {
    log(`serving on port ${PORT}`);
    startScheduler();
  });
})();
