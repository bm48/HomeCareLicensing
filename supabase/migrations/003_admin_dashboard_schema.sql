-- Admin Dashboard Schema Migration
-- This migration creates all tables needed for the admin dashboard

-- Create clients table (companies managed by the system)
CREATE TABLE IF NOT EXISTS clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  expert_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_clients_expert ON clients(expert_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);

-- Create client_states table (many-to-many relationship for clients and states)
CREATE TABLE IF NOT EXISTS client_states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(client_id, state)
);

CREATE INDEX IF NOT EXISTS idx_client_states_client ON client_states(client_id);

-- Create licensing_experts table
CREATE TABLE IF NOT EXISTS licensing_experts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'Licensing Specialist',
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  expertise TEXT, -- e.g., "Home Healthcare, Skilled Nursing"
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_licensing_experts_user ON licensing_experts(user_id);
CREATE INDEX IF NOT EXISTS idx_licensing_experts_status ON licensing_experts(status);

-- Create expert_states table (many-to-many for experts and their state specializations)
CREATE TABLE IF NOT EXISTS expert_states (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  expert_id UUID REFERENCES licensing_experts(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(expert_id, state)
);

CREATE INDEX IF NOT EXISTS idx_expert_states_expert ON expert_states(expert_id);

-- Create conversations table (for messaging system)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  expert_id UUID REFERENCES licensing_experts(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_conversations_client ON conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_expert ON conversations(expert_id);
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

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);

-- Create license_requirements table (license types and their requirements)
CREATE TABLE IF NOT EXISTS license_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  state TEXT NOT NULL,
  license_type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(state, license_type)
);

CREATE INDEX IF NOT EXISTS idx_license_requirements_state ON license_requirements(state);

-- Create license_requirement_steps table
CREATE TABLE IF NOT EXISTS license_requirement_steps (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_requirement_id UUID REFERENCES license_requirements(id) ON DELETE CASCADE NOT NULL,
  step_name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requirement_steps_requirement ON license_requirement_steps(license_requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirement_steps_order ON license_requirement_steps(license_requirement_id, step_order);

-- Create license_requirement_documents table
CREATE TABLE IF NOT EXISTS license_requirement_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_requirement_id UUID REFERENCES license_requirements(id) ON DELETE CASCADE NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT,
  is_required BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_requirement_documents_requirement ON license_requirement_documents(license_requirement_id);

-- Create cases table (admin view of applications)
CREATE TABLE IF NOT EXISTS cases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  case_id TEXT UNIQUE NOT NULL, -- e.g., "CASE-001"
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'under_review', 'needs_revision', 'approved', 'rejected')) DEFAULT 'in_progress',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  expert_id UUID REFERENCES licensing_experts(id) ON DELETE SET NULL,
  documents_count INTEGER DEFAULT 0,
  steps_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()),
  started_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cases_client ON cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_expert ON cases(expert_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_state ON cases(state);
CREATE INDEX IF NOT EXISTS idx_cases_case_id ON cases(case_id);

-- Create billing table
CREATE TABLE IF NOT EXISTS billing (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  billing_month DATE NOT NULL, -- First day of the billing month
  user_licenses_count INTEGER DEFAULT 0,
  user_license_rate DECIMAL(10, 2) DEFAULT 50.00, -- per license per month
  applications_count INTEGER DEFAULT 0,
  application_rate DECIMAL(10, 2) DEFAULT 500.00, -- per application
  total_amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(client_id, billing_month)
);

CREATE INDEX IF NOT EXISTS idx_billing_client ON billing(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_month ON billing(billing_month);
CREATE INDEX IF NOT EXISTS idx_billing_status ON billing(status);

-- Add triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_licensing_experts_updated_at BEFORE UPDATE ON licensing_experts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_license_requirements_updated_at BEFORE UPDATE ON license_requirements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cases_updated_at BEFORE UPDATE ON cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON billing
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update conversation last_message_at when a message is created
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

-- Enable Row Level Security
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE licensing_experts ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_requirement_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_requirement_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clients (admins can manage all clients)
CREATE POLICY "Admins can view all clients"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert clients"
  ON clients FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update clients"
  ON clients FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete clients"
  ON clients FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for client_states
CREATE POLICY "Admins can manage client states"
  ON client_states FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for licensing_experts
CREATE POLICY "Admins can view all experts"
  ON licensing_experts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage experts"
  ON licensing_experts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for expert_states
CREATE POLICY "Admins can manage expert states"
  ON expert_states FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for conversations (admins and experts can view)
CREATE POLICY "Admins and experts can view conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND (user_profiles.role = 'admin' OR user_profiles.role = 'expert')
    )
  );

CREATE POLICY "Admins and experts can manage conversations"
  ON conversations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND (user_profiles.role = 'admin' OR user_profiles.role = 'expert')
    )
  );

-- RLS Policies for messages
CREATE POLICY "Admins and experts can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND (user_profiles.role = 'admin' OR user_profiles.role = 'expert')
    )
  );

CREATE POLICY "Admins and experts can manage messages"
  ON messages FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND (user_profiles.role = 'admin' OR user_profiles.role = 'expert')
    )
  );

-- RLS Policies for license_requirements
CREATE POLICY "Admins can manage license requirements"
  ON license_requirements FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for license_requirement_steps
CREATE POLICY "Admins can manage requirement steps"
  ON license_requirement_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for license_requirement_documents
CREATE POLICY "Admins can manage requirement documents"
  ON license_requirement_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for cases
CREATE POLICY "Admins can view all cases"
  ON cases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage cases"
  ON cases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for billing
CREATE POLICY "Admins can view all billing"
  ON billing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage billing"
  ON billing FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- Update user_profiles RLS to allow admins to view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role = 'admin'
    )
  );

