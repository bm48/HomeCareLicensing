-- When admin approves (requested -> in_progress), initialize application_steps from main steps only.
-- Remove any broken/old function with the wrong name (e.g. body stored as '1' in dashboard).
DROP FUNCTION IF EXISTS public.initialize_application_steps() CASCADE;
CREATE OR REPLACE FUNCTION initialize_application_steps_on_approval()
RETURNS TRIGGER AS $$
DECLARE
  license_type_name TEXT;
  license_requirement_uuid UUID;
  step_record RECORD;
BEGIN
  -- Only initialize steps when status changes from 'requested' to 'in_progress'
  IF NEW.status = 'in_progress' AND OLD.status = 'requested' AND NEW.license_type_id IS NOT NULL THEN
    -- Get license type name
    SELECT name INTO license_type_name
    FROM license_types
    WHERE id = NEW.license_type_id;

    IF license_type_name IS NULL THEN
      RETURN NEW;
    END IF;

    -- Find license_requirement_id for this state and license type
    SELECT id INTO license_requirement_uuid
    FROM license_requirements
    WHERE state = NEW.state 
      AND license_type = license_type_name
    LIMIT 1;

    IF license_requirement_uuid IS NOT NULL THEN
      -- Create application_steps entries for main steps only (expert steps are added later by experts)
      FOR step_record IN
        SELECT step_name, step_order, instructions
        FROM license_requirement_steps
        WHERE license_requirement_id = license_requirement_uuid
          AND COALESCE(is_expert_step, false) = false
        ORDER BY step_order
      LOOP
        INSERT INTO application_steps (application_id, step_name, step_order, instructions, is_completed)
        VALUES (NEW.id, step_record.step_name, step_record.step_order, step_record.instructions, FALSE)
        ON CONFLICT DO NOTHING;
      END LOOP;

      -- Progress will be recalculated automatically by the trigger when steps are inserted
      -- Initial progress will be 0% since no documents uploaded and no steps completed
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- CREATE TRIGGER initialize_application_steps_on_approval_trigger
--   AFTER UPDATE ON applications
--   FOR EACH ROW
--   EXECUTE FUNCTION initialize_application_steps_on_approval();
