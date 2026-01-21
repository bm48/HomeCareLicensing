-- Migration: Create function to notify message recipients
-- File: supabase/migrations/046_create_notification_for_message_recipients.sql
-- This migration creates a SECURITY DEFINER function that can create notifications
-- for message recipients (admin/expert) when a client sends a message

-- Function to create notifications for message recipients
-- This function runs with SECURITY DEFINER to bypass RLS and create notifications for other users
CREATE OR REPLACE FUNCTION create_message_notifications()
RETURNS TRIGGER AS $$
DECLARE
  app_company_owner_id UUID;
  app_expert_id UUID;
  admin_user_id UUID;
BEGIN
  -- Get application details (company_owner_id and assigned_expert_id)
  SELECT a.company_owner_id, a.assigned_expert_id
  INTO app_company_owner_id, app_expert_id
  FROM conversations c
  INNER JOIN applications a ON a.id = c.application_id
  WHERE c.id = NEW.conversation_id;
  
  -- If we can't find the conversation/application, skip notification creation
  IF app_company_owner_id IS NULL AND app_expert_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Get admin user ID (first admin in user_profiles)
  SELECT id INTO admin_user_id
  FROM user_profiles
  WHERE role = 'admin'
  LIMIT 1;
  
  -- Create notification for admin (if message is not from admin)
  IF admin_user_id IS NOT NULL AND NEW.sender_id != admin_user_id THEN
    INSERT INTO notifications (user_id, title, message, type, icon_type)
    VALUES (
      admin_user_id,
      'New Message',
      'You have a new message in an application conversation.',
      'general',
      'bell'
    );
  END IF;
  
  -- Create notification for expert (if message is not from expert and expert is assigned)
  IF app_expert_id IS NOT NULL AND NEW.sender_id != app_expert_id THEN
    INSERT INTO notifications (user_id, title, message, type, icon_type)
    VALUES (
      app_expert_id,
      'New Message',
      'You have a new message in an application conversation.',
      'general',
      'bell'
    );
  END IF;
  
  -- Create notification for company owner (if message is not from company owner)
  IF app_company_owner_id IS NOT NULL AND NEW.sender_id != app_company_owner_id THEN
    INSERT INTO notifications (user_id, title, message, type, icon_type)
    VALUES (
      app_company_owner_id,
      'New Message',
      'You have a new message in an application conversation.',
      'general',
      'bell'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a message is inserted
-- Only create notifications for messages that are not from the current user
DROP TRIGGER IF EXISTS create_message_notifications_trigger ON messages;
CREATE TRIGGER create_message_notifications_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notifications();

COMMENT ON FUNCTION create_message_notifications() IS 'Creates notifications for message recipients (admin, expert, company owner) when a new message is sent. Runs with SECURITY DEFINER to bypass RLS.';
