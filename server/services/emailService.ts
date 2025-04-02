import { MailService } from '@sendgrid/mail';
const sgMail = new MailService();
import type { Booking, Customer } from '@shared/schema';

// Initialize SendGrid with API key
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Email addresses
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com';
const FROM_EMAIL = process.env.EMAIL_FROM || 'PPTVInstall@gmail.com';

/**
 * Send a notification email to admin when a new booking is created
 */
export async function sendAdminNotificationEmail(booking: Booking): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  const msg = {
    to: ADMIN_EMAIL,
    from: FROM_EMAIL,
    subject: 'New Booking Alert - Picture Perfect TV Installation',
    html: getAdminNotificationEmailTemplate(booking),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return false;
  }
}

/**
 * Send a confirmation email to the customer after booking is created
 */
export async function sendBookingConfirmationEmail(booking: Booking): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  const msg = {
    to: booking.email,
    from: FROM_EMAIL,
    subject: 'Booking Confirmation - Picture Perfect TV Installation',
    html: getBookingConfirmationEmailTemplate(booking),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
}

/**
 * Send a notification email when a booking is updated by a customer
 */
export async function sendBookingUpdateEmail(booking: Booking, updates: Partial<Booking>): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  // Send email to admin
  const adminMsg = {
    to: ADMIN_EMAIL,
    from: FROM_EMAIL,
    subject: 'Booking Update Alert - Picture Perfect TV Installation',
    html: getAdminBookingUpdateEmailTemplate(booking, updates),
  };

  // Send email to customer
  const customerMsg = {
    to: booking.email,
    from: FROM_EMAIL,
    subject: 'Booking Update Confirmation - Picture Perfect TV Installation',
    html: getCustomerBookingUpdateEmailTemplate(booking, updates),
  };

  try {
    await sgMail.send(adminMsg);
    await sgMail.send(customerMsg);
    return true;
  } catch (error) {
    console.error('Error sending booking update emails:', error);
    return false;
  }
}

/**
 * Send a password reset email to a customer
 */
export async function sendPasswordResetEmail(customer: Customer, resetToken: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  const resetLink = `${process.env.PUBLIC_URL || 'https://www.pictureperfecttv.com'}/reset-password?email=${customer.email}&token=${resetToken}`;

  const msg = {
    to: customer.email,
    from: FROM_EMAIL,
    subject: 'Password Reset Request - Picture Perfect TV Installation',
    html: getPasswordResetEmailTemplate(customer, resetLink),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return false;
  }
}

/**
 * Send a welcome email to a new customer
 */
