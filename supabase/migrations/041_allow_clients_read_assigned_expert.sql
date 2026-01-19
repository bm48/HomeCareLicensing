-- Migration: Allow Clients to Read Their Assigned Expert Records
-- File: supabase/migrations/041_allow_clients_read_assigned_expert.sql
-- This migration allows company owners to read licensing_experts records for experts assigned to their applications

-- Allow clients (company owners) to view expert records for experts assigned to their applications
CREATE POLICY "Clients can view assigned expert records"
  ON licensing_experts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'company_owner'
    )
    AND EXISTS (
      SELECT 1 FROM applications
      WHERE applications.company_owner_id = auth.uid()
      AND applications.assigned_expert_id = licensing_experts.user_id
    )
  );
