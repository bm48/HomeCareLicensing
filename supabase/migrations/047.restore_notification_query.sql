-- Fix Notification System Functions
-- Run this in Supabase SQL Editor to restore notification functionality

-- Step 1: Ensure is_read column exists and is UUID array
DO $$
BEGIN
  -- Check if is_read column exists and is correct type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' 
    AND column_name = 'is_read' 
    AND data_type = 'ARRAY'
  ) THEN
    -- If column doesn't exist or is wrong type, fix it
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'messages' 
      AND column_name = 'is_read'
    ) THEN
      -- Column exists but wrong type - drop and recreate
      ALTER TABLE messages DROP COLUMN IF EXISTS is_read;
    END IF;
    
    -- Add column as UUID array
    ALTER TABLE messages ADD COLUMN is_read UUID[] DEFAULT ARRAY[]::UUID[];
  END IF;
END $$;

-- Step 2: Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_messages_is_read_gin ON messages USING GIN (is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Step 3: Recreate mark_message_as_read_by_user function
CREATE OR REPLACE FUNCTION mark_message_as_read_by_user(message_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET is_read = array_append(is_read, user_id)
  WHERE id = message_id
    AND NOT (user_id = ANY(is_read)); -- Prevent duplicates
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate is_message_unread_by_user function
CREATE OR REPLACE FUNCTION is_message_unread_by_user(message_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN NOT (user_id = ANY(
    SELECT is_read FROM messages WHERE id = message_id
  ));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Recreate count_unread_messages_for_user function (CRITICAL for notification dropdown)
-- This function MUST have SECURITY DEFINER to bypass RLS
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

-- Step 6: Recreate get_total_unread_count_for_user function (CRITICAL for badge count)
-- This function MUST have SECURITY DEFINER to bypass RLS
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

-- Step 7: Add comments for documentation
COMMENT ON COLUMN messages.is_read IS 'Array of user IDs who have read this message';
COMMENT ON FUNCTION mark_message_as_read_by_user(UUID, UUID) IS 'Adds a user ID to the is_read array for a message';
COMMENT ON FUNCTION count_unread_messages_for_user(UUID[], UUID) IS 'Counts unread messages per conversation for a user. Uses SECURITY DEFINER to bypass RLS.';
COMMENT ON FUNCTION get_total_unread_count_for_user(UUID[], UUID) IS 'Gets total unread message count across conversations for a user. Uses SECURITY DEFINER to bypass RLS.';

-- Step 8: Verify functions exist
DO $$
DECLARE
  func_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO func_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'mark_message_as_read_by_user',
      'is_message_unread_by_user',
      'count_unread_messages_for_user',
      'get_total_unread_count_for_user'
    );
  
  IF func_count = 4 THEN
    RAISE NOTICE '✓ All notification functions created successfully';
  ELSE
    RAISE WARNING '⚠ Expected 4 functions, found %', func_count;
  END IF;
END $$;