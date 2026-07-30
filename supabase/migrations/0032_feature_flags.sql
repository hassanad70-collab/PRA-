-- ============================================================================
-- Migration 0032: Feature Flags
-- Replaces plan-based conditional checks with a data-driven feature flag
-- system. Features can be enabled/disabled per plan (plan_features) and then
-- overridden per company (company_features). Checked via get_company_features()
-- RPC and cached in the application layer.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- feature_flags: master registry of every feature toggle
-- ---------------------------------------------------------------------------
create table public.feature_flags (
  key             text primary key,
  name            text not null,
  description     text,
  category        text not null default 'general',
  default_enabled boolean not null default false,
  created_at      timestamptz not null default now()
);

comment on table public.feature_flags is
  'Master registry of feature toggles. Edit this table to add / rename features; plan and company overrides live in separate tables.';

-- ---------------------------------------------------------------------------
-- plan_features: which features each subscription plan includes by default
-- numeric_limit: null means unlimited; a positive int means "up to N"
-- ---------------------------------------------------------------------------
create table public.plan_features (
  plan          text    not null
    check (plan in ('free','starter','professional','enterprise')),
  feature_key   text    not null references public.feature_flags(key) on delete cascade,
  enabled       boolean not null default true,
  numeric_limit int,
  primary key (plan, feature_key)
);

comment on table public.plan_features is
  'Default feature entitlements per subscription plan. company_features overrides these per company.';

-- ---------------------------------------------------------------------------
-- company_features: per-company feature overrides (super_admin only)
-- ---------------------------------------------------------------------------
create table public.company_features (
  company_id    uuid    not null references public.companies(id) on delete cascade,
  feature_key   text    not null references public.feature_flags(key) on delete cascade,
  enabled       boolean not null,
  numeric_limit int,
  overridden_by uuid    references public.profiles(id) on delete set null,
  override_note text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  primary key (company_id, feature_key)
);

create trigger company_features_set_updated_at
  before update on public.company_features
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: feature_flags and plan_features are public reads; company_features
-- is admin-only for writes, readable by company members.
-- ---------------------------------------------------------------------------
alter table public.feature_flags    enable row level security;
alter table public.plan_features    enable row level security;
alter table public.company_features enable row level security;

create policy "feature_flags_public_read" on public.feature_flags
  for select using (true);

create policy "plan_features_public_read" on public.plan_features
  for select using (true);

create policy "company_features_admin_all" on public.company_features
  for all using (public.is_admin()) with check (public.is_admin());

create policy "company_features_member_read" on public.company_features
  for select using (company_id = public.my_company_id() or public.is_admin());

-- ---------------------------------------------------------------------------
-- get_company_features(): returns the effective features for a company,
-- applying plan defaults then company overrides.
-- ---------------------------------------------------------------------------
create or replace function public.get_company_features(p_company_id uuid)
returns table (
  feature_key   text,
  enabled       boolean,
  numeric_limit int
)
language sql
stable
security definer
set search_path = public
as $$
  -- Plan defaults merged with per-company overrides.
  -- company_features rows win over plan_features when present.
  select
    ff.key as feature_key,
    coalesce(cf.enabled, pf.enabled, ff.default_enabled) as enabled,
    coalesce(cf.numeric_limit, pf.numeric_limit) as numeric_limit
  from public.feature_flags ff
  left join public.companies c on c.id = p_company_id
  left join public.plan_features pf on pf.plan = c.subscription_plan and pf.feature_key = ff.key
  left join public.company_features cf on cf.company_id = p_company_id and cf.feature_key = ff.key;
$$;

