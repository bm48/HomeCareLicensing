-- Migration: Fix handle_new_user trigger to not create staff_member records
-- After migration 017, staff_members.company_owner_id references clients.id, not user_profiles.id
-- Since staff members are created manually through the admin form, we should not auto-create them in the trigger

-- Update the handle_new_user function to only create user_profiles, not staff_member records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
BEGIN
  -- Get role and full_name from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff_member');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- Create user profile only
  -- Staff member records should be created manually through the admin form
  -- to ensure proper client relationship
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
