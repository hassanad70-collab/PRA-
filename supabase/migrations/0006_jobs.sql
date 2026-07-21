-- ============================================================================
-- Migration 0006: Jobs
-- ============================================================================

create table public.jobs (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  recruiter_id uuid not null references public.recruiters(id) on delete set null,
  title text not null,
  slug text not null,
  department text,
  description text not null,
  responsibilities text[],
  requirements text[],
  benefits text[],
  employment_type employment_type not null default 'full_time',
  experience_level experience_level not null default 'mid',
  min_experience_years numeric(4,1) default 0,
  education_requirement text,
  required_skills text[] not null default '{}',
  nice_to_have_skills text[] default '{}',
  location text,
  is_remote boolean not null default false,
  salary_min numeric(12,2),
  salary_max numeric(12,2),
  salary_currency text default 'USD',
  headcount int not null default 1,
  status job_status not null default 'draft',
  is_archived boolean not null default false,
  duplicated_from uuid references public.jobs(id) on delete set null,
  embedding vector(1536),
  views_count int not null default 0,
  applications_count int not null default 0,
  published_at timestamptz,
  closes_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, slug)
);

create index jobs_company_idx on public.jobs (company_id);
create index jobs_recruiter_idx on public.jobs (recruiter_id);
create index jobs_status_idx on public.jobs (status);
create index jobs_skills_idx on public.jobs using gin (required_skills);
create index jobs_embedding_idx on public.jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index jobs_title_trgm_idx on public.jobs using gin (title gin_trgm_ops);
create index jobs_location_idx on public.jobs (location);

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- Now wire saved_jobs.job_id FK.
alter table public.saved_jobs
  add constraint saved_jobs_job_fk
  foreign key (job_id) references public.jobs(id) on delete cascade;

create index saved_jobs_job_idx on public.saved_jobs (job_id);
create index saved_jobs_candidate_idx on public.saved_jobs (candidate_id);
