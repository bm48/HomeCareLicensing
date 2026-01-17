-- Staff Dashboard RLS Policies
-- This migration adds RLS policies to allow staff members to view their own licenses

-- Add RLS policies for staff_members to allow staff to view their own record
DROP POLICY IF EXISTS "Staff members can view own record" ON staff_members;
CREATE POLICY "Staff members can view own record"
  ON staff_members FOR SELECT
  USING (user_id = auth.uid());

-- -- Add RLS policies for staff_licenses to allow staff to view their own licenses
-- DROP POLICY IF EXISTS "Staff members can view own licenses" ON staff_licenses;
-- CREATE POLICY "Staff members can view own licenses"
--   ON staff_licenses FOR SELECT
--   USING (EXISTS (
--     SELECT 1 FROM staff_members 
--     WHERE staff_members.id = staff_licenses.staff_member_id 
--     AND staff_members.user_id = auth.uid()
--   ));

-- Add RLS policies for applications to allow staff to view their own licenses.
DROP POLICY IF EXISTS "Staff members can view own licenses" ON applications;
CREATE POLICY "Staff members can view own licenses"
  ON applications FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff_members 
    WHERE staff_members.id is not null 
    AND staff_members.user_id = auth.uid()
  ));



-- Add issuing_authority column to staff_licenses if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'staff_licenses' 
    AND column_name = 'issuing_authority'
  ) THEN
    ALTER TABLE staff_licenses ADD COLUMN issuing_authority TEXT;
  END IF;
END $$;

