# Architecture (as of RC `ecb11f4`, now on `consolidation/job-os`)

Single TypeScript full-stack app, deployed as one Node service.

- **Client** (`client/`): React + Vite + Tailwind + Radix/shadcn, TanStack Query, wouter-style pages. Quote UI in `components/ui/QuoteTool.tsx` and `quote-tool/*`; pricing in `lib/quote-calculator.ts`, `lib/travel-pricing.ts`, `data/pricing-data.ts`; booking steps in `pages/booking/*`; manage/confirm in `pages/ManageBooking.tsx`, `pages/Confirmation.tsx`; admin in `pages/admin*.tsx`, `dashboard.tsx`.
- **Server** (`server/`): Express. `routes.ts` (API), `storage.ts` + `storage.db.ts` (data access), `email.ts` (Gmail SMTP via nodemailer), `services/` (`aiQuoteService`, `calendarService` ICS, `smsService` Twilio, `pushNotificationService`, `schedulerService`, `errorAlertService`, `loggingService`, `emailTemplates`), `monitoring.ts`, `env.ts`, `middleware/optimization.ts`.
- **Shared** (`shared/schema.ts`): Drizzle tables `bookings`, `booking_archives`, `business_hours`, `customers`, `crm_contacts`, `sms_opt_outs`, `sms_messages`, `system_settings`, `promotions`, plus Zod insert schemas.
- **Data**: Neon PostgreSQL. Schema applied with `drizzle-kit push` (no migration history).
- **Security boundaries observed in code**: admin routes need `x-admin-token` (constant-time compare; production refuses a dev fallback); booking manage/calendar endpoints require the per-booking `management_token` and return the same response for a bad token as for a missing booking; AI quote endpoint is rate limited per IP; Twilio webhook signature validation; STOP keyword handling and opt-out table.

Commands: `npm run dev`, `npm run check` (tsc), `npm run build`, `npm start`, `npm run smoke`, `npm run db:push`.
