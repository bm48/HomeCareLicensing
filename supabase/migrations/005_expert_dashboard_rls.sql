-- Expert Dashboard RLS Policies
-- This migration adds RLS policies to allow experts to view their assigned clients, cases, and messages

-- RLS Policies for clients (experts can view their assigned clients)
DROP POLICY IF EXISTS "Experts can view assigned clients" ON clients;
CREATE POLICY "Experts can view assigned clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND expert_id = auth.uid()
  );

-- RLS Policies for cases (experts can view their assigned cases)
DROP POLICY IF EXISTS "Experts can view assigned cases" ON cases;
CREATE POLICY "Experts can view assigned cases"
  ON cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND EXISTS (
      SELECT 1 FROM licensing_experts
      WHERE licensing_experts.user_id = auth.uid()
      AND licensing_experts.id = cases.expert_id
    )
  );

-- RLS Policies for conversations (experts can view conversations with their clients)
DROP POLICY IF EXISTS "Experts can view own conversations" ON conversations;
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

-- RLS Policies for messages (experts can view and send messages in their conversations)
DROP POLICY IF EXISTS "Experts can view own messages" ON messages;
CREATE POLICY "Experts can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND (
      sender_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM conversations
        JOIN licensing_experts ON licensing_experts.id = conversations.expert_id
        WHERE conversations.id = messages.conversation_id
        AND licensing_experts.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "Experts can insert messages" ON messages;
CREATE POLICY "Experts can insert messages"
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
      JOIN licensing_experts ON licensing_experts.id = conversations.expert_id
      WHERE conversations.id = messages.conversation_id
      AND licensing_experts.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Experts can update own messages" ON messages;
CREATE POLICY "Experts can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'expert'
    )
    AND sender_id = auth.uid()
  );

-- Allow experts to create conversations with their assigned clients
DROP POLICY IF EXISTS "Experts can create conversations" ON conversations;
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

-- Allow experts to update conversations (for last_message_at)
DROP POLICY IF EXISTS "Experts can update own conversations" ON conversations;
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

-- Allow experts to view licensing_experts record for themselves
DROP POLICY IF EXISTS "Experts can view own expert record" ON licensing_experts;
CREATE POLICY "Experts can view own expert record"
  ON licensing_experts FOR SELECT
  USING (user_id = auth.uid());

