DROP POLICY IF EXISTS "anyone can insert analytics events" ON public.analytics_events;

CREATE POLICY "anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_type IN ('page_view','search','impression','listing_click','lead_call','lead_website','lead_directions','lead_email','lead_form','lead_submit','lead_start')
  AND length(coalesce(path, '')) <= 512
  AND length(coalesce(query, '')) <= 256
  AND length(coalesce(referrer, '')) <= 1024
  AND length(coalesce(visitor_id, '')) <= 128
  AND length(coalesce(city_slug, '')) <= 128
  AND length(coalesce(state_slug, '')) <= 128
  AND length(coalesce(condition_slug, '')) <= 128
  AND length(coalesce(nct_id, '')) <= 32
  AND pg_column_size(meta) <= 4096
  AND occurred_at <= now() + interval '5 minutes'
);

DROP POLICY IF EXISTS "Backend service can read automation secrets" ON public.automation_secrets;