# Issue #35 S-6 — Unified Route-Based Travel Pricing (Shadow Proposal)

Status: **PROPOSAL / SHADOW ONLY.** Nothing in this document or in
`shared/pricing/travelShadow.ts` changes any customer-facing price. The active
pricing config keeps `travel.customerFeePolicy: "none"`, the browser keeps its
ZIP-tier fuel fee, and the shadow module is not wired into any response path.

## The problem

Two travel models coexist and diverge (audit finding F-9):

| | Browser quote tool | Pricing engine |
| --- | --- | --- |
| Model | Static ZIP → tier table, fuel-only estimate | Full route cost: fuel + vehicle wear + owner drive time |
| Origin | Midtown/Georgia Tech on weekdays, Decatur on weekends | Whatever route facts the context carries |
| Customer charge | $0–$15 tier fee (or "confirmed from the route" outside the table) | $0 — travel absorbed (`customerFeePolicy: "none"`) |
| Far ZIPs (e.g. Rome, Ball Ground) | Not in the table → travel effectively unpriced | Cost is computed but never charged or compared |

A Rome job can show the customer no travel fee while costing ~$185 in route
economics. Neither model is "wrong" alone; the divergence is the risk.

## The unified model (proposed)

One model for browser and engine, built on the engine's existing route cost
(`shared/pricing/travel.ts computeTravel`), fed by resolved route facts
(`shared/pricing/route.ts resolveRouteContext`: owner-entered route → route
provider → ZIP reference table → flagged unknown-route assumption):

- **Base:** the shop base in **Decatur, GA** for every day of the week (the
  current weekday Midtown origin is a divergence the owner would retire at
  activation).
- **Inputs:** actual one-way route miles + drive minutes to the job address;
  traffic multiplier (existing config bands); job total (profitability
  guardrail only — never a price input); scheduling efficiency (jobs already
  routed near the same ZIP that day share the trip).
- **Candidate customer fee (PROPOSED parameters, owner to set):** first
  **30 round-trip miles free**; **$0.50 per round-trip mile** beyond that,
  rounded up to the next dollar (the engine's existing
  `per_round_trip_mile` policy shape); **+20 free miles per nearby same-day
  job**, capped at +40.
- **Guardrails:** travel is priced ONLY from route distance/time, job
  economics, and schedule efficiency. It is never priced on neighborhood,
  perceived wealth, device value, customer identity, or urgency. Unknown
  routes are flagged as assumptions, never silently priced as fact.

## Worked examples (Decatur base; verified by tests/pricing/issue-35-foundation.test.ts)

Route figures are representative road miles/minutes for the corridor; internal
cost = fuel (20 MPG @ $3.50) + vehicle ($0.30/mi) + owner time ($40/hr),
banded the way the engine bands them.

| Route | One-way | Browser today | Internal route cost | Unified would charge | Notes |
| --- | --- | --- | --- | --- | --- |
| Decatur → Rome, GA (30161) | 75 mi / 85 min | **No price** (ZIP not in table) | $184.58 | **$60.00** | Today the longest drive is the least priced. Guardrail: route cost exceeds a $100 job total — long-haul jobs need the fee or a minimum-ticket decision. |
| Decatur → Ball Ground, GA (30107) | 55 mi / 70 min | **No price** (ZIP not in table) | $145.58 | **$40.00** | Same blind spot as Rome. |
| Decatur → Marietta, GA (30060) | 25 mi / 40 min | $6 weekday / $9 weekend (tier table, origin-dependent) | $77.08 | **$10.00** | One number under the unified model, any day of the week. |
| In-town Decatur (30030) | 4 mi / 12 min | $0 weekend / $6 weekday | $24.75 | **$0.00** | Local work stays travel-free, every day. |

Scheduling efficiency example: the Rome trip with **2 jobs already routed
nearby the same day** raises free miles 30 → 70, so the would-charge fee drops
$60 → **$40** — the model rewards route density instead of charging every
customer for a solo trip.

## What activation would require (owner approval, none of it done here)

1. Owner sets the real candidate parameters (free miles, per-mile rate,
   efficiency credit) — the values above are proposals.
2. Flip `travel.customerFeePolicy` to `per_round_trip_mile` with those values
   in the pricing config (existing config machinery, versioned + auditable).
3. Point the browser quote tool at the same model: replace the ZIP-tier fee
   in `client/src/lib/travel-pricing.ts` with route-resolved miles/minutes
   (ZIP reference table as the fallback, exactly as the engine does today)
   and retire the weekday/weekend origin split in favor of the Decatur base.
4. Run shadow mode first (this module's output logged next to real quotes)
   for a review period, compare against actuals, then decide.

## Shadow logging (prepared 2026-11-27 — inert until the owner activates it)

Step 4 of the activation path above ("run shadow mode first, compare against
actuals") now has its record-keeping built: `shared/pricing/travelShadowLog.ts`.

**What a record holds** (schema version 1, one per real quote): the route
(one-way/round-trip miles and drive minutes, route source, what the browser
ZIP-tier model charges today, what the unified candidate model would charge,
and the delta); **route efficiency** (jobs already routed near the same ZIP
that day, free miles granted after efficiency, whether the trip is a combined
appointment); the **fuel expense estimate** (fuel and vehicle cents, estimated
gallons at the config's cached fuel price); **estimated labor** (on-site
minutes, total owner minutes including driving, owner time value); and
**profitability** — the margin on the quote the customer ACTUALLY received
under the active pricing mode, the travel-cost-exceeds-job-total guardrail,
and, for comparison only, the margin as it would look under the candidate
travel fee. Records key off the quote's input hash — no customer PII.

**Inert-by-default contract:**

- The capture function is pure (no I/O, no clock) and returns `null` unless
  logging is explicitly enabled.
- The enable flag resolves from the environment (`TRAVEL_SHADOW_LOGGING=1`,
  exact value only — unset, "0", or "true" all stay OFF) and **defaults to
  OFF**. Production stays inert until the owner activates it.
- The module is **not imported by any request/response path**. Wiring it into
  a route and choosing a storage sink (DB table vs owner-only report) is a
  separate change that needs its own owner approval.
- A record never feeds a customer price: customer-visible figures are copied
  FROM the finished quote, never the other way around. Logging cannot change
  what any customer is charged.

Covered by tests in `tests/pricing/issue-35-foundation.test.ts` (flag
resolution, disabled-capture null, full record contents on the Rome worked
example, and a no-mutation assertion on the priced job and active config).

## S-8 — Move discounts (no change)

Existing move-project discounts (the two-home bundle discount in the catalog
calculator) are **preserved exactly** by this change set and by this proposal.
They stay in force until actual cost analysis — not this shadow model —
supports changing them.
