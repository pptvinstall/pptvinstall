import { type Booking, type InsertBooking } from "@shared/schema";
import { DatabaseStorage } from "./storage.db";

// This interface defines what our Storage must do
export interface IStorage {
  // Booking Methods
  createBooking(booking: InsertBooking): Promise<Booking>;
  createBookingIfAvailable(booking: InsertBooking): Promise<Booking | null>;
  getBookingById(id: number): Promise<Booking | null>;
  getAllBookings(): Promise<Booking[]>;
  rescheduleBookingIfAvailable(id: number, preferredDate: string, appointmentTime: string): Promise<Booking | null>;
  updateBooking(id: number, updates: Partial<Booking>): Promise<Booking>;
}

export class MemStorage implements IStorage {
  private bookings: Map<number, Booking>;
  private currentBookingId: number;

  constructor() {
    this.bookings = new Map();
    this.currentBookingId = 1;
  }

  // --- BOOKING METHODS (The Important Part) ---
  
  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = this.currentBookingId++;
    
    // Ensure all required fields exist, defaulting if necessary
    const booking: Booking = { 
      ...insertBooking, 
      id: String(id),
      // Default to "active" if not provided
      status: insertBooking.status || "active",
      // Default to empty object if breakdown missing
      pricingBreakdown: insertBooking.pricingBreakdown || "{}", 
      // Ensure notes is a string
      notes: insertBooking.notes || ""
    };
    
    this.bookings.set(id, booking);
    console.log(`✅ Storage: Saved Booking #${id} for ${booking.email}`);
    return booking;
  }

  async createBookingIfAvailable(insertBooking: InsertBooking): Promise<Booking | null> {
    const isTaken = Array.from(this.bookings.values()).some(
      (booking) =>
        booking.preferredDate === insertBooking.preferredDate &&
        booking.appointmentTime === insertBooking.appointmentTime &&
        booking.status !== "cancelled",
    );

    if (isTaken) return null;
    return this.createBooking(insertBooking);
  }

  async getBookingById(id: number): Promise<Booking | null> {
    return this.bookings.get(id) ?? null;
  }

  async getAllBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values());
  }

  async rescheduleBookingIfAvailable(id: number, preferredDate: string, appointmentTime: string): Promise<Booking | null> {
    const booking = this.bookings.get(id);
    if (!booking) throw new Error("Booking not found");

    const isTaken = Array.from(this.bookings.entries()).some(
      ([otherId, other]) =>
        otherId !== id &&
        other.preferredDate === preferredDate &&
        other.appointmentTime === appointmentTime &&
        other.status !== "cancelled",
    );

    if (isTaken) return null;

    const updated = { ...booking, preferredDate, appointmentTime };
    this.bookings.set(id, updated);
    return updated;
  }

  async updateBooking(id: number, updates: Partial<Booking>): Promise<Booking> {
    const booking = this.bookings.get(id);
    if (!booking) throw new Error("Booking not found");
    
    const updatedBooking = { ...booking, ...updates };
    this.bookings.set(id, updatedBooking);
    return updatedBooking;
  }
}

export const storage = new DatabaseStorage();
