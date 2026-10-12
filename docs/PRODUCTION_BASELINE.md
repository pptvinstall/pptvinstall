# Production Baseline

Verified live on 2026-10-12 against `https://pptvinstall.com/healthz` and `https://pptvinstall.com/api/health`.

| Item | Value |
| --- | --- |
| Canonical source repo | `pptvinstall/pptvinstall` |
| Branch | `main` |
| Live deployment SHA | `8b30663fdfe4d38319f458c6c973ad350a55d0f4` (`8b30663`) |
| Live HEAD subject | "Add partner and referral landing page" |
| Live SHA matches canonical `main`? | Yes |
| Hosting | Render (confirmed by live response header `x-render-origin-server: Render`) |
| Domain | `pptvinstall.com` |
| Live health | `/healthz` returned HTTP 200; `/api/health` returned HTTP 200 on verification |

## Source-of-truth rule

`pptvinstall/pptvinstall` `main` is the single canonical application and deployment source. The former `PPTVInstall-Release-Candidate`, `pptvinstall-backend`, and `pptvinstall-booking-app` repositories are legacy references only and must not receive production feature work or be treated as deployment sources.

The former `consolidation/job-os` branch has no unique commits relative to `main`; consolidation work has already been absorbed. New work should branch from canonical `main` and return through normal review/verification.

## What was verified live

- Render is serving canonical commit `8b30663fdfe4d38319f458c6c973ad350a55d0f4`.
- `GET /healthz` returned HTTP 200 with `status: ok`.
- `GET /api/health` returned HTTP 200 and reported production mode, database available, email configured, and deployment SHA `8b30663fdfe4d38319f458c6c973ad350a55d0f4`.
- The live service is behind Cloudflare and Render.

## What was verified from source

- Runtime: Node 22.
- Build: Vite client build plus server bundle to `dist/index.js`; production starts through the repository's production scripts/package configuration.
- Deployment configuration is maintained in `render.yaml` and supporting scripts/workflows.
- Database uses PostgreSQL with Drizzle.
- Sensitive mail/database/admin values are represented as environment variables / non-synced Render secrets in current source rather than literal active credentials.
- Health endpoints and smoke checks are present.

## Remaining operational cautions

- Live `/api/health` reported `status: degraded` during the 2026-10-12 verification because its process-memory health calculation was at 94%. `/healthz` remained healthy and the service was serving traffic. Treat this as an observability/performance follow-up rather than evidence that production is offline.
- A credential previously appeared in public Git history. Current source uses environment variables, but any credential ever committed publicly must be treated as compromised and rotated outside Git.
- Live database contents, secret values, provider account state, and third-party delivery behavior are intentionally not recorded in this document.

## Baseline rule

The live deployment SHA reported by `/api/health` is the behavioral production baseline. It should normally match canonical `pptvinstall/pptvinstall` `main`. If those diverge, stop production feature work until the deployment source and live SHA are reconciled.
