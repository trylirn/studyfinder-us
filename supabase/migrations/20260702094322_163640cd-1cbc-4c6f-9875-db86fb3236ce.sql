
-- Move has_role() to a private schema so PostgREST no longer exposes it
-- while all internal RLS policies keep working through a schema-qualified reference.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
-- authenticated must retain EXECUTE for RLS policies referencing it,
-- but the function is not in an exposed schema so it is not a REST endpoint.
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Rewrite every policy that currently references public.has_role
-- to call private.has_role instead, then drop the public copy.

-- public.user_roles
DROP POLICY IF EXISTS "users read own roles" ON public.user_roles;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));

-- public.states / cities / conditions / sponsors / studies / locations (admin write)
DROP POLICY IF EXISTS "admin write states" ON public.states;
CREATE POLICY "admin write states" ON public.states FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write cities" ON public.cities;
CREATE POLICY "admin write cities" ON public.cities FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write conditions" ON public.conditions;
CREATE POLICY "admin write conditions" ON public.conditions FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write sponsors" ON public.sponsors;
CREATE POLICY "admin write sponsors" ON public.sponsors FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write studies" ON public.studies;
CREATE POLICY "admin write studies" ON public.studies FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admin write locations" ON public.locations;
CREATE POLICY "admin write locations" ON public.locations FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- import_runs
DROP POLICY IF EXISTS "admin read import_runs" ON public.import_runs;
CREATE POLICY "admin read import_runs" ON public.import_runs FOR SELECT TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin write import_runs" ON public.import_runs;
CREATE POLICY "admin write import_runs" ON public.import_runs FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- clinics
DROP POLICY IF EXISTS "clinic admin updates own" ON public.clinics;
CREATE POLICY "clinic admin updates own" ON public.clinics FOR UPDATE TO authenticated
  USING (claimed_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (claimed_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin inserts clinics" ON public.clinics;
CREATE POLICY "admin inserts clinics" ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin deletes clinics" ON public.clinics;
CREATE POLICY "admin deletes clinics" ON public.clinics FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

-- clinic_images
DROP POLICY IF EXISTS "owner manages clinic images" ON public.clinic_images;
CREATE POLICY "owner manages clinic images" ON public.clinic_images FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id
      AND (c.claimed_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id
      AND (c.claimed_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)))
  );

-- lead_delivery_log
DROP POLICY IF EXISTS "clinic owner reads delivery log" ON public.lead_delivery_log;
CREATE POLICY "clinic owner reads delivery log" ON public.lead_delivery_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.clinics c WHERE c.id = clinic_id
      AND (c.claimed_by = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role)))
  );

-- clinic_claims
DROP POLICY IF EXISTS "users see their own claims" ON public.clinic_claims;
CREATE POLICY "users see their own claims" ON public.clinic_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'::public.app_role));
DROP POLICY IF EXISTS "admin updates claims" ON public.clinic_claims;
CREATE POLICY "admin updates claims" ON public.clinic_claims FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

-- storage.objects (clinic-images bucket policies)
DROP POLICY IF EXISTS "clinic admins write clinic-images" ON storage.objects;
CREATE POLICY "clinic admins write clinic-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic-images' AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.claimed_by = auth.uid()
      AND (storage.foldername(name))[1] = c.id::text)
  ));

DROP POLICY IF EXISTS "clinic admins update clinic-images" ON storage.objects;
CREATE POLICY "clinic admins update clinic-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-images' AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.claimed_by = auth.uid()
      AND (storage.foldername(name))[1] = c.id::text)
  ));

DROP POLICY IF EXISTS "clinic admins delete clinic-images" ON storage.objects;
CREATE POLICY "clinic admins delete clinic-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'clinic-images' AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.claimed_by = auth.uid()
      AND (storage.foldername(name))[1] = c.id::text)
  ));

DROP POLICY IF EXISTS "clinic admins read clinic-images" ON storage.objects;
CREATE POLICY "clinic admins read clinic-images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'clinic-images' AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.clinics c WHERE c.claimed_by = auth.uid()
      AND (storage.foldername(name))[1] = c.id::text)
  ));

-- Now safe to drop the public copy.
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);
