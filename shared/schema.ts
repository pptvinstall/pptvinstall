import { z } from 'zod';

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
  appointmentTime: z.string()
});

// Create insert schema for bookings
export const insertBookingSchema = bookingSchema;

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