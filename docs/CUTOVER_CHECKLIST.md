# Cutover Checklist (NOT executed; owner approval required at every gated step)

Goal: make `pptvinstall/pptvinstall` the production source. Nothing below has been done.

## Before cutover
- [ ] Owner reviews and approves PR #2 content (RC import + legacy removal + docs).
- [ ] Confirm in Render which commit is live and that it is still `ecb11f4`. If RC `main` advanced, re-sync: diff RC `main` against the import commit `0fd8aa1` and port the delta first.
- [ ] Decide the two PII questions in `REPOSITORY_INVENTORY.md` (`server/data/bookings.json`, legacy `bookings.db`).
- [x] `verify-production-readiness.js` hardened upstream (no admin password fallback, modern fetch).
- [x] Automated suites exist: `npm run test:pricing` (65) and `npm run test:jobos` (52, incl. Postgres lifecycle and admin-auth/token tests); run in CI.
- [ ] Owner decisions: labor value, MPG/vehicle cost, tax rule, margins, minimum ticket, enabling `dynamic` pricing, photo-intake provider.
- [ ] Production needs `JOB_OS_ENABLED=true` and `drizzle-kit push` of the 13 additive Job OS tables (after backup/branch); see `docs/STAGING.md`.
- [ ] Run the full flow against a staging (see `docs/STAGING.md`) Render service + staging Neon branch: quote, booking, confirmation email, calendar download with token, manage booking, admin, SMS consent/STOP, push.

## Database
- Production schema is expected to already match RC (RC is live). Compare `drizzle-kit` introspection of production against `shared/schema.ts`; they should be identical because the schema file is unchanged from RC.
- Additive-only differences vs the *old canonical* `main`: tables `crm_contacts`, `sms_opt_outs`, `sms_messages`; `bookings.management_token` (uuid, NOT NULL, random default); SMS consent columns on `bookings`/`customers`. Do **not** run `db:push` against production from canonical `main`'s old schema.
- Take a Neon backup/branch before any schema operation. Rollback: restore the branch.

## Switching Render (owner action)
1. Create a *new* Render service from `pptvinstall/pptvinstall` (branch `main` after merge) with the same env vars; verify on its onrender URL.
2. Verify smoke checks and a real test booking.
3. Move the `pptvinstall.com` domain to the new service (DNS/domain change, owner only).
4. Keep the RC service paused, not deleted, as the rollback path.

## After cutover
- [ ] Verify pptvinstall.com on desktop, mobile and PWA.
- [ ] Owner explicitly approves archiving.
- [ ] Then archive (not delete): RC, `pptvinstall-backend`, `pptvinstall-booking-app`, both lead-radar repos.
