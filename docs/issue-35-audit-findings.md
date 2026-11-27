# Issue #35 — Phase 1 Audit Findings: Quote Intelligence + Discount of the Day Integration

**Audit pass owner:** Luna (Muse) — ChatGPT should not duplicate this audit; coordinate through Issue #35.
**Date:** 2026-11-26 (ET) · **Branch:** `luna/issue-35-quote-intelligence-audit` · **Base HEAD audited:** `c73e361caea1e56160640ceb25b436326fc18945`
**Scope of this pass:** documentation only. No pricing logic, config values, or production code were changed. Nothing was deployed. Production pricing mode was not changed.

## Method and evidence limits (read first)

- Local clone failed both ways, so the audit was performed read-only through the GitHub connector (`get_file_contents`, `search_code`, `list_commits`) against base HEAD above.
  - SSH: `kex_exchange_identification: read: Connection reset by peer` / `Connection reset by 198.19.0.1 port 3128`.
  - HTTPS: exited 0 but produced an empty repository (no commits, no files) — an unauthenticated private-repo clone through the proxy; no usable checkout.
- **Because no checkout exists, `npm run check`, `npm test`, and `npm run build` were NOT run.** No test results are claimed. Existing test files were read and are cited where their assertions encode expected behavior; "covered by an existing test" means the assertion exists in the repo, not that it was executed in this pass.
- The deployed (production) pricing mode **cannot be verified from the repository**: the mode lives in the database-stored active JobOS config, not in code or env (see F-08). It is reported as **UNVERIFIED** below.

## Repo file map (audited areas)

| Area | Key files | Role |
| --- | --- | --- |
| Public quote page | `client/src/pages/quote.tsx` | Renders `QuoteTool` + `QuoteEducation`; "Standard TV mounting starts at $100" |
| Quote UI | `client/src/components/ui/QuoteTool.tsx`; `client/src/components/ui/quote-tool/{QuoteStepForm,QuoteResults,QuoteActions,QuotePackages,QuoteComponents}.tsx`; `quote-tool/useQuoteState.ts`; `quote-tool/shared.ts` | Multi-step form → results → contact/booking. `shared.ts` holds `buildAugmentedQuote` (standalone services) and `normalizeQuoteForDisplayTotals` (adds browser travel fee into the displayed total) |
| Live catalog calculator | `client/src/lib/quote-calculator.ts` | **The price customers see today.** Per-TV loop over `pricingData`; travel from the ZIP tier table |
| Catalog data | `client/src/data/pricing-data.ts` | All fixed catalog prices (mounting, mounts, concealment, smart home, sound, moves, standalone services); discounts all `0` except the move bundle |
| Server price bridge | `client/src/lib/engine-quote.ts` | Calls `GET /api/quote/price-source`, `POST /api/quote/price`; fails safe to the catalog price on any error |
| AI quote (parallel path) | `server/services/aiQuoteService.ts`; `server/routes.ts` (`/api/ai-quote`, `/api/ai-quote/config`); QuoteTool text/voice modes | Anthropic-generated quote JSON, prompt-constrained to `pricingData`; Turnstile + rate-limit gated |
| Canonical engine (V2) | `shared/pricing/engine.ts`, `config.ts`, `quote.ts`, `publicQuote.ts`, `legacy.ts`, `premium.ts`, `scope.ts`, `customerView.ts`, `packages.ts`, `formState.ts`, `work.ts`, `workEngine.ts`, `workConfig.ts`, `travel.ts`, `route.ts`, `labor.ts`, `materials.ts`, `schedule.ts`, `money.ts`, `hash.ts` | Deterministic integer-cents pricing: scope → work model → labor/materials/travel → floor/recommended → capped complexity premium → quote composition + immutable snapshot |
| JobOS intake | `shared/jobos/intake.ts`, `unifiedIntake.ts`, `workIntake.ts` | AI extracts structured scope only; price-like keys fail validation; owner confirms before a quote exists |
| JobOS server | `server/jobos/service.ts`, `routes.ts`, `dbStore.ts`, `memoryStore.ts` | Versioned config storage, `publicPrice`, shadow samples, jobs/invoices/documents; admin API behind the admin token |
| Admin config | `client/src/pages/jobos/PricingConfigPage.tsx` (routed in `client/src/main.tsx`); `client/src/pages/admin/pricing-editor.tsx` (see F-11) | JobOS page edits the versioned economics config incl. `pricingMode`; switching to dynamic requires typing `change customer prices`, enforced server-side |
| Booking | `server/routes.ts` (`POST /api/bookings`, `POST /api/quote-request`); `client/src/pages/booking.tsx`; QuoteTool saves the pending quote to `localStorage` and routes to `/booking` | Website booking is a separate record from JobOS quotes (see F-12) |
| Dead / legacy client pricing | `client/src/lib/pricing.ts`, `client/src/lib/use-pricing.ts`, `client/src/components/ui/service-wizard.tsx`, `client/src/components/ui/price-calculator.tsx`, `client/src/lib/travel-pricing.ts` (live: also used by the calculator) | See F-06/F-07 |
| Canonical docs | `docs/MARKETING_RULES.md` (claims), `docs/PRICING_RULES.md` (engine rules/modes, owner-approved 2026-10-02), `docs/JOB_OS.md`, `docs/PRODUCTION_BASELINE.md` | Source-of-truth docs |
| Tests (exist, not executed this pass) | `tests/pricing/` (7 files: business-rules, engine, invariants, quote, quote-calculator.golden, work, helpers), `tests/jobos/` (19 files incl. shadow, shadow-filters, unified-intake, api), `tests/site/` (9 files) | `npm test` = `test:pricing && test:jobos && test:site` (`tsx --test`); `npm run check` = `tsc`; `npm run build` = vite + esbuild (from `package.json`) |

