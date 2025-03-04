import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { contactMessageSchema, bookingSchema } from "@shared/schema";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pptvinstall@gmail.com",
    pass: process.env.GMAIL_PASS || "default_pass"
  }
});

function formatPrice(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function parseServiceType(serviceType: string): { services: string[], price: number, serviceBreakdown: {title:string, items: {label:string, price:number, isDiscount?:boolean}[]}[] } {
  const serviceParts = serviceType.split(' + ');
  let totalPrice = 0;
  const services = [];
  let tvCount = 0;

  // First pass to count TVs for multi-TV discount
  serviceParts.forEach(part => {
    if (part.includes('TV')) {
      const tvMatch = part.match(/(\d+)\s*TV/);
      tvCount += tvMatch ? parseInt(tvMatch[1]) : 1;
    }
  });

  const serviceBreakdown = [];

  for (const part of serviceParts) {
    if (part.includes('TV')) {
      const tvMatch = part.match(/(\d+)\s*TV/);
      const count = tvMatch ? parseInt(tvMatch[1]) : 1;
      const isLarge = part.toLowerCase().includes('56"') || part.toLowerCase().includes('larger');
      const hasOutlet = part.toLowerCase().includes('outlet');
      const hasFireplace = part.toLowerCase().includes('fireplace');
      const mountType = part.toLowerCase().includes('fixed') ? 'Fixed Mount' :
                       part.toLowerCase().includes('tilt') ? 'Tilt Mount' :
                       part.toLowerCase().includes('full-motion') ? 'Full-Motion Mount' : 'Standard Mount';

      // Create detailed service description
      let serviceDescription = `TV ${count} (${isLarge ? '56" or larger' : '32"-55"'})`;
      if (hasFireplace) serviceDescription += ' - Above Fireplace Installation';
      if (hasOutlet) serviceDescription += ' with Outlet Relocation';
      if (mountType !== 'Standard Mount') serviceDescription += ` with ${mountType}`;

      services.push(serviceDescription);

      serviceBreakdown.push({
        title: serviceDescription,
        items: [
          {
            label: 'Base Installation (standard)',
            price: 100
          }
        ]
      });

      // Add mount pricing if specified
      if (mountType !== 'Standard Mount') {
        const mountPrice = isLarge ? 
          (mountType === 'Fixed Mount' ? 60 : 
           mountType === 'Tilt Mount' ? 70 : 100) :
          (mountType === 'Fixed Mount' ? 40 : 
           mountType === 'Tilt Mount' ? 50 : 80);

        serviceBreakdown[serviceBreakdown.length - 1].items.push({
          label: mountType,
          price: mountPrice
        });
        totalPrice += mountPrice;
      }

      if (hasOutlet) {
        serviceBreakdown[serviceBreakdown.length - 1].items.push({
          label: 'Outlet Relocation',
          price: 100
        });
        totalPrice += 100;
      }

      totalPrice += 100; // Base installation
    }

    if (part.includes('Floodlight')) {
      const serviceDescription = 'Floodlight Camera Installation';
      services.push(serviceDescription);

      serviceBreakdown.push({
        title: serviceDescription,
        items: [
          {
            label: 'Base Installation (1 unit)',
            price: 100
          }
        ]
      });
      totalPrice += 100;
    }

    if (part.includes('Camera')) {
      const heightMatch = part.match(/height-(\d+)/);
      const mountHeight = heightMatch ? parseInt(heightMatch[1]) : 8;
      let serviceDescription = 'Smart Camera Installation';
      if (mountHeight > 8) {
        serviceDescription += ` at ${mountHeight}ft height`;
      }

      services.push(serviceDescription);

      const heightFee = Math.floor((mountHeight - 8) / 4) * 25;

      serviceBreakdown.push({
        title: serviceDescription,
        items: [
          {
            label: 'Base Installation (1 unit)',
            price: 75
          }
        ]
      });

      if (heightFee > 0) {
        serviceBreakdown[serviceBreakdown.length - 1].items.push({
          label: `Height Installation Fee (${mountHeight}ft)`,
          price: heightFee
        });
        totalPrice += heightFee;
      }

      totalPrice += 75;
    }
  }

  // Apply multi-TV discount if applicable
  if (tvCount > 1) {
    serviceBreakdown.push({
      title: 'Multi-TV Discount',
      items: [
        {
          label: 'Multi-TV Installation Discount',
          price: -10,
          isDiscount: true
        }
      ]
    });
    totalPrice -= 10;
  }

  return { services, price: totalPrice, serviceBreakdown };
}

function generateICalendarEvent(dateTime: Date, duration: number, summary: string, description: string, location: string): string {
  const start = dateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(dateTime.getTime() + duration * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  // Format description for calendar
  const formattedDescription = description
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\\n');

  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${summary}
DESCRIPTION:${formattedDescription}
LOCATION:${location}
END:VEVENT
END:VCALENDAR`;
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
      const { services, price, serviceBreakdown } = parseServiceType(data.serviceType);

      // Generate calendar event with detailed description
      const eventSummary = `TV Installation - Picture Perfect`;
      const eventDescription = `
Installation Details:
${services.map(service => `• ${service}`).join('\n')}

Price Breakdown:
${serviceBreakdown.map(section => 
  `${section.title}:
${section.items.map(item => `  - ${item.label}: ${formatPrice(item.price)}`).join('\n')}`
).join('\n\n')}

Total Price: ${formatPrice(price)}
Deposit Required: ${formatPrice(75)}

Location: ${data.streetAddress}, ${data.city}, ${data.state} ${data.zipCode}
Contact: ${data.phone}

Installation Notes:
${data.notes || 'No additional notes'}

Business Hours:
Mon-Fri: 6:30PM-10:30PM
Sat-Sun: 11AM-7PM

Contact: 404-702-4748`;

      const eventLocation = `${data.streetAddress}, ${data.city}, ${data.state} ${data.zipCode}`;
      const iCalEvent = generateICalendarEvent(dateTime, 120, eventSummary, eventDescription, eventLocation);

      const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .section {
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #111;
    }
    .subsection {
      margin-bottom: 16px;
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
    }
    .subsection-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 8px;
      color: #2563eb;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      padding-left: 16px;
    }
    .price {
      font-variant-numeric: tabular-nums;
    }
    .total-row {
      font-weight: 600;
      font-size: 18px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 2px solid #eee;
    }
    .deposit-note {
      margin-top: 16px;
      color: #666;
      font-size: 14px;
      font-style: italic;
    }
    .discount {
      color: #22c55e;
    }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-title">Selected Services</div>
    ${services.map(service => `<div>${service}</div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">Appointment</div>
    <div>${formattedDate} at ${formattedTime}</div>
  </div>

  <div class="section">
    <div class="section-title">Installation Address</div>
    <div>${data.streetAddress}</div>
    ${data.addressLine2 ? `<div>${data.addressLine2}</div>` : ''}
    <div>${data.city}, ${data.state} ${data.zipCode}</div>
  </div>

  <div class="section">
    <div class="section-title">Contact Information</div>
    <div>${data.name}</div>
    <div>${data.email}</div>
    <div>${data.phone}</div>
  </div>

  <div class="section">
    <div class="section-title">Price Breakdown</div>
    ${serviceBreakdown.map(section => `
      <div class="subsection">
        <div class="subsection-title">${section.title}</div>
        ${section.items.map(item => `
          <div class="price-row">
            <span>${item.label}</span>
            <span class="price${item.isDiscount ? ' discount' : ''}">${formatPrice(item.price)}</span>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="price-row total-row">
      <span>Total</span>
      <span class="price">${formatPrice(price)}</span>
    </div>

    <div class="price-row">
      <span>Required Deposit</span>
      <span class="price">${formatPrice(75)}</span>
    </div>

    <div class="deposit-note">
      Deposit is required to secure your booking and will be deducted from the total amount.
    </div>
  </div>

  ${data.notes ? `
  <div class="section">
    <div class="section-title">Additional Notes</div>
    <div>${data.notes}</div>
  </div>
  ` : ''}
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: "Your Installation Booking Confirmation - Picture Perfect TV Install",
        text: `
Selected Services
----------------
${services.join('\n')}

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
${serviceBreakdown.map(section => `
${section.title}
${section.items.map(item => 
  `${item.label}: ${formatPrice(item.price)}`
).join('\n')}`
).join('\n\n')}

Total: ${formatPrice(price)}
Required Deposit: ${formatPrice(75)}

Note: Deposit is required to secure your booking and will be deducted from the total amount.
`,
        html: htmlTemplate,
        icalEvent: {
          filename: 'installation-appointment.ics',
          method: 'REQUEST',
          content: iCalEvent
        }
      });

      res.json(booking);
    } catch (error) {
      console.error('Booking error:', error);
      res.status(400).json({ error: "Invalid booking data" });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body;

    // We'll need to set up this environment variable
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (password === adminPassword) {
      res.json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  });

  app.put("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      // Convert id to number and sanitize the update data
      const bookingId = parseInt(id);

      // Get existing booking first
      const existingBooking = await storage.getBooking(bookingId);
      if (!existingBooking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Update the booking with the new data
      const updatedBooking = await storage.updateBooking(bookingId, {
        name: req.body.name,
        email: req.body.email,
        phone: req.body.phone,
        streetAddress: req.body.streetAddress,
        addressLine2: req.body.addressLine2,
        city: req.body.city,
        state: req.body.state,
        zipCode: req.body.zipCode,
        serviceType: req.body.serviceType,
        preferredDate: req.body.preferredDate,
        notes: req.body.notes
      });

      res.json(updatedBooking);
    } catch (error) {
      console.error('Error updating booking:', error);
      res.status(400).json({ error: "Failed to update booking" });
    }
  });

  app.delete("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteBooking(parseInt(id));
      res.sendStatus(200);
    } catch (error) {
      console.error('Error deleting booking:', error);
      res.status(400).json({ error: "Failed to delete booking" });
    }
  });

  app.post("/api/bookings/:id/cancel", async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.updateBooking(parseInt(id), { 
        status: 'cancelled',
        cancellationReason: req.body.reason || 'Cancelled by admin'
      });

      // Send cancellation email to customer
      if (booking) {
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: booking.email,
          subject: "Your Installation Booking Has Been Cancelled",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h2>Booking Cancellation Notice</h2>
              <p>Dear ${booking.name},</p>
              <p>Your installation appointment scheduled for ${new Date(booking.preferredDate).toLocaleDateString()} has been cancelled.</p>
              ${req.body.reason ? `<p>Reason: ${req.body.reason}</p>` : ''}
              <p>If you would like to reschedule your installation, please visit our website or contact us directly.</p>
              <p>We apologize for any inconvenience this may have caused.</p>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
                <p>Questions? Contact us:</p>
                <p>Phone: 404-702-4748</p>
                <p>Business Hours:<br>
                Mon-Fri: 6:30PM-10:30PM<br>
                Sat-Sun: 11AM-7PM</p>
              </div>
            </div>
          `
        });
      }

      res.json(booking);
    } catch (error) {
      console.error('Error cancelling booking:', error);
      res.status(400).json({ error: "Failed to cancel booking" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}