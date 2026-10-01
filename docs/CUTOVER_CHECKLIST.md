# Cutover Checklist (NOT executed; owner approval required at every gated step)

Goal: make `pptvinstall/pptvinstall` the production source. Nothing below has been done.

## Before cutover
- [ ] Owner reviews and approves PR #2 content (RC import + legacy removal + docs).
- [ ] Confirm in Render which commit is live and that it is still `ecb11f4`. If RC `main` advanced, re-sync: diff RC `main` against the import commit `0fd8aa1` and port the delta first.
- [ ] Decide the two PII questions in `REPOSITORY_INVENTORY.md` (`server/data/bookings.json`, legacy `bookings.db`).
- [ ] Fix or remove `verify-production-readiness.js` (missing `node-fetch`).
- [ ] Add a real automated test suite for pricing, booking-token, consent and admin auth (currently only the smoke script exists).
- [ ] Run the full flow against a staging Render service + staging Neon branch: quote, booking, confirmation email, calendar download with token, manage booking, admin, SMS consent/STOP, push.

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
