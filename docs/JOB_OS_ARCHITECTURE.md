# Job OS and Pricing Engine V2 (implemented, staging-ready)

Lifecycle: `lead -> scope -> quote -> schedule -> job -> invoice -> payment -> actuals -> pricing intelligence`.
See `docs/JOB_OS.md` for the walkthrough, `docs/AI_INTAKE.md`, `docs/STAGING.md`, `docs/SECURITY_REVIEW.md`.

Principle: **AI is not the calculator.** All money math is deterministic TypeScript in integer cents (`shared/pricing`, `shared/jobos`). AI only turns messy text into a validated, owner-confirmed scope.

## Code map
- `shared/pricing/`: pure `priceScope(scope, context, config)`; economics config + validation + diff; travel/schedule/materials/labor models; `legacy.ts` adapter to the untouched catalog calculator; `quote.ts` (immutable quote snapshots, owner adjustment); `customerView.ts` (whitelist + runtime leak guard); `packages.ts` (Essential/Clean/Complete); `formState.ts` (public quote form bridge).
- `shared/jobos/`: actuals/profitability, invoice + payment rules, pricing intelligence, AI intake contract.
- `shared/jobos-schema.ts`: 13 additive tables, no foreign keys into existing tables.
- `server/jobos/`: store interface (memory + Drizzle/Postgres), service, routes, rate limits.
- `server/outbound.ts`: staging-safe outbound suppression.
- `client/src/pages/jobos/*`, `client/src/pages/CustomerQuote.tsx`: owner mobile tools and customer quote page.

## Pricing modes
- `legacy` (default): the customer sees today's catalog price. Engine output is shown to the owner only (floor, recommended, margin, warnings).
- `dynamic`: the customer sees the engine recommendation. Off until the owner approves and calibrates config.
- Historical baseline ($100 install, +$100 outlet, +$100 fireplace, +$50 brick/stone, +$25 high-rise/steel, $50 unmount/remount) stays reference data; golden tests still pass untouched.

## Engine model
cost to serve = owner labor + helper + materials + travel (fuel + vehicle + owner time) + overhead + schedule cost.
Floor = max(minimum ticket, cost / (1 - min margin), out-of-pocket + minimum trip economics). Recommended targets desired margin and is never below floor. Banding/rounding/stabilization keep quotes from jittering. All config defaults are labeled `uncalibrated-default`.

## Data model (additive)
pricing_configs, pricing_config_events, jobs, scope_items, quotes, quote_versions, travel_estimates, material_estimates, invoice_counters, invoices, payments, job_actuals, ai_intake_cache. Applied with `drizzle-kit push` (additive only; no drops/alters of existing tables).

## Integrity rules
- Quote versions are immutable snapshots (scope, config version, engine version, hash); only `accepted_at` changes.
- Customer responses are built by whitelist; floor, margin, cost, recommended, reasons never leave the server.
- Discounts and overrides cannot stack; below-floor prices are flagged, deep discounts need acknowledgement.
- Payments cannot exceed balance or hit void/draft invoices. Invoice numbers are `INV-YYYY-NNNN` from a counter.
- Intelligence suggestions are advisory and never applied automatically; synthetic rows are excluded by default; minimum sample 5.

## Universal work model
Scope now carries `items` (see `docs/UNIVERSAL_WORK_MODEL.md`). `normalizeScope` folds fresh TV mounts into the
specialised TV engine; everything else is priced by `computeWork`. No schema migration: items are stored in the existing
scope JSON and synced to `scope_items` with kind `item`.
