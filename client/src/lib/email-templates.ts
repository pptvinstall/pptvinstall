// Email template functions for booking confirmations

export interface BookingEmailData {
  customerName: string;
  customerEmail: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceAddress: string;
  services: string[];
  totalAmount: number;
  bookingId: string;
  notes?: string;
  isTestMode?: boolean;
}

// Customer confirmation email template
export const generateCustomerConfirmationEmail = (data: BookingEmailData) => {
  const testPrefix = data.isTestMode ? '[TEST] ' : '';
  
  return {
    subject: `${testPrefix}Your TV Installation Appointment is Confirmed - ${data.appointmentDate}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Booking Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .detail-item { padding: 10px; background: #f1f5f9; border-radius: 4px; }
          .detail-label { font-weight: bold; color: #475569; font-size: 12px; text-transform: uppercase; }
          .detail-value { color: #1e293b; margin-top: 4px; }
          .service-list { list-style: none; padding: 0; }
          .service-item { background: #e0f2fe; padding: 8px 12px; margin: 5px 0; border-radius: 4px; border-left: 4px solid #0284c7; }
          .total-amount { font-size: 24px; font-weight: bold; color: #059669; text-align: center; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 14px; }
          .test-banner { background: #fef3c7; border: 2px solid #f59e0b; color: #92400e; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center; font-weight: bold; }
          @media (max-width: 600px) {
            .details-grid { grid-template-columns: 1fr; }
            .container { padding: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          ${data.isTestMode ? '<div class="test-banner">🧪 THIS IS A TEST BOOKING - NO ACTUAL APPOINTMENT SCHEDULED</div>' : ''}
          
          <div class="header">
            <h1>Booking Confirmed! ✅</h1>
            <p>Thank you for choosing Picture Perfect TV Install</p>
          </div>
          
          <div class="content">
            <div class="card">
              <h2>Hello ${data.customerName}!</h2>
              <p>We're excited to help you with your TV installation. Your appointment has been confirmed and we'll be there on time to provide professional service.</p>
            </div>

            <div class="card">
              <h3>📅 Appointment Details</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <div class="detail-label">Date</div>
                  <div class="detail-value">${new Date(data.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                </div>
                <div class="detail-item">
                  <div class="detail-label">Time</div>
                  <div class="detail-value">${data.appointmentTime}</div>
                </div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Service Address</div>
                <div class="detail-value">${data.serviceAddress}</div>
              </div>
              
              <div class="detail-item">
                <div class="detail-label">Booking ID</div>
                <div class="detail-value">${data.bookingId}</div>
              </div>
            </div>

            <div class="card">
              <h3>🔧 Services Requested</h3>
              <ul class="service-list">
                ${data.services.map(service => `<li class="service-item">${service}</li>`).join('')}
              </ul>
              
              <div class="total-amount">
                Total: $${data.totalAmount.toFixed(2)}
              </div>
            </div>

            ${data.notes ? `
            <div class="card">
              <h3>📝 Special Instructions</h3>
              <p style="background: #f1f5f9; padding: 15px; border-radius: 6px; margin: 0;">${data.notes}</p>
            </div>
            ` : ''}

            <div class="card">
              <h3>📞 Need to Make Changes?</h3>
              <p>Contact us if you need to reschedule or have questions:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="tel:404-702-4748" class="button">📞 Call Us</a>
                <a href="mailto:PPTVInstall@gmail.com" class="button">✉️ Email Us</a>
              </div>
            </div>

            <div class="card">
              <h3>📅 Add to Your Calendar</h3>
              <p>Don't forget about your appointment! Add it to your calendar:</p>
              <div style="text-align: center; margin: 20px 0;">
                <a href="#" class="button" onclick="downloadCalendar()">📥 Download .ics</a>
                <a href="#" class="button">📅 Google Calendar</a>
              </div>
            </div>

            <div class="footer">
              <p><strong>Picture Perfect TV Install</strong><br>
              Professional TV mounting and smart home installation across Metro Atlanta<br>
              404-702-4748 • PPTVInstall@gmail.com</p>
              
              <p style="font-size: 12px; margin-top: 15px;">
                We look forward to creating your perfect viewing experience!
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
${data.isTestMode ? '🧪 TEST BOOKING - NO ACTUAL APPOINTMENT SCHEDULED\n\n' : ''}
BOOKING CONFIRMED ✅

Hello ${data.customerName}!

Your TV installation appointment has been confirmed:

📅 APPOINTMENT DETAILS
Date: ${new Date(data.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
Time: ${data.appointmentTime}
Address: ${data.serviceAddress}
Booking ID: ${data.bookingId}

🔧 SERVICES
${data.services.map(service => `• ${service}`).join('\n')}

Total: $${data.totalAmount.toFixed(2)}

${data.notes ? `📝 SPECIAL INSTRUCTIONS\n${data.notes}\n\n` : ''}

📞 NEED TO MAKE CHANGES?
Call: 404-702-4748
Email: PPTVInstall@gmail.com

We look forward to providing excellent service!

Picture Perfect TV Install
Professional TV mounting and smart home installation
Metro Atlanta • 404-702-4748 • PPTVInstall@gmail.com
    `
  };
};

