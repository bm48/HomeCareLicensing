-- Migration: Notify owner when expert approves a document
-- When an application_document is updated to status 'approved', create a notification for the application's company owner.

CREATE OR REPLACE FUNCTION notify_owner_on_document_approved()
RETURNS TRIGGER AS $$
DECLARE
  owner_id UUID;
BEGIN
  -- Only run when status changes to 'approved'
  IF NEW.status <> 'approved' THEN
    RETURN NEW;
  END IF;
  IF OLD.status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- Get the company owner for this application
  SELECT company_owner_id INTO owner_id
  FROM applications
  WHERE id = NEW.application_id;

  IF owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (
      owner_id,
      'Document Approved',
      'document_approved'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: after update on application_documents
DROP TRIGGER IF EXISTS notify_owner_on_document_approved_trigger ON application_documents;
CREATE TRIGGER notify_owner_on_document_approved_trigger
  AFTER UPDATE ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_owner_on_document_approved();

COMMENT ON FUNCTION notify_owner_on_document_approved() IS 'Creates a notification for the company owner when an expert approves a document. Runs with SECURITY DEFINER to bypass RLS.';
