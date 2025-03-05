import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { contactMessageSchema, bookingSchema } from "@shared/schema";
import nodemailer from "nodemailer";
import { 
  SMART_DEVICE_PRICES, 
  SERVICE_NOTES, 
  calculateMultiDeviceDiscount,
  type ServiceBreakdown,
  type PriceItem 
} from "@shared/pricing";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pptvinstall@gmail.com",
    pass: process.env.GMAIL_PASS || "default_pass"
  }
});

// Rename local formatPrice to avoid conflict
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

interface ParsedService {
  services: string[];
  price: number;
  serviceBreakdown: ServiceBreakdown[];
}

function parseServiceType(serviceType: string): ParsedService {
  const serviceParts = serviceType.split(' + ');
  let totalPrice = 0;
  const services: string[] = [];
  const serviceBreakdown: ServiceBreakdown[] = [];
  let deviceCount = 0;

  // First pass to count total devices for discount
  serviceParts.forEach(part => {
    const trimmedPart = part.trim();
    if (trimmedPart.includes('Smart Device') || trimmedPart.includes('Doorbell') || 
        trimmedPart.includes('Floodlight') || trimmedPart.includes('Camera')) {
      deviceCount += 1;
    }
  });

  for (const part of serviceParts) {
    const trimmedPart = part.trim();
    const smartDeviceMatch = trimmedPart.match(/Smart Device (\d+)/);
    
    // Handle multiple Smart Devices (e.g., "3 Smart Devices")
    const multiDeviceMatch = trimmedPart.match(/^(\d+)\s+Smart\s+Devices?$/i);
    if (multiDeviceMatch) {
      const count = parseInt(multiDeviceMatch[1], 10);
      deviceCount = count; // Set deviceCount explicitly
      
      const title = `${count} Smart Device Installation${count > 1 ? 's' : ''}`;
      services.push(title);
      
      const pricePerDevice = SMART_DEVICE_PRICES.DOORBELL.BASE;
      const itemPrice = pricePerDevice * count;
      
      serviceBreakdown.push({
        title,
        items: [
          {
            label: `Smart Device Installation (${count} units)`,
            price: itemPrice
          }
        ]
      });
      totalPrice += itemPrice;
    }
    // Handle individual Smart Device installations
    else if (smartDeviceMatch?.[1]) {
      const deviceNumber = smartDeviceMatch[1];
      const title = `Smart Device ${deviceNumber} Installation`;
      services.push(title);

      serviceBreakdown.push({
        title,
        items: [
          {
            label: `Smart Device ${deviceNumber} Installation`,
            price: SMART_DEVICE_PRICES.DOORBELL.BASE
          }
        ]
      });
      totalPrice += SMART_DEVICE_PRICES.DOORBELL.BASE;
    }

    // Handle Smart Doorbell
    if (trimmedPart.includes('Smart Doorbell')) {
      const hasBrick = trimmedPart.toLowerCase().includes('brick');
      const title = "Smart Doorbell Installation";
      services.push(title);

      const items: PriceItem[] = [
        {
          label: 'Smart Doorbell Installation',
          price: SMART_DEVICE_PRICES.DOORBELL.BASE,
          note: SERVICE_NOTES.DOORBELL
        }
      ];

      if (hasBrick) {
        items.push({
          label: 'Brick Surface Installation Fee',
          price: SMART_DEVICE_PRICES.DOORBELL.BRICK_SURFACE
        });
        totalPrice += SMART_DEVICE_PRICES.DOORBELL.BRICK_SURFACE;
      }

      serviceBreakdown.push({ title, items });
      totalPrice += SMART_DEVICE_PRICES.DOORBELL.BASE;
    }

    // Handle Floodlight Camera
    if (trimmedPart.includes('Floodlight')) {
      const title = "Floodlight Camera Installation";
      services.push(title);

      serviceBreakdown.push({
        title,
        items: [
          {
            label: 'Floodlight Camera Installation',
            price: SMART_DEVICE_PRICES.FLOODLIGHT.BASE,
            note: SERVICE_NOTES.FLOODLIGHT
          }
        ]
      });
      totalPrice += SMART_DEVICE_PRICES.FLOODLIGHT.BASE;
    }

    // Handle Smart Camera
    if (trimmedPart.includes('Camera') && !trimmedPart.includes('Floodlight')) {
      const heightMatch = trimmedPart.match(/height-(\d+)/);
      const mountHeight = heightMatch ? parseInt(heightMatch[1]) : 8;
      const title = "Smart Camera Installation";
      const description = mountHeight > 8 ? ` (${mountHeight}ft height)` : '';

      services.push(title + description);

      const items: PriceItem[] = [
        {
          label: 'Smart Camera Installation',
          price: SMART_DEVICE_PRICES.CAMERA.BASE
        }
      ];

      if (mountHeight > 8) {
        items.push({
          label: `Height Installation Fee (${mountHeight}ft)`,
          price: SMART_DEVICE_PRICES.CAMERA.HEIGHT_FEE,
          note: SERVICE_NOTES.CAMERA_HEIGHT
        });
        totalPrice += SMART_DEVICE_PRICES.CAMERA.HEIGHT_FEE;
      }

      serviceBreakdown.push({ title: title + description, items });
      totalPrice += SMART_DEVICE_PRICES.CAMERA.BASE;
    }
  }

  // Apply multi-device discount if applicable
  if (deviceCount > 1) {
    const discountAmount = calculateMultiDeviceDiscount(deviceCount);
    services.push('Multi-Device Installation Discount');
    serviceBreakdown.push({
      title: 'Multi-Device Installation Discount',
      items: [
        {
          label: `Discount for ${deviceCount} devices`,
          price: -discountAmount,
          isDiscount: true
        }
      ]
    });
    totalPrice -= discountAmount;
  }

  console.log("Service breakdown:", JSON.stringify(serviceBreakdown, null, 2));
  console.log("Total price:", totalPrice);
  return { services, price: totalPrice, serviceBreakdown };
}

