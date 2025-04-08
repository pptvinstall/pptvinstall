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
const LOGO_URL = '/assets/logo-pptv-black.png';

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
      <td align="center" style="padding: 20px 0; background-color: #005cb9;">
        <img src="${LOGO_URL}" alt="${COMPANY_NAME}" style="max-height: 60px; max-width: 80%;">
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
 * Create booking confirmation email content
 */
function getBookingConfirmationContent(booking: Booking): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
    
  // Extract TV size and mount type from pricingBreakdown if available
  let tvSize = 'Not specified';
  let mountType = 'Not specified';
  
  if (booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown) && booking.pricingBreakdown.length > 0) {
    // Find the first TV item
    const tvItem = booking.pricingBreakdown.find(item => item.type === 'tv');
    if (tvItem) {
      if (tvItem.size) {
        // Convert size from 'small', 'medium', 'large' to actual dimensions
        if (tvItem.size === 'small') tvSize = 'Up to 43"';
        else if (tvItem.size === 'medium') tvSize = '44"-65"';
        else if (tvItem.size === 'large') tvSize = '65"+'
        else tvSize = tvItem.size; // Use as-is if it's already descriptive
      }
      
      if (tvItem.mountType) {
        // Convert mountType codes to readable descriptions
        if (tvItem.mountType === 'fixed') mountType = 'Fixed Wall Mount';
        else if (tvItem.mountType === 'tilting') mountType = 'Tilting Wall Mount';
        else if (tvItem.mountType === 'fullMotion') mountType = 'Full Motion Wall Mount';
        else if (tvItem.mountType === 'ceiling') mountType = 'Ceiling Mount';
        else if (tvItem.mountType === 'customer') mountType = 'Customer Provided Mount';
        else mountType = tvItem.mountType; // Use as-is if it doesn't match predefined types
      }
    }
  }

  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Booking Confirmation</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      Thank you for choosing Picture Perfect TV Install for your home entertainment needs. 
      We're excited to confirm your booking and look forward to providing you with exceptional service.
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Service Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0;">${booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0;">${booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0;">${tvSize}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0;">${mountType}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Location Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City, State:</strong></td>
          <td style="padding: 8px 0;">${booking.city}, ${booking.state}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode}</td>
        </tr>
      </table>
    </div>
    
    ${booking.notes ? `
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Additional Notes</h2>
      <p style="margin: 0; font-size: 15px;">${booking.notes}</p>
    </div>
    ` : ''}
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Important:</strong> We've attached a calendar invitation for your appointment. 
        Please add it to your calendar to help you remember your scheduled service.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5;">
      If you need to make any changes to your booking or have any questions, 
      please contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #005cb9;">${ADMIN_EMAIL}</a> 
      or call us at ${COMPANY_PHONE}.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      We look forward to serving you!
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      Warm regards,<br>
      The Picture Perfect TV Install Team
    </p>
  `;
}

/**
 * Create reschedule confirmation email content
 */
function getRescheduleConfirmationContent(booking: Booking, previousDate?: string, previousTime?: string): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
  
  const formattedPreviousDate = previousDate && typeof previousDate === 'string'
    ? format(new Date(previousDate), 'EEEE, MMMM d, yyyy')
    : 'Not available';
    
  // Extract TV size and mount type from pricingBreakdown if available
  let tvSize = 'Not specified';
  let mountType = 'Not specified';
  
  if (booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown) && booking.pricingBreakdown.length > 0) {
    // Find the first TV item
    const tvItem = booking.pricingBreakdown.find(item => item.type === 'tv');
    if (tvItem) {
      if (tvItem.size) {
        // Convert size from 'small', 'medium', 'large' to actual dimensions
        if (tvItem.size === 'small') tvSize = 'Up to 43"';
        else if (tvItem.size === 'medium') tvSize = '44"-65"';
        else if (tvItem.size === 'large') tvSize = '65"+'
        else tvSize = tvItem.size; // Use as-is if it's already descriptive
      }
      
      if (tvItem.mountType) {
        // Convert mountType codes to readable descriptions
        if (tvItem.mountType === 'fixed') mountType = 'Fixed Wall Mount';
        else if (tvItem.mountType === 'tilting') mountType = 'Tilting Wall Mount';
        else if (tvItem.mountType === 'fullMotion') mountType = 'Full Motion Wall Mount';
        else if (tvItem.mountType === 'ceiling') mountType = 'Ceiling Mount';
        else if (tvItem.mountType === 'customer') mountType = 'Customer Provided Mount';
        else mountType = tvItem.mountType; // Use as-is if it doesn't match predefined types
      }
    }
  }
  
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Appointment Rescheduled</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      Your appointment with Picture Perfect TV Install has been successfully rescheduled.
      Here are your updated appointment details:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">New Appointment Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0;">${booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>New Date:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: #005cb9;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>New Time:</strong></td>
          <td style="padding: 8px 0; font-weight: bold; color: #005cb9;">${booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0;">${tvSize}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0;">${mountType}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f1f1f1; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Previous Appointment</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Previous Date:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${formattedPreviousDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Previous Time:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${previousTime || 'Not available'}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Location Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City, State:</strong></td>
          <td style="padding: 8px 0;">${booking.city}, ${booking.state}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode}</td>
        </tr>
      </table>
    </div>
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Important:</strong> We've attached an updated calendar invitation for your appointment. 
        Please update your calendar to reflect this change.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5;">
      If you need to make any further changes or have any questions, 
      please contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #005cb9;">${ADMIN_EMAIL}</a> 
      or call us at ${COMPANY_PHONE}.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      Thank you for your flexibility.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      Best regards,<br>
      The Picture Perfect TV Install Team
    </p>
  `;
}

