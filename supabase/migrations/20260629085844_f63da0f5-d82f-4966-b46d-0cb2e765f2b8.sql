REVOKE EXECUTE ON FUNCTION public.generate_clinics_from_locations() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_directory_counts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.bump_condition_view(text) FROM PUBLIC, anon;