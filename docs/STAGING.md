# Staging runbook — isolated from production

**Updated 2026-10-21.** The legacy `consolidation/job-os` branch is no longer the staging source of truth; its unique changes were incorporated into canonical `main`. Staging must start from a review branch based on current `pptvinstall/pptvinstall:main`, or a known reviewed SHA from `main`.

## Isolation requirements

- [ ] Create or reuse an isolated **staging** Render web service; **never change production Render service ID, production domain, or production Blueprint binding** to create staging.
- [ ] Use an isolated Neon/Render PostgreSQL **staging branch/database**. Confirm `DATABASE_URL` refers to it and is not the live database; retain the production DB hostname for safety checks but never record connection strings in Git.
- [ ] Ensure domain is staging-specific; no production DNS, custom domain or production webhooks.
- [ ] Use a private staging admin token; no live customer recipients; no real Stripe callbacks.
- [ ] Confirm staging outbound is suppressed **before** entering any test booking data.
- [ ] Record tested source SHA and staging deployment details.

## Environment variables

| Var | Staging configuration |
| --- | --- |
| `APP_ENV` | `staging` |
| `NODE_ENV` | `production` (built application runtime) |
| `DATABASE_URL` | **staging** database secret; never paste value |
| `PRODUCTION_DB_HOST` | production database hostname guard, not a credential URL |
| `ADMIN_API_TOKEN` | unique high-entropy **staging** secret |
| `JOB_OS_ENABLED` | `true` if testing Job OS |
| `OUTBOUND_MODE` | `suppress` |
| `STAGING_ALLOW_LIVE_OUTBOUND` | **unset** |
| `JOBOS_STORE` | default PostgreSQL; `memory` only for nonpersistent demonstration |

Keep real Gmail/SMTP, Twilio, push, Stripe live-mode and production AI keys unset unless a specific test has been reviewed and approved. Do not make staging depend on production Render environment groups.

## Schema

1. Create isolated staging DB branch and take a staging snapshot/backup.
2. Compare `shared/schema.ts` to staging schema; review changes before running `drizzle-kit push`. Do not treat old counts of "13 additive Job OS tables" as authoritative for later commits.
3. Run schema operations on **staging only** after verifying host and selected database. No production `db:push` without backup and separate explicit authorization.

## Safe smoke tests

1. `/healthz` returns `status: ok`.
2. `/api/health` returns `appEnv: staging` and `outboundSuppressed: true`; verify staging SHA and DB reachability.
3. Run `npm run smoke` against staging.
4. Verify admin auth rejects invalid credentials, quote/tokens do not leak internal pricing, staging owner confirmation path works, and booking timezone/event exports use `America/New_York` appropriately.
5. Create synthetic **staging-only** job/quote/booking; verify suppressed in-memory outbox. Never send live customer email, SMS, push, or payments for these tests.
6. Keep separate human review of booking incident draft [PR #23](https://github.com/pptvinstall/pptvinstall/pull/23) until owner approval.

## Rollback

Redeploy the previous known-good **staging** SHA and restore the staging database branch/snapshot. Never roll back production while diagnosing staging.

## Deployment configuration caution

The current repository `render.yaml` has unverified naming/database-resource drift. Do **not** sync it to staging or production until the canonical production Render service ownership, Postgres provider, and Blueprint binding are reconciled. See [RENDER_INCIDENT_2026-10-21.md](RENDER_INCIDENT_2026-10-21.md).