/**
 * Create service edit notification email content
 */
function getServiceEditContent(booking: Booking, updates: Partial<Booking>): string {
  // Extract TV size and mount type from pricingBreakdown if available
  let bookingTvSize = 'Not specified';
  let bookingMountType = 'Not specified';
  
  if (booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown) && booking.pricingBreakdown.length > 0) {
    // Find the first TV item
    const tvItem = booking.pricingBreakdown.find(item => item.type === 'tv');
    if (tvItem) {
      if (tvItem.size) {
        // Convert size from 'small', 'medium', 'large' to actual dimensions
        if (tvItem.size === 'small') bookingTvSize = 'Up to 43"';
        else if (tvItem.size === 'medium') bookingTvSize = '44"-65"';
        else if (tvItem.size === 'large') bookingTvSize = '65"+'
        else bookingTvSize = tvItem.size; // Use as-is if it's already descriptive
      }
      
      if (tvItem.mountType) {
        // Convert mountType codes to readable descriptions
        if (tvItem.mountType === 'fixed') bookingMountType = 'Fixed Wall Mount';
        else if (tvItem.mountType === 'tilting') bookingMountType = 'Tilting Wall Mount';
        else if (tvItem.mountType === 'fullMotion') bookingMountType = 'Full Motion Wall Mount';
        else if (tvItem.mountType === 'ceiling') bookingMountType = 'Ceiling Mount';
        else if (tvItem.mountType === 'customer') bookingMountType = 'Customer Provided Mount';
        else bookingMountType = tvItem.mountType; // Use as-is if it doesn't match predefined types
      }
    }
  }
  
  // Check if updates contains pricingBreakdown changes
  let updatesTvSize = null;
  let updatesMountType = null;
  
  if (updates.pricingBreakdown && Array.isArray(updates.pricingBreakdown) && updates.pricingBreakdown.length > 0) {
    const tvItem = updates.pricingBreakdown.find(item => item.type === 'tv');
    if (tvItem) {
      if (tvItem.size) {
        if (tvItem.size === 'small') updatesTvSize = 'Up to 43"';
        else if (tvItem.size === 'medium') updatesTvSize = '44"-65"';
        else if (tvItem.size === 'large') updatesTvSize = '65"+'
        else updatesTvSize = tvItem.size;
      }
      
      if (tvItem.mountType) {
        if (tvItem.mountType === 'fixed') updatesMountType = 'Fixed Wall Mount';
        else if (tvItem.mountType === 'tilting') updatesMountType = 'Tilting Wall Mount';
        else if (tvItem.mountType === 'fullMotion') updatesMountType = 'Full Motion Wall Mount';
        else if (tvItem.mountType === 'ceiling') updatesMountType = 'Ceiling Mount';
        else if (tvItem.mountType === 'customer') updatesMountType = 'Customer Provided Mount';
        else updatesMountType = tvItem.mountType;
      }
    }
  }
  
  // Create a list of what was updated
  let updatedFieldsHtml = '';
  if (updates.preferredDate) {
    updatedFieldsHtml += `
      <tr>
        <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
        <td style="padding: 8px 0; color: #005cb9;">${updates.preferredDate && typeof updates.preferredDate === 'string' ? format(new Date(updates.preferredDate), 'EEEE, MMMM d, yyyy') : 'Not specified'}</td>
      </tr>
    `;
  }
  if (updates.appointmentTime) {
    updatedFieldsHtml += `
      <tr>
        <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
        <td style="padding: 8px 0; color: #005cb9;">${updates.appointmentTime}</td>
      </tr>
    `;
  }
  if (updates.serviceType) {
    updatedFieldsHtml += `
      <tr>
        <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
        <td style="padding: 8px 0; color: #005cb9;">${updates.serviceType}</td>
      </tr>
    `;
  }
  if (updatesTvSize) {
    updatedFieldsHtml += `
      <tr>
        <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
        <td style="padding: 8px 0; color: #005cb9;">${updatesTvSize}</td>
      </tr>
    `;
  }
  if (updatesMountType) {
    updatedFieldsHtml += `
      <tr>
        <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
        <td style="padding: 8px 0; color: #005cb9;">${updatesMountType}</td>
      </tr>
    `;
  }
  if (updates.notes !== undefined) {
    updatedFieldsHtml += `
      <tr>
        <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Notes:</strong></td>
        <td style="padding: 8px 0; color: #005cb9;">${updates.notes}</td>
      </tr>
    `;
  }

  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Service Details Updated</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      The details of your TV installation service with Picture Perfect TV Install have been updated.
      Here's a summary of the changes:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Updated Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        ${updatedFieldsHtml}
      </table>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Complete Service Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0;">${updates.serviceType || booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0;">${
  (updates.preferredDate && typeof updates.preferredDate === 'string') 
  ? format(new Date(updates.preferredDate), 'EEEE, MMMM d, yyyy') 
  : (booking.preferredDate && typeof booking.preferredDate === 'string')
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified'
}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0;">${updates.appointmentTime || booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0;">${updatesTvSize || bookingTvSize}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0;">${updatesMountType || bookingMountType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City, State:</strong></td>
          <td style="padding: 8px 0;">${booking.city}, ${booking.state}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode}</td>
        </tr>
        ${(updates.notes !== undefined || booking.notes) ? `
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Notes:</strong></td>
          <td style="padding: 8px 0;">${updates.notes !== undefined ? updates.notes : booking.notes}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Note:</strong> If the date or time of your appointment has changed, 
        we've attached an updated calendar invitation. Please update your calendar accordingly.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5;">
      If you have any questions about these changes or need further assistance, 
      please contact us at <a href="mailto:${ADMIN_EMAIL}" style="color: #005cb9;">${ADMIN_EMAIL}</a> 
      or call us at ${COMPANY_PHONE}.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      We look forward to providing you with excellent service.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      Best regards,<br>
      The Picture Perfect TV Install Team
    </p>
  `;
}

