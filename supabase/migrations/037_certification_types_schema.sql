-- Create certification_types table
CREATE TABLE certification_types (
  id SERIAL PRIMARY KEY,
  certification_type VARCHAR(255) NOT NULL
);

ALTER TABLE certification_types
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Insert 7 records into certification_types table
INSERT INTO certification_types (certification_type) VALUES
  ('CPR Certification'),
  ('First Aid Certification'),
  ('Home Health Aide Certification'),
  ('Registered Nurse License'),
  ('Medication Administration Certification'),
  ('Background Check Clearance'),
  ('TB Test Clearance');
  

CREATE POLICY "Allow staff to read certification types"
ON certification_types
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE auth.uid() = user_profiles.id
    AND user_profiles.role = 'staff_member'
  )
);