## How pricing actually flows today (CONFIRMED from code)

1. Browser computes the **catalog price instantly** with `calculateQuote` + `buildAugmentedQuote` (`quote-calculator.ts`, `quote-tool/shared.ts`). This is the customer price in `legacy` and `shadow` modes.
2. On review, the browser calls `POST /api/quote/price` (`server/jobos/service.ts` `publicPrice`):
   - `legacy`/`shadow`: server returns the **same catalog total** (recomputed server-side via `catalogPublicQuote` in `shared/pricing/publicQuote.ts`); in `shadow`, a review-stage request also stores an owner-only comparison sample.
   - `dynamic`: server returns the engine view (`composeQuote` in `shared/pricing/quote.ts`) or a "review" response when a gate fires.
   - Any error/404 (including JobOS disabled) leaves the catalog price on screen.
3. The mode comes from the **active stored config** (`JobOsService.getActiveConfig`); a first boot seeds `DEFAULT_ECONOMICS_CONFIG` with `pricingMode: "legacy"`, `calibration: "uncalibrated-default"` (`shared/pricing/config.ts`).
4. JobOS-gated routes 404 in production unless `JOB_OS_ENABLED=true` (`server/jobos/routes.ts` `jobOsEnabled`); `render.yaml` does not set that variable.

## Findings

Severity: **HIGH** = customer-facing wrong price/claim or a failed acceptance item on the live path. **MEDIUM** = divergence, latent risk, or cross-channel inconsistency. **LOW** = hygiene.

### F-01 — HIGH — Fireplace catalog copy contradicts the owner's drywall-only policy (CONFIRMED)
`client/src/data/pricing-data.ts`, `tvMounting.fireplace.description`: *"Mounting a TV above a fireplace (non-drywall)."* Owner policy (Master Rules v2): the $200 fireplace starting price is **drywall only**. The $200 amount itself is applied regardless of wall type by the calculator (see F-04); only the description is wrong, but it is customer-facing catalog copy and it also feeds the AI quote prompt and the legacy adapter.

### F-02 — HIGH — FAQ promises same-day booking; canonical marketing rules forbid it (CONFIRMED)
`client/src/pages/faq.tsx` line 13: *"Same-day booking is available with 2 hours notice."* `docs/MARKETING_RULES.md`: *"Do not promise same-day service."* Direct contradiction on a public page.

### F-03 — HIGH — No >85" gate on the public quote path; a 98" TV prices as an ordinary $100 install (CONFIRMED)
- The public form has no exact-size, model, weight, or VESA fields: `TVConfig.size` is only `"32-55" | "56+"` (`client/src/lib/quote-calculator.ts`); the server schema mirrors it (`shared/pricing/publicQuote.ts` `tvSchema` — no `inches`).
- The engine scope *can* carry `inches` (`shared/pricing/scope.ts` `tvScopeSchema`), and the engine reacts at ≥86" with an uncertainty + weight question and at ≥80" with a heavy-equipment premium (`shared/pricing/engine.ts`, `shared/pricing/premium.ts`) — but that only yields `estimate_with_confirmation`, **not** `manual_review_required`, and the public path never supplies `inches` at all.
- Result: the acceptance item "98-inch TV with no model routes to review" **fails** on the live path.