/**
 * Create cancellation email content
 */
function getCancellationContent(booking: Booking, reason?: string): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
    
  // Extract TV size and mount type from pricingBreakdown if available
  let tvSize = 'Not specified';
  let mountType = 'Not specified';
  
  if (booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown) && booking.pricingBreakdown.length > 0) {
    // Find the first TV item
    const tvItem = booking.pricingBreakdown.find(item => item.type === 'tv');
    if (tvItem) {
      if (tvItem.size) {
        // Convert size from 'small', 'medium', 'large' to actual dimensions
        if (tvItem.size === 'small') tvSize = 'Up to 43"';
        else if (tvItem.size === 'medium') tvSize = '44"-65"';
        else if (tvItem.size === 'large') tvSize = '65"+'
        else tvSize = tvItem.size; // Use as-is if it's already descriptive
      }
      
      if (tvItem.mountType) {
        // Convert mountType codes to readable descriptions
        if (tvItem.mountType === 'fixed') mountType = 'Fixed Wall Mount';
        else if (tvItem.mountType === 'tilting') mountType = 'Tilting Wall Mount';
        else if (tvItem.mountType === 'fullMotion') mountType = 'Full Motion Wall Mount';
        else if (tvItem.mountType === 'ceiling') mountType = 'Ceiling Mount';
        else if (tvItem.mountType === 'customer') mountType = 'Customer Provided Mount';
        else mountType = tvItem.mountType; // Use as-is if it doesn't match predefined types
      }
    }
  }
  
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Booking Cancellation</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      This email confirms that your booking with Picture Perfect TV Install has been cancelled.
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Cancelled Booking Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0;">${booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0;">${tvSize}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0;">${mountType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        ${reason ? `
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Cancellation Reason:</strong></td>
          <td style="padding: 8px 0;">${reason}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5;">
      If you would like to schedule a new appointment, you can do so by visiting our website 
      or by calling us at ${COMPANY_PHONE}.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      We appreciate your understanding and hope to serve you in the future.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      Thank you,<br>
      The Picture Perfect TV Install Team
    </p>
  `;
}

/**
 * Send a professional email notification
 */
export async function sendEnhancedEmail(
  emailType: EmailType,
  to: string,
  booking: Booking,
  options?: {
    previousDate?: string;
    previousTime?: string;
    updates?: Partial<Booking>;
    reason?: string;
    sendToAdmin?: boolean;
    resetToken?: string; // Added for password reset emails
  }
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  // Set email parameters based on email type
  let subject = '';
  let content = '';
  let needsCalendar = false;
  
  switch (emailType) {
    case EmailType.BOOKING_CONFIRMATION:
      subject = 'Your TV Installation Booking Confirmation - Picture Perfect TV Install';
      content = getBookingConfirmationContent(booking);
      needsCalendar = true;
      break;
      
    case EmailType.RESCHEDULE_CONFIRMATION:
      subject = 'Your Appointment Has Been Rescheduled - Picture Perfect TV Install';
      content = getRescheduleConfirmationContent(
        booking, 
        options?.previousDate, 
        options?.previousTime
      );
      needsCalendar = true;
      break;
      
    case EmailType.SERVICE_EDIT:
      subject = 'Your Service Details Have Been Updated - Picture Perfect TV Install';
      content = getServiceEditContent(booking, options?.updates || {});
      needsCalendar = !!(options?.updates?.preferredDate || options?.updates?.appointmentTime);
      break;
      
    case EmailType.BOOKING_CANCELLATION:
      subject = 'Booking Cancellation Confirmation - Picture Perfect TV Install';
      content = getCancellationContent(booking, options?.reason);
      needsCalendar = false;
      break;
      
    case EmailType.WELCOME:
      subject = 'Welcome to Picture Perfect TV Install!';
      // For the welcome email, we use booking data as customer data
      // Create a compatible Customer object using booking data
      const customerData: Customer = {
        id: 0,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        password: 'placeholder', // Required by Customer type but not used
        loyaltyPoints: 0,
        memberSince: new Date().toISOString(),
        verificationToken: '',
        isVerified: true,
        passwordResetToken: "",
        passwordResetExpires: undefined,
        streetAddress: booking.streetAddress,
        city: booking.city,
        state: booking.state,
        zipCode: booking.zipCode,
        notificationSettings: {
          bookingConfirmation: true,
          reminderDay: true,
          reminderHour: true,
          marketing: false
        }
      };
      content = getWelcomeEmailContent(customerData);
      needsCalendar = false;
      break;
      
    case EmailType.PASSWORD_RESET:
      subject = 'Password Reset Request - Picture Perfect TV Install';
      // For password reset, we need a reset token which should be provided in options
      const resetToken = options?.resetToken as string || 'DEMO-TOKEN';
      // Use the same customer data format as welcome email, correctly matching the Customer type
      const passwordResetCustomer: Customer = {
        id: 0,
        name: booking.name,
        email: booking.email,
        phone: booking.phone,
        password: 'placeholder', // Required by Customer type but not used
        loyaltyPoints: 0,
        memberSince: new Date().toISOString(),
        verificationToken: '',
        isVerified: true,
        passwordResetToken: resetToken,
        passwordResetExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
        streetAddress: booking.streetAddress,
        city: booking.city,
        state: booking.state,
        zipCode: booking.zipCode,
        notificationSettings: {
          bookingConfirmation: true,
          reminderDay: true,
          reminderHour: true,
          marketing: false
        }
      };
      content = getPasswordResetEmailContent(passwordResetCustomer, resetToken);
      needsCalendar = false;
      break;
      
    default:
      console.error(`Unsupported email type: ${emailType}`);
      return false;
  }
  
  // Generate HTML email
  const htmlEmail = masterEmailTemplate(subject, content);
  
  // Generate plain text version
  const plainTextEmail = createPlainTextVersion(htmlEmail);
  
  // Generate calendar invitation if needed
  let calendarEvent: string | undefined;
  if (needsCalendar) {
    try {
      calendarEvent = await createCalendarEvent(booking);
    } catch (error) {
      console.error('Error creating calendar event:', error);
      // Continue anyway, as the calendar is optional
    }
  }
  
  // Prepare email message
  const msg: any = {
    to,
    from: FROM_EMAIL,
    subject,
    text: plainTextEmail,
    html: htmlEmail,
  };
  
  // Add calendar attachment if available
  if (calendarEvent) {
    msg.attachments = [
      {
        content: Buffer.from(calendarEvent).toString('base64'),
        filename: 'event.ics',
        type: 'text/calendar',
        disposition: 'attachment',
      },
    ];
  }
  
  try {
    // Send customer email
    await sgMail.send(msg);
    
    // Send admin notification if requested
    if (options?.sendToAdmin) {
      // Create appropriate admin notification based on email type
      let adminContent;
      let adminTitle;
      let adminSubject;
      
      switch (emailType) {
        case EmailType.BOOKING_CONFIRMATION:
          adminTitle = 'New Booking Alert';
          adminContent = getAdminNotificationContent(booking, emailType, options);
          adminSubject = 'New Booking Alert - Picture Perfect TV Install';
          break;
          
        case EmailType.RESCHEDULE_CONFIRMATION:
          adminTitle = 'Booking Rescheduled';
          adminContent = getAdminNotificationContent(booking, emailType, options);
          adminSubject = 'Booking Rescheduled - Picture Perfect TV Install';
          break;
          
        case EmailType.SERVICE_EDIT:
          adminTitle = 'Booking Updated';
          adminContent = getAdminNotificationContent(booking, emailType, options);
          adminSubject = 'Booking Updated - Picture Perfect TV Install';
          break;
          
        case EmailType.BOOKING_CANCELLATION:
          adminTitle = 'Booking Canceled';
          adminContent = getAdminNotificationContent(booking, emailType, options);
          adminSubject = 'Booking Canceled - Picture Perfect TV Install';
          break;
          
        default:
          adminTitle = `Admin Copy: ${subject}`;
          adminContent = content; // Use the same content as the customer email
          adminSubject = `[ADMIN COPY] ${subject}`;
      }

      const adminMsg = {
        to: ADMIN_EMAIL,
        from: FROM_EMAIL,
        subject: adminSubject,
        text: createPlainTextVersion(masterEmailTemplate(adminTitle, adminContent)),
        html: masterEmailTemplate(adminTitle, adminContent),
        attachments: msg.attachments // Reuse any attachments from the customer email
      };
      await sgMail.send(adminMsg);
    }
    
    return true;
  } catch (error: unknown) {
    console.error('Error sending email:', error);
    
    // Enhanced error logging
    if (error && typeof error === 'object') {
      if ('response' in error) {
        const sgError = error as any;
        console.error('SendGrid API response error:', sgError.response?.body);
        
        // Check if there's a more specific error like authentication failure
        if (sgError.response?.body?.errors) {
          const sgErrors = sgError.response.body.errors;
          sgErrors.forEach((err: any) => {
            console.error(`SendGrid error code ${err.code}: ${err.message}`);
          });
          
          // Check for typical auth errors
          const hasAuthError = sgErrors.some((err: any) => 
            err.message?.includes('authorization') || 
            err.message?.includes('apikey') || 
            err.message?.includes('api key') ||
            err.message?.includes('credentials')
          );
          
          if (hasAuthError) {
            console.error('SendGrid API key authentication error detected. Please verify API key.');
          }
        }
      } else if ('code' in error) {
        // Network or other non-API errors
        console.error(`Error code: ${(error as any).code}`);
        
        if ((error as any).code === 'ECONNREFUSED') {
          console.error('Could not connect to SendGrid API. Check network connectivity.');
        }
      }
    }
    
    // Return false to indicate failure - the error details will be available in logs
    return false;
  }
}

/**
 * Send a booking confirmation email with calendar attachment
 */
export async function sendEnhancedBookingConfirmation(booking: Booking): Promise<boolean> {
  return sendEnhancedEmail(EmailType.BOOKING_CONFIRMATION, booking.email, booking, { sendToAdmin: true });
}

/**
 * Send a reschedule confirmation email with updated calendar
 */
export async function sendRescheduleConfirmation(
  booking: Booking,
  previousDate: string,
  previousTime: string
): Promise<boolean> {
  return sendEnhancedEmail(
    EmailType.RESCHEDULE_CONFIRMATION,
    booking.email,
    booking,
    {
      previousDate,
      previousTime,
      sendToAdmin: true
    }
  );
}

/**
 * Send a service edit notification email
 */
export async function sendServiceEditNotification(
  booking: Booking,
  updates: Partial<Booking>
): Promise<boolean> {
  return sendEnhancedEmail(
    EmailType.SERVICE_EDIT,
    booking.email,
    booking,
    {
      updates,
      sendToAdmin: true
    }
  );
}

/**
 * Send a booking cancellation email
 */
export async function sendEnhancedCancellationEmail(
  booking: Booking,
  reason?: string
): Promise<boolean> {
  return sendEnhancedEmail(
    EmailType.BOOKING_CANCELLATION,
    booking.email,
    booking,
    {
      reason,
      sendToAdmin: true
    }
  );
}

/**
 * Send a password reset email with a reset token
 */
export async function sendPasswordResetEmail(
  customer: Customer, 
  resetToken: string
): Promise<boolean> {
  // Create a compatible booking object from customer data
  const bookingData: Booking = {
    id: customer.id ? customer.id.toString() : '0',
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    status: "active", // Default status
    streetAddress: customer.streetAddress || "",
    city: customer.city || "",
    state: customer.state || "",
    zipCode: customer.zipCode || "",
    serviceType: "Password Reset",
    preferredDate: "",
    appointmentTime: "",
    createdAt: customer.memberSince || new Date().toISOString(),
    notes: ""
  };
  
  return sendEnhancedEmail(
    EmailType.PASSWORD_RESET,
    customer.email,
    bookingData,
    {
      resetToken
    }
  );
}

/**
 * Send a welcome email to a new customer
 */
export async function sendWelcomeEmail(
  customer: Customer
): Promise<boolean> {
  // Create a compatible booking object from customer data
  const bookingData: Booking = {
    id: customer.id ? customer.id.toString() : '0',
    name: customer.name,
    email: customer.email,
    phone: customer.phone || '',
    status: "active", // Default status
    streetAddress: customer.streetAddress || "",
    city: customer.city || "",
    state: customer.state || "",
    zipCode: customer.zipCode || "",
    serviceType: "New Account",
    preferredDate: "",
    appointmentTime: "",
    createdAt: customer.memberSince || new Date().toISOString(),
    notes: ""
  };
  
  return sendEnhancedEmail(
    EmailType.WELCOME,
    customer.email,
    bookingData,
    { sendToAdmin: false } // No need to notify admin for welcome emails
  );
}

/**
 * Creates welcome email content
 */
function getWelcomeEmailContent(customer: Customer): string {
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Welcome to Picture Perfect TV Install</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      Dear ${customer.name},
    </p>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      Thank you for creating your account with Picture Perfect TV Install! We're excited to have you as part of our community.
    </p>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      With your account, you can:
    </p>
    
    <ul style="margin-bottom: 25px; padding-left: 20px;">
      <li style="margin-bottom: 10px; font-size: 16px; line-height: 1.5;">Book and manage your TV installation services</li>
      <li style="margin-bottom: 10px; font-size: 16px; line-height: 1.5;">Track your appointment status</li>
      <li style="margin-bottom: 10px; font-size: 16px; line-height: 1.5;">View your service history</li>
      <li style="margin-bottom: 10px; font-size: 16px; line-height: 1.5;">Access exclusive offers and promotions</li>
    </ul>
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Getting Started:</strong> Simply log in to your account on our website to start booking services or managing your appointments.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5;">
      If you have any questions or need assistance, please don't hesitate to contact us at 
      <a href="mailto:${ADMIN_EMAIL}" style="color: #005cb9;">${ADMIN_EMAIL}</a> or call us at ${COMPANY_PHONE}.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      We look forward to providing you with exceptional service!
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      Warm regards,<br>
      The Picture Perfect TV Install Team
    </p>
  `;
}

