-- ============================================================================
-- Migration 0014: Strict tenant isolation for candidate data
--
-- Every policy below used a blanket `public.is_staff()` bypass, which let ANY
-- recruiter/hr_manager at ANY company read (and in some cases write/delete)
-- ANY candidate's personal data platform-wide, with zero company scoping.
-- Confirmed live: a recruiter session could read another company's
-- candidate's resume row via a direct query.
--
-- New rule, enforced at the RLS layer (not just app code): a staff member can
-- only see a candidate's data if that candidate (a) applied to a job at the
-- staff member's company, or (b) has been explicitly added to that company's
-- talent pool. super_admin retains unrestricted access. Candidates always
-- retain full access to their own data.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

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
    );
$$;

comment on function public.is_candidate_visible_to_staff(uuid) is
  'True if the calling staff member''s company has an application from, or has saved to their talent pool, the given candidate. Always true for super_admin. my_company_id() is null for non-recruiters, so this is false for candidates by construction.';

create or replace function public.is_profile_visible_to_staff(p_profile_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select
    public.is_admin()
    or exists (
      select 1 from public.recruiters r
      where r.id = p_profile_id and r.company_id = public.my_company_id()
    )
    or public.is_candidate_visible_to_staff(p_profile_id);
$$;

comment on function public.is_profile_visible_to_staff(uuid) is
  'True if the target profile is a colleague at the caller''s company, or a candidate visible per is_candidate_visible_to_staff. Used for the profiles table, which holds both staff and candidates.';

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_staff" on public.profiles;

create policy "profiles_select" on public.profiles
  for select using (id = auth.uid() or public.is_profile_visible_to_staff(id));

-- ---------------------------------------------------------------------------
-- candidates
-- ---------------------------------------------------------------------------
drop policy if exists "candidates_select_own_or_staff" on public.candidates;

create policy "candidates_select" on public.candidates
  for select using (id = auth.uid() or public.is_candidate_visible_to_staff(id));

-- candidates_write_own is unchanged: already owner-only, no staff bypass.

-- ---------------------------------------------------------------------------
-- candidate detail tables: split each "for all ... or is_staff()" policy
-- into a broader, company-scoped SELECT policy and an owner-only write
-- policy. Postgres OR-combines multiple permissive policies for the same
-- command, so the owner-only "for all" policy still covers SELECT for the
-- owning candidate; it just no longer grants staff select/update/delete.
-- ---------------------------------------------------------------------------
drop policy if exists "candidate_experience_owner" on public.candidate_experience;
create policy "candidate_experience_select" on public.candidate_experience
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_experience_owner_write" on public.candidate_experience
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "candidate_education_owner" on public.candidate_education;
create policy "candidate_education_select" on public.candidate_education
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_education_owner_write" on public.candidate_education
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "candidate_skills_owner" on public.candidate_skills;
create policy "candidate_skills_select" on public.candidate_skills
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_skills_owner_write" on public.candidate_skills
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "candidate_certificates_owner" on public.candidate_certificates;
create policy "candidate_certificates_select" on public.candidate_certificates
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_certificates_owner_write" on public.candidate_certificates
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "candidate_languages_owner" on public.candidate_languages;
create policy "candidate_languages_select" on public.candidate_languages
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_languages_owner_write" on public.candidate_languages
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "candidate_projects_owner" on public.candidate_projects;
create policy "candidate_projects_select" on public.candidate_projects
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_projects_owner_write" on public.candidate_projects
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "candidate_achievements_owner" on public.candidate_achievements;
create policy "candidate_achievements_select" on public.candidate_achievements
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_achievements_owner_write" on public.candidate_achievements
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "candidate_social_links_owner" on public.candidate_social_links;
create policy "candidate_social_links_select" on public.candidate_social_links
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "candidate_social_links_owner_write" on public.candidate_social_links
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- resumes / cover letters / portfolio
-- ---------------------------------------------------------------------------
drop policy if exists "resumes_owner_or_staff" on public.resumes;
create policy "resumes_select" on public.resumes
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));

-- resumes_owner_write / resumes_owner_update / resumes_owner_delete are
-- unchanged: already owner-only, no staff bypass.

drop policy if exists "cover_letters_owner" on public.cover_letters;
create policy "cover_letters_select" on public.cover_letters
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "cover_letters_owner_write" on public.cover_letters
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

drop policy if exists "portfolio_items_owner" on public.portfolio_items;
create policy "portfolio_items_select" on public.portfolio_items
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));
create policy "portfolio_items_owner_write" on public.portfolio_items
  for all using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- ats_scores
-- ---------------------------------------------------------------------------
drop policy if exists "ats_scores_owner_or_staff" on public.ats_scores;
create policy "ats_scores_select" on public.ats_scores
  for select using (candidate_id = auth.uid() or public.is_candidate_visible_to_staff(candidate_id));

-- ats_scores_system_insert is unchanged: AI pipeline writes go through the
-- service-role client anyway, bypassing RLS entirely.

-- ---------------------------------------------------------------------------
-- screening_results (application-scoped, not candidate_id directly)
-- ---------------------------------------------------------------------------
drop policy if exists "screening_results_staff_or_owner" on public.screening_results;

create policy "screening_results_select" on public.screening_results
  for select using (
    public.is_admin()
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = screening_results.application_id
        and (a.candidate_id = auth.uid() or j.company_id = public.my_company_id())
    )
  );

-- screening_results_staff_write / screening_results_staff_update are
-- unchanged: INSERT/UPDATE-only policies never implicitly grant SELECT, and
-- these writes come from the AI screening pipeline via the service-role
-- client, which bypasses RLS anyway.

-- ---------------------------------------------------------------------------
-- interviews / interview_questions
-- ---------------------------------------------------------------------------
drop policy if exists "interviews_staff_or_candidate" on public.interviews;
drop policy if exists "interviews_staff_write" on public.interviews;

create policy "interviews_select" on public.interviews
  for select using (
    public.is_admin()
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = interviews.application_id
        and (a.candidate_id = auth.uid() or j.company_id = public.my_company_id())
    )
  );

create policy "interviews_staff_write" on public.interviews
  for all using (
    public.is_admin()
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = interviews.application_id
        and j.company_id = public.my_company_id()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.id = interviews.application_id
        and j.company_id = public.my_company_id()
    )
  );

drop policy if exists "interview_questions_staff" on public.interview_questions;

create policy "interview_questions_staff" on public.interview_questions
  for all using (
    public.is_admin()
    or exists (select 1 from public.jobs j where j.id = interview_questions.job_id and j.company_id = public.my_company_id())
  )
  with check (
    public.is_admin()
    or exists (select 1 from public.jobs j where j.id = interview_questions.job_id and j.company_id = public.my_company_id())
  );

commit;
