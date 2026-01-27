-- Migration: Create small_clients table for owner client management
-- File: supabase/migrations/056_create_small_clients_table.sql
-- This migration creates a table for managing care recipients/clients

-- Create small_clients table
CREATE TABLE IF NOT EXISTS small_clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Personal Information
  full_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender TEXT CHECK (gender IN ('Male', 'Female', 'Other', 'Prefer not to say')),
  age INTEGER,
  
  -- Address Information
  street_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  
  -- Contact Information
  phone_number TEXT NOT NULL,
  email_address TEXT NOT NULL,
  
  -- Emergency Contact
  emergency_contact_name TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  
  -- Medical Information (Optional)
  primary_diagnosis TEXT,
  current_medications TEXT,
  allergies TEXT,
  
  -- Classification
  class TEXT CHECK (class IN ('Private Pay', 'Medicare', 'Medicaid', 'Other')),
  
  -- Representatives
  representative_1_name TEXT,
  representative_1_relationship TEXT,
  representative_1_phone TEXT,
  representative_2_name TEXT,
  representative_2_relationship TEXT,
  representative_2_phone TEXT,
  
  -- Status
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive')) DEFAULT 'active',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_small_clients_owner ON small_clients(owner_id);
CREATE INDEX IF NOT EXISTS idx_small_clients_status ON small_clients(status);
CREATE INDEX IF NOT EXISTS idx_small_clients_name ON small_clients(full_name);
CREATE INDEX IF NOT EXISTS idx_small_clients_email ON small_clients(email_address);
CREATE INDEX IF NOT EXISTS idx_small_clients_phone ON small_clients(phone_number);

-- Add trigger for updated_at
CREATE TRIGGER update_small_clients_updated_at BEFORE UPDATE ON small_clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE small_clients ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Owners can only view/manage their own clients
CREATE POLICY "Owners can view own clients"
  ON small_clients FOR SELECT
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can insert own clients"
  ON small_clients FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update own clients"
  ON small_clients FOR UPDATE
  USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete own clients"
  ON small_clients FOR DELETE
  USING (owner_id = auth.uid());

-- Function to calculate age from date_of_birth
CREATE OR REPLACE FUNCTION calculate_age(birth_date DATE)
RETURNS INTEGER AS $$
BEGIN
  RETURN EXTRACT(YEAR FROM AGE(birth_date));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-calculate age when date_of_birth is set or updated
CREATE OR REPLACE FUNCTION update_client_age()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date_of_birth IS NOT NULL THEN
    NEW.age := calculate_age(NEW.date_of_birth);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_small_clients_age
  BEFORE INSERT OR UPDATE ON small_clients
  FOR EACH ROW
  EXECUTE FUNCTION update_client_age();

COMMENT ON TABLE small_clients IS 'Care recipients/clients managed by company owners';
COMMENT ON COLUMN small_clients.owner_id IS 'References auth.users(id) - the company owner who manages this client';
