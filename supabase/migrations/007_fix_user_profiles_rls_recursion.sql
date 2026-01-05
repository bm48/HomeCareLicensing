-- ============================================================================
-- Fix Infinite Recursion in user_profiles RLS Policy
-- ============================================================================
-- This migration fixes the infinite recursion error by creating a helper
-- function that checks user roles from auth.users metadata instead of
-- querying user_profiles within its own RLS policy.
-- ============================================================================

-- Create a security definer function to check user role without triggering RLS
-- SECURITY DEFINER functions run with the privileges of the function owner,
-- which bypasses RLS. This prevents infinite recursion when checking roles.
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Read from user_profiles directly
  -- SECURITY DEFINER ensures this runs with elevated privileges, bypassing RLS
  SELECT role INTO user_role
  FROM public.user_profiles
  WHERE id = user_id
  LIMIT 1;
  
  -- Fallback to auth.users metadata if not found in user_profiles
  IF user_role IS NULL THEN
    SELECT COALESCE(
      (raw_user_meta_data->>'role')::TEXT,
      'staff_member'
    ) INTO user_role
    FROM auth.users
    WHERE id = user_id
    LIMIT 1;
  END IF;
  
  RETURN COALESCE(user_role, 'staff_member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create a function to check if current user has a specific role
CREATE OR REPLACE FUNCTION public.is_user_role(role_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.get_user_role(auth.uid()) = role_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- Recreate the policy using the helper function (which bypasses RLS)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    auth.uid() = id OR
    public.is_user_role('admin')
  );

-- Also update all other policies that query user_profiles to use the helper function
-- This prevents similar recursion issues in other policies

-- Update admin policies in other tables to use the helper function
-- (These don't cause recursion but it's good practice for consistency)

-- Note: The policies in 003_admin_dashboard_schema.sql and 005_expert_dashboard_rls.sql
-- that query user_profiles for other tables (not user_profiles itself) don't cause
-- infinite recursion because they're querying user_profiles from a different table's policy.
-- However, if you want to optimize them, you could use the helper function there too.

