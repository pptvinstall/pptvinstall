import { bookings, type Booking, type InsertBooking, pricingConfig, pricingRules, priceHistory, type PricingConfig, type PricingRule, type InsertPriceHistory } from "@shared/schema";
import { db } from "./db";
import { LRUCache } from 'lru-cache';
import NodeCache from "node-cache";

// Initialize cache with standard TTL of 5 minutes
const cache = new NodeCache({ 
  stdTTL: 300, // 5 minutes
  checkperiod: 60, // Check for expired entries every 60 seconds
  useClones: false // Improves performance with complex objects
});

// Database connection pooling
let dbInstance: any | null = null;
let dbLastUsed: number = Date.now();

// Periodically check and close idle connections
const DB_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
setInterval(() => {
  if (dbInstance && Date.now() - dbLastUsed > DB_IDLE_TIMEOUT) {
    console.log('Closing idle database connection');
    dbInstance.close()
      .then(() => { dbInstance = null; })
      .catch(err => console.error('Error closing database:', err));
  }
}, 10 * 60 * 1000); // Check every 10 minutes

async function getDB() {
  try {
    // Reuse existing connection if available
    if (dbInstance) {
      dbLastUsed = Date.now();
      return dbInstance;
    }

    console.log('Opening new database connection');
    dbInstance = await db;

    // Enable WAL mode for better concurrency
    await dbInstance.exec('PRAGMA journal_mode = WAL;');

    // Set busy timeout to handle contention
    await dbInstance.exec('PRAGMA busy_timeout = 5000;');

    dbLastUsed = Date.now();
    return dbInstance;
  } catch (error) {
    console.error('Database connection error:', error);
    throw new Error('Failed to connect to database');
  }
}

export class Storage {
  async getAllBookings(): Promise<Booking[]> {
    try {
      const cacheKey = 'all_bookings';
      const cachedBookings = cache.get(cacheKey);
      if (cachedBookings) {
        return cachedBookings;
      }
      console.log("Fetching all bookings");
      const db = await getDB();
      const result = await db.select().from(bookings);
      cache.set(cacheKey, result, 120);
      console.log(`Retrieved ${result.length} bookings`);
      return result;
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      throw error;
    }
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    try {
      const cacheKey = `bookings_date_${date}`;
      const cachedBookings = cache.get(cacheKey);
      if (cachedBookings) {
        return cachedBookings;
      }
      console.log(`Fetching bookings for date: ${date}`);
      const db = await getDB();
      const result = await db.select().from(bookings).where(
        eq(bookings.preferredDate, date)
      );
      cache.set(cacheKey, result, 300);
      console.log(`Retrieved ${result.length} bookings for date ${date}`);
      return result;
    } catch (error) {
      console.error("Error fetching bookings by date:", error);
      throw error;
    }
  }

