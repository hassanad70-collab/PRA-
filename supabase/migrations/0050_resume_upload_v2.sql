-- ============================================================================
-- Migration 0050: Resume Upload V2
--
-- 1. Makes resumes.file_url nullable.
--    We no longer generate a signed URL at upload time and store it in the
--    database. Signed URLs expire (7-day TTL), making stored URLs stale and
--    causing "View" to fail on resumes older than a week. Instead, every page
--    that shows resume links re-signs from file_path at render time with a
--    fresh 1-hour TTL. This is the correct Supabase private-bucket pattern.
--
-- 2. Existing rows are left unchanged -- their stored (now possibly expired)
--    signed URLs sit in the column harmlessly; all query paths that previously
--    used file_url now ignore it and re-sign from file_path instead.
-- ============================================================================

alter table public.resumes
  alter column file_url drop not null,
  alter column file_url set default null;
