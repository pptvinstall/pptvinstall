import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import compression from 'compression';
import { createServer } from 'http';

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
// Optimize JSON parsing for memory efficiency (2MB limit)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

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

// Debug signal information
const signalDebug = (signal: string) => {
  console.error(`[DEBUG] Received signal ${signal}`);
  console.error(`[DEBUG] Process info: PID=${process.pid}, uptime=${process.uptime()}s`);
  console.error(`[DEBUG] Memory usage:`, process.memoryUsage());
  
  // Capture stack trace to see what was happening when signal was received
  console.error(`[DEBUG] Stack trace at signal:`, new Error().stack);
};

// Setup graceful shutdown handlers
const gracefulShutdown = (signal: string) => {
  // Log signal type for debugging
  signalDebug(signal);
  
  // Prevent multiple shutdown attempts
  if (isShuttingDown) {
    log(`Shutdown already in progress (triggered by ${signal}), ignoring additional signal`);
    return;
  }
  
  isShuttingDown = true;
  log(`Shutting down gracefully... (triggered by ${signal})`);

  // In Replit environment, sometimes it's better not to exit explicitly, 
  // as Replit's process management will handle the restart
  if (process.env.REPLIT_ENVIRONMENT === 'true') {
    log('Running in Replit environment, letting container handle restarts');
  }

  // Only shut down if server exists
  if (serverInstance) {
    try {
      // Set a handler for server close to track completion
      serverInstance.close((err?: Error) => {
        if (err) {
          console.error('Error during server close:', err);
        } else {
          log('Server closed successfully. Process terminating...');
        }
        
        // Only exit if not running in Replit environment
        if (process.env.REPLIT_ENVIRONMENT !== 'true') {
          // Give time for logs to flush before exiting
          setTimeout(() => {
            process.exit(0);
          }, 1000);
        }
      });

      // Force shutdown after timeout, but only if needed
      if (process.env.REPLIT_ENVIRONMENT !== 'true') {
        setTimeout(() => {
          log('Forcing server shutdown after timeout');
          process.exit(1);
        }, 10000); // Reduced timeout to 10 seconds for faster recovery
      }
    } catch (error) {
      console.error('Error during server shutdown:', error);
      if (process.env.REPLIT_ENVIRONMENT !== 'true') {
        process.exit(1);
      }
    }
  } else {
    log('Server not initialized, logging only without exit');
    // In Replit, we'll just let the container handle the restart
    if (process.env.REPLIT_ENVIRONMENT !== 'true') {
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    }
  }
};

// Main application startup
(async () => {
  try {
    await registerRoutes(app);
    const server = createServer(app);
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

    // Use environment PORT variable or default to 5000
    // this serves both the API and the client
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

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
    
    // Add a keep-alive ping to prevent Replit from closing the server due to inactivity
    // This is especially important for development environments
    const keepAliveInterval = setInterval(() => {
      if (isShuttingDown) {
        clearInterval(keepAliveInterval);
        return;
      }
      
      // Make a self-request to keep the server alive
      try {
        fetch(`http://localhost:${port}/api/health`)
          .then(() => {
            if (process.env.NODE_ENV === 'development') {
              log('Keep-alive ping successful');
            }
          })
          .catch(err => {
            if (process.env.NODE_ENV === 'development') {
              console.error('Keep-alive ping failed:', err.message);
            }
          });
      } catch (error) {
        // Ignore fetch errors during shutdown
      }
    }, 240000); // Every 4 minutes

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
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  }
  // For other errors, just log them without shutting down
});

// Set environment detection
process.env.REPLIT_ENVIRONMENT = process.env.REPL_ID || process.env.REPL_SLUG ? 'true' : 'false';
console.log(`Detected environment: ${process.env.REPLIT_ENVIRONMENT === 'true' ? 'Replit' : 'Standard'}`);

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Log but don't crash for unhandled rejections
});

// Force the process to stay alive even when there are errors
process.on('exit', (code) => {
  console.log(`Process exiting with code: ${code}`);
});

// Keep track of signal handlers to avoid memory leaks
const signalHandlers = new Map();

// Setup signal handlers with maximum listeners to avoid Node warnings
process.setMaxListeners(20); // Increase max listeners

// Helper function to safely add signal handlers
const addSignalHandler = (signal: string) => {
  // Remove existing handler if any
  if (signalHandlers.has(signal)) {
    process.removeListener(signal, signalHandlers.get(signal));
  }
  
  // Create handler that passes signal name
  const handler = () => {
    gracefulShutdown(signal);
  };
  
  // Store and add the handler
  signalHandlers.set(signal, handler);
  process.on(signal, handler);
};

// Add handlers for different signals
addSignalHandler('SIGTERM');
addSignalHandler('SIGINT');
addSignalHandler('SIGHUP');
addSignalHandler('SIGUSR2'); // Used by nodemon and some other tools