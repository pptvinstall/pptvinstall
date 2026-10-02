# Customer document schema rollout

The owner-document commit adds four nullable fields to existing Job OS tables and one small sequence table. The server reads these fields even when no PDF is requested, so verify/apply them before deploying the branch. A build or passing application test does not establish production schema readiness.

This procedure prepares the existing production lineage; it does not initialize a new database. Do not run `scripts/run-migrations.sh`, `scripts/db-init.ts`, or an unreviewed broad `db:push` as a substitute. They touch more than this document change.

## Before merge/deploy

1. Verify the database identity from the current production service configuration without printing credentials. Record the intended database name and deployed SHA.
2. Take the provider's normal snapshot/backup or a recoverable database branch and record its identifier. Keep existing production data intact.
3. Use a read-only database session to confirm `public.jobs`, `public.quotes`, and `public.invoices` exist. Confirm the current pricing config still has Shadow mode and that customer catalog values match the baseline.
4. Inspect the additions below. If an existing column/table has a different type or constraint, stop and review the mismatch; `IF NOT EXISTS` deliberately does not replace it.

```sql
SELECT current_database() AS database_name, current_schema() AS schema_name;

SELECT table_name, column_name, data_type, character_maximum_length,
       is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'jobs' AND column_name = 'contact')
    OR (table_name = 'quotes' AND column_name = 'quote_number')
    OR (table_name = 'invoices' AND column_name IN ('due_date', 'notes'))
    OR table_name = 'document_counters')
ORDER BY table_name, ordinal_position;

SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = to_regclass('public.document_counters');
```

Expected shape:

| Table | Field | Type | Nullable/default |
| --- | --- | --- | --- |
| jobs | contact | jsonb | nullable |
| quotes | quote_number | integer | nullable |
| invoices | due_date | varchar(10) | nullable |
| invoices | notes | text | nullable |
| document_counters | name | varchar(20) | primary key, not null |
| document_counters | last_seq | integer | not null, default 0 |

Record row counts for jobs, quotes, quote_versions, invoices, payments, bookings and pricing_configs before running the migration. Save an internal comparison of the active pricing config/catalog and existing quote/invoice identifiers. Keep any customer data in the approved private evidence location.

## Apply the exact additive migration

Use the verified database connection from the service environment. Do not paste its URL into chat, logs or command history. An operator can run the following in a secure shell with `DATABASE_URL` already populated:

```sh
psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 -f scripts/migrate-owner-documents.sql
```

Alternatively, run the exact file in the provider's authenticated SQL console. The script executes in one transaction with a five-second lock timeout and a thirty-second statement timeout. A lock or statement error rolls back the transaction; do not disable the timeouts to force it through an active workload. Schedule a quiet window and retry after checking the blocker.

The migration only adds nullable columns and the document sequence table. It seeds/advances the estimate counter to at least the largest existing quote number, preserving every assigned number. It is safe to rerun with the expected schema; it never reduces the counter.

## Verify before allowing deployment

Repeat the shape and constraint queries. Require all six fields with the expected definitions and the name primary key. Repeat row-count and pricing/catalog comparisons; no existing business records or prices should differ because of this migration. Confirm sequence state:

```sql
SELECT c.last_seq, COALESCE(MAX(q.quote_number), 0) AS largest_assigned
FROM public.document_counters c
LEFT JOIN public.quotes q ON true
WHERE c.name = 'estimate'
GROUP BY c.last_seq;
```

Require `last_seq >= largest_assigned`. Verify existing quote numbers are not duplicated before proceeding:

```sql
SELECT quote_number, COUNT(*)
FROM public.quotes
WHERE quote_number IS NOT NULL
GROUP BY quote_number
HAVING COUNT(*) > 1;
```

This query must return no rows. Stop for an owner review if any duplicate is found; the migration does not renumber existing estimates.

Only then merge/deploy the verified green SHA using the normal workflow. Verify the exact Render SHA, readiness, owner/customer pages, and synthetic estimate/invoice/paid-receipt PDFs. Reconfirm Shadow, Dynamic OFF, and public catalog pricing. Do not send real customer communications or create real bookings during checks.

## Rollback

If application verification fails, redeploy the recorded previous production SHA and leave these compatible nullable additions and sequence data in place. They do not require a destructive schema rollback. If migration application itself fails, its transaction rolls back; verify shape before retrying. Do not drop columns/tables, reset sequences, delete records, or restore a backup over newer production writes as a routine rollback.

## Access blocker

Without production database access and service/deployment verification, mark schema application and production rollout **unverified** and keep the merge/deploy blocked. The local PGlite preservation/idempotence test verifies the migration text, not the live database state.
