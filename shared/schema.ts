import { pgTable, text, serial, timestamp, varchar, integer, jsonb, decimal, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Add booking history table
export const bookingHistory = pgTable("booking_history", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: varchar("changed_by", { length: 100 }),
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  changeType: varchar("change_type", { length: 50 }).notNull(), // 'update', 'status_change', etc.
  notes: text("notes")
});

// Create the insert schema for booking history
export const bookingHistorySchema = createInsertSchema(bookingHistory).omit({
  id: true,
  changedAt: true
});

// Add pricing configuration tables
export const pricingConfig = pgTable("pricing_config", {
  id: serial("id").primaryKey(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  additionalFees: jsonb("additional_fees"), // For fees like brick surface, height
  serviceNotes: text("service_notes"),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 100 })
});

export const pricingRules = pgTable("pricing_rules", {
  id: serial("id").primaryKey(),
  ruleName: varchar("rule_name", { length: 100 }).notNull(),
  ruleType: varchar("rule_type", { length: 50 }).notNull(), // e.g., 'multi_device_discount'
  ruleValue: decimal("rule_value", { precision: 10, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by", { length: 100 })
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  serviceType: varchar("service_type", { length: 100 }).notNull(),
  previousPrice: decimal("previous_price", { precision: 10, scale: 2 }).notNull(),
  newPrice: decimal("new_price", { precision: 10, scale: 2 }).notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  changedBy: varchar("changed_by", { length: 100 }),
  notes: text("notes")
});

// Create insert schemas for new tables
export const pricingConfigSchema = createInsertSchema(pricingConfig).omit({
  id: true,
  updatedAt: true
});

export const pricingRulesSchema = createInsertSchema(pricingRules).omit({
  id: true,
  updatedAt: true
});

export const priceHistorySchema = createInsertSchema(priceHistory).omit({
  id: true,
  changedAt: true
});

// Export types for new tables
export type PricingConfig = typeof pricingConfig.$inferSelect;
export type InsertPricingConfig = z.infer<typeof pricingConfigSchema>;

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = z.infer<typeof pricingRulesSchema>;

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = z.infer<typeof priceHistorySchema>;

// Export types
export type BookingHistory = typeof bookingHistory.$inferSelect;
export type InsertBookingHistory = z.infer<typeof bookingHistorySchema>;

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow()
});

// Basic bookings table for storing appointment information
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  serviceType: varchar("service_type", { length: 255 }).notNull(),
  preferredDate: varchar("preferred_date", { length: 50 }).notNull(),
  preferredTime: varchar("preferred_time", { length: 20 }).notNull(),
  status: varchar("status", { length: 20 }).default('pending'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow()
});

// Create insert schema for validation
export const bookingSchema = createInsertSchema(bookings).omit({
  id: true,
  createdAt: true,
  status: true
});

// Export types for use in the application
export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof bookingSchema>;

export const contactMessageSchema = createInsertSchema(contactMessages).omit({
  id: true,
  createdAt: true
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = z.infer<typeof contactMessageSchema>;