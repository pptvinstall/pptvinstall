# Production deployment safety — October 21, 2026

## Live service (do not suspend)

- Render service ID: `srv-d20nkpjipnbc73dfnk10`; historic display name `PPTVInstall-Release-Candidate`.
- Connected repository/branch: `pptvinstall/pptvinstall:main`; deploy on commit.
- External **Neon** PostgreSQL; **not** a Render-managed `pserv` database.
- Baseline before incident fix: `9802210a84f200f08b0d9bb1ea40c2a4ed19da95`.
- The old `render.yaml` does **not** reflect the actual Render service; never click Blueprint Sync or provision an additional DB using it.

## Temporary safe automatic pre-deploy gate

The current Render service runs `npm run db:push` before every deployment. Running an unreviewed `drizzle-kit push` against production could alter or delete data.

Until Render's pre-deploy setting is removed, `npm run db:push` intentionally performs **no SQL and no database network requests**. The script prints a message and exits successfully. CI checks this behavior.

**Owner action (strongly recommended):** in Render service **Settings → Build & Deploy → Pre-Deploy Command**, remove `npm run db:push` and save. This changes deployment settings, so plan during a quiet period and recheck the resulting deploy history. The nonmutating code guard remains defense-in-depth until all services have a reviewed migration strategy.

For approved migration work, use `npm run db:push:manual` **only** after a Neon backup/restore point, confirmed exact environment/DB host, schema diff review, and explicit owner approval. This command is destructive-capable; NEVER run it as a routine production pre-deploy step. Prefer versioned, reviewed migrations long-term.

## October 21 database disconnect

Render recorded `Error: Connection terminated unexpectedly` from the `@neondatabase/serverless` WebSocket path followed by exit 1. The fix installs an `error` listener on the Neon Pool so an idle connection's error does not become a fatal uncaught EventEmitter event. It logs only a static status message, not the error object. A failed in-flight query can still fail individually and needs normal request-level handling; the listener is not a universal outage fix.

**Security:** The original stack printed an actual Neon DB connection string (including its secret) into private logs. Never copy it. Rotate the Neon credential, update Render `DATABASE_URL`, verify healthy DB connectivity, revoke the old credential, and restrict the old log's access. Other credential rotations remain tracked in GitHub issue #13.

## Release checks

1. Verify successful GitHub CI (type-check, pricing, jobos, site, build) and a code review.
2. Confirm no schema changes are present in the fix (besides the protective pre-deploy script and tests).
3. Merge the fix on `main`; auto-deploy should pick up the tested commit.
4. Read Render Deploys for success; ensure pre-deploy log says automatic schema push disabled.
5. Request `/healthz` and `/api/health`; confirm production and expected canonical `deploymentSha`, database and email configured. Configuration presence is not proof of delivery.
6. Check Render Logs/Events for new uncaught pool errors and `server_failed`; compare uptime/traffic.
7. Avoid synthetic production bookings/emails/payments. Test customer flows on isolated staging with suppressed outbound.
8. Keep Rollback SHA and incident #24 updated. Follow credential rotation (#13) and booking PR #23 independently.

Do not rotate production secrets or alter custom domains as an incidental part of this crash fix.
