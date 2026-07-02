-- Raise per-call statement timeout for the heavy directory refresh, and add supporting indexes to make it fast enough within a request.
ALTER FUNCTION public.refresh_directory_counts() SET statement_timeout = '600s';

CREATE INDEX IF NOT EXISTS idx_studies_condition_slugs_gin ON public.studies USING GIN (condition_slugs);
CREATE INDEX IF NOT EXISTS idx_studies_state_slugs_gin ON public.studies USING GIN (state_slugs);
CREATE INDEX IF NOT EXISTS idx_studies_city_slugs_gin ON public.studies USING GIN (city_slugs);
CREATE INDEX IF NOT EXISTS idx_studies_sponsor_slug ON public.studies (sponsor_slug) WHERE sponsor_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_studies_status_summary ON public.studies (overall_status) WHERE brief_summary IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_clinic_nct ON public.locations (clinic_id, nct_id) WHERE clinic_id IS NOT NULL;
