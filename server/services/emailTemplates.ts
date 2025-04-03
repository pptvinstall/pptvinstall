// Email template configuration
export const emailConfig = {
  // Company info
  companyName: 'Picture Perfect TV Install',
  companyPhone: '(404) 555-1234', // Replace with actual phone number
  companyWebsite: 'https://pictureperfecttvinstall.com',
  companyLogo: '/assets/logo-pptv.jpg', // Path relative to public directory
  primaryColor: '#005cb9',
  
  // From address
  fromName: 'Picture Perfect TV Install',
  fromEmail: process.env.EMAIL_FROM || 'PPTVInstall@gmail.com',
  
  // Admin contact
  adminEmail: process.env.ADMIN_EMAIL || 'PPTVInstall@gmail.com',
  
  // Email subjects
  subjects: {
    bookingConfirmation: 'Your TV Installation Booking Confirmation - Picture Perfect TV Install',
    rescheduleConfirmation: 'Your Appointment Has Been Rescheduled - Picture Perfect TV Install',
    serviceEdit: 'Your Service Details Have Been Updated - Picture Perfect TV Install',
    bookingCancellation: 'Booking Cancellation Confirmation - Picture Perfect TV Install',
    passwordReset: 'Password Reset Request - Picture Perfect TV Install',
    welcome: 'Welcome to Picture Perfect TV Install',
    adminNotification: 'New Booking Alert - Picture Perfect TV Install',
    adminRescheduleNotification: 'Booking Reschedule Alert - Picture Perfect TV Install',
    adminEditNotification: 'Booking Edit Alert - Picture Perfect TV Install',
  },
  
  // Email messages and signatures
  messages: {
    bookingThankYou: 'Thank you for choosing Picture Perfect TV Install for your home entertainment needs. We\'re excited to confirm your booking and look forward to providing you with exceptional service.',
    rescheduleThankYou: 'Your appointment with Picture Perfect TV Install has been successfully rescheduled. Here are your updated appointment details:',
    serviceEditThankYou: 'The details of your TV installation service with Picture Perfect TV Install have been updated. Here\'s a summary of the changes:',
    cancellationMessage: 'This email confirms that your booking with Picture Perfect TV Install has been cancelled.',
    signature: 'The Picture Perfect TV Install Team',
    footerText: 'Thank you for choosing Picture Perfect TV Install for your home entertainment needs.',
    calendarMessage: 'We\'ve attached a calendar invitation for your appointment. Please add it to your calendar to help you remember your scheduled service.',
    calendarUpdateMessage: 'We\'ve attached an updated calendar invitation for your appointment. Please update your calendar to reflect this change.',
    contactMessage: 'If you need to make any changes to your booking or have any questions, please contact us at the information below.',
  }
};

/**
 * Centralized shared email components
 */
export const emailComponents = {
  /**
   * Master email template wrapping all content
   */
  masterTemplate: (title: string, content: string) => `
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
      <td align="center" style="padding: 20px 0; background-color: ${emailConfig.primaryColor};">
        <img src="${emailConfig.companyLogo}" alt="${emailConfig.companyName}" style="max-height: 60px; max-width: 80%;">
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
        <p style="margin: 0 0 10px 0;">© ${new Date().getFullYear()} ${emailConfig.companyName}. All rights reserved.</p>
        <p style="margin: 0 0 10px 0;">
          <a href="${emailConfig.companyWebsite}" style="color: ${emailConfig.primaryColor}; text-decoration: none;">${emailConfig.companyWebsite}</a> | 
          Phone: ${emailConfig.companyPhone} | 
          Email: <a href="mailto:${emailConfig.adminEmail}" style="color: ${emailConfig.primaryColor}; text-decoration: none;">${emailConfig.adminEmail}</a>
        </p>
        <p style="margin: 0; font-size: 11px; color: #999999;">
          This email was sent to you because you booked a service with ${emailConfig.companyName}.
          If you believe this was sent in error, please contact us.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,

  /**
   * Standard heading component 
   */
  heading: (text: string) => `
    <h1 style="color: ${emailConfig.primaryColor}; margin-top: 0; font-size: 24px; text-align: center;">${text}</h1>
  `,
  
  /**
   * Standard paragraph component
   */
  paragraph: (text: string) => `
    <p style="margin-bottom: 25px; font-size: 16px; line-height: 1.5;">
      ${text}
    </p>
  `,
  
  /**
   * Service details box component
   */
  serviceDetailsBox: (title: string, rows: Array<{label: string, value: string, highlight?: boolean}>) => `
    <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
      <h2 style="color: #333333; font-size: 18px; margin-top: 0; margin-bottom: 15px;">${title}</h2>
      
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-size: 15px;">
        ${rows.map(row => `
          <tr>
            <td style="padding: 8px 0; width: 40%; color: #666666;"><strong>${row.label}:</strong></td>
            <td style="padding: 8px 0; ${row.highlight ? `font-weight: bold; color: ${emailConfig.primaryColor};` : ''}">${row.value}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `,
  
  /**
   * Important note box component
   */
  noteBox: (text: string) => `
    <div style="margin: 25px 0; padding: 15px; border-left: 4px solid ${emailConfig.primaryColor}; background-color: #f0f7ff;">
      <p style="margin: 0; font-size: 15px;">
        <strong>Important:</strong> ${text}
      </p>
    </div>
  `,
  
  /**
   * Email signature component
   */
  signature: () => `
    <p style="font-size: 16px; line-height: 1.5;">
      Best regards,<br>
      ${emailConfig.messages.signature}
    </p>
  `,
  
  /**
   * Contact information component
   */
  contactInfo: () => `
    <p style="font-size: 16px; line-height: 1.5;">
      ${emailConfig.messages.contactMessage}
    </p>
    <p style="font-size: 16px; line-height: 1.5; text-align: center;">
      <a href="mailto:${emailConfig.adminEmail}" style="color: ${emailConfig.primaryColor};">${emailConfig.adminEmail}</a> 
      or call us at ${emailConfig.companyPhone}
    </p>
  `
};