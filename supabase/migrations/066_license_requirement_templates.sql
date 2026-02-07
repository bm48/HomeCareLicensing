-- Document templates for license requirements (sample documents admins can upload for agency admins to download).
-- Ensure a storage bucket named "license-templates" exists in Supabase Storage (public or with appropriate RLS) for uploads.
--
-- If the table doesn't appear after running: the SQL Editor runs all statements in one transaction; if any
-- statement fails (e.g. policy), the whole transaction rolls back. Run "Part 1" first, then "Part 2".

-- Part 1: Table and RLS (run this first)
CREATE TABLE IF NOT EXISTS public.license_requirement_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  license_requirement_id UUID REFERENCES public.license_requirements(id) ON DELETE CASCADE NOT NULL,
  template_name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requirement_templates_requirement ON public.license_requirement_templates(license_requirement_id);

ALTER TABLE public.license_requirement_templates ENABLE ROW LEVEL SECURITY;

-- Part 2: Policy and comment (run after Part 1; if this fails, the table from Part 1 will still exist)
DROP POLICY IF EXISTS "Admins can manage requirement templates" ON public.license_requirement_templates;
CREATE POLICY "Admins can manage requirement templates"
  ON public.license_requirement_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

COMMENT ON TABLE public.license_requirement_templates IS 'Sample document templates per license requirement that agency admins can download when their application is approved.';
