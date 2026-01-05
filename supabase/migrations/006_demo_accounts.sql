-- ============================================================================
-- Demo Accounts Migration - CORRECTED VERSION
-- ============================================================================
-- This migration creates demo user accounts with properly hashed passwords.
-- Password for all accounts: demo123
--
-- IMPORTANT: This script deletes existing demo users first, then recreates them
-- with properly formatted passwords that Supabase can authenticate.
-- ============================================================================

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- First, delete any existing demo users to start fresh
DO $$
DECLARE
  demo_emails TEXT[] := ARRAY['owner@demo.com', 'admin@demo.com', 'staff@demo.com', 'expert@demo.com'];
  demo_email TEXT;
  user_id_val UUID;
BEGIN
  FOREACH demo_email IN ARRAY demo_emails
  LOOP
    -- Get user ID
    SELECT id INTO user_id_val
    FROM auth.users
    WHERE email = demo_email;
    
    -- Delete user if exists (cascade will delete profile)
    IF user_id_val IS NOT NULL THEN
      DELETE FROM auth.users WHERE id = user_id_val;
      RAISE NOTICE 'Deleted existing user: %', demo_email;
    END IF;
  END LOOP;
END $$;

-- Function to create demo users with proper Supabase format
CREATE OR REPLACE FUNCTION create_demo_user(
  email_address TEXT,
  password_text TEXT,
  full_name_text TEXT,
  role_text TEXT
)
RETURNS UUID AS $$
DECLARE
  user_id UUID;
  encrypted_pw TEXT;
  instance_uuid UUID;
  now_ts TIMESTAMPTZ;
BEGIN
  -- Get current timestamp
  now_ts := NOW();
  
  -- Get the instance ID (required by Supabase)
  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    (SELECT id FROM auth.instances LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO instance_uuid;
  
  -- Generate a new UUID for the user
  user_id := gen_random_uuid();
  
  -- Hash the password using bcrypt with cost 10
  -- This matches Supabase's password hashing format
  encrypted_pw := crypt(password_text, gen_salt('bf', 10));
  
  -- Insert into auth.users with ALL required fields
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    confirmed_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at,
    aud,
    role
  ) VALUES (
    user_id,
    instance_uuid,
    LOWER(TRIM(email_address)),
    encrypted_pw,
    now_ts,                    -- email_confirmed_at
    NULL,                       -- invited_at
    '',                         -- confirmation_token
    NULL,                       -- confirmation_sent_at
    '',                         -- recovery_token
    NULL,                       -- recovery_sent_at
    '',                         -- email_change_token_new
    '',                         -- email_change
    NULL,                       -- email_change_sent_at
    NULL,                       -- last_sign_in_at
    '{"provider":"email","providers":["email"]}'::jsonb,  -- raw_app_meta_data
    jsonb_build_object('full_name', full_name_text, 'role', role_text),  -- raw_user_meta_data
    FALSE,                      -- is_super_admin
    now_ts,                     -- created_at
    now_ts,                     -- updated_at
    NULL,                       -- phone
    NULL,                       -- phone_confirmed_at
    '',                         -- phone_change
    '',                         -- phone_change_token
    NULL,                       -- phone_change_sent_at
    now_ts,                     -- confirmed_at (CRITICAL - user must be confirmed)
    '',                         -- email_change_token_current
    0,                          -- email_change_confirm_status
    NULL,                       -- banned_until
    '',                         -- reauthentication_token
    NULL,                       -- reauthentication_sent_at
    FALSE,                      -- is_sso_user
    NULL,                       -- deleted_at
    'authenticated',            -- aud
    'authenticated'             -- role
  );
  
  -- Profile will be created by trigger, but ensure it exists with correct data
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (user_id, LOWER(TRIM(email_address)), full_name_text, role_text)
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name, 
    role = EXCLUDED.role,
    email = EXCLUDED.email,
    updated_at = now_ts;
  
  RETURN user_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating user %: %', email_address, SQLERRM;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create demo accounts
DO $$
DECLARE
  user_id UUID;
  success_count INTEGER := 0;
BEGIN
  -- Company Owner
  user_id := create_demo_user(
    'owner@demo.com',
    'demo123',
    'Demo Company Owner',
    'company_owner'
  );
  IF user_id IS NOT NULL THEN
    RAISE NOTICE '✓ Created: owner@demo.com (ID: %)', user_id;
    success_count := success_count + 1;
  ELSE
    RAISE WARNING '✗ Failed: owner@demo.com';
  END IF;
  
  -- Admin
  user_id := create_demo_user(
    'admin@demo.com',
    'demo123',
    'Demo Admin',
    'admin'
  );
  IF user_id IS NOT NULL THEN
    RAISE NOTICE '✓ Created: admin@demo.com (ID: %)', user_id;
    success_count := success_count + 1;
  ELSE
    RAISE WARNING '✗ Failed: admin@demo.com';
  END IF;
  
  -- Staff Member
  user_id := create_demo_user(
    'staff@demo.com',
    'demo123',
    'Demo Staff Member',
    'staff_member'
  );
  IF user_id IS NOT NULL THEN
    RAISE NOTICE '✓ Created: staff@demo.com (ID: %)', user_id;
    success_count := success_count + 1;
  ELSE
    RAISE WARNING '✗ Failed: staff@demo.com';
  END IF;
  
  -- Expert
  user_id := create_demo_user(
    'expert@demo.com',
    'demo123',
    'Demo Expert',
    'expert'
  );
  IF user_id IS NOT NULL THEN
    RAISE NOTICE '✓ Created: expert@demo.com (ID: %)', user_id;
    success_count := success_count + 1;
  ELSE
    RAISE WARNING '✗ Failed: expert@demo.com';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Created %/4 demo users successfully', success_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Login credentials:';
  RAISE NOTICE '  owner@demo.com / demo123 (Company Owner)';
  RAISE NOTICE '  admin@demo.com / demo123 (Admin)';
  RAISE NOTICE '  staff@demo.com / demo123 (Staff Member)';
  RAISE NOTICE '  expert@demo.com / demo123 (Expert)';
  RAISE NOTICE '';
END $$;

-- Verify the users were created correctly
DO $$
DECLARE
  user_count INTEGER;
  confirmed_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM auth.users
  WHERE email IN ('owner@demo.com', 'admin@demo.com', 'staff@demo.com', 'expert@demo.com');
  
  SELECT COUNT(*) INTO confirmed_count
  FROM auth.users
  WHERE email IN ('owner@demo.com', 'admin@demo.com', 'staff@demo.com', 'expert@demo.com')
    AND email_confirmed_at IS NOT NULL
    AND confirmed_at IS NOT NULL
    AND encrypted_password IS NOT NULL
    AND encrypted_password != '';
  
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  Total users: %', user_count;
  RAISE NOTICE '  Confirmed users with passwords: %', confirmed_count;
  
  IF confirmed_count < 4 THEN
    RAISE WARNING 'Some users may not be properly configured. Check auth.users table.';
  END IF;
END $$;

-- Clean up the function (optional - you can keep it for future use)
-- DROP FUNCTION IF EXISTS create_demo_user(TEXT, TEXT, TEXT, TEXT);
