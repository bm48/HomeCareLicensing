-- Allow company owners to read and modify application_steps for their own applications.
-- Fixes: "new row violates row-level security policy for table application_steps"
-- when the owner creates an application (copyExpertStepsFromRequirementToApplication)
-- or when the owner completes a step (insert/update in ApplicationDetailContent).

DROP POLICY IF EXISTS "Company owners can view own application steps" ON application_steps;
CREATE POLICY "Company owners can view own application steps"
  ON application_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_steps.application_id
      AND applications.company_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company owners can insert own application steps" ON application_steps;
CREATE POLICY "Company owners can insert own application steps"
  ON application_steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_steps.application_id
      AND applications.company_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company owners can update own application steps" ON application_steps;
CREATE POLICY "Company owners can update own application steps"
  ON application_steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_steps.application_id
      AND applications.company_owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company owners can delete own application steps" ON application_steps;
CREATE POLICY "Company owners can delete own application steps"
  ON application_steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = application_steps.application_id
      AND applications.company_owner_id = auth.uid()
    )
  );
