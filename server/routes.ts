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
    // Trim the part to ensure consistent detection
    const trimmedPart = part.trim();

    if (trimmedPart.includes('TV')) {
      const tvMatch = trimmedPart.match(/(\d+)\s*TV/);
      const count = tvMatch ? parseInt(tvMatch[1]) : 1;
      const isLarge = trimmedPart.toLowerCase().includes('56"') || trimmedPart.toLowerCase().includes('larger');
      const hasOutlet = trimmedPart.toLowerCase().includes('outlet');
      const hasFireplace = trimmedPart.toLowerCase().includes('fireplace');
      const mountType = trimmedPart.toLowerCase().includes('fixed') ? 'Fixed Mount' :
                       trimmedPart.toLowerCase().includes('tilt') ? 'Tilt Mount' :
                       trimmedPart.toLowerCase().includes('full-motion') ? 'Full-Motion Mount' : 'Standard Mount';

      // Create service title
      const title = `TV ${serviceBreakdown.filter(s => s.title.includes('TV')).length + 1} (${isLarge ? '56" or larger' : '32"-55"'})`;
      services.push(title);

      const items = [
        {
          label: 'Base Installation (standard)',
          price: 100
        }
      ];

      // Add mount pricing if specified
      if (mountType !== 'Standard Mount') {
        const mountPrice = isLarge ? 
          (mountType === 'Fixed Mount' ? 60 : 
           mountType === 'Tilt Mount' ? 70 : 100) :
          (mountType === 'Fixed Mount' ? 40 : 
           mountType === 'Tilt Mount' ? 50 : 80);

        items.push({
          label: mountType,
          price: mountPrice
        });
        totalPrice += mountPrice;
      }

      if (hasOutlet) {
        items.push({
          label: 'Outlet Relocation',
          price: 100
        });
        totalPrice += 100;
      }

      if (hasFireplace) {
        items.push({
          label: 'Fireplace Installation',
          price: 50
        });
        totalPrice += 50;
      }

      serviceBreakdown.push({ title, items });
      totalPrice += 100; // Base installation
    }

    // Smart Home Services parsing - note the use of trimmedPart
    else if (trimmedPart.includes('Smart Doorbell')) {
      const title = 'Smart Doorbell';
      const hasBrick = trimmedPart.toLowerCase().includes('brick');
      services.push(title);

      const items = [
        {
          label: 'Base Installation (1 unit)',
          price: 75
        }
      ];

      if (hasBrick) {
        items.push({
          label: 'Brick Installation',
          price: 10
        });
        totalPrice += 10;
      }

      serviceBreakdown.push({ title, items });
      totalPrice += 75;
    }

    else if (trimmedPart.includes('Floodlight') || trimmedPart.toLowerCase().includes('smart floodlight')) {
      const title = 'Smart Floodlight';
      services.push(title);

      serviceBreakdown.push({
        title,
        items: [
          {
            label: 'Base Installation (1 unit)',
            price: 100
          }
        ]
      });
      totalPrice += 100;
    }

    else if ((trimmedPart.includes('Smart Camera') || trimmedPart.toLowerCase().includes('camera')) && 
             !trimmedPart.includes('Floodlight') && !trimmedPart.toLowerCase().includes('floodlight')) {
      const heightMatch = trimmedPart.match(/height-(\d+)/);
      const mountHeight = heightMatch ? parseInt(heightMatch[1]) : 8;
      const title = 'Smart Camera';
      services.push(title);

      const items = [
        {
          label: 'Base Installation (1 unit)',
          price: 75
        }
      ];

      if (mountHeight > 8) {
        const heightFee = Math.floor((mountHeight - 8) / 4) * 25;
        items.push({
          label: `Height Installation Fee (${mountHeight}ft)`,
          price: heightFee
        });
        totalPrice += heightFee;
      }

      serviceBreakdown.push({ title, items });
      totalPrice += 75;
    }

    // Handle "Smart Home Services" general selection
    else if (trimmedPart.toLowerCase().includes('smart home service') || 
             trimmedPart.toLowerCase().includes('smart home installation')) {
      // This catches any smart home services that weren't caught by specific categories
      const title = 'Smart Home Installation';
      services.push(title);

      serviceBreakdown.push({
        title,
        items: [
          {
            label: 'Smart Home Base Installation',
            price: 75
          }
        ]
      });
      totalPrice += 75;
    }
  }

  // Apply multi-TV discount if applicable
  if (tvCount > 1) {
    services.push('Multi-TV Discount');
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

  // Make sure we have at least one service
  if (services.length === 0) {
    services.push('Standard Installation');
    serviceBreakdown.push({
      title: 'Standard Installation',
      items: [
        {
          label: 'Base Service',
          price: 75
        }
      ]
    });
    totalPrice += 75;
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

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(parseInt(id));

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Ensure the response has all expected fields for the frontend
      const enhancedBooking = {
        ...booking,
        // Provide defaults for potentially missing fields
        detailedServices: booking.detailedServices || JSON.stringify({
          services: [booking.serviceType],
          serviceBreakdown: [{
            title: booking.serviceType,
            items: [{ label: 'Service', price: 75 }]
          }]
        }),
        totalPrice: booking.totalPrice || "75",
        appointmentTime: booking.appointmentTime || new Date(booking.preferredDate).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        })
      };

      res.json(enhancedBooking);
    } catch (error) {
      console.error('Error fetching booking by ID:', error);
      res.status(500).json({ error: "Failed to fetch booking" });
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
      // Log the incoming request
      console.log("Received booking request:", JSON.stringify({
        name: req.body.name,
        email: req.body.email,
        serviceType: req.body.serviceType,
        preferredDate: req.body.preferredDate
      }));

      const data = bookingSchema.parse(req.body);

      // Ensure we have a valid date
      if (!data.preferredDate) {
        return res.status(400).json({
          error: "Missing required field",
          details: "Appointment date and time is required"
        });
      }

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
      console.log("Parsing service type:", data.serviceType);
      const { services, price, serviceBreakdown } = parseServiceType(data.serviceType);
      console.log("Parsed services:", services);
      console.log("Service breakdown:", JSON.stringify(serviceBreakdown, null, 2));

      try {
        // Prepare the booking data with all required fields
      const bookingData = {
        ...data,
        detailedServices: JSON.stringify({
          services,
          serviceBreakdown
        }),
        totalPrice: price.toString(),
        appointmentTime: formattedTime
      };
      
      console.log("Prepared booking data:", JSON.stringify(bookingData, null, 2));
      
      // Create the booking in the database with all fields
      const booking = await storage.createBooking(bookingData);

        // Generate calendar event
        const eventSummary = `TV/Smart Home Installation - Picture Perfect`;
        const eventDescription = `
Selected Services:
${serviceBreakdown.map(section => 
`${section.title}
${section.items.map(item => `- ${item.label}: ${formatPrice(item.price)}`).join('\n')}`
).join('\n\n')}

Total: ${formatPrice(price)}
Required Deposit: ${formatPrice(75)}

Installation Address:
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

Contact Information:
${data.name}
${data.phone}
${data.email}

${data.notes ? `Installation Notes:\n${data.notes}\n\n` : ''}

Business Hours:
Mon-Fri: 6:30PM-10:30PM
Sat-Sun: 11AM-7PM

Questions? Call 404-702-4748`;

        const eventLocation = `${data.streetAddress}, ${data.city}, ${data.state} ${data.zipCode}`;
        const iCalEvent = generateICalendarEvent(dateTime, 120, eventSummary, eventDescription, eventLocation);

        // Send confirmation email
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: data.email,
          subject: "Your Installation Booking Confirmation - Picture Perfect TV Install",
          text: `
Selected Services
----------------
${serviceBreakdown.map(section => 
`${section.title}
${section.items.map(item => `- ${item.label}: ${formatPrice(item.price)}`).join('\n')}`
).join('\n\n')}

Total: ${formatPrice(price)}
Required Deposit: ${formatPrice(75)}

Appointment
----------
${formattedDate} at ${formattedTime}

Installation Address
------------------
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

Contact Information
-----------------
${data.name}
${data.email}
${data.phone}

${data.notes ? `Additional Notes\n--------------\n${data.notes}\n\n` : ''}

Note: Deposit is required to secure your booking and will be deducted from the total amount.
`,
          html: generateEmailTemplate(data, services, serviceBreakdown, price, formattedDate, formattedTime),
          icalEvent: {
            filename: 'installation-appointment.ics',
            method: 'REQUEST',
            content: iCalEvent
          }
        });

        res.json(booking);
      } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.error('Database schema error. Please run migrations to update the schema.');
      }

      res.status(400).json({ 
        error: "Invalid booking data", 
        details: process.env.NODE_ENV === 'development' ? errorMessage : "Server encountered an error processing your booking."
      });
    }
  });

  function generateEmailTemplate(data, services, serviceBreakdown, price, formattedDate, formattedTime) {
    return `
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
      padding: 16px;
      background: #f0f9ff;
      border-radius: 8px;
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

    <div class="total-row price-row">
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

  ${data.notes ? `
  <div class="section">
    <div class="section-title">Additional Notes</div>
    <div>${data.notes}</div>
  </div>
  ` : ''}
</body>
</html>`;
  }

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
  });

  const httpServer = createServer(app);
  return httpServer;
}