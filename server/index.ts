import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import compression from "compression";
import helmet from "helmet";

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false,
  crossOriginEmbedderPolicy: process.env.NODE_ENV === "production",
}));

// Enable compression for all responses
app.use(compression({
  level: 6, // Balance between compression and CPU usage
  threshold: 1024, // Only compress responses larger than 1KB
}));

// Trust proxy to properly handle client IP addresses behind Replit proxy
app.set('trust proxy', 1);

// Basic middleware with limits for security
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// CORS configuration
app.use((req, res, next) => {
  // In production, be more restrictive with CORS
  const origin = process.env.NODE_ENV === "production" 
    ? process.env.ALLOWED_ORIGIN || 'https://pictureperfecttvinstall.com' 
    : '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  next();
});

// Add request logging in development
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
    });
    next();
  });
}

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message || 'Something went wrong';

  res.status(statusCode).json({ 
    error: message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
  });
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:');
  console.error(error);

  // Log the error but don't exit in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:');
  console.error(reason);
});

(async () => {
  try {
    const server = await registerRoutes(app);

    // Use environment variable to determine mode, with development as fallback
    if (process.env.NODE_ENV !== "production") {
      log('Starting in development mode...');
      await setupVite(app, server);
    } else {
      log('Starting in production mode...');
      serveStatic(app);
    }

    server.listen(5000, "0.0.0.0", () => {
      log(`Server running at http://0.0.0.0:5000`);
      console.log(`[express] environment: ${process.env.NODE_ENV || 'development'}`);

      // Log memory usage
      const memoryUsage = process.memoryUsage();
      log(`Memory usage: ${Math.round(memoryUsage.rss / 1024 / 1024)}MB RSS, ${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB Heap`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        log('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();