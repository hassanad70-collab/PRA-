-- ============================================================================
-- Migration 0019: Organizations & Roles
--
-- Implements Sections 3.3 (role-capability permission model) and 3.4
-- (teammate invite flow) of docs/v1.2-saas-architecture-proposal.md, the
-- approved SaaS architecture blueprint.
--
-- Replaces the binary recruiters.is_company_admin flag with a proper
-- per-company role (owner/admin/recruiter/viewer) and a data-driven
-- role -> capability mapping, so permission checks ask "does this role have
-- capability X?" against a table rather than hardcoding role names at every
-- check site. Adds a token-based invite flow (no email-sending dependency --
-- see the architecture-review note for why) so a company can finally have
-- more than one member; today registerRecruiter() always creates a
-- brand-new company, and there is no other way to join an existing one.
--
-- Deliberately NOT in scope here (per the blueprint's own roadmap, item 5,
-- "Permissions hardening" -- explicitly sequenced after Team Management):
-- retrofitting jobs/applications/interviews/etc.'s existing RLS write
-- policies to check capabilities instead of company membership. Those keep
-- treating every company-scoped staff member equally for now; has_capability()
-- is introduced here and used by the *new* surfaces this migration adds
-- (invites, role changes, org settings), not backfilled everywhere yet.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- recruiter_role + recruiters.role (replaces is_company_admin)
-- ---------------------------------------------------------------------------

create type recruiter_role as enum ('owner', 'admin', 'recruiter', 'viewer');

alter table public.recruiters
  add column role recruiter_role not null default 'recruiter';

-- Backfill: the company's creator becomes owner; any other recruiter that
-- had is_company_admin=true becomes admin; everyone else keeps the default
-- 'recruiter'. No company can have more than one member today (no invite
-- flow has ever existed), so this is a straightforward 1:1 mapping in
-- practice, not a real multi-member reconciliation.
update public.recruiters r
set role = 'owner'
from public.companies c
where c.id = r.company_id
  and c.created_by = r.id;

update public.recruiters
set role = 'admin'
where role <> 'owner'
  and is_company_admin = true;

-- Safety net: a company whose creator's profile/recruiter row no longer
-- exists (companies.created_by is `on delete set null`) would otherwise end
-- up with zero owners. Promote that company's earliest-created recruiter.
update public.recruiters r
set role = 'owner'
where role <> 'owner'
  and id = (
    select r2.id from public.recruiters r2
    where r2.company_id = r.company_id
    order by r2.created_at asc
    limit 1
  )
  and not exists (
    select 1 from public.recruiters r3
    where r3.company_id = r.company_id and r3.role = 'owner'
  );

alter table public.recruiters
  drop column is_company_admin;

-- At most one owner per company. ("At least one" is an application-level
-- invariant maintained by the transfer-ownership flow below, which never
-- allows the last owner to be removed without a successor -- not something
-- a single-table constraint can express.)
create unique index recruiters_one_owner_per_company on public.recruiters (company_id) where (role = 'owner');

comment on column public.recruiters.role is
  'Per-company role (owner/admin/recruiter/viewer), distinct from profiles.role''s platform-level role. Drives permissions via role_capabilities + has_capability(), not hardcoded checks.';

-- ---------------------------------------------------------------------------
-- role_capabilities + has_capability()
-- ---------------------------------------------------------------------------

create table public.role_capabilities (
  role recruiter_role not null,
  capability text not null,
  primary key (role, capability)
);

comment on table public.role_capabilities is
  'Data-driven role -> capability mapping. Add a role or change what one can do by editing rows here, not by editing every RLS policy/action that checks permissions.';

