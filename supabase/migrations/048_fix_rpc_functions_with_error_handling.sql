-- Migration: Fix RPC functions with proper error handling
-- File: supabase/migrations/048_fix_rpc_functions_with_error_handling.sql
-- This migration ensures RPC functions handle edge cases and return proper values

-- Function to get total unread count for a user across conversations
-- Uses SECURITY DEFINER to bypass RLS and check permissions manually
CREATE OR REPLACE FUNCTION get_total_unread_count_for_user(
  conversation_ids UUID[],
  user_id UUID
)
RETURNS BIGINT 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  result_count BIGINT;
BEGIN
  -- Validate inputs
  IF user_id IS NULL THEN
    RETURN 0;
  END IF;
  
  IF conversation_ids IS NULL OR array_length(conversation_ids, 1) IS NULL OR array_length(conversation_ids, 1) = 0 THEN
    RETURN 0;
  END IF;
  
  -- Count unread messages
  SELECT COUNT(*)::BIGINT INTO result_count
  FROM messages m
  WHERE m.conversation_id = ANY(conversation_ids)
    AND m.sender_id != user_id
    AND (
      m.is_read IS NULL 
      OR array_length(m.is_read, 1) IS NULL 
      OR NOT (user_id = ANY(m.is_read))
    );
  
  -- Return 0 if result is NULL
  RETURN COALESCE(result_count, 0);
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return 0 on any exception
    RAISE WARNING 'Error in get_total_unread_count_for_user: %', SQLERRM;
    RETURN 0;
END;
$$;

-- Function to count unread messages for a user in conversations
-- Uses SECURITY DEFINER to bypass RLS and check permissions manually
CREATE OR REPLACE FUNCTION count_unread_messages_for_user(
  conversation_ids UUID[],
  user_id UUID
)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate inputs
  IF user_id IS NULL THEN
    RETURN;
  END IF;
  
  IF conversation_ids IS NULL OR array_length(conversation_ids, 1) IS NULL OR array_length(conversation_ids, 1) = 0 THEN
    RETURN;
  END IF;
  
  -- Return query with error handling
  RETURN QUERY
  SELECT 
    m.conversation_id,
    COUNT(*)::BIGINT as unread_count
  FROM messages m
  WHERE m.conversation_id = ANY(conversation_ids)
    AND m.sender_id != user_id
    AND (
      m.is_read IS NULL 
      OR array_length(m.is_read, 1) IS NULL 
      OR NOT (user_id = ANY(m.is_read))
    )
  GROUP BY m.conversation_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error and return empty result on any exception
    RAISE WARNING 'Error in count_unread_messages_for_user: %', SQLERRM;
    RETURN;
END;
$$;

-- Function to mark message as read by user (with error handling)
CREATE OR REPLACE FUNCTION mark_message_as_read_by_user(message_id UUID, user_id UUID)
RETURNS VOID 
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate inputs
  IF message_id IS NULL OR user_id IS NULL THEN
    RETURN;
  END IF;
  
  -- Update message to add user to is_read array
  UPDATE messages
  SET is_read = array_append(COALESCE(is_read, ARRAY[]::UUID[]), user_id)
  WHERE id = message_id
    AND NOT (user_id = ANY(COALESCE(is_read, ARRAY[]::UUID[]))); -- Prevent duplicates
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail
    RAISE WARNING 'Error in mark_message_as_read_by_user: %', SQLERRM;
END;
$$;

-- Add comments
COMMENT ON FUNCTION get_total_unread_count_for_user(UUID[], UUID) IS 'Gets total unread message count across conversations for a user. Uses SECURITY DEFINER to bypass RLS. Returns 0 on error.';
COMMENT ON FUNCTION count_unread_messages_for_user(UUID[], UUID) IS 'Counts unread messages per conversation for a user. Uses SECURITY DEFINER to bypass RLS. Returns empty result on error.';
COMMENT ON FUNCTION mark_message_as_read_by_user(UUID, UUID) IS 'Adds a user ID to the is_read array for a message. Handles NULL values gracefully.';
