CREATE OR REPLACE FUNCTION public.analytics_breakdown(_from timestamp with time zone, _to timestamp with time zone, _dim text, _limit integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
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
             coalesce(ci.name || ', ' || coalesce(st.abbr, st.name, ''), e.city_slug) AS label,
             count(*) FILTER (WHERE e.event_type = 'impression') AS impressions,
             count(*) FILTER (WHERE e.event_type = 'listing_click') AS clicks,
             count(*) FILTER (WHERE e.event_type = 'search') AS searches,
             count(*) FILTER (WHERE e.event_type LIKE 'lead_%') AS lead_actions,
             count(DISTINCT coalesce(e.visitor_id, e.session_id::text)) AS visitors,
             (ci.slug IS NOT NULL) AS in_directory
      FROM public.analytics_events e
      LEFT JOIN public.cities ci ON ci.slug = e.city_slug
      LEFT JOIN public.states st ON st.slug = ci.state_slug
      WHERE e.occurred_at >= _from AND e.occurred_at < _to AND e.city_slug IS NOT NULL
      GROUP BY e.city_slug, ci.name, st.abbr, st.name, ci.slug
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
$function$;

REVOKE ALL ON FUNCTION public.analytics_breakdown(timestamp with time zone, timestamp with time zone, text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analytics_breakdown(timestamp with time zone, timestamp with time zone, text, integer) TO service_role;