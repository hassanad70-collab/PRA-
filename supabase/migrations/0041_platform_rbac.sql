begin;

-- ============================================================
-- PLATFORM RBAC: roles · permissions · role_permissions · user_roles
--
-- Works alongside profiles.role (which continues to drive routing
-- and existing RLS policies). These tables add fine-grained
-- permission checks via has_permission() / get_my_permissions().
-- ============================================================

-- ------------------------------------------------------------
-- ROLES
-- ------------------------------------------------------------
create table if not exists public.roles (
  id           uuid        not null default gen_random_uuid() primary key,
  name         text        not null unique,
  display_name text        not null,
  description  text,
  is_system    boolean     not null default false,
  is_active    boolean     not null default true,
  color        text        not null default '#6366f1',
  icon         text        not null default 'Shield',
  sort_order   int         not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists roles_name_idx      on public.roles (name);
create index if not exists roles_is_active_idx on public.roles (is_active) where is_active = true;

create or replace trigger roles_set_updated_at
  before update on public.roles
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- PERMISSIONS
-- ------------------------------------------------------------
create table if not exists public.permissions (
  id          uuid        not null default gen_random_uuid() primary key,
  slug        text        not null unique,
  name        text        not null,
  description text,
  category    text        not null,
  is_active   boolean     not null default true,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists permissions_category_idx on public.permissions (category);
create index if not exists permissions_slug_idx     on public.permissions (slug);

-- ------------------------------------------------------------
-- ROLE <-> PERMISSION JUNCTION
-- ------------------------------------------------------------
create table if not exists public.role_permissions (
  role_id       uuid        not null references public.roles(id)       on delete cascade,
  permission_id uuid        not null references public.permissions(id) on delete cascade,
  granted_at    timestamptz not null default now(),
  granted_by    uuid                 references public.profiles(id)    on delete set null,
  primary key (role_id, permission_id)
);

create index if not exists role_permissions_role_id_idx       on public.role_permissions (role_id);
create index if not exists role_permissions_permission_id_idx on public.role_permissions (permission_id);

-- ------------------------------------------------------------
-- USER ROLE ASSIGNMENTS
-- company_id IS NULL     → platform-level (super_admin)
-- company_id IS NOT NULL → company-scoped (company_admin within that org)
-- ------------------------------------------------------------
create table if not exists public.user_roles (
  id          uuid        not null default gen_random_uuid() primary key,
  user_id     uuid        not null references public.profiles(id)  on delete cascade,
  role_id     uuid        not null references public.roles(id)     on delete cascade,
  company_id  uuid                 references public.companies(id) on delete cascade,
  assigned_by uuid                 references public.profiles(id)  on delete set null,
  assigned_at timestamptz not null default now(),
  expires_at  timestamptz
);

-- Partial unique indexes: NULL company_id = platform-level, handled separately
create unique index if not exists user_roles_platform_unique_idx
  on public.user_roles (user_id, role_id)
  where company_id is null;

create unique index if not exists user_roles_company_unique_idx
  on public.user_roles (user_id, role_id, company_id)
  where company_id is not null;

create index if not exists user_roles_user_id_idx    on public.user_roles (user_id);
create index if not exists user_roles_role_id_idx    on public.user_roles (role_id);
create index if not exists user_roles_company_id_idx on public.user_roles (company_id) where company_id is not null;

-- ============================================================
-- RLS
-- ============================================================

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles       enable row level security;

-- roles: anyone can read; only super_admin can write
create policy "roles_public_read" on public.roles
  for select using (true);

create policy "roles_admin_write" on public.roles
  for all using (public.is_admin()) with check (public.is_admin());

-- permissions: anyone can read; only super_admin can write
create policy "permissions_public_read" on public.permissions
  for select using (true);

create policy "permissions_admin_write" on public.permissions
  for all using (public.is_admin()) with check (public.is_admin());

-- role_permissions: anyone can read; only super_admin can write
create policy "role_permissions_public_read" on public.role_permissions
  for select using (true);

create policy "role_permissions_admin_write" on public.role_permissions
  for all using (public.is_admin()) with check (public.is_admin());

-- user_roles: admin sees all; users can read their own assignments
create policy "user_roles_admin_all" on public.user_roles
  for all using (public.is_admin()) with check (public.is_admin());

create policy "user_roles_own_read" on public.user_roles
  for select using (user_id = auth.uid());

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Check if the authenticated user has a specific permission slug
create or replace function public.has_permission(p_slug text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from   public.user_roles ur
    join   public.role_permissions rp on rp.role_id     = ur.role_id
    join   public.permissions perm    on perm.id        = rp.permission_id
                                     and perm.slug      = p_slug
                                     and perm.is_active = true
    join   public.roles r             on r.id           = ur.role_id
                                     and r.is_active    = true
    where  ur.user_id = auth.uid()
      and  (ur.expires_at is null or ur.expires_at > now())
  )
$$;

-- Return all permission slugs for the authenticated user (for UI gating)
create or replace function public.get_my_permissions()
returns setof text
language sql
security definer
stable
set search_path = public
as $$
  select distinct perm.slug
  from   public.user_roles ur
  join   public.role_permissions rp on rp.role_id     = ur.role_id
  join   public.permissions perm    on perm.id        = rp.permission_id
                                   and perm.is_active = true
  join   public.roles r             on r.id           = ur.role_id
                                   and r.is_active    = true
  where  ur.user_id = auth.uid()
    and  (ur.expires_at is null or ur.expires_at > now())
$$;

-- ============================================================
-- SEED: PERMISSIONS
-- ============================================================

insert into public.permissions (slug, name, description, category, sort_order) values
  -- Platform
  ('platform.dashboard',       'View Platform Dashboard',    'Access the main platform KPI dashboard',          'platform', 10),
  ('platform.analytics',       'View Platform Analytics',    'Access platform-wide analytics and trend charts', 'platform', 20),
  ('platform.health',          'View System Health',         'Monitor system status and service health',        'platform', 30),

  -- Companies
  ('companies.read',           'View Companies',             'List and view company details',                   'companies', 10),
  ('companies.create',         'Create Companies',           'Add new companies to the platform',               'companies', 20),
  ('companies.update',         'Edit Companies',             'Modify company details and settings',             'companies', 30),
  ('companies.delete',         'Delete Companies',           'Permanently remove companies',                    'companies', 40),
  ('companies.suspend',        'Suspend / Activate',         'Toggle company active status',                    'companies', 50),
  ('companies.subscription',   'Manage Subscriptions',       'Change subscription plans and billing status',    'companies', 60),

  -- Users
  ('users.read',               'View All Users',             'List and inspect user accounts across roles',     'users', 10),
  ('users.create',             'Create Users',               'Manually create platform accounts',               'users', 20),
  ('users.update',             'Edit User Details',          'Modify name, phone, and profile information',     'users', 30),
  ('users.delete',             'Delete Users',               'Soft-delete user accounts',                       'users', 40),
  ('users.suspend',            'Suspend / Activate Users',   'Toggle account active status',                    'users', 50),
  ('users.reset_password',     'Reset User Passwords',       'Trigger password-reset emails',                   'users', 60),
  ('users.change_role',        'Change User Roles',          'Reassign platform-level roles',                   'users', 70),

  -- Roles
  ('roles.read',               'View Roles',                 'List roles and their permission assignments',     'roles', 10),
  ('roles.create',             'Create Roles',               'Define new platform roles',                       'roles', 20),
  ('roles.update',             'Edit Roles',                 'Modify role metadata and settings',               'roles', 30),
  ('roles.delete',             'Delete Roles',               'Remove non-system roles',                         'roles', 40),
  ('roles.assign',             'Assign Roles to Users',      'Grant or revoke user role assignments',           'roles', 50),
  ('roles.permissions',        'Manage Role Permissions',    'Add or remove permissions from roles',            'roles', 60),
  ('roles.duplicate',          'Duplicate Roles',            'Clone an existing role with its permissions',     'roles', 70),

  -- Billing
  ('billing.read',             'View Billing',               'Access billing overview and invoice history',     'billing', 10),
  ('billing.manage',           'Manage Billing',             'Update billing methods and plans',                'billing', 20),
  ('billing.invoices',         'View Invoices',              'Download and view invoice records',               'billing', 30),

  -- AI
  ('ai.read',                  'View AI Usage',              'Monitor AI request counts and costs',             'ai', 10),
  ('ai.configure',             'Configure AI Settings',      'Set API keys, model preferences, limits',         'ai', 20),
  ('ai.monitor',               'Monitor AI Requests',        'View live AI request logs and errors',            'ai', 30),

  -- Analytics
  ('analytics.platform',       'Platform Analytics',         'Full platform-wide analytics access',             'analytics', 10),
  ('analytics.company',        'Company Analytics',          'Company-scoped analytics access',                 'analytics', 20),
  ('analytics.export',         'Export Analytics',           'Download analytics data as CSV / Excel',          'analytics', 30),

  -- Jobs
  ('jobs.read',                'View All Jobs',              'Browse job listings across all companies',        'jobs', 10),
  ('jobs.create',              'Create Jobs',                'Post new job listings',                           'jobs', 20),
  ('jobs.update',              'Edit Jobs',                  'Modify job details and requirements',             'jobs', 30),
  ('jobs.delete',              'Delete Jobs',                'Remove job listings',                             'jobs', 40),
  ('jobs.manage',              'Manage Hiring Pipeline',     'Move applications through hiring stages',         'jobs', 50),

  -- Applications
  ('applications.read',        'View All Applications',      'Access all candidate applications platform-wide', 'applications', 10),
  ('applications.manage',      'Manage Applications',        'Update application status and move stages',       'applications', 20),

  -- Candidates
  ('candidates.read',          'View Candidates',            'Browse candidate profiles',                       'candidates', 10),
  ('candidates.manage',        'Manage Candidate Profiles',  'Edit candidate information and resume data',      'candidates', 20),
  ('candidates.export',        'Export Candidate Data',      'Download candidate data as CSV',                  'candidates', 30),

  -- Interviews
  ('interviews.read',          'View Interviews',            'See scheduled interview details',                 'interviews', 10),
  ('interviews.manage',        'Manage Interviews',          'Schedule, reschedule, and complete interviews',   'interviews', 20),

  -- Settings
  ('settings.general',         'General Settings',           'Modify general platform configuration',           'settings', 10),
  ('settings.email',           'Email Settings',             'Configure email templates and SMTP',              'settings', 20),
  ('settings.security',        'Security Settings',          'Manage security policies and MFA requirements',   'settings', 30),
  ('settings.storage',         'Storage Settings',           'Configure file storage limits and providers',     'settings', 40),
  ('settings.maintenance',     'Maintenance Mode',           'Enable or disable platform maintenance mode',     'settings', 50),

  -- Audit Logs
  ('audit_logs.read',          'View Audit Logs',            'Browse the platform audit trail',                 'audit_logs', 10),
  ('audit_logs.export',        'Export Audit Logs',          'Download audit log data',                         'audit_logs', 20),

  -- Feature Flags
  ('feature_flags.read',       'View Feature Flags',         'See feature flag configuration across plans',     'feature_flags', 10),
  ('feature_flags.manage',     'Manage Feature Flags',       'Enable, disable, and override feature flags',     'feature_flags', 20),

  -- Email Templates
  ('email_templates.read',     'View Email Templates',       'Browse email template definitions',               'email_templates', 10),
  ('email_templates.manage',   'Manage Email Templates',     'Create and edit email templates',                 'email_templates', 20),

  -- Notifications
  ('notifications.manage',     'Manage Notifications',       'Send and manage platform-wide notifications',     'notifications', 10),

  -- Queue
  ('queue.read',               'View Job Queue',             'Monitor background job queue status',             'queue', 10),
  ('queue.manage',             'Manage Job Queue',           'Retry, cancel, and manage queued jobs',           'queue', 20)

on conflict (slug) do nothing;

-- ============================================================
-- SEED: ROLES
-- ============================================================

insert into public.roles (name, display_name, description, is_system, color, icon, sort_order) values
  ('super_admin',        'Super Administrator',  'Unrestricted platform-level access. Cannot be deleted or deactivated.', true,  '#ef4444', 'ShieldAlert',     1),
  ('company_admin',      'Company Admin',        'Full access to own company data. Cannot cross tenant boundaries.',       true,  '#8b5cf6', 'Building2',       2),
  ('recruiter',          'Recruiter',            'Manages job postings, applications, and hiring pipelines.',              false, '#3b82f6', 'UserCog',         3),
  ('hr_manager',         'HR Manager',           'Manages HR processes, interviews, and team-level reporting.',            false, '#06b6d4', 'Users',           4),
  ('hiring_manager',     'Hiring Manager',       'Approves job requisitions and makes final hiring decisions.',            false, '#10b981', 'Briefcase',       5),
  ('interviewer',        'Interviewer',          'Conducts and scores candidate interviews.',                               false, '#f59e0b', 'MessageSquare',   6),
  ('department_manager', 'Department Manager',   'Manages department headcount and job requisitions.',                     false, '#6366f1', 'Network',         7),
  ('candidate',          'Candidate',            'Job seeker with access to their own profile and applications.',          true,  '#64748b', 'GraduationCap',   8)
on conflict (name) do nothing;

-- ============================================================
-- SEED: ROLE PERMISSIONS
-- ============================================================

-- Super Admin: every permission
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
cross join public.permissions p
where r.name = 'super_admin'
on conflict do nothing;

-- Company Admin: company-scoped permissions only
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from   public.roles r
join   public.permissions p on p.slug in (
  'jobs.read', 'jobs.create', 'jobs.update', 'jobs.delete', 'jobs.manage',
  'applications.read', 'applications.manage',
  'candidates.read', 'candidates.manage', 'candidates.export',
  'interviews.read', 'interviews.manage',
  'analytics.company', 'analytics.export',
  'users.read', 'users.create', 'users.update', 'users.suspend',
  'notifications.manage'
)
where  r.name = 'company_admin'
on conflict do nothing;

-- Recruiter
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from   public.roles r
join   public.permissions p on p.slug in (
  'jobs.read', 'jobs.create', 'jobs.update', 'jobs.manage',
  'applications.read', 'applications.manage',
  'candidates.read',
  'interviews.read', 'interviews.manage',
  'analytics.company'
)
where  r.name = 'recruiter'
on conflict do nothing;

-- HR Manager
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from   public.roles r
join   public.permissions p on p.slug in (
  'jobs.read', 'jobs.create', 'jobs.update', 'jobs.manage',
  'applications.read', 'applications.manage',
  'candidates.read', 'candidates.manage',
  'interviews.read', 'interviews.manage',
  'analytics.company', 'analytics.export',
  'users.read'
)
where  r.name = 'hr_manager'
on conflict do nothing;

-- Hiring Manager
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from   public.roles r
join   public.permissions p on p.slug in (
  'jobs.read', 'jobs.update', 'jobs.manage',
  'applications.read', 'applications.manage',
  'candidates.read',
  'interviews.read', 'interviews.manage',
  'analytics.company'
)
where  r.name = 'hiring_manager'
on conflict do nothing;

-- Interviewer
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from   public.roles r
join   public.permissions p on p.slug in (
  'interviews.read', 'interviews.manage',
  'applications.read',
  'candidates.read'
)
where  r.name = 'interviewer'
on conflict do nothing;

-- Department Manager
insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from   public.roles r
join   public.permissions p on p.slug in (
  'jobs.read', 'jobs.create',
  'applications.read',
  'candidates.read',
  'analytics.company'
)
where  r.name = 'department_manager'
on conflict do nothing;

-- ============================================================
-- BOOTSTRAP: ASSIGN RBAC ROLE TO EXISTING SUPER ADMIN USERS
-- Maps every user whose profiles.role = 'super_admin' into the
-- new user_roles table so they get all permissions immediately.
-- ============================================================

insert into public.user_roles (user_id, role_id)
select p.id, r.id
from   public.profiles p
cross  join public.roles r
where  p.role     = 'super_admin'
  and  r.name     = 'super_admin'
  and  p.deleted_at is null
on conflict do nothing;

commit;
