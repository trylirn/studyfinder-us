
-- Fix 1: clinics_intake_webhook_intake_email_public
-- Revoke column-level SELECT on sensitive intake fields from anon (and authenticated non-owners).
-- App code already uses supabaseAdmin or explicit column selection for legitimate access.
REVOKE SELECT ON public.clinics FROM anon, authenticated;
GRANT SELECT (
  id, slug, name, description, city, state, zip, address, lat, lng, phone, website,
  hero_image, gallery_images, specialties, equipment, plan, featured_until,
  claim_status, claimed_by, published, recruiting_count, created_at, updated_at
) ON public.clinics TO anon, authenticated;
-- service_role retains full ALL (for supabaseAdmin server-side reads of intake_email/webhook)
GRANT ALL ON public.clinics TO service_role;

-- Fix 2: has_role_security_definer_review
-- Lock down EXECUTE surface: only authenticated role can invoke; revoke from PUBLIC/anon.
-- Function body is already safe (parameterized query against user_roles keyed on _user_id),
-- but reducing execute privilege eliminates any info-probe from anon.
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Fix 3: storage_clinic_images_ownership_not_verified
-- Previous policies compared storage.foldername(c.name) (the clinic's *name* column) to c.id.
-- Correct check: the object's own path first segment must equal a clinic id owned by auth.uid().
DROP POLICY IF EXISTS "clinic admins write clinic-images" ON storage.objects;
DROP POLICY IF EXISTS "clinic admins update clinic-images" ON storage.objects;
DROP POLICY IF EXISTS "clinic admins delete clinic-images" ON storage.objects;
DROP POLICY IF EXISTS "clinic admins read clinic-images" ON storage.objects;

CREATE POLICY "clinic admins read clinic-images"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'clinic-images'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.claimed_by = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = c.id::text
    )
  )
);

CREATE POLICY "clinic admins write clinic-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clinic-images'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.claimed_by = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = c.id::text
    )
  )
);

CREATE POLICY "clinic admins update clinic-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clinic-images'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.claimed_by = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = c.id::text
    )
  )
)
WITH CHECK (
  bucket_id = 'clinic-images'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.claimed_by = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = c.id::text
    )
  )
);

CREATE POLICY "clinic admins delete clinic-images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'clinic-images'
  AND (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.clinics c
      WHERE c.claimed_by = auth.uid()
        AND (storage.foldername(storage.objects.name))[1] = c.id::text
    )
  )
);
