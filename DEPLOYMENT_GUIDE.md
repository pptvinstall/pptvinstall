# Picture Perfect TV Install Deployment Guide

## Current Production Stack

- Frontend: Vite static build served by the Node app
- Backend: Express
- Database: Neon Postgres via `DATABASE_URL`
- Email: Gmail SMTP via `EMAIL_USER` and `EMAIL_PASS`
- Health endpoints:
  - `GET /api/health`
  - `GET /api/ready`

## Required Environment Variables

```bash
NODE_ENV=production
PORT=5000

DATABASE_URL=postgresql://...

EMAIL_USER=pptvinstall@gmail.com
EMAIL_PASS=your_gmail_app_password
ADMIN_EMAIL=pptvinstall@gmail.com
EMAIL_FROM="Picture Perfect TV Install <pptvinstall@gmail.com>"

ADMIN_PASSWORD=your_secure_admin_password
```

## Optional Environment Variables

```bash
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=...
```

## Pre-Deploy Checks

```bash
npm run check
npm run build
node health-check.js
```

## What To Verify After Deploy

1. `GET /api/health` returns a truthful status.
2. `GET /api/ready` returns `200` when the database is reachable.
3. Submit a real contact-form test.
4. Submit a booking test and confirm the booking is saved to Neon.
5. Confirm booking emails arrive from the Gmail SMTP setup.

## Operational Notes

- The app performs a DB preflight before startup in production. If Neon is unreachable, the server should exit instead of serving broken booking routes.
- `health-check.js` is safe and non-destructive. It checks env presence, DB connectivity, and required tables.
- Do not configure SendGrid or SendGrid webhooks. The live runtime email path is `server/email.ts` using Gmail SMTP.
