CREATE TABLE IF NOT EXISTS public.automation_secrets (
  name text PRIMARY KEY,
  secret text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  rotated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.automation_secrets TO service_role;
REVOKE ALL ON public.automation_secrets FROM anon, authenticated;
ALTER TABLE public.automation_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.automation_secrets (name, secret)
VALUES ('study_import_cron', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

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