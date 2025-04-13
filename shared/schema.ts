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
  name: z.string().min(2, "Name must be at least 2 characters").nullable(),
  email: z.string().email("Please enter a valid email address").nullable(),
  phone: z.string()
    .transform(val => val?.replace(/\D/g, '') || '')
    .refine(val => val.length >= 10 && val.length <= 15, "Phone number must be at least 10 digits"),
  streetAddress: z.string().min(2, "Street address is required"),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits"),
  notes: z.string().optional(),
  serviceType: z.string(),
  preferredDate: z.string(),
  appointmentTime: z.string(),
  status: z.enum(['active', 'cancelled', 'completed', 'scheduled']).optional().default('active'),
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
  createdAt: timestamp('created_at').defaultNow(),
  // Consent to receiving notifications
  consentToContact: boolean('consent_to_contact').default(false),
  // Field for cancellation reason
  cancellationReason: text('cancellation_reason')
});

// Booking archives table - keeps record of deleted bookings
export const bookingArchives = pgTable('booking_archives', {
  id: serial('id').primaryKey(),
  originalId: integer('original_id'), // Original booking ID
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
  status: varchar('status', { length: 20 }),
  pricingTotal: text('total_price'),
  pricingBreakdown: text('detailed_services'),
  tvSize: varchar('tv_size', { length: 20 }),
  mountType: varchar('mount_type', { length: 50 }),
  wallMaterial: varchar('wall_material', { length: 50 }),
  specialInstructions: text('special_instructions'),
  originalCreatedAt: timestamp('original_created_at'), // When the booking was created
  archivedAt: timestamp('archived_at').defaultNow(), // When the booking was archived
  archiveReason: varchar('archive_reason', { length: 50 }), // Why was it archived: 'cancelled', 'deleted', etc.
  archiveNote: text('archive_note') // Additional notes about archiving
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

// Push subscription schema
export const pushSubscriptionSchema = z.object({
  endpoint: z.string(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
});

// Notification settings schema
export const notificationSettingsSchema = z.object({
  bookingConfirmation: z.boolean().default(true),
  reminderDay: z.boolean().default(true),
  reminderHour: z.boolean().default(true),
  marketing: z.boolean().default(false)
});

// Customer schema
export const customerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string()
    .transform(val => val.replace(/\D/g, '')) // Remove all non-digits
    .refine(val => val.length >= 7 && val.length <= 15, "Please enter a valid phone number"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  streetAddress: z.string().min(2, "Street address is required").optional(),
  addressLine2: z.string().optional(),
  city: z.string().min(2, "City is required").optional(),
  state: z.string().min(2, "State is required").optional(),
  zipCode: z.string().min(5, "Zip code must be at least 5 digits").optional(),
  loyaltyPoints: z.number().default(0),
  memberSince: z.string().optional(),
  // Push notification fields
  pushSubscription: pushSubscriptionSchema.optional(),
  notificationsEnabled: z.boolean().default(false).optional(),
  notificationSettings: notificationSettingsSchema.optional()
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
  passwordResetExpires: timestamp('password_reset_expires'),
  // Push notification fields
  pushSubscription: jsonb('push_subscription'),
  notificationsEnabled: boolean('notifications_enabled').default(false),
  notificationSettings: jsonb('notification_settings').default({
    bookingConfirmation: true,
    reminderDay: true,
    reminderHour: true,
    marketing: false
  })
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

// Push notification settings type
export type NotificationSettings = {
  bookingConfirmation: boolean;
  reminderDay: boolean;
  reminderHour: boolean;
  marketing: boolean;
};

// Push subscription type
export type PushSubscription = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

// Export types
export type Customer = z.infer<typeof customerSchema> & {
  id?: number;
  memberSince?: string;
  lastLogin?: string;
  verificationToken?: string;
  isVerified?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: string;
  // Push notification fields
  pushSubscription?: PushSubscription;
  notificationsEnabled?: boolean;
  notificationSettings?: NotificationSettings;
};

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

// Booking archive types
export const bookingArchiveSchema = z.object({
  originalId: z.number().nullable(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  streetAddress: z.string(),
  addressLine2: z.string().nullable().optional(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string(),
  notes: z.string().nullable().optional(),
  serviceType: z.string(),
  preferredDate: z.string(),
  appointmentTime: z.string(),
  status: z.string().nullable().optional(),
  pricingTotal: z.string().nullable().optional(),
  pricingBreakdown: z.string().nullable().optional(),
  tvSize: z.string().nullable().optional(),
  mountType: z.string().nullable().optional(),
  wallMaterial: z.string().nullable().optional(),
  specialInstructions: z.string().nullable().optional(),
  archiveReason: z.string().nullable(),
  archiveNote: z.string().nullable().optional()
});

export type BookingArchive = z.infer<typeof bookingArchiveSchema> & {
  id?: number;
  originalCreatedAt?: string | null;
  archivedAt?: string | null;
};

export const insertBookingArchiveSchema = bookingArchiveSchema;
export type InsertBookingArchive = z.infer<typeof insertBookingArchiveSchema>;

// Export Drizzle types
export type BookingSelect = typeof bookings.$inferSelect;
export type BookingInsert = typeof bookings.$inferInsert;
export type BookingArchiveSelect = typeof bookingArchives.$inferSelect;
export type BookingArchiveInsert = typeof bookingArchives.$inferInsert;
export type BusinessHoursSelect = typeof businessHours.$inferSelect;
export type BusinessHoursInsert = typeof businessHours.$inferInsert;
export type CustomerSelect = typeof customers.$inferSelect;
export type CustomerInsert = typeof customers.$inferInsert;

// System settings schema
export const systemSettingsSchema = z.object({
  bookingBufferHours: z.number().min(0).max(48).default(2), // Default 2 hours buffer
  name: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional()
});

export const insertSystemSettingsSchema = systemSettingsSchema;

// System settings table
export const systemSettings = pgTable('system_settings', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 64 }).notNull().unique(),
  value: jsonb('value').notNull(),
  description: text('description'),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertSystemSettingsDrizzleSchema = createInsertSchema(systemSettings).omit({ 
  id: true,
  updatedAt: true
});

export type SystemSettings = z.infer<typeof systemSettingsSchema> & {
  id?: number;
  updatedAt?: string;
};

export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;
export type SystemSettingsSelect = typeof systemSettings.$inferSelect;
export type SystemSettingsInsert = typeof systemSettings.$inferInsert;

// Promotion schema
export const promotionSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  linkText: z.string().optional(),
  linkUrl: z.string().optional(),
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  priority: z.number().optional().default(0),
  isActive: z.boolean().optional().default(true)
});

export const insertPromotionSchema = promotionSchema;

// Promotions table
export const promotions = pgTable('promotions', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  linkText: varchar('link_text', { length: 100 }),
  linkUrl: varchar('link_url', { length: 255 }),
  backgroundColor: varchar('background_color', { length: 50 }),
  textColor: varchar('text_color', { length: 50 }),
  startDate: varchar('start_date', { length: 50 }),
  endDate: varchar('end_date', { length: 50 }),
  priority: integer('priority').default(0),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertPromotionDrizzleSchema = createInsertSchema(promotions).omit({ 
  id: true,
  createdAt: true,
  updatedAt: true
});

export type Promotion = z.infer<typeof promotionSchema> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type InsertPromotion = z.infer<typeof insertPromotionSchema>;
export type PromotionSelect = typeof promotions.$inferSelect;
export type PromotionInsert = typeof promotions.$inferInsert;