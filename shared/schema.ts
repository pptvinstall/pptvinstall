import { z } from 'zod';
import { pgTable, serial, text, varchar, timestamp, boolean, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';

// Contact form schema
export const contactMessageSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  message: z.string().min(10, "Message must be at least 10 characters")
});

// Create insert schema for contact messages
export const insertContactMessageSchema = contactMessageSchema;

// Booking schema
export const bookingSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  streetAddress: z.string().min(2, "Street address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits"),
  notes: z.string().optional(),
  serviceType: z.string(),
  preferredDate: z.string(),
  appointmentTime: z.string(),
  status: z.enum(['active', 'cancelled', 'completed']).optional().default('active'),
  pricingTotal: z.number().optional(),
  pricingBreakdown: z.any().optional()
});

// Business hours schema
export const businessHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
  startTime: z.string(), // Format: "HH:MM AM/PM"
  endTime: z.string(),   // Format: "HH:MM AM/PM"
  isAvailable: z.boolean().default(true)
});

// Create insert schema for bookings and business hours
export const insertBookingSchema = bookingSchema;
export const insertBusinessHoursSchema = businessHoursSchema;

// Define database schema using Drizzle
export const bookings = pgTable('bookings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  streetAddress: varchar('street_address', { length: 255 }).notNull(),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(),
  zipCode: varchar('zip_code', { length: 5 }).notNull(),
  notes: text('notes'),
  serviceType: text('service_type').notNull(),
  preferredDate: varchar('preferred_date', { length: 50 }).notNull(),
  appointmentTime: varchar('appointment_time', { length: 20 }).notNull(),
  status: varchar('status', { length: 20 }).default('active'),
  pricingTotal: text('total_price'),
  pricingBreakdown: text('detailed_services'),
  createdAt: timestamp('created_at').defaultNow()
});

// Business hours table
export const businessHours = pgTable('business_hours', {
  id: serial('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull(), // 0 = Sunday, 6 = Saturday
  startTime: varchar('start_time', { length: 20 }).notNull(), // Format: "HH:MM AM/PM"
  endTime: varchar('end_time', { length: 20 }).notNull(),     // Format: "HH:MM AM/PM"
  isAvailable: boolean('is_available').notNull().default(true),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Create Drizzle insert schemas
export const insertBookingDrizzleSchema = createInsertSchema(bookings).omit({ 
  id: true,
  createdAt: true 
});

export const insertBusinessHoursDrizzleSchema = createInsertSchema(businessHours).omit({
  id: true,
  updatedAt: true
});

// Export types for TypeScript
export type ContactMessage = z.infer<typeof contactMessageSchema> & {
  id?: string;
  createdAt?: string;
};

export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;

export type Booking = z.infer<typeof bookingSchema> & {
  id?: string;
  createdAt?: string;
};

export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type BusinessHours = z.infer<typeof businessHoursSchema> & {
  id?: number;
  updatedAt?: string;
};

export type InsertBusinessHours = z.infer<typeof insertBusinessHoursSchema>;

// Export Drizzle types
export type BookingSelect = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;
export type BusinessHoursSelect = typeof businessHours.$inferSelect;
export type BusinessHoursInsert = typeof businessHours.$inferInsert;