# Repository Inventory (2026-10-01)

Org enumeration (`pptv` filter) returned 16 repos. Only the first group is PPTVInstall-related; the rest (jwood-music-vault, wealthscope, paycalc, jwood-bot, winnerscut, jackpot, shadow-d-clone-memory, lotto-tool, MaddenStatTracker) are unrelated and untouched.

| Repo | State inspected | Disposition |
| --- | --- | --- |
| `PPTVInstall-Release-Candidate` | 2,059 files, HEAD `ecb11f4`. Production source. | **KEEP as live source until cutover.** Do not modify. Safe to archive after cutover + owner approval. |
| `pptvinstall` (canonical) | `main` @ `3bb84f3` (older app, 1,899 files). `consolidation/job-os` now carries the RC tree. Also has `feat/vault-email-relay` @ `c1ae559` (not reviewed; likely unrelated to the app). | **Canonical target.** |
| `pptvinstall-backend` | 4 files: 98-line Flask `app.py` (`/`, `/book`, `/cleanup`), `bookings.db` (SQLite, 1 table, 2 rows), devcontainer. Last push 2025-03-03. | **LEGACY.** Nothing RC lacks. The committed `bookings.db` may hold customer data. Safe to archive after cutover. |
| `pptvinstall-booking-app` | README + a Bolt project zip (32 files, Mar 2025). | **LEGACY.** Safe to archive after cutover. |
| `create-anything` (private) | 136 files, a generic web + mobile app; no PPTV/Picture Perfect references found. | **UNKNOWN / OWNER DECISION.** Not merged. |
| `pptv-lead-radar-claude` / `-codex` | Both empty (no commits). | **ARCHIVE-LATER**, after owner approval. |

## Feature / source-of-truth matrix

| Area | Canonical main (old) | RC (production) | Decision |
| --- | --- | --- | --- |
| Public site, services, city pages, SEO files, PWA service worker | older | newer (`city/`, `robots.txt`, `sitemap.xml`, `sw.js`) | REPLACE with RC |
| Pricing catalog | `pricing-data.ts` (older) | updated `pricing-data.ts` + `quote-calculator.ts` | REPLACE with RC |
| QuoteTool / quote page | none | `QuoteTool` + `quote-tool/*`, `pages/quote.tsx` | MIGRATE (done) |
| Travel pricing | none | `travel-pricing.ts` | MIGRATE (done) |
| AI quote service | none | `server/services/aiQuoteService.ts` (+ rate limit) | MIGRATE (done) |
| Booking flow | monolithic wizard | split `pages/booking/*`, `BookingEntryFlow` | REPLACE with RC |
| Booking confirm / manage | `booking-confirmation.tsx` | `Confirmation.tsx`, `ManageBooking.tsx` | REPLACE with RC |
| Calendar (ICS) | client Google Calendar service | `calendarService.ts`, token-protected download | REPLACE with RC |
| Booking management tokens | none | `management_token` uuid, `timingSafeEqual` check | MIGRATE (security) |
| CRM / customers | basic customers | `crm_contacts` table + consent fields | MIGRATE (done) |
| Admin + auth | older admin | `x-admin-token`, prod requires `ADMIN_API_TOKEN`; admin pricing editor | MIGRATE (done) |
| Email | 5 overlapping email services | single `server/email.ts` | REPLACE with RC |
| SMS | basic | Twilio, opt-out + STOP handling, `sms_*` tables, webhook validation | MIGRATE (done) |
| Push | present | `pushNotificationService.ts` | KEEP (RC) |
| Analytics / logging / monitoring | present | `analytics.ts`, `logger.ts`, `monitoring.ts`, error alerts | KEEP (RC) |
| Security middleware / rate limiting | partial | env validation, AI-quote rate limit, optimization middleware | KEEP (RC) |
| Scheduler | none | `schedulerService.ts` | MIGRATE (done) |
| Tests | ad-hoc root `test-*.js` scripts | same scripts + `scripts/smoke-check.js`; **no unit test suite** | GAP (see below) |
| CI/CD | none | `.github/workflows/ci.yml` (Node 22, secret hygiene) | MIGRATE (done) |
| Deploy | `render.yaml` | `render.yaml` (1-line diff) | KEEP (RC) |

## Files removed from the consolidation branch (all still in `main` history)
Legacy booking wizard components and backups under `client/src/components/ui/` (`booking-wizard`, `booking-wizard.tsx.backup`, `integrated-booking-wizard`, `booking-confirmation-modal`), unused UI primitives (`aspect-ratio`, `avatar`, `context-menu`, `hover-card`, `menubar`, `slider`), `client/src/lib/googleCalendarService.ts`, `client/src/pages/booking-confirmation.tsx`, `server/db.optimized.ts`, `server/routes/customer-bookings.ts`, `server/services/{availabilityService,emailService,emailService.new,emailService.optimized,enhancedEmailService,gmailEmailService}.ts`, `server/test-email.js`, `public/service-worker.js`, and three stale markdown summaries. None are imported by RC. Excluded RC noise: `.local/state/replit/agent/*` (830 binaries in canonical, 20 in RC), `.codacy/`, three `*.jpgthumb` files, committed `logs/`.

## Concerns to resolve (owner)
1. `server/data/bookings.json` (in both repos) contains a real name, phone number and street address. Confirm it is test data and whether the file should stay in the repo.
2. `pptvinstall-backend/bookings.db` is committed customer-shaped data in a public repo.
3. `verify-production-readiness.js` imports `node-fetch`, which is not a dependency (fails in RC too).
4. `feat/vault-email-relay` in canonical was not reviewed.
