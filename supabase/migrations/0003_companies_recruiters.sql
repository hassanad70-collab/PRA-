-- ============================================================================
-- Migration 0003: Companies & Recruiters
-- ============================================================================

create table public.companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  logo_url text,
  website text,
  industry text,
  company_size text,
  description text,
  headquarters text,
  founded_year int,
  is_verified boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_slug_idx on public.companies (slug);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------

create table public.recruiters (
  id uuid primary key references public.profiles(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  job_title text,
  department text,
  is_company_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index recruiters_company_id_idx on public.recruiters (company_id);

create trigger recruiters_set_updated_at
  before update on public.recruiters
  for each row execute function public.set_updated_at();
