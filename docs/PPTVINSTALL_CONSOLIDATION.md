# PPTVInstall Consolidation Mission

## Canonical repository
`pptvinstall/pptvinstall` is the target single source of truth.

Work must land on `consolidation/job-os` until verification is complete. Do not modify production/main, archive repositories, or delete historical code until the consolidated build is verified.

## Repository inventory (2026-10-01)

| Repository | Role / disposition |
| --- | --- |
| `pptvinstall/pptvinstall` | Canonical target. Existing full-stack TypeScript app. |
| `pptvinstall/PPTVInstall-Release-Candidate` | Primary migration source. Contains newer quote, travel pricing, AI quote and booking work absent from canonical main. |
| `pptvinstall/pptvinstall-backend` | Legacy Python backend; inventory useful behavior/data before archive. |
| `pptvinstall/pptvinstall-booking-app` | Legacy booking artifact; inventory before archive. |
| `pptvinstall/create-anything` | Separate/private experiment; do not merge automatically without feature-level justification. |
| `pptvinstall/pptv-lead-radar-claude` | Empty experiment; archive only after final verification/owner approval. |
| `pptvinstall/pptv-lead-radar-codex` | Empty experiment; archive only after final verification/owner approval. |

## Confirmed Release Candidate capabilities to preserve/migrate

- Centralized pricing catalog and calculator.
- Quote page and reusable QuoteTool components.
- Travel pricing with weekday/weekend origin logic and ZIP/distance tiers.
- AI quote service.
- Booking and quote integration.
- Admin pricing editor.
- Existing CRM/customer/booking schema and notification/consent behavior.
- Existing production-readiness scripts and deployment configuration.

## Job OS target

One product flow:

`lead -> scope -> quote -> schedule -> job -> invoice -> payment -> actuals -> pricing intelligence`

### Pricing architecture

AI is optional input parsing, not the pricing authority.

1. Structured scope: TVs, sizes, wall type, mount type/source, concealment, outlets, removals, shelves/art, sound, smart-home, access and specialty work.
2. Labor model: estimated minutes by task plus setup/cleanup/helper requirements.
3. Materials model: mount cost, Romex length, boxes/receptacles/plates, fasteners, raceway and consumables.
4. Travel model: route mileage, drive time, traffic/appointment burden, vehicle MPG and fuel price.
5. Business model: overhead, minimum trip economics, target labor value and target margin.
6. Efficiency model: multi-item savings based on duplicated setup/travel avoided, not blanket percentage discounts.
7. Outputs: internal floor, recommended customer quote, premium/high-complexity ceiling, estimated time, cost-to-serve and effective hourly return.
8. Actuals: completed-job time, mileage, materials, expenses, collected amount and exceptions feed future calibration.

### Customer-facing options

- Basic TV installation.
- Customer-supplied or PPTV-supplied mount.
- Fixed / tilt / full-motion mount by TV size.
- Visible cables / surface management / in-wall low-voltage concealment where appropriate.
- Outlet/power work as a distinct scope item.
- TV/mount removal and relocation.
- Fireplace, masonry, steel-stud, high-wall and difficult-access adjustments.
- Soundbar, shelving/artwork, device setup and other supported services.
- Optional Essential / Clean / Complete packages generated from the same underlying scope/pricing engine.

## Migration rules

- Preserve existing customer, booking, consent, CRM and production data.
- Never expose secrets or copy environment credentials into source.
- Do not silently change customer-visible prices during structural migration.
- Keep old pricing behavior available behind a compatibility layer until dynamic pricing is tested.
- Do not claim live traffic, fuel or material pricing unless a real data source is configured and healthy.
- Photo/AI interpretation may suggest wall/scope attributes but hidden wall conditions remain unverified until inspection.
- Discounts must represent owner-approved courtesy or real bundle/operational efficiency.
- Add regression coverage before removing legacy paths.

## Phases

### Phase 1 — Consolidate without behavior changes
Migrate newer Release Candidate functionality missing from canonical main. Reconcile dependencies, routes, schema and tests. Establish one build/deploy path.

### Phase 2 — Normalize domain model
Introduce first-class Job, ScopeItem, Quote, QuoteVersion, TravelEstimate, MaterialEstimate, Invoice, Payment and JobActual entities without destroying existing Booking records.

### Phase 3 — Dynamic pricing engine
Replace static assumptions with configurable cost inputs and deterministic calculations. Keep current price sheet as baseline/reference and compatibility mode.

### Phase 4 — Smart intake
Natural-language scope parser produces validated structured scope. Normal UI remains fully usable without AI/token spend.

### Phase 5 — Pricing intelligence
Capture estimates vs actuals and calculate historical medians/percentiles by task. Calibrate labor/material assumptions from completed PPTV work.

### Phase 6 — Cutover
Verify desktop/mobile/PWA, booking, quote, admin, notifications, database migrations, build, deployment and rollback. Merge only after checks pass. Archive old repositories only after owner approval.
