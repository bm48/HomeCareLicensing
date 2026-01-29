-- Add estimated_days to license_requirement_steps for "Estimated Days" / estimated period
ALTER TABLE license_requirement_steps
ADD COLUMN IF NOT EXISTS estimated_days INTEGER;
