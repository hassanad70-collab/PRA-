-- ============================================================================
-- Migration 0004: Candidates (core profile)
-- ============================================================================

create table public.candidates (
  id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  summary text,
  current_position text,
  current_company text,
  years_of_experience numeric(4,1) default 0,
  expected_salary_min numeric(12,2),
  expected_salary_max numeric(12,2),
  salary_currency text default 'USD',
  location text,
  address text,
  city text,
  country text,
  date_of_birth date,
  nationality text,
  willing_to_relocate boolean default false,
  notice_period_days int,
  linkedin_url text,
  github_url text,
  portfolio_url text,
  website_url text,
  primary_resume_id uuid,
  profile_completion_percent int not null default 0,
  is_open_to_work boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index candidates_location_idx on public.candidates (location);
create index candidates_years_experience_idx on public.candidates (years_of_experience);

create trigger candidates_set_updated_at
  before update on public.candidates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Candidate detail tables
-- ---------------------------------------------------------------------------

create table public.candidate_experience (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  company_name text not null,
  job_title text not null,
  location text,
  employment_type employment_type,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  description text,
  created_at timestamptz not null default now()
);

create index candidate_experience_candidate_idx on public.candidate_experience (candidate_id);

create table public.candidate_education (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  grade text,
  description text,
  created_at timestamptz not null default now()
);

create index candidate_education_candidate_idx on public.candidate_education (candidate_id);

create table public.candidate_skills (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  skill_name text not null,
  proficiency proficiency_level default 'intermediate',
  years_experience numeric(4,1),
  is_ai_extracted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (candidate_id, skill_name)
);

create index candidate_skills_candidate_idx on public.candidate_skills (candidate_id);
create index candidate_skills_name_idx on public.candidate_skills using gin (skill_name gin_trgm_ops);

create table public.candidate_certificates (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  name text not null,
  issuing_organization text,
  issue_date date,
  expiry_date date,
  credential_id text,
  credential_url text,
  created_at timestamptz not null default now()
);

create index candidate_certificates_candidate_idx on public.candidate_certificates (candidate_id);

create table public.candidate_languages (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  language text not null,
  proficiency language_proficiency not null default 'conversational',
  created_at timestamptz not null default now(),
  unique (candidate_id, language)
);

create table public.candidate_projects (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  name text not null,
  description text,
  project_url text,
  technologies text[],
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create index candidate_projects_candidate_idx on public.candidate_projects (candidate_id);

create table public.candidate_achievements (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  title text not null,
  description text,
  achieved_on date,
  created_at timestamptz not null default now()
);

create table public.candidate_social_links (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  platform text not null,
  url text not null,
  created_at timestamptz not null default now(),
  unique (candidate_id, platform)
);

create table public.saved_jobs (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  job_id uuid not null,
  created_at timestamptz not null default now(),
  unique (candidate_id, job_id)
);
