// Access environment variables directly
import sgMail from '@sendgrid/mail';

console.log('==== Email Environment Test ====');
console.log('SENDGRID_API_KEY set:', !!process.env.SENDGRID_API_KEY);
console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || '(not set)');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM || '(not set)');

// Set the API key for SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('Successfully set SendGrid API key');
} else {
  console.error('Error: SendGrid API key not found in environment variables');
  process.exit(1);
}

// Create test emails
const timestamp = new Date().toLocaleTimeString();
const adminEmail = process.env.ADMIN_EMAIL || 'Pptvinstall@gmail.com';
const fromEmail = process.env.EMAIL_FROM || 'Pptvinstall@gmail.com';

console.log(`Will send test email from ${fromEmail} to admin at ${adminEmail}`);

// Send a test email to the admin
const msg = {
  to: adminEmail,
  from: fromEmail,
  subject: `⚠️ IMPORTANT TEST: Email Delivery Verification (${timestamp})`,
  text: `This is a test email sent at ${timestamp} to verify admin email delivery is working correctly.\n\nIf you received this email, it confirms that SendGrid's admin notification delivery is functioning properly.\n\nNo action is required.`,
  html: `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 5px;">
      <h2 style="color: #005cb9;">⚠️ Admin Email Delivery Test</h2>
      <p>This is a test email sent at <strong>${timestamp}</strong> to verify admin email delivery is working correctly.</p>
      <p style="background-color: #e8f4ff; padding: 10px; border-radius: 5px;">If you received this email, it confirms that SendGrid's admin notification delivery is functioning properly.</p>
      <p>No action is required.</p>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #777;">
        Test message sent automatically from Picture Perfect TV Install system
      </div>
    </div>
  `,
};

// Send the test email
sgMail
  .send(msg)
  .then(() => {
    console.log('Test email sent successfully to admin at:', adminEmail);
    console.log('Please check your inbox (and spam/junk folders) for this test message');
  })
  .catch((error) => {
    console.error('Error sending test email:');
    console.error(error);
    
    if (error.response) {
      console.error('SendGrid API error response:');
      console.error(error.response.body);
    }
  });