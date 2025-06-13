# Gmail SMTP Setup Guide
## Configure Gmail App Password for Email Notifications

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings: https://myaccount.google.com/
2. Click "Security" in the left sidebar
3. Under "Signing in to Google," click "2-Step Verification"
4. Follow the prompts to enable 2FA if not already enabled

### Step 2: Generate App Password
1. Stay in Google Account Security settings
2. Click "App passwords" (appears after 2FA is enabled)
3. Select "Mail" for the app type
4. Select "Other (custom name)" for device
5. Enter: "Picture Perfect TV Install"
6. Click "Generate"
7. Copy the 16-character password (format: xxxx xxxx xxxx xxxx)

### Step 3: Update Environment Variables
Add the App Password to your `.env` file:

```
GMAIL_APP_PASSWORD=your-16-character-app-password-here
```

**Important:** Remove spaces from the App Password when adding to .env file.

### Step 4: Verify Configuration
The system will now send emails from `pptvinstall@gmail.com` to:
- Customer email address (from booking form)
- Admin email address (pptvinstall@gmail.com)

### Email Features
- Professional HTML formatting with company branding
- Personalized subject lines: "Your Booking is Confirmed – Jun 16 @ 3:30 PM"
- Complete booking details and calendar attachment
- Plain text version for maximum deliverability
- Spam prevention footer

### Testing
Once configured, test with a booking to verify both customer and admin receive the confirmation email.

### Troubleshooting
- Ensure 2FA is enabled on the Gmail account
- App Password must be generated specifically for this application
- Remove any spaces from the 16-character password
- Check Gmail account security settings allow less secure app access