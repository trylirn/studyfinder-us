
-- 1. Trial contact fields
ALTER TABLE public.studies
  ADD COLUMN IF NOT EXISTS central_contacts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS overall_officials jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS contacts jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Analytics events
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id bigserial PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  session_id uuid,
  path text,
  is_mobile boolean,
  city_slug text,
  state_slug text,
  condition_slug text,
  clinic_id uuid,
  nct_id text,
  query text,
  referrer text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT ALL ON SEQUENCE public.analytics_events_id_seq TO service_role;

ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "admins can read analytics events"
  ON public.analytics_events FOR SELECT
  TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS analytics_events_occurred_idx ON public.analytics_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_type_time_idx ON public.analytics_events (event_type, occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_city_idx ON public.analytics_events (city_slug) WHERE city_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_state_idx ON public.analytics_events (state_slug) WHERE state_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_clinic_idx ON public.analytics_events (clinic_id) WHERE clinic_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_condition_idx ON public.analytics_events (condition_slug) WHERE condition_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON public.analytics_events (session_id, occurred_at) WHERE session_id IS NOT NULL;
