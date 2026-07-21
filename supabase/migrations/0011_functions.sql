-- ============================================================================
-- Migration 0011: RPC Functions (vector search, profile completion, dashboard stats)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Vector similarity search: find best-matching active jobs for a resume.
-- ---------------------------------------------------------------------------
create or replace function public.match_jobs_for_resume(
  p_resume_embedding vector(1536),
  p_match_count int default 20,
  p_min_similarity float default 0.5
)
returns table (
  job_id uuid,
  similarity float
)
language sql
stable
as $$
  select j.id as job_id, 1 - (j.embedding <=> p_resume_embedding) as similarity
  from public.jobs j
  where j.status = 'published'
    and j.embedding is not null
    and 1 - (j.embedding <=> p_resume_embedding) >= p_min_similarity
  order by j.embedding <=> p_resume_embedding
  limit p_match_count;
$$;

-- ---------------------------------------------------------------------------
-- Vector similarity search: find best-matching candidates (resumes) for a job.
-- ---------------------------------------------------------------------------
create or replace function public.match_candidates_for_job(
  p_job_embedding vector(1536),
  p_match_count int default 50,
  p_min_similarity float default 0.4
)
returns table (
  candidate_id uuid,
  resume_id uuid,
  similarity float
)
language sql
stable
as $$
  select r.candidate_id, r.id as resume_id, 1 - (r.embedding <=> p_job_embedding) as similarity
  from public.resumes r
  where r.embedding is not null
    and r.is_primary = true
    and 1 - (r.embedding <=> p_job_embedding) >= p_min_similarity
  order by r.embedding <=> p_job_embedding
  limit p_match_count;
$$;

-- ---------------------------------------------------------------------------
-- Recompute candidate profile completion percentage.
-- ---------------------------------------------------------------------------
create or replace function public.recompute_profile_completion(p_candidate_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_score int := 0;
  v_has_summary boolean;
  v_has_experience boolean;
  v_has_education boolean;
  v_has_skills boolean;
  v_has_resume boolean;
  v_has_location boolean;
begin
  select (summary is not null and length(summary) > 20), (location is not null)
    into v_has_summary, v_has_location
    from public.candidates where id = p_candidate_id;

  select exists(select 1 from public.candidate_experience where candidate_id = p_candidate_id) into v_has_experience;
  select exists(select 1 from public.candidate_education where candidate_id = p_candidate_id) into v_has_education;
  select exists(select 1 from public.candidate_skills where candidate_id = p_candidate_id) into v_has_skills;
  select exists(select 1 from public.resumes where candidate_id = p_candidate_id) into v_has_resume;

  v_score := v_score + (case when v_has_summary then 15 else 0 end);
  v_score := v_score + (case when v_has_location then 10 else 0 end);
  v_score := v_score + (case when v_has_experience then 25 else 0 end);
  v_score := v_score + (case when v_has_education then 20 else 0 end);
  v_score := v_score + (case when v_has_skills then 20 else 0 end);
  v_score := v_score + (case when v_has_resume then 10 else 0 end);

  update public.candidates set profile_completion_percent = v_score where id = p_candidate_id;

  return v_score;
end;
$$;

-- ---------------------------------------------------------------------------
-- HR dashboard aggregate stats for a company.
-- ---------------------------------------------------------------------------
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
      select case when count(*) filter (where status in ('offer', 'hired')) = 0 then 0
        else round(100.0 * count(*) filter (where status = 'hired') / nullif(count(*) filter (where status in ('offer', 'hired')), 0), 1)
      end
      from public.applications a
      join public.jobs j on j.id = a.job_id
      where j.company_id = p_company_id
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Notify candidate helper (used by triggers / server actions via RPC)
-- ---------------------------------------------------------------------------
create or replace function public.create_notification(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_message text,
  p_link text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  insert into public.notifications (user_id, type, title, message, link)
  values (p_user_id, p_type, p_title, p_message, p_link)
  returning id into v_id;
  return v_id;
end;
$$;

-- Auto-notify candidate + create audit log when application status changes.
create or replace function public.on_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    perform public.create_notification(
      new.candidate_id,
      'application_status_changed',
      'Application status updated',
      'Your application status changed to ' || new.status,
      '/candidate/applications'
    );

    insert into public.audit_logs (action, entity_type, entity_id, metadata)
    values ('application_status_changed', 'application', new.id, jsonb_build_object('from', old.status, 'to', new.status));
  elsif (tg_op = 'INSERT') then
    perform public.create_notification(
      new.candidate_id,
      'application_received',
      'Application submitted',
      'Your application has been received and is being reviewed.',
      '/candidate/applications'
    );
  end if;
  return new;
end;
$$;

create trigger applications_notify_trigger
  after insert or update on public.applications
  for each row execute function public.on_application_status_change();
