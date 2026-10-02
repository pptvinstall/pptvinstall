# Quick Intake and reading cost controls

The detailed Job Builder remains available. Quick Intake accepts pasted customer messages and phone-keyboard voice transcripts, plus private screenshots/photos when storage is configured. The flow is read → review/confirm → editable scope → deterministic V2 economics → job → estimate. Speech recording/transcription is not provided by the app.

## Rules and local OCR first

Text uses the existing regex/rules/config-taxonomy parser first. Paid text fallback is allowed only for work the rules could not identify, with the owner's paid-reading checkbox enabled and an available provider. Missing facts are questions, never a reason to pay AI to guess them.

Screenshots (including product screenshots), TV labels, receipts and printed notes use local Tesseract OCR before vision. English data is bundled: no runtime model downloads, and image bytes stay on the server for OCR. `OCR_ENABLED=false` disables it. One worker runs at a time, has a 20-second per-image deadline, and is terminated after each image. Resource pressure, poor confidence and unreadable images retain manual entry; optional paid vision may help.

OCR requires 65% confidence and five useful characters. It is a suggestion, not a confirmed customer statement. TV labels map recognized model formats or explicit inch sizes deterministically. Results are cached by normalized SHA-256, hint and reader version, including across intakes. A changed hint invalidates its interpretation.

Receipt OCR exposes reference text. It does not automatically reconcile receipt items, taxes or purchases into job expenses. Handwriting is not guaranteed. OCR quantities/actions require an explicit whole-scope check before applying scope or linking a job; inferred TV/access facts remain individually confirmable. Hidden wall, wiring and structural conditions require inspection.

## Paid reading limits

Paid reading defaults off in Quick Intake. Vision uses at most one batch of eight images per intake, including failed attempts. Remaining images stay for manual review. Re-reading/restarting does not reset the stored allowance: a reservation is persisted before the provider call, and an in-process lock prevents double taps. This is a single-service-instance guard.

Identical content reuses vision observations by normalized hash, hint, provider/model, schema and taxonomy version. Grouping references prevent unrelated cached batches from merging. Strict schemas reject price/cost keys. AI never performs quote arithmetic. Failures fall back to rules/manual review; real providers obey staging outbound suppression.

## Owner-only usage

Results show OCR/cached images, calls this read/intake, provider/model and escalation reason. Owner status reports percentages over the last 100 measured sessions, a limited sample. Cached AI counts as AI assisted without a new call. Local/rules cost is $0; paid cost is unavailable because token billing is not captured.

`/api/admin/job-os/intake/status`, `/intake/media`, `/intake/analyze`, `/intake/:id/review`, and `/media/:id/hint` require owner authentication. The old `/intake/photos` remains a 501 legacy placeholder; Quick Intake uses unified endpoints. Usage/config/storage keys never appear in customer documents or public quote views.

## Storage and verification

See [MEDIA_STORAGE.md](MEDIA_STORAGE.md). Unconfigured production uploads are disabled; manual quoting works. Existing media is not automatically moved to a bucket. JPEG, PNG and WebP are validated, normalized and stripped of metadata. GIF/vulnerable native decoders are blocked.

`tests/jobos/ocr.test.ts` reads real synthetic text without AI and checks OCR-first/cache/review, vision budgets/failure/restart, cross-intake reuse and manual fallback on memory/PGlite. API tests cover auth and public/internal separation. Tests use synthetic content and mocked paid providers.
