import { bookings, type Booking, type InsertBooking } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  async updateBooking(id: number, booking: Partial<Booking>): Promise<Booking | null> {
    try {
      console.log(`Updating booking ${id} with:`, JSON.stringify(booking, null, 2));
      const [updatedBooking] = await db
        .update(bookings)
        .set({
          ...booking,
          id: undefined,
          createdAt: undefined
        })
        .where(eq(bookings.id, id))
        .returning();

      if (!updatedBooking) {
        console.error(`No booking found with ID ${id}`);
        return null;
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
      await db.delete(bookings).where(eq(bookings.id, id));
      console.log(`Successfully deleted booking ${id}`);
    } catch (error) {
      console.error("Error deleting booking:", error);
      throw error;
    }
  }
}

export const storage = new Storage();