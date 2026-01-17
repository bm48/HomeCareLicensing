-- Migration: Fix staff_members RLS policy for staff members to view their own record
-- This ensures staff members can view their own record even after migration 017

-- Ensure the policy exists (it should from migration 004, but let's make sure)
DROP POLICY IF EXISTS "Staff members can view own record" ON staff_members;
CREATE POLICY "Staff members can view own record"
  ON staff_members FOR SELECT
  USING (user_id = auth.uid());