/**
 * Creates password reset email content
 */
function getPasswordResetEmailContent(customer: Customer, resetToken: string): string {
  const resetLink = `${COMPANY_WEBSITE}/reset-password?token=${resetToken}&email=${encodeURIComponent(customer.email)}`;
  
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Password Reset Request</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      Dear ${customer.name},
    </p>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      We received a request to reset your password for your Picture Perfect TV Install account.
    </p>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      To reset your password, please click the button below:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetLink}" style="background-color: #005cb9; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Reset Password</a>
    </div>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      If the button doesn't work, you can copy and paste the following link into your browser:
    </p>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5; word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 4px;">
      ${resetLink}
    </p>
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Important:</strong> This password reset link will expire in 24 hours. If you didn't request a password reset, please ignore this email or contact us if you have concerns.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5;">
      If you have any questions or need assistance, please don't hesitate to contact us at 
      <a href="mailto:${ADMIN_EMAIL}" style="color: #005cb9;">${ADMIN_EMAIL}</a> or call us at ${COMPANY_PHONE}.
    </p>
    
    <p style="font-size: 16px; line-height: 1.5;">
      Thank you,<br>
      The Picture Perfect TV Install Team
    </p>
  `;
}

/**
 * Create admin notification email based on email type
 */
function getAdminNotificationContent(booking: Booking, emailType?: EmailType, options?: EmailOptions): string {
  // Use custom notification content based on the email type
  if (emailType === EmailType.BOOKING_CANCELLATION) {
    return getAdminCancellationContent(booking, options?.reason);
  } 
  else if (emailType === EmailType.RESCHEDULE_CONFIRMATION) {
    return getAdminRescheduleContent(booking, options?.previousDate, options?.previousTime);
  } 
  else if (emailType === EmailType.SERVICE_EDIT) {
    return getAdminServiceEditContent(booking, options?.updates || {});
  } 
  else if (emailType === EmailType.PASSWORD_RESET) {
    return getAdminPasswordResetContent(booking);
  } 
  else if (emailType === EmailType.WELCOME) {
    return getAdminWelcomeContent(booking);
  }
  else {
    // Default to booking confirmation notification content
    return getAdminBookingNotificationContent(booking);
  }
}

/**
 * Create admin notification email for new bookings
 */
function getAdminBookingNotificationContent(booking: Booking): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
    
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">New Booking Alert</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      A new booking has been made on your website. Here are the details:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${booking.name}</td>
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
    
    <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Service Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0;">${booking.tvSize || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0;">${booking.mountType || 'Not specified'}</td>
        </tr>
        ${booking.pricingTotal ? `
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Pricing Total:</strong></td>
          <td style="padding: 8px 0;">${booking.pricingTotal}</td>
        </tr>
        ` : ''}
      </table>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Location Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City, State:</strong></td>
          <td style="padding: 8px 0;">${booking.city}, ${booking.state}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode}</td>
        </tr>
      </table>
    </div>
    
    ${booking.notes ? `
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Notes</h2>
      <p style="margin: 0; font-size: 15px;">${booking.notes}</p>
    </div>
    ` : ''}
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Action Required:</strong> Please contact the customer to confirm this booking.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5; text-align: center;">
      <a href="tel:${booking.phone}" style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
        <span style="font-weight: bold;">📞 Call Customer</span>
      </a>
      <a href="mailto:${booking.email}" style="display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        <span style="font-weight: bold;">✉️ Email Customer</span>
      </a>
    </p>
  `;
}

