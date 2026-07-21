-- ============================================================================
-- Migration 0008: Interviews, Notifications, Audit Logs
-- ============================================================================

create table public.interviews (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 45,
  interview_type interview_type not null default 'video',
  location_or_link text,
  interviewer_ids uuid[] default '{}',
  status interview_status not null default 'scheduled',
  feedback text,
  star_evaluation jsonb,
  competency_ratings jsonb,
  hiring_recommendation hiring_recommendation,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interviews_application_idx on public.interviews (application_id);
create index interviews_scheduled_idx on public.interviews (scheduled_at);

create trigger interviews_set_updated_at
  before update on public.interviews
  for each row execute function public.set_updated_at();

create table public.interview_questions (
  id uuid primary key default uuid_generate_v4(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  category text not null check (category in ('technical', 'behavioral', 'situational', 'case_study')),
  question text not null,
  expected_answer text,
  evaluation_criteria text,
  created_at timestamptz not null default now()
);

create index interview_questions_job_idx on public.interview_questions (job_id);

-- ---------------------------------------------------------------------------

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, is_read);
create index notifications_created_idx on public.notifications (created_at desc);

-- ---------------------------------------------------------------------------

create table public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- Talent Pool: tags, notes, pipelines
-- ---------------------------------------------------------------------------

create table public.talent_pool (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  saved_by uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  tags text[] default '{}',
  notes text,
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  unique (candidate_id, company_id)
);

create index talent_pool_company_idx on public.talent_pool (company_id);
create index talent_pool_candidate_idx on public.talent_pool (candidate_id);