### F-04 — MEDIUM/HIGH — Brick/stone fireplace is charged $200, not $200 + $50 (CONFIRMED; needs owner decision)
`client/src/lib/quote-calculator.ts`: the non-drywall add-on is applied only when `tv.wallType === "brick" && tv.location !== "fireplace"`. A brick fireplace therefore totals $200. `server/services/aiQuoteService.ts` prompt line ~61 reinforces this ("Do not add a separate non-drywall or brick/masonry surcharge to the same fireplace TV"). Owner baseline as written: fireplace from $200 **on drywall**, brick/stone **+$50** → expected $250. The code may reflect an intentional "fireplace price is complete" rule, but as written it contradicts the baseline. **Owner must rule** (see sign-off S-2). (High-rise fireplace does get +$25: the highrise add-on has no fireplace exclusion → $225.)

### F-05 — MEDIUM — The $100 house minimum is not enforced on the live catalog path (CONFIRMED, documented in-repo)
Standalone removal-only quote: `buildAugmentedQuote` (`quote-tool/shared.ts`) prices removal at $50/TV with no floor, so a customer can be quoted a $50 total. The engine flags sub-$100 catalog totals to the owner but does not change them in legacy/shadow — `docs/PRICING_RULES.md` documents this as intentional. It still fails the issue acceptance item "$100 minimum for standalone add-on." The shared-trip variant works as intended: an unmount-before-install line is $50 when a TV install is on the same quote.

### F-06 — MEDIUM — There is no single canonical pricing path across channels yet (CONFIRMED)
Four distinct pricing implementations exist:
1. **Browser catalog** (`quote-calculator.ts`) — authoritative for customers today.
2. **Server Engine V2** (`shared/pricing/*`) — deterministic and canonical in design; prices customers only in `dynamic` mode; otherwise shadow-compares.
3. **AI quote** (`server/services/aiQuoteService.ts`) — an LLM returns the quote JSON (totals included), constrained by a prompt built from `pricingData`. It is **not deterministic**, so "same scope = same price across channels" cannot be guaranteed between the AI text/voice entry and the form entry. (JobOS *intake* AI, by contrast, correctly never prices.)
4. **Dead legacy client code** (`client/src/lib/pricing.ts`, `use-pricing.ts`, `service-wizard.tsx`, `price-calculator.tsx`) — see F-07.

### F-07 — MEDIUM (latent) — The `use-pricing.ts` `.some()` aggregation is NOT reachable from the public quote path (CONFIRMED)
- Code search across the repo: `usePricing` is referenced **only inside `client/src/lib/use-pricing.ts` itself**; nothing imports it. `calculatePrice` (`client/src/lib/pricing.ts`) is referenced only by `pricing.ts` and `use-pricing.ts`.
- The hook is also internally incompatible with its target: it builds `ServiceOptions` with `tvCount`, `tvMountSurface`, `isFireplace`, … but `calculatePrice` keys TV base pricing off `options.tvMountType`, which the hook never sets — TV base price would compute as $0.
- If it ever were wired in, the `.some()` aggregation (lines 62–64, 73–74) flattens per-TV facts to job level: *any* fireplace TV makes the whole job "fireplace," *any* masonry TV makes the whole job non-drywall — mixed jobs would be mispriced.
- **Conclusion:** no live mispricing from this path today; it is dead, broken code that should be deleted (sign-off S-5), not repaired.

### F-08 — MEDIUM — Deployed pricing mode is UNVERIFIED; JobOS may be off in production (NEEDS VERIFICATION)
Mode = active DB-stored config (seed default `legacy`). No env var sets it; `render.yaml` sets neither `JOB_OS_ENABLED` nor a pricing mode, and JobOS routes default **off** when `NODE_ENV=production` unless `JOB_OS_ENABLED=true`. `docs/PRICING_RULES.md` states production stays on `legacy`/`shadow` until the owner confirms dynamic. Verifying the real mode requires reading the production admin config endpoint or DB — not done in this pass, and not guessable from code.

