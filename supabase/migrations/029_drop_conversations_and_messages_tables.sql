-- Migration: Drop Conversations and Messages Tables
-- File: supabase/migrations/029_drop_conversations_and_messages_tables.sql
-- This migration drops the messages and conversations tables and all related objects

-- Drop triggers first
DROP TRIGGER IF EXISTS update_conversation_last_message_trigger ON messages;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;

-- Drop functions that are only used by these tables
DROP FUNCTION IF EXISTS update_conversation_last_message() CASCADE;

-- Drop all RLS policies on messages table
DROP POLICY IF EXISTS "Admins and experts can view messages" ON messages;
DROP POLICY IF EXISTS "Admins and experts can manage messages" ON messages;
DROP POLICY IF EXISTS "Experts can view own messages" ON messages;
DROP POLICY IF EXISTS "Experts can insert messages" ON messages;
DROP POLICY IF EXISTS "Experts can update own messages" ON messages;
DROP POLICY IF EXISTS "Clients can view own messages" ON messages;
DROP POLICY IF EXISTS "Clients can insert messages" ON messages;
DROP POLICY IF EXISTS "Clients can update own messages" ON messages;

-- Drop all RLS policies on conversations table
DROP POLICY IF EXISTS "Admins can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Admins can manage own conversations" ON conversations;
DROP POLICY IF EXISTS "Experts can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Experts can create conversations" ON conversations;
DROP POLICY IF EXISTS "Experts can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can create conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can update own conversations" ON conversations;

-- Drop messages table first (it has foreign key to conversations)
DROP TABLE IF EXISTS messages CASCADE;

-- Drop conversations table
DROP TABLE IF EXISTS conversations CASCADE;
