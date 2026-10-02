# Staging runbook (production is never touched)

## Services
Create a NEW Render web service for staging from branch `consolidation/job-os` and a NEW Neon branch/database. Do not reuse the production service, DB or domain.

## Environment variables
| Var | Staging value |
|---|---|
| `APP_ENV` | `staging` |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | staging Neon branch URL |
| `PRODUCTION_DB_HOST` | production DB hostname (boot refuses if DATABASE_URL contains it) |
| `ADMIN_API_TOKEN` | long random value (boot refuses without it) |
| `JOB_OS_ENABLED` | `true` |
| `OUTBOUND_MODE` | `suppress` (default in staging) |
| `STAGING_ALLOW_LIVE_OUTBOUND` | unset; `OUTBOUND_MODE=live` is ignored in staging without it |
| `JOBOS_STORE` | unset (Postgres); `memory` for demo |
Real email/SMS/push/AI keys should be left unset on staging.

## Test mode guarantees
In staging: email, SMS and push are diverted to a masked in-memory outbox (viewable at `GET /api/admin/job-os/outbox`), AI calls are disabled, booking notifications are suppressed. `/api/health` reports `appEnv` and `outboundSuppressed`.

## Database
Requirements: Postgres (Neon). Procedure: `DATABASE_URL=<staging> npx drizzle-kit push`. Review the diff first: only the 13 new Job OS tables must be created; no drops. Never run push against production without an owner-approved backup and review.

## Smoke test
1. `curl $URL/api/health` -> `appEnv: staging`, `outboundSuppressed: true`.
2. `npm run smoke` against the URL.
3. Admin: unlock `/admin/job-builder`, build a job, save quote, copy link, open `/q/<token>` in a private window, accept.
4. Record actuals, create invoice, record payment; confirm the outbox holds suppressed messages and nothing was sent.

## Rollback
Staging: redeploy the previous commit; restore the Neon branch. Job OS tables are additive, so they can be ignored or dropped on the staging branch only.
