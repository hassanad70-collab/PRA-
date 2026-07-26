-- ============================================================================
-- Migration 0018: Opt-in candidate discoverability for AI-sourced matching
--
-- generateMatchesForJob() already scores the entire candidate pool against a
-- job via pgvector (match_candidates_for_job) and writes job_matches rows for
-- candidates who never applied. Nothing surfaced those rows to recruiters,
-- because is_candidate_visible_to_staff() only allows staff to see a
-- candidate who applied to their company or was saved to their talent pool.
--
-- candidates.is_open_to_work already exists (0004_candidates.sql) but has no
-- reader anywhere in the codebase -- no query, RLS policy, or UI ever
-- touches it. It's the right semantic fit for this opt-in, so we repurpose
-- it rather than add a duplicate column. It previously defaulted to true
-- with no real effect; since it now gates real data exposure, we flip the
-- default to false and backfill existing rows to false so nobody is
-- silently opted in by this migration.
--
-- New rule: a candidate who enables is_open_to_work becomes visible to a
-- company's staff ONLY when the AI has actually matched them to a job at
-- that company (job_matches row exists), not platform-wide. Candidates who
-- don't opt in are unaffected -- existing application/talent-pool
-- visibility rules are unchanged.
-- ============================================================================

begin;

alter table public.candidates
  alter column is_open_to_work set default false;

update public.candidates set is_open_to_work = false;

create or replace function public.is_candidate_visible_to_staff(p_candidate_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.candidate_id = p_candidate_id
        and j.company_id = public.my_company_id()
    )
    or exists (
      select 1
      from public.talent_pool tp
      where tp.candidate_id = p_candidate_id
        and tp.company_id = public.my_company_id()
    )
    or exists (
      select 1
      from public.candidates c
      join public.job_matches jm on jm.candidate_id = c.id
      join public.jobs j on j.id = jm.job_id
      where c.id = p_candidate_id
        and c.is_open_to_work
        and j.company_id = public.my_company_id()
    );
$$;

comment on function public.is_candidate_visible_to_staff(uuid) is
  'True if the calling staff member''s company has an application from, has saved to their talent pool, or -- for a candidate who opted into is_open_to_work -- has an AI job_matches row for, the given candidate. Always true for super_admin. my_company_id() is null for non-recruiters, so this is false for candidates by construction.';

commit;
