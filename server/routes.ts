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
      
      // Ensure we're storing and using the full date with time
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
      
      // Parse services and calculate price - ensure all services are included
      console.log("Parsing service type:", data.serviceType);
      const { services, price, serviceBreakdown } = parseServiceType(data.serviceType);
      console.log("Parsed services:", services);
      console.log("Service breakdown:", JSON.stringify(serviceBreakdown, null, 2));
      
      // Store basic booking data first, then try to add enhanced data if supported
      try {
        // Start with the base data that we know exists in the schema
        const bookingData = {
          ...data
        };
        
        // Log what we're about to store
        console.log("Creating booking with data:", JSON.stringify({
          name: bookingData.name,
          email: bookingData.email,
          serviceType: bookingData.serviceType,
          preferredDate: bookingData.preferredDate
        }));
        
        // Create the booking in the database
        const booking = await storage.createBooking(bookingData);
        
        // Even if we can't store the enhanced data in the DB, we can still return it
        // for the confirmation email and response
        booking.detailedServices = JSON.stringify({
          services,
          serviceBreakdown
        });
        booking.totalPrice = price.toString();
        booking.appointmentTime = formattedTime;

      // Generate calendar event with detailed description
      const eventSummary = `Picture Perfect TV & Smart Home Installation`;
      const eventDescription = `
APPOINTMENT DETAILS
------------------
Date: ${formattedDate}
Time: ${formattedTime}

SELECTED SERVICES
----------------
${serviceBreakdown.map(section => 
  `${section.title}
${section.items.map(item => `- ${item.label}: ${formatPrice(item.price)}`).join('\n')}`
).join('\n\n')}

TOTAL: ${formatPrice(price)}

INSTALLATION ADDRESS
------------------
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

CONTACT INFORMATION
-----------------
Name: ${data.name}
Phone: ${data.phone}
Email: ${data.email}

PREPARATION INSTRUCTIONS
----------------------
- Please ensure the installation area is clear of obstacles
- Have your TV and other equipment ready
- Make sure power outlets are accessible
- Our technician will call before arrival to confirm details

${data.notes ? `CUSTOMER NOTES\n-------------\n${data.notes}\n\n` : ''}

BUSINESS HOURS
------------
Mon-Fri: 6:30PM-10:30PM
Sat-Sun: 11AM-7PM

Questions? Call 404-702-4748`;

      const eventLocation = `${data.streetAddress}, ${data.city}, ${data.state} ${data.zipCode}`;
      const iCalEvent = generateICalendarEvent(dateTime, 120, eventSummary, eventDescription, eventLocation);

      // We already created the booking above, so we don't need to create it again.
      // The booking variable is already defined earlier in this function.
      
      // The HTML template uses the booking object that was created earlier
      
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
    .header {
      text-align: center;
      margin-bottom: 30px;
      background: linear-gradient(to right, #2563eb, #1e40af);
      padding: 20px;
      border-radius: 10px;
      color: white;
    }
    .logo {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 10px;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
    }
    .tagline {
      font-style: italic;
      opacity: 0.9;
    }
    .section {
      margin-bottom: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      border-radius: 10px;
      padding: 20px;
      background: #fff;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 16px;
      color: #111;
      border-bottom: 2px solid #eee;
      padding-bottom: 10px;
      position: relative;
    }
    .section-title:after {
      content: '';
      position: absolute;
      left: 0;
      bottom: -2px;
      width: 40px;
      height: 2px;
      background: #2563eb;
    }
    .subsection {
      margin-bottom: 16px;
      background: #f8f9fa;
      padding: 16px;
      border-radius: 8px;
      border-left: 3px solid #2563eb;
      transition: transform 0.2s;
    }
    .subsection:hover {
      transform: translateX(3px);
    }
    .subsection-title {
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 10px;
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
      font-weight: 500;
    }
    .total-row {
      font-weight: 600;
      font-size: 18px;
      margin-top: 16px;
      padding: 16px;
      border-top: 2px solid #eee;
      background: #f0f9ff;
      border-radius: 8px;
    }
    .payment-note {
      margin-top: 16px;
      color: #666;
      font-size: 14px;
      font-style: italic;
      background: #f0f9ff;
      padding: 12px;
      border-radius: 6px;
      border: 1px dashed #2563eb;
    }
    .discount {
      color: #22c55e;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 8px;
      background: #f8f9fa;
      padding: 12px;
      border-radius: 8px;
    }
    .info-label {
      font-weight: 500;
      color: #666;
    }
    .info-value {
      color: #111;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 14px;
      color: #666;
      text-align: center;
    }
    .cta-button {
      display: inline-block;
      margin-top: 20px;
      padding: 10px 20px;
      background-color: #2563eb;
      color: white;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .cta-button:hover {
      background-color: #1e40af;
    }
    .appointment-time {
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #f0f9ff 0%, #e6f0ff 100%);
      border-radius: 10px;
      margin: 16px 0;
      font-weight: 600;
      border: 1px solid #d0e3ff;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .booking-id {
      font-size: 14px;
      text-align: center;
      color: #666;
      margin-top: 8px;
    }
    .service-item {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      margin-bottom: 8px;
      border-left: 3px solid #2563eb;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Picture Perfect TV Install</div>
    <div class="tagline">Professional TV & Smart Home Installation</div>
  </div>

  <div class="section">
    <div class="section-title">Booking Confirmation</div>
    <p>Thank you for choosing Picture Perfect TV Install. Your booking has been confirmed for:</p>
    <div class="appointment-time">
      <div style="font-size: 18px; font-weight: 600;">${formattedDate}</div>
      <div style="font-size: 18px; font-weight: 600;">${formattedTime}</div>
      <div style="margin-top: 8px; font-size: 14px; color: #4b5563;">
        Our technician will confirm this time with you before arrival
      </div>
    </div>
    <div class="booking-id">Booking ID: ${booking.id}</div>
  </div>
  
  <div class="section">
    <div class="section-title">Selected Services</div>
    <div style="display: flex; flex-direction: column; gap: 8px;">
      ${services.length > 0 
        ? services.map(service => `<div class="service-item">${service}</div>`).join('') 
        : '<div style="padding: 8px; background: #f8f9fa; border-radius: 4px; color: #666;">No services selected</div>'}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Installation Location</div>
    <div class="info-grid">
      <div class="info-label">Address:</div>
      <div class="info-value">${data.streetAddress}</div>
      ${data.addressLine2 ? `
      <div class="info-label">Address Line 2:</div>
      <div class="info-value">${data.addressLine2}</div>
      ` : ''}
      <div class="info-label">City/State/ZIP:</div>
      <div class="info-value">${data.city}, ${data.state} ${data.zipCode}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Your Information</div>
    <div class="info-grid">
      <div class="info-label">Name:</div>
      <div class="info-value">${data.name}</div>
      <div class="info-label">Email:</div>
      <div class="info-value">${data.email}</div>
      <div class="info-label">Phone:</div>
      <div class="info-value">${data.phone}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detailed Price Breakdown</div>
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
      <span>Total Amount</span>
      <span class="price">${formatPrice(price)}</span>
    </div>

    <div class="payment-note">
      <strong>Payment Information:</strong> The full amount of ${formatPrice(price)} will be due at the time of installation.
      We accept cash, credit cards, Venmo, Cash App, and Zelle.
    </div>
  </div>

  ${data.notes ? `
  <div class="section">
    <div class="section-title">Your Notes</div>
    <div style="background: #f8f9fa; padding: 16px; border-radius: 8px;">${data.notes}</div>
  </div>
  ` : ''}
  
  <div class="section">
    <div class="section-title">What's Next?</div>
    <ul style="padding-left: 20px;">
      <li>Our technician will call you before your appointment to confirm details.</li>
      <li>Please ensure the installation area is accessible and cleared of obstructions.</li>
      <li>Have all your equipment (TV, devices, mounts if provided by you) available on site.</li>
      <li>Add this appointment to your calendar using the attached calendar invite.</li>
    </ul>
    <p style="margin-top: 16px;">
      <strong>View your booking details online:</strong><br>
      <a href="${process.env.SITE_URL || 'https://pictureperfecttv.repl.co'}/booking-confirmation?id=${booking.id}" style="color: #2563eb;">
        Click here to view your booking confirmation
      </a>
    </p>
  </div>
  
  <div class="footer">
    <p><strong>Business Hours:</strong><br>Monday-Friday: 6:30PM-10:30PM<br>Saturday-Sunday: 11AM-7PM</p>
    <p>Questions? Contact us at 404-702-4748 or pptvinstall@gmail.com</p>
    <p>© ${new Date().getFullYear()} Picture Perfect TV Install</p>
  </div>
</body>
</html>`;

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: "Your Installation Booking Confirmation - Picture Perfect TV Install",
        text: `PICTURE PERFECT TV INSTALL
Professional TV & Smart Home Installation

BOOKING CONFIRMATION
-------------------
Thank you for choosing Picture Perfect TV Install!

APPOINTMENT DATE & TIME
----------------------
${formattedDate} at ${formattedTime}

SELECTED SERVICES
----------------
${services.join('\n')}

DETAILED PRICE BREAKDOWN
-----------------------
${serviceBreakdown.map(section => 
  `# ${section.title}
${section.items.map(item => `  • ${item.label}: ${formatPrice(item.price)}`).join('\n')}`
).join('\n\n')}

PAYMENT SUMMARY
--------------
Total Amount: ${formatPrice(price)}

IMPORTANT: Payment is due in full at the time of installation.
We accept cash, credit cards, Venmo, Cash App, and Zelle.

INSTALLATION LOCATION
-------------------
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

YOUR INFORMATION
--------------
Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone}

${data.notes ? `YOUR NOTES\n---------\n${data.notes}\n\n` : ''}

WHAT'S NEXT?
-----------
• Our technician will call you before your appointment to confirm details.
• Please ensure the installation area is accessible and cleared of obstructions.
• Have all your equipment (TV, devices, mounts if provided by you) available on site.
• Add this appointment to your calendar using the attached calendar invite.

QUESTIONS?
---------
Contact us at 404-702-4748 or pptvinstall@gmail.com

Business Hours:
Monday-Friday: 6:30PM-10:30PM
Saturday-Sunday: 11AM-7PM

© ${new Date().getFullYear()} Picture Perfect TV Install`,
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
      // Provide more detailed error information
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check if it's a database schema error
      if (errorMessage.includes('column') && errorMessage.includes('does not exist')) {
        console.error('Database schema error. Please run migrations to update the schema.');
      }
      
      res.status(400).json({ 
        error: "Invalid booking data", 
        details: process.env.NODE_ENV === 'development' ? errorMessage : "Server encountered an error processing your booking."
      });
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