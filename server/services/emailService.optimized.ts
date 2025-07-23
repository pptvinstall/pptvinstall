// Removed SendGrid dependency
import type { Booking, Customer } from '@shared/schema';
import { format, parse, parseISO } from 'date-fns';
// Removed calendar dependency
import { logger } from './loggingService';

// Email service now uses Gmail SMTP - no SendGrid initialization needed

// Email configuration - centralized
const EMAIL_CONFIG = {
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com',
  FROM_EMAIL: process.env.EMAIL_FROM || 'Picture Perfect TV Install <PPTVInstall@gmail.com>',
  COMPANY_NAME: 'Picture Perfect TV Install',
  COMPANY_PHONE: '404-702-4748',
  COMPANY_WEBSITE: 'https://PPTVInstall.com',
  LOGO_URL: 'https://i.ibb.co/Pjb48FQ/logo-blue.png',
} as const;

// Email types enum
export enum EmailType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  RESCHEDULE_CONFIRMATION = 'reschedule_confirmation',
  SERVICE_EDIT = 'service_edit',
  BOOKING_CANCELLATION = 'booking_cancellation',
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  ADMIN_NOTIFICATION = 'admin_notification',
}

// Optimized email options interface
export interface EmailOptions {
  previousDate?: string;
  previousTime?: string;
  updates?: Partial<Booking>;
  reason?: string;
  sendToAdmin?: boolean;
  resetToken?: string;
  sendCalendar?: boolean;
}

