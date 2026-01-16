-- Migration: Add RLS policies for pricing table
-- This allows admins to view and manage pricing records

-- Enable Row Level Security on pricing table (if not already enabled)
ALTER TABLE pricing ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Admins can view pricing" ON pricing;
DROP POLICY IF EXISTS "Admins can insert pricing" ON pricing;
DROP POLICY IF EXISTS "Admins can update pricing" ON pricing;

-- RLS Policy: Admins can view pricing
CREATE POLICY "Admins can view pricing"
  ON pricing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policy: Admins can insert pricing
CREATE POLICY "Admins can insert pricing"
  ON pricing FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policy: Admins can update pricing
CREATE POLICY "Admins can update pricing"
  ON pricing FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );
