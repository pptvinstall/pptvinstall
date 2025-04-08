import sgMail from '@sendgrid/mail';
import type { Booking, Customer } from '@shared/schema';
import { format, parse, parseISO } from 'date-fns';
import * as ics from 'ics';
import type { EventAttributes, EventStatus } from 'ics';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Email configuration
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com';
const FROM_EMAIL = process.env.EMAIL_FROM || 'Picture Perfect TV Install <PPTVInstall@gmail.com>';
const COMPANY_NAME = 'Picture Perfect TV Install';
const COMPANY_PHONE = '404-702-4748';
const COMPANY_WEBSITE = 'https://PPTVInstall.com';
const LOGO_URL = 'https://i.ibb.co/Pjb48FQ/logo-blue.png';

/**
 * Email notification types
 */
export enum EmailType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  RESCHEDULE_CONFIRMATION = 'reschedule_confirmation',
  SERVICE_EDIT = 'service_edit',
  BOOKING_CANCELLATION = 'booking_cancellation',
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  ADMIN_NOTIFICATION = 'admin_notification',
}

/**
 * Interface for email sending options
 */
export interface EmailOptions {
  previousDate?: string;
  previousTime?: string;
  updates?: Partial<Booking>;
  reason?: string;
  sendToAdmin?: boolean;
  resetToken?: string; // For password reset emails
  sendCalendar?: boolean; // Whether to send a calendar attachment
}

/**
 * Create an ICS calendar event from booking data
 */
function createCalendarEvent(booking: Booking): Promise<string> {
  return new Promise((resolve, reject) => {
    // Parse the date string (assuming ISO format)
    let eventDate: Date;
    try {
      eventDate = parseISO(booking.preferredDate);
    } catch (e) {
      // Fallback to date string parsing if ISO parsing fails
      eventDate = new Date(booking.preferredDate);
    }
    
    // Parse the appointment time (e.g., "3:00 PM")
    let startTime: Date;
    try {
      startTime = parse(booking.appointmentTime, 'h:mm a', eventDate);
    } catch (e) {
      // Fallback: just use the date with noon as default time
      startTime = new Date(eventDate);
      startTime.setHours(12, 0, 0, 0);
    }
    
    // Event duration (default to 1.5 hours)
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1, endTime.getMinutes() + 30);
    
    // Format the date and time for ICS
    const startArray = [
      startTime.getFullYear(),
      startTime.getMonth() + 1, // months are 0-indexed in JS
      startTime.getDate(),
      startTime.getHours(),
      startTime.getMinutes()
    ];
    
    const endArray = [
      endTime.getFullYear(),
      endTime.getMonth() + 1,
      endTime.getDate(),
      endTime.getHours(),
      endTime.getMinutes()
    ];
    
    const event: EventAttributes = {
      start: startArray as [number, number, number, number, number],
      end: endArray as [number, number, number, number, number],
      title: `TV Installation Service - ${COMPANY_NAME}`,
      description: `Your TV installation service has been scheduled.\n\nService Type: ${booking.serviceType}\nAddress: ${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}\n${booking.notes ? `Notes: ${booking.notes}` : ''}`,
      location: `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`,
      organizer: { name: COMPANY_NAME, email: FROM_EMAIL.includes('<') ? FROM_EMAIL.split('<')[1].split('>')[0] : FROM_EMAIL },
      attendees: [
        { name: booking.name, email: booking.email, rsvp: true }
      ]
    };
    
    ics.createEvent(event, (error: any, value: string) => {
      if (error) {
        console.error('Error creating calendar event:', error);
        reject(new Error(`Failed to create calendar event: ${error.message || 'Unknown error'}`));
      } else {
        resolve(value);
      }
    });
  });
}

/**
 * Convert HTML email to plain text version
 */