insert into public.role_capabilities (role, capability) values
  -- Owner: everything.
  ('owner', 'manage_billing'),
  ('owner', 'manage_org_settings'),
  ('owner', 'invite_members'),
  ('owner', 'remove_members'),
  ('owner', 'change_member_roles'),
  ('owner', 'manage_jobs'),
  ('owner', 'view_jobs'),
  ('owner', 'manage_candidates'),
  ('owner', 'view_candidates'),
  ('owner', 'schedule_interviews'),
  ('owner', 'submit_interview_feedback'),
  ('owner', 'use_ai_features'),
  ('owner', 'view_analytics'),
  -- Admin: everything except billing.
  ('admin', 'manage_org_settings'),
  ('admin', 'invite_members'),
  ('admin', 'remove_members'),
  ('admin', 'change_member_roles'),
  ('admin', 'manage_jobs'),
  ('admin', 'view_jobs'),
  ('admin', 'manage_candidates'),
  ('admin', 'view_candidates'),
  ('admin', 'schedule_interviews'),
  ('admin', 'submit_interview_feedback'),
  ('admin', 'use_ai_features'),
  ('admin', 'view_analytics'),
  -- Recruiter: full operational access, no billing/org/member management.
  ('recruiter', 'manage_jobs'),
  ('recruiter', 'view_jobs'),
  ('recruiter', 'manage_candidates'),
  ('recruiter', 'view_candidates'),
  ('recruiter', 'schedule_interviews'),
  ('recruiter', 'submit_interview_feedback'),
  ('recruiter', 'use_ai_features'),
  ('recruiter', 'view_analytics'),
  -- Viewer: read-only.
  ('viewer', 'view_jobs'),
  ('viewer', 'view_candidates'),
  ('viewer', 'view_analytics');

create or replace function public.has_capability(p_capability text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    (
      select true
      from public.recruiters r
      join public.role_capabilities rc on rc.role = r.role
      where r.id = auth.uid() and rc.capability = p_capability
    ),
    false
  );
$$;

comment on function public.has_capability(text) is
  'True if the calling recruiter''s per-company role grants the given capability. security definer, mirrors is_staff()/is_admin() -- callable from RLS policies and as an RPC from server actions to authorize a privileged write before it happens.';

alter table public.role_capabilities enable row level security;

create policy "role_capabilities_read" on public.role_capabilities
  for select using (true);

-- ---------------------------------------------------------------------------
-- recruiter_invites (token-based -- see migration header for why not email)
-- ---------------------------------------------------------------------------

create table public.recruiter_invites (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role recruiter_role not null default 'recruiter',
  token uuid not null unique default uuid_generate_v4(),
  invited_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

create index recruiter_invites_company_idx on public.recruiter_invites (company_id);
create index recruiter_invites_token_idx on public.recruiter_invites (token);
create unique index recruiter_invites_one_pending_per_email on public.recruiter_invites (company_id, email) where (status = 'pending');

comment on table public.recruiter_invites is
  'Token-based teammate invites. No email is sent by this table/schema -- an authorized inviter shares the generated link themselves. See migration header.';

alter table public.recruiter_invites enable row level security;

create policy "recruiter_invites_select" on public.recruiter_invites
  for select using (public.has_capability('invite_members') and company_id = public.my_company_id());

create policy "recruiter_invites_insert" on public.recruiter_invites
  for insert with check (public.has_capability('invite_members') and company_id = public.my_company_id());

create policy "recruiter_invites_update" on public.recruiter_invites
  for update using (public.has_capability('invite_members') and company_id = public.my_company_id());

-- ---------------------------------------------------------------------------
-- Ownership transfer (Section 3.6: two-step propose -> accept, never a
-- single action that could leave an org ownerless)
-- ---------------------------------------------------------------------------

alter table public.companies
  add column pending_owner_id uuid references public.recruiters(id) on delete set null;

comment on column public.companies.pending_owner_id is
  'Set by the current owner to propose an ownership transfer; cleared when the proposed recruiter accepts (which also atomically swaps roles). Two-step so an org is never left ownerless by one mistaken action.';

-- ---------------------------------------------------------------------------
-- Org settings is now a capability, not a blanket company-membership check
-- ---------------------------------------------------------------------------

drop policy if exists "companies_staff_update" on public.companies;

create policy "companies_staff_update" on public.companies
  for update using (
    (id = public.my_company_id() and public.has_capability('manage_org_settings'))
    or public.is_admin()
  );

commit;
