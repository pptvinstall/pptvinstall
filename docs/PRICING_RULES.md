# Pricing rules, modes and data sources

Owner-approved business rules (2026-10-02) as implemented in Pricing Engine V2. All arithmetic is deterministic
TypeScript in integer cents (`shared/pricing/engine.ts`); AI never computes a price.

## Business rules
| Rule | Implementation |
| --- | --- |
| Owner labor value **$100/hr** | `labor.targetLaborPerHourCents = 10000`. Values hands-on time in cost-to-serve; customers never see an hourly rate. Drive time keeps its own value (`travel.ownerTimeValuePerHourCents`, $40/hr default, owner-editable). |
| Helper **20% of labor revenue** | `labor.helperCompensation = { mode: "labor_revenue_share", laborRevenueSharePct: 0.2, appliesTo: "whole_job" }`. Labor revenue = customer total − pass-through (materials and PPTV-supplied mounts/products at their charged amount, customer travel fee; tax is never in the base). Floor and recommendation are solved in closed form `P = (fixed − s·passThrough) / (1 − margin − s)`, so helper pay never feeds back into itself. Configs saved before this field existed keep `hourly`. |
| **$100 minimum job** | `business.minimumTicketCents = 10000`; floor and recommendation never go under it. A catalog total under $100 (e.g. a $50 take-down) is flagged to the owner; legacy/shadow customer prices are not changed. |
| Profit strategy | Floor = max(minimum job, 12% margin after valuing owner time, out-of-pocket + $60 trip economics). Recommended = 25% desired margin **plus a deterministic complexity/risk premium** (fireplace, masonry, steel studs, height, ceiling, helper, heavy item, same-day, multiple addresses, unconfirmed details, specialty, electrical, difficult access; capped at 15%). The premium never raises the floor. Premium reference = recommended × 1.15. |
| Safety / scope prerequisites | Owner-editable `prerequisites` on categories/templates/surfaces. Answer per item in `conditions[key]`: yes → fine, unknown → confirm or manual review, no → review or not supported. Defaults: ceiling structure (joist/blocking), existing fixture, fan-rated box, wiring condition, existing circuit (no new circuits/panel work), doorbell wiring, exterior fixture. |

Everything else (minutes, recipes, margins, premium factors) is an **uncalibrated default** to tune from actuals.

## Pricing modes
`legacy` → `shadow` → `dynamic`. Production stays on `legacy`/`shadow` until the owner explicitly confirms dynamic
pricing (server-enforced `confirmDynamic: "change customer prices"`).

## Public /quote
1. The browser computes the catalog price instantly (`calculateQuote` + standalone services), exactly as before.
2. On "Get My Quote" it calls `POST /api/quote/price` (rate limited, customer-safe, no notes accepted).
   - legacy/shadow: the server returns the same catalog total; in shadow it stores the owner comparison.
   - dynamic: the server returns the engine price and lines (or "we'll review" when review is required); the browser
     shows them and hides catalog packages. Live totals are fetched with a 450 ms debounce.
3. Any error, timeout or 404 (Job OS disabled) leaves the catalog price on screen.

## Real-world data
- Route: owner-entered miles win; then a live `RouteProvider` (interface in `shared/pricing/travel.ts`, **none configured: no maps credentials exist**), then the site's ZIP tier table (labelled `site table rev. 2025-07`), then a flagged unknown-route assumption. Resolution is in `shared/pricing/route.ts` with a 1.5 s timeout; the engine stays pure.
- Fuel: `travel.fuelPricePerGalCents` with an owner-set `fuelPriceAsOf` label. No live fuel feed is wired (`FuelPriceProvider` interface exists).
- To add live data later: implement `RouteProvider` (Google Distance Matrix / Mapbox) with a key from env, pass it as `routeProviders` to `JobOsService`. Never commit keys.

## Learning loop
Actuals record minutes, helper minutes and (optionally) what the helper was paid. Profitability compares estimate vs
actual for labor, travel, miles, materials, helper, out-of-pocket, net margin and owner $/hr. Intelligence produces
advisory suggestions (including "owner $/hr below labor value") and never changes configuration.
