-- Migration: Create function to add licensing experts
-- This function creates both the user account and licensing_expert record
-- Run this in Supabase SQL Editor

-- Enable pgcrypto extension if not already enabled
-- Note: This must be run as a superuser/database owner
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop function if exists to recreate it
DROP FUNCTION IF EXISTS create_licensing_expert(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS create_licensing_expert;

-- Create the function
CREATE OR REPLACE FUNCTION create_licensing_expert(
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_password TEXT,
  p_phone TEXT DEFAULT NULL,
  p_expertise TEXT DEFAULT NULL,
  p_role TEXT DEFAULT 'Licensing Specialist',
  p_status TEXT DEFAULT 'active'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgcrypto
AS $$
DECLARE
  v_user_id UUID;
  v_expert_id UUID;
  v_instance_uuid UUID;
  v_now_ts TIMESTAMPTZ;
  v_encrypted_pw TEXT;
BEGIN
  v_now_ts := NOW();
  
  -- Get instance UUID
  SELECT COALESCE(
    (SELECT instance_id FROM auth.users LIMIT 1),
    (SELECT id FROM auth.instances LIMIT 1),
    '00000000-0000-0000-0000-000000000000'::uuid
  ) INTO v_instance_uuid;
  
  -- Check if user already exists
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = LOWER(TRIM(p_email))
  LIMIT 1;
  
  -- Create user if doesn't exist
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    -- Hash the password using bcrypt with cost 10
    -- pgcrypto is in search_path, so we can use gen_salt directly
    v_encrypted_pw := crypt(p_password, gen_salt('bf', 10));
    
    INSERT INTO auth.users (
      id, instance_id, email, encrypted_password, email_confirmed_at, invited_at,
      confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at,
      email_change_token_new, email_change, email_change_sent_at, last_sign_in_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at,
      phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at,
      confirmed_at, email_change_token_current, email_change_confirm_status,
      banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user,
      deleted_at, aud, role
    ) VALUES (
      v_user_id, v_instance_uuid, LOWER(TRIM(p_email)), v_encrypted_pw, v_now_ts, NULL,
      '', NULL, '', NULL, '', '', NULL, NULL,
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_first_name || ' ' || p_last_name, 'role', 'expert'),
      FALSE, v_now_ts, v_now_ts, p_phone, NULL, '', '', NULL,
      v_now_ts, '', 0, NULL, '', NULL, FALSE, NULL, 'authenticated', 'authenticated'
    );
    
    -- Create user profile
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (v_user_id, LOWER(TRIM(p_email)), p_first_name || ' ' || p_last_name, 'expert')
    ON CONFLICT (id) DO UPDATE
    SET 
      full_name = EXCLUDED.full_name, 
      role = EXCLUDED.role,
      email = EXCLUDED.email,
      updated_at = v_now_ts;
  END IF;
  
  -- Create or update licensing_expert record
  INSERT INTO licensing_experts (user_id, first_name, last_name, email, phone, status, expertise, role)
  VALUES (
    v_user_id,
    p_first_name,
    p_last_name,
    LOWER(TRIM(p_email)),
    p_phone,
    p_status,
    p_expertise,
    p_role
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    status = EXCLUDED.status,
    expertise = EXCLUDED.expertise,
    role = EXCLUDED.role,
    updated_at = v_now_ts
  RETURNING id INTO v_expert_id;
  
  RETURN v_expert_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create licensing expert: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (admins will be checked by RLS)
GRANT EXECUTE ON FUNCTION create_licensing_expert(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Verify the function was created
DO $$
BEGIN
  RAISE NOTICE 'Function create_licensing_expert created successfully';
END $$;
