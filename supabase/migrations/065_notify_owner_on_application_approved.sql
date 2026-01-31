-- Migration: Notify owner when admin approves a requested application
-- When an application's status is updated to 'approved', create a notification for the application's company owner.

CREATE OR REPLACE FUNCTION notify_owner_on_application_approved()
RETURNS TRIGGER AS $$
BEGIN
  -- Only run when status changes to 'approved'
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Insert notification for the company owner (SECURITY DEFINER bypasses RLS)
  IF NEW.company_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (
      NEW.company_owner_id,
      'Application Approved',
      'application_update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: after update on applications
DROP TRIGGER IF EXISTS notify_owner_on_application_approved_trigger ON applications;
CREATE TRIGGER notify_owner_on_application_approved_trigger
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_application_approved();

COMMENT ON FUNCTION notify_owner_on_application_approved() IS 'Creates a notification for the company owner when admin approves a requested application (status becomes approved). Runs with SECURITY DEFINER to bypass RLS.';
