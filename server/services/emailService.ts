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
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Booking Alert</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header with Logo and Brand -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px 40px; text-align: center;">
          <div style="background-color: #ffffff; display: inline-block; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px;">
            <span style="font-size: 20px; font-weight: bold; color: #2563eb;">Picture Perfect TV Install</span>
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">New Booking Alert!</h1>
          <p style="color: #e2e8f0; margin: 10px 0 0 0; font-size: 16px;">A new customer has scheduled an installation</p>
        </div>

        <!-- Content Area -->
        <div style="padding: 40px;">
          <div style="background-color: #f1f5f9; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 0; color: #0f172a; font-weight: 600; font-size: 16px;">⚡ Priority: Contact customer within 2 hours</p>
          </div>

          <!-- Customer Information -->
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #2563eb; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">👤 Customer Information</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Full Name</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.name}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Phone Number</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;"><a href="tel:${booking.phone}" style="color: #2563eb; text-decoration: none;">${booking.phone}</a></p>
              </div>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Email Address</p>
              <p style="margin: 0; color: #0f172a; font-size: 16px; font-weight: 600;"><a href="mailto:${booking.email}" style="color: #2563eb; text-decoration: none;">${booking.email}</a></p>
            </div>
          </div>

          <!-- Service Details -->
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #2563eb; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">🔧 Service Details</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Service Type</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.serviceType}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">TV Size</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.tvSize}"</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Mount Type</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.mountType}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Preferred Date</p>
                <p style="margin: 0 0 15px 0; color: #10b981; font-size: 16px; font-weight: 700;">${booking.preferredDate}</p>
              </div>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Preferred Time</p>
              <p style="margin: 0; color: #10b981; font-size: 16px; font-weight: 700;">${booking.appointmentTime}</p>
            </div>
          </div>

          <!-- Address Information -->
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #2563eb; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📍 Installation Address</h2>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px;">
              <p style="margin: 0 0 5px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.streetAddress}</p>
              ${booking.addressLine2 ? `<p style="margin: 0 0 5px 0; color: #0f172a; font-size: 16px;">${booking.addressLine2}</p>` : ''}
              <p style="margin: 0; color: #0f172a; font-size: 16px;">${booking.city}, ${booking.state} ${booking.zipCode}</p>
            </div>
          </div>

          ${booking.notes ? `
          <!-- Additional Notes -->
          <div style="background-color: #fefce8; border: 2px solid #facc15; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #ca8a04; margin: 0 0 15px 0; font-size: 18px;">📝 Customer Notes</h2>
            <p style="margin: 0; color: #713f12; font-size: 16px; line-height: 1.6;">${booking.notes}</p>
          </div>
          ` : ''}

          <!-- Action Required -->
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ffffff; margin: 0 0 15px 0; font-size: 20px;">🎯 Next Steps</h2>
            <p style="color: #d1fae5; margin: 0 0 20px 0; font-size: 16px;">Contact the customer to confirm appointment details and scheduling</p>
            <a href="tel:${booking.phone}" style="display: inline-block; background-color: #ffffff; color: #10b981; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-right: 15px;">📞 Call Customer</a>
            <a href="mailto:${booking.email}" style="display: inline-block; background-color: #065f46; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 700;">✉️ Send Email</a>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Picture Perfect TV Install - Professional Installation Services</p>
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">Atlanta Metro Area | Licensed & Insured | 5-Star Rated</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function getBookingConfirmationEmailTemplate(booking: Booking): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Booking Confirmation</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc;">
      <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        
        <!-- Header with Logo and Brand -->
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px 40px; text-align: center;">
          <div style="background-color: #ffffff; display: inline-block; padding: 12px 20px; border-radius: 8px; margin-bottom: 20px;">
            <span style="font-size: 20px; font-weight: bold; color: #10b981;">Picture Perfect TV Install</span>
          </div>
          <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Booking Confirmed!</h1>
          <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Thank you for choosing our professional installation services</p>
        </div>

        <!-- Content Area -->
        <div style="padding: 40px;">
          <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin-bottom: 30px;">
            <p style="margin: 0; color: #065f46; font-weight: 600; font-size: 16px;">✅ Your booking has been received and we'll contact you within 2 hours to confirm your appointment</p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
            Hello ${booking.name},<br><br>
            Thank you for booking with Picture Perfect TV Install! We're excited to help you create the perfect entertainment setup in your home. 
            Our team will contact you shortly to confirm your appointment details.
          </p>

          <!-- Booking Details -->
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📋 Your Booking Details</h2>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Service Type</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.serviceType}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">TV Size</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.tvSize}"</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Mount Type</p>
                <p style="margin: 0 0 15px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.mountType}</p>
              </div>
              <div>
                <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Requested Date</p>
                <p style="margin: 0 0 15px 0; color: #10b981; font-size: 16px; font-weight: 700;">${booking.preferredDate}</p>
              </div>
            </div>
            <div>
              <p style="margin: 0 0 5px 0; color: #64748b; font-size: 14px; font-weight: 500;">Requested Time</p>
              <p style="margin: 0; color: #10b981; font-size: 16px; font-weight: 700;">${booking.appointmentTime}</p>
            </div>
          </div>

          <!-- Installation Address -->
          <div style="background-color: #ffffff; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #10b981; margin: 0 0 20px 0; font-size: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">📍 Installation Address</h2>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px;">
              <p style="margin: 0 0 5px 0; color: #0f172a; font-size: 16px; font-weight: 600;">${booking.streetAddress}</p>
              ${booking.addressLine2 ? `<p style="margin: 0 0 5px 0; color: #0f172a; font-size: 16px;">${booking.addressLine2}</p>` : ''}
              <p style="margin: 0; color: #0f172a; font-size: 16px;">${booking.city}, ${booking.state} ${booking.zipCode}</p>
            </div>
          </div>

          ${booking.notes ? `
          <!-- Special Instructions -->
          <div style="background-color: #fefce8; border: 2px solid #facc15; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #ca8a04; margin: 0 0 15px 0; font-size: 18px;">📝 Special Instructions</h2>
            <p style="margin: 0; color: #713f12; font-size: 16px; line-height: 1.6;">${booking.notes}</p>
          </div>
          ` : ''}

          <!-- What to Expect -->
          <div style="background-color: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 12px; padding: 25px; margin-bottom: 25px;">
            <h2 style="color: #0369a1; margin: 0 0 20px 0; font-size: 18px;">🔧 What to Expect</h2>
            <ul style="margin: 0; padding-left: 20px; color: #075985;">
              <li style="margin-bottom: 8px;">Our certified technician will contact you to confirm the appointment</li>
              <li style="margin-bottom: 8px;">Professional assessment of your installation requirements</li>
              <li style="margin-bottom: 8px;">Safe and secure TV mounting with cable management</li>
              <li style="margin-bottom: 0;">Clean workspace and professional service guarantee</li>
            </ul>
          </div>

          <!-- Contact Information -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
            <h2 style="color: #ffffff; margin: 0 0 15px 0; font-size: 20px;">📞 Need to Make Changes?</h2>
            <p style="color: #dbeafe; margin: 0 0 20px 0; font-size: 16px;">Contact us if you need to reschedule or have questions</p>
            <a href="tel:+16782632859" style="display: inline-block; background-color: #ffffff; color: #2563eb; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; margin-right: 15px;">📞 Call Us</a>
            <a href="mailto:${ADMIN_EMAIL}" style="display: inline-block; background-color: #1e40af; color: #ffffff; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 700;">✉️ Email Us</a>
          </div>

          <!-- Thank You Message -->
          <div style="text-align: center; color: #374151; font-size: 16px; line-height: 1.6;">
            <p style="margin: 0 0 15px 0;">Thank you for trusting Picture Perfect TV Install with your home entertainment needs.</p>
            <p style="margin: 0; font-weight: 600; color: #10b981;">We look forward to creating your perfect viewing experience!</p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">Picture Perfect TV Install - Professional Installation Services</p>
          <p style="margin: 0; color: #94a3b8; font-size: 12px;">Atlanta Metro Area | Licensed & Insured | 5-Star Rated</p>
        </div>
      </div>
    </body>
    </html>
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