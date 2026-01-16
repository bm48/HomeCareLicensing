-- Migration: Add Admin RLS Policies for staff_members
-- File: supabase/migrations/019_add_admin_staff_members_policies.sql
-- This migration adds RLS policies to allow admins to view and manage all staff_members

-- RLS Policies for staff_members - Allow admins to view all staff
DROP POLICY IF EXISTS "Admins can view all staff_members" ON staff_members;
CREATE POLICY "Admins can view all staff_members"
  ON staff_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for staff_members - Allow admins to manage all staff
DROP POLICY IF EXISTS "Admins can manage staff_members" ON staff_members;
CREATE POLICY "Admins can manage staff_members"
  ON staff_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for staff_licenses - Allow admins to view all staff licenses
DROP POLICY IF EXISTS "Admins can view all staff_licenses" ON staff_licenses;
CREATE POLICY "Admins can view all staff_licenses"
  ON staff_licenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );

-- RLS Policies for staff_licenses - Allow admins to manage all staff licenses
DROP POLICY IF EXISTS "Admins can manage staff_licenses" ON staff_licenses;
CREATE POLICY "Admins can manage staff_licenses"
  ON staff_licenses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'admin'
    )
  );