/**
 * Create admin notification email for rescheduled bookings
 */
function getAdminRescheduleContent(booking: Booking, previousDate?: string, previousTime?: string): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
  
  const formattedPreviousDate = previousDate && typeof previousDate === 'string'
    ? format(new Date(previousDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
    
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Booking Rescheduled</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      A customer has rescheduled their booking. Here are the updated details:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${booking.name}</td>
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
    
    <div style="background-color: #ffe8e8; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Previous Appointment</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${formattedPreviousDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${previousTime || 'Not specified'}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #e8f4ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">New Appointment</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0;">${booking.tvSize || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0;">${booking.mountType || 'Not specified'}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Location Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City, State:</strong></td>
          <td style="padding: 8px 0;">${booking.city}, ${booking.state}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode}</td>
        </tr>
      </table>
    </div>
    
    ${booking.notes ? `
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Notes</h2>
      <p style="margin: 0; font-size: 15px;">${booking.notes}</p>
    </div>
    ` : ''}
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Action Required:</strong> Please update your calendar with this rescheduled appointment.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5; text-align: center;">
      <a href="tel:${booking.phone}" style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
        <span style="font-weight: bold;">📞 Call Customer</span>
      </a>
      <a href="mailto:${booking.email}" style="display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        <span style="font-weight: bold;">✉️ Email Customer</span>
      </a>
    </p>
  `;
}

/**
 * Create admin notification email for service edits
 */
function getAdminServiceEditContent(booking: Booking, updates: Partial<Booking>): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
    
  // Create an array of updated fields for display
  const updatedFields: {field: string, oldValue: string, newValue: string}[] = [];
  
  if (updates.serviceType && updates.serviceType !== booking.serviceType) {
    updatedFields.push({
      field: 'Service Type',
      oldValue: booking.serviceType || 'Not specified',
      newValue: updates.serviceType
    });
  }
  
  if (updates.tvSize && updates.tvSize !== booking.tvSize) {
    updatedFields.push({
      field: 'TV Size',
      oldValue: booking.tvSize || 'Not specified',
      newValue: updates.tvSize
    });
  }
  
  if (updates.mountType && updates.mountType !== booking.mountType) {
    updatedFields.push({
      field: 'Mount Type',
      oldValue: booking.mountType || 'Not specified',
      newValue: updates.mountType
    });
  }
  
  if (updates.notes && updates.notes !== booking.notes) {
    updatedFields.push({
      field: 'Notes',
      oldValue: booking.notes || 'None',
      newValue: updates.notes
    });
  }
  
  // More fields could be added as needed
    
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Booking Updated</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      A booking has been updated with new service details. Here is the information:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${booking.name}</td>
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
    
    <div style="background-color: #fff8e0; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Updated Fields</h2>
      
      ${updatedFields.length > 0 ? `
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
          <tr>
            <th style="padding: 8px 0; text-align: left; width: 25%; color: #666666;">Field</th>
            <th style="padding: 8px 0; text-align: left; width: 37.5%; color: #666666;">Previous Value</th>
            <th style="padding: 8px 0; text-align: left; width: 37.5%; color: #666666;">New Value</th>
          </tr>
          ${updatedFields.map(field => `
            <tr>
              <td style="padding: 8px 0; color: #666666;"><strong>${field.field}:</strong></td>
              <td style="padding: 8px 0; text-decoration: line-through;">${field.oldValue}</td>
              <td style="padding: 8px 0; font-weight: bold;">${field.newValue}</td>
            </tr>
          `).join('')}
        </table>
      ` : `<p style="margin: 0; font-size: 15px;">No significant fields were updated.</p>`}
    </div>
    
    <div style="background-color: #f0f7ff; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Current Appointment Details</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${updates.serviceType || booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; font-weight: bold;">${booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0;">${updates.tvSize || booking.tvSize || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0;">${updates.mountType || booking.mountType || 'Not specified'}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Location Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City, State:</strong></td>
          <td style="padding: 8px 0;">${booking.city}, ${booking.state}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode}</td>
        </tr>
      </table>
    </div>
    
    ${updates.notes || booking.notes ? `
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Notes</h2>
      <p style="margin: 0; font-size: 15px;">${updates.notes || booking.notes}</p>
    </div>
    ` : ''}
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Action Required:</strong> Please review these changes and update your records accordingly.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5; text-align: center;">
      <a href="tel:${booking.phone}" style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
        <span style="font-weight: bold;">📞 Call Customer</span>
      </a>
      <a href="mailto:${booking.email}" style="display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        <span style="font-weight: bold;">✉️ Email Customer</span>
      </a>
    </p>
  `;
}

