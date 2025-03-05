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
    const [newBooking] = await db
      .insert(bookings)
      .values(booking)
      .returning();
    return newBooking;
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