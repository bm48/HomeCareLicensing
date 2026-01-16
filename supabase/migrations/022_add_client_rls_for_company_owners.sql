-- Migration: Add Client RLS Policies for Company Owners
-- File: supabase/migrations/022_add_client_rls_for_company_owners.sql
-- This migration adds RLS policies to allow company owners to view their own client record

-- RLS Policies for clients (company owners can view their own client record)
DROP POLICY IF EXISTS "Company owners can view own client" ON clients;
CREATE POLICY "Company owners can view own client"
  ON clients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND company_owner_id = auth.uid()
  );
