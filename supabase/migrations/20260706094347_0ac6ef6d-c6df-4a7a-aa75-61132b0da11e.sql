
REVOKE EXECUTE ON FUNCTION public.generate_clinics_from_locations() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.merge_duplicate_clinics() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.normalize_clinic_name(text) FROM anon, authenticated, public;
