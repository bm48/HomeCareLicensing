-- Add expiry_date column to license_documents table
-- This allows documents to have their own expiry date, which can be set to match the license expiry date

ALTER TABLE license_documents
ADD COLUMN IF NOT EXISTS expiry_date DATE;

-- Add index for expiry_date for better query performance
CREATE INDEX IF NOT EXISTS idx_license_documents_expiry_date ON license_documents(expiry_date);

COMMENT ON COLUMN license_documents.expiry_date IS 'Expiry date of the document, typically set to match the license expiry date';
