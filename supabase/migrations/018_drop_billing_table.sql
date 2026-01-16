-- Migration: Drop billing table
-- The billing table is no longer needed as billing is now calculated dynamically
-- from staff_members, applications, license_types, and pricing tables

-- Step 1: Drop RLS policies for billing table
DROP POLICY IF EXISTS "Admins can view all billing" ON billing;
DROP POLICY IF EXISTS "Admins can manage billing" ON billing;

-- Step 2: Drop trigger for billing table
DROP TRIGGER IF EXISTS update_billing_updated_at ON billing;

-- Step 3: Drop indexes (they will be automatically dropped with the table, but being explicit)
DROP INDEX IF EXISTS idx_billing_client;
DROP INDEX IF EXISTS idx_billing_month;
DROP INDEX IF EXISTS idx_billing_status;

-- Step 4: Drop the billing table
-- This will also drop the foreign key constraint to clients table
DROP TABLE IF EXISTS billing CASCADE;
