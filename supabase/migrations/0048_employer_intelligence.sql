-- ============================================================
-- V1.5 Employer Intelligence Platform (migration 0048)
-- ============================================================

-- Recruiter bookmarks / saved candidates
create table if not exists public.saved_candidates (
  id            uuid primary key default gen_random_uuid(),
  recruiter_id  uuid not null references public.recruiters(id) on delete cascade,
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  notes         text,
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now(),
  unique (recruiter_id, candidate_id)
);

alter table public.saved_candidates enable row level security;

create policy "recruiter owns saved_candidates"
  on public.saved_candidates
  for all
  using (
    recruiter_id in (
      select id from public.recruiters where id = recruiter_id
        and exists (select 1 from public.profiles where id = auth.uid() and id = (
          select p.id from public.profiles p
          join public.recruiters r on r.id = public.saved_candidates.recruiter_id
          where p.id = auth.uid()
          limit 1
        ))
    )
  );

-- simpler RLS: recruiter rows are owned by the user whose profile.id matches
drop policy if exists "recruiter owns saved_candidates" on public.saved_candidates;

create policy "recruiter owns saved_candidates"
  on public.saved_candidates
  for all
  using (
    exists (
      select 1 from public.recruiters r
      join public.profiles p on p.id = auth.uid()
      where r.id = public.saved_candidates.recruiter_id
        and p.id = auth.uid()
        and p.role in ('recruiter', 'hr_manager', 'super_admin')
    )
  );

create index if not exists saved_candidates_recruiter_idx
  on public.saved_candidates(recruiter_id, created_at desc);

-- ----------------------------------------------------------------
-- Extended company brand / profile page
-- ----------------------------------------------------------------
create table if not exists public.company_profiles (
  id              uuid primary key default gen_random_uuid(),
  company_id      uuid not null unique references public.companies(id) on delete cascade,
  about           text,
  culture         text,
  banner_url      text,
  website         text,
  headquarters    text,
  company_size    text,
  founded_year    integer,
  benefits        text[] not null default '{}',
  social_links    jsonb not null default '{}',
  tech_stack      text[] not null default '{}',
  is_published    boolean not null default false,
  updated_at      timestamptz not null default now()
);

alter table public.company_profiles enable row level security;

-- anyone can read published profiles
create policy "public can read published company_profiles"
  on public.company_profiles
  for select
  using (is_published = true);

-- recruiters at this company can manage
create policy "recruiter manages own company_profile"
  on public.company_profiles
  for all
  using (
    exists (
      select 1 from public.recruiters r
      join public.profiles p on p.id = auth.uid()
      where r.company_id = public.company_profiles.company_id
        and p.id = auth.uid()
        and p.role in ('recruiter', 'hr_manager', 'super_admin')
    )
  );

-- ----------------------------------------------------------------
-- Color labels / tags for candidates in recruiter context
-- ----------------------------------------------------------------
create table if not exists public.recruiter_candidate_labels (
  id            uuid primary key default gen_random_uuid(),
  recruiter_id  uuid not null references public.recruiters(id) on delete cascade,
  candidate_id  uuid not null references public.candidates(id) on delete cascade,
  label         text not null,
  color         text not null default '#6366f1',
  created_at    timestamptz not null default now(),
  unique (recruiter_id, candidate_id, label)
);

alter table public.recruiter_candidate_labels enable row level security;

create policy "recruiter owns labels"
  on public.recruiter_candidate_labels
  for all
  using (
    exists (
      select 1 from public.recruiters r
      join public.profiles p on p.id = auth.uid()
      where r.id = public.recruiter_candidate_labels.recruiter_id
        and p.id = auth.uid()
        and p.role in ('recruiter', 'hr_manager', 'super_admin')
    )
  );

create index if not exists rcl_recruiter_candidate_idx
  on public.recruiter_candidate_labels(recruiter_id, candidate_id);
