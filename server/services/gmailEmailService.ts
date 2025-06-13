import nodemailer from 'nodemailer';
import type { Booking } from '@shared/schema';
import { format, parseISO } from 'date-fns';
import * as ics from 'ics';
import type { EventAttributes } from 'ics';

// Gmail SMTP configuration
const GMAIL_USER = process.env.GMAIL_USER || 'pptvinstall@gmail.com';
const GMAIL_APP_PASSWORD = process.env.GMAIL_PASS || process.env.GMAIL_APP_PASSWORD;
const ADMIN_EMAIL = 'pptvinstall@gmail.com';
const COMPANY_NAME = 'Picture Perfect TV Install';
const COMPANY_PHONE = '404-702-4748';
const COMPANY_WEBSITE = 'https://PPTVInstall.com';

// Create transporter for Gmail SMTP
const createTransporter = () => {
  if (!GMAIL_APP_PASSWORD) {
    console.warn('Gmail App Password not set. Email functionality will be disabled.');
    return null;
  }

  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD
    }
  });
};

/**
 * Create calendar event for booking
 */
async function createCalendarEvent(booking: Booking): Promise<string | null> {
  try {
    if (!booking.preferredDate || !booking.appointmentTime) {
      console.warn('Missing date or time for calendar event');
      return null;
    }

    const appointmentDate = parseISO(booking.preferredDate);
    const [time, meridiem] = booking.appointmentTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    
    let adjustedHours = hours;
    if (meridiem?.toLowerCase() === 'pm' && hours !== 12) {
      adjustedHours += 12;
    } else if (meridiem?.toLowerCase() === 'am' && hours === 12) {
      adjustedHours = 0;
    }

    const startDateTime = new Date(appointmentDate);
    startDateTime.setHours(adjustedHours, minutes || 0, 0, 0);
    
    const endDateTime = new Date(startDateTime);
    endDateTime.setHours(startDateTime.getHours() + 2);

    const event: EventAttributes = {
      start: [
        startDateTime.getFullYear(),
        startDateTime.getMonth() + 1,
        startDateTime.getDate(),
        startDateTime.getHours(),
        startDateTime.getMinutes()
      ],
      end: [
        endDateTime.getFullYear(),
        endDateTime.getMonth() + 1,
        endDateTime.getDate(),
        endDateTime.getHours(),
        endDateTime.getMinutes()
      ],
      title: `TV Installation Service - ${COMPANY_NAME}`,
      description: `TV Installation appointment for ${booking.name}\n\nService: ${booking.serviceType}\nLocation: ${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}\n\nContact: ${COMPANY_PHONE}`,
      location: `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`,
      organizer: { name: COMPANY_NAME, email: GMAIL_USER },
      attendees: [
        { name: booking.name, email: booking.email }
      ]
    };

    const { error, value } = ics.createEvent(event);
    
    if (error) {
      console.error('Error creating calendar event:', error);
      return null;
    }

    return value || null;
  } catch (error) {
    console.error('Calendar event creation failed:', error);
    return null;
  }
}

/**
 * Generate unified booking confirmation email content
 */