function createPlainTextVersion(html: string): string {
  return html
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<h[1-6][^>]*>/gi, '')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '\n')
    .replace(/<strong[^>]*>|<\/strong>|<b[^>]*>|<\/b>/gi, '')
    .replace(/<em[^>]*>|<\/em>|<i[^>]*>|<\/i>/gi, '')
    .replace(/<a[^>]*href=['"]([^'"]+)['"][^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Master email template with logo and common styling
 */
function masterEmailTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; color: #333333; background-color: #f7f7f7;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <!-- Header with Logo -->
    <tr>
      <td align="center" style="padding: 0; background-color: #005cb9;">
        <a href="${COMPANY_WEBSITE}" style="display: block; padding: 15px 0;">
          <img src="${LOGO_URL}" alt="${COMPANY_NAME}" style="height: 50px; width: auto;">
        </a>
      </td>
    </tr>
    
    <!-- Email Content -->
    <tr>
      <td style="padding: 30px;">
        ${content}
      </td>
    </tr>
    
    <!-- Footer -->
    <tr>
      <td style="background-color: #f1f1f1; padding: 20px; text-align: center; color: #666666; font-size: 12px; border-top: 1px solid #dddddd;">
        <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} ${COMPANY_NAME}. All rights reserved.</p>
        <p style="margin: 0 0 10px 0;">
          <a href="${COMPANY_WEBSITE}" style="color: #005cb9; text-decoration: none;">${COMPANY_WEBSITE}</a> | 
          Phone: ${COMPANY_PHONE} | 
          Email: <a href="mailto:${ADMIN_EMAIL}" style="color: #005cb9; text-decoration: none;">${ADMIN_EMAIL}</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #999999;">
          This email was sent to you because you booked a service with ${COMPANY_NAME}.
          If you believe this was sent in error, please contact us.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Create booking confirmation email content that exactly matches the booking-confirmation page
 */
function getBookingConfirmationContent(booking: Booking & { smartHomeItems?: any[] }): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';

  // Interface for service breakdown - directly using the same code from booking-confirmation.tsx
  interface ServiceItem {
    name: string;
    details?: string[];
    price?: number;
  }

  interface ServiceCategory {
    category: string;
    items: ServiceItem[];
  }

  interface PricingBreakdownItem {
    type: string;
    size?: string;
    location?: string;
    mountType?: string;
    masonryWall?: boolean;
    highRise?: boolean;
    outletRelocation?: boolean;
    isUnmountOnly?: boolean;
    isRemountOnly?: boolean;
    brickInstallation?: boolean;
    mountHeight?: number;
    count?: number;
    hasExistingWiring?: boolean;
    quantity?: number;
  }

  // Process breakdown based on stored pricingBreakdown - using same logic from booking-confirmation.tsx
  const processServiceBreakdown = (): ServiceCategory[] => {
    if (!booking) return [];

    const breakdown: ServiceCategory[] = [];
    let pricingBreakdown: PricingBreakdownItem[] = [];

    // Handle various formats of pricingBreakdown
    if (booking.pricingBreakdown) {
      if (Array.isArray(booking.pricingBreakdown)) {
        pricingBreakdown = booking.pricingBreakdown;
      } else if (typeof booking.pricingBreakdown === 'string') {
        try {
          const parsed = JSON.parse(booking.pricingBreakdown);
          if (Array.isArray(parsed)) {
            pricingBreakdown = parsed;
          }
        } catch (e) {
          // Continue with empty array if parsing fails
        }
      }
    }

    // Process TV installations
    const tvItems = pricingBreakdown.filter((item: PricingBreakdownItem) =>
      item.type === 'tv' && !item.isUnmountOnly && !item.isRemountOnly
    );

    if (tvItems.length > 0) {
      breakdown.push({
        category: 'TV Mounting',
        items: tvItems.map((tv: PricingBreakdownItem, index: number) => ({
          name: `TV ${index + 1}: ${tv.size === 'large' ? '56" or larger' : '32"-55"'} - ${tv.location || 'standard'}`,
          details: [
            tv.mountType && ['fixed', 'tilting', 'full_motion', 'fullMotion'].includes(tv.mountType) ? 
              `With ${tv.mountType === 'fixed' ? 'Fixed' : tv.mountType === 'tilting' ? 'Tilting' : 'Full Motion'} Mount (${tv.size === 'large' ? '56"+' : '32"-55"'})` : 
            (tv.mountType === 'customer' || tv.mountType === 'customer_provided') ?
              `With Customer-Provided Mount (${tv.size === 'large' ? '56"+' : '32"-55"'})` : null,
            tv.masonryWall ? 'Non-Drywall Surface' : null,
            tv.highRise ? 'High-Rise/Steel Studs' : null,
            tv.outletRelocation ? 'With Outlet Installation' : null
          ].filter(Boolean) as string[]
        }))
      });
    }

    // Process TV unmounting only services
    const unmountOnlyItems = pricingBreakdown.filter((item: PricingBreakdownItem) => item.isUnmountOnly);
    if (unmountOnlyItems.length > 0) {
      breakdown.push({
        category: 'TV Unmounting',
        items: [{
          name: unmountOnlyItems.length > 1 ? `TV Unmounting Only (${unmountOnlyItems.length})` : 'TV Unmounting Only',
          details: []
        }]
      });
    }

    // Process TV remounting only services
    const remountOnlyItems = pricingBreakdown.filter((item: PricingBreakdownItem) => item.isRemountOnly);
    if (remountOnlyItems.length > 0) {
      breakdown.push({
        category: 'TV Remounting',
        items: [{
          name: remountOnlyItems.length > 1 ? `TV Remounting Only (${remountOnlyItems.length})` : 'TV Remounting Only',
          details: []
        }]
      });
    }

    // Process Smart Home devices
    const smartHomeItems = pricingBreakdown.filter((item: PricingBreakdownItem) =>
      item.type === 'doorbell' || item.type === 'camera' || item.type === 'floodlight'
    );

    if (smartHomeItems.length > 0) {
      breakdown.push({
        category: 'Smart Home',
        items: smartHomeItems.map((item: PricingBreakdownItem) => {
          const deviceName =
            item.type === 'doorbell' ? 'Smart Doorbell' :
            item.type === 'floodlight' ? 'Smart Floodlight' : 'Smart Camera';

          return {
            name: `${deviceName}${item.count && item.count > 1 ? ` (×${item.count})` : item.quantity && item.quantity > 1 ? ` (×${item.quantity})` : ''}`,
            details: [
              item.type === 'camera' && item.mountHeight && item.mountHeight > 8 ? `at ${item.mountHeight}ft` : null,
              item.type === 'doorbell' && item.brickInstallation ? 'on Brick' : null
            ].filter(Boolean) as string[]
          };
        })
      });
    }

    return breakdown;
  };

  // Calculate total price with dollar sign formatting
  const formatPrice = (price: string | number | undefined): string => {
    if (!price) return '$0.00';
    
    // Convert to number if it's a string
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Format with dollar sign and two decimal places
    return `$${numericPrice.toFixed(2)}`;
  };

  // Get the service breakdown
  const serviceBreakdown = processServiceBreakdown();
  
  // Generate the services HTML section
  let servicesHtml = '';
  if (serviceBreakdown.length > 0) {
    servicesHtml = serviceBreakdown.map(category => `
      <div style="padding-top: 12px; padding-bottom: 12px; border-bottom: 1px solid #eee;">
        <h3 style="color: #005cb9; font-size: 16px; margin-top: 0; margin-bottom: 8px;">${category.category}</h3>
        
        ${category.items.map(item => `
          <div style="margin-bottom: 8px;">
            <div style="font-weight: 500;">${item.name}</div>
            ${item.details && item.details.length > 0 ? `
              <ul style="list-style-type: disc; padding-left: 20px; margin-top: 4px; margin-bottom: 0; font-size: 14px; color: #666;">
                ${item.details.map(detail => `<li>${detail}</li>`).join('')}
              </ul>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');
  } else {
    // Fallback if no structured data
    servicesHtml = `
      <div style="padding-top: 12px; padding-bottom: 12px;">
        <p style="color: #666; margin: 0;">${booking.serviceType || "Service details not available"}</p>
      </div>
    `;
  }

  // Format the total price
  const totalPrice = booking.pricingTotal ? formatPrice(booking.pricingTotal) : 'Contact for pricing';

  return `
    <div style="margin-bottom: 15px; text-align: center;">
      <div style="display: inline-block; background-color: #f0f9f0; padding: 12px; border-radius: 50%;">
        <img src="https://i.ibb.co/4dygmQP/check-circle.png" alt="Success" width="48" height="48" style="display: block;">
      </div>
    </div>
    
    <h1 style="color: #333333; margin-top: 0; font-size: 24px; text-align: center; margin-bottom: 8px;">Booking Confirmed!</h1>
    <p style="text-align: center; color: #666; margin-top: 0; margin-bottom: 24px;">Your appointment has been booked successfully</p>
    
    <!-- Booking Reference ID -->
    <div style="text-align: center; padding: 16px; background-color: #f5f5f5; border-radius: 8px; margin-bottom: 24px;">
      <p style="color: #666; font-size: 14px; margin-top: 0; margin-bottom: 4px;">Booking Reference ID</p>
      <p style="font-size: 18px; font-weight: 600; margin: 0;">${booking.id || "N/A"}</p>
    </div>
    
    <!-- Appointment Details -->
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Appointment Details</h2>
      
      <div style="display: flex; gap: 12px; margin-bottom: 12px;">
        <div style="flex: 1; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
          <p style="color: #666; font-size: 14px; margin-top: 0; margin-bottom: 4px;">Date</p>
          <p style="font-weight: 500; margin: 0;">${formattedDate}</p>
        </div>
        
        <div style="flex: 1; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
          <p style="color: #666; font-size: 14px; margin-top: 0; margin-bottom: 4px;">Time</p>
          <p style="font-weight: 500; margin: 0;">${booking.appointmentTime || "Not specified"}</p>
        </div>
      </div>
      
      <div style="padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
        <p style="color: #666; font-size: 14px; margin-top: 0; margin-bottom: 4px;">Address</p>
        <p style="font-weight: 500; margin: 0;">${booking.streetAddress}${booking.addressLine2 ? `, ${booking.addressLine2}` : ''}</p>
        <p style="font-weight: 500; margin: 0;">${booking.city}, ${booking.state} ${booking.zipCode}</p>
      </div>
    </div>
    
    <!-- Services -->
    <div style="margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 16px;">Services</h2>
      
      <div style="border-top: 1px solid #eee;">
        ${servicesHtml}
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding-top: 16px; border-top: 1px solid #eee;">
        <span style="font-weight: 600;">Total Price</span>
        <span style="font-size: 20px; font-weight: 700;">${totalPrice}</span>
      </div>
    </div>
    
    <!-- Next Steps -->
    <div style="padding: 16px; background-color: #f5f5f5; border-radius: 8px; margin-bottom: 24px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-top: 0; margin-bottom: 8px;">Next Steps</h2>
      <p style="margin: 0; line-height: 1.5;">
        You'll receive a confirmation email shortly with your booking details. Our team will contact you 
        before your appointment to confirm all details.
      </p>
    </div>
    
    <div style="text-align: center;">
      <a href="tel:${COMPANY_PHONE}" style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px; font-weight: 500;">
        📞 Call Us
      </a>
      <a href="${COMPANY_WEBSITE}" style="display: inline-block; background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; font-weight: 500;">
        🌐 Visit Website
      </a>
    </div>
  `;
}

function getRescheduleConfirmationContent(booking: Booking & { smartHomeItems?: any[] }, previousDate?: string, previousTime?: string): string {
  // Implementation for reschedule confirmation emails
  const formattedDate = booking.preferredDate
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';

  let formattedPreviousDate = 'Not available';
  if (previousDate) {
    try {
      formattedPreviousDate = format(new Date(previousDate), 'EEEE, MMMM d, yyyy');
    } catch (e) {
      formattedPreviousDate = previousDate;
    }
  }
  
  return `
    <div style="margin-bottom: 15px; text-align: center;">
      <img src="https://i.ibb.co/HKL3zs8/calendar-check.png" alt="Reschedule" width="64" height="64" style="display: inline-block;">
    </div>
    
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Appointment Rescheduled</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      Your appointment with Picture Perfect TV Install has been successfully rescheduled. 
      Here are your updated appointment details:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Appointment Changes</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Previous Date:</strong></td>
          <td style="padding: 8px 0;">${formattedPreviousDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Previous Time:</strong></td>
          <td style="padding: 8px 0;">${previousTime || 'Not specified'}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding: 15px 0; text-align: center;">
            <img src="https://i.ibb.co/qxGD7Zr/arrow-down.png" alt="Changed to" width="24" height="24">
          </td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>New Date:</strong></td>
          <td style="padding: 8px 0;"><strong>${formattedDate}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>New Time:</strong></td>
          <td style="padding: 8px 0;"><strong>${booking.appointmentTime || 'Not specified'}</strong></td>
        </tr>
      </table>
    </div>
    
    <!-- Service Details Remain the Same -->
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Service Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0;">${booking.serviceType || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Location:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}</td>
        </tr>
      </table>
    </div>
    
    <!-- Calendar Update Notice -->
    <div style="background-color: #FFF3CD; padding: 15px; border-radius: 8px; margin-bottom: 25px; border-left: 4px solid #FFC107;">
      <p style="margin: 0; font-size: 15px; line-height: 1.5;">
        <strong>Important:</strong> We've attached an updated calendar invitation for your new appointment time.
        Please add it to your calendar to help you remember your rescheduled service.
      </p>
    </div>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      If you need to make any further changes to your booking or have any questions,
      please don't hesitate to contact us.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5; text-align: center;">
      <a href="tel:${COMPANY_PHONE}" style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
        <span style="font-weight: bold;">📞 Call Us</span>
      </a>
      <a href="${COMPANY_WEBSITE}" style="display: inline-block; background-color: #4caf50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        <span style="font-weight: bold;">🌐 Visit Website</span>
      </a>
    </p>
  `;
}

// Note: Add other email generation functions here...

/**
 * Send an enhanced email for various notification types
 */
export async function sendEnhancedEmail(
  emailType: EmailType,
  recipientEmail: string,
  booking?: Booking,
  options?: EmailOptions
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  if (!recipientEmail) {
    console.error('Recipient email is required');
    return false;
  }

  try {
    // Email template content based on type
    let emailContent = '';
    let emailSubject = '';
    let calendarEvent: string | null = null;

    // Generate appropriate content based on email type
    switch (emailType) {
      case EmailType.BOOKING_CONFIRMATION:
        if (!booking) {
          console.error('Booking data is required for booking confirmation email');
          return false;
        }
        emailContent = getBookingConfirmationContent(booking);
        emailSubject = `Your TV Installation Booking Confirmation - ${COMPANY_NAME}`;
        try {
          if (options?.sendCalendar !== false) {
            calendarEvent = await createCalendarEvent(booking);
          }
        } catch (calendarError) {
          console.warn('Failed to create calendar event:', calendarError);
        }
        break;

      case EmailType.RESCHEDULE_CONFIRMATION:
        if (!booking) {
          console.error('Booking data is required for reschedule confirmation email');
          return false;
        }
        emailContent = getRescheduleConfirmationContent(
          booking,
          options?.previousDate,
          options?.previousTime
        );
        emailSubject = `Your Appointment Has Been Rescheduled - ${COMPANY_NAME}`;
        try {
          if (options?.sendCalendar !== false) {
            calendarEvent = await createCalendarEvent(booking);
          }
        } catch (calendarError) {
          console.warn('Failed to create calendar event:', calendarError);
        }
        break;

      // Add other email types as needed

      default:
        console.error(`Unsupported email type: ${emailType}`);
        return false;
    }

    // Apply master template
    const htmlContent = masterEmailTemplate(emailSubject, emailContent);
    
    // Create plain text version
    const textContent = createPlainTextVersion(htmlContent);

    // Set up email
    const msg: any = {
      to: recipientEmail,
      from: FROM_EMAIL,
      subject: emailSubject,
      html: htmlContent,
      text: textContent,
    };

    // Add calendar attachment if available
    if (calendarEvent) {
      msg.attachments = [
        {
          content: Buffer.from(calendarEvent).toString('base64'),
          filename: 'appointment.ics',
          type: 'text/calendar',
          disposition: 'attachment'
        }
      ];
    }

    // Send the email
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending enhanced email:', error);
    throw error;
  }
}

// Export specific email sending functions
export async function sendEnhancedBookingConfirmation(booking: Booking): Promise<boolean> {
  return sendEnhancedEmail(EmailType.BOOKING_CONFIRMATION, booking.email, booking);
}

export async function sendRescheduleConfirmation(
  booking: Booking,
  previousDate?: string,
  previousTime?: string
): Promise<boolean> {
  return sendEnhancedEmail(
    EmailType.RESCHEDULE_CONFIRMATION,
    booking.email,
    booking,
    { previousDate, previousTime }
  );
}

export async function sendEnhancedCancellationEmail(
  booking: Booking,
  reason?: string
): Promise<boolean> {
  return sendEnhancedEmail(
    EmailType.BOOKING_CANCELLATION,
    booking.email,
    booking,
    { reason }
  );
}

export async function sendServiceEditNotification(
  booking: Booking,
  updates: Partial<Booking>
): Promise<boolean> {
  return sendEnhancedEmail(
    EmailType.SERVICE_EDIT,
    booking.email,
    booking,
    { updates }
  );
}

// More specific email sending functions can be added here