-- Refactor visit_adjustment_history to store explicit hour deltas and note text.
-- Removes legacy time-adjustment columns and free-form comment payload.

ALTER TABLE public.visit_adjustment_history
  DROP COLUMN IF EXISTS previous_clock_in_time,
  DROP COLUMN IF EXISTS previous_clock_out_time,
  DROP COLUMN IF EXISTS previous_adjusted_start_time,
  DROP COLUMN IF EXISTS previous_adjusted_end_time,
  DROP COLUMN IF EXISTS new_adjusted_start_time,
  DROP COLUMN IF EXISTS new_adjusted_end_time,
  DROP COLUMN IF EXISTS comment;

ALTER TABLE public.visit_adjustment_history
  ADD COLUMN IF NOT EXISTS previous_actual_hours numeric,
  ADD COLUMN IF NOT EXISTS current_actual_hours numeric,
  ADD COLUMN IF NOT EXISTS previous_billable_hours numeric,
  ADD COLUMN IF NOT EXISTS current_billable_hours numeric,
  ADD COLUMN IF NOT EXISTS note text;
