-- Migration: Add pricing history support
-- This allows tracking pricing changes over time and maintaining billing history

-- Add effective_date column to pricing table
ALTER TABLE pricing 
ADD COLUMN IF NOT EXISTS effective_date DATE DEFAULT CURRENT_DATE;

-- Add index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_pricing_effective_date ON pricing(effective_date);

-- Update existing pricing records to have effective_date = created_at date
UPDATE pricing 
SET effective_date = DATE(created_at)
WHERE effective_date IS NULL;

-- Make effective_date NOT NULL after setting defaults
ALTER TABLE pricing 
ALTER COLUMN effective_date SET NOT NULL;

-- Add comment explaining the purpose
COMMENT ON COLUMN pricing.effective_date IS 'The date from which this pricing becomes effective. Used to maintain billing history when pricing changes.';