/**
 * Create admin notification email for booking cancellations
 */
function getAdminCancellationContent(booking: Booking, reason?: string): string {
  const formattedDate = booking.preferredDate 
    ? format(new Date(booking.preferredDate), 'EEEE, MMMM d, yyyy')
    : 'Not specified';
    
  return `
    <h1 style="color: #d32f2f; margin-top: 0; font-size: 24px; text-align: center;">Booking Canceled</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      A booking has been canceled by the customer. Here are the details of the canceled appointment:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${booking.name}</td>
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
    
    <div style="background-color: #ffebee; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Canceled Appointment</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Service Type:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${booking.serviceType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Date:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Time:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${booking.appointmentTime}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>TV Size:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${booking.tvSize || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Mount Type:</strong></td>
          <td style="padding: 8px 0; text-decoration: line-through;">${booking.mountType || 'Not specified'}</td>
        </tr>
      </table>
    </div>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Location Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Address:</strong></td>
          <td style="padding: 8px 0;">${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>City, State:</strong></td>
          <td style="padding: 8px 0;">${booking.city}, ${booking.state}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Zip Code:</strong></td>
          <td style="padding: 8px 0;">${booking.zipCode}</td>
        </tr>
      </table>
    </div>
    
    ${reason ? `
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Cancellation Reason</h2>
      <p style="margin: 0; font-size: 15px;">${reason}</p>
    </div>
    ` : ''}
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #d32f2f; background-color: #ffebee;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Action Required:</strong> Please update your calendar to remove this appointment.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5; text-align: center;">
      <a href="tel:${booking.phone}" style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
        <span style="font-weight: bold;">📞 Call Customer</span>
      </a>
      <a href="mailto:${booking.email}" style="display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        <span style="font-weight: bold;">✉️ Email Customer</span>
      </a>
    </p>
  `;
}

