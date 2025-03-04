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
  const serviceBreakdown = [];
  let tvCount = 0;

  // First pass to count TVs for multi-TV discount
  serviceParts.forEach(part => {
    if (part.includes('TV')) {
      const tvMatch = part.match(/(\d+)\s*TV/);
      tvCount += tvMatch ? parseInt(tvMatch[1]) : 1;
    }
  });

  for (const part of serviceParts) {
    const trimmedPart = part.trim();

    // Handle Smart Home Devices with specific subcategories
    if (trimmedPart.match(/(\d+)\s*Smart/i)) {
      const count = parseInt(trimmedPart.match(/(\d+)/)[1]);

      // Create a parent section for smart devices
      const smartDevicesSection = {
        title: "Smart Home Installation",
        items: [
          {
            label: `Base Installation (${count} ${count === 1 ? 'unit' : 'units'})`,
            price: 75 * count
          }
        ]
      };

      services.push(`Smart Device Installation (${count} ${count === 1 ? 'unit' : 'units'})`);
      serviceBreakdown.push(smartDevicesSection);
      totalPrice += 75 * count;
    }

    // Handle Smart Doorbell as a separate category
    if (trimmedPart.includes('Doorbell')) {
      const hasBrick = trimmedPart.toLowerCase().includes('brick');
      const title = "Smart Doorbell Installation";
      services.push(title + (hasBrick ? ' (Brick Surface)' : ''));

      const items = [
        {
          label: 'Smart Doorbell Base Installation',
          price: 75
        }
      ];

      if (hasBrick) {
        items.push({
          label: 'Brick Surface Installation Fee',
          price: 10
        });
        totalPrice += 10;
      }

      serviceBreakdown.push({ title, items });
      totalPrice += 75;
    }

    // Handle Floodlight Camera as a separate category
    if (trimmedPart.includes('Floodlight')) {
      const title = "Floodlight Camera Installation";
      services.push(title);

      serviceBreakdown.push({
        title,
        items: [
          {
            label: 'Floodlight Camera Base Installation',
            price: 100
          }
        ]
      });
      totalPrice += 100;
    }

    // Handle Smart Camera as a separate category
    if (trimmedPart.includes('Camera') && !trimmedPart.includes('Floodlight')) {
      const heightMatch = trimmedPart.match(/height-(\d+)/);
      const mountHeight = heightMatch ? parseInt(heightMatch[1]) : 8;
      const title = "Smart Camera Installation";
      const description = mountHeight > 8 ? ` (${mountHeight}ft height)` : '';

      services.push(title + description);

      const items = [
        {
          label: 'Smart Camera Base Installation',
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

      serviceBreakdown.push({
        title: title + description,
        items
      });
      totalPrice += 75;
    }

    // Handle TV installations
    if (trimmedPart.includes('TV')) {
      const tvMatch = trimmedPart.match(/(\d+)\s*TV/);
      const count = tvMatch ? parseInt(tvMatch[1]) : 1;
      const isLarge = trimmedPart.toLowerCase().includes('56"') || trimmedPart.toLowerCase().includes('larger');
      const hasOutlet = trimmedPart.toLowerCase().includes('outlet');
      const hasFireplace = trimmedPart.toLowerCase().includes('fireplace');
      const mountType = trimmedPart.toLowerCase().includes('fixed') ? 'Fixed Mount' :
                       trimmedPart.toLowerCase().includes('tilt') ? 'Tilt Mount' :
                       trimmedPart.toLowerCase().includes('full-motion') ? 'Full-Motion Mount' : 'Standard Mount';

      for (let i = 0; i < count; i++) {
        const title = `TV Installation ${i + 1}`;
        let description = `${isLarge ? '56" or larger' : '32"-55"'}`;
        if (hasFireplace) description += ' - Above Fireplace';
        if (mountType !== 'Standard Mount') description += ` with ${mountType}`;

        services.push(`${title} (${description})`);

        const items = [
          {
            label: 'TV Mounting Base Installation',
            price: 100
          }
        ];

        if (mountType !== 'Standard Mount') {
          const mountPrice = isLarge ? 
            (mountType === 'Fixed Mount' ? 60 : 
             mountType === 'Tilt Mount' ? 70 : 100) :
            (mountType === 'Fixed Mount' ? 40 : 
             mountType === 'Tilt Mount' ? 50 : 80);

          items.push({
            label: `${mountType} Installation`,
            price: mountPrice
          });
          totalPrice += mountPrice;
        }

        if (hasOutlet) {
          items.push({
            label: 'Outlet Relocation Service',
            price: 100
          });
          totalPrice += 100;
        }

        if (hasFireplace) {
          items.push({
            label: 'Fireplace Mounting Fee',
            price: 50
          });
          totalPrice += 50;
        }

        serviceBreakdown.push({
          title: `${title} (${description})`,
          items
        });
        totalPrice += 100;
      }
    }
  }

  // Apply multi-TV discount if applicable
  if (tvCount > 1) {
    services.push('Multi-TV Installation Discount');
    serviceBreakdown.push({
      title: 'Multi-TV Installation Discount',
      items: [
        {
          label: `Discount for ${tvCount} TVs`,
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

  app.get("/api/bookings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`Fetching booking details for ID: ${id}`);

      const booking = await storage.getBooking(parseInt(id));
      console.log("Raw booking data from database:", booking);

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Parse service type to get service breakdown and pricing
      console.log("Parsing service type:", booking.serviceType);
      const { services, price, serviceBreakdown } = parseServiceType(booking.serviceType);
      console.log("Parsed services:", services);
      console.log("Service breakdown:", JSON.stringify(serviceBreakdown, null, 2));

      // Create an enhanced booking object with all required fields
      const enhancedBooking = {
        ...booking,
        id: parseInt(id), // Explicitly include ID as a number
        detailedServices: JSON.stringify({
          services,
          serviceBreakdown
        }),
        totalPrice: price.toString(),
        status: booking.status || 'active'
      };

      console.log("Enhanced booking details being sent:", JSON.stringify(enhancedBooking, null, 2));
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
        preferredDate: req.body.preferredDate,
        preferredTime: req.body.preferredTime
      }, null, 2));

      const data = bookingSchema.parse(req.body);

      // Parse services and calculate price
      console.log("Parsing service type:", data.serviceType);
      const { services, price, serviceBreakdown } = parseServiceType(data.serviceType);
      console.log("Parsed services:", services);
      console.log("Service breakdown:", JSON.stringify(serviceBreakdown, null, 2));

      // Create the booking data object
      const bookingData = {
        ...data,
        detailedServices: JSON.stringify({
          services,
          serviceBreakdown
        }),
        totalPrice: price.toString()
      };

      console.log("Prepared booking data:", JSON.stringify(bookingData, null, 2));

      try {
        // Create the booking in the database
        const booking = await storage.createBooking(bookingData);
        console.log("Booking created successfully:", booking.id);

        // Format date for email
        const formattedDate = new Date(data.preferredDate).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        // Send confirmation email
        const emailResult = await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: data.email,
          subject: "Your Installation Booking Confirmation - Picture Perfect TV Install",
          text: generateEmailText(data, services, serviceBreakdown, price, formattedDate, data.preferredTime),
          html: generateEmailTemplate(data, services, serviceBreakdown, price, formattedDate, data.preferredTime),
          icalEvent: {
            filename: 'installation-appointment.ics',
            method: 'REQUEST',
            content: generateCalendarEvent(data, services, serviceBreakdown, price)
          }
        });

        console.log("Confirmation email sent:", emailResult.messageId);

        res.json(booking);
      } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      res.status(400).json({
        error: "Invalid booking data",
        details: process.env.NODE_ENV === 'development' ? errorMessage : "Failed to create booking"
      });
    }
  });

  function generateEmailText(data, services, serviceBreakdown, price, formattedDate, preferredTime) {
    return `
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
${formattedDate} at ${preferredTime}

Installation Address
------------------
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

Contact Information
-----------------
${data.name}
${data.email}
${data.phone}

${data.notes ? `Additional Notes
--------------
${data.notes}\n\n` : ''}

Note: Deposit is required to secure your booking and will be deducted from the total amount.
`;
  }

  // Update the generateEmailTemplate function
  function generateEmailTemplate(data, services, serviceBreakdown, price, formattedDate, preferredTime) {
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
      border-radius: 8px;
      padding: 16px;
      background: #fff;
      border: 1px solid #e5e7eb;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #111;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    .service-item {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .service-title {
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 8px;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
      padding-left: 16px;
    }
    .total-row {
      font-weight: 600;
      font-size: 18px;
      margin-top: 16px;
      padding: 16px;
      background: #f0f9ff;
      border-radius: 8px;
      border: 1px solid #bfdbfe;
    }
    .deposit-note {
      margin-top: 16px;
      color: #666;
      font-size: 14px;
      font-style: italic;
      background: #f8f9fa;
      padding: 12px;
      border-radius: 6px;
      border: 1px dashed #94a3b8;
    }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-title">Selected Services</div>
    ${serviceBreakdown.map(section => `
      <div class="service-item">
        <div class="service-title">${section.title}</div>
        ${section.items.map(item => `
          <div class="price-row">
            <span>${item.label}</span>
            <span>${formatPrice(item.price)}</span>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="total-row price-row">
      <span>Total</span>
      <span>${formatPrice(price)}</span>
    </div>

    <div class="deposit-note">
      A deposit of ${formatPrice(75)} is required to secure your booking and will be deducted from the total amount.
    </div>
  </div>

  <div class="section">
    <div class="section-title">Appointment Details</div>
    <div style="font-size: 18px; font-weight: 500; color: #2563eb;">
      ${formattedDate} at ${preferredTime}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Installation Address</div>
    <div>${data.streetAddress}</div>
    ${data.addressLine2 ? `<div>${data.addressLine2}</div>` : ''}
    <div>${data.city}, ${data.state} ${data.zipCode}</div>
  </div>

  <div class="section">
    <div class="section-title">Contact Information</div>
    <div style="margin-bottom: 4px;"><strong>Name:</strong> ${data.name}</div>
    <div style="margin-bottom: 4px;"><strong>Email:</strong> ${data.email}</div>
    <div style="margin-bottom: 4px;"><strong>Phone:</strong> ${data.phone}</div>
  </div>

  ${data.notes ? `
  <div class="section">
    <div class="section-title">Additional Notes</div>
    <div style="background: #f8f9fa; padding: 12px; border-radius: 6px;">${data.notes}</div>
  </div>
  ` : ''}

  <div class="section" style="background: #f8f9fa;">
    <div style="text-align: center; color: #64748b;">
      <div style="font-weight: 600; margin-bottom: 8px;">Business Hours</div>
      <div>Monday-Friday: 6:30PM-10:30PM</div>
      <div>Saturday-Sunday: 11AM-7PM</div>
      <div style="margin-top: 12px;">Questions? Call 404-702-4748</div>
    </div>
  </div>
</body>
</html>`;
  }

  function generateCalendarEvent(data, services, serviceBreakdown, price) {
    const dateTime = new Date(data.preferredDate);
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
    return generateICalendarEvent(dateTime, 120, eventSummary, eventDescription, eventLocation);
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
        preferredTime: req.body.preferredTime,
        notes: req.body.notes,
        status: req.body.status
      });

      if (updatedBooking) {
        // Send email notification about the changes
        const changes = [];
        if (existingBooking.preferredDate !== updatedBooking.preferredDate) {
          changes.push(`Date: ${new Date(existingBooking.preferredDate).toLocaleDateString()} → ${new Date(updatedBooking.preferredDate).toLocaleDateString()}`);
        }
        if (existingBooking.preferredTime !== updatedBooking.preferredTime) {
          changes.push(`Time: ${existingBooking.preferredTime} → ${updatedBooking.preferredTime}`);
        }
        if (existingBooking.serviceType !== updatedBooking.serviceType) {
          changes.push(`Services: ${existingBooking.serviceType} → ${updatedBooking.serviceType}`);
        }

        const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .section {
      margin-bottom: 24px;
      border-radius: 8px;
      padding: 16px;
      background: #fff;
      border: 1px solid #e5e7eb;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #111;
    }
    .change-item {
      background: #f0f9ff;
      padding: 12px;
      margin-bottom: 8px;
      border-radius: 6px;
      border: 1px solid #bfdbfe;
    }
    .button {
      display: inline-block;
      padding: 12px 20px;
      margin: 8px;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 500;
    }
    .accept {
      background: #22c55e;
      color: white;
    }
    .modify {
      background: #3b82f6;
      color: white;
    }
  </style>
</head>
<body>
  <div class="section">
    <div class="section-title">Booking Update Notification</div>
    <p>Your booking has been updated with the following changes:</p>
    ${changes.map(change => `<div class="change-item">${change}</div>`).join('')}
  </div>

  <div class="section">
    <div class="section-title">Updated Appointment Details</div>
    <div>Date: ${new Date(updatedBooking.preferredDate).toLocaleDateString()}</div>
    <div>Time: ${updatedBooking.preferredTime}</div>
    <div>Services: ${updatedBooking.serviceType}</div>
    <div style="margin-top: 16px;">
      <strong>Installation Address:</strong><br>
      ${updatedBooking.streetAddress}<br>
      ${updatedBooking.addressLine2 ? updatedBooking.addressLine2 + '<br>' : ''}
      ${updatedBooking.city}, ${updatedBooking.state} ${updatedBooking.zipCode}
    </div>
  </div>

  <div class="section" style="text-align: center;">
    <p>Please review these changes and let us know if they work for you:</p>
    <a href="${process.env.SITE_URL}/booking/accept/${updatedBooking.id}" class="button accept">Accept Changes</a>
    <a href="${process.env.SITE_URL}/booking/modify/${updatedBooking.id}" class="button modify">Modify Booking</a>
  </div>

  <div class="section" style="background: #f8f9fa;">
    <div style="text-align: center; color: #64748b;">
      <div style="font-weight: 600; margin-bottom: 8px;">Questions?</div>
      <div>Call us at 404-702-4748</div>
      <div style="margin-top: 8px;">
        Business Hours:<br>
        Monday-Friday: 6:30PM-10:30PM<br>
        Saturday-Sunday: 11AM-7PM
      </div>
    </div>
  </div>
</body>
</html>`;

        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: updatedBooking.email,
          subject: "Your Booking Has Been Updated - Picture Perfect TV Install",
          html: emailTemplate
        });
      }

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
  // Add new revenue tracking endpoints
  app.get("/api/analytics/revenue", async (req, res) => {
    try {
      const allBookings = await storage.getAllBookings();

      // Calculate revenue by month and year
      const revenueByMonth = {};
      const revenueByYear = {};

      allBookings.forEach(booking => {
        if (booking.status === 'active' && booking.totalPrice) {
          const date = new Date(booking.preferredDate);
          const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
          const year = date.getFullYear().toString();

          const price = parseFloat(booking.totalPrice);
          if (!isNaN(price)) {
            revenueByMonth[month] = (revenueByMonth[month] || 0) + price;
            revenueByYear[year] = (revenueByYear[year] || 0) + price;
          }
        }
      });

      // Calculate total revenue
      const totalRevenue = Object.values(revenueByMonth).reduce((sum, val) => sum + val, 0);

      // Get current month's revenue
      const currentMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
      const currentMonthRevenue = revenueByMonth[currentMonth] || 0;

      // Get current year's revenue
      const currentYear = new Date().getFullYear().toString();
      const currentYearRevenue = revenueByYear[currentYear] || 0;

      res.json({
        totalRevenue,
        currentMonthRevenue,
        currentYearRevenue,
        revenueByMonth,
        revenueByYear
      });
    } catch (error) {
      console.error('Error fetching revenue analytics:', error);
      res.status(500).json({ error: "Failed to fetch revenue analytics" });
    }
  });

  // Add endpoint to get booking history
  app.get("/api/bookings/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const booking = await storage.getBooking(parseInt(id));

      if (!booking) {
        return res.status(404).json({ error: "Booking not found" });
      }

      // Get booking history (status changes, updates, etc.)
      const history = await storage.getBookingHistory(parseInt(id));

      res.json({
        booking,
        history
      });
    } catch (error) {
      console.error('Error fetching booking history:', error);
      res.status(500).json({ error: "Failed to fetch booking history" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}