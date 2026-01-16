-- Migration: Restore conversations table
-- File: supabase/migrations/025_restore_conversations_table.sql
-- This migration restores the conversations table to its original state after accidental deletion

-- Create conversations table (for messaging system)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  expert_id UUID REFERENCES licensing_experts(id) ON DELETE SET NULL,
  admin_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_expert ON conversations(expert_id);
CREATE INDEX IF NOT EXISTS idx_conversations_admin ON conversations(admin_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Add trigger for updated_at
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation last_message_at when a message is created
-- (This function should already exist, but we'll ensure it does)
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

CREATE TRIGGER update_conversation_last_message_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- RLS Policies for conversations (admins can view and manage their own conversations)
CREATE POLICY "Admins can view own conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
      AND conversations.admin_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage own conversations"
  ON conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
      AND conversations.admin_id = auth.uid()
    )
  );

-- RLS Policies for conversations (experts can view conversations with their clients)
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
  );

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

CREATE POLICY "Experts can update own conversations"
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

-- RLS Policies for conversations (clients can view their own conversations)
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
