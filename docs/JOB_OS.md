# Job OS V1 walkthrough

Owner tools (mobile-first, admin access code = `ADMIN_API_TOKEN`, not linked from public nav):
- `/admin/job-builder`: 10 steps (customer, TVs, wall, mount, power, wires, location, schedule, extras, recommendation). Optional message paste fills the form (Quick fill needs no AI). Live sticky bar shows quote / recommended / floor. Recommendation step explains the price, warns below floor, offers a discount or set-price adjustment with a reason, then saves job + quote.
- `/admin/jobs`: list and detail; send quote (copy link), record actuals, profitability (labeled estimate vs actual), create/send/void invoice, record payment.
- `/admin/pricing-config`: view/edit economics config, version history, rollback; every change is audited.

Customer:
- Public quote tool shows Essential / Clean / Complete packages from the same engine; no fake strike-through prices.
- `/q/:token`: customer-safe quote view and accept (rate limited). No internal numbers.

API: all `/api/admin/job-os/*` routes sit behind the existing `x-admin-token` middleware (23 routes tested for 401). Public: `GET /api/quotes/:token`, `POST /api/quotes/:token/accept`.

Flags: `JOB_OS_ENABLED` (default on outside production, must be `true` in production), `JOBOS_STORE=memory` for a no-DB demo.

Calibration: the owner records actuals per job; `/intelligence` shows medians/percentiles per comparable scope and suggests config changes the owner must apply by hand.
