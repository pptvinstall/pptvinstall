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
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'pptvinstall@gmail.com';
const FROM_EMAIL = process.env.EMAIL_FROM || 'Picture Perfect TV Install <noreply@pptvinstall.com>';
const COMPANY_NAME = 'Picture Perfect TV Install';
const COMPANY_PHONE = '404-702-4748';
const COMPANY_WEBSITE = 'https://PPTVInstall.com';
// Use the logo from our public assets directory
const LOGO_URL = 'https://d11f8565-cd09-4efd-be2c-0981b311e35a-00-1smf2f5e8thhk.worf.replit.dev/images/pptv-logo.png';

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
    
    // Parse the appointment time (e.g., "7:30 PM")
    // Initialize with fallback time first
    const startTime = new Date(eventDate);
    startTime.setHours(12, 0, 0, 0); // Default to noon
    
    try {
      // Try different time formats
      const timeFormats = ['h:mm a', 'h:mm aa', 'hh:mm a', 'hh:mm aa'];
      let parsed = false;
      
      for (const format of timeFormats) {
        try {
          const parsedTime = parse(booking.appointmentTime, format, eventDate);
          // Check if the parsed time is valid
          if (!isNaN(parsedTime.getTime())) {
            startTime.setHours(parsedTime.getHours(), parsedTime.getMinutes(), 0, 0);
            parsed = true;
            break;
          }
        } catch (formatError) {
          continue;
        }
      }
      
      if (!parsed) {
        console.warn('Unable to parse appointment time:', booking.appointmentTime, 'using default noon');
      }
    } catch (e) {
      console.error('Time parsing failed for:', booking.appointmentTime, e);
      // Already set to noon as fallback
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
      <td align="center" style="padding: 0; background-color: #000000;">
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
    <!-- Info Banner -->
    <div style="background-color: #e3f2fd; border: 1px solid #2196f3; border-radius: 8px; padding: 16px; margin-bottom: 30px; text-align: center;">
      <p style="color: #1976d2; margin: 0; font-size: 16px; font-weight: 500;">
        📧 This email contains your full installation confirmation
      </p>
    </div>

    <!-- Header Section with Success Message -->
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
    
    <!-- Customer Information Section -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center;">
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
    
    <!-- Service Details Section -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center;">
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
    
    <!-- Installation Address Section -->
    <div style="margin-bottom: 30px; padding: 20px; border: 1px solid #e9ecef; border-radius: 8px;">
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center;">
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
      <h2 style="color: #2563eb; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center;">
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
    <!-- Customer Notes Section -->
    <div style="margin-bottom: 30px; padding: 20px; background-color: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
      <h2 style="color: #856404; font-size: 18px; font-weight: 600; margin: 0 0 12px 0; display: flex; align-items: center;">
        📝 Customer Notes
      </h2>
      <div style="color: #856404; line-height: 1.5;">
        ${booking.notes}
      </div>
    </div>
    ` : ''}
    
    <!-- Next Steps Section -->
    <div style="margin-bottom: 30px; padding: 20px; background-color: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px;">
      <h2 style="color: #155724; font-size: 18px; font-weight: 600; margin: 0 0 12px 0; display: flex; align-items: center;">
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
        📧 <strong>Didn't receive this email?</strong> Check your spam or junk folder.<br>
        For immediate assistance, call us at ${COMPANY_PHONE}
      </p>
    </div>
  `;
}

/**
 * Creates HTML content for admin notification emails
 * The admin notification contains all booking details with clear sections
 */
