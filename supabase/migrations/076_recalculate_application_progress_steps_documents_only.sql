-- Overall application progress depends only on main steps (is_expert_step = false) and documents.
-- Expert process steps are excluded from progress calculation.
-- Recalculate when application_steps or application_documents change.

CREATE OR REPLACE FUNCTION recalculate_application_progress(p_application_id UUID)
RETURNS VOID AS $$
DECLARE
  total_steps INTEGER;
  completed_steps INTEGER;
  total_docs INTEGER;
  completed_docs INTEGER;
  denominator INTEGER;
  new_progress INTEGER;
  req_id UUID;
  lt_name TEXT;
  lt_state TEXT;
BEGIN
  -- Main steps only (exclude expert process)
  SELECT COUNT(*) INTO total_steps
  FROM application_steps
  WHERE application_id = p_application_id
    AND COALESCE(is_expert_step, false) = false;

  SELECT COUNT(*) INTO completed_steps
  FROM application_steps
  WHERE application_id = p_application_id
    AND COALESCE(is_expert_step, false) = false
    AND is_completed = true;

  -- Total documents: from license_requirement_documents when app has license_type_id, else count of application_documents
  SELECT lt.name, COALESCE(lt.state, a.state)
  INTO lt_name, lt_state
  FROM applications a
  LEFT JOIN license_types lt ON lt.id = a.license_type_id
  WHERE a.id = p_application_id;

  IF lt_name IS NOT NULL AND lt_state IS NOT NULL THEN
    SELECT lr.id INTO req_id
    FROM license_requirements lr
    WHERE lr.state = lt_state AND lr.license_type = lt_name
    LIMIT 1;
    IF req_id IS NOT NULL THEN
      SELECT COUNT(*) INTO total_docs FROM license_requirement_documents WHERE license_requirement_id = req_id;
    END IF;
  END IF;

  IF total_docs IS NULL OR total_docs = 0 THEN
    SELECT COUNT(*) INTO total_docs FROM application_documents WHERE application_id = p_application_id;
  END IF;

  -- Completed documents: approved or completed status
  SELECT COUNT(*) INTO completed_docs
  FROM application_documents
  WHERE application_id = p_application_id
    AND status IN ('approved', 'completed');

  denominator := COALESCE(total_steps, 0) + COALESCE(total_docs, 0);
  IF denominator = 0 THEN
    new_progress := 0;
  ELSE
    new_progress := LEAST(100, ROUND(100.0 * (COALESCE(completed_steps, 0) + COALESCE(completed_docs, 0)) / denominator));
  END IF;

  UPDATE applications
  SET progress_percentage = new_progress
  WHERE id = p_application_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger: after application_steps change (main or expert; we only count main in the function)
CREATE OR REPLACE FUNCTION trigger_recalculate_progress_on_steps()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_application_progress(OLD.application_id);
    RETURN OLD;
  END IF;
  PERFORM recalculate_application_progress(NEW.application_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS recalculate_progress_on_application_steps_trigger ON application_steps;
CREATE TRIGGER recalculate_progress_on_application_steps_trigger
  AFTER INSERT OR UPDATE OR DELETE ON application_steps
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_progress_on_steps();

-- Trigger: after application_documents change
CREATE OR REPLACE FUNCTION trigger_recalculate_progress_on_documents()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_application_progress(OLD.application_id);
    RETURN OLD;
  END IF;
  PERFORM recalculate_application_progress(NEW.application_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS recalculate_progress_on_application_documents_trigger ON application_documents;
CREATE TRIGGER recalculate_progress_on_application_documents_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON application_documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_progress_on_documents();

-- Backfill progress for all existing applications
DO $$
DECLARE
  app_record RECORD;
BEGIN
  FOR app_record IN SELECT id FROM applications
  LOOP
    PERFORM recalculate_application_progress(app_record.id);
  END LOOP;
END $$;
