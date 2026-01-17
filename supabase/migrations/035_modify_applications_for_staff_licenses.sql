-- Modify applications table to support staff member licenses
-- Instead of using a separate staff_licenses table, we'll use applications for both
-- company owner applications and staff member licenses

-- Step 1: Make company_owner_id nullable to support staff member licenses
-- First, we need to drop the NOT NULL constraint
ALTER TABLE applications
ALTER COLUMN company_owner_id DROP NOT NULL;

-- Step 2: Add staff_member_id column to applications (nullable, so existing applications still work)
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS staff_member_id UUID REFERENCES staff_members(id) ON DELETE CASCADE;

-- Step 3: Add license-specific columns to applications
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS license_number TEXT,
ADD COLUMN IF NOT EXISTS issue_date DATE,
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS days_until_expiry INTEGER,
ADD COLUMN IF NOT EXISTS issuing_authority TEXT;

-- Step 4: Create index for staff_member_id
CREATE INDEX IF NOT EXISTS idx_applications_staff_member ON applications(staff_member_id);

-- Step 5: Create index for expiry_date (useful for staff licenses)
CREATE INDEX IF NOT EXISTS idx_applications_expiry_date ON applications(expiry_date);

-- Step 6: Add check constraint to ensure either company_owner_id or staff_member_id is set
ALTER TABLE applications
ADD CONSTRAINT applications_owner_or_staff_check 
CHECK (
  (company_owner_id IS NOT NULL AND staff_member_id IS NULL) OR
  (company_owner_id IS NULL AND staff_member_id IS NOT NULL)
);

-- Step 7: Update RLS policies to allow staff members to view their own applications/licenses
-- Drop existing staff member policy if it exists
DROP POLICY IF EXISTS "Staff members can view own applications" ON applications;
DROP POLICY IF EXISTS "Staff members can insert own applications" ON applications;
DROP POLICY IF EXISTS "Staff members can update own applications" ON applications;
DROP POLICY IF EXISTS "Staff members can delete own applications" ON applications;

-- Create RLS policies for staff members
CREATE POLICY "Staff members can view own applications"
  ON applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM staff_members 
      WHERE staff_members.id = applications.staff_member_id 
      AND staff_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff members can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM staff_members 
      WHERE staff_members.id = applications.staff_member_id 
      AND staff_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff members can update own applications"
  ON applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members 
      WHERE staff_members.id = applications.staff_member_id 
      AND staff_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Staff members can delete own applications"
  ON applications FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM staff_members 
      WHERE staff_members.id = applications.staff_member_id 
      AND staff_members.user_id = auth.uid()
    )
  );

-- Step 8: Create or replace function to update days_until_expiry for applications
CREATE OR REPLACE FUNCTION update_application_expiry_days()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    NEW.days_until_expiry = NEW.expiry_date - CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create trigger to automatically update days_until_expiry
DROP TRIGGER IF EXISTS update_application_expiry_days_trigger ON applications;
CREATE TRIGGER update_application_expiry_days_trigger
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION update_application_expiry_days();

-- Step 10: Update existing company owner policies to handle nullable company_owner_id
-- The existing policies should still work, but we need to ensure they only apply when company_owner_id is not null
-- The existing policies from migration 002 should handle this correctly since they check auth.uid() = company_owner_id
-- which will be false when company_owner_id is NULL
