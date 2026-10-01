# Job OS and Dynamic Pricing Architecture (design only, nothing implemented)

Flow: `lead -> scope -> quote -> schedule -> job -> invoice -> payment -> actuals -> pricing intelligence`.

## Compatibility with today's model
`bookings` stays the system of record. New entities are additive and link to it (`booking_id` nullable both ways), so existing rows, IDs, tokens, consent and pricing breakdowns are untouched. A booking is treated as an implicit Job + Quote v1 via a read-only adapter until backfilled.

## Entities (additive tables)
`leads`, `jobs` (links customer/crm_contact + optional booking), `scope_items` (job_id, kind, qty, attributes jsonb: tv_size, wall_type, mount_type, mount_source, concealment, outlet, access...), `quotes`, `quote_versions` (immutable snapshots: scope hash, engine version, inputs, line items, internal floor/recommended/ceiling, customer total, discount reason), `travel_estimates`, `material_estimates`, `invoices`, `payments`, `job_actuals` (actual minutes, miles, drive time, materials, helper time, expenses, collected amount, exceptions).

## Pricing engine (deterministic TypeScript, no LLM arithmetic)
`price(scope, context, config) -> breakdown`, a pure function in `shared/` so client preview and server agree.
1. Compatibility mode: reproduce today's `quote-calculator.ts` + `travel-pricing.ts` outputs exactly (golden tests from current behavior). Historical baseline ($100 drywall install, +$100 outlet, +$100 fireplace, +$50 brick/stone, +$25 high-rise/steel, $50 unmount/remount) is reference data, not code constants.
2. Dynamic mode behind a flag: labor minutes by task + setup/cleanup/helper; materials list with costs; travel = miles x (fuel price / MPG + operating cost) + drive time x opportunity rate, origin and appointment window configurable; business overhead and minimum trip economics.
3. Efficiency, not blanket discounts: `standalone sum - shared travel/setup saved - owner-approved courtesy = quote`; each term is recorded and explainable.
4. Outputs: cost to serve, floor, recommended, premium ceiling, est. time, gross hourly return. Floor/margin are internal only.
5. Packages (Essential / Clean / Complete) are different scope sets run through the same engine; no fabricated strike-through prices.
6. Config table (`pricing_config`): vehicle MPG (starting point: 2021 VW Atlas SE, ~20 MPG), fuel price, origins, labor value, margin. No claim of live traffic/fuel data unless a provider is configured.

## AI usage
Optional natural-language/photo -> structured scope, validated by Zod against the scope schema, results cached by input hash. The manual scope UI must work with AI disabled. Hidden wall conditions remain "unverified until inspection".

## Pricing intelligence
Estimates vs `job_actuals` per task -> medians and percentiles, comparable-job lookups, later simple regression. Calibration proposals are shown to the owner; they never change prices automatically.

## Suggested sequence
(1) tests + golden pricing fixtures, (2) additive schema + adapter, (3) engine in compatibility mode, (4) dynamic mode behind flag, (5) smart intake, (6) invoices/payments/actuals, (7) calibration.
