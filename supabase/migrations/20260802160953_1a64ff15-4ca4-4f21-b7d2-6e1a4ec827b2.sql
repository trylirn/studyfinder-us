DO $$
DECLARE
  existing_job record;
BEGIN
  FOR existing_job IN
    SELECT jobname FROM cron.job WHERE jobname = 'trialfinder-import-studies-6h'
  LOOP
    PERFORM cron.unschedule(existing_job.jobname);
  END LOOP;
END $$;

SELECT cron.schedule(
  'trialfinder-import-studies-6h',
  '0 */6 * * *',
  $job$
  SELECT net.http_post(
    url := 'https://studyfinder-us.lovable.app/api/public/cron/import-studies?pages=5&pageSize=100&status=RECRUITING',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT secret FROM public.automation_secrets WHERE name = 'study_import_cron')
    ),
    body := '{}'::jsonb
  );
  $job$
);