# Issue #35 — Implementation Notes (Change Set A: pricing gates + deterministic convergence)

Branch: `luna/issue-35-pricing-implementation` · Status: **review only — not deployed, pricing mode unchanged (legacy/shadow/dynamic untouched), no accepted quotes repriced.**

This document records exactly what the implementation pass changed, what it deliberately did not change, and what remains for owner approval. Owner rulings implemented are from Issue #35 comments 7207840177 / 7207917704.

## What changed

### S-1 — Fireplace catalog copy (copy only)
- `client/src/data/pricing-data.ts`: fireplace description no longer says "(non-drywall)". It now states the $200 fireplace price is for drywall, and that brick/stone fireplaces also start at $200 with the final price confirmed after a photo review. The standard-mount description now notes 86"+ TVs are custom-quoted.

### S-3 — FAQ same-day wording (copy only)
- `client/src/pages/faq.tsx`: removed "Same-day booking is available with 2 hours notice." Replaced with conditional language aligned to `docs/MARKETING_RULES.md` ("sometimes available when the schedule allows, never guaranteed") plus the canonical scheduling hours (weekdays after 5:30 PM, weekends generally 11 AM–7 PM).
- The unmounting FAQ answer now states the $100 per-visit minimum so it cannot contradict S-9.
- **Off-repo flag (not changed here):** the public Linktree still says "Same-Day Installs" (owner note in comment 7207720422). It needs the same conditional-availability correction wherever Linktree is edited.

### S-2 — Masonry fireplace: $200 start + photo review (no universal $250)
- `client/src/lib/quote-calculator.ts`: a brick/stone fireplace TV keeps the $200 fireplace starting price (the previous silent behaviour is now explicit policy). The quote is marked `requiresReview` with a customer-facing reason and a flag asking for photos of the fireplace/wall; the final price is confirmed after that photo review. Drywall fireplaces remain a firm $200 with no gate. Standard-wall brick keeps the established +$50 surface add-on.
- The form shows a "Brick / stone fireplace — photo review" alert when fireplace + brick are selected (`QuoteStepForm.tsx`), and the review screen lists the reason (`QuoteResults.tsx`).
- The AI prompt (`server/services/aiQuoteService.ts`) was aligned: fireplace starts at $200 on any surface, no stacked surcharge, brick/stone is a starting price with a photo-review flag.

### S-4 — Oversize gate: 86"+ routes to custom-quote review
- `TVConfig` gains optional `exactInches`, `model`, `weightLbs`, `vesaPattern`. The public form shows exact-size and model inputs when the 56"+ band is selected, with an inline custom-quote notice at 86"+.
- Calculator: an oversize TV (exactInches ≥ 86) produces a $0 "custom quote, review required" line — **no instant $100 fallback** — and mount/wire lines for that TV are left to the review (compatibility is the point of the review). Unmounting an existing TV on the same config stays standard priced work. 85" prices normally (verified by test).
- Server: `publicQuote` tv schema accepts the new fields; `publicRequestToScope` carries `inches` into the engine scope (guarded so a band-disagreeing value is dropped instead of throwing). In `dynamic` mode, `publicPrice` now returns `status: "review"` with no total for any scope containing an 86"+ TV (previously it could surface as estimate-with-confirmation). Catalog responses gain `requiresReview`/`reviewReasons` **only when a gate fires**, so ordinary responses keep their established shape.
- If exact inches are never supplied, the path is unchanged — closing that last gap needs a mandatory size step for the 56"+ band, which is a UX change left for owner approval (see "Remaining").

### S-9 — $100 minimum per house/visit
- `buildAugmentedQuote` (the function every public catalog quote flows through, browser and server) now enforces the $100 visit minimum on the final priced total: a priced total in (0, $100) gets a transparent "Per-visit minimum adjustment" line (e.g. standalone removal $50 → $100). Jobs already ≥ $100 — including ~$50 shared-visit add-ons — are untouched, and $0 custom-quote-only requests get no invented price. New calculations only; accepted quotes are never repriced.

### S-10 — Deterministic pricing convergence for the AI entry (prepared, safest minimal step)
- The AI prompt now also returns a `scope` object: a factual extraction of the job in the public quote schema (no prices), following the JobOS intake principle — AI extracts scope, never sets price.
- `POST /api/ai-quote` runs `applyDeterministicPricing` on the AI response: when the scope validates against `publicQuoteRequestSchema`, the customer-facing groups/subtotal/discount/total are **replaced** with the deterministic catalog calculation for that scope (including the S-2/S-4/S-9 gates). The AI's summary, follow-up and flags are kept and merged. The response is marked `pricedBy: "deterministic"`.
- **What remains:** if the AI returns no parseable scope, the route falls back to the previous behaviour (raw AI quote, still passed through the client's existing correction helpers). Fully removing that fallback — e.g. forcing the guided form when scope extraction fails — is a UX/behaviour decision for the owner. Also, the client-side `normalizeDiscountPresentation` still recomputes multi-TV/outlet discounts (both are $0 in the catalog) and would drop the move-bundle discount on the AI path; move projects are a form-first flow today.

### S-5 — Dead code deletion (one file)
- Deleted `client/src/lib/use-pricing.ts`. Verified zero references repo-wide (client, server, shared, tests, scripts) both via GitHub code search and a local grep of the full checkout; the Phase 1 audit showed it was also internally broken (never set `tvMountType`, so TV base would compute $0). `client/src/lib/pricing.ts` was **not** deleted: unlike `use-pricing.ts`, it is still imported by live surfaces (`customer-portal.tsx`, `components/admin/booking-archives.tsx`, `service-selection-grid.tsx`, the archived booking wizard, and the legacy `price-calculator`/`service-wizard` components), so removing it is a separate migration, deferred per the owner's "quarantine/defer deletion until tests verify" instruction. CI on this PR is the verification for the one deletion.

## Deliberately NOT done in this change set
- **S-6 travel reconciliation** — proposal only (owner decision lists it as prepare/proposal). The browser fuel-tier fee vs engine `customerFeePolicy: "none"` divergence is unchanged; it must be resolved before any dynamic cutover, not inside this PR.
- **S-7 premium/minutes double-count** — unchanged; needs the owner's calibration ruling with real job data.
- **S-8 move-bundle discount** — behaviour preserved exactly, per the owner decision ("preserve existing move-bundle behavior until owner reviews cost evidence").
- **S-11 booking snapshot** — not implemented here; website bookings still carry the localStorage quote summary. The JobOS snapshot exists server-side; attaching it to website bookings is a separate change set.
- **S-12 production mode verification** — read-only and requires authorized production access; not attempted from this environment.
- No pricing-mode switch, no deploy, no catalog price changes beyond the owner-ruled gates above.

## Acceptance scenario results (from the new tests in this PR)
See `tests/pricing/issue-35-gates.test.ts` and `tests/jobos/issue-35-ai-deterministic.test.ts`. Highlights: brick fireplace $200 + review; 98" no-model → $0 priced, review required; 85" → $100 normal; standalone removal → $100 floor; shared-visit unmount add-on stays $50 on a $100 job ($150 total); mixed standard + fireplace = $300 per-TV; two TVs $200; TV + outlet $200; AI-invented totals ($999/$250/$50) replaced by deterministic $100/$200/$100 for the same extracted scopes.

## Rollback
Revert this PR / delete the branch. Nothing is deployed, no data or config was migrated, and the pricing mode was not touched, so rollback is a pure code revert with no customer impact.
