# Email Delivery Setup

## Live Email Path

The production app sends email through Gmail SMTP from `server/email.ts`.

Required env vars:

```bash
EMAIL_USER=pptvinstall@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=pptvinstall@gmail.com
EMAIL_FROM="Picture Perfect TV Install <pptvinstall@gmail.com>"
```

## Gmail Setup

1. Enable 2-Step Verification on the Gmail account.
2. Create a Gmail App Password.
3. Store the app password in `EMAIL_PASS`.
4. Store the Gmail address in `EMAIL_USER`.

## What The App Sends

- Booking confirmation emails
- Reschedule emails
- Cancellation emails
- Contact-form notifications
- Error alert emails to the admin address when enabled by runtime conditions

## Verification

```bash
node health-check.js
```

That script reports whether the email env vars are present without exposing secret values.

## Important

- Do not use SendGrid for the current production app.
- Do not set up SendGrid event webhooks.
- Keep all credentials in environment variables only.
