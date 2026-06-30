GRANT SELECT ON public.clinics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;

GRANT SELECT ON public.clinic_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_images TO authenticated;
GRANT ALL ON public.clinic_images TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_claims TO authenticated;
GRANT ALL ON public.clinic_claims TO service_role;

GRANT ALL ON public.lead_delivery_log TO service_role;
GRANT ALL ON public.condition_views TO service_role;

GRANT SELECT ON public.study_simplifications TO anon;
GRANT SELECT ON public.study_simplifications TO authenticated;
GRANT ALL ON public.study_simplifications TO service_role;