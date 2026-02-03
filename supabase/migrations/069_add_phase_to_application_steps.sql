-- Add phase column to application_steps for expert steps (align with license requirement expert steps)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'application_steps'
    AND column_name = 'phase'
  ) THEN
    ALTER TABLE application_steps
    ADD COLUMN phase TEXT;
  END IF;
END $$;
