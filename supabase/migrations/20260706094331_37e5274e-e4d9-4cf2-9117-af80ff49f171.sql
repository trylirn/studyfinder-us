
-- 1) Normalized-name helper for clinic dedupe
CREATE OR REPLACE FUNCTION public.normalize_clinic_name(_name text)
RETURNS text
LANGUAGE sql IMMUTABLE
SET search_path = public
AS $$
  SELECT btrim(regexp_replace(
    regexp_replace(
      regexp_replace(lower(coalesce(_name, '')), '[^a-z0-9 ]+', ' ', 'g'),
      '\y(inc|llc|pc|pa|pllc|corp|ltd|co)\y', ' ', 'g'
    ),
    '\s+', ' ', 'g'
  ));
$$;

-- 2) Replace generator: normalize names + per-city stubs for facility-less rows
CREATE OR REPLACE FUNCTION public.generate_clinics_from_locations()
RETURNS TABLE(inserted_count integer, linked_count integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE ins int := 0; ins2 int := 0; lnk int := 0; lnk2 int := 0; lnk3 int := 0;
BEGIN
  -- Named-facility stubs
  WITH candidates AS (
    SELECT
      btrim(regexp_replace(facility, '\s+', ' ', 'g')) AS name,
      city, state,
      max(zip) AS zip, avg(lat) AS lat, avg(lng) AS lng
    FROM public.locations
    WHERE facility IS NOT NULL AND length(btrim(facility)) > 2
      AND city IS NOT NULL AND state IS NOT NULL AND clinic_id IS NULL
    GROUP BY 1, 2, 3
  ),
  prepared AS (
    SELECT name, city, state, zip, lat, lng,
      left(
        regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g') || '-' ||
        regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') || '-' || lower(state),
        120
      ) AS slug
    FROM candidates
  ),
  inserted AS (
    INSERT INTO public.clinics (name, slug, city, state, zip, lat, lng, published, claim_status)
    SELECT name, slug, city, state, zip, lat, lng, true, 'unclaimed' FROM prepared
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO ins FROM inserted;

  -- Link by normalized name equality
  WITH linked AS (
    UPDATE public.locations l SET clinic_id = c.id
    FROM public.clinics c
    WHERE l.clinic_id IS NULL AND l.facility IS NOT NULL
      AND btrim(regexp_replace(l.facility, '\s+', ' ', 'g')) = c.name
      AND l.city = c.city AND l.state = c.state
    RETURNING 1
  )
  SELECT count(*) INTO lnk FROM linked;

  -- Link by slug fallback (handles collisions on same normalized slug)
  WITH linked AS (
    UPDATE public.locations l SET clinic_id = c.id
    FROM public.clinics c
    WHERE l.clinic_id IS NULL AND l.facility IS NOT NULL
      AND c.slug = left(
        regexp_replace(lower(btrim(regexp_replace(l.facility, '\s+', ' ', 'g'))), '[^a-z0-9]+', '-', 'g') || '-' ||
        regexp_replace(lower(l.city), '[^a-z0-9]+', '-', 'g') || '-' || lower(l.state),
        120)
    RETURNING 1
  )
  SELECT count(*) INTO lnk2 FROM linked;

  -- Per-city fallback stubs for rows with no facility name
  WITH stub_candidates AS (
    SELECT city, state,
      max(zip) AS zip, avg(lat) AS lat, avg(lng) AS lng
    FROM public.locations
    WHERE clinic_id IS NULL AND city IS NOT NULL AND state IS NOT NULL
      AND (facility IS NULL OR length(btrim(facility)) <= 2)
    GROUP BY city, state
  ),
  stub_prep AS (
    SELECT
      'Research site — ' || city || ', ' || state AS name,
      'research-site-' || regexp_replace(lower(city), '[^a-z0-9]+', '-', 'g') || '-' || lower(state) AS slug,
      city, state, zip, lat, lng
    FROM stub_candidates
  ),
  stub_ins AS (
    INSERT INTO public.clinics (name, slug, city, state, zip, lat, lng, published, claim_status)
    SELECT name, slug, city, state, zip, lat, lng, true, 'unclaimed' FROM stub_prep
    ON CONFLICT (slug) DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO ins2 FROM stub_ins;

  -- Link facility-less rows to per-city stubs
  WITH linked AS (
    UPDATE public.locations l SET clinic_id = c.id
    FROM public.clinics c
    WHERE l.clinic_id IS NULL AND l.city IS NOT NULL AND l.state IS NOT NULL
      AND (l.facility IS NULL OR length(btrim(l.facility)) <= 2)
      AND c.slug = 'research-site-' ||
        regexp_replace(lower(l.city), '[^a-z0-9]+', '-', 'g') || '-' || lower(l.state)
    RETURNING 1
  )
  SELECT count(*) INTO lnk3 FROM linked;

  RETURN QUERY SELECT (ins + ins2)::int, (lnk + lnk2 + lnk3)::int;
END $$;

-- 3) Duplicate-clinic merger
CREATE OR REPLACE FUNCTION public.merge_duplicate_clinics()
RETURNS TABLE(groups_merged integer, clinics_removed integer)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  g int := 0;
  r int := 0;
  bucket_row record;
  canonical_id uuid;
  dup_id uuid;
  merged_here int;
BEGIN
  CREATE TEMP TABLE _cands ON COMMIT DROP AS
  SELECT
    c.id, c.name, c.state, c.zip, c.lat, c.lng, c.claimed_by, c.created_at,
    public.normalize_clinic_name(c.name) AS nname,
    CASE
      WHEN c.zip IS NOT NULL AND length(btrim(c.zip)) > 0
        THEN c.state || '|z|' || btrim(c.zip)
      WHEN c.lat IS NOT NULL AND c.lng IS NOT NULL
        THEN c.state || '|c|' || round(c.lat::numeric, 3)::text || ',' || round(c.lng::numeric, 3)::text
      ELSE NULL
    END AS bucket,
    (SELECT count(*) FROM public.locations l WHERE l.clinic_id = c.id) AS loc_count
  FROM public.clinics c
  WHERE c.slug NOT LIKE 'research-site-%'
    AND c.state IS NOT NULL
    AND (
      (c.zip IS NOT NULL AND length(btrim(c.zip)) > 0)
      OR (c.lat IS NOT NULL AND c.lng IS NOT NULL)
    );

  CREATE INDEX ON _cands(bucket);

  FOR bucket_row IN
    SELECT bucket
    FROM _cands
    WHERE bucket IS NOT NULL AND length(nname) >= 3
    GROUP BY bucket
    HAVING count(*) > 1
  LOOP
    merged_here := 0;
    LOOP
      canonical_id := NULL; dup_id := NULL;

      SELECT c1.id, c2.id INTO canonical_id, dup_id
      FROM _cands c1
      JOIN _cands c2
        ON c1.bucket = c2.bucket AND c1.id <> c2.id
      WHERE c1.bucket = bucket_row.bucket
        AND length(c1.nname) >= 3 AND length(c2.nname) >= 3
        AND c2.claimed_by IS NULL
        AND (c1.claimed_by IS NULL OR c2.claimed_by IS NULL OR c1.claimed_by = c2.claimed_by)
        AND (
          c1.nname = c2.nname
          OR (length(c1.nname) >= 8 AND length(c2.nname) >= 8
              AND (position(c2.nname in c1.nname) > 0 OR position(c1.nname in c2.nname) > 0))
          OR public.similarity(c1.nname, c2.nname) >= 0.72
        )
      ORDER BY
        (c1.claimed_by IS NOT NULL) DESC,
        c1.loc_count DESC,
        length(c1.nname) ASC,
        c1.created_at ASC,
        c1.id ASC
      LIMIT 1;

      EXIT WHEN canonical_id IS NULL OR dup_id IS NULL;

      UPDATE public.locations         SET clinic_id = canonical_id WHERE clinic_id = dup_id;
      UPDATE public.clinic_claims     SET clinic_id = canonical_id WHERE clinic_id = dup_id;
      UPDATE public.clinic_images     SET clinic_id = canonical_id WHERE clinic_id = dup_id;
      UPDATE public.lead_delivery_log SET clinic_id = canonical_id WHERE clinic_id = dup_id;

      UPDATE public.clinics tgt SET
        address            = COALESCE(tgt.address, src.address),
        zip                = COALESCE(tgt.zip, src.zip),
        lat                = COALESCE(tgt.lat, src.lat),
        lng                = COALESCE(tgt.lng, src.lng),
        phone              = COALESCE(tgt.phone, src.phone),
        website            = COALESCE(tgt.website, src.website),
        hero_image         = COALESCE(tgt.hero_image, src.hero_image),
        description        = COALESCE(tgt.description, src.description),
        intake_email       = COALESCE(tgt.intake_email, src.intake_email),
        intake_webhook_url = COALESCE(tgt.intake_webhook_url, src.intake_webhook_url)
      FROM public.clinics src
      WHERE tgt.id = canonical_id AND src.id = dup_id;

      DELETE FROM public.clinics WHERE id = dup_id;
      DELETE FROM _cands WHERE id = dup_id;

      UPDATE _cands
        SET loc_count = (SELECT count(*) FROM public.locations WHERE clinic_id = canonical_id)
      WHERE id = canonical_id;

      r := r + 1;
      merged_here := merged_here + 1;
    END LOOP;

    IF merged_here > 0 THEN g := g + 1; END IF;
  END LOOP;

  PERFORM public.refresh_directory_counts();
  RETURN QUERY SELECT g, r;
END $$;