function generateBookingConfirmationEmail(booking: Booking): string {
  const formattedDate = booking.preferredDate
    ? format(parseISO(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';

  // Process service breakdown
  const pricingBreakdown = booking.pricingBreakdown || [];
  const tvItems = pricingBreakdown.filter((item: any) => item.type === 'tv');
  
  let servicesHtml = '';
  if (tvItems.length > 0) {
    servicesHtml = tvItems.map((tv: any, index: number) => `
      <div style="padding: 12px 0; border-bottom: 1px solid #eee;">
        <div style="font-weight: 500; color: #333;">
          TV ${index + 1}: ${tv.size === 'large' ? '56"+ TV' : '32"-55" TV'} Installation
        </div>
        <ul style="list-style-type: disc; padding-left: 20px; margin: 8px 0 0 0; color: #666; font-size: 14px;">
          <li>${tv.location === 'over_fireplace' ? 'Over Fireplace Installation' : 'Standard Wall Installation'}</li>
          <li>${tv.mountType === 'full_motion' ? 'Full-Motion Mount' : 
               tv.mountType === 'tilting' ? 'Tilting Mount' : 
               tv.mountType === 'fixed' ? 'Fixed Mount' : 
               tv.mountType === 'customer' ? 'Customer-Provided Mount' : 'Standard Mount'}</li>
          ${tv.masonryWall ? '<li>Masonry/Brick Wall Installation</li>' : ''}
          ${tv.highRise ? '<li>High-Rise/Steel Stud Installation</li>' : ''}
          ${tv.outletRelocation ? '<li>Outlet Relocation Service</li>' : ''}
        </ul>
      </div>
    `).join('');
  } else {
    servicesHtml = `
      <div style="padding: 12px 0;">
        <div style="color: #666;">${booking.serviceType || 'TV Installation Service'}</div>
      </div>
    `;
  }

  const totalPrice = booking.pricingTotal ? `$${Number(booking.pricingTotal).toFixed(2)}` : 'Contact for pricing';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - ${COMPANY_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">
    
    <!-- Company Header -->
    <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #005cb9;">
      <h1 style="color: #005cb9; margin: 0; font-size: 24px; font-weight: bold;">${COMPANY_NAME}</h1>
      <p style="color: #666; margin: 5px 0 0 0; font-size: 14px;">Professional TV Installation & Smart Home Services</p>
    </div>

    <!-- Info Banner -->
    <div style="background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 16px; margin-bottom: 30px; text-align: center;">
      <p style="color: #1976d2; margin: 0; font-size: 16px; font-weight: 500;">
        📧 This email contains your full installation confirmation
      </p>
    </div>

    <!-- Success Message -->
    <div style="text-align: center; margin-bottom: 30px;">
      <div style="display: inline-block; background-color: #10b981; padding: 12px; border-radius: 50%; margin-bottom: 16px;">
        <span style="font-size: 32px; color: white;">✅</span>
      </div>
      <h1 style="color: #333333; margin: 0; font-size: 28px; font-weight: 700;">Booking Confirmed!</h1>
      <p style="color: #666; margin: 8px 0 0 0; font-size: 16px;">Your appointment has been booked successfully</p>
    </div>
    
    <!-- Booking Reference ID -->
    <div style="text-align: center; padding: 20px; background-color: #f8f9fa; border-radius: 8px; margin-bottom: 30px; border-left: 4px solid #10b981;">
      <p style="color: #666; font-size: 14px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Booking Reference ID</p>
      <p style="font-size: 24px; font-weight: 700; margin: 0; color: #333;">${booking.id || "N/A"}</p>
    </div>
    
    <!-- Customer Information -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
        👤 Customer Information
      </h2>
      <div style="display: grid; gap: 12px;">
        <div>
          <span style="color: #666; font-size: 14px; display: block; margin-bottom: 4px;">Full Name</span>
          <span style="color: #333; font-weight: 500;">${booking.name}</span>
        </div>
        <div>
          <span style="color: #666; font-size: 14px; display: block; margin-bottom: 4px;">Email Address</span>
          <span style="color: #333; font-weight: 500;">${booking.email}</span>
        </div>
        <div>
          <span style="color: #666; font-size: 14px; display: block; margin-bottom: 4px;">Phone Number</span>
          <span style="color: #333; font-weight: 500;">${booking.phone}</span>
        </div>
      </div>
    </div>
    
    <!-- Service Details -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
        🛠️ Service Details
      </h2>
      <div style="display: grid; gap: 12px;">
        <div>
          <span style="color: #666; font-size: 14px; display: block; margin-bottom: 4px;">Service Type</span>
          <span style="color: #333; font-weight: 500;">${booking.serviceType || 'TV Installation'}</span>
        </div>
        <div>
          <span style="color: #666; font-size: 14px; display: block; margin-bottom: 4px;">Preferred Date</span>
          <span style="color: #333; font-weight: 500;">${formattedDate}</span>
        </div>
        <div>
          <span style="color: #666; font-size: 14px; display: block; margin-bottom: 4px;">Preferred Time</span>
          <span style="color: #333; font-weight: 500;">${booking.appointmentTime || "Not specified"}</span>
        </div>
      </div>
    </div>
    
    <!-- Installation Address -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
        📍 Installation Address
      </h2>
      <div style="color: #333; font-weight: 500; line-height: 1.6;">
        ${booking.streetAddress}<br>
        ${booking.addressLine2 ? `${booking.addressLine2}<br>` : ''}
        ${booking.city}, ${booking.state} ${booking.zipCode}
      </div>
    </div>
    
    <!-- Appointment Summary -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
        📋 Appointment Summary
      </h2>
      
      <div style="border-top: 1px solid #eee;">
        ${servicesHtml}
      </div>
      
      <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e9ecef;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 18px; font-weight: 600; color: #333;">💵 Total Price:</span>
          <span style="font-size: 24px; font-weight: 700; color: #10b981;">${totalPrice}</span>
        </div>
        <p style="color: #666; font-size: 14px; margin: 8px 0 0 0; font-style: italic;">
          Payment due after installation (Cash, Zelle, or Apple Pay accepted)
        </p>
      </div>
    </div>
    
    ${booking.notes ? `
    <!-- Customer Notes -->
    <div style="margin-bottom: 30px; padding: 20px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
      <h2 style="color: #856404; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
        📝 Customer Notes
      </h2>
      <div style="color: #856404; line-height: 1.5;">
        ${booking.notes}
      </div>
    </div>
    ` : ''}
    
    <!-- Next Steps -->
    <div style="margin-bottom: 30px; padding: 20px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px;">
      <h2 style="color: #155724; font-size: 18px; font-weight: 600; margin: 0 0 12px 0;">
        🎯 Next Steps
      </h2>
      <div style="color: #155724; line-height: 1.6;">
        <p style="margin: 0 0 12px 0;">Thank you for booking with Picture Perfect TV Install!</p>
        <p style="margin: 0 0 12px 0;">We'll reach out to confirm any special requests before your appointment.</p>
        <p style="margin: 0;">If you need to make changes, call us at ${COMPANY_PHONE}.</p>
      </div>
    </div>
    
    <!-- Action Buttons -->
    <div style="text-align: center; margin-bottom: 30px;">
      <a href="tel:${COMPANY_PHONE}" style="display: inline-block; background-color: #28a745; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 0 8px 8px 8px; font-weight: 600; font-size: 16px;">
        📞 Call Us
      </a>
      <a href="${COMPANY_WEBSITE}" style="display: inline-block; background-color: #007bff; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; margin: 0 8px 8px 8px; font-weight: 600; font-size: 16px;">
        🌐 Visit Website
      </a>
    </div>

    <!-- Deliverability Notice -->
    <div style="background-color: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 16px; margin-bottom: 20px; text-align: center;">
      <p style="color: #6c757d; margin: 0; font-size: 14px; line-height: 1.5;">
        📧 <strong>Didn't see this in your inbox?</strong> Check your spam or junk folder just in case.<br>
        For immediate assistance, call us at ${COMPANY_PHONE}
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px;">
      <p style="margin: 0;">${COMPANY_NAME} | ${COMPANY_PHONE} | ${COMPANY_WEBSITE}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate plain text version of email
 */
function generatePlainTextEmail(booking: Booking): string {
  const formattedDate = booking.preferredDate
    ? format(parseISO(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';

  const totalPrice = booking.pricingTotal ? `$${Number(booking.pricingTotal).toFixed(2)}` : 'Contact for pricing';

  return `
${COMPANY_NAME}
Professional TV Installation & Smart Home Services

BOOKING CONFIRMED!
Your appointment has been booked successfully.

BOOKING REFERENCE ID: ${booking.id || "N/A"}

CUSTOMER INFORMATION:
Name: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone}

SERVICE DETAILS:
Service Type: ${booking.serviceType || 'TV Installation'}
Date: ${formattedDate}
Time: ${booking.appointmentTime || "Not specified"}

INSTALLATION ADDRESS:
${booking.streetAddress}
${booking.addressLine2 ? `${booking.addressLine2}\n` : ''}${booking.city}, ${booking.state} ${booking.zipCode}

APPOINTMENT SUMMARY:
Total Price: ${totalPrice}
Payment due after installation (Cash, Zelle, or Apple Pay accepted)

${booking.notes ? `CUSTOMER NOTES:\n${booking.notes}\n` : ''}

NEXT STEPS:
Thank you for booking with Picture Perfect TV Install!
We'll reach out to confirm any special requests before your appointment.
If you need to make changes, call us at ${COMPANY_PHONE}.

CONTACT US:
Phone: ${COMPANY_PHONE}
Website: ${COMPANY_WEBSITE}

Didn't see this in your inbox? Check your spam or junk folder just in case.
For immediate assistance, call us at ${COMPANY_PHONE}

${COMPANY_NAME} | ${COMPANY_PHONE} | ${COMPANY_WEBSITE}
  `.trim();
}

/**
 * Send unified booking confirmation email to both customer and admin
 */
export async function sendUnifiedBookingConfirmation(booking: Booking): Promise<{ customerSent: boolean; adminSent: boolean }> {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('Gmail transporter not available - check GMAIL_APP_PASSWORD');
    return { customerSent: false, adminSent: false };
  }

  try {
    const bookingDate = booking.preferredDate ? format(parseISO(booking.preferredDate), 'MMM d') : '';
    const bookingTime = booking.appointmentTime || '';
    const subject = bookingDate && bookingTime 
      ? `Your Booking is Confirmed – ${bookingDate} @ ${bookingTime}`
      : `Your TV Installation is Confirmed – ${booking.name}`;

    const htmlContent = generateBookingConfirmationEmail(booking);
    const textContent = generatePlainTextEmail(booking);
    
    // Create calendar attachment
    let calendarAttachment = null;
    try {
      const calendarEvent = await createCalendarEvent(booking);
      if (calendarEvent) {
        calendarAttachment = {
          filename: 'appointment.ics',
          content: calendarEvent,
          contentType: 'text/calendar'
        };
      }
    } catch (calError) {
      console.warn('Failed to create calendar attachment:', calError);
    }

    const mailOptions = {
      from: `Picture Perfect TV <${GMAIL_USER}>`,
      subject: subject,
      html: htmlContent,
      text: textContent,
      attachments: calendarAttachment ? [calendarAttachment] : []
    };

    // Send to customer
    let customerSent = false;
    try {
      await transporter.sendMail({
        ...mailOptions,
        to: booking.email
      });
      customerSent = true;
      console.log(`✅ Customer confirmation email sent to: ${booking.email}`);
    } catch (customerError) {
      console.error('Failed to send customer email:', customerError);
    }

    // Send to admin
    let adminSent = false;
    try {
      await transporter.sendMail({
        ...mailOptions,
        to: ADMIN_EMAIL
      });
      adminSent = true;
      console.log(`✅ Admin confirmation email sent to: ${ADMIN_EMAIL}`);
    } catch (adminError) {
      console.error('Failed to send admin email:', adminError);
    }

    return { customerSent, adminSent };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { customerSent: false, adminSent: false };
  }
}

export default {
  sendUnifiedBookingConfirmation
};