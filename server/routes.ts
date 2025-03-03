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
              <div class="section-title">Appointment</div>
              <div class="detail-row">${formattedDate} at ${formattedTime}</div>
              <div class="detail-row note">📅 Add to calendar: Check attachment or click "Add to Calendar" in your email client</div>
            </div>

            <div class="section">
              <div class="section-title">Contact Information</div>
              <div class="detail-row">${data.name}</div>
              <div class="detail-row">${data.email}</div>
              <div class="detail-row">${data.phone}</div>
            </div>

            <div class="section">
              <div class="section-title">Installation Address</div>
              <div class="detail-row">${data.streetAddress}</div>
              ${data.addressLine2 ? `<div class="detail-row">${data.addressLine2}</div>` : ''}
              <div class="detail-row">${data.city}, ${data.state} ${data.zipCode}</div>
            </div>

            <div class="section">
              <div class="section-title">Price Breakdown</div>
              ${services.map(service => {
                const isTV = service.includes('TV');
                const isDoorbell = service.includes('Doorbell');
                const isFloodlight = service.includes('Floodlight');
                const isCamera = service.includes('Camera');
                const quantity = parseInt(service.match(/\d+/)?.[0] || '1');

                let basePrice = isTV ? 100 :
                              isFloodlight ? 100 : 75;

                let html = `
                  <div class="price-row">
                    <span>Base Installation (${quantity} unit${quantity > 1 ? 's' : ''})</span>
                    <span>${formatPrice(basePrice * quantity)}</span>
                  </div>`;

                // Add any additional fees
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
                if (isTV) {
                  html += `
                    <div class="price-row">
                      <span>• Mount Options</span>
                      <span>From +${formatPrice(40)}</span>
                    </div>`;
                }

                return html;
              }).join('')}

              <div class="price-row total-row">
                <span>Estimated Total</span>
                <span>${formatPrice(price)}</span>
              </div>
              <div class="price-row">
                <span>Required Deposit</span>
                <span>${formatPrice(75)}</span>
              </div>
              <div class="note">* Final price may vary based on specific requirements and additional services selected during installation.</div>
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
            </div>

            <div class="section">
              <div class="section-title">Questions?</div>
              <div class="detail-row">Call us at (555) 123-4567 or reply to this email.</div>
            </div>

            <div class="note">Thank you for choosing Picture Perfect TV Install!</div>
          </div>
        </body>
        </html>
      `;

      // Send booking confirmation
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
${services.map(service => {
  const isTV = service.includes('TV');
  const isDoorbell = service.includes('Doorbell');
  const isFloodlight = service.includes('Floodlight');
  const quantity = parseInt(service.match(/\d+/)?.[0] || '1');

  let basePrice = isTV ? 100 :
                isFloodlight ? 100 : 75;

  let breakdown = `• Base Installation (${quantity} unit${quantity > 1 ? 's' : ''}): ${formatPrice(basePrice * quantity)}`;

  if (isDoorbell) {
    breakdown += '\n  + Brick Installation (if needed): +$10';
  }
  if (service.includes('Camera')) {
    breakdown += '\n  + Height Fee (per 4ft above 8ft): +$25';
  }
  if (isTV) {
    breakdown += '\n  + Mount Options: From +$40';
  }

  return breakdown;
}).join('\n\n')}

Estimated Total: ${formatPrice(price)}
Required Deposit: ${formatPrice(75)}

* Final price may vary based on specific requirements and additional services selected during installation.

${data.notes ? `Additional Notes\n--------------\n${data.notes}\n\n` : ''}

Next Steps
---------
1. Our team will contact you within 24 hours to confirm your appointment
2. Please ensure the installation area is clear and accessible
3. Have your devices ready for installation

Questions?
---------
Call us at (555) 123-4567 or reply to this email.

Thank you for choosing Picture Perfect TV Install!`,
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

  const httpServer = createServer(app);
  return httpServer;
}