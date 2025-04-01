import { z } from 'zod';
import { pgTable, serial, text, varchar, timestamp, boolean, integer, jsonb, uniqueIndex, json } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { relations } from 'drizzle-orm';

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
  pricingTotal: z.union([z.string(), z.number()]).optional(),
  pricingBreakdown: z.any().optional(),
  // Additional fields that we use in the admin panel
  tvSize: z.string().optional(),
  mountType: z.string().optional(),
  wallMaterial: z.string().optional(),
  specialInstructions: z.string().optional()
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
  // Additional fields for admin panel
  tvSize: varchar('tv_size', { length: 20 }),
  mountType: varchar('mount_type', { length: 50 }),
  wallMaterial: varchar('wall_material', { length: 50 }),
  specialInstructions: text('special_instructions'),
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

// Customer schema
export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  streetAddress: z.string().min(2, "Street address is required").optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required").optional(),
  state: z.string().min(2, "State is required").optional(),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits").optional(),
  loyaltyPoints: z.number().default(0),
  memberSince: z.string().optional()
});

export const insertCustomerSchema = customerSchema;

// Customers table
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }).notNull(),
  password: varchar('password', { length: 255 }).notNull(),
  streetAddress: varchar('street_address', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zipCode: varchar('zip_code', { length: 5 }),
  loyaltyPoints: integer('loyalty_points').default(0),
  memberSince: timestamp('member_since').defaultNow(),
  lastLogin: timestamp('last_login'),
  verificationToken: varchar('verification_token', { length: 100 }),
  isVerified: boolean('is_verified').default(false),
  passwordResetToken: varchar('password_reset_token', { length: 100 }),
  passwordResetExpires: timestamp('password_reset_expires')
}, (table) => {
  return {
    emailIdx: uniqueIndex('customers_email_idx').on(table.email)
  }
});

// Add customerId to bookings table
export const bookingsRelations = relations(bookings, ({ one }) => ({
  customer: one(customers, {
    fields: [bookings.email],
    references: [customers.email],
  })
}));

export const customersRelations = relations(customers, ({ many }) => ({
  bookings: many(bookings)
}));

// Create Drizzle insert schema for customers
export const insertCustomerDrizzleSchema = createInsertSchema(customers).omit({
  id: true,
  memberSince: true,
  lastLogin: true,
  verificationToken: true,
  isVerified: true,
  passwordResetToken: true,
  passwordResetExpires: true
});

// Export types
export type Customer = z.infer<typeof customerSchema> & {
  id?: number;
  memberSince?: string;
  lastLogin?: string;
  verificationToken?: string;
  isVerified?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: string;
};

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Export Drizzle types
export type BookingSelect = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;
export type BusinessHoursSelect = typeof businessHours.$inferSelect;
export type BusinessHoursInsert = typeof businessHours.$inferInsert;
export type CustomerSelect = typeof customers.$inferSelect;
export type CustomerInsert = typeof customers.$inferInsert;