  async getBooking(id: number): Promise<Booking | null> {
    try {
      const cacheKey = `booking_${id}`;
      const cachedBooking = cache.get(cacheKey);
      if (cachedBooking) {
        return cachedBooking;
      }
      console.log(`Fetching booking with ID: ${id}`);
      const db = await getDB();
      const [result] = await db.select().from(bookings).where(
        eq(bookings.id, id)
      );
      if (result) cache.set(cacheKey, result, 300);
      return result || null;
    } catch (error) {
      console.error("Error fetching booking:", error);
      throw error;
    }
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    try {
      console.log("Creating new booking with data:", JSON.stringify(data, null, 2));

      // Ensure totalPrice is properly formatted
      if (data.totalPrice && typeof data.totalPrice === 'number') {
        data.totalPrice = data.totalPrice.toString();
      }

      // Fix date format if needed
      if (data.preferredDate && data.preferredDate instanceof Date) {
        data.preferredDate = data.preferredDate.toISOString();
      }

      // Create the booking with all required fields
      const db = await getDB();
      const [newBooking] = await db
        .insert(bookings)
        .values({
          name: data.name,
          email: data.email,
          phone: data.phone,
          streetAddress: data.streetAddress,
          addressLine2: data.addressLine2,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          serviceType: data.serviceType,
          detailedServices: data.detailedServices,
          totalPrice: data.totalPrice,
          preferredDate: data.preferredDate,
          preferredTime: data.preferredTime,
          notes: data.notes,
          status: 'active'
        })
        .returning();

      if (!newBooking) {
        throw new Error('Failed to create booking - no booking returned from database');
      }

      cache.del('all_bookings');
      cache.del(`bookings_date_${data.preferredDate.split('T')[0]}`);
      cache.del(`bookings_email_${data.email}`);


      console.log("Successfully created booking:", JSON.stringify(newBooking, null, 2));
      return newBooking;
    } catch (error) {
      console.error('Error creating booking:', error);
      throw new Error(`Failed to create booking: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | null> {
    try {
      console.log(`Updating booking ${id} with:`, JSON.stringify(booking, null, 2));

      // Get the current state first
      const currentBooking = await this.getBooking(id);
      if (!currentBooking) {
        console.error(`No booking found with ID ${id}`);
        return null;
      }

      // Create the history record first
      // ... (Assuming bookingHistory table and related logic exists) ...

      // Then update the booking
      const db = await getDB();
      const [updatedBooking] = await db
        .update(bookings)
        .set({
          ...booking,
          id: undefined,
          createdAt: undefined
        })
        .where(eq(bookings.id, id))
        .returning();

      cache.del(`booking_${id}`);
      cache.del('all_bookings');

      // If date changed, invalidate both old and new date caches
      if (booking.preferredDate && booking.preferredDate !== currentBooking.preferredDate) {
        cache.del(`bookings_date_${currentBooking.preferredDate.split('T')[0]}`);
        cache.del(`bookings_date_${booking.preferredDate.split('T')[0]}`);
      } else if (currentBooking.preferredDate) {
        cache.del(`bookings_date_${currentBooking.preferredDate.split('T')[0]}`);
      }

      // If email changed, invalidate both old and new email caches
      if (booking.email && booking.email !== currentBooking.email) {
        cache.del(`bookings_email_${currentBooking.email}`);
        cache.del(`bookings_email_${booking.email}`);
      } else if (currentBooking.email) {
        cache.del(`bookings_email_${currentBooking.email}`);
      }

      console.log(`Successfully updated booking ${id}`);
      return updatedBooking;
    } catch (error) {
      console.error("Error updating booking:", error);
      throw error;
    }
  }

  async deleteBooking(id: number): Promise<void> {
    try {
      console.log(`Deleting booking ${id}`);
      const db = await getDB();
      await db.delete(bookings).where(eq(bookings.id, id));
      cache.del(`booking_${id}`);
      cache.del('all_bookings');
      console.log(`Successfully deleted booking ${id}`);
    } catch (error) {
      console.error("Error deleting booking:", error);
      throw error;
    }
  }

  async getBookingHistory(bookingId: number): Promise<any[]> { // Replace any[] with the actual type
    try {
      console.log(`Fetching history for booking ${bookingId}`);
      const db = await getDB();
      const history = await db
        .select()
        .from(priceHistory) // Assuming priceHistory is the correct table
        .where(eq(priceHistory.bookingId, bookingId))
        .orderBy(desc(priceHistory.changedAt));

      console.log(`Retrieved ${history.length} history records`);
      return history;
    } catch (error) {
      console.error("Error fetching booking history:", error);
      throw error;
    }
  }

  async getAllPrices(): Promise<PricingConfig[]> {
    try {
      console.log("Fetching all pricing configurations");
      const db = await getDB();
      const result = await db.select().from(pricingConfig).where(eq(pricingConfig.isActive, true));
      console.log(`Retrieved ${result.length} pricing configurations`);
      return result;
    } catch (error) {
      console.error("Error fetching pricing configurations:", error);
      throw error;
    }
  }

  async getPrice(id: number): Promise<PricingConfig | null> {
    try {
      console.log(`Fetching price config with ID: ${id}`);
      const db = await getDB();
      const [result] = await db.select().from(pricingConfig).where(eq(pricingConfig.id, id));
      return result || null;
    } catch (error) {
      console.error("Error fetching price config:", error);
      throw error;
    }
  }

  async updatePrice(id: number, data: Partial<PricingConfig>): Promise<PricingConfig> {
    try {
      console.log(`Updating price config ${id} with:`, data);

      // Ensure basePrice is stored as a string
      const updateData = {
        ...data,
        basePrice: data.basePrice?.toString(),
        updatedAt: new Date(),
        updatedBy: 'admin'
      };

      console.log("Prepared update data:", updateData);
      const db = await getDB();
      const [updated] = await db
        .update(pricingConfig)
        .set(updateData)
        .where(eq(pricingConfig.id, id))
        .returning();

      if (!updated) {
        throw new Error(`Failed to update price config with ID ${id}`);
      }

      console.log("Successfully updated price:", updated);
      return updated;
    } catch (error) {
      console.error("Error updating price config:", error);
      throw error;
    }
  }

  async getAllPricingRules(): Promise<PricingRule[]> {
    try {
      console.log("Fetching all pricing rules");
      const db = await getDB();
      const result = await db.select().from(pricingRules).where(eq(pricingRules.isActive, true));
      console.log(`Retrieved ${result.length} pricing rules`);
      return result;
    } catch (error) {
      console.error("Error fetching pricing rules:", error);
      throw error;
    }
  }

  async updatePricingRule(id: number, data: Partial<PricingRule>): Promise<PricingRule> {
    try {
      console.log(`Updating pricing rule ${id} with:`, data);
      const db = await getDB();
      const [updated] = await db
        .update(pricingRules)
        .set(data)
        .where(eq(pricingRules.id, id))
        .returning();
      return updated;
    } catch (error) {
      console.error("Error updating pricing rule:", error);
      throw error;
    }
  }

  async createPriceHistory(data: InsertPriceHistory): Promise<void> {
    try {
      console.log("Recording price history:", data);
      const db = await getDB();
      await db.insert(priceHistory).values(data);
    } catch (error) {
      console.error("Error recording price history:", error);
      throw error;
    }
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    try {
      console.log(`Fetching bookings for email: ${email}`);
      const db = await getDB();
      const result = await db.select().from(bookings).where(sql`LOWER(${bookings.email}) = LOWER(${email})`).orderBy(desc(bookings.preferredDate));
      console.log(`Retrieved ${result.length} bookings for email ${email}`);
      return result;
    } catch (error) {
      console.error("Error fetching bookings by email:", error);
      throw error;
    }
  }
}

export const storage = new Storage();