
import { z } from 'zod';

// Contact form schema
export const contactMessageSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  message: z.string().min(10)
});

// Booking schema
export const bookingSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  streetAddress: z.string().min(2),
  addressLine2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  zipCode: z.string().min(5),
  notes: z.string().optional(),
  serviceType: z.string(),
  preferredDate: z.string(),
  appointmentTime: z.string()
});

// Export types for TypeScript
export type ContactMessage = z.infer<typeof contactMessageSchema> & {
  id?: number;
  createdAt?: string;
};

export type Booking = z.infer<typeof bookingSchema> & {
  id?: number;
  createdAt?: string;
};
