-- ============================================================================
-- Migration 0023: Hiring Analytics (Recruiter Intelligence v2.0, Phase 6)
-- ============================================================================
--
-- Source of Hire has no existing data anywhere in this schema (every
-- application today is candidate-initiated through the platform itself),
-- so unlike this milestone's other phases this genuinely needs one new
-- column -- there's nothing to derive it from. Plain nullable text (not an
-- enum) for the same reason source/suggestion_type on resume_suggestion_events
-- (migration 0020) are plain text: new sourcing channels (a referral
-- program, a specific job board integration) shouldn't require a migration
-- to add. Documented constants live in src/lib/recruiter/analytics.ts.
-- Defaults every new application to 'platform' (the only channel that
-- actually exists today); existing rows backfill to the same value since
-- they were, in fact, all submitted through the platform.

alter table public.applications add column source text not null default 'platform';

-- get_hiring_analytics: a second dashboard-stats-shaped RPC (see 0011/0021's
-- get_company_dashboard_stats) rather than folding these into that one --
-- these are deeper, less frequently-needed aggregates (a trend series,
-- per-recruiter productivity) that don't belong on the always-loaded
-- executive dashboard.
create or replace function public.get_hiring_analytics(p_company_id uuid)
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
    'source_breakdown', (
      select json_object_agg(source, cnt) from (
        select a.source, count(*) as cnt
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where j.company_id = p_company_id
        group by a.source
      ) t
    ),
    'time_to_hire_trend', (
      select coalesce(json_agg(row_to_json(t) order by t.month), '[]'::json) from (
        select
          to_char(date_trunc('month', al.created_at), 'YYYY-MM') as month,
          round(avg(extract(epoch from (al.created_at - a.applied_at)) / 86400)::numeric, 1) as avg_days
        from public.audit_logs al
        join public.applications a on a.id = al.entity_id
        join public.jobs j on j.id = a.job_id
        where j.company_id = p_company_id
          and al.entity_type = 'application'
          and al.action = 'application_status_changed'
          and (al.metadata->>'to') = 'hired'
          and al.created_at >= now() - interval '6 months'
        group by date_trunc('month', al.created_at)
      ) t
    ),
    'funnel_drop_off', (
      select json_object_agg(status, cnt) from (
        select a.status, count(*) as cnt
        from public.applications a
        join public.jobs j on j.id = a.job_id
        where j.company_id = p_company_id
        group by a.status
      ) t
    ),
    'interview_conversion_rate', (
      select case when count(*) filter (where a.status in ('interview', 'offer', 'hired', 'rejected') and exists (
          select 1 from public.interviews iv where iv.application_id = a.id
        )) = 0 then 0
        else round(
          100.0 * count(*) filter (where a.status in ('offer', 'hired') and exists (
            select 1 from public.interviews iv where iv.application_id = a.id
          ))
          / nullif(count(*) filter (where exists (
            select 1 from public.interviews iv where iv.application_id = a.id
          )), 0), 1)
      end
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
    ),
    'recruiter_productivity', (
      select coalesce(json_agg(row_to_json(t)), '[]'::json) from (
        select
          j.recruiter_id,
          p.full_name as recruiter_name,
          count(distinct a.id) as total_applications,
          count(distinct a.id) filter (where a.status = 'hired') as total_hires
        from public.jobs j
        left join public.profiles p on p.id = j.recruiter_id
        left join public.applications a on a.job_id = j.id
        where j.company_id = p_company_id
        group by j.recruiter_id, p.full_name
        order by total_hires desc
      ) t
    )
  ) into v_result;

  return v_result;
end;
$$;
