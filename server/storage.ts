import { type Booking, type ContactMessage, type InsertBooking, type InsertContactMessage } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Since bookings and contactMessages tables are not exported from schema
// We'll use local file system storage instead

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

export class FileSystemStorage implements IStorage {
  async createContactMessage(message: any): Promise<ContactMessage> {
    const contactMessages = this.loadContactMessages();
    const newMessage = {
      id: contactMessages.length + 1,
      ...message,
      createdAt: new Date().toISOString(),
    };
    contactMessages.push(newMessage);
    this.saveContactMessages(contactMessages);
    return newMessage;
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const contactMessages = this.loadContactMessages();
    return contactMessages.find((message: any) => message.id === id);
  }

  async createBooking(booking: any): Promise<Booking> {
    const bookings = loadBookings();
    const newBooking = {
      id: bookings.length + 1,
      ...booking,
      createdAt: new Date().toISOString(),
    };
    bookings.push(newBooking);
    saveBookings(bookings);
    return newBooking;
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    const bookings = loadBookings();
    return bookings.find((booking: any) => booking.id === id);
  }

  async getAllBookings(): Promise<Booking[]> {
    return loadBookings();
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    const bookings = loadBookings();
    return bookings.filter((booking: any) => booking.preferredDate.startsWith(date));
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking> {
    const bookings = loadBookings();
    const index = bookings.findIndex((booking: any) => booking.id === id);
    
    if (index === -1) {
      throw new Error('Booking not found');
    }
    
    const updatedBooking = {
      ...bookings[index],
      ...bookingData,
      id: bookings[index].id, // Ensure ID is not overwritten
      createdAt: bookings[index].createdAt, // Ensure createdAt is not overwritten
    };
    
    bookings[index] = updatedBooking;
    saveBookings(bookings);
    return updatedBooking;
  }

  async deleteBooking(id: number): Promise<void> {
    const bookings = loadBookings();
    const filteredBookings = bookings.filter((booking: any) => booking.id !== id);
    saveBookings(filteredBookings);
  }
  
  // Helper methods for contact messages
  private loadContactMessages(): any[] {
    const fs = require('fs');
    const path = require('path');
    const MESSAGES_FILE = path.join(STORAGE_DIR, 'contact_messages.json');
    
    if (!fs.existsSync(MESSAGES_FILE)) {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify([]));
    }
    
    try {
      const data = fs.readFileSync(MESSAGES_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading contact messages:', error);
      return [];
    }
  }
  
  private saveContactMessages(messages: any[]): void {
    const fs = require('fs');
    const path = require('path');
    const MESSAGES_FILE = path.join(STORAGE_DIR, 'contact_messages.json');
    
    try {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    } catch (error) {
      console.error('Error saving contact messages:', error);
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const storage = new FileSystemStorage();

// Storage path for bookings
const STORAGE_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(STORAGE_DIR, 'bookings.json');

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Initialize bookings file if it doesn't exist
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
}

/**
 * Load bookings from storage
 */
export function loadBookings(): any[] {
  try {
    const data = fs.readFileSync(BOOKINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading bookings:', error);
    return [];
  }
}

/**
 * Save bookings to storage
 */
export function saveBookings(bookings: any[]): void {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
  } catch (error) {
    console.error('Error saving bookings:', error);
  }
}

// Ensure the server/data directory exists
export function ensureDataDirectory(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}