### F-09 — MEDIUM — Two travel systems can disagree (CONFIRMED divergence in design; display behavior verified)
- Browser: ZIP tier table (`client/src/lib/travel-pricing.ts`) computes a fuel-only fee; `normalizeQuoteForDisplayTotals` (`quote-tool/shared.ts` lines ~158–161) adds it to the displayed total (golden test: ZIP 30337 → $6 fee, calculator total stays $100 until display normalization).
- Engine: route resolution owner-input → provider (**none configured**) → ZIP reference table → flagged unknown-route assumption (20 mi / 35 min defaults), and `travel.customerFeePolicy` defaults to `"none"` — i.e., in `dynamic` mode the engine would charge **no** customer travel fee where the browser catalog charges the tier fee. Harmless while the catalog is authoritative; must be reconciled before any dynamic cutover (sign-off S-6).

### F-10 — MEDIUM — Discount of the Day has no website integration at all (CONFIRMED absence in audited code)
No deals data model, route, card component, expiry logic, or quote-CTA handoff exists in the audited client/server code. Full-text search surfaced only generic "discount" copy (catalog discounts, seasonal theme, city pages). Phase 2 is greenfield on top of existing routes/components — it must reuse the existing estimator CTA and must not invent installation prices on deal cards (per the issue).

### F-11 — MEDIUM — Admin pricing surfaces are split; catalog prices are compile-time constants (CONFIRMED)
- `client/src/pages/jobos/PricingConfigPage.tsx` is the routed admin page (JobOS economics config, versioned, audited, rollback-capable).
- `client/src/pages/admin/pricing-editor.tsx` edits `pricingData` in local component state only; repo search found **no route or import referencing it**, and it persists nothing.
- Live catalog prices (`pricing-data.ts`) can only change via a code change + deploy. No admin UI changes what the public catalog charges today.

### F-12 — MEDIUM — Website booking does not carry the JobOS quote snapshot (CONFIRMED for the website path; booking payload NEEDS VERIFICATION)
JobOS quotes have an immutable snapshot (scope, context, config version, pricing mode, engine version, input/snapshot hashes — `shared/pricing/quote.ts` `snapshotQuote`). The public website flow instead: QuoteTool → `localStorage` pending quote → `/booking` (`POST /api/bookings`), and follow-ups go through `POST /api/quote-request` with a total + flattened items. No JobOS snapshot is attached on that path, so the acceptance item "booking and estimate carry the same approved quote snapshot" is only satisfied inside JobOS, not for website bookings. The exact fields the booking page submits from the pending quote were not fully traced in this pass (NEEDS VERIFICATION).

### F-13 — LOW/MEDIUM — Complexity is counted twice in the engine recommendation, by design (NEEDS OWNER REVIEW)
The same difficulty raises both labor minutes (e.g., fireplace +25 min, brick +25 min in `DEFAULT_ECONOMICS_CONFIG`) **and** the capped risk premium (fireplace 4%, masonry 3%, …; cap 15%, recommendation only, never the floor — `shared/pricing/premium.ts`, `docs/PRICING_RULES.md`). This is documented design, but the issue's Phase 1 item 4 says to avoid double-counting the same difficulty in base labor, premium, and surcharge — it deserves an explicit owner ruling during calibration (sign-off S-7).

### F-14 — LOW — Automatic $100 move bundle discount vs "no automatic blanket discounts" (CONFIRMED)
`pricing-data.ts` `moveProject.bundleDiscount`: $100 off when a move project has ≥4 new-TV installs and previous-home work. It is a specific catalog rule, not a blanket discount, and the golden tests protect "no automatic bundle discount" for ordinary multi-TV jobs — but the baseline wording should be reconciled with this rule (sign-off S-8). Related hygiene: `additionalTvDiscountUnits` in `quote-calculator.ts` is counted and never used.

### F-15 — LOW — Phase 1 item 2 (natural-language entry) is partially built already (CONFIRMED)
QuoteTool already has text/voice modes calling `/api/ai-quote` with Turnstile + rate limiting, and JobOS intake already does validated scope extraction with evidence + owner confirmation. What is missing is convergence: the public AI entry returns LLM-priced JSON (F-06) instead of reducing to structured scope and pricing deterministically through the catalog/engine.

## Acceptance checklist (from Issue #35) — code-inspection results

Legend: **PASS** = code does this today · **FAIL** = code contradicts it · **PARTIAL** = some paths only · **NOT TESTABLE** = feature does not exist / requires a run. "Test evidence" cites existing test files whose assertions encode the expectation — **none were executed in this pass** (see Method).

