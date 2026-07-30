-- ============================================================================
-- Migration 0031: Extended Analytics RPCs
-- Adds date-range + company-scoped analytics functions used by the Executive
-- Analytics Dashboard (/admin/analytics). All functions are security definer
-- so they can be called from RLS-restricted sessions safely.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Platform analytics with optional date range and company filter
-- ---------------------------------------------------------------------------
create or replace function public.get_platform_analytics(
  p_from  timestamptz default null,
  p_to    timestamptz default null,
  p_company_id uuid default null
)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from timestamptz := coalesce(p_from, now() - interval '30 days');
  v_to   timestamptz := coalesce(p_to,   now());
  v_result json;
begin
  select json_build_object(
    -- Core counts (always unfiltered by date so totals are correct)
    'total_companies',     (select count(*) from public.companies where deleted_at is null and (p_company_id is null or id = p_company_id)),
    'total_users',         (select count(*) from public.profiles where deleted_at is null),
    'total_candidates',    (select count(*) from public.profiles where role = 'candidate' and deleted_at is null),
    'total_recruiters',    (select count(*) from public.profiles where role in ('recruiter','hr_manager') and deleted_at is null),
    'total_jobs',          (select count(*) from public.jobs where (p_company_id is null or company_id = p_company_id)),
    'active_jobs',         (select count(*) from public.jobs where status = 'published' and (p_company_id is null or company_id = p_company_id)),
    'closed_jobs',         (select count(*) from public.jobs where status = 'closed' and (p_company_id is null or company_id = p_company_id)),
    'draft_jobs',          (select count(*) from public.jobs where status = 'draft' and (p_company_id is null or company_id = p_company_id)),
    'total_applications',  (select count(*) from public.applications a join public.jobs j on j.id = a.job_id where (p_company_id is null or j.company_id = p_company_id)),
    'total_resumes',       (select count(*) from public.resumes),
    'total_interviews',    (select count(*) from public.interviews),

    -- Date-range counts
    'new_applications_in_range', (
      select count(*) from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.applied_at between v_from and v_to
        and (p_company_id is null or j.company_id = p_company_id)
    ),
    'new_applications_today', (
      select count(*) from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.applied_at >= current_date
        and (p_company_id is null or j.company_id = p_company_id)
    ),
    'new_applications_this_week', (
      select count(*) from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.applied_at >= date_trunc('week', current_date)
        and (p_company_id is null or j.company_id = p_company_id)
    ),
    'new_applications_this_month', (
      select count(*) from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.applied_at >= date_trunc('month', current_date)
        and (p_company_id is null or j.company_id = p_company_id)
    ),

    -- Resume parse metrics
    'parse_success_count', (
      select count(*) from public.resumes where parse_status = 'completed'
    ),
    'parse_partial_count', (
      select count(*) from public.resumes where parse_status = 'completed_partial'
    ),
    'parse_failed_count', (
      select count(*) from public.resumes where parse_status = 'failed'
    ),
    'parse_pending_count', (
      select count(*) from public.resumes where parse_status in ('pending','processing')
    ),

    -- ATS scoring
    'avg_ats_score', (
      select round(avg(overall_score)::numeric, 1)
      from public.ats_scores
      where overall_score is not null
        and (p_company_id is null or exists (
          select 1 from public.applications a
          join public.jobs j on j.id = a.job_id
          where a.candidate_id = ats_scores.candidate_id and j.company_id = p_company_id
        ))
    ),

    -- Interview conversion (applications that reached interview / total applications)
    'interview_conversion_rate', (
      select case when total_apps = 0 then 0
        else round(100.0 * interview_apps / total_apps, 1) end
      from (
        select
          count(*) filter (where status in ('interview','offer','hired')) as interview_apps,
          count(*) as total_apps
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where (p_company_id is null or j.company_id = p_company_id)
      ) t
    ),

    -- Offer acceptance rate (hired / offer+hired)
    'offer_acceptance_rate', (
      select case when offer_apps = 0 then 0
        else round(100.0 * hired_apps / offer_apps, 1) end
      from (
        select
          count(*) filter (where status = 'hired') as hired_apps,
          count(*) filter (where status in ('offer','hired')) as offer_apps
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where (p_company_id is null or j.company_id = p_company_id)
      ) t
    ),

    -- Average time to hire in days (from application to status=hired, using updated_at as proxy)
    'avg_days_to_hire', (
      select round(avg(extract(epoch from (updated_at - applied_at)) / 86400)::numeric, 1)
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.status = 'hired'
        and (p_company_id is null or j.company_id = p_company_id)
    ),

    -- Hiring funnel
    'hiring_funnel', (
      select json_object_agg(status, cnt) from (
        select a.status, count(*) as cnt
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where (p_company_id is null or j.company_id = p_company_id)
        group by a.status
      ) t
    ),

    -- Applications by status (same as funnel but named clearly)
    'applications_by_status', (
      select json_object_agg(status, cnt) from (
        select a.status, count(*) as cnt
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where (p_company_id is null or j.company_id = p_company_id)
        group by a.status
      ) t
    ),

    -- Storage
    'storage_bytes', (select coalesce(sum(file_size_bytes), 0) from public.resumes)

  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Monthly growth metrics (applications, candidates, jobs) for trend charts
-- ---------------------------------------------------------------------------
create or replace function public.get_monthly_growth_metrics(
  p_months     int  default 12,
  p_company_id uuid default null
)
returns table (
  month          text,
  applications   bigint,
  new_candidates bigint,
  new_jobs       bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with months as (
    select to_char(date_trunc('month', now() - (generate_series(0, p_months - 1) || ' months')::interval), 'YYYY-MM') as m
  )
  select
    months.m as month,
    count(distinct a.id) filter (
      where a.applied_at >= to_date(months.m, 'YYYY-MM')
        and a.applied_at < to_date(months.m, 'YYYY-MM') + interval '1 month'
    ) as applications,
    count(distinct p.id) filter (
      where p.role = 'candidate'
        and p.created_at >= to_date(months.m, 'YYYY-MM')
        and p.created_at < to_date(months.m, 'YYYY-MM') + interval '1 month'
    ) as new_candidates,
    count(distinct j.id) filter (
      where j.created_at >= to_date(months.m, 'YYYY-MM')
        and j.created_at < to_date(months.m, 'YYYY-MM') + interval '1 month'
    ) as new_jobs
  from months
  left join public.applications a on true
  left join public.jobs j on (p_company_id is null or j.company_id = p_company_id)
  left join public.profiles p on true
  group by months.m
  order by months.m asc;
$$;

-- ---------------------------------------------------------------------------
-- ATS score distribution (bucketed into ranges for histogram)
-- ---------------------------------------------------------------------------
create or replace function public.get_ats_score_distribution(
  p_company_id uuid default null
)
returns table (
  bucket text,
  count  bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when overall_score < 20  then '0-19'
      when overall_score < 40  then '20-39'
      when overall_score < 60  then '40-59'
      when overall_score < 80  then '60-79'
      else '80-100'
    end as bucket,
    count(*) as count
  from public.ats_scores
  where overall_score is not null
    and (p_company_id is null or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      where a.candidate_id = ats_scores.candidate_id and j.company_id = p_company_id
    ))
  group by 1
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Daily application activity for the last N days (sparkline data)
-- ---------------------------------------------------------------------------
create or replace function public.get_daily_activity(
  p_days       int  default 30,
  p_company_id uuid default null
)
returns table (
  day   text,
  count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    to_char(d.day, 'YYYY-MM-DD') as day,
    count(a.id)                  as count
  from generate_series(
    current_date - ((p_days - 1) || ' days')::interval,
    current_date,
    '1 day'::interval
  ) as d(day)
  left join public.applications a on date_trunc('day', a.applied_at) = d.day
    and (p_company_id is null or exists (
      select 1 from public.jobs j where j.id = a.job_id and j.company_id = p_company_id
    ))
  group by d.day
  order by d.day;
$$;
