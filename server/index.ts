import express from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import compression from "compression";
import helmet from "helmet";

const app = express();

// Security headers with proper configuration for development
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP in development
  crossOriginEmbedderPolicy: false // Disable COEP in development
}));

// Enable compression for all responses
app.use(compression({
  level: 6,
  threshold: 1024,
}));

// Trust proxy to properly handle client IP addresses behind Replit proxy
app.set('trust proxy', 1);

// Basic middleware with limits for security
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// CORS configuration - allow all in development
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});


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