
-- 1) Hide sensitive clinic contact-infrastructure columns from public roles.
--    Anon and authenticated can still read the rest of the clinics row under
--    the existing published=true SELECT policy; only intake_email and
--    intake_webhook_url are removed from their column-level SELECT grant.
--    The service_role (used by trusted server handlers) retains full access.
REVOKE SELECT ON public.clinics FROM anon, authenticated;

GRANT SELECT (
  id, slug, name, city, state, zip, lat, lng,
  phone, website, description, specialties, hero_image,
  plan, featured_until, recruiting_count, claim_status,
  claimed_by, published, created_at, updated_at
) ON public.clinics TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;

-- 2) Lock down SECURITY DEFINER functions so they cannot be invoked
--    directly through PostgREST. The functions still work when referenced
--    internally (RLS policies, other definer functions, service_role calls),
--    but anon/authenticated can no longer call them as RPC endpoints.
REVOKE EXECUTE ON FUNCTION public.bump_condition_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_condition_view(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.nearby_sites(double precision, double precision, double precision, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_sites(double precision, double precision, double precision, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.refresh_directory_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_directory_counts() TO service_role;

REVOKE EXECUTE ON FUNCTION public.generate_clinics_from_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_clinics_from_locations() TO service_role;

-- has_role is referenced by RLS policies; authenticated users must retain
-- EXECUTE for those policies to evaluate, but anon does not need it.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
