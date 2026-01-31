-- Migration: Notify admins when owner submits a new application request
-- When an application is inserted with status 'requested', create a notification for each admin user.

CREATE OR REPLACE FUNCTION notify_admins_new_application()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  -- Only run when a new application is created with status 'requested'
  IF NEW.status <> 'requested' THEN
    RETURN NEW;
  END IF;

  -- Insert a notification for each admin user (SECURITY DEFINER bypasses RLS)
  FOR admin_record IN
    SELECT id FROM user_profiles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, title, type)
    VALUES (
      admin_record.id,
      'New Application Request',
      'application_update'
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: after insert on applications
DROP TRIGGER IF EXISTS notify_admins_on_new_application_trigger ON applications;
CREATE TRIGGER notify_admins_on_new_application_trigger
  AFTER INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_new_application();

COMMENT ON FUNCTION notify_admins_new_application() IS 'Creates a notification for each admin when an owner submits a new application (status requested). Runs with SECURITY DEFINER to bypass RLS.';
