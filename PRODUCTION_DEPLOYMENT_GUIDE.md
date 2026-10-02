# Production Deployment Guide - pptvinstall.com

## Domain

- Canonical domain: `https://pptvinstall.com`
- OG image path: `https://pptvinstall.com/og-image.jpg`
- Health endpoints:
  - `https://pptvinstall.com/api/health`
  - `https://pptvinstall.com/api/ready`

## Required Production Secrets

```bash
NODE_ENV=production
DOMAIN=pptvinstall.com

DATABASE_URL=postgresql://...

EMAIL_USER=pptvinstall@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=pptvinstall@gmail.com
EMAIL_FROM="Picture Perfect TV Install <pptvinstall@gmail.com>"

ADMIN_PASSWORD=REPLACE_WITH_A_LONG_RANDOM_SECRET
```

## Deployment Checklist

1. Build the app with `npm run build`.
2. Run `npm run check`.
3. Run `node health-check.js`.
4. Deploy with the production env vars above.
5. Verify `/api/ready` returns `200`.
6. Verify booking creation, contact submission, and booking email delivery.

## Monitoring

- Uptime monitor:
  - URL: `https://pptvinstall.com/api/health`
  - Interval: 5 minutes
- Readiness monitor:
  - URL: `https://pptvinstall.com/api/ready`
  - Interval: 5 minutes

## Business Profile Reference

- Website: `https://pptvinstall.com`
- Booking URL: `https://pptvinstall.com/booking`
- Phone: `404-702-4748`
- Email: `pptvinstall@gmail.com`
- Hours:
  - Monday to Friday: 5:30 PM to 7:00 PM
  - Saturday and Sunday: 8:00 AM to 5:00 PM

## Important

- Do not configure SendGrid.
- Do not configure SendGrid webhooks.
- The current email runtime uses Gmail SMTP only.
- Production boot depends on Neon being reachable; that is intentional so broken booking infrastructure does not serve live traffic.
