-- ============================================================================
-- Migration 0013: Fix ambiguous "status" column in get_company_dashboard_stats
--
-- The offer_acceptance_rate subquery joins public.applications and
-- public.jobs, both of which have a "status" column (application_status vs.
-- job_status). The unqualified `status` references inside the `filter
-- (where status ...)` clauses are ambiguous to Postgres, causing every call
-- to fail with: 42702 column reference "status" is ambiguous.
-- ============================================================================
create or replace function public.get_company_dashboard_stats(p_company_id uuid)
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
    'total_jobs', (select count(*) from public.jobs where company_id = p_company_id),
    'open_jobs', (select count(*) from public.jobs where company_id = p_company_id and status = 'published'),
    'closed_jobs', (select count(*) from public.jobs where company_id = p_company_id and status = 'closed'),
    'total_candidates', (
      select count(distinct a.candidate_id) from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
    ),
    'applications_today', (
      select count(*) from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id and a.applied_at >= current_date
    ),
    'applications_this_month', (
      select count(*) from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id and a.applied_at >= date_trunc('month', current_date)
    ),
    'average_ats_score', (
      select round(avg(s.overall_score)::numeric, 1) from public.ats_scores s
      join public.applications a on a.candidate_id = s.candidate_id
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
    ),
    'hiring_funnel', (
      select json_object_agg(status, cnt) from (
        select a.status, count(*) as cnt
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where j.company_id = p_company_id
        group by a.status
      ) t
    ),
    'offer_acceptance_rate', (
      select case when count(*) filter (where a.status in ('offer', 'hired')) = 0 then 0
        else round(100.0 * count(*) filter (where a.status = 'hired') / nullif(count(*) filter (where a.status in ('offer', 'hired')), 0), 1)
      end
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
    )
  ) into v_result;

  return v_result;
end;
$$;
