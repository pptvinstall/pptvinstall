# Render exit-1 alert: 2026-10-21

**Status:** investigating. Public production currently healthy; **the alerting Render service's identity and the fatal exception are unverified**. No production hosting or secrets were changed during this read-only investigation.

## Identifiers and verified evidence

- Alert received: October 21, 2026 at approximately **07:08 America/New_York** (11:08 UTC); reported process exit status **1**.
- Alerted service ID: `srv-d20nkpjipnbc73dfnk10`; display name historically `PPTVInstall-Release-Candidate`.
- Render logs: https://dashboard.render.com/web/srv-d20nkpjipnbc73dfnk10/logs
- 2026-10-21 13:40 UTC public checks: `https://pptvinstall.com/healthz` => HTTP success with `status: ok`; `https://pptvinstall.com/api/health` => `status: healthy`, database/email configured, production environment, outbound not suppressed, deployment SHA `9802210a84f200f08b0d9bb1ea40c2a4ed19da95`.
- That SHA equals `pptvinstall/pptvinstall` canonical `main` (last commit October 15, 2026; CI passed).
- Former RC GitHub repository is archived; archive status does **not** reveal Render service settings.
- The public health result confirms the **website serving canonical code at the instant tested**, but does not prove which Render service ID served it or what caused the 07:08 alert.

## Read-only Render inspection: fill in from actual evidence

| Field | Expected capture | State |
| --- | --- | --- |
| Service ID | `srv-d20nkpjipnbc73dfnk10` | Known |
| Service name, type, owner/team | From Render service Settings | Pending |
| Linked repo URL and branch | Settings > Build & Deploy / Render API service metadata | Pending |
| `autoDeployTrigger` | Commit, checksPass, off | Pending |
| Live and failed deploy IDs + SHA/times | Deploy history | Pending |
| Attached custom domains, Render URL, DNS origin | Custom Domains, Cloudflare DNS | Pending |
| Render Blueprint management | Blueprint association and last sync | Pending |
| Webhooks, external callbacks, workers/cron, other consumers | Dependency inventory | Pending |
| Exact first fatal stack | Logs around 07:08 ET; include preceding build/start/runtime lines | Pending |
| Resolved disposition | Keep/rename canonical or pause validated-unused legacy | Pending |

**Collect safely:** copy only service metadata and a **redacted** exception stack. Mask credentials, connection URLs, customer names/addresses, access tokens, and request bodies. Prefer the earliest fatal stack over downstream restart noise. Correlate deploy release timestamps and repeated restarts.

### API-based corroboration (with a privately held authorized Render token)

- `GET /v1/services/srv-d20nkpjipnbc73dfnk10`: service name, branch, repository, URL, deploy policy.
- `GET /v1/services/srv-d20nkpjipnbc73dfnk10/deploys`: deployed commit IDs/statuses and time series.
- Use Render dashboard for Logs and Custom Domains. Do **not** paste a token into GitHub, this file, chat, or shell output. Follow the official [Render API reference](https://api-docs.render.com/reference/retrieve-service).

## Suspected code exit sites (hypotheses, not diagnoses)

1. **Synchronous startup:** `server/db.ts` throws immediately if `DATABASE_URL` is absent. A missing variable is one plausible exit-1 cause, not a verified one.
2. **Boot safety guard:** `assertSafeBoot()` in `server/index.ts` executes outside an error handler. Check its environment restrictions if the stack identifies it.
3. **Other startup/rejected promise:** import failures, `registerRoutes(app)`, scheduler startup, configuration parse, binding errors, and dependency faults require logs to narrow down. An unhandled error during runtime can also kill the process.
4. **Ordinary DB readiness/preflight:** `checkDatabaseConnection(20000)` is wrapped in `try/catch` with "continuing startup". This alone should **not** produce the reported exit; do not prematurely blame the database.

`/healthz` checks process liveness without database dependency. `/api/health` shows the canonical deployed SHA and higher-level health; successful checks at 13:40 UTC cannot retrospectively explain a crash at 11:08 UTC.

## Render Blueprint drift

At this inspection, `render.yaml` uses a web service named `picture-perfect-tv-install` plus a supposed Postgres `type: pserv` entry. Per [Render Blueprint YAML](https://render.com/docs/blueprint-spec), `pserv` is a **private service**, not a PostgreSQL declaration; Render-managed PostgreSQL belongs in top-level `databases:`. Code's DB client uses `@neondatabase/serverless`, but that library alone does not prove the actual hosted DB provider.

**Do not sync the current Blueprint.** First identify whether production uses external Neon (in which case `DATABASE_URL` should be supplied as a secret/environment group instead of a `fromDatabase` dependency) or an actual Render Postgres instance (which should be modeled correctly). Preserve the real service name, service ID, domains, environment variables and intended production plan. Blueprint changes can trigger a redeploy.

## Decision gates

- **Service serves customer domain:** retain the service, fix the verified crash, consider descriptive rename only after checking integration references, then verify live SHA and booking/auth email smoke without generating real customer side effects.
- **Service not serving customer domain and unreferenced:** verify zero custom domains, no DNS origin routes, no background jobs, no webhooks/Stripe callbacks, no inbound links/active customers, and a safe rollback route; then turn off its auto-deploy and pause it. Do not delete until beyond rollback window.
- **Unknown identity:** no pause, rename, redeploy, credential overwrite, domain cutover, or Blueprint sync.

## Other follow-ups

- [ ] Complete [issue #13](https://github.com/pptvinstall/pptvinstall/issues/13) credential revocation/rotation with out-of-band proof. The health JSON's `email: true` is configuration presence, **not** a successful test message.
- [ ] Review [issue #22](https://github.com/pptvinstall/pptvinstall/issues/22) / [draft PR #23](https://github.com/pptvinstall/pptvinstall/pull/23): booking time zone, unitemized fuel, missing confirmation queue. CI for PR #23 passed, but the PR remains draft and explicitly requires owner approval before merge/deploy.
- [ ] After confirming the exact Render service, reconcile [CUTOVER_CHECKLIST.md](CUTOVER_CHECKLIST.md), [PRODUCTION_BASELINE.md](PRODUCTION_BASELINE.md), `render.yaml`, and any stale staging instructions.

**Incident closure requires both:** (1) documented actual exit exception + resolution/justified disposition of the alerted service, and (2) a fresh production health check showing canonical SHA and no unexpected restarts.
