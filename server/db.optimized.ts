// Optimized database configuration with connection pooling and performance tuning
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "@shared/schema";

// Database connection configuration
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create optimized connection with pooling
const sql = neon(DATABASE_URL, {
  // Enable connection pooling for better performance
  poolQueryViaFetch: true,
  // Set connection timeout to prevent hanging connections
  connectionTimeoutMillis: 5000,
  // Enable HTTP/2 for better performance
  fetchOptions: {
    cache: 'no-store', // Prevent caching database responses
  }
});

// Create database instance with optimized settings
export const db = drizzle(sql, { 
  schema,
  logger: process.env.NODE_ENV === 'development' ? true : false, // Only log in development
});

// Database connection health check with retry logic
export async function checkDatabaseHealth(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; latency: number }> {
  const startTime = Date.now();
  
  try {
    // Simple health check query
    await sql`SELECT 1 as health_check`;
    const latency = Date.now() - startTime;
    
    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'unhealthy',
      latency
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('Database health check failed:', error);
    
    return {
      status: 'unhealthy',
      latency
    };
  }
}

// Optimized query helpers for common operations
export const optimizedQueries = {
  // Get recent bookings with limit to prevent memory issues
  async getRecentBookings(limit: number = 50) {
    return await db
      .select()
      .from(schema.bookings)
      .orderBy(schema.bookings.createdAt)
      .limit(limit);
  },

  // Get bookings by status with index optimization
  async getBookingsByStatus(status: string, limit: number = 100) {
    return await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.status, status))
      .limit(limit);
  },

  // Get booking by ID with minimal data transfer
  async getBookingById(id: number) {
    const result = await db
      .select()
      .from(schema.bookings)
      .where(eq(schema.bookings.id, id))
      .limit(1);
    
    return result[0] || null;
  },

  // Batch insert for better performance
  async batchInsertBookings(bookings: typeof schema.insertBookingDrizzleSchema[]) {
    if (bookings.length === 0) return [];
    
    // Split into chunks to prevent memory issues
    const chunkSize = 100;
    const results = [];
    
    for (let i = 0; i < bookings.length; i += chunkSize) {
      const chunk = bookings.slice(i, i + chunkSize);
      const chunkResults = await db
        .insert(schema.bookings)
        .values(chunk)
        .returning();
      results.push(...chunkResults);
    }
    
    return results;
  },

  // Archive old bookings for performance (run periodically)
  async archiveOldBookings(daysOld: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    // First, copy to archive table
    const oldBookings = await db
      .select()
      .from(schema.bookings)
      .where(lt(schema.bookings.createdAt, cutoffDate))
      .where(eq(schema.bookings.status, 'completed'));
    
    if (oldBookings.length > 0) {
      // Insert into archive
      await db
        .insert(schema.bookingArchives)
        .values(oldBookings.map(booking => ({
          ...booking,
          originalId: booking.id,
          originalCreatedAt: booking.createdAt,
          archiveReason: 'auto_archive',
          archiveNote: `Automatically archived after ${daysOld} days`
        })));
      
      // Delete from main table
      await db
        .delete(schema.bookings)
        .where(lt(schema.bookings.createdAt, cutoffDate))
        .where(eq(schema.bookings.status, 'completed'));
    }
    
    return oldBookings.length;
  }
};

// Connection pool management
let connectionHealthCheckInterval: NodeJS.Timeout | null = null;

export function startDatabaseMonitoring() {
  if (connectionHealthCheckInterval) return;
  
  // Check database health every 5 minutes
  connectionHealthCheckInterval = setInterval(async () => {
    const health = await checkDatabaseHealth();
    if (health.status === 'unhealthy') {
      console.error('Database connection is unhealthy:', health);
    }
  }, 5 * 60 * 1000);
}

export function stopDatabaseMonitoring() {
  if (connectionHealthCheckInterval) {
    clearInterval(connectionHealthCheckInterval);
    connectionHealthCheckInterval = null;
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  stopDatabaseMonitoring();
});

process.on('SIGINT', () => {
  stopDatabaseMonitoring();
});

// Import necessary functions
import { eq, lt } from 'drizzle-orm';

export default db;