import { pgTable, text, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  streetAddress: varchar("street_address", { length: 255 }).notNull(),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  zipCode: varchar("zip_code", { length: 5 }).notNull(),
  serviceType: varchar("service_type", { length: 255 }).notNull(),
  detailedServices: text("detailed_services"),  // JSON string of detailed services
  totalPrice: varchar("total_price", { length: 20 }), // Store calculated price
  preferredDate: varchar("preferred_date", { length: 50 }).notNull(),
  appointmentTime: varchar("appointment_time", { length: 20 }), // Store time separately
  notes: text("notes"),
  status: varchar("status", { length: 20 }).default('active'),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").defaultNow()
});

export const contactMessageSchema = createInsertSchema(contactMessages).omit({ 
  id: true,
  createdAt: true 
});

export const bookingSchema = createInsertSchema(bookings).omit({
  id: true, 
  createdAt: true,
  status: true,
  cancellationReason: true
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof contactMessageSchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof bookingSchema>;