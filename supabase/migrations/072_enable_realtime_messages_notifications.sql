-- Enable Realtime (postgres_changes) for messages and notifications tables.
-- Without this, subscriptions to postgres_changes on these tables get CHANNEL_ERROR.
-- See: https://supabase.com/docs/guides/realtime/postgres-changes

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  END IF;
END $$;
