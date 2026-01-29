-- Add is_required to license_requirement_steps (like license_requirement_documents)
ALTER TABLE license_requirement_steps
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;
