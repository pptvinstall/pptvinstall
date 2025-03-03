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

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/bookings", async (req, res) => {
    try {
      const bookings = await storage.getAllBookings();
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.get("/api/bookings/date/:date", async (req, res) => {
    try {
      const { date } = req.params;
      const bookings = await storage.getBookingsByDate(date);
      res.json(bookings);
    } catch (error) {
      console.error('Error fetching bookings by date:', error);
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  app.post("/api/contact", async (req, res) => {
    try {
      const data = contactMessageSchema.parse(req.body);
      const message = await storage.createContactMessage(data);

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

      // Calculate the estimated total
      let estimatedTotal = 0;
      const services = data.serviceType.split(' + ');
      const tvCount = parseInt(services[0]?.match(/\d+/)?.[0] || '0');
      const smartDeviceCount = parseInt(services[1]?.match(/\d+/)?.[0] || '0');

      estimatedTotal += tvCount * 100; // Base TV mounting price
      estimatedTotal += smartDeviceCount * 75; // Base smart device price

      // Send booking confirmation with enhanced template
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: "📺 Your Installation Appointment is Confirmed!",
        text: `
Dear ${data.name},

Thank you for choosing Picture Perfect TV Install! We're excited to help you transform your space. Here are your booking details:

📅 Appointment Details
------------------
Date: ${formattedDate}
Time: ${formattedTime}

🛠️ Services Booked
---------------
${data.serviceType}
Estimated Total: ${formatPrice(estimatedTotal)}*
* Final pricing may vary based on specific requirements and additional services selected during installation.

📍 Installation Address
------------------
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

📱 Contact Information
------------------
Phone: ${data.phone}
Email: ${data.email}

${data.notes ? `📝 Your Notes\n${data.notes}\n\n` : ''}

⚡ Next Steps
-----------
1. Our team will review your booking and contact you within 24 hours to:
   - Confirm exact appointment time
   - Discuss any specific mounting requirements
   - Answer any questions you may have

2. Before Installation Day:
   - Clear the mounting area
   - Ensure easy access to power outlets
   - Have your TV and any existing mounting brackets available

🔧 On Installation Day:
------------------
- Our technician will call when they're on the way
- We'll arrive within your scheduled time slot
- We'll review the installation plan with you before starting
- We accept payment after the installation is complete

⚠️ Need to Reschedule?
-------------------
No problem! Simply:
- Call us at (555) 123-4567
- Or reply to this email
Please give at least 24 hours notice.

❓ Questions?
----------
Reply to this email or call us anytime at (555) 123-4567. We're here to help!

Best regards,
The Picture Perfect TV Install Team

P.S. Don't forget to save our number (555) 123-4567 for easy access!
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