-- Add is_expert_step and phase to license_requirement_steps for Expert Process steps
ALTER TABLE license_requirement_steps
ADD COLUMN IF NOT EXISTS is_expert_step BOOLEAN DEFAULT FALSE;

ALTER TABLE license_requirement_steps
ADD COLUMN IF NOT EXISTS phase TEXT;

CREATE INDEX IF NOT EXISTS idx_license_requirement_steps_expert
  ON license_requirement_steps(license_requirement_id, is_expert_step)
  WHERE is_expert_step = true;
