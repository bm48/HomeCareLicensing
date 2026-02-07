-- Link application_documents to license_requirement_documents so each upload fulfills a requirement template
ALTER TABLE application_documents
  ADD COLUMN IF NOT EXISTS license_requirement_document_id UUID REFERENCES license_requirement_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_application_documents_requirement_doc
  ON application_documents(license_requirement_document_id);

COMMENT ON COLUMN application_documents.license_requirement_document_id IS 'The license requirement document this upload fulfills (template).';
