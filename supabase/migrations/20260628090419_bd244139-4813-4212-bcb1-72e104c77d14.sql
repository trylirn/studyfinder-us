
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Extend clinics
ALTER TABLE public.clinics
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS gallery_images text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS claim_status text NOT NULL DEFAULT 'unclaimed',
  ADD COLUMN IF NOT EXISTS recruiting_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS clinics_state_idx ON public.clinics(state);
CREATE INDEX IF NOT EXISTS clinics_recruiting_count_idx ON public.clinics(recruiting_count DESC);
CREATE INDEX IF NOT EXISTS clinics_plan_featured_until_idx ON public.clinics(plan, featured_until);
CREATE INDEX IF NOT EXISTS clinics_name_trgm_idx ON public.clinics USING gin (name gin_trgm_ops);

-- 2. Link locations to clinics
ALTER TABLE public.locations
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS locations_clinic_id_idx ON public.locations(clinic_id);
CREATE INDEX IF NOT EXISTS locations_latlng_idx ON public.locations(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- 3. clinic_claims table
CREATE TABLE IF NOT EXISTS public.clinic_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  note text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.clinic_claims TO authenticated;
GRANT ALL ON public.clinic_claims TO service_role;
ALTER TABLE public.clinic_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see their own claims" ON public.clinic_claims;
CREATE POLICY "users see their own claims" ON public.clinic_claims
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "users create own claims" ON public.clinic_claims;
CREATE POLICY "users create own claims" ON public.clinic_claims
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "admin updates claims" ON public.clinic_claims;
CREATE POLICY "admin updates claims" ON public.clinic_claims
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS clinic_claims_user_id_idx ON public.clinic_claims(user_id);
CREATE INDEX IF NOT EXISTS clinic_claims_clinic_id_idx ON public.clinic_claims(clinic_id);

-- 4. nearby_sites: haversine distance in miles
CREATE OR REPLACE FUNCTION public.nearby_sites(
  _lat double precision,
  _lng double precision,
  _radius_mi double precision,
  _nct_id text DEFAULT NULL
)
RETURNS TABLE (
  id bigint, nct_id text, facility text, city text, state text, zip text,
  status text, lat double precision, lng double precision, clinic_id uuid, distance_mi double precision
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT l.id, l.nct_id, l.facility, l.city, l.state, l.zip, l.status, l.lat, l.lng, l.clinic_id,
    3958.8 * 2 * asin(sqrt(
      power(sin(radians((l.lat - _lat)/2)), 2) +
      cos(radians(_lat)) * cos(radians(l.lat)) *
      power(sin(radians((l.lng - _lng)/2)), 2)
    )) AS distance_mi
  FROM public.locations l
  WHERE l.lat IS NOT NULL AND l.lng IS NOT NULL
    AND (_nct_id IS NULL OR l.nct_id = _nct_id)
    AND 3958.8 * 2 * asin(sqrt(
      power(sin(radians((l.lat - _lat)/2)), 2) +
      cos(radians(_lat)) * cos(radians(l.lat)) *
      power(sin(radians((l.lng - _lng)/2)), 2)
    )) <= _radius_mi
  ORDER BY distance_mi ASC LIMIT 500;
$$;

-- 5. refresh_directory_counts
CREATE OR REPLACE FUNCTION public.refresh_directory_counts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conditions c SET study_count = COALESCE(sub.cnt, 0)
  FROM (SELECT unnest(condition_slugs) AS slug, count(*)::int AS cnt FROM public.studies
        WHERE brief_summary IS NOT NULL AND overall_status NOT IN ('WITHDRAWN','TERMINATED') GROUP BY 1) sub
  WHERE c.slug = sub.slug;
  UPDATE public.conditions SET study_count = 0 WHERE slug NOT IN (
    SELECT DISTINCT unnest(condition_slugs) FROM public.studies
    WHERE brief_summary IS NOT NULL AND overall_status NOT IN ('WITHDRAWN','TERMINATED'));

  UPDATE public.sponsors s SET study_count = COALESCE(sub.cnt, 0)
  FROM (SELECT sponsor_slug AS slug, count(*)::int AS cnt FROM public.studies
        WHERE brief_summary IS NOT NULL AND overall_status NOT IN ('WITHDRAWN','TERMINATED')
          AND sponsor_slug IS NOT NULL GROUP BY 1) sub
  WHERE s.slug = sub.slug;
  UPDATE public.sponsors SET study_count = 0 WHERE slug NOT IN (
    SELECT DISTINCT sponsor_slug FROM public.studies
    WHERE brief_summary IS NOT NULL AND overall_status NOT IN ('WITHDRAWN','TERMINATED') AND sponsor_slug IS NOT NULL);

  UPDATE public.states st SET study_count = COALESCE(sub.cnt, 0)
  FROM (SELECT unnest(state_slugs) AS slug, count(*)::int AS cnt FROM public.studies
        WHERE brief_summary IS NOT NULL AND overall_status NOT IN ('WITHDRAWN','TERMINATED') GROUP BY 1) sub
  WHERE st.slug = sub.slug;

  UPDATE public.cities ci SET study_count = COALESCE(sub.cnt, 0)
  FROM (SELECT unnest(city_slugs) AS slug, count(*)::int AS cnt FROM public.studies
        WHERE brief_summary IS NOT NULL AND overall_status NOT IN ('WITHDRAWN','TERMINATED') GROUP BY 1) sub
  WHERE ci.slug = sub.slug;

  UPDATE public.clinics cl SET recruiting_count = COALESCE(sub.cnt, 0)
  FROM (SELECT l.clinic_id, count(DISTINCT l.nct_id)::int AS cnt
        FROM public.locations l JOIN public.studies s ON s.nct_id = l.nct_id
        WHERE l.clinic_id IS NOT NULL AND s.overall_status = 'RECRUITING' AND s.brief_summary IS NOT NULL
        GROUP BY l.clinic_id) sub
  WHERE cl.id = sub.clinic_id;
  UPDATE public.clinics SET recruiting_count = 0 WHERE id NOT IN (
    SELECT DISTINCT l.clinic_id FROM public.locations l JOIN public.studies s ON s.nct_id = l.nct_id
    WHERE l.clinic_id IS NOT NULL AND s.overall_status = 'RECRUITING' AND s.brief_summary IS NOT NULL);
END $$;

-- 6. generate_clinics_from_locations
CREATE OR REPLACE FUNCTION public.generate_clinics_from_locations()
RETURNS TABLE(inserted_count int, linked_count int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE ins int := 0; lnk int := 0;
BEGIN
  WITH candidates AS (
    SELECT facility, city, state, max(zip) AS zip, avg(lat) AS lat, avg(lng) AS lng, count(*) AS site_count
    FROM public.locations
    WHERE facility IS NOT NULL AND length(trim(facility)) > 2 AND city IS NOT NULL AND state IS NOT NULL
      AND clinic_id IS NULL
    GROUP BY facility, city, state
  ),
  prepared AS (
    SELECT facility AS name, city, state, zip, lat, lng,
      left(
        regexp_replace(lower(trim(facility)), '[^a-z0-9]+', '-', 'g') || '-' ||
        regexp_replace(lower(city), '[^a-z0-9]+','-','g') || '-' || lower(state),
        120
      ) AS slug
    FROM candidates WHERE site_count >= 1
  ),
  inserted AS (
    INSERT INTO public.clinics (name, slug, city, state, zip, lat, lng, published, claim_status)
    SELECT name, slug, city, state, zip, lat, lng, true, 'unclaimed' FROM prepared
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO ins FROM inserted;

  WITH linked AS (
    UPDATE public.locations l SET clinic_id = c.id
    FROM public.clinics c
    WHERE l.clinic_id IS NULL AND l.facility = c.name AND l.city = c.city AND l.state = c.state
    RETURNING 1
  )
  SELECT count(*) INTO lnk FROM linked;

  RETURN QUERY SELECT ins, lnk;
END $$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS clinics_touch ON public.clinics;
CREATE TRIGGER clinics_touch BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS clinic_claims_touch ON public.clinic_claims;
CREATE TRIGGER clinic_claims_touch BEFORE UPDATE ON public.clinic_claims FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
