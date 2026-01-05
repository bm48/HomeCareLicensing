-- Auto-create staff_member records for new staff signups
-- This migration updates the handle_new_user function to automatically create
-- a staff_members record when a user signs up with the staff_member role

-- First, allow staff members to insert their own staff_member record
DROP POLICY IF EXISTS "Staff members can insert own record" ON staff_members;
CREATE POLICY "Staff members can insert own record"
  ON staff_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Update the handle_new_user function to also create staff_member records
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
  first_name_part TEXT;
  last_name_part TEXT;
  company_owner_uuid UUID;
  staff_member_id UUID;
BEGIN
  -- Get role and full_name from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff_member');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', '');
  
  -- Create user profile
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role
  );
  
  -- If role is staff_member, create staff_member record
  IF user_role = 'staff_member' THEN
    -- Find the first company owner to assign as company_owner_id
    -- If no company owner exists, we'll skip creating the staff_member record
    -- and let the user contact an administrator
    SELECT id INTO company_owner_uuid
    FROM public.user_profiles
    WHERE role = 'company_owner'
    ORDER BY created_at ASC
    LIMIT 1;
    
    -- Split full_name into first_name and last_name
    IF user_full_name IS NOT NULL AND user_full_name != '' THEN
      first_name_part := COALESCE(SPLIT_PART(user_full_name, ' ', 1), 'Staff');
      -- Get everything after the first space as last name, or default to 'Member'
      IF POSITION(' ' IN user_full_name) > 0 THEN
        last_name_part := COALESCE(SUBSTRING(user_full_name FROM POSITION(' ' IN user_full_name) + 1), 'Member');
      ELSE
        last_name_part := 'Member';
      END IF;
    ELSE
      first_name_part := 'Staff';
      last_name_part := 'Member';
    END IF;
    
    -- Create staff_member record if we found a company owner
    IF company_owner_uuid IS NOT NULL THEN
      INSERT INTO public.staff_members (
        company_owner_id,
        user_id,
        first_name,
        last_name,
        email,
        role,
        status,
        created_at,
        updated_at
      )
      VALUES (
        company_owner_uuid,
        NEW.id,
        first_name_part,
        last_name_part,
        NEW.email,
        'Staff Member',
        'active',
        NOW(),
        NOW()
      )
      RETURNING id INTO staff_member_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create staff_member records for existing staff members who don't have one
DO $$
DECLARE
  staff_profile RECORD;
  company_owner_uuid UUID;
  first_name_part TEXT;
  last_name_part TEXT;
  existing_staff_member_id UUID;
BEGIN
  -- Find the first company owner to use as default
  SELECT id INTO company_owner_uuid
  FROM public.user_profiles
  WHERE role = 'company_owner'
  ORDER BY created_at ASC
  LIMIT 1;
  
  -- If we have a company owner, process existing staff members
  IF company_owner_uuid IS NOT NULL THEN
    FOR staff_profile IN 
      SELECT * FROM public.user_profiles 
      WHERE role = 'staff_member'
    LOOP
      -- Check if staff_member record already exists
      SELECT id INTO existing_staff_member_id
      FROM public.staff_members
      WHERE user_id = staff_profile.id
      LIMIT 1;
      
      -- Only create if it doesn't exist
      IF existing_staff_member_id IS NULL THEN
        -- Split full_name into first_name and last_name
        IF staff_profile.full_name IS NOT NULL AND staff_profile.full_name != '' THEN
          first_name_part := COALESCE(SPLIT_PART(staff_profile.full_name, ' ', 1), 'Staff');
          IF POSITION(' ' IN staff_profile.full_name) > 0 THEN
            last_name_part := COALESCE(SUBSTRING(staff_profile.full_name FROM POSITION(' ' IN staff_profile.full_name) + 1), 'Member');
          ELSE
            last_name_part := 'Member';
          END IF;
        ELSE
          first_name_part := 'Staff';
          last_name_part := 'Member';
        END IF;
        
        -- Create staff_member record
        INSERT INTO public.staff_members (
          company_owner_id,
          user_id,
          first_name,
          last_name,
          email,
          role,
          status,
          created_at,
          updated_at
        )
        VALUES (
          company_owner_uuid,
          staff_profile.id,
          first_name_part,
          last_name_part,
          staff_profile.email,
          'Staff Member',
          'active',
          NOW(),
          NOW()
        );
        
        RAISE NOTICE 'Created staff_member record for user % (%)', staff_profile.email, staff_profile.id;
      END IF;
    END LOOP;
  ELSE
    RAISE WARNING 'No company owner found. Cannot create staff_member records for existing staff members.';
  END IF;
END $$;

