
DROP POLICY IF EXISTS "clinic admins write clinic-images" ON storage.objects;
CREATE POLICY "clinic admins write clinic-images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'clinic-images' AND (public.has_role(auth.uid(), 'clinic_admin') OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "clinic admins update clinic-images" ON storage.objects;
CREATE POLICY "clinic admins update clinic-images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'clinic-images' AND (public.has_role(auth.uid(), 'clinic_admin') OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "clinic admins delete clinic-images" ON storage.objects;
CREATE POLICY "clinic admins delete clinic-images" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'clinic-images' AND (public.has_role(auth.uid(), 'clinic_admin') OR public.has_role(auth.uid(), 'admin')));

DROP POLICY IF EXISTS "clinic admins read clinic-images" ON storage.objects;
CREATE POLICY "clinic admins read clinic-images" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'clinic-images' AND (public.has_role(auth.uid(), 'clinic_admin') OR public.has_role(auth.uid(), 'admin')));
