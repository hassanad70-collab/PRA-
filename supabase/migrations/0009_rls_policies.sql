-- ============================================================================
-- Migration 0009: Row Level Security
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions (security definer, avoid recursive RLS lookups)
-- ---------------------------------------------------------------------------

create or replace function public.current_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role in ('recruiter', 'hr_manager', 'super_admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.my_company_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select company_id from public.recruiters where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin());

-- ---------------------------------------------------------------------------
-- companies
-- ---------------------------------------------------------------------------
alter table public.companies enable row level security;

create policy "companies_public_read" on public.companies
  for select using (true);

create policy "companies_staff_write" on public.companies
  for insert with check (public.is_staff());

create policy "companies_staff_update" on public.companies
  for update using (id = public.my_company_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- recruiters
-- ---------------------------------------------------------------------------
alter table public.recruiters enable row level security;

create policy "recruiters_select" on public.recruiters
  for select using (id = auth.uid() or company_id = public.my_company_id() or public.is_admin());

create policy "recruiters_update_own" on public.recruiters
  for update using (id = auth.uid() or public.is_admin());

create policy "recruiters_insert_own" on public.recruiters
  for insert with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- candidates + detail tables (owner-only write, staff can read for screening)
-- ---------------------------------------------------------------------------
alter table public.candidates enable row level security;

create policy "candidates_select_own_or_staff" on public.candidates
  for select using (id = auth.uid() or public.is_staff());

create policy "candidates_write_own" on public.candidates
  for all using (id = auth.uid()) with check (id = auth.uid());

-- generic helper macro pattern repeated for each candidate-child table
create policy "candidate_experience_owner" on public.candidate_experience
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "candidate_education_owner" on public.candidate_education
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "candidate_skills_owner" on public.candidate_skills
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "candidate_certificates_owner" on public.candidate_certificates
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "candidate_languages_owner" on public.candidate_languages
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "candidate_projects_owner" on public.candidate_projects
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "candidate_achievements_owner" on public.candidate_achievements
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "candidate_social_links_owner" on public.candidate_social_links
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "saved_jobs_owner" on public.saved_jobs
  for all using (candidate_id = auth.uid())
  with check (candidate_id = auth.uid());

alter table public.candidate_experience enable row level security;
alter table public.candidate_education enable row level security;
alter table public.candidate_skills enable row level security;
alter table public.candidate_certificates enable row level security;
alter table public.candidate_languages enable row level security;
alter table public.candidate_projects enable row level security;
alter table public.candidate_achievements enable row level security;
alter table public.candidate_social_links enable row level security;
alter table public.saved_jobs enable row level security;

-- ---------------------------------------------------------------------------
-- resumes / cover letters / portfolio
-- ---------------------------------------------------------------------------
alter table public.resumes enable row level security;
alter table public.cover_letters enable row level security;
alter table public.portfolio_items enable row level security;

create policy "resumes_owner_or_staff" on public.resumes
  for select using (candidate_id = auth.uid() or public.is_staff());

create policy "resumes_owner_write" on public.resumes
  for insert with check (candidate_id = auth.uid());

create policy "resumes_owner_update" on public.resumes
  for update using (candidate_id = auth.uid());

create policy "resumes_owner_delete" on public.resumes
  for delete using (candidate_id = auth.uid());

create policy "cover_letters_owner" on public.cover_letters
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "portfolio_items_owner" on public.portfolio_items
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- jobs (public read for published, staff manage their own company's jobs)
-- ---------------------------------------------------------------------------
alter table public.jobs enable row level security;

create policy "jobs_public_read_published" on public.jobs
  for select using (status = 'published' or company_id = public.my_company_id() or public.is_admin());

create policy "jobs_staff_insert" on public.jobs
  for insert with check (public.is_staff() and company_id = public.my_company_id());

create policy "jobs_staff_update" on public.jobs
  for update using (company_id = public.my_company_id() or public.is_admin());

create policy "jobs_staff_delete" on public.jobs
  for delete using (company_id = public.my_company_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- applications
-- ---------------------------------------------------------------------------
alter table public.applications enable row level security;

create policy "applications_candidate_select" on public.applications
  for select using (
    candidate_id = auth.uid()
    or exists (
      select 1 from public.jobs j
      where j.id = applications.job_id and j.company_id = public.my_company_id()
    )
    or public.is_admin()
  );

create policy "applications_candidate_insert" on public.applications
  for insert with check (candidate_id = auth.uid());

create policy "applications_candidate_update_withdraw" on public.applications
  for update using (
    candidate_id = auth.uid()
    or exists (
      select 1 from public.jobs j
      where j.id = applications.job_id and j.company_id = public.my_company_id()
    )
    or public.is_admin()
  );

-- ---------------------------------------------------------------------------
-- ats_scores (candidate owns, staff can read scores for candidates who applied to their jobs)
-- ---------------------------------------------------------------------------
alter table public.ats_scores enable row level security;

create policy "ats_scores_owner_or_staff" on public.ats_scores
  for select using (candidate_id = auth.uid() or public.is_staff());

create policy "ats_scores_system_insert" on public.ats_scores
  for insert with check (candidate_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------------------
-- job_matches
-- ---------------------------------------------------------------------------
alter table public.job_matches enable row level security;

create policy "job_matches_select" on public.job_matches
  for select using (
    candidate_id = auth.uid()
    or exists (select 1 from public.jobs j where j.id = job_matches.job_id and j.company_id = public.my_company_id())
    or public.is_admin()
  );

create policy "job_matches_insert" on public.job_matches
  for insert with check (candidate_id = auth.uid() or public.is_staff());

create policy "job_matches_update" on public.job_matches
  for update using (candidate_id = auth.uid() or public.is_staff());

-- ---------------------------------------------------------------------------
-- screening_results / interviews / interview_questions
-- ---------------------------------------------------------------------------
alter table public.screening_results enable row level security;
alter table public.interviews enable row level security;
alter table public.interview_questions enable row level security;

create policy "screening_results_staff_or_owner" on public.screening_results
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.applications a
      where a.id = screening_results.application_id and a.candidate_id = auth.uid()
    )
  );

create policy "screening_results_staff_write" on public.screening_results
  for insert with check (public.is_staff());

create policy "screening_results_staff_update" on public.screening_results
  for update using (public.is_staff());

create policy "interviews_staff_or_candidate" on public.interviews
  for select using (
    public.is_staff()
    or exists (
      select 1 from public.applications a
      where a.id = interviews.application_id and a.candidate_id = auth.uid()
    )
  );

create policy "interviews_staff_write" on public.interviews
  for all using (public.is_staff()) with check (public.is_staff());

create policy "interview_questions_staff" on public.interview_questions
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- talent_pool
-- ---------------------------------------------------------------------------
alter table public.talent_pool enable row level security;

create policy "talent_pool_company_staff" on public.talent_pool
  for all using (company_id = public.my_company_id() or public.is_admin())
  with check (company_id = public.my_company_id());

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_owner" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_owner_update" on public.notifications
  for update using (user_id = auth.uid());

create policy "notifications_system_insert" on public.notifications
  for insert with check (true);

-- ---------------------------------------------------------------------------
-- audit_logs (admin-only read, system insert)
-- ---------------------------------------------------------------------------
alter table public.audit_logs enable row level security;

create policy "audit_logs_admin_read" on public.audit_logs
  for select using (public.is_admin());

create policy "audit_logs_insert" on public.audit_logs
  for insert with check (true);
