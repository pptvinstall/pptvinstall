import { bookings, contactMessages, type Booking, type InsertBooking, type ContactMessage, type InsertContactMessage } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export class Storage {
  async getAllBookings(): Promise<Booking[]> {
    try {
      const result = await db.select().from(bookings);
      return result;
    } catch (error) {
      console.error("Error fetching all bookings:", error);
      throw error;
    }
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    try {
      // Simple date comparison for now - might need refinement
      const result = await db.select().from(bookings).where(
        eq(bookings.preferredDate, date)
      );
      return result;
    } catch (error) {
      console.error("Error fetching bookings by date:", error);
      throw error;
    }
  }

  async getBooking(id: number): Promise<Booking | null> {
    try {
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
      console.log("Creating booking with data:", JSON.stringify(booking, null, 2));
      
      // Include all necessary fields including detailed services and price data
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
          preferredDate: booking.preferredDate,
          notes: booking.notes,
          detailedServices: booking.detailedServices || null,
          totalPrice: booking.totalPrice || null,
          appointmentTime: booking.appointmentTime || null,
          status: 'active'
        })
        .returning();
      
      console.log("Successfully created booking:", JSON.stringify(newBooking, null, 2));
      return newBooking;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }

  async updateBooking(id: number, booking: Partial<InsertBooking>): Promise<Booking | null> {
    try {
      const [updatedBooking] = await db
        .update(bookings)
        .set(booking)
        .where(eq(bookings.id, id))
        .returning();
      return updatedBooking || null;
    } catch (error) {
      console.error("Error updating booking:", error);
      throw error;
    }
  }

  async deleteBooking(id: number): Promise<void> {
    try {
      await db.delete(bookings).where(eq(bookings.id, id));
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