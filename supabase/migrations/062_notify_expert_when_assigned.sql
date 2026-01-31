-- Migration: Notify expert when admin assigns them to an application
-- When an application's assigned_expert_id is set or changed, create a notification for that expert.

CREATE OR REPLACE FUNCTION notify_expert_when_assigned()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when assigned_expert_id is set and has changed (new assignment or reassignment)
  IF NEW.assigned_expert_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.assigned_expert_id IS NOT NULL AND OLD.assigned_expert_id = NEW.assigned_expert_id THEN
    RETURN NEW;
  END IF;

  -- Insert one notification for the assigned expert (SECURITY DEFINER bypasses RLS)
  INSERT INTO notifications (user_id, title, type)
  VALUES (
    NEW.assigned_expert_id,
    'Application Assigned to You',
    'application_update'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: after update on applications
DROP TRIGGER IF EXISTS notify_expert_when_assigned_trigger ON applications;
CREATE TRIGGER notify_expert_when_assigned_trigger
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_expert_when_assigned();

COMMENT ON FUNCTION notify_expert_when_assigned() IS 'Creates a notification for the expert when admin assigns them to an application. Runs with SECURITY DEFINER to bypass RLS.';
