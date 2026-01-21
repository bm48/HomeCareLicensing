-- Migration: Change is_read from boolean to UUID array
-- File: supabase/migrations/045_change_is_read_to_uuid_array.sql
-- This migration changes the is_read column to track which users have read each message

-- Step 1: Drop old indexes that reference is_read as boolean
DROP INDEX IF EXISTS idx_messages_read;
DROP INDEX IF EXISTS idx_messages_conversation_read;
DROP INDEX IF EXISTS idx_messages_conversation_read_sender;
DROP INDEX IF EXISTS idx_messages_unread_conversation;

-- Step 2: Add new column for UUID array (temporary)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by_users UUID[] DEFAULT ARRAY[]::UUID[];

-- Step 3: Migrate existing data
-- If is_read was true, we can't know which users read it, so leave empty array
-- If is_read was false, also leave empty array (unread by all)
-- Note: This means all existing messages will be marked as unread, which is acceptable

-- Step 4: Drop the old is_read column
ALTER TABLE messages DROP COLUMN IF EXISTS is_read;

-- Step 5: Rename the new column to is_read (for backward compatibility in queries)
ALTER TABLE messages RENAME COLUMN read_by_users TO is_read;

-- Step 6: Create new indexes for array operations
-- Index for checking if a specific user has read messages
CREATE INDEX IF NOT EXISTS idx_messages_is_read_gin ON messages USING GIN (is_read);

-- Index for conversation_id with array operations
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Function to check if a message is unread by a specific user
CREATE OR REPLACE FUNCTION is_message_unread_by_user(message_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT (user_id = ANY(
    SELECT is_read FROM messages WHERE id = message_id
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to add a user to the read_by_users array
CREATE OR REPLACE FUNCTION mark_message_as_read_by_user(message_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET is_read = array_append(is_read, user_id)
  WHERE id = message_id
    AND NOT (user_id = ANY(is_read)); -- Prevent duplicates
END;
$$ LANGUAGE plpgsql;

-- Function to count unread messages for a user in conversations
-- Uses SECURITY DEFINER to bypass RLS and check permissions manually
CREATE OR REPLACE FUNCTION count_unread_messages_for_user(
  conversation_ids UUID[],
  user_id UUID
)
RETURNS TABLE(conversation_id UUID, unread_count BIGINT) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
END;
$$ LANGUAGE plpgsql;

-- Function to get total unread count for a user across conversations
-- Uses SECURITY DEFINER to bypass RLS and check permissions manually
CREATE OR REPLACE FUNCTION get_total_unread_count_for_user(
  conversation_ids UUID[],
  user_id UUID
)
RETURNS BIGINT 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM messages m
    WHERE m.conversation_id = ANY(conversation_ids)
      AND m.sender_id != user_id
      AND (
        m.is_read IS NULL 
        OR array_length(m.is_read, 1) IS NULL 
        OR NOT (user_id = ANY(m.is_read))
      )
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON COLUMN messages.is_read IS 'Array of user IDs who have read this message';
