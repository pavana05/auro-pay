
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Unschedule any previous version of this job (idempotent)
DO $$
DECLARE j_id bigint;
BEGIN
  SELECT jobid INTO j_id FROM cron.job WHERE jobname = 'cleanup_teen_lookup_log_daily';
  IF j_id IS NOT NULL THEN PERFORM cron.unschedule(j_id); END IF;
END $$;

SELECT cron.schedule(
  'cleanup_teen_lookup_log_daily',
  '15 3 * * *',  -- 03:15 UTC daily
  $$ DELETE FROM public.teen_lookup_log WHERE created_at < now() - interval '24 hours' $$
);
