import { bookings, type Booking, type InsertBooking, pricingConfig, pricingRules, priceHistory, type PricingConfig, type PricingRule, type InsertPriceHistory } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export class Storage {
  async getAllBookings(): Promise<Booking[]> {
    try {
      console.log("Fetching all bookings");
      const result = await db.select().from(bookings);
      console.log(`Retrieved ${result.length} bookings`);
      return result;
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      throw error;
    }
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    try {
      console.log(`Fetching bookings for date: ${date}`);
      const result = await db.select().from(bookings).where(
        eq(bookings.preferredDate, date)
      );
      console.log(`Retrieved ${result.length} bookings for date ${date}`);
      return result;
    } catch (error) {
      console.error("Error fetching bookings by date:", error);
      throw error;
    }
  }

  async getBooking(id: number): Promise<Booking | null> {
    try {
      console.log(`Fetching booking with ID: ${id}`);
      const [result] = await db.select().from(bookings).where(
        eq(bookings.id, id)
      );
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
      await db.insert(bookingHistory).values({
        bookingId: id,
        previousState: currentBooking,
        newState: { ...currentBooking, ...booking },
        changeType: 'update',
        changedBy: 'admin' // You might want to pass this in from the request
      });

      // Then update the booking
      const [updatedBooking] = await db
        .update(bookings)
        .set({
          ...booking,
          id: undefined,
          createdAt: undefined
        })
        .where(eq(bookings.id, id))
        .returning();

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
      await db.delete(bookings).where(eq(bookings.id, id));
      console.log(`Successfully deleted booking ${id}`);
    } catch (error) {
      console.error("Error deleting booking:", error);
      throw error;
    }
  }

  async getBookingHistory(bookingId: number): Promise<BookingHistory[]> {
    try {
      console.log(`Fetching history for booking ${bookingId}`);
      const history = await db
        .select()
        .from(bookingHistory)
        .where(eq(bookingHistory.bookingId, bookingId))
        .orderBy(desc(bookingHistory.changedAt));

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
      await db.insert(priceHistory).values(data);
    } catch (error) {
      console.error("Error recording price history:", error);
      throw error;
    }
  }

  async getBookingsByEmail(email: string): Promise<Booking[]> {
    try {
      console.log(`Fetching bookings for email: ${email}`);
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