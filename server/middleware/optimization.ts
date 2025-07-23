// Server-side optimization middleware
import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/loggingService';

// Request deduplication middleware to prevent duplicate requests
const activeRequests = new Map<string, Promise<any>>();

export function requestDeduplication() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only deduplicate GET requests
    if (req.method !== 'GET') {
      return next();
    }

    const key = `${req.method}:${req.url}`;
    
    if (activeRequests.has(key)) {
      // Wait for the existing request to complete
      activeRequests.get(key)?.then(() => {
        next();
      }).catch(() => {
        next();
      });
      return;
    }

    // Create a promise for this request
    let resolveRequest: () => void;
    const requestPromise = new Promise<void>((resolve) => {
      resolveRequest = resolve;
    });

    activeRequests.set(key, requestPromise);

    // Clean up when response finishes
    res.on('finish', () => {
      activeRequests.delete(key);
      resolveRequest();
    });

    next();
  };
}

// Memory usage monitoring middleware
export function memoryMonitoring() {
  return (req: Request, res: Response, next: NextFunction) => {
    const memUsage = process.memoryUsage();
    
    // Log memory warnings
    if (memUsage.heapUsed > 100 * 1024 * 1024) { // 100MB
      logger.warn('High memory usage detected', {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
        path: req.path
      });
    }

    // Add memory info to response headers in development
    if (process.env.NODE_ENV === 'development') {
      res.setHeader('X-Memory-Usage', Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB');
    }

    next();
  };
}

// Response optimization middleware
export function responseOptimization() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Add performance headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Enable HTTP/2 Server Push hints for critical resources
    if (req.path === '/') {
      res.setHeader('Link', [
        '</assets/main.css>; rel=preload; as=style',
        '</assets/main.js>; rel=preload; as=script'
      ].join(', '));
    }

    // Set security headers
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    next();
  };
}

// Database query optimization middleware
export function queryOptimization() {
  const queryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests to API endpoints
    if (req.method !== 'GET' || !req.path.startsWith('/api/')) {
      return next();
    }

    const cacheKey = `${req.method}:${req.url}`;
    const cached = queryCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
      res.json(cached.data);
      return;
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = function(data: any) {
      // Cache successful responses
      if (res.statusCode === 200) {
        queryCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: CACHE_TTL
        });

        // Limit cache size
        if (queryCache.size > 100) {
          const oldestKey = queryCache.keys().next().value;
          queryCache.delete(oldestKey);
        }
      }

      return originalJson(data);
    };

    next();
  };
}

// Rate limiting middleware
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiting(maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    let clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      clientData = { count: 0, resetTime: now + windowMs };
      requestCounts.set(clientId, clientData);
    }

    clientData.count++;

    if (clientData.count > maxRequests) {
      res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
      });
      return;
    }

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - clientData.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(clientData.resetTime / 1000));

    next();
  };
}

// Cleanup expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  
  // Clean up request counts
  for (const [key, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes

export default {
  requestDeduplication,
  memoryMonitoring,
  responseOptimization,
  queryOptimization,
  rateLimiting
};