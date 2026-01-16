-- Migration: Change staff_members.company_owner_id to reference clients.id instead of auth.users.id
-- This creates a direct relationship between staff_members and clients

-- Step 1: Add company_owner_id to clients table if it doesn't exist
-- This links clients to their company owner (user)
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS company_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for clients.company_owner_id
CREATE INDEX IF NOT EXISTS idx_clients_company_owner ON clients(company_owner_id);

-- Step 2: Populate clients.company_owner_id based on email matching
-- Match clients to company owners via contact_email
UPDATE clients c
SET company_owner_id = up.id
FROM user_profiles up
WHERE LOWER(TRIM(c.contact_email)) = LOWER(TRIM(up.email))
  AND up.role = 'company_owner'
  AND c.company_owner_id IS NULL;

-- Step 3: Add temporary column to store client_id during migration
ALTER TABLE staff_members
ADD COLUMN IF NOT EXISTS client_id_temp UUID;

-- Step 4: Migrate data: Map staff_members.company_owner_id (user) to client_id
-- Find the client that matches the staff member's company owner
UPDATE staff_members sm
SET client_id_temp = c.id
FROM clients c
WHERE c.company_owner_id = sm.company_owner_id
  AND sm.client_id_temp IS NULL;

-- Step 5: Drop existing foreign key constraint on company_owner_id
-- First, drop dependent policies that reference company_owner_id
DROP POLICY IF EXISTS "Company owners can view own staff" ON staff_members;
DROP POLICY IF EXISTS "Company owners can insert own staff" ON staff_members;
DROP POLICY IF EXISTS "Company owners can update own staff" ON staff_members;
DROP POLICY IF EXISTS "Company owners can delete own staff" ON staff_members;

-- Drop the foreign key constraint (PostgreSQL doesn't have a direct DROP CONSTRAINT IF EXISTS)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'staff_members_company_owner_id_fkey'
    AND table_name = 'staff_members'
  ) THEN
    ALTER TABLE staff_members DROP CONSTRAINT staff_members_company_owner_id_fkey;
  END IF;
END $$;

-- Step 6: Update company_owner_id column to reference clients instead
-- Copy client_id_temp to company_owner_id
UPDATE staff_members
SET company_owner_id = client_id_temp
WHERE client_id_temp IS NOT NULL;

-- Step 7: Add new foreign key constraint to clients table
ALTER TABLE staff_members
ADD CONSTRAINT staff_members_company_owner_id_fkey 
FOREIGN KEY (company_owner_id) REFERENCES clients(id) ON DELETE CASCADE;

-- Step 8: Make company_owner_id NOT NULL (after data migration)
-- First, handle any staff_members that couldn't be matched to a client
-- Set them to NULL temporarily, then we can decide what to do with them
ALTER TABLE staff_members
ALTER COLUMN company_owner_id DROP NOT NULL;

-- Update unmatched staff_members to NULL (they'll need to be manually assigned)
UPDATE staff_members
SET company_owner_id = NULL
WHERE client_id_temp IS NULL;

-- Now make it NOT NULL again (this will fail if there are NULLs, so we handle unmatched records above)
-- Actually, let's keep it nullable for now to handle edge cases
-- ALTER TABLE staff_members ALTER COLUMN company_owner_id SET NOT NULL;

-- Step 9: Drop temporary column
ALTER TABLE staff_members DROP COLUMN IF EXISTS client_id_temp;

-- Step 10: Update RLS policies to use client relationship
-- These policies check if the user is the company owner of the client
CREATE POLICY "Company owners can view own staff"
  ON staff_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = staff_members.company_owner_id
      AND c.company_owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can insert own staff"
  ON staff_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = staff_members.company_owner_id
      AND c.company_owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update own staff"
  ON staff_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = staff_members.company_owner_id
      AND c.company_owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can delete own staff"
  ON staff_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM clients c
      WHERE c.id = staff_members.company_owner_id
      AND c.company_owner_id = auth.uid()
    )
  );

-- Step 11: Update staff_licenses RLS policies to use new relationship
DROP POLICY IF EXISTS "Company owners can view own staff licenses" ON staff_licenses;
DROP POLICY IF EXISTS "Company owners can insert own staff licenses" ON staff_licenses;
DROP POLICY IF EXISTS "Company owners can update own staff licenses" ON staff_licenses;
DROP POLICY IF EXISTS "Company owners can delete own staff licenses" ON staff_licenses;

CREATE POLICY "Company owners can view own staff licenses"
  ON staff_licenses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      INNER JOIN clients c ON c.id = sm.company_owner_id
      WHERE sm.id = staff_licenses.staff_member_id
      AND c.company_owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can insert own staff licenses"
  ON staff_licenses FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members sm
      INNER JOIN clients c ON c.id = sm.company_owner_id
      WHERE sm.id = staff_licenses.staff_member_id
      AND c.company_owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can update own staff licenses"
  ON staff_licenses FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      INNER JOIN clients c ON c.id = sm.company_owner_id
      WHERE sm.id = staff_licenses.staff_member_id
      AND c.company_owner_id = auth.uid()
    )
  );

CREATE POLICY "Company owners can delete own staff licenses"
  ON staff_licenses FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members sm
      INNER JOIN clients c ON c.id = sm.company_owner_id
      WHERE sm.id = staff_licenses.staff_member_id
      AND c.company_owner_id = auth.uid()
    )
  );

-- Step 12: Add comment to document the change
COMMENT ON COLUMN staff_members.company_owner_id IS 'References clients.id (the client/company this staff member belongs to). Changed from referencing auth.users.id in migration 017.';

COMMENT ON COLUMN clients.company_owner_id IS 'References auth.users.id (the company owner user who owns this client company).';
