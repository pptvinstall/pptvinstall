// Quick test to verify SendGrid integration
import { MailService } from '@sendgrid/mail';

const sgMail = new MailService();
const apiKey = process.env.SENDGRID_API_KEY;

if (!apiKey) {
  console.error('SENDGRID_API_KEY not found in environment');
  process.exit(1);
}

sgMail.setApiKey(apiKey);

const testEmail = {
  to: 'PPTVInstall@gmail.com',
  from: 'PPTVInstall@gmail.com',
  subject: 'SendGrid Test - Picture Perfect TV Install',
  html: '<h1>Test Email</h1><p>This is a test email from the booking system.</p>',
  text: 'Test Email\n\nThis is a test email from the booking system.'
};

console.log('Testing SendGrid connection...');

sgMail.send(testEmail)
  .then(() => {
    console.log('✅ SendGrid test email sent successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ SendGrid test failed:', error.response?.body || error.message);
    process.exit(1);
  });