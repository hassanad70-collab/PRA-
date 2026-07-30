-- ============================================================================
-- Migration 0037: Extend Notifications + Add Notification Preferences
--                 + Search Analytics + Autocomplete RPCs
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Extend notification_type enum with job discovery types
-- ---------------------------------------------------------------------------
alter type public.notification_type add value if not exists 'job_alert';
alter type public.notification_type add value if not exists 'weekly_digest';
alter type public.notification_type add value if not exists 'ai_recommendation';

-- ---------------------------------------------------------------------------
-- Extend existing notifications table with read_at + data columns
-- ---------------------------------------------------------------------------
alter table public.notifications
  add column if not exists read_at  timestamptz,
  add column if not exists data     jsonb not null default '{}';

-- Partial index for unread badge queries
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where is_read = false;

-- ---------------------------------------------------------------------------
-- notification_preferences — per-user opt-in / opt-out
-- ---------------------------------------------------------------------------
create table public.notification_preferences (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null references public.profiles(id) on delete cascade,
  job_alert       boolean     not null default true,
  job_match       boolean     not null default true,
  interview       boolean     not null default true,
  offer           boolean     not null default true,
  digest          boolean     not null default true,
  ai_rec          boolean     not null default true,
  email_alerts    boolean     not null default true,
  updated_at      timestamptz not null default now(),
  unique (user_id)
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;

create policy "notif_prefs_own" on public.notification_preferences
  for all
  using  (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- get_unread_notification_count — fast unread badge count for current user
-- ---------------------------------------------------------------------------
create or replace function public.get_unread_notification_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.notifications
  where user_id = auth.uid()
    and is_read = false;
$$;

-- ---------------------------------------------------------------------------
-- mark_notifications_read — batch mark read + timestamp
-- ---------------------------------------------------------------------------
create or replace function public.mark_notifications_read(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set is_read = true,
      read_at  = now()
  where id = any(p_ids)
    and user_id = auth.uid()
    and is_read = false;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_search_analytics — aggregated Job Discovery metrics for admin dashboard
-- ---------------------------------------------------------------------------
create or replace function public.get_search_analytics()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result json;
begin
  select json_build_object(
    'total_searches',       (select coalesce(sum(search_count), 0) from public.candidate_search_history),
    'unique_searches',      (select count(*) from public.candidate_search_history),
    'unique_searchers',     (select count(distinct candidate_id) from public.candidate_search_history),
    'total_saved_searches', (select count(*) from public.candidate_saved_searches),
    'total_active_alerts',  (select count(*) from public.candidate_job_alerts where is_active = true),
    'total_alerts',         (select count(*) from public.candidate_job_alerts),
    'ai_recs_cached',       (select count(distinct candidate_id) from public.candidate_ai_recommendations where expires_at > now()),
    'searches_today',       (select count(*) from public.candidate_search_history where last_used_at >= current_date),
    'searches_this_week',   (select count(*) from public.candidate_search_history where last_used_at >= date_trunc('week', current_date)),

    'top_queries', (
      select coalesce(json_agg(r order by r.count desc), '[]'::json)
      from (
        select query as term, sum(search_count) as count
        from public.candidate_search_history
        where query != ''
        group by query
        order by count desc
        limit 10
      ) r
    ),
    'top_keywords', (
      select coalesce(json_agg(r order by r.count desc), '[]'::json)
      from (
        select keywords as term, sum(search_count) as count
        from public.candidate_search_history
        where keywords != ''
        group by keywords
        order by count desc
        limit 10
      ) r
    ),
    'top_locations', (
      select coalesce(json_agg(r order by r.count desc), '[]'::json)
      from (
        select location as term, sum(search_count) as count
        from public.candidate_search_history
        where location != ''
        group by location
        order by count desc
        limit 8
      ) r
    ),
    'experience_distribution', (
      select coalesce(json_object_agg(experience_level, cnt), '{}'::json)
      from (
        select experience_level, sum(search_count) as cnt
        from public.candidate_search_history
        group by experience_level
        order by cnt desc
      ) t
    ),
    'alert_frequency_distribution', (
      select coalesce(json_object_agg(frequency, cnt), '{}'::json)
      from (
        select frequency, count(*) as cnt
        from public.candidate_job_alerts
        group by frequency
      ) t
    )
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_autocomplete_suggestions — prefix search for search inputs
-- Returns ranked suggestions from search history + internal job titles
-- ---------------------------------------------------------------------------
create or replace function public.get_autocomplete_suggestions(
  p_term   text,
  p_field  text default 'title',
  p_limit  int  default 8
)
returns table (text text, source text, count bigint)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_field = 'title' then
    return query
      select deduped.text, deduped.source, deduped.count
      from (
        select distinct on (lower(combined.term))
          combined.term  as text,
          combined.src   as source,
          combined.cnt   as count
        from (
          select query as term, 'history' as src, sum(search_count)::bigint as cnt
          from public.candidate_search_history
          where query ilike p_term || '%'
          group by query

          union all

          select title as term, 'jobs' as src, count(*)::bigint as cnt
          from public.jobs
          where title ilike p_term || '%'
            and status = 'published'
          group by title
        ) combined
        order by lower(combined.term), combined.cnt desc
      ) deduped
      order by deduped.count desc
      limit p_limit;

  elsif p_field = 'keywords' then
    return query
      select sh.keywords as text, 'history' as source, sum(sh.search_count)::bigint as count
      from public.candidate_search_history sh
      where sh.keywords ilike p_term || '%'
        and sh.keywords != ''
      group by sh.keywords
      order by count desc
      limit p_limit;

  elsif p_field = 'location' then
    return query
      select sh.location as text, 'history' as source, sum(sh.search_count)::bigint as count
      from public.candidate_search_history sh
      where sh.location ilike p_term || '%'
        and sh.location != ''
      group by sh.location
      order by count desc
      limit p_limit;

  else
    return;
  end if;
end;
$$;

commit;
