# Production cutover and Render reconciliation

**Status as of 2026-10-21:** canonical GitHub cutover is **complete and verified at the public production domain**. Render service inventory, the 2026-10-21 exit-1 alert, credentials, and infrastructure-as-code are **not yet fully reconciled**.

> This supersedes the obsolete pre-cutover instructions previously in this file. Do not execute the old directions to provision another production service or move the domain merely because the historical RC service name appears in an alert.

## Verified facts

- [x] GitHub source of truth: `pptvinstall/pptvinstall` branch `main`; legacy `PPTVInstall-Release-Candidate` repository is archived.
- [x] 2026-10-12 baseline: live production returned canonical SHA `908b4b36011d8a5bc26a1992203ebbe366722458`.
- [x] 2026-10-21 13:40 UTC: `https://pptvinstall.com/healthz` returned `status: ok` and `/api/health` returned `status: healthy`, `database: true`, `email: true`, `appEnv: production`, `outboundSuppressed: false`, and deployment SHA `9802210a84f200f08b0d9bb1ea40c2a4ed19da95`.
- [x] That live SHA exactly matched canonical `main`, including the October 15 commits; the October 15 `main` CI run was successful.
- [ ] Confirm that Render service `srv-d20nkpjipnbc73dfnk10` is the service serving the production domain (or prove it is independent). The display name alone is not evidence.
- [ ] Capture the actual exception from the 2026-10-21 07:08 ET exit-1 event (deploy event, runtime logs with preceding stack, service uptime, deploy SHA).
- [ ] Record connected GitHub repository and branch, `autoDeployTrigger`, recent deployment SHAs, domain assignments, and any webhook/worker/external callback dependencies for **every** Render service.
- [ ] Only if the alerting service is confirmed legacy and unused: disable auto-deploy and pause it after verifying zero dependencies. Retain rollback until tested; **do not delete blindly**.
- [ ] Only if the alerting service is confirmed canonical production: keep it live; rename to a neutral canonical name if helpful after the owner verifies references. Do not create a second live service.
- [ ] Reconcile `render.yaml` with actual Render ownership and external vs Render-managed PostgreSQL. Present file declares a `type: pserv` entry with `env: postgresql`, which is **not** the documented way to define a Render PostgreSQL database (Render databases belong under `databases:`). The web-service name also differs from the alert name. This is a **configuration drift risk**, not evidence of what is running.
- [ ] Confirm whether an active Render Blueprint watches this file before modifying or syncing it; a sync can create/change live resources.
- [ ] Confirm all required environment variable **presence** without logging values; rotate old Gmail/admin secrets tracked at [issue #13](https://github.com/pptvinstall/pptvinstall/issues/13).
- [ ] After rotation, verify admin authentication and a permitted test email end-to-end; never publish live credentials.
- [ ] Test the customer quote/booking flow without creating a real booking, moving a domain, triggering payment, or sending customer messages unless separately approved.

## Separate, open booking incident

[Issue #22](https://github.com/pptvinstall/pptvinstall/issues/22) and draft [PR #23](https://github.com/pptvinstall/pptvinstall/pull/23) cover calendar time-zone, travel-fee line item, and manual-confirmation/SLA defects. They are **not merged into production** as of this check. PR #23 expressly requires owner approval before merging or deploying; handle that approval and booking-20 follow-up separately from Render cleanup.

## Order of operations

1. **Read-only inventory first:** Render service/deploy metadata, domains, origin/traffic checks, exception stack; correlate alert timestamp to deployment and `/api/health`.
2. **Fix the verified fault:** only change configuration/code once the first fatal stack is known; use staging for startup regression and never log secret values.
3. **Reconcile infrastructure:** decide Render-managed Postgres vs external Neon, Blueprint management vs dashboard-managed service, and exact canonical service name before editing `render.yaml`.
4. **Security:** revoke exposed app password, replace in Render, rotate admin credential, verify outbound/auth, and document checkmarks only after proof.
5. **Retire surplus hosting:** disable deploys/pause only dependency-free legacy services; monitor production and keep a rollback path.
6. **Maintain baseline:** after each change, capture timestamp, live SHA, `/healthz`, `/api/health`, CI run, and rollback SHA in [PRODUCTION_BASELINE.md](PRODUCTION_BASELINE.md).

See [RENDER_INCIDENT_2026-10-21.md](RENDER_INCIDENT_2026-10-21.md) for the current incident checklist and safe evidence-handling rules.