// Base email template with common structure
const createBaseTemplate = (content: string, title: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding: 20px; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; border-radius: 8px; }
        .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
        .content { background: #f8fafc; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; }
        .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
        .highlight { background: #fef3c7; padding: 2px 6px; border-radius: 4px; }
        .details { background: white; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #3b82f6; }
        @media (max-width: 600px) { body { padding: 10px; } .content { padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <img src="${EMAIL_CONFIG.LOGO_URL}" alt="${EMAIL_CONFIG.COMPANY_NAME}" class="logo">
        <h1>${EMAIL_CONFIG.COMPANY_NAME}</h1>
    </div>
    <div class="content">
        ${content}
    </div>
    <div class="footer">
        <p><strong>${EMAIL_CONFIG.COMPANY_NAME}</strong><br>
        Phone: ${EMAIL_CONFIG.COMPANY_PHONE}<br>
        Website: <a href="${EMAIL_CONFIG.COMPANY_WEBSITE}">${EMAIL_CONFIG.COMPANY_WEBSITE}</a></p>
    </div>
</body>
</html>`;

// Optimized service list generator
const generateServicesList = (booking: Booking): string[] => {
  const services: string[] = [];
  
  // Extract services from pricingBreakdown field (actual schema field)
  if (booking.pricingBreakdown && typeof booking.pricingBreakdown === 'string') {
    try {
      const parsed = JSON.parse(booking.pricingBreakdown);
      if (Array.isArray(parsed)) {
        services.push(...parsed);
      } else if (parsed && typeof parsed === 'object') {
        // Extract service names from pricing breakdown object
        Object.values(parsed).forEach((item: any) => {
          if (item && typeof item === 'object' && item.name) {
            services.push(item.name);
          }
        });
      }
    } catch (e) {
      // If not JSON, treat as single service
      services.push(booking.pricingBreakdown);
    }
  }
  
  // Fallback to service type if available
  if (services.length === 0 && booking.serviceType) {
    services.push(booking.serviceType);
  }
  
  return services.length > 0 ? services : ['TV Installation Service'];
};

// Create ICS calendar event (optimized)
const createCalendarEvent = async (booking: Booking): Promise<string> => {
  try {
    const eventDate = parseISO(booking.preferredDate);
    const startTime = parse(booking.appointmentTime || '12:00 PM', 'h:mm a', eventDate);
    const endTime = new Date(startTime);
    endTime.setHours(endTime.getHours() + 1, endTime.getMinutes() + 30);
    
    const event: any = {
      start: [
        startTime.getFullYear(),
        startTime.getMonth() + 1,
        startTime.getDate(),
        startTime.getHours(),
        startTime.getMinutes()
      ],
      duration: { hours: 1, minutes: 30 },
      title: `${EMAIL_CONFIG.COMPANY_NAME} - ${generateServicesList(booking).join(', ')}`,
      description: `Services: ${generateServicesList(booking).join(', ')}\nNotes: ${booking.notes || 'None'}`,
      location: `${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}`,
      url: EMAIL_CONFIG.COMPANY_WEBSITE,
      status: 'CONFIRMED' as const,
      busyStatus: 'BUSY' as const,
      organizer: {
        name: EMAIL_CONFIG.COMPANY_NAME,
        email: EMAIL_CONFIG.FROM_EMAIL.match(/<(.+)>/)?.[1] || EMAIL_CONFIG.FROM_EMAIL
      },
      attendees: [
        {
          name: booking.name,
          email: booking.email,
          rsvp: true,
          partstat: 'NEEDS-ACTION' as const,
          role: 'REQ-PARTICIPANT' as const
        }
      ]
    };
    
    const { error, value } = ics.createEvent(event);
    if (error) throw error;
    return value || '';
  } catch (error) {
    logger.error('Error creating calendar event', { 
      error: error instanceof Error ? error.message : String(error), 
      booking: booking.id 
    });
    return '';
  }
};

// Email template generators (optimized and consolidated)
const generateBookingConfirmationEmail = (booking: Booking) => {
  const services = generateServicesList(booking);
  const content = `
    <h2>🎉 Your TV Installation is Confirmed!</h2>
    <p>Hi <strong>${booking.name}</strong>,</p>
    <p>Great news! Your appointment with ${EMAIL_CONFIG.COMPANY_NAME} has been confirmed.</p>
    
    <div class="details">
      <h3>📋 Appointment Details</h3>
      <p><strong>Date:</strong> <span class="highlight">${format(parseISO(booking.preferredDate), 'EEEE, MMMM d, yyyy')}</span></p>
      <p><strong>Time:</strong> <span class="highlight">${booking.appointmentTime}</span></p>
      <p><strong>Address:</strong> ${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}</p>
      <p><strong>Services:</strong></p>
      <ul>${services.map(service => `<li>${service}</li>`).join('')}</ul>
      <p><strong>Total Amount:</strong> <span class="highlight">$${Number(booking.pricingTotal || 0).toFixed(2)}</span></p>
      ${booking.notes ? `<p><strong>Special Notes:</strong> ${booking.notes}</p>` : ''}
    </div>
    
    <p>🔧 <strong>What to Expect:</strong></p>
    <ul>
      <li>Our professional technician will arrive at the scheduled time</li>
      <li>All necessary tools and equipment will be provided</li>
      <li>Installation typically takes 1-2 hours depending on complexity</li>
      <li>We'll clean up and test everything before we leave</li>
    </ul>
    
    <p>📞 <strong>Need to make changes?</strong> Call us at ${EMAIL_CONFIG.COMPANY_PHONE}</p>
    
    <p>Thank you for choosing ${EMAIL_CONFIG.COMPANY_NAME}!</p>
  `;
  
  return {
    subject: `📺 TV Installation Confirmed - ${format(parseISO(booking.preferredDate), 'MMM d')}`,
    html: createBaseTemplate(content, 'Booking Confirmation'),
    text: `Your TV installation appointment is confirmed for ${booking.preferredDate} at ${booking.appointmentTime}. Services: ${services.join(', ')}. Total: $${Number(booking.pricingTotal || 0).toFixed(2)}.`
  };
};

// Main email sending function (consolidated and optimized)
export const sendOptimizedEmail = async (
  type: EmailType,
  booking: Booking,
  options: EmailOptions = {}
): Promise<boolean> => {
  if (!SENDGRID_API_KEY) {
    logger.warn('SendGrid API key not configured');
    return false;
  }

  try {
    let emailTemplate;
    let recipient = booking.email;
    let attachments: any[] = [];

    switch (type) {
      case EmailType.BOOKING_CONFIRMATION:
        emailTemplate = generateBookingConfirmationEmail(booking);
        if (options.sendCalendar) {
          const icsContent = await createCalendarEvent(booking);
          if (icsContent) {
            attachments.push({
              content: Buffer.from(icsContent).toString('base64'),
              filename: 'appointment.ics',
              type: 'text/calendar',
              disposition: 'attachment'
            });
          }
        }
        break;
      
      case EmailType.ADMIN_NOTIFICATION:
        recipient = EMAIL_CONFIG.ADMIN_EMAIL;
        const services = generateServicesList(booking);
        const adminContent = `
          <h2>🔔 New Booking Received</h2>
          <div class="details">
            <p><strong>Customer:</strong> ${booking.name}</p>
            <p><strong>Email:</strong> ${booking.email}</p>
            <p><strong>Phone:</strong> ${booking.phone}</p>
            <p><strong>Date:</strong> ${format(parseISO(booking.preferredDate), 'EEEE, MMMM d, yyyy')}</p>
            <p><strong>Time:</strong> ${booking.appointmentTime}</p>
            <p><strong>Address:</strong> ${booking.streetAddress}, ${booking.city}, ${booking.state} ${booking.zipCode}</p>
            <p><strong>Services:</strong></p>
            <ul>${services.map(service => `<li>${service}</li>`).join('')}</ul>
            <p><strong>Total:</strong> $${Number(booking.pricingTotal || 0).toFixed(2)}</p>
            ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
          </div>
        `;
        emailTemplate = {
          subject: `📋 New Booking: ${booking.name} - ${format(parseISO(booking.preferredDate), 'MMM d')}`,
          html: createBaseTemplate(adminContent, 'New Booking'),
          text: `New booking from ${booking.name} (${booking.email}) for ${booking.preferredDate} at ${booking.appointmentTime}`
        };
        break;
      
      default:
        throw new Error(`Unsupported email type: ${type}`);
    }

    await sgMail.send({
      to: recipient,
      from: EMAIL_CONFIG.FROM_EMAIL,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
      attachments
    });

    logger.info('Email sent successfully', { 
      type, 
      recipient, 
      bookingId: booking.id,
      hasAttachments: attachments.length > 0
    });
    return true;

  } catch (error) {
    logger.error('Email sending failed', { 
      error: error instanceof Error ? error.message : String(error),
      type, 
      bookingId: booking.id 
    });
    return false;
  }
};

// Batch email sending for efficiency
export const sendBatchEmails = async (
  emailJobs: Array<{ type: EmailType; booking: Booking; options?: EmailOptions }>
): Promise<boolean[]> => {
  const promises = emailJobs.map(job => 
    sendOptimizedEmail(job.type, job.booking, job.options)
  );
  return Promise.all(promises);
};

// Backward compatibility exports
export const sendBookingConfirmationEmail = (booking: Booking, options: EmailOptions = {}) =>
  sendOptimizedEmail(EmailType.BOOKING_CONFIRMATION, booking, { ...options, sendCalendar: true });

export const sendAdminNotificationEmail = (booking: Booking) =>
  sendOptimizedEmail(EmailType.ADMIN_NOTIFICATION, booking);

export default {
  sendOptimizedEmail,
  sendBatchEmails,
  sendBookingConfirmationEmail,
  sendAdminNotificationEmail,
  EmailType
};