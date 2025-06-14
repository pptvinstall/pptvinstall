import nodemailer from 'nodemailer';
import { logger } from './loggingService';
import { createEvent } from 'ics';

interface BookingData {
  id: string;
  confirmationNumber: string;
  fullName: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  notes?: string;
  selectedDate: string;
  selectedTime: string;
  services: Array<{
    displayName: string;
    price: number;
    configuration?: any;
  }>;
  totalAmount: number;
  calendarEventId?: string;
}

class LiveEmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER || 'pptvinstall@gmail.com',
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }

  private formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  private async createCalendarAttachment(booking: BookingData): Promise<Buffer | null> {
    try {
      const [month, day, year] = booking.selectedDate.split('-').map(Number);
      const [timeRange] = booking.selectedTime.split(' - ');
      const [time, period] = timeRange.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;

      const startDate = new Date(year, month - 1, day, hour24, minutes || 0);
      const endDate = new Date(startDate.getTime() + (2 * 60 * 60 * 1000)); // 2 hours later

      const servicesDescription = booking.services.map(service => 
        `• ${service.displayName} - ${this.formatCurrency(service.price)}`
      ).join('\n');

      const event = {
        title: `PPTVInstall - ${booking.fullName}`,
        description: `PPTVInstall Service Appointment\n\nConfirmation: ${booking.confirmationNumber}\nCustomer: ${booking.fullName}\nPhone: ${booking.phone}\nEmail: ${booking.email}\n\nServices:\n${servicesDescription}\n\nTotal: ${this.formatCurrency(booking.totalAmount)}\n\nNotes: ${booking.notes || 'None'}\n\nBusiness: Picture Perfect TV Install\nPhone: (404) 702-4748`,
        location: `${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zipCode}`,
        start: [year, month, day, hour24, minutes || 0] as [number, number, number, number, number],
        end: [year, month, day, endDate.getHours(), endDate.getMinutes()] as [number, number, number, number, number],
        organizer: { name: 'PPTVInstall', email: process.env.GMAIL_USER || 'pptvinstall@gmail.com' },
        attendees: [
          { name: booking.fullName, email: booking.email, rsvp: true }
        ]
      };

      return new Promise((resolve) => {
        createEvent(event, (error: any, value: string) => {
          if (error) {
            logger.error('Failed to create calendar event', { error });
            resolve(null);
          } else {
            resolve(Buffer.from(value, 'utf8'));
          }
        });
      });
    } catch (error) {
      logger.error('Error creating calendar attachment', { error });
      return null;
    }
  }

  private generateCustomerEmailHTML(booking: BookingData): string {
    const servicesHTML = booking.services.map(service => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; color: #374151;">${service.displayName}</td>
        <td style="padding: 12px 0; text-align: right; color: #374151; font-weight: 600;">
          ${this.formatCurrency(service.price)}
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - PPTVInstall</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">PPTVInstall</h1>
      <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">Professional TV & Smart Home Installation</p>
    </div>

    <!-- Confirmation Badge -->
    <div style="text-align: center; padding: 20px 0; background-color: #f0f9ff;">
      <div style="display: inline-block; background-color: #10b981; color: white; padding: 8px 20px; border-radius: 20px; font-weight: bold; font-size: 14px;">
        ✓ BOOKING CONFIRMED
      </div>
    </div>

    <!-- Main Content -->
    <div style="padding: 30px;">
      
      <!-- Greeting -->
      <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${booking.fullName}!</h2>
      <p style="color: #6b7280; margin: 0 0 25px 0; font-size: 16px; line-height: 1.5;">
        Your appointment has been confirmed. We're excited to help you with your installation needs!
      </p>

      <!-- Confirmation Details -->
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Booking Details</h3>
        <div style="display: grid; gap: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-weight: 600;">Confirmation #:</span>
            <span style="color: #1f2937; font-weight: bold; font-size: 16px;">${booking.confirmationNumber}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-weight: 600;">Date & Time:</span>
            <span style="color: #1f2937; font-weight: bold;">${booking.selectedDate} • ${booking.selectedTime}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #6b7280; font-weight: 600;">Location:</span>
            <span style="color: #1f2937;">${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zipCode}</span>
          </div>
        </div>
      </div>

      <!-- Services -->
      <div style="margin: 25px 0;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Services Booked</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${servicesHTML}
          <tr style="border-top: 2px solid #3b82f6;">
            <td style="padding: 15px 0; color: #1f2937; font-weight: bold; font-size: 18px;">Total</td>
            <td style="padding: 15px 0; text-align: right; color: #3b82f6; font-weight: bold; font-size: 20px;">
              ${this.formatCurrency(booking.totalAmount)}
            </td>
          </tr>
        </table>
      </div>

      ${booking.notes ? `
      <!-- Special Notes -->
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 25px 0; border-radius: 0 4px 4px 0;">
        <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">SPECIAL NOTES:</h4>
        <p style="color: #92400e; margin: 0; font-size: 14px;">${booking.notes}</p>
      </div>
      ` : ''}

      <!-- Next Steps -->
      <div style="background-color: #f0f9ff; border-radius: 8px; padding: 20px; margin: 25px 0;">
        <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">What's Next?</h3>
        <ul style="color: #6b7280; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Our technician will arrive during your scheduled time window</li>
          <li>We'll call 15-30 minutes before arrival</li>
          <li>Payment is due upon completion of service</li>
        </ul>
      </div>

      <!-- Add to Calendar Button -->
      <div style="text-align: center; margin: 25px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px;">
        <h3 style="color: #1d4ed8; margin: 0 0 15px 0; font-size: 18px;">📅 Add to Your Calendar</h3>
        <p style="color: #6b7280; margin: 0 0 15px 0;">A calendar file is attached to this email. Click to add this appointment to your calendar.</p>
        <p style="color: #1d4ed8; font-size: 14px; margin: 0;">Please allow a 15-minute buffer at the end of your appointment</p>
      </div>

      <!-- Contact -->
      <div style="text-align: center; margin: 30px 0;">
        <p style="color: #6b7280; margin: 0 0 10px 0;">Questions? Need to reschedule?</p>
        <p style="color: #3b82f6; font-weight: bold; font-size: 18px; margin: 0;">📞 (404) 702-4748</p>
        <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 14px;">pptvinstall@gmail.com</p>
        <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 12px; font-style: italic;">
          If you're providing your own mount or equipment, just let us know.
        </p>
      </div>

    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; margin: 0; font-size: 12px;">
        © 2025 Picture Perfect TV Install - Professional TV & Smart Home Installation Services<br>
        Hours: Mon–Fri 5:30 PM–10:30 PM, Sat–Sun 12 PM–8 PM<br>
        Serving Metro Atlanta with Excellence
      </p>
    </div>

  </div>
</body>
</html>
    `;
  }

  private generateBusinessEmailHTML(booking: BookingData): string {
    const servicesHTML = booking.services.map(service => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 0; color: #374151;">${service.displayName}</td>
        <td style="padding: 8px 0; text-align: right; color: #374151; font-weight: 600;">
          ${this.formatCurrency(service.price)}
        </td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Booking Alert - ${booking.confirmationNumber}</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f9fafb; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🚨 NEW BOOKING ALERT</h1>
      <p style="color: #fecaca; margin: 5px 0 0 0;">${booking.confirmationNumber}</p>
    </div>

    <div style="padding: 25px;">
      
      <!-- Customer Info -->
      <div style="background-color: #f8fafc; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px;">Customer Information</h3>
        <p style="margin: 5px 0; color: #374151;"><strong>Name:</strong> ${booking.fullName}</p>
        <p style="margin: 5px 0; color: #374151;"><strong>Email:</strong> ${booking.email}</p>
        <p style="margin: 5px 0; color: #374151;"><strong>Phone:</strong> ${booking.phone}</p>
        <p style="margin: 5px 0; color: #374151;"><strong>Address:</strong> ${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zipCode}</p>
      </div>

      <!-- Appointment Details -->
      <div style="background-color: #fef3c7; border-radius: 6px; padding: 15px; margin-bottom: 20px;">
        <h3 style="color: #92400e; margin: 0 0 12px 0; font-size: 18px;">📅 Appointment</h3>
        <p style="margin: 5px 0; color: #92400e; font-size: 16px; font-weight: bold;">
          ${booking.selectedDate} • ${booking.selectedTime}
        </p>
        ${booking.calendarEventId ? `<p style="margin: 5px 0; color: #92400e; font-size: 12px;">Calendar Event: ${booking.calendarEventId}</p>` : ''}
      </div>

      <!-- Services -->
      <div style="margin-bottom: 20px;">
        <h3 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px;">Services Requested</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${servicesHTML}
          <tr style="border-top: 2px solid #dc2626;">
            <td style="padding: 12px 0; color: #1f2937; font-weight: bold; font-size: 16px;">TOTAL REVENUE</td>
            <td style="padding: 12px 0; text-align: right; color: #dc2626; font-weight: bold; font-size: 18px;">
              ${this.formatCurrency(booking.totalAmount)}
            </td>
          </tr>
        </table>
      </div>

      ${booking.notes ? `
      <!-- Special Notes -->
      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px;">
        <h4 style="color: #dc2626; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">CUSTOMER NOTES:</h4>
        <p style="color: #dc2626; margin: 0; font-style: italic;">"${booking.notes}"</p>
      </div>
      ` : ''}

      <!-- Action Items -->
      <div style="background-color: #f0f9ff; border-radius: 6px; padding: 15px;">
        <h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 16px;">✅ Action Items</h3>
        <ul style="color: #1d4ed8; margin: 0; padding-left: 20px; line-height: 1.6;">
          <li>Check Google Calendar for the appointment</li>
          <li>Prepare equipment based on services requested</li>
          <li>Call customer 15-30 minutes before arrival</li>
          <li>Collect payment upon completion (${this.formatCurrency(booking.totalAmount)})</li>
        </ul>
      </div>

    </div>
  </div>
</body>
</html>
    `;
  }

  async sendBookingConfirmation(booking: BookingData): Promise<{ success: boolean; error?: string }> {
    try {
      // Create calendar attachment
      const calendarAttachment = await this.createCalendarAttachment(booking);

      // Email to customer
      const customerEmailOptions: any = {
        from: `"Picture Perfect TV Install" <${process.env.GMAIL_USER || 'pptvinstall@gmail.com'}>`,
        replyTo: process.env.GMAIL_USER || 'pptvinstall@gmail.com',
        to: booking.email,
        subject: `Booking Confirmed: ${booking.confirmationNumber} - PPTVInstall`,
        html: this.generateCustomerEmailHTML(booking),
        text: `Hi ${booking.fullName}!\n\nYour PPTVInstall appointment has been confirmed.\n\nConfirmation Number: ${booking.confirmationNumber}\nDate & Time: ${booking.selectedDate} • ${booking.selectedTime}\nLocation: ${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zipCode}\n\nTotal: ${this.formatCurrency(booking.totalAmount)}\n\nA calendar file is attached - click to add to your calendar.\nAccepted payment: Cash, Zelle, or Apple Pay\nYou can reply to this email if anything changes.\n\nBusiness Hours: Mon–Fri 5:30 PM–10:30 PM, Sat–Sun 12 PM–8 PM\nQuestions? Call (404) 702-4748\n\nThank you for choosing Picture Perfect TV Install!`
      };

      if (calendarAttachment) {
        customerEmailOptions.attachments = [{
          filename: `PPTVInstall-${booking.confirmationNumber}.ics`,
          content: calendarAttachment,
          contentType: 'text/calendar; method=REQUEST; charset="UTF-8"'
        }];
      }

      // Email to business owner
      const businessEmailOptions: any = {
        from: `"PPTVInstall System" <${process.env.GMAIL_USER || 'pptvinstall@gmail.com'}>`,
        to: process.env.GMAIL_USER || 'pptvinstall@gmail.com',
        subject: `🚨 NEW BOOKING: ${booking.confirmationNumber} - ${this.formatCurrency(booking.totalAmount)} - ${booking.selectedDate}`,
        html: this.generateBusinessEmailHTML(booking),
        text: `NEW BOOKING ALERT!\n\nConfirmation: ${booking.confirmationNumber}\nCustomer: ${booking.fullName} (${booking.phone})\nEmail: ${booking.email}\nAddress: ${booking.address.street}, ${booking.address.city}, ${booking.address.state} ${booking.address.zipCode}\nDate & Time: ${booking.selectedDate} • ${booking.selectedTime}\nTotal Revenue: ${this.formatCurrency(booking.totalAmount)}\n${booking.notes ? `\nNotes: ${booking.notes}` : ''}\n\nServices:\n${booking.services.map(s => `- ${s.displayName}: ${this.formatCurrency(s.price)}`).join('\n')}`
      };

      if (calendarAttachment) {
        businessEmailOptions.attachments = [{
          filename: `PPTVInstall-${booking.confirmationNumber}.ics`,
          content: calendarAttachment,
          contentType: 'text/calendar; method=REQUEST; charset="UTF-8"'
        }];
      }

      // Send both emails
      const [customerResult, businessResult] = await Promise.all([
        this.transporter.sendMail(customerEmailOptions),
        this.transporter.sendMail(businessEmailOptions)
      ]);

      logger.info(`Confirmation emails sent successfully for booking ${booking.confirmationNumber}`, {
        customerMessageId: customerResult.messageId,
        businessMessageId: businessResult.messageId
      });

      return { success: true };

    } catch (error) {
      logger.error('Failed to send booking confirmation emails', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        bookingId: booking.id,
        confirmationNumber: booking.confirmationNumber
      });
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async testEmailConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.transporter.verify();
      logger.info('Email connection verified successfully');
      return { success: true };
    } catch (error) {
      logger.error('Email connection test failed', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

export const liveEmailService = new LiveEmailService();