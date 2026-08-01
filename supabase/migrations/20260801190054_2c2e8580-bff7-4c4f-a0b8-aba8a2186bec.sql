ALTER TABLE public.analytics_events ADD COLUMN IF NOT EXISTS visitor_id text;
CREATE INDEX IF NOT EXISTS analytics_events_visitor_idx ON public.analytics_events (visitor_id) WHERE visitor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS analytics_events_time_idx ON public.analytics_events (occurred_at);

GRANT INSERT ON public.analytics_events TO anon, authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.analytics_path_bucket(_path text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN _path IS NULL THEN 'other'
    WHEN _path = '/' THEN 'homepage'
    WHEN _path LIKE '/search%' THEN 'search'
    WHEN _path LIKE '/conditions%' THEN 'condition pages'
    WHEN _path LIKE '/cities%' THEN 'city pages'
    WHEN _path LIKE '/states%' THEN 'state pages'
    WHEN _path LIKE '/clinics%' THEN 'clinic directory'
    WHEN _path LIKE '/studies%' THEN 'study pages'
    WHEN _path LIKE '/sponsors%' THEN 'sponsor pages'
    WHEN _path LIKE '/phase%' THEN 'phase pages'
    WHEN _path LIKE '/recruiting%' THEN 'recruiting page'
    WHEN _path LIKE '/get-matched%' THEN 'get matched quiz'
    ELSE 'other'
  END;
$$;

-- Overview KPIs for a time window
CREATE OR REPLACE FUNCTION public.analytics_overview(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH e AS (
    SELECT * FROM public.analytics_events WHERE occurred_at >= _from AND occurred_at < _to
  )
  SELECT jsonb_build_object(
    'searches', (SELECT count(*) FROM e WHERE event_type = 'search'),
    'impressions', (SELECT count(*) FROM e WHERE event_type = 'impression'),
    'clicks', (SELECT count(*) FROM e WHERE event_type = 'listing_click'),
    'page_views', (SELECT count(*) FROM e WHERE event_type = 'page_view'),
    'lead_actions', (SELECT count(*) FROM e WHERE event_type LIKE 'lead_%'),
    'unique_leads', (SELECT count(DISTINCT coalesce(visitor_id, session_id::text)) FROM e WHERE event_type LIKE 'lead_%'),
    'visitors', (SELECT count(DISTINCT coalesce(visitor_id, session_id::text)) FROM e),
    'sessions', (SELECT count(DISTINCT session_id) FROM e WHERE session_id IS NOT NULL),
    'mobile_visitors', (SELECT count(DISTINCT coalesce(visitor_id, session_id::text)) FROM e WHERE is_mobile),
    'lead_breakdown', coalesce((
      SELECT jsonb_agg(jsonb_build_object('action', t, 'count', c, 'people', p) ORDER BY c DESC)
      FROM (
        SELECT event_type AS t, count(*) AS c,
               count(DISTINCT coalesce(visitor_id, session_id::text)) AS p
        FROM e WHERE event_type LIKE 'lead_%' GROUP BY 1
      ) x), '[]'::jsonb),
    'discovery', coalesce((
      SELECT jsonb_agg(jsonb_build_object('source', s, 'count', c) ORDER BY c DESC)
      FROM (
        SELECT coalesce(nullif(meta->>'source',''), public.analytics_path_bucket(path)) AS s, count(*) AS c
        FROM e WHERE event_type = 'listing_click' GROUP BY 1 ORDER BY 2 DESC LIMIT 12
      ) y), '[]'::jsonb)
  );
$$;

-- Time series bucketed hourly or daily
CREATE OR REPLACE FUNCTION public.analytics_series(_from timestamptz, _to timestamptz, _bucket text DEFAULT 'day')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'bucket', b, 'impressions', impressions, 'clicks', clicks,
      'searches', searches, 'lead_actions', lead_actions) ORDER BY b), '[]'::jsonb)
  FROM (
    SELECT date_trunc(CASE WHEN _bucket = 'hour' THEN 'hour' ELSE 'day' END, occurred_at) AS b,
      count(*) FILTER (WHERE event_type = 'impression') AS impressions,
      count(*) FILTER (WHERE event_type = 'listing_click') AS clicks,
      count(*) FILTER (WHERE event_type = 'search') AS searches,
      count(*) FILTER (WHERE event_type LIKE 'lead_%') AS lead_actions
    FROM public.analytics_events
    WHERE occurred_at >= _from AND occurred_at < _to
    GROUP BY 1
  ) s;
