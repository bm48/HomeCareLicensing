-- Migration: Mark notifications as read when messages are read
-- File: supabase/migrations/049_mark_notifications_read_when_message_read.sql
-- This migration updates the mark_message_as_read_by_user function to also mark
-- related notifications as read when a message is marked as read

-- Enhanced function to mark message as read by user AND mark related notifications as read
CREATE OR REPLACE FUNCTION mark_message_as_read_by_user(message_id UUID, user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  msg_conversation_id UUID;
  msg_created_at TIMESTAMP WITH TIME ZONE;
  target_user_id UUID;
BEGIN
  -- Store parameter in local variable to avoid ambiguity with column names
  target_user_id := user_id;
  
  -- Validate inputs
  IF message_id IS NULL OR target_user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Get message details (conversation_id and created_at) for matching notifications
  SELECT conversation_id, created_at
  INTO msg_conversation_id, msg_created_at
  FROM messages
  WHERE id = message_id;
  
  -- If message not found, return
  IF msg_conversation_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Update message to add user to is_read array
  UPDATE messages
  SET is_read = array_append(COALESCE(is_read, ARRAY[]::UUID[]), target_user_id)
  WHERE id = message_id
    AND NOT (target_user_id = ANY(COALESCE(is_read, ARRAY[]::UUID[]))); -- Prevent duplicates
  
  -- Mark related notifications as read
  -- Match notifications that:
  -- 1. Are for this user
  -- 2. Are unread
  -- 3. Are of type 'general' with title 'New Message' (message notifications)
  -- 4. Were created around the same time as the message (within 5 minutes)
  -- This ensures we only mark notifications related to this specific message
  UPDATE notifications
  SET is_read = TRUE
  WHERE notifications.user_id = target_user_id
    AND notifications.is_read = FALSE
    AND notifications.type = 'general'
    AND notifications.title = 'New Message'
    AND notifications.created_at >= msg_created_at - INTERVAL '5 minutes'
    AND notifications.created_at <= msg_created_at + INTERVAL '5 minutes';
    
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error in mark_message_as_read_by_user: %', SQLERRM;
END;
$$;

-- Update comment
COMMENT ON FUNCTION mark_message_as_read_by_user(UUID, UUID) IS 'Adds a user ID to the is_read array for a message and marks related notifications as read. Uses SECURITY DEFINER to update notifications. Handles NULL values gracefully.';
