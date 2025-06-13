import { Response } from 'express';
import compression from 'compression';
import { performance } from 'perf_hooks';

// Response caching middleware
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

export function createCacheKey(req: any): string {
  return `${req.method}:${req.path}:${JSON.stringify(req.query)}`;
}

export function getCachedResponse(key: string) {
  const cached = responseCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    responseCache.delete(key);
    return null;
  }
  
  return cached.data;
}

export function setCachedResponse(key: string, data: any, ttl: number = 30000) {
  responseCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

export function clearCache(pattern?: string) {
  if (!pattern) {
    responseCache.clear();
    return;
  }
  
  for (const key of responseCache.keys()) {
    if (key.includes(pattern)) {
      responseCache.delete(key);
    }
  }
}

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  
  startTimer(): number {
    return performance.now();
  }
  
  endTimer(startTime: number, operation: string) {
    const duration = performance.now() - startTime;
    
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const durations = this.metrics.get(operation)!;
    durations.push(duration);
    
    // Keep only last 100 measurements
    if (durations.length > 100) {
      durations.shift();
    }
  }
  
  getMetrics(operation: string) {
    const durations = this.metrics.get(operation);
    if (!durations || durations.length === 0) {
      return { avg: 0, min: 0, max: 0, count: 0 };
    }
    
    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: durations.length
    };
  }
  
  getAllMetrics() {
    const result: Record<string, any> = {};
    for (const [operation, durations] of this.metrics.entries()) {
      result[operation] = this.getMetrics(operation);
    }
    return result;
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Optimized JSON response helper
export function sendOptimizedResponse(
  res: Response, 
  data: any, 
  options: { 
    cache?: boolean; 
    cacheKey?: string; 
    cacheTtl?: number;
    compress?: boolean;
  } = {}
) {
  const { cache = false, cacheKey, cacheTtl = 30000, compress = true } = options;
  
  // Set performance headers
  res.setHeader('X-Response-Time', Date.now().toString());
  
  // Enable compression for large responses
  if (compress && JSON.stringify(data).length > 1000) {
    res.setHeader('Content-Encoding', 'gzip');
  }
  
  // Cache response if requested
  if (cache && cacheKey) {
    setCachedResponse(cacheKey, data, cacheTtl);
  }
  
  // Set cache headers for client-side caching
  if (cache) {
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(cacheTtl / 1000)}`);
    res.setHeader('ETag', `"${Date.now()}"`);
  }
  
  res.json(data);
}

// Database query optimizer
export function optimizeQuery<T>(
  queryFn: () => Promise<T>,
  cacheKey?: string,
  cacheTtl?: number
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const startTime = performanceMonitor.startTimer();
    
    try {
      // Check cache first
      if (cacheKey) {
        const cached = getCachedResponse(cacheKey);
        if (cached) {
          performanceMonitor.endTimer(startTime, `${cacheKey}-cached`);
          resolve(cached);
          return;
        }
      }
      
      // Execute query
      const result = await queryFn();
      
      // Cache result if requested
      if (cacheKey && cacheTtl) {
        setCachedResponse(cacheKey, result, cacheTtl);
      }
      
      performanceMonitor.endTimer(startTime, cacheKey || 'query');
      resolve(result);
    } catch (error) {
      performanceMonitor.endTimer(startTime, `${cacheKey || 'query'}-error`);
      reject(error);
    }
  });
}

// Memory usage monitoring
export function getMemoryUsage() {
  const usage = process.memoryUsage();
  return {
    rss: Math.round(usage.rss / 1024 / 1024), // MB
    heapTotal: Math.round(usage.heapTotal / 1024 / 1024), // MB
    heapUsed: Math.round(usage.heapUsed / 1024 / 1024), // MB
    external: Math.round(usage.external / 1024 / 1024), // MB
    percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
  };
}

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, cached] of responseCache.entries()) {
    if (now - cached.timestamp > cached.ttl) {
      responseCache.delete(key);
    }
  }
}, 60000); // Clean every minute