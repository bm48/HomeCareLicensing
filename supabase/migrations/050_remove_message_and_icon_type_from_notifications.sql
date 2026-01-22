-- Migration: Remove message and icon_type columns from notifications table
-- File: supabase/migrations/050_remove_message_and_icon_type_from_notifications.sql
-- This migration removes unused columns from the notifications table

-- Step 1: Drop the message column
ALTER TABLE notifications DROP COLUMN IF EXISTS message;

-- Step 2: Drop the icon_type column
ALTER TABLE notifications DROP COLUMN IF EXISTS icon_type;

-- Step 3: Update the create_message_notifications function to not insert message and icon_type
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
    INSERT INTO notifications (user_id, title, type)
    VALUES (
      admin_user_id,
      'New Message',
      'general'
    );
  END IF;
  
  -- Create notification for expert (if message is not from expert and expert is assigned)
  IF app_expert_id IS NOT NULL AND NEW.sender_id != app_expert_id THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (
      app_expert_id,
      'New Message',
      'general'
    );
  END IF;
  
  -- Create notification for company owner (if message is not from company owner)
  IF app_company_owner_id IS NOT NULL AND NEW.sender_id != app_company_owner_id THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (
      app_company_owner_id,
      'New Message',
      'general'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION create_message_notifications() IS 'Creates notifications for message recipients (admin, expert, company owner) when a new message is sent. Runs with SECURITY DEFINER to bypass RLS.';
