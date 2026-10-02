# Production Baseline

Verified 2026-10-01 from a fresh clone. Nothing here was changed in production.

| Item | Value |
| --- | --- |
| Source repo | `pptvinstall/PPTVInstall-Release-Candidate` (GitHub reports the slug lower-case: `pptvinstall-release-candidate`) |
| Branch | `main` |
| HEAD SHA | `ecb11f42e8cc1de4e087e2b2e4dad7a99aa6949f` (`ecb11f4`), 2026-09-21 14:24 -0400 |
| HEAD subject | "Protect customer calendar downloads with booking tokens" |
| Matches the SHA named as live? | Yes. RC `main` HEAD equals the known live commit. |
| Render service / domain | `PPTVInstall-Release-Candidate` / `pptvinstall.com`, auto-deploy from RC `main` (as stated by owner; **not verifiable from source**, Render was not queried) |

## What was verified from source
- Runtime: Node 22 (CI uses 22). `npm ci` OK on Node v22.22.2.
- Build: `vite build` (client) + `esbuild` (server bundle to `dist/index.js`); start with `node dist/index.js`.
- Deployment config in source: `render.yaml`, `build-and-run.sh`, `serve-production.sh`, `.github/workflows/ci.yml`.
- Database: Neon PostgreSQL via `@neondatabase/serverless` + Drizzle ORM. Schema is pushed with `drizzle-kit push`; there is **no migrations folder**.
- Env vars (names only, see `.env.example`): `DATABASE_URL`, `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `ANTHROPIC_API_KEY`, `PUBLIC_APP_URL`, `ADMIN_EMAIL`, `EMAIL_FROM`, `PORT`, `ADMIN_API_TOKEN`, `VITE_GA_MEASUREMENT_ID`, `SMS_ENABLED`, `SMS_PROVIDER`, `TWILIO_*`.
- Health: `/api/health` and a ready endpoint; `scripts/smoke-check.js` (`npm run smoke`).

## What could NOT be verified
- That Render is currently serving `ecb11f4` (no Render access, deliberately).
- Live database contents, applied schema state, and production env values.
- Real email, SMS, push and Anthropic behavior (no credentials).
- DNS/domain configuration.

## Baseline rule
Until Render evidence says otherwise, `ecb11f4` is the behavioral baseline. The consolidation branch must match it before any new feature work.
