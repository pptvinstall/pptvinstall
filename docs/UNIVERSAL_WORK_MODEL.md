# Universal work model (mount / install / assemble / remove anything reasonable)

Job OS prices **work items**, not a fixed list of services. A new ordinary request needs no new table,
pricing algorithm or UI page; at most a template or category added in owner config.

## A work item
`shared/pricing/work.ts` (`WorkItem`): **action** (mount, install, assemble, reassemble, remount, relocate,
unmount, dismount, remove, disassemble, teardown) + optional **thenAction** (compound workflows such as
unmount+remount, disassemble+reassemble, remove+install) + **category** (free slug; unknown slugs are custom,
never rejected) + **quantity** + facts: dimensions, weight, surface (drywall studs/unknown, brick, concrete,
stone, masonry, steel studs, wood, tile, ceiling, floor, freestanding, furniture, unknown), attachment method,
hardware supplier, assembly state, access (height, ladder, stairs, tight space, furniture, obstructions),
helper, relocation, restoration, disposal, materials, risk flags, optional `site` (address index) and a `tv`
extension that preserves the TV specialisation (size, VESA/mount type, fireplace, concealment, outlet).

## Where the numbers live (all owner-editable, versioned, audited: `config.work`)
Taxonomy (about 45 categories), templates (labor per action, material recipes, optional fixed price, defaults),
weight/size bands, helper rules, limits, risk lists, recipes. Defaults are **uncalibrated placeholders**.
Owner endpoints: `PUT/DELETE /work-templates/:id`, `PUT /work-categories/:id`. The Job Builder can save any item as a template.

## Pricing (`workEngine.ts`, pure, integer cents)
Labor is compositional: base action minutes (template > category > derived from the reverse action) + handling
band + surface + attachment + assembly/teardown extras + access + relocation + restoration + disposal, scaled by
an additional-unit efficiency. Helper time is costed (required 80%, recommended 50% of item time) plus coordination.
Materials come from recipes, explicit lines and disposal fees (hardware is free when the customer supplies it).
Travel/schedule/min-trip run unchanged, with multi-stop legs (`extraStops`). Patching is separate from removal;
paint is excluded and said so; disposal is never free.

## Statuses
`priced` / `estimate_with_confirmation` / `manual_review_required` / `not_supported`, with reasons and questions.
Unknown weight, surface, attachment or hardware ask questions. Heavy (>=150 lb), oversized, high, ceiling, structural,
gas/plumbing/electrical/permit, transport and major repair flags go to review; extreme weight/height and
out-of-scope flags are not supported. Quote gates: not supported never quotes; manual review quotes only with an
owner override price. In legacy mode, work without a catalog price shows as "We'll confirm" and the builder requires the owner's price.

## AI intake
Strict schema, no prices. Facts carry known/inferred/unknown status. A sanitizer drops inferred weight, dimensions,
surface, attachment, hardware supplier and assembly state, and requires stated numbers to appear in the evidence.
An offline verb/noun parser does the same without AI. Templates are suggested, never applied silently.
Example: "Take down 4 TVs, remove six wire shelves, take apart a king bed and dresser, then at the new place put the bed
back together and mount two of the TVs" becomes six items across two addresses with questions and an owner recommendation.

## Actuals and learning
Per-item actual minutes, helper time, materials and notes feed `Profitability.items` and advisory intelligence by action,
category, template, band, surface and complexity (minimum sample 5, synthetic data excluded, never auto-applies).

## Owner decisions still open
Calibrate labor minutes, helper shares, band thresholds, review/not-supported lists and haul-away fees from real jobs.
