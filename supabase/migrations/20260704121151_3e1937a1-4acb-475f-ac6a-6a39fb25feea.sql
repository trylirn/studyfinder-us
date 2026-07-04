-- Lock down EXECUTE on SECURITY DEFINER functions in public schema.
-- These are now invoked only from server code via service role (supabaseAdmin),
-- so anon/authenticated roles do not need EXECUTE.
REVOKE EXECUTE ON FUNCTION public.nearby_sites(double precision, double precision, double precision, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_sites(double precision, double precision, double precision, text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.bump_condition_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_condition_view(text) TO service_role;

REVOKE EXECUTE ON FUNCTION public.refresh_directory_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_directory_counts() TO service_role;

REVOKE EXECUTE ON FUNCTION public.generate_clinics_from_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_clinics_from_locations() TO service_role;
