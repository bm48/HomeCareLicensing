-- Allow 'closed' (and 'requested', 'cancelled') on applications.status so expert/admin can close completed applications.
-- PostgreSQL names the inline CHECK as applications_status_check.

ALTER TABLE applications
  DROP CONSTRAINT IF EXISTS applications_status_check;

ALTER TABLE applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'requested',
    'in_progress',
    'under_review',
    'needs_revision',
    'approved',
    'rejected',
    'cancelled',
    'closed'
  ));
