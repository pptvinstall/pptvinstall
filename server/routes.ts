import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { contactMessageSchema, bookingSchema } from "@shared/schema";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER || "default@gmail.com",
    pass: process.env.GMAIL_PASS || "default_pass"
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/contact", async (req, res) => {
    try {
      const data = contactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(data);

      // Send email notification
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: process.env.ADMIN_EMAIL || "admin@example.com",
        subject: "New Contact Form Submission",
        text: `
          Name: ${data.name}
          Email: ${data.email}
          Phone: ${data.phone}
          Message: ${data.message}
        `
      });

      res.json(message);
    } catch (error) {
      res.status(400).json({ error: "Invalid form data" });
    }
  });

  app.post("/api/booking", async (req, res) => {
    try {
      const data = bookingSchema.parse(req.body);
      const booking = await storage.createBooking(data);

      // Format date and time for better readability
      const dateTime = new Date(data.preferredDate);
      const formattedDate = dateTime.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const formattedTime = dateTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });

      // Send booking confirmation with enhanced template
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: "📺 Your TV Mounting Appointment is Confirmed - Picture Perfect TV Install",
        text: `
Dear ${data.name},

Thank you for choosing Picture Perfect TV Install! We're excited to help you achieve the perfect TV setup. Here are your booking details:

📅 Appointment Details
------------------
Date: ${formattedDate}
Time: ${formattedTime}
Service Type: ${data.serviceType}
Contact Phone: ${data.phone}

${data.notes ? `📝 Your Notes\n${data.notes}\n\n` : ''}

⚡ Next Steps
-----------
1. We'll review your booking and contact you within 24 hours to confirm the exact appointment time
2. Our technician will call you on the day of service when they're on the way
3. Please ensure easy access to power outlets and clear the mounting area

🛠️ Preparation Tips
----------------
- Clear the area where you want the TV mounted
- Have your TV and any mounting brackets available
- Make note of any special requirements or concerns

⚠️ Need to Reschedule?
-------------------
No problem! Simply call us at (555) 123-4567 or reply to this email at least 24 hours before your appointment.

We look forward to providing you with a professional TV mounting experience!

Best regards,
The Picture Perfect TV Install Team
        `
      });

      res.json(booking);
    } catch (error) {
      console.error('Booking error:', error);
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}