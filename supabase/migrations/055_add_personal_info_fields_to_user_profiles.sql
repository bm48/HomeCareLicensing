-- Add personal information fields to user_profiles table
-- These fields allow users to store additional personal information

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS department TEXT,
ADD COLUMN IF NOT EXISTS work_location TEXT,
ADD COLUMN IF NOT EXISTS start_date DATE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_profiles_job_title ON user_profiles(job_title);
CREATE INDEX IF NOT EXISTS idx_user_profiles_department ON user_profiles(department);

COMMENT ON COLUMN user_profiles.phone IS 'User phone number';
COMMENT ON COLUMN user_profiles.job_title IS 'User job title';
COMMENT ON COLUMN user_profiles.department IS 'User department';
COMMENT ON COLUMN user_profiles.work_location IS 'User work location';
COMMENT ON COLUMN user_profiles.start_date IS 'User start date';
