-- Create function to update user password
-- This function uses SECURITY DEFINER to bypass RLS and update passwords

CREATE OR REPLACE FUNCTION update_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgcrypto
AS $$
DECLARE
  v_encrypted_pw TEXT;
BEGIN
  -- Encrypt the new password
  v_encrypted_pw := crypt(p_new_password, gen_salt('bf', 10));
  
  -- Update password in auth.users table
  UPDATE auth.users
  SET 
    encrypted_password = v_encrypted_pw,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to update password: %', SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users (admins will be checked by RLS)
GRANT EXECUTE ON FUNCTION update_user_password(UUID, TEXT) TO authenticated;

-- Verify the function was created
DO $$
BEGIN
  RAISE NOTICE 'Function update_user_password created successfully';
END $$;
