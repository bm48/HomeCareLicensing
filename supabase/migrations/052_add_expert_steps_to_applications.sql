-- Add is_expert_step and created_by_expert_id fields to application_steps table
-- This allows distinguishing between regular steps and expert-specific steps
-- Note: The application_steps table already exists with the following columns:
--   id, application_id, step_name, step_order, is_completed, completed_at, 
--   completed_by, notes, created_at, updated_at

-- Add is_expert_step column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'application_steps' 
    AND column_name = 'is_expert_step'
  ) THEN
    ALTER TABLE application_steps 
    ADD COLUMN is_expert_step BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add created_by_expert_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'application_steps' 
    AND column_name = 'created_by_expert_id'
  ) THEN
    ALTER TABLE application_steps 
    ADD COLUMN created_by_expert_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add description column if it doesn't exist (used in code but may not be in table)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'application_steps' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE application_steps 
    ADD COLUMN description TEXT;
  END IF;
END $$;

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_application_steps_application 
  ON application_steps(application_id);

CREATE INDEX IF NOT EXISTS idx_application_steps_order 
  ON application_steps(application_id, step_order);

CREATE INDEX IF NOT EXISTS idx_application_steps_expert 
  ON application_steps(is_expert_step) 
  WHERE is_expert_step = true;



CREATE POLICY "Expert can insert own application steps"
  ON application_steps FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM applications WHERE assigned_expert_id = auth.uid()
  ));
CREATE POLICY "Expert can delete own application steps"
  ON application_steps FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM applications WHERE assigned_expert_id = auth.uid()
  ));
CREATE POLICY "Expert can update own application steps"
  ON application_steps FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM applications WHERE assigned_expert_id = auth.uid()
  ));

CREATE POLICY "Admin can update own application steps"
  ON application_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    ));
