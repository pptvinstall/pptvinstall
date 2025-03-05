
import { z } from 'zod';

// Contact form schema
export const contactMessageSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  message: z.string().min(10, { message: "Message must be at least 10 characters" })
});

// Export type for TypeScript
export type ContactMessage = z.infer<typeof contactMessageSchema>;
