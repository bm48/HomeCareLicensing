-- Allow authenticated users (company owners, experts) to read license requirement templates
-- so they can download admin-uploaded templates on the application detail Templates tab.

CREATE POLICY "Authenticated users can read license requirement templates"
  ON public.license_requirement_templates
  FOR SELECT
  TO authenticated
  USING (true);