// Admin notification email template
export const generateAdminNotificationEmail = (data: BookingEmailData) => {
  const testPrefix = data.isTestMode ? '[TEST] ' : '';
  
  return {
    subject: `${testPrefix}New Booking: ${data.customerName} - ${data.appointmentDate}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Booking Alert</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .info-item { background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; }
          .label { font-weight: bold; color: #374151; text-transform: uppercase; font-size: 12px; }
          .value { color: #111827; margin-top: 4px; }
          .service-list { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .test-banner { background: #fef3c7; border: 2px solid #f59e0b; color: #92400e; padding: 15px; margin-bottom: 20px; border-radius: 8px; text-align: center; font-weight: bold; }
          .urgent { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; border-radius: 6px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${data.isTestMode ? '<div class="test-banner">🧪 TEST BOOKING ALERT - NO ACTION REQUIRED</div>' : ''}
          
          <div class="header">
            <h1>🚨 New Booking Alert</h1>
            <p>Immediate action required</p>
          </div>
          
          <div class="content">
            ${!data.isTestMode ? '<div class="urgent"><strong>⚡ URGENT:</strong> New customer booking requires confirmation call within 2 hours</div>' : ''}
            
            <div class="info-grid">
              <div class="info-item">
                <div class="label">Customer</div>
                <div class="value">${data.customerName}</div>
              </div>
              <div class="info-item">
                <div class="label">Phone</div>
                <div class="value"><a href="tel:${data.customerEmail}">${data.customerEmail}</a></div>
              </div>
              <div class="info-item">
                <div class="label">Date & Time</div>
                <div class="value">${new Date(data.appointmentDate).toLocaleDateString()} at ${data.appointmentTime}</div>
              </div>
              <div class="info-item">
                <div class="label">Total Value</div>
                <div class="value">$${data.totalAmount.toFixed(2)}</div>
              </div>
            </div>

            <div class="info-item">
              <div class="label">Service Address</div>
              <div class="value">${data.serviceAddress}</div>
            </div>

            <div class="service-list">
              <div class="label">Services Requested</div>
              ${data.services.map(service => `<div style="margin: 8px 0; padding: 8px; background: #f3f4f6; border-radius: 4px;">• ${service}</div>`).join('')}
            </div>

            ${data.notes ? `
            <div class="info-item">
              <div class="label">Customer Notes</div>
              <div class="value">${data.notes}</div>
            </div>
            ` : ''}

            <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px; margin-top: 20px;">
              <h3>⏰ Next Steps</h3>
              <p>1. Call customer within 2 hours to confirm appointment<br>
              2. Add to technician calendar<br>
              3. Send reminder 24 hours before appointment</p>
              <p><strong>Booking ID: ${data.bookingId}</strong></p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
${data.isTestMode ? '🧪 TEST BOOKING ALERT - NO ACTION REQUIRED\n\n' : ''}
🚨 NEW BOOKING ALERT

${!data.isTestMode ? '⚡ URGENT: New customer booking requires confirmation call within 2 hours\n\n' : ''}

CUSTOMER: ${data.customerName}
PHONE: ${data.customerEmail}
EMAIL: ${data.customerEmail}
DATE: ${new Date(data.appointmentDate).toLocaleDateString()} at ${data.appointmentTime}
ADDRESS: ${data.serviceAddress}
TOTAL: $${data.totalAmount.toFixed(2)}

SERVICES:
${data.services.map(service => `• ${service}`).join('\n')}

${data.notes ? `NOTES: ${data.notes}\n\n` : ''}

⏰ NEXT STEPS:
1. Call customer within 2 hours to confirm
2. Add to technician calendar  
3. Send reminder 24 hours before

Booking ID: ${data.bookingId}
    `
  };
};