-- ---------------------------------------------------------------------------
-- Seed: feature flag definitions
-- ---------------------------------------------------------------------------
insert into public.feature_flags (key, name, description, category, default_enabled) values
  -- AI features
  ('ai_resume_parsing',    'AI Resume Parsing',       'Parse uploaded resumes with AI to extract structured data', 'ai',       false),
  ('ats_scoring',          'ATS Scoring',             'Automatically score candidates against job requirements',   'ai',       false),
  ('resume_health',        'Resume Health Checklist', 'AI-powered resume quality analysis',                        'ai',       false),
  ('interview_copilot',    'Interview Copilot',       'AI-generated interview questions and feedback',             'ai',       false),
  ('candidate_insights',   'Candidate Insights',      'AI-generated candidate profile insights',                   'ai',       false),
  ('job_description_ai',   'AI Job Descriptions',     'AI-assisted job description writing',                       'ai',       false),
  ('recruiter_copilot',    'Recruiter Copilot',       'AI chat assistant for recruiters',                          'ai',       false),
  -- Core platform
  ('talent_pool',          'Talent Pool',             'Save and manage candidate talent pools',                    'platform', true),
  ('job_matching',         'Job Matching',            'AI-powered job-candidate matching',                         'platform', false),
  ('analytics',            'Advanced Analytics',      'Detailed hiring analytics and reports',                     'platform', false),
  ('bulk_actions',         'Bulk Actions',            'Bulk move, archive, and assign candidates',                 'platform', false),
  ('interview_scheduling', 'Interview Scheduling',    'Schedule and manage interviews',                            'platform', true),
  ('csv_export',           'CSV / Excel Export',      'Export data to CSV or Excel',                               'platform', false),
  -- Collaboration
  ('team_members',         'Team Members',            'Invite and manage team members',                            'team',     true),
  ('role_management',      'Role Management',         'Custom roles and permissions',                              'team',     false),
  -- Integrations & enterprise
  ('api_access',           'API Access',              'Programmatic access via REST API',                          'enterprise', false),
  ('sso',                  'Single Sign-On (SSO)',    'SAML/OIDC single sign-on integration',                      'enterprise', false),
  ('white_label',          'White Label',             'Remove PRA branding',                                       'enterprise', false),
  ('custom_branding',      'Custom Branding',         'Company logo and color customization',                      'enterprise', false),
  ('email_automation',     'Email Automation',        'Automated email sequences and campaigns',                   'enterprise', false),
  ('audit_logs',           'Audit Logs',              'Full audit trail of all platform actions',                  'enterprise', false),
  ('webhooks',             'Webhooks',                'Receive real-time event webhooks',                          'enterprise', false),
  -- Numeric limits (enabled=true but numeric_limit set per plan)
  ('jobs_limit',           'Jobs Limit',              'Maximum active job postings',                               'limits',   true),
  ('team_members_limit',   'Team Members Limit',      'Maximum team members per company',                          'limits',   true),
  ('candidates_limit',     'Candidates Limit',        'Maximum candidates in talent pool',                         'limits',   true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: plan feature defaults
-- ---------------------------------------------------------------------------
insert into public.plan_features (plan, feature_key, enabled, numeric_limit) values
  -- FREE
  ('free', 'ai_resume_parsing',    false, null),
  ('free', 'ats_scoring',          false, null),
  ('free', 'resume_health',        false, null),
  ('free', 'interview_copilot',    false, null),
  ('free', 'candidate_insights',   false, null),
  ('free', 'job_description_ai',   false, null),
  ('free', 'recruiter_copilot',    false, null),
  ('free', 'talent_pool',          true,  null),
  ('free', 'job_matching',         false, null),
  ('free', 'analytics',            false, null),
  ('free', 'bulk_actions',         false, null),
  ('free', 'interview_scheduling', true,  null),
  ('free', 'csv_export',           false, null),
  ('free', 'team_members',         true,  null),
  ('free', 'role_management',      false, null),
  ('free', 'api_access',           false, null),
  ('free', 'sso',                  false, null),
  ('free', 'white_label',          false, null),
  ('free', 'custom_branding',      false, null),
  ('free', 'email_automation',     false, null),
  ('free', 'audit_logs',           false, null),
  ('free', 'webhooks',             false, null),
  ('free', 'jobs_limit',           true,  3),
  ('free', 'team_members_limit',   true,  2),
  ('free', 'candidates_limit',     true,  25),
  -- STARTER
  ('starter', 'ai_resume_parsing',    true,  null),
  ('starter', 'ats_scoring',          true,  null),
  ('starter', 'resume_health',        true,  null),
  ('starter', 'interview_copilot',    true,  null),
  ('starter', 'candidate_insights',   true,  null),
  ('starter', 'job_description_ai',   true,  null),
  ('starter', 'recruiter_copilot',    false, null),
  ('starter', 'talent_pool',          true,  null),
  ('starter', 'job_matching',         true,  null),
  ('starter', 'analytics',            false, null),
  ('starter', 'bulk_actions',         true,  null),
  ('starter', 'interview_scheduling', true,  null),
  ('starter', 'csv_export',           true,  null),
  ('starter', 'team_members',         true,  null),
  ('starter', 'role_management',      false, null),
  ('starter', 'api_access',           false, null),
  ('starter', 'sso',                  false, null),
  ('starter', 'white_label',          false, null),
  ('starter', 'custom_branding',      false, null),
  ('starter', 'email_automation',     false, null),
  ('starter', 'audit_logs',           false, null),
  ('starter', 'webhooks',             false, null),
  ('starter', 'jobs_limit',           true,  10),
  ('starter', 'team_members_limit',   true,  10),
  ('starter', 'candidates_limit',     true,  500),
  -- PROFESSIONAL
  ('professional', 'ai_resume_parsing',    true, null),
  ('professional', 'ats_scoring',          true, null),
  ('professional', 'resume_health',        true, null),
  ('professional', 'interview_copilot',    true, null),
  ('professional', 'candidate_insights',   true, null),
  ('professional', 'job_description_ai',   true, null),
  ('professional', 'recruiter_copilot',    true, null),
  ('professional', 'talent_pool',          true, null),
  ('professional', 'job_matching',         true, null),
  ('professional', 'analytics',            true, null),
  ('professional', 'bulk_actions',         true, null),
  ('professional', 'interview_scheduling', true, null),
  ('professional', 'csv_export',           true, null),
  ('professional', 'team_members',         true, null),
  ('professional', 'role_management',      true, null),
  ('professional', 'api_access',           false, null),
  ('professional', 'sso',                  false, null),
  ('professional', 'white_label',          false, null),
  ('professional', 'custom_branding',      true, null),
  ('professional', 'email_automation',     true, null),
  ('professional', 'audit_logs',           true, null),
  ('professional', 'webhooks',             false, null),
  ('professional', 'jobs_limit',           true, 50),
  ('professional', 'team_members_limit',   true, 25),
  ('professional', 'candidates_limit',     true, 5000),
  -- ENTERPRISE (everything unlimited)
  ('enterprise', 'ai_resume_parsing',    true, null),
  ('enterprise', 'ats_scoring',          true, null),
  ('enterprise', 'resume_health',        true, null),
  ('enterprise', 'interview_copilot',    true, null),
  ('enterprise', 'candidate_insights',   true, null),
  ('enterprise', 'job_description_ai',   true, null),
  ('enterprise', 'recruiter_copilot',    true, null),
  ('enterprise', 'talent_pool',          true, null),
  ('enterprise', 'job_matching',         true, null),
  ('enterprise', 'analytics',            true, null),
  ('enterprise', 'bulk_actions',         true, null),
  ('enterprise', 'interview_scheduling', true, null),
  ('enterprise', 'csv_export',           true, null),
  ('enterprise', 'team_members',         true, null),
  ('enterprise', 'role_management',      true, null),
  ('enterprise', 'api_access',           true, null),
  ('enterprise', 'sso',                  true, null),
  ('enterprise', 'white_label',          true, null),
  ('enterprise', 'custom_branding',      true, null),
  ('enterprise', 'email_automation',     true, null),
  ('enterprise', 'audit_logs',           true, null),
  ('enterprise', 'webhooks',             true, null),
  ('enterprise', 'jobs_limit',           false, null),
  ('enterprise', 'team_members_limit',   false, null),
  ('enterprise', 'candidates_limit',     false, null)
on conflict (plan, feature_key) do nothing;

commit;
