-- Owner document schema additions from mission/owner-tool-polish.
-- Run only against the verified existing Job OS database before deploying this branch.
-- No customer prices, pricing modes, bookings, payments or existing document numbers are changed.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS contact jsonb;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS quote_number integer;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS due_date varchar(10);
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.document_counters (
  name varchar(20) PRIMARY KEY,
  last_seq integer NOT NULL DEFAULT 0
);

-- If a prior partial rollout already assigned numbers, resume above them.
-- Never move an existing counter backwards or renumber a quote.
INSERT INTO public.document_counters (name, last_seq)
SELECT 'estimate', COALESCE(MAX(quote_number), 0) FROM public.quotes
ON CONFLICT (name) DO UPDATE
SET last_seq = GREATEST(document_counters.last_seq, EXCLUDED.last_seq);

COMMIT;