export async function sendWelcomeEmail(customer: Customer): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  const msg = {
    to: customer.email,
    from: FROM_EMAIL,
    subject: 'Welcome to Picture Perfect TV Installation',
    html: getWelcomeEmailTemplate(customer),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

// Email Templates

function getAdminNotificationEmailTemplate(booking: Booking): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">New Booking Alert</h2>
      <p>A new booking has been made on your website. Here are the details:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Name:</strong> ${booking.name}</p>
        <p><strong>Email:</strong> ${booking.email}</p>
        <p><strong>Phone:</strong> ${booking.phone}</p>
        <p><strong>Service Type:</strong> ${booking.serviceType}</p>
        <p><strong>Date:</strong> ${booking.preferredDate}</p>
        <p><strong>Time:</strong> ${booking.appointmentTime}</p>
        <p><strong>TV Size:</strong> ${booking.tvSize}</p>
        <p><strong>Mount Type:</strong> ${booking.mountType}</p>
        <p><strong>Address:</strong> ${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</p>
        <p><strong>City:</strong> ${booking.city}, ${booking.state}</p>
        <p><strong>Zip Code:</strong> ${booking.zipCode}</p>
        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
      </div>
      
      <p>Please contact the customer to confirm this booking.</p>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated message from your Picture Perfect TV Installation website.
        </p>
      </div>
    </div>
  `;
}

function getBookingConfirmationEmailTemplate(booking: Booking): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Booking Confirmation</h2>
      <p>Thank you for booking with Picture Perfect TV Installation. We have received your request and will contact you shortly to confirm your appointment. Here are your booking details:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Service Type:</strong> ${booking.serviceType}</p>
        <p><strong>Date:</strong> ${booking.preferredDate}</p>
        <p><strong>Time:</strong> ${booking.appointmentTime}</p>
        <p><strong>TV Size:</strong> ${booking.tvSize}</p>
        <p><strong>Mount Type:</strong> ${booking.mountType}</p>
        <p><strong>Address:</strong> ${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</p>
        <p><strong>City:</strong> ${booking.city}, ${booking.state}</p>
        <p><strong>Zip Code:</strong> ${booking.zipCode}</p>
        ${booking.notes ? `<p><strong>Notes:</strong> ${booking.notes}</p>` : ''}
      </div>
      
      <p>If you need to make any changes to your booking, please contact us at:</p>
      <p style="text-align: center;"><a href="mailto:${ADMIN_EMAIL}" style="color: #3498db;">${ADMIN_EMAIL}</a></p>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Thank you for choosing Picture Perfect TV Installation for your home entertainment needs.
        </p>
      </div>
    </div>
  `;
}

function getAdminBookingUpdateEmailTemplate(booking: Booking, updates: Partial<Booking>): string {
  // Create a list of what was updated
  let updatedFieldsHtml = '';
  if (updates.preferredDate) {
    updatedFieldsHtml += `<p><strong>Date:</strong> Changed to ${updates.preferredDate}</p>`;
  }
  if (updates.appointmentTime) {
    updatedFieldsHtml += `<p><strong>Time:</strong> Changed to ${updates.appointmentTime}</p>`;
  }
  if (updates.notes !== undefined) {
    updatedFieldsHtml += `<p><strong>Notes:</strong> Updated to "${updates.notes}"</p>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Booking Update Alert</h2>
      <p>A customer has updated their booking. Here are the details:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Booking ID:</strong> ${booking.id}</p>
        <p><strong>Customer:</strong> ${booking.name}</p>
        <p><strong>Email:</strong> ${booking.email}</p>
        <p><strong>Phone:</strong> ${booking.phone}</p>
        
        <h3 style="color: #e74c3c; margin-top: 15px;">Updated Information:</h3>
        ${updatedFieldsHtml}
      </div>
      
      <div style="background-color: #edf7ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="color: #2980b9;">Complete Booking Details (After Update):</h3>
        <p><strong>Service Type:</strong> ${booking.serviceType}</p>
        <p><strong>Date:</strong> ${updates.preferredDate || booking.preferredDate}</p>
        <p><strong>Time:</strong> ${updates.appointmentTime || booking.appointmentTime}</p>
        <p><strong>TV Size:</strong> ${booking.tvSize}</p>
        <p><strong>Mount Type:</strong> ${booking.mountType}</p>
        <p><strong>Address:</strong> ${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</p>
        <p><strong>City:</strong> ${booking.city}, ${booking.state}</p>
        <p><strong>Zip Code:</strong> ${booking.zipCode}</p>
        <p><strong>Notes:</strong> ${updates.notes !== undefined ? updates.notes : booking.notes || 'None'}</p>
      </div>
      
      <p>You may want to contact the customer to confirm these changes.</p>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #7f8c8d; font-size: 12px;">
          This is an automated message from your Picture Perfect TV Installation website.
        </p>
      </div>
    </div>
  `;
}

function getCustomerBookingUpdateEmailTemplate(booking: Booking, updates: Partial<Booking>): string {
  // Create a list of what was updated
  let updatedFieldsHtml = '';
  if (updates.preferredDate) {
    updatedFieldsHtml += `<p><strong>Date:</strong> Changed to ${updates.preferredDate}</p>`;
  }
  if (updates.appointmentTime) {
    updatedFieldsHtml += `<p><strong>Time:</strong> Changed to ${updates.appointmentTime}</p>`;
  }
  if (updates.notes !== undefined) {
    updatedFieldsHtml += `<p><strong>Notes:</strong> Updated</p>`;
  }

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Booking Update Confirmation</h2>
      <p>Your booking with Picture Perfect TV Installation has been updated successfully. Here's a summary of the changes:</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="color: #27ae60;">Updated Information:</h3>
        ${updatedFieldsHtml}
      </div>
      
      <div style="background-color: #edf7ff; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="color: #2980b9;">Your Complete Booking Details:</h3>
        <p><strong>Service Type:</strong> ${booking.serviceType}</p>
        <p><strong>Date:</strong> ${updates.preferredDate || booking.preferredDate}</p>
        <p><strong>Time:</strong> ${updates.appointmentTime || booking.appointmentTime}</p>
        <p><strong>TV Size:</strong> ${booking.tvSize}</p>
        <p><strong>Mount Type:</strong> ${booking.mountType}</p>
        <p><strong>Address:</strong> ${booking.streetAddress}${booking.addressLine2 ? ', ' + booking.addressLine2 : ''}</p>
        <p><strong>City:</strong> ${booking.city}, ${booking.state}</p>
        <p><strong>Zip Code:</strong> ${booking.zipCode}</p>
        <p><strong>Notes:</strong> ${updates.notes !== undefined ? updates.notes : booking.notes || 'None'}</p>
      </div>
      
      <p>If you need to make any further changes or have questions, please contact us at:</p>
      <p style="text-align: center;"><a href="mailto:${ADMIN_EMAIL}" style="color: #3498db;">${ADMIN_EMAIL}</a></p>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Thank you for choosing Picture Perfect TV Installation for your home entertainment needs.
        </p>
      </div>
    </div>
  `;
}

function getPasswordResetEmailTemplate(customer: Customer, resetLink: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Password Reset Request</h2>
      <p>Hello ${customer.name.split(' ')[0]},</p>
      <p>We received a request to reset your password for your Picture Perfect TV Installation account. If you didn't make this request, you can safely ignore this email.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetLink}" style="background-color: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">Reset Your Password</a>
      </div>
      
      <p>This link will expire in 1 hour for security reasons.</p>
      <p>If the button above doesn't work, you can copy and paste the following URL into your browser:</p>
      <p style="word-break: break-all; background-color: #f9f9f9; padding: 10px; border-radius: 3px; font-size: 14px;">${resetLink}</p>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Thank you for choosing Picture Perfect TV Installation for your home entertainment needs.
        </p>
      </div>
    </div>
  `;
}

function getWelcomeEmailTemplate(customer: Customer): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Welcome to Picture Perfect TV Installation</h2>
      <p>Hello ${customer.name.split(' ')[0]},</p>
      <p>Thank you for creating an account with us. We're excited to have you as our customer!</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <h3 style="color: #27ae60;">Your account has been created successfully.</h3>
        <p>With your account, you can:</p>
        <ul>
          <li>View your booking history</li>
          <li>Update your upcoming appointments</li>
          <li>Track your loyalty points</li>
          <li>Receive special promotions and discounts</li>
        </ul>
      </div>
      
      <p>If you have any questions or need assistance, please don't hesitate to contact us:</p>
      <p style="text-align: center;"><a href="mailto:${ADMIN_EMAIL}" style="color: #3498db;">${ADMIN_EMAIL}</a></p>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Thank you for choosing Picture Perfect TV Installation for your home entertainment needs.
        </p>
      </div>
    </div>
  `;
}

// Export all email template functions for testing
/**
 * Send a cancellation email to the customer when a booking is cancelled
 */
export async function sendBookingCancellationEmail(booking: Booking, reason?: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn('SendGrid API key not set. Email not sent.');
    return false;
  }

  const msg = {
    to: booking.email,
    from: FROM_EMAIL,
    subject: 'Booking Cancellation Notification - Picture Perfect TV Installation',
    html: getBookingCancellationEmailTemplate(booking, reason),
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error('Error sending booking cancellation email:', error);
    return false;
  }
}

function getBookingCancellationEmailTemplate(booking: Booking, reason?: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #2c3e50; text-align: center;">Booking Cancellation Notification</h2>
      <p>We're writing to confirm that your booking with Picture Perfect TV Installation has been cancelled.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
        <p><strong>Booking Details:</strong></p>
        <p><strong>Service Type:</strong> ${booking.serviceType}</p>
        <p><strong>Date:</strong> ${booking.preferredDate}</p>
        <p><strong>Time:</strong> ${booking.appointmentTime}</p>
        ${reason ? `<p><strong>Cancellation Reason:</strong> ${reason}</p>` : ''}
      </div>
      
      <p>If you would like to schedule a new appointment, please visit our website or contact us directly.</p>
      <p>Thank you for your understanding.</p>
      
      <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        <p style="color: #7f8c8d; font-size: 12px;">
          Thank you for choosing Picture Perfect TV Installation for your home entertainment needs.
        </p>
      </div>
    </div>
  `;
}

export const emailTemplates = {
  getAdminNotificationEmailTemplate,
  getBookingConfirmationEmailTemplate,
  getAdminBookingUpdateEmailTemplate,
  getCustomerBookingUpdateEmailTemplate,
  getPasswordResetEmailTemplate,
  getWelcomeEmailTemplate,
  getBookingCancellationEmailTemplate
};