function getAdminNotificationContent(booking: Booking & { smartHomeItems?: any[] }): string {
  // Format the booking date for display
  const formattedDate = booking.preferredDate
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
    
  // Create a simplified service details section for admin emails
  // Parse pricing breakdown to get relevant items
  const pricingBreakdown = booking.pricingBreakdown || [];
  
  // Get TV installations
  const tvItems = pricingBreakdown.filter((item: any) => item.type === 'tv');
  const tvHTML = tvItems.length > 0 
    ? `<h3 style="color: #005cb9; margin-top: 15px; margin-bottom: 10px;">TV Mounting (${tvItems.length})</h3>
       <ul style="margin-top: 5px; padding-left: 20px;">
         ${tvItems.map((tv: any, index: number) => `
           <li style="margin-bottom: 8px;">
             TV ${index + 1}: ${tv.size === 'large' ? '56"+' : '32"-55"'} - 
             ${tv.location === 'over_fireplace' ? 'Over Fireplace' : 'Standard Wall'} - 
             ${tv.mountType === 'full_motion' || tv.mountType === 'fullMotion' ? 'Full-Motion Mount' : 
               tv.mountType === 'tilting' ? 'Tilting Mount' : 
               tv.mountType === 'fixed' ? 'Fixed Mount' : 
               tv.mountType === 'customer_provided' || tv.mountType === 'customer' ? 'Customer-Provided Mount' : 'Standard Mount'}
             ${tv.masonryWall ? ' - Masonry/Brick Wall' : ''}
             ${tv.highRise ? ' - High-Rise/Steel Studs' : ''}
             ${tv.outletRelocation ? ' - Outlet Relocation' : ''}
           </li>
         `).join('')}
       </ul>`
    : '';
  
  // Get smart home items
  const smartHomeItems = pricingBreakdown.filter((item: any) => 
    ['doorbell', 'camera', 'floodlight', 'smartlock', 'thermostat', 'speaker'].includes(item.type)
  );
  
  const smartHomeHTML = smartHomeItems.length > 0
    ? `<h3 style="color: #005cb9; margin-top: 15px; margin-bottom: 10px;">Smart Home Devices (${smartHomeItems.length})</h3>
       <ul style="margin-top: 5px; padding-left: 20px;">
         ${smartHomeItems.map((item: any) => `
           <li style="margin-bottom: 8px;">
             ${item.type === 'doorbell' ? 'Smart Doorbell' : 
               item.type === 'camera' ? 'Smart Camera' : 
               item.type === 'floodlight' ? 'Smart Floodlight' : 
               item.type === 'smartlock' ? 'Smart Lock' : 
               item.type === 'thermostat' ? 'Smart Thermostat' : 
               item.type === 'speaker' ? 'Smart Speaker' : 
               'Smart Device'} 
             ${item.count && item.count > 1 ? `(${item.count})` : ''}
             ${item.brickInstallation ? ' - Brick Installation' : ''}
             ${item.mountHeight ? ` - Mount Height: ${item.mountHeight} ft` : ''}
           </li>
         `).join('')}
       </ul>`
    : '';
  
  // Special notes
  const notesHTML = booking.notes 
    ? `<div style="margin-top: 15px; padding: 15px; background-color: #fff7e5; border-left: 4px solid #ffc107; border-radius: 4px;">
         <h3 style="color: #b88600; margin-top: 0; margin-bottom: 8px; font-size: 16px;">Customer Notes:</h3>
         <p style="margin: 0; white-space: pre-wrap;">${booking.notes}</p>
       </div>`
    : '';
  
  return `
    <div style="margin-bottom: 15px; text-align: center;">
      <span style="font-size: 64px;">🔔</span>
    </div>
    
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">New Booking Alert!</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      A new booking has been received. Here are the details:
    </p>
    
    <div style="background-color: #e8f4ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${booking.name || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${booking.email}" style="color: #005cb9;">${booking.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Phone:</strong></td>
          <td style="padding: 8px 0;"><a href="tel:${booking.phone}" style="color: #005cb9;">${booking.phone}</a></td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f0faff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Appointment Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0;"><strong>${formattedDate}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0;"><strong>${booking.appointmentTime || 'Not specified'}</strong></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0;">${booking.serviceType || 'TV Installation'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Total Amount:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">$${typeof booking.pricingTotal === 'number' ? booking.pricingTotal.toFixed(2) : booking.pricingTotal || '0.00'}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f2f7ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Location Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City:</strong></td>
          <td style="padding: 8px 0;">${booking.city || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>State:</strong></td>
          <td style="padding: 8px 0;">${booking.state || 'Not provided'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode || 'Not provided'}</td>
        </tr>
      </table>
      
      <div style="margin-top: 15px;">
        <a href="https://maps.google.com/?q=${encodeURIComponent(`${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`)}" 
           style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          View on Google Maps
        </a>
      </div>
    </div>
    
    <div style="background-color: #f5f9ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Service Details</h2>
      
      <div style="font-size: 15px; line-height: 1.5;">
        ${tvHTML}
        ${smartHomeHTML}
        ${notesHTML}
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 30px; margin-bottom: 30px;">
      <a href="tel:${booking.phone}" 
         style="display: inline-block; background-color: #2e7d32; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; margin-right: 10px;">
        Call Customer
      </a>
      <a href="mailto:${booking.email}" 
         style="display: inline-block; background-color: #1976d2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">
        Email Customer
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
      <a href="tel:${COMPANY_PHONE}" style="display: inline-block; background-color: #000000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
        <span style="font-weight: bold;">📞 Call Us</span>
      </a>
      <a href="${COMPANY_WEBSITE}" style="display: inline-block; background-color: #ff0000; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        <span style="font-weight: bold;">🌐 Visit Website</span>
      </a>
    </p>
  `;
}

/**
 * Create a plain text version of the email content for better deliverability
 */
function createPlainTextVersion(htmlContent: string, booking?: Booking): string {
  if (!booking) {
    return htmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  const formattedDate = booking.preferredDate
    ? format(parseISO(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';

  const totalPrice = booking.pricingTotal ? `$${booking.pricingTotal.toFixed(2)}` : 'Contact for pricing';

  return `
PICTURE PERFECT TV INSTALL
Your Installation Confirmation

Booking Confirmed!
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

Didn't receive this email? Check your spam or junk folder.
For immediate assistance, call us at ${COMPANY_PHONE}

This email contains your full installation confirmation.
  `.trim();
}

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
        const bookingDate = booking.preferredDate ? format(parseISO(booking.preferredDate), 'MMM d') : '';
        const bookingTime = booking.appointmentTime || '';
        emailSubject = bookingDate && bookingTime 
          ? `Your Booking is Confirmed – ${bookingDate} @ ${bookingTime}`
          : `Your TV Installation is Confirmed – ${booking.name}`;
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
        
      case EmailType.ADMIN_NOTIFICATION:
        if (!booking) {
          console.error('Booking data is required for admin notification email');
          return false;
        }
        emailContent = getAdminNotificationContent(booking);
        const adminDate = booking.preferredDate ? format(parseISO(booking.preferredDate), 'MMM d') : '';
        const adminTime = booking.appointmentTime || '';
        emailSubject = adminDate && adminTime 
          ? `New Booking: ${booking.name} – ${adminDate} @ ${adminTime}`
          : `New Booking Alert: ${booking.name}`;
        break;
        
      case EmailType.SERVICE_EDIT:
        if (!booking) {
          console.error('Booking data is required for service edit notification email');
          return false;
        }
        
        const editFormattedDate = booking.preferredDate 
          ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
          : 'Not specified';
        
        const updates = options?.updates || {};
        const updatesList: string[] = [];
        
        // Build a list of updates to show in the email
        if (updates.preferredDate) {
          const formattedNewDate = format(new Date(updates.preferredDate), 'EEEE, MMMM d, yyyy');
          updatesList.push(`<li>Appointment date changed to: <strong>${formattedNewDate}</strong></li>`);
        }
        
        if (updates.appointmentTime) {
          updatesList.push(`<li>Appointment time changed to: <strong>${updates.appointmentTime}</strong></li>`);
        }
        
        if (updates.streetAddress || updates.city || updates.state || updates.zipCode) {
          updatesList.push(`<li>Service location updated</li>`);
        }
        
        if (updates.pricingBreakdown) {
          updatesList.push(`<li>Service selections modified</li>`);
        }
        
        if (updates.pricingTotal) {
          const formattedPrice = typeof updates.pricingTotal === 'number' 
            ? `$${updates.pricingTotal.toFixed(2)}` 
            : updates.pricingTotal;
          updatesList.push(`<li>Total price updated to: <strong>${formattedPrice}</strong></li>`);
        }
        
        if (updates.notes) {
          updatesList.push(`<li>Special instructions updated</li>`);
        }
        
        const updatesHtml = updatesList.length > 0 
          ? `<ul style="margin-top: 10px;">${updatesList.join('')}</ul>` 
          : '<p>Your booking details have been updated.</p>';
          
        emailSubject = `Your TV Installation Service Has Been Updated - ${COMPANY_NAME}`;
        
        emailContent = `
          <h1>Service Update Confirmation</h1>
          
          <div style="background-color: #f0f7ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Your booking has been updated</strong></p>
            <p style="margin-bottom: 0;">Booking Reference: ${booking.id}</p>
          </div>
          
          <p>Hello ${booking.name},</p>
          
          <p>Your TV installation appointment scheduled for <strong>${editFormattedDate}</strong> at <strong>${booking.appointmentTime}</strong> has been updated with the following changes:</p>
          
          <div style="padding: 15px; background-color: #f5f5f5; border-radius: 8px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Updates to your booking:</strong></p>
            ${updatesHtml}
          </div>
          
          <p>If you have any questions about these changes or need to make further adjustments, please contact us at:</p>
          <ul>
            <li>Phone: ${COMPANY_PHONE}</li>
            <li>Email: ${ADMIN_EMAIL}</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pptvinstall.com/booking" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">View Booking Details</a>
          </div>
          
          <p>Thank you for choosing Picture Perfect TV Install for your installation needs.</p>
        `;
        break;
        
      case EmailType.BOOKING_CANCELLATION:
        if (!booking) {
          console.error('Booking data is required for booking cancellation email');
          return false;
        }
        
        const cancelFormattedDate = booking.preferredDate 
          ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
          : 'Not specified';
          
        const reason = options?.reason || 'No reason provided';
        
        emailSubject = `Your TV Installation Booking Has Been Cancelled - ${COMPANY_NAME}`;
        
        emailContent = `
          <h1>Booking Cancellation Confirmation</h1>
          
          <div style="background-color: #fff5f5; border-left: 4px solid #e53e3e; padding: 15px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Your booking has been cancelled</strong></p>
            <p style="margin-bottom: 0;">Booking Reference: ${booking.id}</p>
          </div>
          
          <p>Hello ${booking.name},</p>
          
          <p>Your TV installation appointment scheduled for <strong>${cancelFormattedDate}</strong> at <strong>${booking.appointmentTime}</strong> has been cancelled.</p>
          
          <div style="padding: 15px; background-color: #f5f5f5; border-radius: 8px; margin: 20px 0;">
            <p style="margin-top: 0;"><strong>Cancellation reason:</strong></p>
            <p style="margin-bottom: 0;">${reason}</p>
          </div>
          
          <p>If you'd like to reschedule your appointment or have any questions about this cancellation, please contact us at:</p>
          <ul>
            <li>Phone: ${COMPANY_PHONE}</li>
            <li>Email: ${ADMIN_EMAIL}</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pptvinstall.com/booking" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Reschedule Appointment</a>
          </div>
          
          <p>We appreciate your understanding and hope to serve you soon.</p>
        `;
        break;
        
      case EmailType.PASSWORD_RESET:
        if (!options?.resetToken) {
          console.error('Reset token is required for password reset email');
          return false;
        }
        
        const userName = booking?.name || 'Customer';
        emailSubject = `Password Reset Request - ${COMPANY_NAME}`;
        
        // Create a reset link - in production this would point to your actual reset page
        const resetToken = options.resetToken;
        const resetLink = `https://pptvinstall.com/reset-password?token=${resetToken}`;
        
        emailContent = `
          <h1>Password Reset Request</h1>
          <p>Hello ${userName},</p>
          <p>We received a request to reset your password for your Picture Perfect TV Install account. Click the button below to reset your password:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
          </div>
          
          <p>If you didn't request this password reset, you can safely ignore this email. Your password will not be changed.</p>
          
          <div style="background-color: #f0f7ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <p><strong>Note:</strong> This password reset link is valid for 24 hours.</p>
          </div>
          
          <p>If you have any questions or need assistance, please contact us at:</p>
          <p>Email: PPTVInstall@gmail.com</p>
          <p>Phone: ${COMPANY_PHONE}</p>
        `;
        break;
        
      case EmailType.WELCOME:
        const welcomeName = booking?.name || 'Customer';
        emailSubject = `Welcome to ${COMPANY_NAME}!`;
        
        emailContent = `
          <h1>Welcome to Picture Perfect TV Install!</h1>
          
          <p>Hello ${welcomeName},</p>
          
          <p>Thank you for creating an account with Picture Perfect TV Install. We're excited to have you join our community of satisfied customers!</p>
          
          <div style="background-color: #f0f7ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0;">What happens next?</h3>
            <p>You can now book TV installation and smart home services through our website. Your account helps us keep track of your service history and preferences.</p>
          </div>
          
          <p>Here are some of our popular services:</p>
          <ul style="list-style-type: none; padding-left: 0;">
            <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
              <span style="position: absolute; left: 0; top: 2px;">✓</span> TV Mounting (Standard and Over Fireplace)
            </li>
            <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
              <span style="position: absolute; left: 0; top: 2px;">✓</span> Smart Home Device Installation
            </li>
            <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
              <span style="position: absolute; left: 0; top: 2px;">✓</span> Wire Concealment
            </li>
            <li style="margin-bottom: 10px; padding-left: 24px; position: relative;">
              <span style="position: absolute; left: 0; top: 2px;">✓</span> TV Remounting & Unmounting
            </li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://pptvinstall.com/booking" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">Book Your Service</a>
          </div>
          
          <p>If you have any questions or need assistance, please don't hesitate to contact us:</p>
          <p>Phone: ${COMPANY_PHONE}</p>
          <p>Email: ${ADMIN_EMAIL}</p>
        `;
        break;
        
      // Add other email types as needed

      default:
        console.error(`Unsupported email type: ${emailType}`);
        return false;
    }

    // Apply master template
    const htmlContent = masterEmailTemplate(emailSubject, emailContent);
    
    // Create plain text version
    const textContent = createPlainTextVersion(emailContent, booking);

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

/**
 * Send password reset email with reset token
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  try {
    // Create a minimal booking object with just name and email
    const userInfo: Partial<Booking> = {
      name,
      email
    };
    
    return await sendEnhancedEmail(
      EmailType.PASSWORD_RESET,
      email,
      userInfo as Booking,
      { resetToken }
    );
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Helper function for testing email templates
 * This creates a sample booking and sends the specified email type
 */
export async function sendTestEmail(emailType: EmailType, recipientEmail: string): Promise<boolean> {
  // Create a test booking with all needed fields
  const testBooking: Booking = {
    id: "9999",
    name: "Test Customer",
    email: recipientEmail,
    phone: "404-702-4748",
    status: "active",
    streetAddress: "123 Test Street",
    city: "Atlanta",
    state: "GA",
    zipCode: "30303",
    serviceType: "TV Installation",
    preferredDate: new Date().toISOString().split('T')[0], // Today
    appointmentTime: "3:00 PM",
    notes: "This is a test booking",
    pricingTotal: 249.99,
    pricingBreakdown: [
      {
        type: "tv",
        size: "large",
        location: "standard",
        mountType: "fullMotion",
        masonryWall: false,
        highRise: false,
        outletRelocation: true
      },
      {
        type: "camera",
        count: 2,
        hasExistingWiring: true
      }
    ],
    createdAt: new Date().toISOString()
  };
  
  // Handle special case for password reset
  if (emailType === EmailType.PASSWORD_RESET) {
    return sendPasswordResetEmail(
      recipientEmail,
      "Test Customer",
      "test-reset-token-12345"
    );
  }
  
  // Send the appropriate email based on type
  return sendEnhancedEmail(
    emailType,
    recipientEmail,
    testBooking
  );
}

/**
 * Send admin notification email for new bookings
 * This sends a notification only to the business admin email
 */
export async function sendAdminNotification(booking: Booking): Promise<boolean> {
  if (!ADMIN_EMAIL) {
    console.warn('Admin email not set. Admin notification not sent.');
    return false;
  }
  
  try {
    // Send to ADMIN_EMAIL (PPTVInstall@gmail.com) only
    const adminResult = await sendEnhancedEmail(
      EmailType.ADMIN_NOTIFICATION,
      ADMIN_EMAIL,
      booking
    );
    
    return adminResult;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    // Don't rethrow error for admin emails to prevent booking failures
    return false;
  }
}