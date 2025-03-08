import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import compression from 'compression';

const app = express();
// Optimize compression for better performance
app.use(compression({ 
  level: 6, // Higher compression for better file size reduction
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

// Add caching for static assets
app.use((req, res, next) => {
  // Only apply to static assets
  if (req.url.match(/\.(css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
  }
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

// Track server instance for graceful shutdown
let serverInstance: any = null;
let isShuttingDown = false;

// Setup graceful shutdown handlers
const gracefulShutdown = () => {
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    log('Shutdown already in progress, ignoring additional signal');
    return;
  }
  
  isShuttingDown = true;
  log('Shutting down gracefully...');

  // Only shut down if server exists
  if (serverInstance) {
    try {
      serverInstance.close(() => {
        log('Server closed. Process terminating...');
        // Give time for logs to flush before exiting
        setTimeout(() => {
          process.exit(0);
        }, 500);
      });

      // Force shutdown after timeout
      setTimeout(() => {
        log('Forcing server shutdown after timeout');
        process.exit(1);
      }, 30000); // 30 second timeout - increased to allow for connections to close
    } catch (error) {
      console.error('Error during server shutdown:', error);
      process.exit(1);
    }
  } else {
    log('Server not initialized, exiting after delay');
    // Small delay to allow for logs to flush
    setTimeout(() => {
      process.exit(0);
    }, 500);
  }
};

// Main application startup
(async () => {
  try {
    const server = await registerRoutes(app);
    serverInstance = server;

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      // Log the error details for debugging
      console.error("Error handling middleware caught error:", err);
      if (err instanceof Error) {
        console.error("Error details:", err.message);
        console.error("Stack trace:", err.stack);
      }

      // Don't throw the error after handling it, as this causes unhandled promise rejections
      // Instead, just return the error response to the client
      return res.status(status).json({ 
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { details: err.stack })
      });
    });

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

    // Check if the port is already in use before trying to listen
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Error: Port ${port} is already in use. This could be due to another running instance of the app.`);
        console.error('Attempting to close the process...');
        process.exit(1);
      } else {
        console.error('Server error:', error);
      }
    });

    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server started successfully, serving on port ${port}`);
    });

    // Handle server-level errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Error: Port ${port} is already in use. This could be due to another running instance of the app.`);
        console.error('Attempting to close the process...');

        // Wait and try to reload in case of port conflicts
        setTimeout(() => {
          process.exit(1); // Force exit to allow Replit to restart the app
        }, 1000);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();

// Log uncaught exceptions but don't shut down unless truly necessary
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Only shutdown for severe errors that would prevent the server from functioning
  if (error.message && (
    error.message.includes('EADDRINUSE') || 
    error.message.includes('EACCES') || 
    error.message.includes('cannot bind to port')
  )) {
    gracefulShutdown();
  }
  // For other errors, just log them without shutting down
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Continuing in case the promise rejection is not critical
});

// Force the process to stay alive even when there are errors
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGHUP', gracefulShutdown);