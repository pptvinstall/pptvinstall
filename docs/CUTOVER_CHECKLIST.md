# Production cutover and Render reconciliation

**Status as of 2026-10-21:** canonical GitHub cutover is **complete and verified at the public production domain**. Render service identity and October 21 crash cause have now been verified from Render. Runtime remediation, secret rotation, domain/Blueprint audit and infrastructure-as-code are still **not complete**.

> This supersedes the obsolete pre-cutover instructions previously in this file. Do not execute the old directions to provision another production service or move the domain merely because the historical RC service name appears in an alert.

## Verified facts

- [x] GitHub source of truth: `pptvinstall/pptvinstall` branch `main`; legacy `PPTVInstall-Release-Candidate` repository is archived.
- [x] 2026-10-12 baseline: live production returned canonical SHA `908b4b36011d8a5bc26a1992203ebbe366722458`.
- [x] 2026-10-21 13:40 UTC: `https://pptvinstall.com/healthz` returned `status: ok` and `/api/health` returned `status: healthy`, `database: true`, `email: true`, `appEnv: production`, `outboundSuppressed: false`, and deployment SHA `9802210a84f200f08b0d9bb1ea40c2a4ed19da95`.
- [x] That live SHA exactly matched canonical `main`, including the October 15 commits; the October 15 `main` CI run was successful.
- [x] Render service `srv-d20nkpjipnbc73dfnk10` connects to canonical `pptvinstall/main` and deploys the exact current live SHA `9802210`; this is **not** the archived RC source. Render lists only this one web service in the workspace. [ ] Verify the attached custom domain records separately; the connected Render API does not expose them.
- [x] Render event at **07:08:40 UTC (03:08 EDT)** after uncaught Neon WebSocket failure at **07:07:16 UTC**: `Error: Connection terminated unexpectedly`. Historical alert's 07:08 ET wording differs from Render timestamps; use UTC event evidence. Recovery patch [PR #26](https://github.com/pptvinstall/pptvinstall/pull/26), CI passed, **not yet deployed**.
- [ ] Record connected GitHub repository and branch, `autoDeployTrigger`, recent deployment SHAs, domain assignments, and any webhook/worker/external callback dependencies for **every** Render service.
- [ ] Only if the alerting service is confirmed legacy and unused: disable auto-deploy and pause it after verifying zero dependencies. Retain rollback until tested; **do not delete blindly**.
- [x] Confirmed canonical production: **KEEP RUNNING**. Rename to a neutral canonical name only after domain/reference checks. Do not create a second live service.
- [ ] Reconcile `render.yaml` with actual Render ownership and external vs Render-managed PostgreSQL. Present file declares a `type: pserv` entry with `env: postgresql`, which is **not** the documented way to define a Render PostgreSQL database (Render databases belong under `databases:`). The web-service name also differs from the alert name. Render inventory shows **zero Render-managed PostgreSQL instances** and the private runtime stack points to external **Neon PostgreSQL**. This is a confirmed `render.yaml` drift; do not sync until Blueprint association is verified.
- [ ] Confirm whether an active Render Blueprint watches this file before modifying or syncing it; a sync can create/change live resources.
- [ ] Avoid raw object/stack dumps from DB clients; the October 21 uncaught error included a credential-bearing Neon connection string in private logs. **Rotate the Neon DB password and update Render `DATABASE_URL`** securely after arranging a safe deployment, in addition to Gmail/admin rotations tracked at [issue #13](https://github.com/pptvinstall/pptvinstall/issues/13).
- [ ] After rotation, verify admin authentication and a permitted test email end-to-end; never publish live credentials.
- [ ] Test the customer quote/booking flow without creating a real booking, moving a domain, triggering payment, or sending customer messages unless separately approved.

## Separate, open booking incident

[Issue #22](https://github.com/pptvinstall/pptvinstall/issues/22) and draft [PR #23](https://github.com/pptvinstall/pptvinstall/pull/23) cover calendar time-zone, travel-fee line item, and manual-confirmation/SLA defects. They are **not merged into production** as of this check. PR #23 expressly requires owner approval before merging or deploying; handle that approval and booking-20 follow-up separately from Render cleanup.

## Order of operations

1. **Read-only inventory first:** Render service/deploy metadata, domains, origin/traffic checks, exception stack; correlate alert timestamp to deployment and `/api/health`.
2. **Fix the verified fault:** [PR #26](https://github.com/pptvinstall/pptvinstall/pull/26) passed CI with a safe pool-error handler; ensure guarded release first and verify after deploying, then rotate exposed Neon credential. Do not log secret values.
3. **Reconcile infrastructure:** external Neon is confirmed; identify Blueprint binding, custom domains and canonical display name before editing/syncing `render.yaml`. Existing Render pre-deploy command is **`npm run db:push` against production**, a schema-change risk for any deployment — snapshot/review or remove automatic push through a controlled release procedure first.
4. **Security:** revoke exposed app password, replace in Render, rotate admin credential, verify outbound/auth, and document checkmarks only after proof.
5. **Retire surplus hosting:** disable deploys/pause only dependency-free legacy services; monitor production and keep a rollback path.
6. **Maintain baseline:** after each change, capture timestamp, live SHA, `/healthz`, `/api/health`, CI run, and rollback SHA in [PRODUCTION_BASELINE.md](PRODUCTION_BASELINE.md).

See [RENDER_INCIDENT_2026-10-21.md](RENDER_INCIDENT_2026-10-21.md) for the current incident checklist and safe evidence-handling rules.