| # | Acceptance item | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Standard 1 TV = $100 | PASS | `quote-calculator.ts` per-TV standard price; golden test "basic drywall install … stays $100" |
| 2 | Two standard TVs = $200 baseline | PASS | Per-TV loop, discounts are 0; golden test "two basic TVs remain $200 with no automatic bundle discount" |
| 3 | Standard TV + feasible outlet = $200 | PASS | Concealment standard +$100 (non-fireplace); golden test "standard drywall + clean-cord/outlet stays $200" |
| 4 | Drywall fireplace starts $200; fireplace concealment reviewed | PASS (copy defect F-01 aside) | Fireplace base $200; concealment on a fireplace TV is a $0 "assessment required" line + flag; golden fireplace test |
| 5 | Mixed regular/fireplace jobs independently scoped | PASS on live paths | Catalog prices per-TV (see shadow table row 5); AI prompt explicitly scopes per-TV. FAIL only in the dead `use-pricing` path (F-07, unreachable) |
| 6 | 98-inch TV with no model routes to review | **FAIL** | F-03 — no size/model fields on the public path; engine gives estimate-with-confirmation at best, and only when `inches` is supplied |
| 7 | Customer hardware not charged twice | PASS | Mount price added only when `!tv.hasMount && tv.mountType`; engine `mountSource: "customer"` adds no mount charge |
| 8 | Unrelated extras not silently added | PASS | Every priced line traces to an explicit form selection; standalone services default to 0/false |
| 9 | Multi-address move properly grouped | PASS | `moveProject` group: unmounts + mount removal + rack teardown + $100 two-location coordination line (but see F-14 bundle) |
| 10 | Unsupported electrical request never auto-approved | PASS | Engine/work model: new circuit = `not_supported` (business-rules test "a new circuit is not supported"); catalog offers no new-circuit option |
| 11 | $100 minimum standalone add-on; shared-trip add-on handled | **FAIL / PASS** | Standalone removal-only can total $50 (F-05); shared-trip unmount-before-install is a $50 line on an install quote, as intended |
| 12 | Incomplete address has clear travel assumptions | PASS | No ZIP → no fee + review wording; unknown ZIP → `out_of_range` flag, still serviceable (golden tests); engine unknown-route assumption is flagged |
| 13 | Price identical across entry channels for same confirmed scope/config | **FAIL (not guaranteed)** | Catalog vs server catalog agree in legacy/shadow; AI-quote path is LLM-generated (F-06); dynamic mode would change totals by design |
| 14 | No duplicate complexity charges | PARTIAL | Catalog never stacks brick on fireplace (but undercharges — F-04); engine stacks minutes + premium by design (F-13) |
| 15 | Booking and estimate carry the same approved quote snapshot | PARTIAL | True inside JobOS (`snapshotQuote`); website booking carries a localStorage quote summary instead (F-12) |
| 16 | Expired deals visibly expire | NOT TESTABLE | No deals feature exists (F-10) |
| 17 | Local stock unknown labeled unknown | NOT TESTABLE | No deals feature exists (F-10) |
| 18 | `npm run check` / `npm test` / `npm run build` | **NOT RUN** | No local checkout (clone failed both routes — see Method). Scripts confirmed present in `package.json` |
| 19 | Public mobile quote flow + booking verified without real submissions | NOT RUN | Requires a running build/browser; blocked by the same checkout failure |

## Shadow quote comparison (computed from CURRENT code/config only — no pricing changes)

"Before" = what the customer is quoted today (browser catalog, legacy/shadow behavior). "Shadow" = what the deterministic engine's legacy adapter computes for the same scope (`computeLegacyPrice` → the same `calculateQuote`), plus the engine's status behavior. Exact engine *recommended* cents were **not** computed: they require executing the engine, which needs the full checkout (blocked — see Method). Assumptions for all rows: customer-supplied mount, drywall unless stated, no ZIP entered (travel fee $0 in the calculator total; a known non-local ZIP adds the browser fuel-tier fee at display time).

| Scenario | Before — catalog total today | Shadow — engine legacy adapter | Engine status / notes | Meets owner baseline? |
| --- | --- | --- | --- | --- |
| Standard 1 TV | **$100** | $100 | `priced`; standard complexity, no premium | Yes |
| Two standard TVs | **$200** (discount $0) | $200 | `priced`; 2nd TV at 0.85 time efficiency internally, customer price unchanged | Yes |
| Standard TV + behind-TV outlet | **$200** ($100 + $100) | $200 | `priced` with a circuit-confirmation question (existing circuit only) | Yes |
| Drywall fireplace | **$200** | $200 | Fireplace premium factor applies to the *recommendation only*; concealment, if requested, is a $0 assessment line | Yes on price; **No on copy** (F-01 says "non-drywall") |
| Mixed: 1 standard + 1 fireplace | **$300** ($100 + $200, scoped per TV) | $300 | `priced`; no cross-contamination in the catalog or legacy adapter | Yes |
| Brick fireplace (extra row, from F-04) | **$200** | $200 | Brick add-on is skipped for fireplace TVs in both catalog and adapter | **No** — baseline reads $200 drywall + $50 brick = $250 (owner to rule, S-2) |
| 98-inch TV, no model | **$100** (size band "56+", standard) | $100 | Public path: no `inches`, no review. Internal scope path with `inches: 98`: uncertainty + weight question → `estimate_with_confirmation`, heavy-equipment premium on recommendation — still not manual review | **No** (F-03) |