/**
 * Create admin notification email for password reset requests
 */
function getAdminPasswordResetContent(booking: Booking): string {
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">Password Reset Request</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      A password reset was requested by a customer. Here are their details:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${booking.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${booking.email}" style="color: #005cb9;">${booking.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Request Time:</strong></td>
          <td style="padding: 8px 0;">${format(new Date(), 'EEEE, MMMM d, yyyy h:mm a')}</td>
        </tr>
      </table>
    </div>
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #005cb9; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Note:</strong> No action is required. This is for your information only. The customer has been sent an automated password reset email.
      </p>
    </div>
  `;
}

/**
 * Create admin notification email for new account registrations
 */
function getAdminWelcomeContent(booking: Booking): string {
  return `
    <h1 style="color: #005cb9; margin-top: 0; font-size: 24px; text-align: center;">New Customer Registration</h1>
    
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      A new customer has created an account. Here are their details:
    </p>
    
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">Customer Information</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Name:</strong></td>
          <td style="padding: 8px 0;">${booking.name}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${booking.email}" style="color: #005cb9;">${booking.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Phone:</strong></td>
          <td style="padding: 8px 0;"><a href="tel:${booking.phone}" style="color: #005cb9;">${booking.phone || 'Not provided'}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>Registered:</strong></td>
          <td style="padding: 8px 0;">${booking.createdAt ? format(new Date(booking.createdAt), 'EEEE, MMMM d, yyyy h:mm a') : 'Recently'}</td>
        </tr>
      </table>
    </div>
    
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid #4caf50; background-color: #e8f5e9;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Note:</strong> The customer has been sent an automated welcome email. You may want to follow up with a personal welcome message.
      </p>
    </div>
    
    <p style="font-size: 16px; line-height: 1.5; text-align: center;">
      <a href="tel:${booking.phone}" style="display: inline-block; background-color: #005cb9; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-right: 10px;">
        <span style="font-weight: bold;">📞 Call Customer</span>
      </a>
      <a href="mailto:${booking.email}" style="display: inline-block; background-color: #27ae60; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
        <span style="font-weight: bold;">✉️ Email Customer</span>
      </a>
    </p>
  `;
}

/**
 * Get the booking cancellation content (aliasing getCancellationContent for consistency in naming)
 */
function getBookingCancellationContent(booking: Booking, reason?: string): string {
  return getCancellationContent(booking, reason);
}

/**
 * Send a test email of the specified type
 */
export async function sendTestEmail(emailType: EmailType, to: string) {
  // Sample booking data for testing
  const testBooking: Booking = {
    id: '12345',
    name: 'Test Customer',
    email: to,
    phone: '404-555-6789',
    status: 'active',
    streetAddress: '123 Main Street',
    addressLine2: 'Suite 456',
    city: 'Atlanta',
    state: 'GA',
    zipCode: '30301',
    serviceType: 'TV Wall Mount Installation',
    tvSize: '65 inch',
    mountType: 'Tilting Wall Mount',
    preferredDate: new Date().toISOString().split('T')[0], // Today's date
    appointmentTime: '10:00 AM',
    notes: 'This is a test booking for email verification purposes.',
    pricingTotal: '$249.99',
    pricingBreakdown: [
      { service: 'TV Wall Mount Installation', price: '$199.99' },
      { service: 'Cable Management', price: '$50.00' }
    ]
  };
  
  let emailSubject = '';
  let emailContent = '';
  let calendarEvent: string | undefined;
  
  try {
    switch(emailType) {
      case EmailType.BOOKING_CONFIRMATION:
        emailSubject = 'Your TV Installation Appointment Confirmation';
        emailContent = masterEmailTemplate('Booking Confirmation', getBookingConfirmationContent(testBooking));
        calendarEvent = await createCalendarEvent(testBooking);
        break;
        
      case EmailType.RESCHEDULE_CONFIRMATION:
        emailSubject = 'Your TV Installation Appointment Has Been Rescheduled';
        emailContent = masterEmailTemplate('Appointment Rescheduled', getRescheduleConfirmationContent(
          testBooking, 
          new Date(new Date().setDate(new Date().getDate() - 2)).toISOString().split('T')[0], // 2 days ago
          '3:30 PM'
        ));
        calendarEvent = await createCalendarEvent(testBooking);
        break;
        
      case EmailType.SERVICE_EDIT:
        emailSubject = 'Your TV Installation Service Details Updated';
        emailContent = masterEmailTemplate('Service Details Updated', getServiceEditContent(testBooking, {
          tvSize: '75 inch',
          mountType: 'Full Motion Wall Mount'
        }));
        break;
        
      case EmailType.BOOKING_CANCELLATION:
        emailSubject = 'Your TV Installation Appointment Has Been Cancelled';
        emailContent = masterEmailTemplate('Booking Cancellation', getBookingCancellationContent(testBooking));
        break;
        
      case EmailType.WELCOME:
        emailSubject = 'Welcome to Picture Perfect TV Install';
        emailContent = masterEmailTemplate('Welcome', getWelcomeEmailContent({
          name: 'Test Customer',
          email: to
        } as Customer));
        break;
        
      case EmailType.PASSWORD_RESET:
        emailSubject = 'Password Reset Request';
        emailContent = masterEmailTemplate('Password Reset', getPasswordResetEmailContent({
          name: 'Test Customer',
          email: to
        } as Customer, 'test-reset-token-12345'));
        break;
        
      case EmailType.ADMIN_NOTIFICATION:
        emailSubject = 'New Booking Alert - Picture Perfect TV Install';
        emailContent = masterEmailTemplate('New Booking Alert', getAdminNotificationContent(testBooking, EmailType.BOOKING_CONFIRMATION));
        break;
        
      default:
        throw new Error(`Unknown email type: ${emailType}`);
    }
    
    // Create message for SendGrid
    const msg = {
      to,
      from: FROM_EMAIL,
      subject: emailSubject,
      text: createPlainTextVersion(emailContent),
      html: emailContent,
      attachments: calendarEvent ? [
        {
          content: Buffer.from(calendarEvent).toString('base64'),
          filename: 'appointment.ics',
          type: 'text/calendar',
          disposition: 'attachment'
        }
      ] : undefined
    };
    
    // Send the email
    await sgMail.send(msg);
    return { success: true, message: `Test ${emailType} email sent to ${to}` };
    
  } catch (error) {
    console.error(`Error sending test ${emailType} email:`, error);
    throw error;
  }
}