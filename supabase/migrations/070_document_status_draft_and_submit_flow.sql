-- Document template workflow: draft -> (owner submit) -> pending -> expert approve -> completed (approved) or expert reject -> draft
-- 1. Add 'draft' status. New uploads start as 'draft'; owner submits -> 'pending'; expert approves -> 'approved'; expert rejects -> 'draft'
-- 2. Existing rows that were 'pending' (old "just uploaded") become 'draft' so owner can submit.

-- First allow 'draft' in the constraint (must do this before any INSERT/UPDATE with status 'draft')
ALTER TABLE application_documents
  DROP CONSTRAINT IF EXISTS application_documents_status_check;

ALTER TABLE application_documents
  ADD CONSTRAINT application_documents_status_check
  CHECK (status IN ('draft', 'pending', 'approved', 'rejected'));

ALTER TABLE application_documents
  ALTER COLUMN status SET DEFAULT 'draft';

-- Migrate existing "pending" (previously meaning just uploaded) to draft so new submit flow applies
UPDATE application_documents SET status = 'draft' WHERE status = 'pending';

-- New rows default to 'draft' when created by owner upload
COMMENT ON COLUMN application_documents.status IS 'draft=just uploaded; pending=submitted for review; approved=expert approved (UI: completed); rejected=expert rejected, back to draft';

-- Notify expert when owner submits a document (status changes from draft to pending)
CREATE OR REPLACE FUNCTION notify_expert_on_document_submitted()
RETURNS TRIGGER AS $$
DECLARE
  expert_id UUID;
BEGIN
  IF (OLD.status = 'draft' OR OLD.status = 'rejected') AND NEW.status = 'pending' THEN
    SELECT assigned_expert_id INTO expert_id
    FROM applications
    WHERE id = NEW.application_id;

    IF expert_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, type)
      VALUES (
        expert_id,
        'Document Submitted for Review',
        'application_update'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS notify_expert_on_document_submitted_trigger ON application_documents;
CREATE TRIGGER notify_expert_on_document_submitted_trigger
  AFTER UPDATE ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_expert_on_document_submitted();

COMMENT ON FUNCTION notify_expert_on_document_submitted() IS 'Notifies assigned expert when owner submits a document (draft -> pending).';

-- Notify expert only when owner submits (draft -> pending), not on every upload (draft).
DROP TRIGGER IF EXISTS notify_expert_on_document_upload_trigger ON application_documents;
