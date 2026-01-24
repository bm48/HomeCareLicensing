-- Add company details fields to clients table
-- These fields allow company owners to store comprehensive company information

-- Business Information
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS tax_id TEXT,
ADD COLUMN IF NOT EXISTS primary_license_number TEXT,
ADD COLUMN IF NOT EXISTS website TEXT;

-- Physical Address
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS physical_street_address TEXT,
ADD COLUMN IF NOT EXISTS physical_city TEXT,
ADD COLUMN IF NOT EXISTS physical_state TEXT,
ADD COLUMN IF NOT EXISTS physical_zip_code TEXT;

-- Mailing Address
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS mailing_street_address TEXT,
ADD COLUMN IF NOT EXISTS mailing_city TEXT,
ADD COLUMN IF NOT EXISTS mailing_state TEXT,
ADD COLUMN IF NOT EXISTS mailing_zip_code TEXT;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_clients_business_type ON clients(business_type);
CREATE INDEX IF NOT EXISTS idx_clients_physical_state ON clients(physical_state);

COMMENT ON COLUMN clients.business_type IS 'Type of business (e.g., Home Healthcare Agency)';
COMMENT ON COLUMN clients.tax_id IS 'Tax ID / EIN number';
COMMENT ON COLUMN clients.primary_license_number IS 'Primary license number for the company';
COMMENT ON COLUMN clients.website IS 'Company website URL';
COMMENT ON COLUMN clients.physical_street_address IS 'Physical street address';
COMMENT ON COLUMN clients.physical_city IS 'Physical city';
COMMENT ON COLUMN clients.physical_state IS 'Physical state';
COMMENT ON COLUMN clients.physical_zip_code IS 'Physical ZIP code';
COMMENT ON COLUMN clients.mailing_street_address IS 'Mailing street address (if different from physical)';
COMMENT ON COLUMN clients.mailing_city IS 'Mailing city (if different from physical)';
COMMENT ON COLUMN clients.mailing_state IS 'Mailing state (if different from physical)';
COMMENT ON COLUMN clients.mailing_zip_code IS 'Mailing ZIP code (if different from physical)';
