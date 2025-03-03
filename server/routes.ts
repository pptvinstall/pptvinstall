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

function parseServiceType(serviceType: string): { services: string[], price: number } {
  const parts = serviceType.split(' + ');
  let totalPrice = 0;
  const services = [];

  for (const part of parts) {
    if (part.includes('TV')) {
      const count = parseInt(part.match(/\d+/)?.[0] || '1');
      services.push(`TV Installation (${count} unit${count > 1 ? 's' : ''})`);
      totalPrice += count * 100; // Base price for TV mounting
    }
    if (part.includes('Smart')) {
      const count = parseInt(part.match(/\d+/)?.[0] || '1');
      const type = part.includes('Doorbell') ? 'Smart Doorbell' :
                  part.includes('Floodlight') ? 'Floodlight' :
                  'Smart Camera';
      services.push(`${type} (${count} unit${count > 1 ? 's' : ''})`);
      totalPrice += count * (type === 'Floodlight' ? 100 : 75);
    }
  }

  return { services, price: totalPrice };
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

      // Parse appointment date and time
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

      // Parse services and calculate price
      const { services, price } = parseServiceType(data.serviceType);

      // Send booking confirmation with formatted template
      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: "Your Installation Booking Confirmation",
        text: `
Selected Services
----------------
${services.map(service => `• ${service}`).join('\n')}

Appointment
----------
${formattedDate} at ${formattedTime}

Contact Information
-----------------
${data.name}
${data.email}
${data.phone}

Installation Address
------------------
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

Price Breakdown
-------------
Base Installation: ${formatPrice(price)}
${services.map(service => {
  if (service.includes('TV')) {
    return `• TV Mount Installation: ${formatPrice(100)}`;
  } else if (service.includes('Doorbell')) {
    return `• Smart Doorbell Installation: ${formatPrice(75)}`;
  } else if (service.includes('Floodlight')) {
    return `• Floodlight Installation: ${formatPrice(100)}`;
  } else if (service.includes('Camera')) {
    return `• Smart Camera Installation: ${formatPrice(75)}`;
  }
}).join('\n')}

Total: ${formatPrice(price)}
Required Deposit: ${formatPrice(75)}

Additional Notes
--------------
${data.notes || 'No additional notes provided'}

Next Steps
---------
1. Our team will contact you within 24 hours to confirm your appointment
2. Please ensure the installation area is clear and accessible
3. Have your devices ready for installation

Questions?
---------
Call us at (555) 123-4567 or reply to this email.

Thank you for choosing Picture Perfect TV Install!
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