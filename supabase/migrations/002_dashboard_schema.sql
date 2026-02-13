-- Create licenses table
CREATE TABLE IF NOT EXISTS licenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL,
  license_name TEXT NOT NULL,
  license_number TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'expiring', 'expired', 'pending')) DEFAULT 'pending',
  activated_date DATE,
  expiry_date DATE NOT NULL,
  renewal_due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_licenses_owner ON licenses(company_owner_id);
CREATE INDEX IF NOT EXISTS idx_licenses_status ON licenses(status);
CREATE INDEX IF NOT EXISTS idx_licenses_expiry ON licenses(expiry_date);

-- Create license_documents table
CREATE TABLE IF NOT EXISTS license_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  license_id UUID REFERENCES licenses(id) ON DELETE CASCADE NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_license_documents_license ON license_documents(license_id);

-- Create applications table
CREATE TABLE IF NOT EXISTS applications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  state TEXT NOT NULL,
  application_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in_progress', 'under_review', 'needs_revision', 'approved', 'rejected')) DEFAULT 'in_progress',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  started_date DATE NOT NULL,
  last_updated_date DATE NOT NULL,
  submitted_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_applications_owner ON applications(company_owner_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

alter table application_steps
  add column if not exists instructions text;
  
-- Create application_documents table
CREATE TABLE IF NOT EXISTS application_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_application_documents_application ON application_documents(application_id);

-- Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  job_title TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'pending')) DEFAULT 'active',
  employee_id TEXT,
  start_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_members_owner ON staff_members(company_owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_status ON staff_members(status);

-- Create staff_licenses table (for staff certifications and licenses)
CREATE TABLE IF NOT EXISTS staff_licenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  staff_member_id UUID REFERENCES staff_members(id) ON DELETE CASCADE NOT NULL,
  license_type TEXT NOT NULL,
  license_number TEXT NOT NULL,
  state TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'expiring', 'expired')) DEFAULT 'active',
  issue_date DATE,
  expiry_date DATE NOT NULL,
  days_until_expiry INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_staff_licenses_staff ON staff_licenses(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_staff_licenses_status ON staff_licenses(status);
CREATE INDEX IF NOT EXISTS idx_staff_licenses_expiry ON staff_licenses(expiry_date);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('license_expiring', 'license_expired', 'application_update', 'document_approved', 'document_rejected', 'staff_certification_expiring', 'general')) DEFAULT 'general',
  icon_type TEXT CHECK (icon_type IN ('exclamation', 'document', 'bell', 'check', 'warning')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- Add triggers for updated_at
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_members_updated_at BEFORE UPDATE ON staff_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_staff_licenses_updated_at BEFORE UPDATE ON staff_licenses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE license_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for licenses
CREATE POLICY "Company owners can view own licenses"
  ON licenses FOR SELECT
  USING (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can insert own licenses"
  ON licenses FOR INSERT
  WITH CHECK (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can update own licenses"
  ON licenses FOR UPDATE
  USING (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can delete own licenses"
  ON licenses FOR DELETE
  USING (auth.uid() = company_owner_id);

-- RLS Policies for license_documents
CREATE POLICY "Company owners can view own license documents"
  ON license_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM licenses WHERE licenses.id = license_documents.license_id AND licenses.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can insert own license documents"
  ON license_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM licenses WHERE licenses.id = license_documents.license_id AND licenses.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can update own license documents"
  ON license_documents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM licenses WHERE licenses.id = license_documents.license_id AND licenses.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can delete own license documents"
  ON license_documents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM licenses WHERE licenses.id = license_documents.license_id AND licenses.company_owner_id = auth.uid()
  ));

-- RLS Policies for applications
CREATE POLICY "Company owners can view own applications"
  ON applications FOR SELECT
  USING (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can insert own applications"
  ON applications FOR INSERT
  WITH CHECK (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can update own applications"
  ON applications FOR UPDATE
  USING (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can delete own applications"
  ON applications FOR DELETE
  USING (auth.uid() = company_owner_id);

-- RLS Policies for application_documents
CREATE POLICY "Company owners can view own application documents"
  ON application_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM applications WHERE applications.id = application_documents.application_id AND applications.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can insert own application documents"
  ON application_documents FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM applications WHERE applications.id = application_documents.application_id AND applications.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can update own application documents"
  ON application_documents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM applications WHERE applications.id = application_documents.application_id AND applications.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can delete own application documents"
  ON application_documents FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM applications WHERE applications.id = application_documents.application_id AND applications.company_owner_id = auth.uid()
  ));


CREATE POLICY "Experts can view own application documents"
  ON application_documents FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM applications WHERE applications.id = application_documents.application_id AND applications.assigned_expert_id = auth.uid()
  ));


CREATE POLICY "Experts can update own application documents"
  ON application_documents FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM applications WHERE applications.id = application_documents.application_id AND applications.assigned_expert_id = auth.uid()
  ));




-- RLS Policies for staff_members
CREATE POLICY "Company owners can view own staff"
  ON staff_members FOR SELECT
  USING (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can insert own staff"
  ON staff_members FOR INSERT
  WITH CHECK (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can update own staff"
  ON staff_members FOR UPDATE
  USING (auth.uid() = company_owner_id);

CREATE POLICY "Company owners can delete own staff"
  ON staff_members FOR DELETE
  USING (auth.uid() = company_owner_id);

-- RLS Policies for staff_licenses
CREATE POLICY "Company owners can view own staff licenses"
  ON staff_licenses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM staff_members WHERE staff_members.id = staff_licenses.staff_member_id AND staff_members.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can insert own staff licenses"
  ON staff_licenses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM staff_members WHERE staff_members.id = staff_licenses.staff_member_id AND staff_members.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can update own staff licenses"
  ON staff_licenses FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM staff_members WHERE staff_members.id = staff_licenses.staff_member_id AND staff_members.company_owner_id = auth.uid()
  ));

CREATE POLICY "Company owners can delete own staff licenses"
  ON staff_licenses FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM staff_members WHERE staff_members.id = staff_licenses.staff_member_id AND staff_members.company_owner_id = auth.uid()
  ));

-- RLS Policies for notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Function to update days_until_expiry for staff_licenses
CREATE OR REPLACE FUNCTION update_staff_license_expiry_days()
RETURNS TRIGGER AS $$
BEGIN
  NEW.days_until_expiry = NEW.expiry_date - CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_license_expiry_days_trigger
  BEFORE INSERT OR UPDATE ON staff_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_staff_license_expiry_days();




-- Add description and expert_review_notes fields to application_documents table

ALTER TABLE application_documents
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS expert_review_notes TEXT;

-- Add comment for documentation
COMMENT ON COLUMN application_documents.description IS 'Description provided by the client when uploading the document';
COMMENT ON COLUMN application_documents.expert_review_notes IS 'Review notes provided by the expert when approving or rejecting the document';


-- Run this in Supabase SQL Editor
ALTER TABLE license_documents
ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE INDEX IF NOT EXISTS idx_license_documents_expiry_date ON license_documents(expiry_date);

-- add instrunctions column to application_steps
ALTER TABLE application_steps
  ADD COLUMN instructions text;