## Proposed changes requiring owner sign-off (exact list — nothing here was done)

- **S-1.** Fix `pricing-data.ts` fireplace description to drywall-only wording (e.g., "Mounting a TV above a fireplace (drywall). Brick/stone fireplace quoted with the +$50 surface add-on" — final wording depends on S-2). Copy-only change; no price change.
- **S-2.** Rule on brick/stone fireplace pricing: (a) keep $200 all-in (update the baseline/docs to say the fireplace price is complete), or (b) charge $250 (change the calculator's brick-exclusion for fireplace TVs **and** the AI prompt rule). This changes customer prices either way it is resolved in docs vs code — owner decision required.
- **S-3.** Fix `faq.tsx` same-day wording to match `docs/MARKETING_RULES.md` (no same-day promise; "may be possible when the schedule allows" style). Copy-only.
- **S-4.** Add an oversize gate to the public quote path: exact size (and model/weight/VESA prompt) for TVs above 85", routing to review instead of an instant $100 — implementation choice (form fields + `inches` pass-through to the engine, and/or a catalog "custom quote" line for 86"+) needs owner approval because it changes the public flow.
- **S-5.** Delete the dead legacy pricing stack (`client/src/lib/pricing.ts`, `client/src/lib/use-pricing.ts`, and — after a usage check — `service-wizard.tsx` / `price-calculator.tsx`), or explicitly quarantine it. No behavior change if unreachable status is re-verified at implementation time.
- **S-6.** Reconcile travel before any dynamic cutover: pick one customer travel policy (browser fuel-tier fee vs engine `customerFeePolicy`) so totals cannot differ by channel.
- **S-7.** Rule on engine double-counting (F-13): keep minutes + premium stacking as the calibrated design, or drop the premium factors that duplicate time already counted — to be decided with calibrated shadow examples, per `docs/PRICING_RULES.md`.
- **S-8.** Reconcile the $100 move bundle discount (≥4 TVs + move) with the "no automatic blanket discounts" baseline: keep as a named exception, or remove.
- **S-9.** Enforce the $100 minimum on standalone-only catalog quotes (e.g., removal-only) — a customer-price change in legacy mode; owner must approve the exact behavior (top-up line vs "minimum service charge" wording).
- **S-10.** Converge the AI quote entry onto deterministic pricing: AI extracts scope (as JobOS intake already does), the catalog/engine prices it. Removes the LLM-priced JSON path. Behavior/UX change — owner approval required.
- **S-11.** Attach the JobOS quote snapshot (or an equivalent immutable quote record) to website bookings so booking + estimate carry the same approved quote (F-12).
- **S-12.** Verify and record the production pricing mode + `JOB_OS_ENABLED` state (read the production admin config) and note it in `docs/PRODUCTION_BASELINE.md`. Read-only, but needs owner access/approval.
- **S-13.** Phase 2 (Discount of the Day website integration): build the deal card/detail + estimator CTA on existing routes with verified price/stock/expiry fields and "stock unknown" labeling; no auto-publishing, no spend. Design + build require owner sign-off per the issue.
- **Explicitly NOT proposed without separate approval:** enabling `shadow` or `dynamic` mode in production, changing any catalog price, or changing accepted quotes. (Not done in this pass.)

## Test execution status

- `npm run check` — **NOT RUN** (no checkout).
- `npm test` — **NOT RUN** (no checkout). Suite composition confirmed from `package.json`: `test:pricing` (7 files), `test:jobos` (19 files), `test:site` (9 files) via `tsx --test`.
- `npm run build` — **NOT RUN** (no checkout).
- Blocker: git clone of the private repo failed via SSH (connection reset through the proxy) and via unauthenticated HTTPS (empty repo). Next step: provide an authenticated clone path (e.g., approve a connector-based export or run the suite where a checkout already exists) and re-run this section.
