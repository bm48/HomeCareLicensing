-- Migration: Make conversations.client_id nullable
-- File: supabase/migrations/049_make_conversations_client_id_nullable.sql
-- This migration makes client_id nullable since we now use application_id as the primary identifier

-- Step 1: Make client_id nullable
ALTER TABLE conversations 
ALTER COLUMN client_id DROP NOT NULL;

-- Step 2: Add comment to document the change
COMMENT ON COLUMN conversations.client_id IS 'Optional reference to clients table. With application-based conversations, this is maintained for backward compatibility but application_id is the primary identifier.';
