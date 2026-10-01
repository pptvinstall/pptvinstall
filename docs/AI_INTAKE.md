# AI scope intake

- Contract (`shared/jobos/intake.ts`): strict Zod. Each field is `known | inferred | unknown | needs_confirmation`. `unknown` must be null. Any price/cost key is rejected.
- `verifyEvidence` downgrades "known" fields whose quoted evidence is not in the source message.
- `heuristicIntake` is a deterministic no-AI fallback. In multi-TV messages per-TV details are never "known".
- The draft scope always requires owner confirmation; the model never sets a price. Parsed results are cached by input hash.
- Hidden wall conditions stay "unverified until inspection".
- AI is disabled when outbound is suppressed (staging default) or no key is set; manual builder is unaffected.
- **Photo intake:** schema and interface only. `POST /api/admin/job-os/intake/photos` returns 501 `not_configured`. Owner decision: pick a vision provider and a photo storage/retention policy.
