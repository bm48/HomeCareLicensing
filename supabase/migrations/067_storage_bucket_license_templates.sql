-- Create the license-templates storage bucket for document template uploads.
-- If this migration fails (e.g. "permission denied" or "relation does not exist"),
-- create the bucket manually: Supabase Dashboard → Storage → New bucket → name: license-templates → Public: ON.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'license-templates',
  'license-templates',
  true,
  52428800,
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']::text[]
)
ON CONFLICT (id) DO NOTHING;
