import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import compression from 'compression';
import rateLimit from 'express-rate-limit';

const app = express();

// Basic security headers for all responses
app.use((req, res, next) => {
  // Allow Replit domains
  const origin = req.headers.origin;
  if (origin && origin.includes('.replit.dev')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Protect against XSS attacks
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking attacks
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Strict transport security for HTTPS
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  next();
});

// Compress all responses for better performance
app.use(compression({ 
  level: 6, // Balance between compression speed and ratio
  threshold: 0, // Compress all responses
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Apply rate limiting to API routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes',
    status: 429
  }
});
app.use('/api/', apiLimiter);

// Special rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 login attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts, please try again after an hour',
    status: 429
  }
});
app.use('/api/admin/login', authLimiter);

// Add enhanced request logging middleware with colorized output
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Add request ID to response headers for tracking
  res.setHeader('X-Request-ID', requestId);
  
  console.log(`[${timestamp}] ${requestId} ${req.method} ${req.url} started`);

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    let statusColor = '';
    
    // Color-code based on status
    if (statusCode < 300) statusColor = '\x1b[32m'; // Green
    else if (statusCode < 400) statusColor = '\x1b[36m'; // Cyan
    else if (statusCode < 500) statusColor = '\x1b[33m'; // Yellow
    else statusColor = '\x1b[31m'; // Red
    
    console.log(
      `[${timestamp}] ${requestId} ${req.method} ${req.url} ${statusColor}${statusCode}\x1b[0m - ${duration}ms`
    );
  });

  next();
});


app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  const timestamp = new Date().toISOString();
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Enhanced error logging with structured data
  const errorLog = {
    timestamp,
    requestId,
    method: req.method,
    url: req.url,
    status,
    message,
    body: req.body ? JSON.stringify(req.body) : undefined,
    stack: err.stack,
    headers: req.headers,
    user_agent: req.headers['user-agent']
  };

  console.error(`[ERROR] ${timestamp} - ${requestId} - ${req.method} ${req.url}`);
  console.error(`Status: ${status}, Message: ${message}`);
  console.error(JSON.stringify(errorLog, null, 2));

  // Send error response to client with helpful information
  res.status(status).json({ 
    message,
    error: process.env.NODE_ENV === 'production' ? 'An error occurred processing your request' : err.message,
    requestId
  });
});

(async () => {
  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    console.log(`[express] environment: ${process.env.NODE_ENV || 'development'}`);
  });
})();