SELECT net.http_post(
  url := 'https://id-preview--c1fe87b9-fcf0-4e76-b8cc-2d65acf506ba.lovable.app/api/public/cron/import-studies?pages=1&pageSize=10&status=RECRUITING',
  headers := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', (SELECT secret FROM public.automation_secrets WHERE name = 'study_import_cron')
  ),
  body := '{}'::jsonb
) AS verification_request_id;