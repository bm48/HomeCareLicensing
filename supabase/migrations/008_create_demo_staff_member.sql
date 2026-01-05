-- ============================================================================
-- Create Demo Staff Member Record
-- ============================================================================
-- This migration creates a staff_members record for the demo staff user
-- so they can access the staff dashboard.
-- ============================================================================

DO $$
DECLARE
  staff_user_id UUID;
  owner_user_id UUID;
  staff_member_id UUID;
  staff_profile RECORD;
BEGIN
  -- Get the staff user ID
  SELECT id INTO staff_user_id
  FROM auth.users
  WHERE email = 'staff@demo.com'
  LIMIT 1;
  
  -- Get the owner user ID (to use as company_owner_id)
  SELECT id INTO owner_user_id
  FROM auth.users
  WHERE email = 'owner@demo.com'
  LIMIT 1;
  
  -- Check if staff_member record already exists
  SELECT id INTO staff_member_id
  FROM public.staff_members
  WHERE user_id = staff_user_id
  LIMIT 1;
  
  IF staff_user_id IS NULL THEN
    RAISE WARNING 'Staff user (staff@demo.com) not found. Skipping staff_member creation.';
  ELSIF owner_user_id IS NULL THEN
    RAISE WARNING 'Owner user (owner@demo.com) not found. Skipping staff_member creation.';
  ELSIF staff_member_id IS NOT NULL THEN
    RAISE NOTICE 'Staff member record already exists for staff@demo.com (ID: %)', staff_member_id;
  ELSE
    -- Get staff profile for name
    SELECT * INTO staff_profile
    FROM public.user_profiles
    WHERE id = staff_user_id
    LIMIT 1;
    
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
      owner_user_id,
      staff_user_id,
      CASE 
        WHEN staff_profile.full_name IS NOT NULL AND staff_profile.full_name != '' THEN
          COALESCE(SPLIT_PART(staff_profile.full_name, ' ', 1), 'Demo')
        ELSE 'Demo'
      END,
      CASE 
        WHEN staff_profile.full_name IS NOT NULL AND staff_profile.full_name != '' THEN
          COALESCE(SPLIT_PART(staff_profile.full_name, ' ', 2), 'Staff')
        ELSE 'Staff'
      END,
      'staff@demo.com',
      'Staff Member',
      'active',
      NOW(),
      NOW()
    )
    RETURNING id INTO staff_member_id;
    
    RAISE NOTICE '✓ Created staff_member record for staff@demo.com (ID: %)', staff_member_id;
  END IF;
  
  -- Also create a record for demo@homecare.com if it exists
  SELECT id INTO staff_user_id
  FROM auth.users
  WHERE email = 'demo@homecare.com'
  LIMIT 1;
  
  IF staff_user_id IS NOT NULL THEN
    -- Check if staff_member record already exists
    SELECT id INTO staff_member_id
    FROM public.staff_members
    WHERE user_id = staff_user_id
    LIMIT 1;
    
    IF staff_member_id IS NULL THEN
      -- Get staff profile for name
      SELECT * INTO staff_profile
      FROM public.user_profiles
      WHERE id = staff_user_id
      LIMIT 1;
      
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
        owner_user_id,
        staff_user_id,
        CASE 
          WHEN staff_profile.full_name IS NOT NULL AND staff_profile.full_name != '' THEN
            COALESCE(SPLIT_PART(staff_profile.full_name, ' ', 1), 'Demo')
          ELSE 'Demo'
        END,
        CASE 
          WHEN staff_profile.full_name IS NOT NULL AND staff_profile.full_name != '' THEN
            COALESCE(SPLIT_PART(staff_profile.full_name, ' ', 2), 'Staff')
          ELSE 'Staff'
        END,
        'demo@homecare.com',
        'Staff Member',
        'active',
        NOW(),
        NOW()
      )
      RETURNING id INTO staff_member_id;
      
      RAISE NOTICE '✓ Created staff_member record for demo@homecare.com (ID: %)', staff_member_id;
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo staff member records created';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;

