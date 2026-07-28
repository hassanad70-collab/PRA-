-- ============================================================================
-- Migration 0021: Recruiter Executive Dashboard metrics (Recruiter
-- Intelligence v2.0, Phase 1)
-- ============================================================================
--
-- Extends get_company_dashboard_stats (0011) with the additional KPIs the
-- upgraded HR Dashboard needs. No new tables/columns -- every metric here is
-- computed from data that already exists:
--
--   * interviews_scheduled / offers_pending: straightforward counts against
--     existing columns (interviews.status, applications.status).
--   * hires_this_month / hires_last_30_days / avg_time_to_hire_days: derived
--     from audit_logs, which the existing on_application_status_change
--     trigger (0011) already writes a
--     {action:'application_status_changed', metadata:{from,to}} row for on
--     every status change -- this is treated as the hire event timestamp
--     rather than adding a new applications.hired_at column, since the data
--     is already there.
--   * department_breakdown / recruiter_workload: grouped from jobs.department
--     and jobs.recruiter_id, both pre-existing columns.
--
-- create or replace is safe here (no signature change, pure logic addition)
-- -- this is a forward-fixing migration per docs/engineering/database-workflow.md
-- section 1.5, not an edit to 0011's already-applied file.

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
    -- Fixes a latent bug carried over from 0011: `status` here is ambiguous
    -- between applications.status and jobs.status once both tables are in
    -- scope, which made this subquery -- and therefore this whole RPC call --
    -- fail with a real Postgres error on every invocation (confirmed by
    -- direct testing while building this migration). Now qualified as
    -- a.status throughout.
    'offer_acceptance_rate', (
      select case when count(*) filter (where a.status in ('offer', 'hired')) = 0 then 0
        else round(100.0 * count(*) filter (where a.status = 'hired') / nullif(count(*) filter (where a.status in ('offer', 'hired')), 0), 1)
      end
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
    ),
    'offers_pending', (
      select count(*) from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id and a.status = 'offer'
    ),
    'interviews_scheduled', (
      select count(*) from public.interviews iv
      join public.applications a on a.id = iv.application_id
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id and iv.status = 'scheduled' and iv.scheduled_at >= now()
    ),
    'hires_this_month', (
      select count(*) from public.audit_logs al
      join public.applications a on a.id = al.entity_id
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
        and al.entity_type = 'application'
        and al.action = 'application_status_changed'
        and (al.metadata->>'to') = 'hired'
        and al.created_at >= date_trunc('month', current_date)
    ),
    -- A trailing 30-day rate, deliberately distinct from hires_this_month
    -- (a calendar-month count): this is the "Hiring Velocity" KPI.
    'hires_last_30_days', (
      select count(*) from public.audit_logs al
      join public.applications a on a.id = al.entity_id
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
        and al.entity_type = 'application'
        and al.action = 'application_status_changed'
        and (al.metadata->>'to') = 'hired'
        and al.created_at >= now() - interval '30 days'
    ),
    'avg_time_to_hire_days', (
      select round(avg(extract(epoch from (al.created_at - a.applied_at)) / 86400)::numeric, 1)
      from public.audit_logs al
      join public.applications a on a.id = al.entity_id
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
        and al.entity_type = 'application'
        and al.action = 'application_status_changed'
        and (al.metadata->>'to') = 'hired'
    ),
    'department_breakdown', (
      select json_object_agg(department, cnt) from (
        select coalesce(j.department, 'unspecified') as department, count(*) as cnt
        from public.jobs j
        where j.company_id = p_company_id
        group by coalesce(j.department, 'unspecified')
      ) t
    ),
    'recruiter_workload', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select
          j.recruiter_id,
          p.full_name as recruiter_name,
          count(distinct j.id) as open_jobs,
          count(a.id) filter (where a.status not in ('hired', 'rejected', 'withdrawn')) as active_applications
        from public.jobs j
        left join public.profiles p on p.id = j.recruiter_id
        left join public.applications a on a.job_id = j.id
        where j.company_id = p_company_id and j.status = 'published'
        group by j.recruiter_id, p.full_name
        order by active_applications desc
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;
