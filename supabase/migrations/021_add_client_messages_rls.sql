-- Migration: Add Client RLS Policies for Messages
-- File: supabase/migrations/021_add_client_messages_rls.sql
-- This migration adds RLS policies to allow clients (company owners) to view and send messages

-- RLS Policies for conversations (clients can view their own conversations)
DROP POLICY IF EXISTS "Clients can view own conversations" ON conversations;
CREATE POLICY "Clients can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = conversations.client_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- RLS Policies for conversations (clients can create conversations)
DROP POLICY IF EXISTS "Clients can create conversations" ON conversations;
CREATE POLICY "Clients can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = conversations.client_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- RLS Policies for conversations (clients can update their conversations)
DROP POLICY IF EXISTS "Clients can update own conversations" ON conversations;
CREATE POLICY "Clients can update own conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = conversations.client_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- RLS Policies for messages (clients can view messages in their conversations)
DROP POLICY IF EXISTS "Clients can view own messages" ON messages;
CREATE POLICY "Clients can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      JOIN clients ON clients.id = conversations.client_id
      WHERE conversations.id = messages.conversation_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- RLS Policies for messages (clients can send messages)
DROP POLICY IF EXISTS "Clients can insert messages" ON messages;
CREATE POLICY "Clients can insert messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      JOIN clients ON clients.id = conversations.client_id
      WHERE conversations.id = messages.conversation_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- RLS Policies for messages (clients can update their own messages)
DROP POLICY IF EXISTS "Clients can update own messages" ON messages;
CREATE POLICY "Clients can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND sender_id = auth.uid()
  );
