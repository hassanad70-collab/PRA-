-- ============================================================================
-- Migration 0029: Company Model Enhancement + Profiles Company Association
--
-- Extends companies with the full subscription + location model required for
-- multi-tenant SaaS: subscription_plan, subscription_status, country, timezone.
-- Adds profiles.company_id so that super_admin (and future platform-level users)
-- can be directly associated with a company without needing a recruiters row.
-- Adds missing performance indexes on frequently-filtered columns.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Extend companies: subscription tracking + location
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists country text,
  add column if not exists timezone text not null default 'UTC',
  add column if not exists subscription_plan text not null default 'free',
  add column if not exists subscription_status text not null default 'active';

alter table public.companies
  add constraint companies_subscription_plan_check
    check (subscription_plan in ('free', 'starter', 'professional', 'enterprise')),
  add constraint companies_subscription_status_check
    check (subscription_status in ('active', 'trialing', 'past_due', 'cancelled', 'suspended'));

-- ---------------------------------------------------------------------------
-- profiles.company_id: direct company association for platform-level accounts
-- (super_admin is associated with PRA Consultancy via migration 0030;
--  candidates remain NULL — they are platform-wide, not company-scoped).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists company_id uuid references public.companies(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Performance indexes for high-frequency filter columns
-- ---------------------------------------------------------------------------
create index if not exists companies_subscription_plan_idx   on public.companies (subscription_plan);
create index if not exists companies_subscription_status_idx on public.companies (subscription_status);
create index if not exists companies_is_active_idx           on public.companies (is_active);
create index if not exists profiles_company_id_idx           on public.profiles (company_id) where company_id is not null;
create index if not exists applications_status_idx           on public.applications (status);
create index if not exists applications_applied_at_idx       on public.applications (applied_at desc);
create index if not exists jobs_status_idx                   on public.jobs (status);
create index if not exists resumes_candidate_id_idx          on public.resumes (candidate_id);

commit;
