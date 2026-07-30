-- ============================================================================
-- Migration 0036: Job Discovery — Search History, Saved Searches, Job Alerts,
-- Recent Views, AI Recommendations Cache
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- candidate_search_history
-- Deduplication via UNIQUE (candidate_id, query_key). Use the
-- upsert_search_history() RPC to increment search_count atomically.
-- ---------------------------------------------------------------------------
create table public.candidate_search_history (
  id               uuid        primary key default gen_random_uuid(),
  candidate_id     uuid        not null references public.candidates(id) on delete cascade,
  query_key        text        not null,
  query            text        not null default '',
  keywords         text        not null default '',
  location         text        not null default '',
  experience_level text        not null default 'any',
  filters          text[]      not null default '{}',
  search_source    text        not null default 'manual',
  search_count     integer     not null default 1,
  last_used_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (candidate_id, query_key)
);

create index candidate_search_history_candidate_idx
  on public.candidate_search_history (candidate_id, last_used_at desc);

alter table public.candidate_search_history enable row level security;

create policy "search_history_own_all" on public.candidate_search_history
  for all
  using  (candidate_id = auth.uid() or public.is_admin())
  with check (candidate_id = auth.uid());

-- Atomic upsert that increments search_count on conflict.
create or replace function public.upsert_search_history(
  p_candidate_id   uuid,
  p_query_key      text,
  p_query          text,
  p_keywords       text,
  p_location       text,
  p_experience_level text,
  p_filters        text[],
  p_search_source  text default 'manual'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.candidate_search_history
    (candidate_id, query_key, query, keywords, location,
     experience_level, filters, search_source)
  values
    (p_candidate_id, p_query_key, p_query, p_keywords, p_location,
     p_experience_level, p_filters, p_search_source)
  on conflict (candidate_id, query_key) do update set
    search_count     = candidate_search_history.search_count + 1,
    last_used_at     = now(),
    query            = excluded.query,
    keywords         = excluded.keywords,
    location         = excluded.location,
    experience_level = excluded.experience_level,
    filters          = excluded.filters;
end;
$$;

-- ---------------------------------------------------------------------------
-- candidate_saved_searches
-- ---------------------------------------------------------------------------
create table public.candidate_saved_searches (
  id               uuid        primary key default gen_random_uuid(),
  candidate_id     uuid        not null references public.candidates(id) on delete cascade,
  name             text        not null,
  query            text        not null default '',
  keywords         text        not null default '',
  location         text        not null default '',
  experience_level text        not null default 'any',
  filters          text[]      not null default '{}',
  platforms        text[]      not null default '{google,linkedin,wuzzuf,indeed,bayt}',
  is_active        boolean     not null default true,
  alert_enabled    boolean     not null default false,
  alert_frequency  text        not null default 'weekly'
    check (alert_frequency in ('instant','daily','weekly')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index candidate_saved_searches_candidate_idx
  on public.candidate_saved_searches (candidate_id);
create index candidate_saved_searches_alert_idx
  on public.candidate_saved_searches (candidate_id)
  where alert_enabled = true;

create trigger candidate_saved_searches_set_updated_at
  before update on public.candidate_saved_searches
  for each row execute function public.set_updated_at();

alter table public.candidate_saved_searches enable row level security;

create policy "saved_searches_own_all" on public.candidate_saved_searches
  for all
  using  (candidate_id = auth.uid() or public.is_admin())
  with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- candidate_job_alerts
-- ---------------------------------------------------------------------------
create table public.candidate_job_alerts (
  id               uuid        primary key default gen_random_uuid(),
  candidate_id     uuid        not null references public.candidates(id) on delete cascade,
  saved_search_id  uuid        references public.candidate_saved_searches(id) on delete set null,
  name             text        not null,
  query            text        not null default '',
  keywords         text        not null default '',
  location         text        not null default '',
  experience_level text        not null default 'any',
  filters          text[]      not null default '{}',
  platforms        text[]      not null default '{google,linkedin,wuzzuf,indeed,bayt}',
  frequency        text        not null default 'weekly'
    check (frequency in ('instant','daily','weekly')),
  min_ats_score    integer     not null default 0,
  salary_min       integer,
  salary_max       integer,
  is_active        boolean     not null default true,
  last_sent_at     timestamptz,
  next_send_at     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index candidate_job_alerts_candidate_idx
  on public.candidate_job_alerts (candidate_id);
create index candidate_job_alerts_active_next_idx
  on public.candidate_job_alerts (next_send_at)
  where is_active = true;

create trigger candidate_job_alerts_set_updated_at
  before update on public.candidate_job_alerts
  for each row execute function public.set_updated_at();

alter table public.candidate_job_alerts enable row level security;

create policy "job_alerts_own_all" on public.candidate_job_alerts
  for all
  using  (candidate_id = auth.uid() or public.is_admin())
  with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- candidate_recent_views — which internal PRA jobs the candidate has viewed
-- ---------------------------------------------------------------------------
create table public.candidate_recent_views (
  id           uuid        primary key default gen_random_uuid(),
  candidate_id uuid        not null references public.candidates(id) on delete cascade,
  job_id       uuid        not null references public.jobs(id) on delete cascade,
  view_count   integer     not null default 1,
  viewed_at    timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  unique (candidate_id, job_id)
);

create index candidate_recent_views_candidate_idx
  on public.candidate_recent_views (candidate_id, viewed_at desc);

alter table public.candidate_recent_views enable row level security;

create policy "recent_views_own_all" on public.candidate_recent_views
  for all
  using  (candidate_id = auth.uid() or public.is_admin())
  with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- candidate_ai_recommendations — cached AI career recommendations (24 h TTL)
-- ---------------------------------------------------------------------------
create table public.candidate_ai_recommendations (
  id                  uuid        primary key default gen_random_uuid(),
  candidate_id        uuid        not null references public.candidates(id) on delete cascade,
  recommendation_type text        not null,
  title               text        not null,
  description         text        not null default '',
  confidence_score    integer     not null default 0
    check (confidence_score between 0 and 100),
  metadata            jsonb       not null default '{}',
  position_order      integer     not null default 0,
  generated_at        timestamptz not null default now(),
  expires_at          timestamptz not null,
  is_accepted         boolean,
  accepted_at         timestamptz
);

create index candidate_ai_recs_lookup_idx
  on public.candidate_ai_recommendations (candidate_id, recommendation_type);
create index candidate_ai_recs_expiry_idx
  on public.candidate_ai_recommendations (candidate_id, expires_at);

alter table public.candidate_ai_recommendations enable row level security;

create policy "ai_recs_own_all" on public.candidate_ai_recommendations
  for all
  using  (candidate_id = auth.uid() or public.is_admin())
  with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Email templates for job discovery (safe ON CONFLICT DO NOTHING)
-- ---------------------------------------------------------------------------
insert into public.email_templates
  (key, name, subject, html_body, text_body, variables, category)
values
(
  'job_alert',
  'Job Alert Notification',
  'New opportunities matching "{{search_name}}" — PRA Talent Intelligence',
  '<h2>New Jobs Matching Your Search</h2>
<p>Hi {{candidate_name}},</p>
<p>New opportunities are available matching your saved search <strong>"{{search_name}}"</strong>.</p>
<p>Search across Google Jobs, LinkedIn, Wuzzuf, Indeed, and Bayt with one click.</p>
<p><a href="{{platform_url}}">Browse Matching Jobs →</a></p>
<p style="color:#888;font-size:12px">Manage your alerts: <a href="{{platform_url}}/candidate/jobs?tab=saved">Job Alerts</a></p>',
  'Hi {{candidate_name}}, new jobs match your search "{{search_name}}". Visit {{platform_url}}.',
  '["candidate_name","search_name","platform_url"]'::jsonb,
  'job_discovery'
),
(
  'recommended_jobs',
  'AI Recommended Jobs',
  'AI found career opportunities for you — PRA Talent Intelligence',
  '<h2>AI Career Recommendations</h2>
<p>Hi {{candidate_name}},</p>
<p>Based on your profile, our AI identified these search opportunities:</p>
<p>{{job_titles_html}}</p>
<p><a href="{{platform_url}}">Explore AI Recommendations →</a></p>
<p style="color:#888;font-size:12px"><a href="{{platform_url}}/candidate/profile">Update profile</a> for better results.</p>',
  'Hi {{candidate_name}}, AI found new career opportunities. Visit {{platform_url}}.',
  '["candidate_name","job_titles_html","platform_url"]'::jsonb,
  'job_discovery'
),
(
  'weekly_career_digest',
  'Weekly Career Digest',
  'Your weekly career update — PRA Talent Intelligence',
  '<h2>Your Weekly Career Digest</h2>
<p>Hi {{candidate_name}},</p>
<table>
<tr><td>New PRA matches</td><td><strong>{{new_matches}}</strong></td></tr>
<tr><td>ATS Score</td><td><strong>{{ats_score}}</strong></td></tr>
<tr><td>Active Alerts</td><td><strong>{{active_alerts}}</strong></td></tr>
</table>
<p><a href="{{platform_url}}">View Dashboard →</a></p>
<p style="color:#888;font-size:12px"><a href="{{platform_url}}/candidate/jobs?tab=saved">Manage alerts</a></p>',
  'Hi {{candidate_name}}, your weekly digest: {{new_matches}} new matches, ATS Score: {{ats_score}}. Visit {{platform_url}}.',
  '["candidate_name","new_matches","ats_score","active_alerts","platform_url"]'::jsonb,
  'job_discovery'
)
on conflict (key) do nothing;

commit;