$$;

-- Breakdown by dimension: city | state | clinic | condition | study
CREATE OR REPLACE FUNCTION public.analytics_breakdown(
  _from timestamptz, _to timestamptz, _dim text, _limit int DEFAULT 25
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE res jsonb;
BEGIN
  IF _dim = 'clinic' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO res FROM (
      SELECT c.slug AS key,
             coalesce(c.name, 'Unknown') || ' — ' || coalesce(c.city,'') || ', ' || coalesce(c.state,'') AS label,
             count(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
             count(*) FILTER (WHERE e.event_type = 'listing_click') AS clicks,
             count(*) FILTER (WHERE e.event_type LIKE 'lead_%') AS lead_actions,
             count(DISTINCT coalesce(e.visitor_id, e.session_id::text)) FILTER (WHERE e.event_type LIKE 'lead_%') AS unique_leads,
             count(DISTINCT coalesce(e.visitor_id, e.session_id::text)) AS visitors
      FROM public.analytics_events e
      JOIN public.clinics c ON c.id = e.clinic_id
      WHERE e.occurred_at >= _from AND e.occurred_at < _to AND e.clinic_id IS NOT NULL
      GROUP BY c.slug, c.name, c.city, c.state
      ORDER BY lead_actions DESC, clicks DESC, impressions DESC
      LIMIT _limit
    ) t;
  ELSIF _dim = 'city' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO res FROM (
      SELECT e.city_slug AS key,
             coalesce(ci.name || ', ' || coalesce(ci.state,''), e.city_slug) AS label,
             count(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
             count(*) FILTER (WHERE e.event_type = 'listing_click') AS clicks,
             count(*) FILTER (WHERE e.event_type = 'search') AS searches,
             count(*) FILTER (WHERE e.event_type LIKE 'lead_%') AS lead_actions,
             count(DISTINCT coalesce(e.visitor_id, e.session_id::text)) AS visitors,
             (ci.slug IS NOT NULL) AS in_directory
      FROM public.analytics_events e
      LEFT JOIN public.cities ci ON ci.slug = e.city_slug
      WHERE e.occurred_at >= _from AND e.occurred_at < _to AND e.city_slug IS NOT NULL
      GROUP BY e.city_slug, ci.name, ci.state, ci.slug
      ORDER BY impressions DESC, clicks DESC
      LIMIT _limit
    ) t;
  ELSIF _dim = 'state' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO res FROM (
      SELECT e.state_slug AS key, coalesce(st.name, e.state_slug) AS label,
             count(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
             count(*) FILTER (WHERE e.event_type = 'listing_click') AS clicks,
             count(*) FILTER (WHERE e.event_type = 'search') AS searches,
             count(*) FILTER (WHERE e.event_type LIKE 'lead_%') AS lead_actions,
             count(DISTINCT coalesce(e.visitor_id, e.session_id::text)) AS visitors
      FROM public.analytics_events e
      LEFT JOIN public.states st ON st.slug = e.state_slug
      WHERE e.occurred_at >= _from AND e.occurred_at < _to AND e.state_slug IS NOT NULL
      GROUP BY e.state_slug, st.name
      ORDER BY impressions DESC, clicks DESC
      LIMIT _limit
    ) t;
  ELSIF _dim = 'condition' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO res FROM (
      SELECT e.condition_slug AS key, coalesce(co.name, e.condition_slug) AS label,
             count(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
             count(*) FILTER (WHERE e.event_type = 'listing_click') AS clicks,
             count(*) FILTER (WHERE e.event_type = 'search') AS searches,
             count(*) FILTER (WHERE e.event_type LIKE 'lead_%') AS lead_actions,
             count(DISTINCT coalesce(e.visitor_id, e.session_id::text)) AS visitors
      FROM public.analytics_events e
      LEFT JOIN public.conditions co ON co.slug = e.condition_slug
      WHERE e.occurred_at >= _from AND e.occurred_at < _to AND e.condition_slug IS NOT NULL
      GROUP BY e.condition_slug, co.name
      ORDER BY impressions DESC, clicks DESC
      LIMIT _limit
    ) t;
  ELSIF _dim = 'query' THEN
    SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO res FROM (
      SELECT lower(btrim(e.query)) AS key, lower(btrim(e.query)) AS label,
             count(*) AS searches,
             count(DISTINCT coalesce(e.visitor_id, e.session_id::text)) AS visitors
      FROM public.analytics_events e
      WHERE e.occurred_at >= _from AND e.occurred_at < _to
        AND e.event_type = 'search' AND btrim(coalesce(e.query,'')) <> ''
      GROUP BY 1 ORDER BY searches DESC LIMIT _limit
    ) t;
  ELSE
    res := '[]'::jsonb;
  END IF;
  RETURN res;
END;
$$;

-- Live feed of recent events
CREATE OR REPLACE FUNCTION public.analytics_feed(_limit int DEFAULT 50)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.occurred_at DESC), '[]'::jsonb) FROM (
    SELECT e.id, e.occurred_at, e.event_type, e.path, e.query, e.is_mobile,
           coalesce(e.visitor_id, e.session_id::text) AS visitor, e.session_id,
           e.city_slug, e.state_slug, e.condition_slug, e.nct_id,
           c.name AS clinic_name, c.slug AS clinic_slug, e.meta
    FROM public.analytics_events e
    LEFT JOIN public.clinics c ON c.id = e.clinic_id
    ORDER BY e.occurred_at DESC LIMIT _limit
  ) t;
$$;

-- Session journeys
CREATE OR REPLACE FUNCTION public.analytics_journeys(
  _from timestamptz, _to timestamptz, _converted boolean DEFAULT false, _limit int DEFAULT 30
) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH e AS (
    SELECT ev.*, coalesce(ev.visitor_id, ev.session_id::text) AS visitor, c.name AS clinic_name, c.slug AS clinic_slug
    FROM public.analytics_events ev
    LEFT JOIN public.clinics c ON c.id = ev.clinic_id
    WHERE ev.occurred_at >= _from AND ev.occurred_at < _to AND ev.session_id IS NOT NULL
      AND ev.event_type <> 'impression'
  ),
  s AS (
    SELECT session_id,
      min(visitor) AS visitor,
      min(occurred_at) AS started_at,
      max(occurred_at) AS ended_at,
      count(*) AS steps,
      bool_or(is_mobile) AS is_mobile,
      bool_or(event_type LIKE 'lead_%') AS converted,
      (array_agg(path ORDER BY occurred_at))[1] AS entry_path,
      (array_agg(city_slug ORDER BY occurred_at) FILTER (WHERE city_slug IS NOT NULL))[1] AS city_slug,
      count(*) FILTER (WHERE event_type = 'search') AS searches,
      count(*) FILTER (WHERE event_type = 'listing_click') AS clicks,
      jsonb_agg(jsonb_build_object(
        'at', occurred_at, 'type', event_type, 'path', path, 'query', query,
        'clinic', clinic_name, 'clinic_slug', clinic_slug, 'nct_id', nct_id,
        'city', city_slug, 'condition', condition_slug, 'meta', meta
      ) ORDER BY occurred_at) AS steps_json
    FROM e GROUP BY session_id
  )
  SELECT coalesce(jsonb_agg(row_to_json(t) ORDER BY t.started_at DESC), '[]'::jsonb) FROM (
    SELECT * FROM s
    WHERE (_converted = false OR converted)
    ORDER BY started_at DESC LIMIT _limit
  ) t;
$$;

REVOKE ALL ON FUNCTION public.analytics_overview(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_series(timestamptz, timestamptz, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_breakdown(timestamptz, timestamptz, text, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_feed(int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_journeys(timestamptz, timestamptz, boolean, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.analytics_path_bucket(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_overview(timestamptz, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_series(timestamptz, timestamptz, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_breakdown(timestamptz, timestamptz, text, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_feed(int) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_journeys(timestamptz, timestamptz, boolean, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.analytics_path_bucket(text) TO service_role;