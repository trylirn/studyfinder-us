
REVOKE EXECUTE ON FUNCTION public.refresh_directory_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_clinics_from_locations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_directory_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_clinics_from_locations() TO service_role;
