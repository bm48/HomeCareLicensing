-- RLS policies for license-templates storage bucket.
-- Fixes "new row violates row-level security policy" when uploading templates.
-- Admins can insert/update/delete; anyone can read (public bucket).

DROP POLICY IF EXISTS "Admins can upload license templates" ON storage.objects;
CREATE POLICY "Admins can upload license templates"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'license-templates'
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Anyone can read license templates" ON storage.objects;
CREATE POLICY "Anyone can read license templates"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'license-templates');

DROP POLICY IF EXISTS "Admins can update license templates" ON storage.objects;
CREATE POLICY "Admins can update license templates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'license-templates'
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    bucket_id = 'license-templates'
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can delete license templates" ON storage.objects;
CREATE POLICY "Admins can delete license templates"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'license-templates'
    AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'admin')
  );
