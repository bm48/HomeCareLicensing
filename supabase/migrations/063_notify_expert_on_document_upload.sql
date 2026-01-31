-- Migration: Notify assigned expert when owner uploads a document to an application
-- When a row is inserted into application_documents, create a notification for the application's assigned expert.

CREATE OR REPLACE FUNCTION notify_expert_on_document_upload()
RETURNS TRIGGER AS $$
DECLARE
  expert_id UUID;
BEGIN
  -- Get the assigned expert for this application (if any)
  SELECT assigned_expert_id INTO expert_id
  FROM applications
  WHERE id = NEW.application_id;

  -- Only create notification if the application has an assigned expert
  IF expert_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, type)
    VALUES (
      expert_id,
      'New Document Uploaded',
      'application_update'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: after insert on application_documents
DROP TRIGGER IF EXISTS notify_expert_on_document_upload_trigger ON application_documents;
CREATE TRIGGER notify_expert_on_document_upload_trigger
  AFTER INSERT ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION notify_expert_on_document_upload();

COMMENT ON FUNCTION notify_expert_on_document_upload() IS 'Creates a notification for the assigned expert when an owner uploads a document to an application. Runs with SECURITY DEFINER to bypass RLS.';
