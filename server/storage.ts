import { bookings, contactMessages, type Booking, type InsertBooking, type ContactMessage, type InsertContactMessage } from "@shared/schema";
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

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      console.log("Creating new booking:", JSON.stringify(booking, null, 2));
      const [newBooking] = await db
        .insert(bookings)
        .values({
          name: booking.name,
          email: booking.email,
          phone: booking.phone,
          streetAddress: booking.streetAddress,
          addressLine2: booking.addressLine2,
          city: booking.city,
          state: booking.state,
          zipCode: booking.zipCode,
          serviceType: booking.serviceType,
          detailedServices: booking.detailedServices,
          totalPrice: booking.totalPrice,
          preferredDate: booking.preferredDate,
          preferredTime: booking.preferredTime,
          notes: booking.notes
        })
        .returning();

      console.log("Successfully created booking:", newBooking.id);
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
          // Ensure these fields aren't accidentally overwritten
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

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    try {
      const [newMessage] = await db
        .insert(contactMessages)
        .values(message)
        .returning();
      return newMessage;
    } catch (error) {
      console.error("Error creating contact message:", error);
      throw error;
    }
  }
}

export const storage = new Storage();