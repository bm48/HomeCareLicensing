-- Create issuing_authorities table
CREATE TABLE IF NOT EXISTS issuing_authorities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create staff_roles table
CREATE TABLE IF NOT EXISTS staff_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE issuing_authorities ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_roles ENABLE ROW LEVEL SECURITY;

-- Allow admins to manage issuing_authorities
CREATE POLICY "Admins can manage issuing_authorities"
ON issuing_authorities
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE auth.uid() = user_profiles.id
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE auth.uid() = user_profiles.id
    AND user_profiles.role = 'admin'
  )
);

-- Allow authenticated users to read issuing_authorities
CREATE POLICY "Authenticated users can read issuing_authorities"
ON issuing_authorities
FOR SELECT
TO authenticated
USING (true);

-- Allow admins to manage staff_roles
CREATE POLICY "Admins can manage staff_roles"
ON staff_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE auth.uid() = user_profiles.id
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE auth.uid() = user_profiles.id
    AND user_profiles.role = 'admin'
  )
);

-- Allow authenticated users to read staff_roles
CREATE POLICY "Authenticated users can read staff_roles"
ON staff_roles
FOR SELECT
TO authenticated
USING (true);

-- Update certification_types RLS to allow admins to manage
DROP POLICY IF EXISTS "Allow staff to read certification types" ON certification_types;

CREATE POLICY "Authenticated users can read certification types"
ON certification_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage certification types"
ON certification_types
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE auth.uid() = user_profiles.id
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE auth.uid() = user_profiles.id
    AND user_profiles.role = 'admin'
  )
);
