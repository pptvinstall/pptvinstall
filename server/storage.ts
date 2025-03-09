import { type Booking, type ContactMessage, type InsertBooking, type InsertContactMessage, type BusinessHours, type InsertBusinessHours } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Since bookings and contactMessages tables are not exported from schema
// We'll use local file system storage instead

// Setup dirname and paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage path for bookings
const STORAGE_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(STORAGE_DIR, 'bookings.json');
const BUSINESS_HOURS_FILE = path.join(STORAGE_DIR, 'business_hours.json');

// Default business hours (9 AM to 5 PM, Monday-Friday)
const DEFAULT_BUSINESS_HOURS = [
  { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isAvailable: false }, // Sunday
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true },  // Monday
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true },  // Tuesday
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true },  // Wednesday
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isAvailable: true },  // Thursday
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isAvailable: true },  // Friday
  { dayOfWeek: 6, startTime: "09:00", endTime: "17:00", isAvailable: false }, // Saturday
];

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
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

/**
 * Load business hours from storage
 */
export function loadBusinessHours(): BusinessHours[] {
  try {
    const data = fs.readFileSync(BUSINESS_HOURS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading business hours:', error);
    
    // If there's an error, initialize with default hours
    const defaultHours = DEFAULT_BUSINESS_HOURS.map((hours, index) => ({
      id: index + 1,
      ...hours,
      updatedAt: new Date().toISOString()
    }));
    
    // Save the default hours to the file
    saveBusinessHours(defaultHours);
    
    return defaultHours;
  }
}

/**
 * Save business hours to storage
 */
export function saveBusinessHours(businessHours: BusinessHours[]): void {
  try {
    fs.writeFileSync(BUSINESS_HOURS_FILE, JSON.stringify(businessHours, null, 2));
  } catch (error) {
    console.error('Error saving business hours:', error);
  }
}

// Initialize bookings file if it doesn't exist
if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([]));
}

// Initialize business hours file if it doesn't exist
if (!fs.existsSync(BUSINESS_HOURS_FILE)) {
  fs.writeFileSync(BUSINESS_HOURS_FILE, JSON.stringify(
    DEFAULT_BUSINESS_HOURS.map((hours, index) => ({
      id: index + 1,
      ...hours,
      updatedAt: new Date().toISOString()
    }))
  ));
}

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
  
  // Business Hours
  getBusinessHours(): Promise<BusinessHours[]>;
  updateBusinessHours(dayOfWeek: number, data: Partial<BusinessHours>): Promise<BusinessHours>;
  getBusinessHoursForDay(dayOfWeek: number): Promise<BusinessHours | undefined>;
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
  
  // Business Hours methods
  async getBusinessHours(): Promise<BusinessHours[]> {
    return loadBusinessHours();
  }
  
  async getBusinessHoursForDay(dayOfWeek: number): Promise<BusinessHours | undefined> {
    const businessHours = loadBusinessHours();
    return businessHours.find(hours => hours.dayOfWeek === dayOfWeek);
  }
  
  async updateBusinessHours(dayOfWeek: number, data: Partial<BusinessHours>): Promise<BusinessHours> {
    const businessHours = loadBusinessHours();
    const index = businessHours.findIndex(hours => hours.dayOfWeek === dayOfWeek);
    
    if (index === -1) {
      throw new Error('Business hours for specified day not found');
    }
    
    const updatedHours = {
      ...businessHours[index],
      ...data,
      dayOfWeek, // Ensure dayOfWeek is not overwritten
      id: businessHours[index].id, // Ensure ID is not overwritten
      updatedAt: new Date().toISOString(), // Update the timestamp
    };
    
    businessHours[index] = updatedHours;
    saveBusinessHours(businessHours);
    return updatedHours;
  }
  
  // Helper methods for contact messages
  private loadContactMessages(): any[] {
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
    const MESSAGES_FILE = path.join(STORAGE_DIR, 'contact_messages.json');
    
    try {
      fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
    } catch (error) {
      console.error('Error saving contact messages:', error);
    }
  }
}

export const storage = new FileSystemStorage();

// Ensure the server/data directory exists
export function ensureDataDirectory(): void {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}
