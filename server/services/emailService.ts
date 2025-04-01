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
    console.log(`Attempting to send confirmation email to customer: ${booking.email}`);

    const fromEmail = process.env.EMAIL_FROM || 'bookings@pictureperfecttv.com';
    console.log(`Using sender email: ${fromEmail}`);

    const msg = {
      to: booking.email,
      from: fromEmail,
      subject: 'Booking Confirmed - Picture Perfect TV Install',
      text: getPlainTextConfirmation(booking),
      html: getHtmlConfirmation(booking),
    };

    console.log("Customer email payload:", JSON.stringify({
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    }));

    await sgMail.send(msg);
    console.log(`Booking confirmation email sent to ${booking.email}`);
    return true;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    if (error.response) {
      console.error('SendGrid API error response:', error.response.body);
    }
    return false;
  }
}

function getPlainTextConfirmation(booking: any): string {
  const appointmentDate = new Date(booking.preferredDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Format pricing breakdown in a more readable way
  let pricingBreakdownText = '';
  if (booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown)) {
    pricingBreakdownText = '\nService Details:';
    
    booking.pricingBreakdown.forEach((item, index) => {
      if (item.type === 'tv') {
        pricingBreakdownText += `\n${index + 1}. TV ${item.isUnmountOnly ? 'Unmounting' : item.isRemountOnly ? 'Remounting' : 'Installation'}: `;
        pricingBreakdownText += `${item.size === 'small' ? 'Up to 55"' : 'Over 55"'}`;
        
        if (item.location !== 'standard') {
          pricingBreakdownText += ` (${item.location.charAt(0).toUpperCase() + item.location.slice(1)})`;
        }
        
        if (item.mountType !== 'none') {
          pricingBreakdownText += ` with ${item.mountType.charAt(0).toUpperCase() + item.mountType.slice(1)} Mount`;
        }
      } else {
        pricingBreakdownText += `\n${index + 1}. ${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Installation`;
        
        if (item.quantity > 1) {
          pricingBreakdownText += ` (${item.quantity} units)`;
        }
      }
    });
  }

  let emailText = `
Booking Confirmation - Picture Perfect TV Install

Dear ${booking.name},

Thank you for choosing Picture Perfect TV Install! Your appointment has been confirmed.

📅 APPOINTMENT DETAILS
Date: ${formattedDate}
Time: ${booking.appointmentTime}
Service: ${booking.serviceType}

💰 PRICING INFORMATION
Total: $${booking.pricingTotal || 'To be determined'}
${pricingBreakdownText}

Note: This is an estimate. Final price may vary based on additional services or special requirements.

📍 LOCATION
${booking.streetAddress}
${booking.addressLine2 ? booking.addressLine2 + '\n' : ''}${booking.city}, ${booking.state} ${booking.zipCode}

🔍 NEXT STEPS
1. Our technician will arrive during your selected time slot
2. Please ensure the installation area is accessible
3. Have your TV and any mounting hardware ready if you're providing them
4. Clear the workspace area for efficient installation

📞 NEED TO MAKE CHANGES?
If you need to reschedule or have any questions, please call us at: +16782632859

Thank you for choosing Picture Perfect TV Install! We look forward to providing you with excellent service.

Best regards,
The Picture Perfect TV Install Team

© ${new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.
Professional TV Mounting Services in Metro Atlanta
  `;

  return emailText;
}

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      background-color: #f9fafb;
    }
    .header { 
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .logo {
      width: 120px;
      height: auto;
      margin-bottom: 20px;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .appointment-details, .location-details, .next-steps, .pricing-details {
      background-color: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
    }
    .pricing-details {
      background-color: #f0fff4;
      border-left-color: #059669;
    }
    .next-steps ul {
      list-style-type: none;
      padding-left: 0;
    }
    .next-steps li {
      margin-bottom: 10px;
      padding-left: 25px;
      position: relative;
    }
    .next-steps li:before {
      content: "✓";
      color: #3b82f6;
      position: absolute;
      left: 0;
    }
    .contact-info {
      text-align: center;
      background-color: #f0f9ff;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .footer {
      font-size: 12px;
      text-align: center;
      margin-top: 30px;
      color: #666;
      padding: 20px;
    }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #1e40af; font-size: 20px; margin-top: 0; }
    .highlight { color: #1e40af; font-weight: bold; }
    .price { 
      font-size: 24px;
      color: #059669;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Your Booking is Confirmed!</h1>
  </div>

  <div class="content">
    <p>Dear <span class="highlight">${booking.name}</span>,</p>

    <p>Thank you for choosing Picture Perfect TV Install! We're excited to help you with your installation needs.</p>

    <div class="appointment-details">
      <h2>📅 Appointment Details</h2>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${booking.appointmentTime}</p>
      <p><strong>Service:</strong> ${booking.serviceType}</p>
    </div>

    <div class="pricing-details">
      <h2>💰 Pricing Information</h2>
      <p class="price">$${booking.pricingTotal || 'To be determined'}</p>
      ${booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown) ? `
      <div style="margin-top: 15px; font-size: 14px;">
        <strong>Service Details:</strong>
        <ul style="padding-left: 20px; margin-top: 5px;">
          ${booking.pricingBreakdown.map(item => `
            <li>
              ${item.type === 'tv' ? 
                `TV ${item.isUnmountOnly ? 'Unmounting' : item.isRemountOnly ? 'Remounting' : 'Installation'}: 
                 ${item.size === 'small' ? 'Up to 55"' : 'Over 55"'}
                 ${item.location !== 'standard' ? ` (${item.location.charAt(0).toUpperCase() + item.location.slice(1)})` : ''}
                 ${item.mountType !== 'none' ? ` with ${item.mountType.charAt(0).toUpperCase() + item.mountType.slice(1)} Mount` : ''}` 
                : 
                `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Installation
                 ${item.quantity > 1 ? ` (${item.quantity} units)` : ''}`
              }
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      <p class="text-sm" style="color: #666; font-size: 14px; margin-top: 10px;">
        This is an estimate. Final price may vary based on additional services or special requirements.
      </p>
    </div>

    <div class="location-details">
      <h2>📍 Installation Location</h2>
      <p>${booking.streetAddress}</p>
      ${booking.addressLine2 ? `<p>${booking.addressLine2}</p>` : ''}
      <p>${booking.city}, ${booking.state} ${booking.zipCode}</p>
    </div>

    <div class="next-steps">
      <h2>🔍 Next Steps</h2>
      <ul>
        <li>Our technician will arrive during your selected time slot</li>
        <li>Please ensure the installation area is accessible</li>
        <li>Have your TV and any mounting hardware ready if you're providing them</li>
        <li>Clear the workspace area for efficient installation</li>
      </ul>
    </div>

    <div class="contact-info">
      <h2>📞 Need to Make Changes?</h2>
      <p>If you need to reschedule or have any questions, please call us at:<br>
      <strong>+16782632859</strong></p>
    </div>

    <p style="text-align: center;">We look forward to providing you with excellent service!</p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.</p>
    <p>Professional TV Mounting Services in Metro Atlanta</p>
  </div>
</body>
</html>
  `;

  return emailHtml;
}

/**
 * Send a booking update notification email to the customer
 */
export async function sendBookingUpdateEmail(booking: any, changes: Record<string, any>) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Cannot send booking update email: SENDGRID_API_KEY not set");
    return false;
  }

  try {
    console.log(`Attempting to send booking update email to customer: ${booking.email}`);

    const fromEmail = process.env.EMAIL_FROM || 'bookings@pictureperfecttv.com';
    console.log(`Using sender email: ${fromEmail}`);

    // Create a human-readable list of changes
    const changesHtml = Object.entries(changes)
      .filter(([key]) => key !== 'sendUpdateEmail' && key !== 'id') // Exclude non-relevant fields
      .map(([key, value]) => {
        let fieldName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
        fieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1); // Capitalize first letter
        
        // Format date if the field is preferredDate
        if (key === 'preferredDate') {
          const date = new Date(value as string);
          value = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        }
        
        return `<li><strong>${fieldName}:</strong> ${value}</li>`;
      })
      .join('');

    const msg = {
      to: booking.email,
      from: fromEmail,
      subject: 'Booking Update - Picture Perfect TV Install',
      text: `Your booking has been updated. Please review the changes:\n${Object.entries(changes)
        .filter(([key]) => key !== 'sendUpdateEmail' && key !== 'id')
        .map(([key, value]) => {
          let fieldName = key.replace(/([A-Z])/g, ' $1').toLowerCase();
          fieldName = fieldName.charAt(0).toUpperCase() + fieldName.slice(1);
          return `${fieldName}: ${value}`;
        })
        .join('\n')}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { 
              font-family: 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              background-color: #f9fafb;
            }
            .header { 
              background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
              color: white;
              padding: 30px 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: white;
              padding: 30px;
              border-radius: 0 0 8px 8px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .appointment-details {
              background-color: #f0f9ff;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #3b82f6;
            }
            .changes-list {
              background-color: #fef3c7;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #d97706;
            }
            .footer {
              font-size: 12px;
              text-align: center;
              margin-top: 30px;
              color: #666;
              padding: 20px;
            }
            h1 { margin: 0; font-size: 24px; }
            h2 { color: #1e40af; font-size: 20px; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Booking Update</h1>
          </div>
        
          <div class="content">
            <p>Dear <strong>${booking.name}</strong>,</p>
        
            <p>Your booking with Picture Perfect TV Install has been updated. Please review the changes below:</p>
        
            <div class="changes-list">
              <h2>📝 Changes Made</h2>
              <ul>
                ${changesHtml}
              </ul>
            </div>
        
            <div class="appointment-details">
              <h2>📅 Current Appointment Details</h2>
              <p><strong>Date:</strong> ${new Date(booking.preferredDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
              <p><strong>Time:</strong> ${booking.appointmentTime}</p>
              <p><strong>Service:</strong> ${booking.serviceType}</p>
              <p><strong>Total:</strong> $${booking.pricingTotal || 'To be determined'}</p>
            </div>
        
            <p>If you have any questions about these changes, please contact us at <strong>+16782632859</strong>.</p>
        
            <p>Thank you for choosing Picture Perfect TV Install!</p>
          </div>
        
          <div class="footer">
            <p>© ${new Date().getFullYear()} Picture Perfect TV Install. All rights reserved.</p>
            <p>Professional TV Mounting Services in Metro Atlanta</p>
          </div>
        </body>
        </html>
      `,
    };

    console.log("Update email payload:", JSON.stringify({
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    }));

    await sgMail.send(msg);
    console.log(`Booking update email sent to ${booking.email}`);
    return true;
  } catch (error) {
    console.error('Error sending booking update email:', error);
    if (error.response) {
      console.error('SendGrid API error response:', error.response.body);
    }
    return false;
  }
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
    console.log(`Attempting to send notification email to admin: ${adminEmail}`);

    const fromEmail = process.env.EMAIL_FROM || 'bookings@pictureperfecttv.com';
    console.log(`Using sender email: ${fromEmail}`);

    const msg = {
      to: adminEmail,
      from: fromEmail,
      subject: '🔔 New Booking Alert - Picture Perfect TV Install',
      text: getPlainTextAdminNotification(booking),
      html: getHtmlAdminNotification(booking),
    };

    console.log("Admin email payload:", JSON.stringify({
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    }));

    await sgMail.send(msg);
    console.log(`Admin notification email sent to ${adminEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    if (error.response) {
      console.error('SendGrid API error response:', error.response.body);
    }
    return false;
  }
}

function getPlainTextAdminNotification(booking: any): string {
  const appointmentDate = new Date(booking.preferredDate);
  const formattedDate = appointmentDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  // Format pricing breakdown in a more readable way
  let pricingBreakdownText = '';
  if (booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown)) {
    pricingBreakdownText = '\nService Details:';
    
    booking.pricingBreakdown.forEach((item, index) => {
      if (item.type === 'tv') {
        pricingBreakdownText += `\n${index + 1}. TV ${item.isUnmountOnly ? 'Unmounting' : item.isRemountOnly ? 'Remounting' : 'Installation'}: `;
        pricingBreakdownText += `${item.size === 'small' ? 'Up to 55"' : 'Over 55"'}`;
        
        if (item.location !== 'standard') {
          pricingBreakdownText += ` (${item.location.charAt(0).toUpperCase() + item.location.slice(1)})`;
        }
        
        if (item.mountType !== 'none') {
          pricingBreakdownText += ` with ${item.mountType.charAt(0).toUpperCase() + item.mountType.slice(1)} Mount`;
        }
      } else {
        pricingBreakdownText += `\n${index + 1}. ${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Installation`;
        
        if (item.quantity > 1) {
          pricingBreakdownText += ` (${item.quantity} units)`;
        }
      }
    });
  }

  let emailText = `
🔔 New Booking Alert - Picture Perfect TV Install

A new booking has been received:

👤 CUSTOMER INFORMATION
Name: ${booking.name}
Email: ${booking.email}
Phone: ${booking.phone}

📅 APPOINTMENT DETAILS
Date: ${formattedDate}
Time: ${booking.appointmentTime}
Service: ${booking.serviceType}

📍 LOCATION
${booking.streetAddress}
${booking.addressLine2 ? booking.addressLine2 + '\n' : ''}${booking.city}, ${booking.state} ${booking.zipCode}

📝 ADDITIONAL NOTES
${booking.notes || 'None provided'}

💰 PRICING
Total: $${booking.pricingTotal || 'Not specified'}
${pricingBreakdownText}

You can view and manage this booking from the admin dashboard.
  `;

  return emailText;
}

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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      background-color: #f9fafb;
    }
    .header { 
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: white;
      padding: 30px;
      border-radius: 0 0 8px 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .section {
      background-color: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #3b82f6;
    }
    .pricing-section {
      background-color: #f0fff4;
      padding: 20px;
      border-radius: 8px;
      margin: 15px 0;
      border-left: 4px solid #059669;
    }
    .footer {
      font-size: 12px;
      text-align: center;
      margin-top: 30px;
      color: #666;
      padding: 20px;
    }
    h1 { margin: 0; font-size: 24px; }
    h2 { color: #1e40af; font-size: 20px; margin-top: 0; }
    .highlight { color: #1e40af; font-weight: bold; }
    .urgent { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔔 New Booking Alert</h1>
  </div>

  <div class="content">
    <p class="urgent">A new booking requires your attention!</p>

    <div class="section">
      <h2>👤 Customer Information</h2>
      <p><strong>Name:</strong> ${booking.name}</p>
      <p><strong>Email:</strong> ${booking.email}</p>
      <p><strong>Phone:</strong> ${booking.phone}</p>
    </div>

    <div class="section">
      <h2>📅 Appointment Details</h2>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${booking.appointmentTime}</p>
      <p><strong>Service:</strong> ${booking.serviceType}</p>
    </div>

    <div class="section">
      <h2>📍 Location</h2>
      <p>${booking.streetAddress}</p>
      ${booking.addressLine2 ? `<p>${booking.addressLine2}</p>` : ''}
      <p>${booking.city}, ${booking.state} ${booking.zipCode}</p>
    </div>

    <div class="pricing-section">
      <h2>💰 Pricing Information</h2>
      <p><strong>Total:</strong> $${booking.pricingTotal || 'Not specified'}</p>
      ${booking.pricingBreakdown && Array.isArray(booking.pricingBreakdown) ? `
      <div style="margin-top: 15px;">
        <strong>Service Details:</strong>
        <ul style="padding-left: 20px; margin-top: 5px;">
          ${booking.pricingBreakdown.map(item => `
            <li>
              ${item.type === 'tv' ? 
                `TV ${item.isUnmountOnly ? 'Unmounting' : item.isRemountOnly ? 'Remounting' : 'Installation'}: 
                 ${item.size === 'small' ? 'Up to 55"' : 'Over 55"'}
                 ${item.location !== 'standard' ? ` (${item.location.charAt(0).toUpperCase() + item.location.slice(1)})` : ''}
                 ${item.mountType !== 'none' ? ` with ${item.mountType.charAt(0).toUpperCase() + item.mountType.slice(1)} Mount` : ''}` 
                : 
                `${item.type.charAt(0).toUpperCase() + item.type.slice(1)} Installation
                 ${item.quantity > 1 ? ` (${item.quantity} units)` : ''}`
              }
            </li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
    </div>

    <div class="section">
      <h2>📝 Additional Notes</h2>
      <p>${booking.notes || 'None provided'}</p>
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="/admin/dashboard" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
        View in Dashboard
      </a>
    </p>
  </div>

  <div class="footer">
    <p>© ${new Date().getFullYear()} Picture Perfect TV Install</p>
    <p>This is an automated notification - Do not reply</p>
  </div>
</body>
</html>
  `;

  return emailHtml;
}