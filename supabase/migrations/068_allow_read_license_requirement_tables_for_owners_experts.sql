-- Allow company owners and experts to read license requirement templates (steps, documents)
-- so the Documents tab and Next Steps can display the requirement template for their application.
-- Admins keep full manage access via existing policies; these add SELECT only for authenticated users.

CREATE POLICY "Authenticated users can read license requirements"
  ON license_requirements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read license requirement steps"
  ON license_requirement_steps FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can read license requirement documents"
  ON license_requirement_documents FOR SELECT
  TO authenticated
  USING (true);
