-- ============================================================================
-- Migration 0025: applications.assigned_recruiter_id (Recruiter
-- Intelligence v2.0, Phase 7 -- Bulk Recruiter Actions)
-- ============================================================================
--
-- Enables per-candidate recruiter ownership within a shared pipeline
-- (bulk "Assign Recruiter"). jobs.recruiter_id already assigns a recruiter
-- to a job as a whole; there was no existing analog for "this teammate is
-- handling this specific candidate", so this is a genuinely new column,
-- not derivable from anything that already exists. Nullable -- an
-- unassigned application is the default, not an error state.

alter table public.applications
  add column assigned_recruiter_id uuid references public.recruiters(id) on delete set null;

create index applications_assigned_recruiter_idx on public.applications (assigned_recruiter_id);
