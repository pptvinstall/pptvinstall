# Render exit-1 alert: 2026-10-21

**Status: cause identified; fix pending merge/deploy and post-deploy verification.** Render confirmed that the misleadingly named RC service is **canonical production**. The October 21 process exit was triggered by an uncaught Neon idle WebSocket/pool disconnection. Runtime fix: [PR #26](https://github.com/pptvinstall/pptvinstall/pull/26). No production hosting settings or credentials have been changed in this investigation.

## Identifiers and verified evidence

- Alert/email described an event at approximately **07:08 America/New_York**, but the actual Render failure event is timestamped **2026-10-21 07:08:40 UTC (03:08:40 EDT)**. Investigate the four-hour discrepancy if needed. Exit status **1**.
- Alerted service ID: `srv-d20nkpjipnbc73dfnk10`; display name historically `PPTVInstall-Release-Candidate`.
- Render logs: https://dashboard.render.com/web/srv-d20nkpjipnbc73dfnk10/logs
- 2026-10-21 13:40 UTC public checks: `https://pptvinstall.com/healthz` => HTTP success with `status: ok`; `https://pptvinstall.com/api/health` => `status: healthy`, database/email configured, production environment, outbound not suppressed, deployment SHA `9802210a84f200f08b0d9bb1ea40c2a4ed19da95`.
- That SHA equals `pptvinstall/pptvinstall` canonical `main` (last commit October 15, 2026; CI passed).
- Former RC GitHub repository is archived; archive status does **not** reveal Render service settings.
- Render confirms service `srv-d20nkpjipnbc73dfnk10` deploys **the same canonical SHA** from `pptvinstall/main`. Logs for this service show successful `/api/health` requests. Exact custom domain assignment still requires verification via the Render domain dashboard, but **there is no evidence of a separate legacy deployment** in this workspace.

## Read-only Render inspection: results

| Field | Expected capture | State |
| --- | --- | --- |
| Service ID | `srv-d20nkpjipnbc73dfnk10` | Known |
| Service name, type, owner/team | `PPTVInstall-Release-Candidate`, web service, Picture's workspace | Verified |
| Linked repo URL and branch | `https://github.com/pptvinstall/pptvinstall`, `main` | Verified |
| `autoDeployTrigger` | `commit`; enabled | Verified |
| Live and failed deploy IDs + SHA/times | Live deploy `dep-db8ekfbrjlhs73d5fkfg`, Oct 15, SHA `9802210a84f200f08b0d9bb1ea40c2a4ed19da95`; `server_failed` event `evt-dbc69u0u01pc73fn3cm0`, Oct 21 | Verified |
| Attached custom domains, Render URL, DNS origin | Custom Domains, Cloudflare DNS | Pending |
| Render Blueprint management | Blueprint association and last sync | Pending |
| Webhooks, external callbacks, workers/cron, other consumers | Dependency inventory | Pending |
| Exact first fatal stack | 07:07:16 UTC: `Error: Connection terminated unexpectedly`, `@neondatabase/serverless` `WebSocket.onClose`, uncaught pool error | Verified (redacted) |
| Resolved disposition | **Keep canonical production service live. Never pause it as legacy.** Rename only after checking domains/integrations | Resolved: KEEP |

**Collect safely:** copy only service metadata and a **redacted** exception stack. Mask credentials, connection URLs, customer names/addresses, access tokens, and request bodies. Prefer the earliest fatal stack over downstream restart noise. Correlate deploy release timestamps and repeated restarts.

### API-based corroboration (with a privately held authorized Render token)

- `GET /v1/services/srv-d20nkpjipnbc73dfnk10`: service name, branch, repository, URL, deploy policy.
- `GET /v1/services/srv-d20nkpjipnbc73dfnk10/deploys`: deployed commit IDs/statuses and time series.
- Use Render dashboard for Logs and Custom Domains. Do **not** paste a token into GitHub, this file, chat, or shell output. Follow the official [Render API reference](https://api-docs.render.com/reference/retrieve-service).

## Verified runtime cause and other possible future exit sites

1. **Verified October 21 runtime failure:** an uncaught idle `NeonPool` WebSocket/connection error reached Node's EventEmitter error path and exited the process. [PR #26](https://github.com/pptvinstall/pptvinstall/pull/26) adds a safe pool listener and regression tests. The next query can reconnect after the disconnected idle client is removed. Validate this in staging and post-deploy.
2. **Other potential startup failure (not this incident):** `server/db.ts` throws immediately if `DATABASE_URL` is absent.
3. **Boot safety guard:** `assertSafeBoot()` in `server/index.ts` executes outside an error handler. Check its environment restrictions if the stack identifies it.
4. **Other startup/rejected promise:** import failures, `registerRoutes(app)`, scheduler startup, configuration parse, binding errors, and dependency faults require logs to narrow down. An unhandled error during runtime can also kill the process.
5. **Ordinary DB readiness/preflight:** `checkDatabaseConnection(20000)` is wrapped in `try/catch` with "continuing startup". This alone should **not** produce the reported exit; do not prematurely blame the database.

`/healthz` checks process liveness without database dependency. `/api/health` shows the canonical deployed SHA and higher-level health; successful checks at 13:40 UTC cannot retrospectively explain a crash at 07:08 UTC.

## Render Blueprint drift

At this inspection, `render.yaml` uses a web service named `picture-perfect-tv-install` plus a supposed Postgres `type: pserv` entry. Per [Render Blueprint YAML](https://render.com/docs/blueprint-spec), `pserv` is a **private service**, not a PostgreSQL declaration; Render-managed PostgreSQL belongs in top-level `databases:`. Render private runtime details independently confirm use of **external Neon PostgreSQL**; Render workspace has **zero Render-managed PostgreSQL instances**. Never copy database connection strings from the error log.

**Do not sync the current Blueprint.** Actual production uses external Neon, so `DATABASE_URL` must be stored as a Render secret/environment group and **not** be declared using `fromDatabase` for an absent Render database. Check Blueprint binding before any `render.yaml` edit or sync. Preserve the real service name, service ID, domains, environment variables and intended production plan. Blueprint changes can trigger a redeploy.

## Decision gates

- **Service serves customer domain:** retain the service, fix the verified crash, consider descriptive rename only after checking integration references, then verify live SHA and booking/auth email smoke without generating real customer side effects.
- **Service not serving customer domain and unreferenced:** verify zero custom domains, no DNS origin routes, no background jobs, no webhooks/Stripe callbacks, no inbound links/active customers, and a safe rollback route; then turn off its auto-deploy and pause it. Do not delete until beyond rollback window.
- **Unknown identity:** no pause, rename, redeploy, credential overwrite, domain cutover, or Blueprint sync.

## Other follow-ups

- [ ] **URGENT:** Private Render crash logs included credential-bearing Neon client internals. Rotate the Neon DB password and replace Render `DATABASE_URL` securely, then verify database health and disable the old credential. Avoid logging the error/client objects in future. No rotation performed in this investigation.
- [ ] Complete [issue #13](https://github.com/pptvinstall/pptvinstall/issues/13) credential revocation/rotation with out-of-band proof. The health JSON's `email: true` is configuration presence, **not** a successful test message.
- [ ] Review [issue #22](https://github.com/pptvinstall/pptvinstall/issues/22) / [draft PR #23](https://github.com/pptvinstall/pptvinstall/pull/23): booking time zone, unitemized fuel, missing confirmation queue. CI for PR #23 passed, but the PR remains draft and explicitly requires owner approval before merge/deploy.
- [ ] After confirming the exact Render service, reconcile [CUTOVER_CHECKLIST.md](CUTOVER_CHECKLIST.md), [PRODUCTION_BASELINE.md](PRODUCTION_BASELINE.md), `render.yaml`, and any stale staging instructions.

**Incident closure requires both:** (1) documented actual exit exception + resolution/justified disposition of the alerted service, and (2) a fresh production health check showing canonical SHA and no unexpected restarts.
