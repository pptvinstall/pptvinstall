# Production Baseline

Verified live on 2026-10-12 against `https://pptvinstall.com/healthz` and `https://pptvinstall.com/api/health`.

| Item | Value |
| --- | --- |
| Canonical source repo | `pptvinstall/pptvinstall` |
| Branch | `main` |
| Verified live deployment SHA | `908b4b36011d8a5bc26a1992203ebbe366722458` (`908b4b3`) |
| Verified live change | `fix(monitoring): use real memory pressure signal` |
| Live SHA matched canonical `main` at verification? | Yes |
| Hosting | Render (confirmed by live response header `x-render-origin-server: Render`) |
| Domain | `pptvinstall.com` |
| Live health | `/healthz` HTTP 200; `/api/health` HTTP 200 with `status: healthy` |

## Source-of-truth rule

`pptvinstall/pptvinstall` `main` is the single canonical application and deployment source. The former `PPTVInstall-Release-Candidate`, `pptvinstall-backend`, and `pptvinstall-booking-app` repositories are legacy references only and must not receive production feature work or be treated as deployment sources.

The former `consolidation/job-os` branch has no unique commits relative to `main`; consolidation work has already been absorbed. New work should branch from canonical `main` and return through normal review/verification.

## What was verified live

- Render served canonical commit `908b4b36011d8a5bc26a1992203ebbe366722458` after PR #12 merged.
- `GET /healthz` returned HTTP 200 with `status: ok`.
- `GET /api/health` returned HTTP 200 with `status: healthy`, database available, email configured, and the expected deployment SHA.
- Memory reporting changed from misleading V8 heap occupancy to actual container pressure. On the verified deployment it reported approximately 99 MB used of a 512 MB container budget (19%).
- The live service is behind Cloudflare and Render.

## What was verified from source

- Runtime: Node 22.
- Build: Vite client build plus server bundle to `dist/index.js`; production starts through the repository's production scripts/package configuration.
- Deployment configuration is maintained in `render.yaml` and supporting scripts/workflows.
- Database uses PostgreSQL with Drizzle.
- Sensitive mail/database/admin values are represented as environment variables / non-synced Render secrets in current source rather than literal active credentials.
- Health endpoints and smoke checks are present.
- PR #12 passed CI (type-check, pricing regression tests, Job OS tests, and build) before merge.

## Remaining operational cautions

- Credentials previously appeared in public Git history. Current source uses environment variables, but any credential ever committed publicly must be treated as compromised and rotated outside Git. Track completion in issue #13 without pasting replacement secrets into GitHub.
- Live database contents, secret values, provider account state, and third-party delivery behavior are intentionally not recorded in this document.

## Baseline rule

The live deployment SHA reported by `/api/health` is the behavioral production baseline. It should normally match canonical `pptvinstall/pptvinstall` `main`. If those diverge, stop production feature work until the deployment source and live SHA are reconciled.


## Subsequent live verification — 2026-10-21 (13:40 UTC)

This is a later point-in-time check, **not** a replacement for the preserved 2026-10-12 migration history above.

| Item | 2026-10-21 observation |
| --- | --- |
| URL | `https://pptvinstall.com/healthz` and `https://pptvinstall.com/api/health` |
| Liveness | `status: ok` |
| API health | `status: healthy` |
| Canonical live commit | `9802210a84f200f08b0d9bb1ea40c2a4ed19da95` |
| Canonical `main` head | `9802210a84f200f08b0d9bb1ea40c2a4ed19da95` — **matched exactly** |
| Database | `true` in health response |
| Email configured | `true` in health response; **delivery not independently tested** |
| App environment | `production`; `outboundSuppressed: false` |
| Memory | approximately 113 / 512 MB (22%) |
| Last canonical main commit | October 15, 2026; corresponding GitHub CI completed successfully |

**Separate unclosed Render incident:** a service named historically `PPTVInstall-Release-Candidate` (`srv-d20nkpjipnbc73dfnk10`) reported exit 1 on October 21 at ~07:08 ET. Public health recovered or remained healthy by the later check, but the alerted service's linked repository/branch, deploy SHA, domains, and actual exception were **not independently accessible**. Do not infer that production is backed by the archived RC repo solely from a service name. See [RENDER_INCIDENT_2026-10-21.md](RENDER_INCIDENT_2026-10-21.md).

**Pending:** Render settings/log inspection, `render.yaml` drift reconciliation, historical Gmail/admin credential rotation (#13), and separately reviewable booking time-zone/confirmation fixes (draft PR #23). A healthy API response does not certify message delivery, customer bookings, or credential rotation.
