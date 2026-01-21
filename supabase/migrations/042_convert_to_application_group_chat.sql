-- Migration: Convert conversations to application-based group chat
-- File: supabase/migrations/042_convert_to_application_group_chat.sql
-- This migration converts the 1:1 messaging system to group chat per application

-- Step 1: Add application_id column to conversations table
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS application_id UUID REFERENCES applications(id) ON DELETE CASCADE;

-- Step 2: Create index for application_id
CREATE INDEX IF NOT EXISTS idx_conversations_application ON conversations(application_id);

-- Step 3: Drop the old constraint that only allows one of expert_id or admin_id
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_expert_or_admin_check;

-- Step 4: Drop the old unique constraint
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_unique_pair;

-- Step 5: Add new unique constraint for application-based conversations
-- One conversation per application
ALTER TABLE conversations 
ADD CONSTRAINT conversations_unique_application UNIQUE (application_id);

-- Step 6: Update RLS policies for group chat access based on application

-- Drop old conversation policies
DROP POLICY IF EXISTS "Admins can view all conversations" ON conversations;
DROP POLICY IF EXISTS "Admins can create conversations" ON conversations;
DROP POLICY IF EXISTS "Admins can update conversations" ON conversations;
DROP POLICY IF EXISTS "Experts can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Experts can create conversations" ON conversations;
DROP POLICY IF EXISTS "Experts can update conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can create conversations" ON conversations;
DROP POLICY IF EXISTS "Clients can update conversations" ON conversations;

-- New RLS policies for application-based group chat

-- Admins can view conversations for any application
CREATE POLICY "Admins can view application conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can create conversations for any application
CREATE POLICY "Admins can create application conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can update conversations for any application
CREATE POLICY "Admins can update application conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Experts can view conversations for applications they're assigned to
CREATE POLICY "Experts can view assigned application conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversations.application_id
      AND applications.assigned_expert_id = auth.uid()
    )
  );

-- Experts can create conversations for applications they're assigned to
CREATE POLICY "Experts can create assigned application conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversations.application_id
      AND applications.assigned_expert_id = auth.uid()
    )
  );

-- Experts can update conversations for applications they're assigned to
CREATE POLICY "Experts can update assigned application conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversations.application_id
      AND applications.assigned_expert_id = auth.uid()
    )
  );

-- Company owners can view conversations for their own applications
CREATE POLICY "Company owners can view own application conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversations.application_id
      AND applications.company_owner_id = auth.uid()
    )
  );

-- Company owners can create conversations for their own applications
CREATE POLICY "Company owners can create own application conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversations.application_id
      AND applications.company_owner_id = auth.uid()
    )
  );

-- Company owners can update conversations for their own applications
CREATE POLICY "Company owners can update own application conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.id = conversations.application_id
      AND applications.company_owner_id = auth.uid()
    )
  );

-- Step 7: Update message RLS policies for group chat

-- Drop old message policies
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Admins can send messages" ON messages;
DROP POLICY IF EXISTS "Admins can update messages" ON messages;
DROP POLICY IF EXISTS "Experts can view own messages" ON messages;
DROP POLICY IF EXISTS "Experts can send messages" ON messages;
DROP POLICY IF EXISTS "Experts can update messages" ON messages;
DROP POLICY IF EXISTS "Clients can view own messages" ON messages;
DROP POLICY IF EXISTS "Clients can send messages" ON messages;
DROP POLICY IF EXISTS "Clients can update messages" ON messages;

-- New message policies for application-based group chat

-- Admins can view messages in any application conversation
CREATE POLICY "Admins can view application messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
    )
  );

-- Admins can send messages in any application conversation
CREATE POLICY "Admins can send application messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
    )
  );

-- Admins can update messages (mark as read) in any application conversation
CREATE POLICY "Admins can update application messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
    )
  );

-- Experts can view messages in conversations for applications they're assigned to
CREATE POLICY "Experts can view assigned application messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      INNER JOIN applications ON applications.id = conversations.application_id
      WHERE conversations.id = messages.conversation_id
      AND applications.assigned_expert_id = auth.uid()
    )
  );

-- Experts can send messages in conversations for applications they're assigned to
CREATE POLICY "Experts can send assigned application messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM conversations
      INNER JOIN applications ON applications.id = conversations.application_id
      WHERE conversations.id = messages.conversation_id
      AND applications.assigned_expert_id = auth.uid()
    )
  );

-- Experts can update messages (mark as read) in conversations for applications they're assigned to
CREATE POLICY "Experts can update assigned application messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      INNER JOIN applications ON applications.id = conversations.application_id
      WHERE conversations.id = messages.conversation_id
      AND applications.assigned_expert_id = auth.uid()
    )
  );

-- Company owners can view messages in conversations for their own applications
CREATE POLICY "Company owners can view own application messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      INNER JOIN applications ON applications.id = conversations.application_id
      WHERE conversations.id = messages.conversation_id
      AND applications.company_owner_id = auth.uid()
    )
  );

-- Company owners can send messages in conversations for their own applications
CREATE POLICY "Company owners can send own application messages"
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
      INNER JOIN applications ON applications.id = conversations.application_id
      WHERE conversations.id = messages.conversation_id
      AND applications.company_owner_id = auth.uid()
    )
  );

-- Company owners can update messages (mark as read) in conversations for their own applications
CREATE POLICY "Company owners can update own application messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      INNER JOIN applications ON applications.id = conversations.application_id
      WHERE conversations.id = messages.conversation_id
      AND applications.company_owner_id = auth.uid()
    )
  );

COMMENT ON TABLE conversations IS 'Group chat conversations per application (admin, company owner, and expert can all participate)';
