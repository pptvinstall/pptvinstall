import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key
if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email functionality will not work.");
} else {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Send a booking confirmation email to the customer
 */
export async function sendBookingConfirmationEmail(booking: any) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Cannot send booking confirmation email: SENDGRID_API_KEY not set");
    return false;
  }

  try {
    const msg = {
      to: booking.email,
      from: process.env.EMAIL_FROM || 'bookings@pictureperfecttv.com',
      subject: 'Your TV Installation Booking Confirmation',
      text: getPlainTextConfirmation(booking),
      html: getHtmlConfirmation(booking),
    };
    
    await sgMail.send(msg);
    console.log(`Booking confirmation email sent to ${booking.email}`);
    return true;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
}

/**
 * Get plain text version of the confirmation email
 */
function getPlainTextConfirmation(booking: any): string {
  const appointmentDate = new Date(booking.preferredDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  let emailText = `
Booking Confirmation - Picture Perfect TV Install

Dear ${booking.name},

Thank you for booking with Picture Perfect TV Install. Your appointment has been confirmed.

APPOINTMENT DETAILS
Date: ${formattedDate}
Time: ${booking.appointmentTime}
Service: ${booking.serviceType}

LOCATION
${booking.streetAddress}
${booking.addressLine2 ? booking.addressLine2 + '\n' : ''}${booking.city}, ${booking.state} ${booking.zipCode}

If you need to reschedule or cancel your appointment, please contact us at (678) 263-2859.

Thank you for choosing Picture Perfect TV Install!
  `;

  return emailText;
}

/**
 * Get HTML version of the confirmation email
 */
function getHtmlConfirmation(booking: any): string {
  const appointmentDate = new Date(booking.preferredDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .appointment-details { background-color: #f5f7ff; padding: 15px; border-radius: 5px; margin: 20px 0; }
    .footer { font-size: 12px; text-align: center; margin-top: 30px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Booking is Confirmed</h1>
  </div>
  
  <div class="content">
    <p>Dear ${booking.name},</p>
    
    <p>Thank you for booking with Picture Perfect TV Install. Your appointment has been confirmed.</p>
    
    <div class="appointment-details">
      <h3>Appointment Details</h3>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${booking.appointmentTime}</p>
      <p><strong>Service:</strong> ${booking.serviceType}</p>
    </div>
    
    <div class="appointment-details">
      <h3>Location</h3>
      <p>${booking.streetAddress}</p>
      ${booking.addressLine2 ? `<p>${booking.addressLine2}</p>` : ''}
      <p>${booking.city}, ${booking.state} ${booking.zipCode}</p>
    </div>
    
    <p>If you need to reschedule or cancel your appointment, please contact us at <strong>(678) 263-2859</strong>.</p>
    
    <p>Thank you for choosing Picture Perfect TV Install!</p>
  </div>
  
  <div class="footer">
    <p>© ${new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.</p>
  </div>
</body>
</html>
  `;

  return emailHtml;
}

/**
 * Send an admin notification email about a new booking
 */
export async function sendAdminBookingNotificationEmail(booking: any) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Cannot send admin notification email: SENDGRID_API_KEY not set");
    return false;
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@pictureperfecttv.com';

  try {
    const msg = {
      to: adminEmail,
      from: process.env.EMAIL_FROM || 'bookings@pictureperfecttv.com',
      subject: 'New Booking Notification',
      text: getPlainTextAdminNotification(booking),
      html: getHtmlAdminNotification(booking),
    };
    
    await sgMail.send(msg);
    console.log(`Admin notification email sent to ${adminEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return false;
  }
}

/**
 * Get plain text version of the admin notification email
 */
function getPlainTextAdminNotification(booking: any): string {
  const appointmentDate = new Date(booking.preferredDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  let emailText = `
New Booking Notification - Picture Perfect TV Install

A new booking has been received:

CUSTOMER INFORMATION
Name: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone}

APPOINTMENT DETAILS
Date: ${formattedDate}
Time: ${booking.appointmentTime}
Service: ${booking.serviceType}

LOCATION
${booking.streetAddress}
${booking.addressLine2 ? booking.addressLine2 + '\n' : ''}${booking.city}, ${booking.state} ${booking.zipCode}

ADDITIONAL NOTES
${booking.notes || 'None provided'}

You can view and manage this booking from the admin dashboard.
  `;

  return emailText;
}

/**
 * Get HTML version of the admin notification email
 */
function getHtmlAdminNotification(booking: any): string {
  const appointmentDate = new Date(booking.preferredDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  let emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background-color: #1a56db; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; }
    .section { background-color: #f5f7ff; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .footer { font-size: 12px; text-align: center; margin-top: 30px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    <h1>New Booking Notification</h1>
  </div>
  
  <div class="content">
    <p>A new booking has been received:</p>
    
    <div class="section">
      <h3>Customer Information</h3>
      <p><strong>Name:</strong> ${booking.name}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
    </div>
    
    <div class="section">
      <h3>Appointment Details</h3>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${booking.appointmentTime}</p>
      <p><strong>Service:</strong> ${booking.serviceType}</p>
    </div>
    
    <div class="section">
      <h3>Location</h3>
      <p>${booking.streetAddress}</p>
      ${booking.addressLine2 ? `<p>${booking.addressLine2}</p>` : ''}
      <p>${booking.city}, ${booking.state} ${booking.zipCode}</p>
    </div>
    
    <div class="section">
      <h3>Additional Notes</h3>
      <p>${booking.notes || 'None provided'}</p>
    </div>
    
    <p>You can view and manage this booking from the admin dashboard.</p>
  </div>
  
  <div class="footer">
    <p>© ${new Date().getFullYear()} Picture Perfect TV Install</p>
  </div>
</body>
</html>
  `;

  return emailHtml;
}
