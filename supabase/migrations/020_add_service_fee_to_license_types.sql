-- Migration: Add service_fee column to license_types table
-- File: supabase/migrations/020_add_service_fee_to_license_types.sql
-- This migration adds a service_fee column to store service fees separately from application fees

-- Add service_fee column if it doesn't exist
ALTER TABLE license_types
ADD COLUMN IF NOT EXISTS service_fee NUMERIC DEFAULT 0;

-- Add service_fee_display column for formatted display
ALTER TABLE license_types
ADD COLUMN IF NOT EXISTS service_fee_display TEXT;

-- Update existing records: calculate service fee as 10% of application fee if not set
UPDATE license_types
SET service_fee = COALESCE(
  service_fee,
  CASE 
    WHEN cost_min IS NOT NULL THEN cost_min * 0.1
    ELSE 0
  END
),
service_fee_display = COALESCE(
  service_fee_display,
  CASE 
    WHEN cost_min IS NOT NULL THEN '$' || ROUND(cost_min * 0.1)::TEXT
    ELSE '$0'
  END
)
WHERE service_fee IS NULL OR service_fee = 0;
