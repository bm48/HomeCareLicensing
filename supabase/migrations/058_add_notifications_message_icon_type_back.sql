-- Migration: Add message and icon_type back to notifications (nullable) so trigger never fails
-- Resolves: column "message" of relation "notifications" does not exist
-- If the DB still runs the old create_message_notifications() that inserts message/icon_type,
-- these columns must exist. Adding them as nullable keeps both old and new trigger logic working.

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS icon_type TEXT;

-- Optional: ensure the trigger function does not require them (idempotent)
CREATE OR REPLACE FUNCTION create_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  app_company_owner_id UUID;
  app_expert_id UUID;
  admin_user_id UUID;
BEGIN
  SELECT a.company_owner_id, a.assigned_expert_id
  INTO app_company_owner_id, app_expert_id
  FROM conversations c
  INNER JOIN applications a ON a.id = c.application_id
  WHERE c.id = NEW.conversation_id;

  IF app_company_owner_id IS NULL AND app_expert_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO admin_user_id
  FROM user_profiles
  WHERE role = 'admin'
  LIMIT 1;

  IF admin_user_id IS NOT NULL AND NEW.sender_id != admin_user_id THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (admin_user_id, 'New Message', 'general');
  END IF;

  IF app_expert_id IS NOT NULL AND NEW.sender_id != app_expert_id THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (app_expert_id, 'New Message', 'general');
  END IF;

  IF app_company_owner_id IS NOT NULL AND NEW.sender_id != app_company_owner_id THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (app_company_owner_id, 'New Message', 'general');
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_message_notifications() IS 'Creates notifications for message recipients when a new message is sent. Inserts (user_id, title, type) only.';
