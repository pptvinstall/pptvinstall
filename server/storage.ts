import { type Booking, type ContactMessage, type InsertBooking, type InsertContactMessage, 
  type BusinessHours, type InsertBusinessHours, type Customer, type InsertCustomer,
  type SystemSettings, type InsertSystemSettings, type BookingArchive, type InsertBookingArchive,
  bookings, customers, businessHours, systemSettings, bookingArchives } from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Since bookings and contactMessages tables are not exported from schema
// We'll use local file system storage instead

// Setup dirname and paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Storage path for bookings
const STORAGE_DIR = path.join(__dirname, 'data');
const BOOKINGS_FILE = path.join(STORAGE_DIR, 'bookings.json');
const BUSINESS_HOURS_FILE = path.join(STORAGE_DIR, 'business_hours.json');
const SYSTEM_SETTINGS_FILE = path.join(STORAGE_DIR, 'system_settings.json');

// Default business hours (Mon-Fri: 6:30-10:30PM, Sat-Sun: 11AM-7PM)
const DEFAULT_BUSINESS_HOURS = [
  { dayOfWeek: 0, startTime: "11:00", endTime: "19:00", isAvailable: true }, // Sunday
  { dayOfWeek: 1, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Monday
  { dayOfWeek: 2, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Tuesday
  { dayOfWeek: 3, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Wednesday
  { dayOfWeek: 4, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Thursday
  { dayOfWeek: 5, startTime: "18:30", endTime: "22:30", isAvailable: true }, // Friday
  { dayOfWeek: 6, startTime: "11:00", endTime: "19:00", isAvailable: true }, // Saturday
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

// Default system settings
const DEFAULT_SYSTEM_SETTINGS: SystemSettings[] = [
  {
    id: 1,
    name: 'bookingBufferHours',
    bookingBufferHours: 2, // Default 2 hour buffer instead of 12
    value: 2,
    description: 'Minimum hours before a booking can be scheduled',
    updatedAt: new Date().toISOString()
  }
];

/**
 * Load system settings from storage
 */
export function loadSystemSettings(): SystemSettings[] {
  try {
    const data = fs.readFileSync(SYSTEM_SETTINGS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading system settings:', error);
    
    // If there's an error, initialize with default settings
    const defaultSettings = DEFAULT_SYSTEM_SETTINGS.map(setting => ({
      ...setting,
      updatedAt: new Date().toISOString()
    }));
    
    // Save the default settings to the file
    saveSystemSettings(defaultSettings);
    
    return defaultSettings;
  }
}

/**
 * Save system settings to storage
 */
export function saveSystemSettings(settings: SystemSettings[]): void {
  try {
    fs.writeFileSync(SYSTEM_SETTINGS_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Error saving system settings:', error);
  }
}

// Initialize system settings file if it doesn't exist
if (!fs.existsSync(SYSTEM_SETTINGS_FILE)) {
  fs.writeFileSync(SYSTEM_SETTINGS_FILE, JSON.stringify(
    DEFAULT_SYSTEM_SETTINGS.map(setting => ({
      ...setting,
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
  deleteBooking(id: number, archiveReason?: string, archiveNote?: string): Promise<void>;
  
  // Booking Archives
  archiveBooking(bookingId: number, reason: string, note?: string): Promise<number>; // returns archive ID
  getBookingArchives(): Promise<BookingArchive[]>;
  getBookingArchivesByReason(reason: string): Promise<BookingArchive[]>;
  getBookingArchivesByEmail(email: string): Promise<BookingArchive[]>;
  getBookingArchiveById(id: number): Promise<BookingArchive | undefined>;
  
  // Business Hours
  getBusinessHours(): Promise<BusinessHours[]>;
  updateBusinessHours(dayOfWeek: number, data: Partial<BusinessHours>): Promise<BusinessHours>;
  getBusinessHoursForDay(dayOfWeek: number): Promise<BusinessHours | undefined>;
  
  // System Settings
  getSystemSettings(): Promise<SystemSettings[]>;
  getSystemSettingByName(name: string): Promise<SystemSettings | undefined>;
  updateSystemSetting(name: string, value: any): Promise<SystemSettings>;
  
  // Customer Management
  createCustomer(customerData: InsertCustomer): Promise<Customer>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer>;
  getCustomerBookings(customerId: number): Promise<Booking[]>;
  addLoyaltyPoints(customerId: number, points: number): Promise<Customer>;
  verifyCustomer(email: string, token: string): Promise<boolean>;
  requestPasswordReset(email: string): Promise<string | null>; // Returns reset token if successful
  resetPassword(email: string, token: string, newPassword: string): Promise<boolean>;
  validateCustomerCredentials(email: string, password: string): Promise<Customer | null>;
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
    try {
      const result = await db.insert(bookings).values({
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        streetAddress: booking.streetAddress,
        addressLine2: booking.addressLine2,
        city: booking.city,
        state: booking.state,
        zipCode: booking.zipCode,
        notes: booking.notes,
        serviceType: booking.serviceType,
        preferredDate: booking.preferredDate,
        appointmentTime: booking.appointmentTime,
        status: booking.status || 'active',
        pricingTotal: booking.pricingTotal,
        pricingBreakdown: booking.pricingBreakdown,
        tvSize: booking.tvSize,
        mountType: booking.mountType,
        wallMaterial: booking.wallMaterial,
        specialInstructions: booking.specialInstructions,
        consentToContact: booking.consentToContact || false,
        cancellationReason: booking.cancellationReason
      }).returning();
      
      if (result.length === 0) {
        throw new Error('Failed to create booking');
      }
      
      return this.mapDatabaseBookingToModel(result[0]);
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  }

  async getBooking(id: number): Promise<Booking | undefined> {
    try {
      const result = await db.select().from(bookings).where(eq(bookings.id, id));
      if (result.length === 0) {
        return undefined;
      }
      return this.mapDatabaseBookingToModel(result[0]);
    } catch (error) {
      console.error('Error getting booking:', error);
      return undefined;
    }
  }

  async getAllBookings(): Promise<Booking[]> {
    try {
      const result = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
      return result.map(booking => this.mapDatabaseBookingToModel(booking));
    } catch (error) {
      console.error('Error getting all bookings:', error);
      return [];
    }
  }

  async getBookingsByDate(date: string): Promise<Booking[]> {
    try {
      const result = await db.select().from(bookings);
      const filtered = result.filter(booking => booking.preferredDate.startsWith(date));
      return filtered.map(booking => this.mapDatabaseBookingToModel(booking));
    } catch (error) {
      console.error('Error getting bookings by date:', error);
      return [];
    }
  }

  async updateBooking(id: number, bookingData: Partial<Booking>): Promise<Booking> {
    try {
      const updateData: any = {};
      
      // Map the booking data to database fields
      if (bookingData.name !== undefined) updateData.name = bookingData.name;
      if (bookingData.email !== undefined) updateData.email = bookingData.email;
      if (bookingData.phone !== undefined) updateData.phone = bookingData.phone;
      if (bookingData.streetAddress !== undefined) updateData.streetAddress = bookingData.streetAddress;
      if (bookingData.addressLine2 !== undefined) updateData.addressLine2 = bookingData.addressLine2;
      if (bookingData.city !== undefined) updateData.city = bookingData.city;
      if (bookingData.state !== undefined) updateData.state = bookingData.state;
      if (bookingData.zipCode !== undefined) updateData.zipCode = bookingData.zipCode;
      if (bookingData.notes !== undefined) updateData.notes = bookingData.notes;
      if (bookingData.serviceType !== undefined) updateData.serviceType = bookingData.serviceType;
      if (bookingData.status !== undefined) updateData.status = bookingData.status;
      if (bookingData.pricingTotal !== undefined) updateData.pricingTotal = bookingData.pricingTotal;
      if (bookingData.pricingBreakdown !== undefined) updateData.pricingBreakdown = bookingData.pricingBreakdown;
      // Note: cancellationReason is handled separately in booking cancellation logic
      
      const result = await db.update(bookings)
        .set(updateData)
        .where(eq(bookings.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error('Booking not found');
      }
      
      return this.mapDatabaseBookingToModel(result[0]);
    } catch (error) {
      console.error('Error updating booking:', error);
      throw error;
    }
  }

  async deleteBooking(id: number, archiveReason?: string, archiveNote?: string): Promise<void> {
    try {
      // Get the booking to be deleted
      const bookingId = Number(id);
      const result = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      
      if (result.length === 0) {
        throw new Error('Booking not found');
      }
      
      const booking = result[0];
      
      // Archive the booking if reason provided
      if (archiveReason) {
        await this.archiveBooking(bookingId, archiveReason, archiveNote);
      }
      
      // Delete the booking from the database
      await db.delete(bookings).where(eq(bookings.id, bookingId));
    } catch (error) {
      console.error('Error deleting booking:', error);
      throw error;
    }
  }
  
  // Booking archives methods
  async archiveBooking(bookingId: number, reason: string, note?: string): Promise<number> {
    try {
      // Get the booking to archive
      const result = await db.select().from(bookings).where(eq(bookings.id, bookingId));
      
      if (result.length === 0) {
        throw new Error('Booking not found for archiving');
      }
      
      const booking = result[0];
      
      // Create archive entry
      const archiveData = {
        originalId: booking.id,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        streetAddress: booking.streetAddress,
        addressLine2: booking.addressLine2,
        city: booking.city,
        state: booking.state,
        zipCode: booking.zipCode,
        notes: booking.notes,
        serviceType: booking.serviceType,
        preferredDate: booking.preferredDate,
        appointmentTime: booking.appointmentTime,
        status: booking.status,
        pricingTotal: booking.pricingTotal,
        pricingBreakdown: booking.pricingBreakdown,
        tvSize: booking.tvSize,
        mountType: booking.mountType,
        wallMaterial: booking.wallMaterial,
        specialInstructions: booking.specialInstructions,
        originalCreatedAt: booking.createdAt,
        archiveReason: reason,
        archiveNote: note
      };
      
      // Insert into archive table
      const archiveResult = await db.insert(bookingArchives)
        .values(archiveData)
        .returning();
      
      if (archiveResult.length === 0) {
        throw new Error('Failed to archive booking');
      }
      
      return archiveResult[0].id;
    } catch (error) {
      console.error('Error archiving booking:', error);
      throw error;
    }
  }
  
  async getBookingArchives(): Promise<BookingArchive[]> {
    try {
      const result = await db.select().from(bookingArchives)
        .orderBy(desc(bookingArchives.archivedAt));
      
      return result.map(archive => ({
        ...archive,
        id: archive.id,
        originalId: archive.originalId,
        originalCreatedAt: archive.originalCreatedAt?.toISOString(),
        archivedAt: archive.archivedAt?.toISOString()
      }));
    } catch (error) {
      console.error('Error getting booking archives:', error);
      return [];
    }
  }
  
  async getBookingArchivesByReason(reason: string): Promise<BookingArchive[]> {
    try {
      const result = await db.select().from(bookingArchives)
        .where(eq(bookingArchives.archiveReason, reason))
        .orderBy(desc(bookingArchives.archivedAt));
      
      return result.map(archive => ({
        ...archive,
        id: archive.id,
        originalId: archive.originalId,
        originalCreatedAt: archive.originalCreatedAt?.toISOString(),
        archivedAt: archive.archivedAt?.toISOString()
      }));
    } catch (error) {
      console.error(`Error getting booking archives by reason ${reason}:`, error);
      return [];
    }
  }
  
  async getBookingArchivesByEmail(email: string): Promise<BookingArchive[]> {
    try {
      const result = await db.select().from(bookingArchives)
        .where(eq(bookingArchives.email, email))
        .orderBy(desc(bookingArchives.archivedAt));
      
      return result.map(archive => ({
        ...archive,
        id: archive.id,
        originalId: archive.originalId,
        originalCreatedAt: archive.originalCreatedAt?.toISOString(),
        archivedAt: archive.archivedAt?.toISOString()
      }));
    } catch (error) {
      console.error(`Error getting booking archives by email ${email}:`, error);
      return [];
    }
  }
  
  async getBookingArchiveById(id: number): Promise<BookingArchive | undefined> {
    try {
      const result = await db.select().from(bookingArchives)
        .where(eq(bookingArchives.id, id));
      
      if (result.length === 0) {
        return undefined;
      }
      
      const archive = result[0];
      return {
        ...archive,
        id: archive.id,
        originalId: archive.originalId,
        originalCreatedAt: archive.originalCreatedAt?.toISOString(),
        archivedAt: archive.archivedAt?.toISOString()
      };
    } catch (error) {
      console.error(`Error getting booking archive by id ${id}:`, error);
      return undefined;
    }
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
  
  // System Settings methods
  async getSystemSettings(): Promise<SystemSettings[]> {
    return loadSystemSettings();
  }
  
  async getSystemSettingByName(name: string): Promise<SystemSettings | undefined> {
    const settings = loadSystemSettings();
    return settings.find(setting => setting.name === name);
  }
  
  async updateSystemSetting(name: string, value: any): Promise<SystemSettings> {
    const settings = loadSystemSettings();
    const index = settings.findIndex(setting => setting.name === name);
    
    if (index === -1) {
      throw new Error('System setting not found');
    }
    
    // For bookingBufferHours, update both value and bookingBufferHours properties
    let updatedSetting: SystemSettings;
    if (name === 'bookingBufferHours') {
      updatedSetting = {
        ...settings[index],
        value: value,
        bookingBufferHours: Number(value),
        updatedAt: new Date().toISOString(),
      };
    } else {
      updatedSetting = {
        ...settings[index],
        value: value,
        updatedAt: new Date().toISOString(),
      };
    }
    
    settings[index] = updatedSetting;
    saveSystemSettings(settings);
    return updatedSetting;
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
  
  // Helper method to convert database customer to model
  private mapDatabaseCustomerToModel(dbCustomer: any): Customer {
    return {
      id: dbCustomer.id,
      name: dbCustomer.name,
      email: dbCustomer.email,
      phone: dbCustomer.phone,
      password: dbCustomer.password,
      streetAddress: dbCustomer.streetAddress || undefined,
      addressLine2: dbCustomer.addressLine2 || undefined,
      city: dbCustomer.city || undefined,
      state: dbCustomer.state || undefined,
      zipCode: dbCustomer.zipCode || undefined,
      loyaltyPoints: dbCustomer.loyaltyPoints || 0,
      memberSince: dbCustomer.memberSince ? new Date(dbCustomer.memberSince).toISOString() : undefined,
      lastLogin: dbCustomer.lastLogin ? new Date(dbCustomer.lastLogin).toISOString() : undefined,
      verificationToken: dbCustomer.verificationToken || undefined,
      isVerified: dbCustomer.isVerified || false,
      passwordResetToken: dbCustomer.passwordResetToken || undefined,
      passwordResetExpires: dbCustomer.passwordResetExpires 
        ? new Date(dbCustomer.passwordResetExpires).toISOString() 
        : undefined
    };
  }
  
  // Helper method to convert database booking to model
  private mapDatabaseBookingToModel(dbBooking: any): Booking {
    const result: any = {
      name: dbBooking.name,
      email: dbBooking.email,
      phone: dbBooking.phone,
      streetAddress: dbBooking.streetAddress,
      addressLine2: dbBooking.addressLine2 || undefined,
      city: dbBooking.city,
      state: dbBooking.state,
      zipCode: dbBooking.zipCode,
      notes: dbBooking.notes || undefined,
      serviceType: dbBooking.serviceType,
      date: dbBooking.date || dbBooking.preferredDate, // Handle both field names
      time: dbBooking.time || dbBooking.appointmentTime, // Handle both field names
      status: dbBooking.status || 'active',
    };
    
    // Convert ID to string if it exists
    if (dbBooking.id !== undefined) {
      result.id = dbBooking.id.toString();
    }
    
    // Handle dates properly
    if (dbBooking.createdAt) {
      result.createdAt = dbBooking.createdAt instanceof Date 
        ? dbBooking.createdAt.toISOString() 
        : dbBooking.createdAt;
    }
    
    // Handle optional fields
    if (dbBooking.pricingTotal) result.pricingTotal = dbBooking.pricingTotal;
    if (dbBooking.pricingBreakdown) result.pricingBreakdown = dbBooking.pricingBreakdown;
    if (dbBooking.tvSize) result.tvSize = dbBooking.tvSize;
    if (dbBooking.mountType) result.mountType = dbBooking.mountType;
    if (dbBooking.wallMaterial) result.wallMaterial = dbBooking.wallMaterial;
    if (dbBooking.specialInstructions) result.specialInstructions = dbBooking.specialInstructions;
    if (dbBooking.customerId) result.customerId = dbBooking.customerId.toString();
    
    return result as Booking;
  }

  // Customer Management methods
  async createCustomer(customerData: InsertCustomer): Promise<Customer> {
    try {
      // Normalize email (ensure it's lowercase) before storing
      const normalizedData = {
        ...customerData,
        email: customerData.email.toLowerCase().trim()
      };
      
      console.log(`Creating customer with email: ${normalizedData.email}`);
      
      // Hash the password before storing
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(normalizedData.password, salt);
      
      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      // Prepare customer data for insertion
      const customerForDb = {
        ...normalizedData,
        password: hashedPassword,
        verificationToken: verificationToken,
        isVerified: false,
        memberSince: new Date(),
        loyaltyPoints: 0
      };
      
      // Insert into database
      const result = await db.insert(customers)
        .values(customerForDb)
        .returning();
      
      if (result.length === 0) {
        throw new Error('Failed to create customer');
      }
      
      return this.mapDatabaseCustomerToModel(result[0]);
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }
  
  async getCustomerById(id: number): Promise<Customer | undefined> {
    try {
      const result = await db.select().from(customers).where(eq(customers.id, id));
      return result.length > 0 ? this.mapDatabaseCustomerToModel(result[0]) : undefined;
    } catch (error) {
      console.error('Error fetching customer by ID:', error);
      throw error;
    }
  }
  
  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    try {
      // Normalize email for consistent lookups
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Fetching customer by email: ${normalizedEmail}`);
      
      const result = await db.select().from(customers).where(eq(customers.email, normalizedEmail));
      return result.length > 0 ? this.mapDatabaseCustomerToModel(result[0]) : undefined;
    } catch (error) {
      console.error('Error fetching customer by email:', error);
      throw error;
    }
  }
  
  async updateCustomer(id: number, customerData: Partial<Customer>): Promise<Customer> {
    try {
      // If the update includes a password, hash it
      if (customerData.password) {
        const salt = await bcrypt.genSalt(10);
        customerData.password = await bcrypt.hash(customerData.password, salt);
      }
      
      // Convert any date strings to Date objects
      const dbFormatData: any = { ...customerData };
      delete dbFormatData.memberSince; // Don't allow updating member since date
      
      const result = await db.update(customers)
        .set(dbFormatData)
        .where(eq(customers.id, id))
        .returning();
      
      if (result.length === 0) {
        throw new Error('Customer not found');
      }
      
      return this.mapDatabaseCustomerToModel(result[0]);
    } catch (error) {
      console.error('Error updating customer:', error);
      throw error;
    }
  }
  
  async getCustomerBookings(customerId: number): Promise<Booking[]> {
    try {
      // First get the customer to find their email
      const customerResult = await db.select().from(customers).where(eq(customers.id, customerId));
      
      if (customerResult.length === 0) {
        throw new Error('Customer not found');
      }
      
      const customerEmail = customerResult[0].email;
      
      // Then find all bookings with that email
      const result = await db.select()
        .from(bookings)
        .where(eq(bookings.email, customerEmail))
        .orderBy(desc(bookings.createdAt));
      
      return result.map(booking => this.mapDatabaseBookingToModel(booking));
    } catch (error) {
      console.error('Error fetching customer bookings:', error);
      throw error;
    }
  }
  
  async addLoyaltyPoints(customerId: number, points: number): Promise<Customer> {
    try {
      // First get the current loyalty points
      const customerResult = await db.select().from(customers).where(eq(customers.id, customerId));
      
      if (customerResult.length === 0) {
        throw new Error('Customer not found');
      }
      
      const currentPoints = customerResult[0].loyaltyPoints || 0;
      const newPoints = currentPoints + points;
      
      // Update the loyalty points
      const result = await db.update(customers)
        .set({ loyaltyPoints: newPoints })
        .where(eq(customers.id, customerId))
        .returning();
      
      return this.mapDatabaseCustomerToModel(result[0]);
    } catch (error) {
      console.error('Error adding loyalty points:', error);
      throw error;
    }
  }
  
  async verifyCustomer(email: string, token: string): Promise<boolean> {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Verifying customer with email: ${normalizedEmail}`);
      
      // Find customer with matching email and verification token
      const customerResult = await db.select()
        .from(customers)
        .where(
          and(
            eq(customers.email, normalizedEmail),
            eq(customers.verificationToken, token)
          )
        );
      
      if (customerResult.length === 0) {
        return false;
      }
      
      // Update customer to be verified
      await db.update(customers)
        .set({
          isVerified: true,
          verificationToken: null
        })
        .where(eq(customers.id, customerResult[0].id));
      
      return true;
    } catch (error) {
      console.error('Error verifying customer:', error);
      return false;
    }
  }
  
  async requestPasswordReset(email: string): Promise<string | null> {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Requesting password reset for email: ${normalizedEmail}`);
      
      // Find customer with matching email
      const customerResult = await db.select()
        .from(customers)
        .where(eq(customers.email, normalizedEmail));
      
      if (customerResult.length === 0) {
        return null;
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      // Set token expiration (1 hour from now)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1);
      
      // Update customer with reset token and expiration
      await db.update(customers)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpires: expiresAt
        })
        .where(eq(customers.id, customerResult[0].id));
      
      return resetToken;
    } catch (error) {
      console.error('Error requesting password reset:', error);
      return null;
    }
  }
  
  async resetPassword(email: string, token: string, newPassword: string): Promise<boolean> {
    try {
      // Normalize email
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Resetting password for email: ${normalizedEmail}`);
      
      // Find customer with matching email and reset token
      const customerResult = await db.select()
        .from(customers)
        .where(
          and(
            eq(customers.email, normalizedEmail),
            eq(customers.passwordResetToken, token)
          )
        );
      
      if (customerResult.length === 0) {
        return false;
      }
      
      const customer = customerResult[0];
      
      // Check if token is expired
      if (customer.passwordResetExpires && new Date() > new Date(customer.passwordResetExpires)) {
        return false;
      }
      
      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password and clear reset token
      await db.update(customers)
        .set({
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null
        })
        .where(eq(customers.id, customer.id));
      
      return true;
    } catch (error) {
      console.error('Error resetting password:', error);
      return false;
    }
  }
  
  async validateCustomerCredentials(email: string, password: string): Promise<Customer | null> {
    try {
      // Find customer with matching email (case-insensitive)
      const normalizedEmail = email.toLowerCase().trim();
      console.log(`Validating credentials for email: ${normalizedEmail}`);
      
      const customerResult = await db.select()
        .from(customers)
        .where(eq(customers.email, normalizedEmail));
      
      if (customerResult.length === 0) {
        return null;
      }
      
      const customer = customerResult[0];
      
      // Check if password matches
      const isPasswordValid = await bcrypt.compare(password, customer.password);
      
      if (!isPasswordValid) {
        return null;
      }
      
      // Update last login timestamp
      await db.update(customers)
        .set({
          lastLogin: new Date()
        })
        .where(eq(customers.id, customer.id));
      
      return this.mapDatabaseCustomerToModel(customer);
    } catch (error) {
      console.error('Error validating customer credentials:', error);
      return null;
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
