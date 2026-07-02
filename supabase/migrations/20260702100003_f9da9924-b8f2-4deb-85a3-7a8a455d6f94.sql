
-- 1) Extend clinic_claims with proof-of-ownership fields
ALTER TABLE public.clinic_claims
  ADD COLUMN IF NOT EXISTS role text,
  ADD COLUMN IF NOT EXISTS relationship text,
  ADD COLUMN IF NOT EXISTS npi text,
  ADD COLUMN IF NOT EXISTS work_website text,
  ADD COLUMN IF NOT EXISTS proof_paths text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS attested boolean NOT NULL DEFAULT false;

-- 2) Storage policies for clinic-images/claims/<userId>/*
--    Authenticated users may upload to their own claims folder; admins may read all.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_images_claims_insert_own'
  ) THEN
    CREATE POLICY "clinic_images_claims_insert_own"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'clinic-images'
        AND (storage.foldername(name))[1] = 'claims'
        AND (storage.foldername(name))[2] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_images_claims_select_own_or_admin'
  ) THEN
    CREATE POLICY "clinic_images_claims_select_own_or_admin"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'clinic-images'
        AND (storage.foldername(name))[1] = 'claims'
        AND (
          (storage.foldername(name))[2] = auth.uid()::text
          OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
        )
      );
  END IF;
END $$;

-- 3) Automated importation via pg_cron + pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Unschedule prior versions to keep this idempotent
DO $$
DECLARE j record;
BEGIN
  FOR j IN SELECT jobname FROM cron.job WHERE jobname IN (
    'trialfinder-import-studies-6h','trialfinder-refresh-counts-nightly'
  ) LOOP
    PERFORM cron.unschedule(j.jobname);
  END LOOP;
END $$;

-- Every 6 hours: incremental import of recruiting US studies (5 pages x 100 = ~500)
SELECT cron.schedule(
  'trialfinder-import-studies-6h',
  '0 */6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://studyfinder-us.lovable.app/api/public/cron/import-studies?pages=5&pageSize=100&status=RECRUITING',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', current_setting('app.cron_secret', true)
    ),
    body := '{}'::jsonb
  );
  $$
);

-- Nightly 08:00 UTC: refresh counts and regenerate clinics from locations
SELECT cron.schedule(
  'trialfinder-refresh-counts-nightly',
  '0 8 * * *',
  $$
  SELECT public.generate_clinics_from_locations();
  SELECT public.refresh_directory_counts();
  $$
);
