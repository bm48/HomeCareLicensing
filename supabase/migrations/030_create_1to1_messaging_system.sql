-- Migration: Create 1:1 Real-time Messaging System
-- File: supabase/migrations/030_create_1to1_messaging_system.sql
-- This migration creates tables for 1:1 real-time chatting between admin, client, and expert

-- Create conversations table for 1:1 messaging
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  expert_id UUID REFERENCES licensing_experts(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  -- Ensure only one of expert_id or admin_id is set (1:1 conversation)
  CONSTRAINT conversations_expert_or_admin_check 
    CHECK ((expert_id IS NULL AND admin_id IS NOT NULL) OR (expert_id IS NOT NULL AND admin_id IS NULL)),
  -- Ensure unique conversation per client-expert or client-admin pair
  CONSTRAINT conversations_unique_pair UNIQUE (client_id, expert_id, admin_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_expert ON conversations(expert_id);
CREATE INDEX IF NOT EXISTS idx_conversations_admin ON conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_read ON messages(conversation_id, is_read);

-- Add trigger for updated_at on conversations
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update conversation last_message_at when a message is created
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_message_at when message is inserted
CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES FOR CONVERSATIONS
-- ============================================

-- Admins can view all conversations
CREATE POLICY "Admins can view all conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Admins can create conversations with any client
CREATE POLICY "Admins can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    AND admin_id = auth.uid()
  );

-- Admins can update conversations they're part of
CREATE POLICY "Admins can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
    AND admin_id = auth.uid()
  );

-- Experts can view conversations with their assigned clients
CREATE POLICY "Experts can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM licensing_experts
      WHERE licensing_experts.user_id = auth.uid()
      AND licensing_experts.id = conversations.expert_id
    )
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = conversations.client_id
      AND clients.expert_id = auth.uid()
    )
  );

-- Experts can create conversations with their assigned clients
CREATE POLICY "Experts can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM licensing_experts
      WHERE licensing_experts.user_id = auth.uid()
      AND licensing_experts.id = conversations.expert_id
    )
    AND EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = conversations.client_id
      AND clients.expert_id = auth.uid()
    )
  );

-- Experts can update their own conversations
CREATE POLICY "Experts can update conversations"
  ON conversations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM licensing_experts
      WHERE licensing_experts.user_id = auth.uid()
      AND licensing_experts.id = conversations.expert_id
    )
  );

-- Clients (company owners) can view their own conversations
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

-- Clients can create conversations with admin or their assigned expert
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
    AND (
      -- Can create with admin
      (conversations.admin_id IS NOT NULL)
      OR
      -- Can create with assigned expert
      (
        conversations.expert_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM clients c
          WHERE c.id = conversations.client_id
          AND c.expert_id IN (
            SELECT user_id FROM licensing_experts
            WHERE id = conversations.expert_id
          )
        )
      )
    )
  );

-- Clients can update their own conversations
CREATE POLICY "Clients can update conversations"
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

-- ============================================
-- RLS POLICIES FOR MESSAGES
-- ============================================

-- Admins can view messages in all conversations
CREATE POLICY "Admins can view all messages"
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
      AND conversations.admin_id = auth.uid()
    )
  );

-- Admins can send messages in their conversations
CREATE POLICY "Admins can send messages"
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
      AND conversations.admin_id = auth.uid()
    )
  );

-- Admins can update messages (mark as read)
CREATE POLICY "Admins can update messages"
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
      AND conversations.admin_id = auth.uid()
    )
  );

-- Experts can view messages in conversations with their clients
CREATE POLICY "Experts can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.expert_id IN (
        SELECT id FROM licensing_experts
        WHERE user_id = auth.uid()
      )
    )
  );

-- Experts can send messages in their conversations
CREATE POLICY "Experts can send messages"
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
      WHERE conversations.id = messages.conversation_id
      AND conversations.expert_id IN (
        SELECT id FROM licensing_experts
        WHERE user_id = auth.uid()
      )
    )
  );

-- Experts can update messages (mark as read)
CREATE POLICY "Experts can update messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND conversations.expert_id IN (
        SELECT id FROM licensing_experts
        WHERE user_id = auth.uid()
      )
    )
  );

-- Clients can view messages in their conversations
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
      INNER JOIN clients ON clients.id = conversations.client_id
      WHERE conversations.id = messages.conversation_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- Clients can send messages in their conversations
CREATE POLICY "Clients can send messages"
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
      INNER JOIN clients ON clients.id = conversations.client_id
      WHERE conversations.id = messages.conversation_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- Clients can update messages (mark as read)
CREATE POLICY "Clients can update messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM conversations
      INNER JOIN clients ON clients.id = conversations.client_id
      WHERE conversations.id = messages.conversation_id
      AND clients.company_owner_id = auth.uid()
    )
  );

-- Enable Realtime for messages table (for real-time updates)
-- Note: This requires Supabase Realtime to be enabled in the dashboard
-- The table will automatically be available for realtime subscriptions

COMMENT ON TABLE conversations IS '1:1 conversations between clients and admins or experts';
COMMENT ON TABLE messages IS 'Messages in 1:1 conversations with real-time support';
