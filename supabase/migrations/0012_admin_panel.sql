-- ============================================================================
-- Migration 0012: Admin Panel
-- Soft-delete columns, company activation, system settings, and the
-- platform-wide aggregate RPCs the /admin dashboard reads from.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Soft delete + activation columns
-- ---------------------------------------------------------------------------
alter table public.profiles add column deleted_at timestamptz;
alter table public.companies add column is_active boolean not null default true;
alter table public.companies add column deleted_at timestamptz;

create index profiles_deleted_at_idx on public.profiles (deleted_at);
create index companies_deleted_at_idx on public.companies (deleted_at);

-- ---------------------------------------------------------------------------
-- System settings: simple key/value store, one row per settings section
-- (general / email / ai / storage / security). Value shape is owned by the
-- application layer, not the schema.
-- ---------------------------------------------------------------------------
create table public.system_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger system_settings_set_updated_at
  before update on public.system_settings
  for each row execute function public.set_updated_at();

insert into public.system_settings (key, value) values
  ('general', '{"platform_name": "PRA Talent Intelligence", "support_email": "support@example.com", "default_timezone": "UTC", "maintenance_mode": false}'::jsonb),
  ('email', '{"from_name": "PRA Talent Intelligence", "from_email": "no-reply@example.com", "notify_on_application": true, "notify_on_status_change": true}'::jsonb),
  ('ai', '{"resume_parsing_enabled": true, "ats_scoring_enabled": true, "job_matching_enabled": true, "min_match_similarity": 0.35}'::jsonb),
  ('storage', '{"max_resume_size_mb": 10, "resume_retention_days": 365}'::jsonb),
  ('security', '{"require_email_confirmation": true, "session_timeout_minutes": 10080, "min_password_length": 8}'::jsonb)
on conflict (key) do nothing;

alter table public.system_settings enable row level security;

create policy "system_settings_admin_all" on public.system_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Companies: admin can hard-manage any company (soft delete is enforced at
-- the application layer via deleted_at, but a real delete policy still
-- exists for completeness / defense in depth).
-- ---------------------------------------------------------------------------
create policy "companies_admin_delete" on public.companies
  for delete using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Platform-wide dashboard stats (mirrors get_company_dashboard_stats but
-- unscoped — admin-only via RLS on the underlying tables / server-side role
-- checks in every server action that calls this).
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_dashboard_stats()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  select json_build_object(
    'total_companies', (select count(*) from public.companies where deleted_at is null),
    'total_recruiters', (select count(*) from public.profiles where role in ('recruiter', 'hr_manager') and deleted_at is null),
    'total_candidates', (select count(*) from public.profiles where role = 'candidate' and deleted_at is null),
    'active_jobs', (select count(*) from public.jobs where status = 'published'),
    'published_jobs', (select count(*) from public.jobs where status = 'published'),
    'total_jobs', (select count(*) from public.jobs),
    'total_applications', (select count(*) from public.applications),
    'total_interviews', (select count(*) from public.interviews),
    'total_resumes', (select count(*) from public.resumes),
    'storage_bytes', (select coalesce(sum(file_size_bytes), 0) from public.resumes),
    'hiring_funnel', (
      select json_object_agg(status, cnt) from (
        select status, count(*) as cnt from public.applications group by status
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Top companies by job + application volume.
-- ---------------------------------------------------------------------------
create or replace function public.get_top_companies_by_jobs(p_limit int default 5)
returns table (
  company_id uuid,
  company_name text,
  jobs_count bigint,
  applications_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as company_id,
    c.name as company_name,
    count(distinct j.id) as jobs_count,
    count(a.id) as applications_count
  from public.companies c
  left join public.jobs j on j.company_id = c.id
  left join public.applications a on a.job_id = j.id
  where c.deleted_at is null
  group by c.id, c.name
  order by applications_count desc, jobs_count desc
  limit p_limit;
$$;

-- ---------------------------------------------------------------------------
-- Top recruiters by job + application volume.
-- ---------------------------------------------------------------------------
create or replace function public.get_top_recruiters_by_activity(p_limit int default 5)
returns table (
  recruiter_id uuid,
  full_name text,
  company_name text,
  jobs_count bigint,
  applications_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id as recruiter_id,
    p.full_name,
    c.name as company_name,
    count(distinct j.id) as jobs_count,
    count(a.id) as applications_count
  from public.recruiters r
  join public.profiles p on p.id = r.id
  join public.companies c on c.id = r.company_id
  left join public.jobs j on j.recruiter_id = r.id
  left join public.applications a on a.job_id = j.id
  where p.deleted_at is null
  group by r.id, p.full_name, c.name
  order by applications_count desc, jobs_count desc
  limit p_limit;
$$;
