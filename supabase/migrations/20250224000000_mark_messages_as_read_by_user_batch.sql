-- Batch version of mark_message_as_read_by_user to fix N+1 when opening a conversation.
-- Marks multiple messages as read for a user in one call and marks related notifications.

CREATE OR REPLACE FUNCTION mark_messages_as_read_by_user(message_ids UUID[], user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_user_id UUID;
BEGIN
  target_user_id := user_id;

  IF target_user_id IS NULL THEN
    RETURN;
  END IF;

  IF message_ids IS NULL OR array_length(message_ids, 1) IS NULL OR array_length(message_ids, 1) = 0 THEN
    RETURN;
  END IF;

  -- Update all messages: add user to is_read array where not already present
  UPDATE messages
  SET is_read = array_append(COALESCE(is_read, ARRAY[]::UUID[]), target_user_id)
  WHERE id = ANY(message_ids)
    AND NOT (target_user_id = ANY(COALESCE(is_read, ARRAY[]::UUID[])));

  -- Mark related notifications as read (same logic as single-message RPC)
  UPDATE notifications
  SET is_read = TRUE
  WHERE notifications.user_id = target_user_id
    AND notifications.is_read = FALSE
    AND notifications.type = 'general'
    AND notifications.title = 'New Message'
    AND EXISTS (
      SELECT 1 FROM messages m
      WHERE m.id = ANY(message_ids)
        AND notifications.created_at >= m.created_at - INTERVAL '5 minutes'
        AND notifications.created_at <= m.created_at + INTERVAL '5 minutes'
    );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in mark_messages_as_read_by_user: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION mark_messages_as_read_by_user(UUID[], UUID) IS 'Adds a user ID to the is_read array for multiple messages and marks related notifications. Batch version to avoid N+1 when opening a conversation.';
