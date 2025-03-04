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

function generateICalendarEvent(dateTime: Date, duration: number, summary: string, description: string, location: string): string {
  const start = dateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const end = new Date(dateTime.getTime() + duration * 60000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:${summary}
DESCRIPTION:${description}
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
      const { services, price } = parseServiceType(data.serviceType);

      // Generate calendar event
      const eventSummary = `TV/Smart Home Installation - Picture Perfect`;
      const eventDescription = `Installation appointment for: ${services.join(', ')}`;
      const eventLocation = `${data.streetAddress}, ${data.city}, ${data.state} ${data.zipCode}`;
      const iCalEvent = generateICalendarEvent(dateTime, 120, eventSummary, eventDescription, eventLocation);

      const htmlTemplate = `
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
      }
      .container {
        padding: 20px;
      }
      .section {
        margin-bottom: 20px;
        border-bottom: 1px solid #eee;
        padding-bottom: 20px;
      }
      .section:last-child {
        border-bottom: none;
      }
      .section-title {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 10px;
        color: #2563eb;
      }
      .detail-row {
        margin-bottom: 5px;
      }
      .price-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
        padding: 4px 0;
      }
      .subtotal-row {
        font-weight: 500;
        border-top: 1px dashed #eee;
        padding-top: 8px;
        margin-top: 8px;
      }
      .total-row {
        font-weight: bold;
        border-top: 2px solid #eee;
        padding-top: 10px;
        margin-top: 10px;
      }
      .note {
        font-size: 14px;
        color: #666;
        font-style: italic;
        background-color: #f5f7ff;
        padding: 8px;
        border-radius: 4px;
        margin-top: 8px;
      }
      .highlight {
        color: #2563eb;
      }
      .alert {
        background-color: #fff3f3;
        color: #e11d48;
        padding: 8px;
        border-radius: 4px;
        margin-top: 8px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="section">
        <div class="section-title">Selected Services</div>
        ${services.map(service => `<div class="detail-row">• ${service}</div>`).join('')}
      </div>

      <div class="section">
        <div class="section-title">Appointment Details</div>
        <div class="detail-row">Date: ${formattedDate}</div>
        <div class="detail-row">Time: ${formattedTime}</div>
        <div class="detail-row note">📅 Add to calendar: Check attachment or click "Add to Calendar" in your email client</div>
      </div>

      <div class="section">
        <div class="section-title">Contact Information</div>
        <div class="detail-row">Name: ${data.name}</div>
        <div class="detail-row">Email: ${data.email}</div>
        <div class="detail-row">Phone: ${data.phone}</div>
      </div>

      <div class="section">
        <div class="section-title">Installation Address</div>
        <div class="detail-row">${data.streetAddress}</div>
        ${data.addressLine2 ? `<div class="detail-row">${data.addressLine2}</div>` : ''}
        <div class="detail-row">${data.city}, ${data.state} ${data.zipCode}</div>
      </div>

      <div class="section">
        <div class="section-title">Detailed Price Breakdown</div>
        ${services.map(service => {
          const isTV = service.includes('TV');
          const isDoorbell = service.includes('Doorbell');
          const isFloodlight = service.includes('Floodlight');
          const isCamera = service.includes('Camera');
          const quantity = parseInt(service.match(/\d+/)?.[0] || '1');

          let basePrice = isTV ? 100 :
                       isFloodlight ? 100 : 75;

          let html = `
            <div class="service-block">
              <div class="price-row">
                <span>Base Installation (${quantity} unit${quantity > 1 ? 's' : ''})</span>
                <span>${formatPrice(basePrice * quantity)}</span>
              </div>`;

          if (isTV) {
            html += `
              <div class="note">
                Mount Options (select during installation):<br>
                • Fixed Mount: ${formatPrice(40)} (32"-55") / ${formatPrice(60)} (56"+)<br>
                • Tilt Mount: ${formatPrice(50)} (32"-55") / ${formatPrice(70)} (56"+)<br>
                • Full-Motion Mount: ${formatPrice(80)} (32"-55") / ${formatPrice(100)} (56"+)
              </div>`;

            if (service.includes('non-drywall')) {
              html += `
                <div class="price-row">
                  <span>• Non-Drywall Installation (brick/concrete/stone)</span>
                  <span>+${formatPrice(50)}</span>
                </div>`;
            }

            if (service.includes('outlet') && !service.includes('fireplace')) {
              html += `
                <div class="price-row">
                  <span>• Outlet Relocation</span>
                  <span>+${formatPrice(100)}</span>
                </div>`;
            }

            if (service.includes('fireplace')) {
              html += `
                <div class="alert">
                  Note: For outlet relocation with fireplace installations, please provide photos of your fireplace and nearby outlets for a custom quote.
                </div>`;
            }
          }

          if (isDoorbell) {
            html += `
              <div class="price-row">
                <span>• Brick Installation (if needed)</span>
                <span>+${formatPrice(10)}</span>
              </div>`;
          }

          if (isCamera) {
            html += `
              <div class="price-row">
                <span>• Height Fee (per 4ft above 8ft)</span>
                <span>+${formatPrice(25)}</span>
              </div>`;
          }

          return html + '</div>';
        }).join('<div class="separator" style="margin: 12px 0;"></div>')}

        <div class="price-row total-row">
          <span>Estimated Total</span>
          <span>${formatPrice(price)}</span>
        </div>
        <div class="price-row highlight">
          <span>Required Deposit</span>
          <span>${formatPrice(75)}</span>
        </div>
        <div class="note">
          * Final price may vary based on mount selection and additional services required during installation.<br>
          * The deposit amount will be deducted from the total cost.
        </div>
      </div>

      ${data.notes ? `
      <div class="section">
        <div class="section-title">Additional Notes</div>
        <div class="detail-row">${data.notes}</div>
      </div>
      ` : ''}

      <div class="section">
        <div class="section-title">Next Steps</div>
        <div class="detail-row">1. Our team will contact you within 24 hours to confirm your appointment</div>
        <div class="detail-row">2. Please ensure the installation area is clear and accessible</div>
        <div class="detail-row">3. Have your devices ready for installation</div>
        ${data.serviceType.includes('fireplace') ? `
        <div class="alert">
          Important: For fireplace installations, please have photos ready of your fireplace and nearby outlets to help us prepare for your installation.
        </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Questions?</div>
        <div class="detail-row">Call us at 404-702-4748 or reply to this email.</div>
        <div class="detail-row">Business Hours:</div>
        <div class="detail-row">Mon-Fri: 6:30PM-10:30PM</div>
        <div class="detail-row">Sat-Sun: 11AM-7PM</div>
      </div>

      <div class="note" style="text-align: center; margin-top: 20px;">
        Thank you for choosing Picture Perfect TV Install!<br>
        Making your installation dreams a reality.
      </div>
    </div>
  </body>
  </html>
`;

      const textEmail = `
Selected Services
----------------
${services.map(service => `• ${service}`).join('\n')}

Appointment Details
-----------------
Date: ${formattedDate}
Time: ${formattedTime}

Contact Information
-----------------
Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone}

Installation Address
------------------
${data.streetAddress}
${data.addressLine2 ? data.addressLine2 + '\n' : ''}${data.city}, ${data.state} ${data.zipCode}

Detailed Price Breakdown
----------------------
${services.map(service => {
  const isTV = service.includes('TV');
  const isDoorbell = service.includes('Doorbell');
  const isFloodlight = service.includes('Floodlight');
  const quantity = parseInt(service.match(/\d+/)?.[0] || '1');

  let basePrice = isTV ? 100 :
                isFloodlight ? 100 : 75;

  let breakdown = `• Base Installation (${quantity} unit${quantity > 1 ? 's' : ''}): ${formatPrice(basePrice * quantity)}`;

  if (isTV) {
    breakdown += '\nMount Options (prices vary by TV size):\n';
    breakdown += '  - Fixed Mount: $40 (32"-55") / $60 (56"+)\n';
    breakdown += '  - Tilt Mount: $50 (32"-55") / $70 (56"+)\n';
    breakdown += '  - Full-Motion Mount: $80 (32"-55") / $100 (56"+)';

    if (service.includes('non-drywall')) {
      breakdown += '\n  + Non-Drywall Installation Fee: +$50';
    }
    if (service.includes('outlet')) {
      breakdown += '\n  + Outlet Relocation: +$100';
    }
  }

  if (isDoorbell) {
    breakdown += '\n  + Brick Installation (if needed): +$10';
  }
  if (service.includes('Camera')) {
    breakdown += '\n  + Height Fee (per 4ft above 8ft): +$25';
  }

  return breakdown;
}).join('\n\n')}

Estimated Total: ${formatPrice(price)}
Required Deposit: ${formatPrice(75)}

* Final price may vary based on specific requirements and additional services selected during installation.
* The deposit amount will be deducted from the total cost.

${data.notes ? `Additional Notes\n--------------\n${data.notes}\n\n` : ''}

Next Steps
---------
1. Our team will contact you within 24 hours to confirm your appointment
2. Please ensure the installation area is clear and accessible
3. Have your devices ready for installation
${data.serviceType.includes('fireplace') ? '\nImportant: For fireplace installations, please have photos ready of your fireplace and nearby outlets.\n' : ''}

Questions?
---------
Call us at 404-702-4748 or reply to this email.

Business Hours:
Mon-Fri: 6:30PM-10:30PM
Sat-Sun: 11AM-7PM

Thank you for choosing Picture Perfect TV Install!
Making your installation dreams a reality.`;

      await transporter.sendMail({
        from: process.env.GMAIL_USER,
        to: data.email,
        subject: "Your Installation Booking Confirmation - Picture Perfect TV Install",
        text: textEmail,
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