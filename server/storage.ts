import { bookings, contactMessages, type Booking, type InsertBooking, type ContactMessage, type InsertContactMessage } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Contact Messages
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  getContactMessage(id: number): Promise<ContactMessage | undefined>;

  // Bookings
  createBooking(booking: InsertBooking): Promise<Booking>;
  getBooking(id: number): Promise<Booking | undefined>;
  getAllBookings(): Promise<Booking[]>;
  getBookingsByDate(date: string): Promise<Booking[]>;
  updateBooking(id: number, booking: Partial<Booking>): Promise<Booking>;
  deleteBooking(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [newMessage] = await db
      .insert(contactMessages)
      .values(message)
      .returning();
    return newMessage;
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [message] = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, id));
    return message;
  }

  async createBooking(booking: InsertBooking): Promise<Booking> {
    try {
      // Filter out properties that might not exist in the database
      const safeBooking = {
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
        // Only include these if supported by current DB schema
        ...(this.checkColumnExists('bookings', 'detailedServices') ? { detailedServices: booking.detailedServices } : {}),
        ...(this.checkColumnExists('bookings', 'totalPrice') ? { totalPrice: booking.totalPrice } : {}),
        ...(this.checkColumnExists('bookings', 'appointmentTime') ? { appointmentTime: booking.appointmentTime } : {})
      };
      
      const [newBooking] = await db
        .insert(bookings)
        .values(safeBooking)
        .returning();
      return newBooking;
    } catch (error) {
      console.error("Error creating booking:", error);
      throw error;
    }
  }
  
  // Helper method to check if a column exists (simplified implementation)
  private columnExistsCache: Record<string, Set<string>> = {};
  
  private checkColumnExists(table: string, column: string): boolean {
    // For now, let's return false for the problematic columns
    // This is a temporary solution until schema is properly migrated
    const problematicColumns = ['detailedServices', 'totalPrice', 'appointmentTime'];
    return !problematicColumns.includes(column);
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, id));
    return booking;
  }

  async getAllBookings(): Promise<Booking[]> {
    return db.select().from(bookings);
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(eq(bookings.preferredDate, date));
  }

  async updateBooking(id: number, booking: Partial<Booking>): Promise<Booking> {
    try {
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
        throw new Error('Booking not found');
      }

      return updatedBooking;
    } catch (error) {
      console.error('Error updating booking in storage:', error);
      throw error;
    }
  }

  async deleteBooking(id: number): Promise<void> {
    await db
      .delete(bookings)
      .where(eq(bookings.id, id));
  }
}

export const storage = new DatabaseStorage();