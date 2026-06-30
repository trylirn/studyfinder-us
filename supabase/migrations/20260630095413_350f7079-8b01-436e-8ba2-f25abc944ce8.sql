GRANT SELECT ON public.clinics TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;

GRANT SELECT ON public.locations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.locations TO authenticated;
GRANT ALL ON public.locations TO service_role;

GRANT SELECT ON public.studies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studies TO authenticated;
GRANT ALL ON public.studies TO service_role;

GRANT SELECT ON public.states TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.states TO authenticated;
GRANT ALL ON public.states TO service_role;

GRANT SELECT ON public.conditions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conditions TO authenticated;
GRANT ALL ON public.conditions TO service_role;

GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

GRANT SELECT ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_runs TO authenticated;
GRANT ALL ON public.import_runs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_claims TO authenticated;
GRANT ALL ON public.clinic_claims TO service_role;

GRANT SELECT ON public.clinic_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_images TO authenticated;
GRANT ALL ON public.clinic_images TO service_role;

GRANT SELECT ON public.study_simplifications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_simplifications TO authenticated;
GRANT ALL ON public.study_simplifications TO service_role;

GRANT INSERT ON public.condition_views TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.condition_views TO authenticated;
GRANT ALL ON public.condition_views TO service_role;

GRANT INSERT ON public.lead_delivery_log TO authenticated;
GRANT ALL ON public.lead_delivery_log TO service_role;