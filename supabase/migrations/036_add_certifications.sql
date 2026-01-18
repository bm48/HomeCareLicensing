-- Enable UUID generation (run once per project)
create extension if not exists "uuid-ossp";

-- Create certifications table
create table public.certifications (
  id uuid primary key default uuid_generate_v4(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  type text not null,
  license_number text not null,
  state text,

  issue_date date,
  expiration_date date not null,

  issuing_authority text not null,

  status text not null default 'Active',

  document_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);





CREATE POLICY "User can manage own certifications"
ON certifications
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- Insert 7 records into certification_types table
INSERT INTO certification_types (certification_type) VALUES
  ('CPR Certification'),
  ('First Aid Certification'),
  ('Home Health Aide Certification'),
  ('Registered Nurse License'),
  ('Medication Administration Certification'),
  ('Background Check Clearance'),
  ('TB Test Clearance');