interface EmailData {
  name: string;
  email: string;
  phone: string;
  streetAddress: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  notes?: string;
  preferredDate: string;
  preferredTime: string;
}

interface ServiceBreakdownSection {
  title: string;
  items: Array<{
    label: string;
    price: number;
    note?: string;
  }>;
}

function generateEmailText(
  data: EmailData,
  services: string[],
  serviceBreakdown: ServiceBreakdownSection[],
  price: number,
  formattedDate: string,
  preferredTime: string
): string {
  return `
Selected Services
----------------
${serviceBreakdown.map(section => 
`${section.title}
${section.items.map(item => `- ${item.label}: ${formatCurrency(item.price)}`).join('\n')}`
).join('\n\n')}

Total: ${formatCurrency(price)}

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
`;
}

interface RevenueAnalytics {
  totalRevenue: number;
  currentMonthRevenue: number;
  currentYearRevenue: number;
  revenueByMonth: Record<string, number>;
  revenueByYear: Record<string, number>;
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
  
  // New endpoint to fetch bookings by customer email
  app.get("/api/bookings/customer/:email", async (req, res) => {
    try {
      const { email } = req.params;
      console.log(`Fetching bookings for customer email: ${email}`);

      // Get all bookings for this customer email
      const customerBookings = await storage.getBookingsByEmail(email);
      console.log(`Found ${customerBookings.length} bookings for email ${email}`);

      // Process each booking to add service breakdown and pricing
      const enhancedBookings = customerBookings.map(booking => {
        const { services, price, serviceBreakdown } = parseServiceType(booking.serviceType);
        return {
          ...booking,
          detailedServices: JSON.stringify({
            services,
            serviceBreakdown
          }),
          totalPrice: price.toString(),
          status: booking.status || 'active'
        };
      });

      res.json(enhancedBookings);
    } catch (error) {
      console.error('Error fetching bookings by email:', error);
      res.status(500).json({ error: "Failed to fetch customer bookings" });
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

      // Validate the request data
      const data = bookingSchema.parse(req.body);

      // Parse services and calculate price
      console.log("Parsing service type:", data.serviceType);
      const { services, price, serviceBreakdown } = parseServiceType(data.serviceType);
      console.log("Parsed services:", services);
      console.log("Service breakdown:", JSON.stringify(serviceBreakdown, null, 2));

      // Prepare data for storage with defaults for status
      const bookingData = {
        ...data,
        detailedServices: JSON.stringify({
          services,
          serviceBreakdown
        }),
        totalPrice: price.toString(),
        status: 'active' // Default status
      };

      console.log("Prepared booking data:", JSON.stringify(bookingData, null, 2));

      // Create the booking in the database
      let booking;
      try {
        booking = await storage.createBooking(bookingData);
        console.log("Booking created successfully:", booking.id);
      } catch (dbError) {
        console.error('Database error creating booking:', dbError);
        return res.status(500).json({
          error: "Database error",
          message: "Failed to create booking in database"
        });
      }

      // Format date for email
      const formattedDate = new Date(data.preferredDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Send confirmation email
      try {
        const emailResult = await transporter.sendMail({
          from: process.env.GMAIL_USER || "noreply@pictureperfecttvinstall.com",
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
      } catch (emailError) {
        console.error('Error sending confirmation email:', emailError);
        // Don't fail the booking if email fails
      }

      // Return the created booking
      res.json(booking);

    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      // More descriptive error response
      res.status(400).json({
        error: "Failed to process booking",
        details: process.env.NODE_ENV === 'development' ? errorMessage : "Please check your booking information and try again"
      });
    }
  });

  function generateEmailText(data: EmailData, services: string[], serviceBreakdown: ServiceBreakdownSection[], price: number, formattedDate: string, preferredTime: string): string {
    return `
Selected Services
----------------
${serviceBreakdown.map(section => 
`${section.title}
${section.items.map(item => `- ${item.label}: ${formatCurrency(item.price)}`).join('\n')}`
).join('\n\n')}

Total: ${formatCurrency(price)}

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
`;
  }

  // Update the generateEmailTemplate function
  function generateEmailTemplate(data: EmailData, services: string[], serviceBreakdown: ServiceBreakdownSection[], price: number, formattedDate: string, preferredTime: string): string {
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
            <span>${formatCurrency(item.price)}</span>
          </div>
        `).join('')}
      </div>
    `).join('')}

    <div class="total-row price-row">
      <span>Total</span>
      <span>${formatCurrency(price)}</span>
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

  function generateCalendarEvent(data: EmailData, services: string[], serviceBreakdown: ServiceBreakdownSection[], price: number): string {
    const dateTime = new Date(data.preferredDate);
    const eventSummary = `TV/Smart Home Installation - Picture Perfect`;
    const eventDescription = `
Selected Services:
${serviceBreakdown.map(section => 
`${section.title}
${section.items.map(item => `- ${item.label}: ${formatCurrency(item.price)}`).join('\n')}`
).join('\n\n')}

Total: ${formatCurrency(price)}

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
      const currentMonth = new Date().toLocaleDateString('default', { month: 'long', year: 'numeric' });
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

  // Add new pricing admin routes
  app.get("/api/admin/pricing", async (req, res) => {
    try {
      console.log("Fetching all prices");
      const prices = await storage.getAllPrices();
      console.log("Retrieved prices:", prices);
      res.json(prices);
    } catch (error) {
      console.error('Error fetching prices:', error);
      res.status(500).json({ error: "Failed to fetch pricing configuration" });
    }
  });

  app.get("/api/admin/pricing/rules", async(req, res) => {
    try {
      const rules = await storage.getAllPricingRules();
      res.json(rules);
    } catch (error) {
      console.error('Error fetching pricing rules:', error);
      res.status(500).json({ error: "Failed to fetch pricing rules" });
    }
  });

  app.put("/api/admin/pricing/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const priceId = parseInt(id);
      console.log(`Updating price ${priceId} with:`, req.body);

      // Get current price for history
      const currentPrice = await storage.getPrice(priceId);
      if (!currentPrice) {
        return res.status(404).json({ error: "Price configuration not found" });
      }

      // Update price
      const updatedPrice = await storage.updatePrice(priceId, {
        ...req.body,
        basePrice: req.body.basePrice.toString()
      });

      // Record price change in history
      await storage.createPriceHistory({
        serviceType: currentPrice.serviceType,
        previousPrice: currentPrice.basePrice,
        newPrice: req.body.basePrice.toString(),
        changedBy: 'admin',
        notes: 'Price updated through admin panel'
      });

      console.log("Price updated successfully:", updatedPrice);
      res.json(updatedPrice);
    } catch (error) {
      console.error('Error updating price:', error);
      res.status(400).json({ error: "Failed to update price" });
    }
  });

  app.put("/api/admin/pricing/rules/:id", async (req, res) => {    try {
      const { id } = req.params;
      const ruleId = parseInt(id);
      const updatedRule = await storage.updatePricingRule(ruleId, req.body);
      res.json(updatedRule);
    } catch (error) {
      console.error('Error updating pricing rule:', error);
      res.status(400).json({ error: "Failed to update pricing rule" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}