-- ============================================================================
-- Migration 0035: Email Automation System
-- Template-driven email queue. Sending is performed by a worker (background
-- job or cron). Templates are stored as HTML with {{variable}} placeholders.
-- All events (sent, opened, bounced, etc.) are tracked in email_events.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- email_templates: reusable HTML templates with named variable slots
-- ---------------------------------------------------------------------------
create table public.email_templates (
  key         text        primary key,
  name        text        not null,
  subject     text        not null,
  html_body   text        not null,
  text_body   text,
  variables   jsonb       not null default '[]'::jsonb,  -- list of variable names
  category    text        not null default 'transactional',
  is_active   boolean     not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger email_templates_set_updated_at
  before update on public.email_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email_queue: outbound email jobs waiting to be sent
-- ---------------------------------------------------------------------------
create table public.email_queue (
  id           uuid        primary key default gen_random_uuid(),
  template_key text        references public.email_templates(key) on delete set null,
  to_email     text        not null,
  to_name      text,
  from_email   text        not null default 'noreply@pra-talent.com',
  from_name    text        not null default 'PRA Talent Intelligence',
  subject      text        not null,
  html_body    text        not null,
  text_body    text,
  status       text        not null default 'pending'
    check (status in ('pending','sent','failed','cancelled')),
  attempts     int         not null default 0,
  max_attempts int         not null default 3,
  last_error   text,
  provider_id  text,       -- external message ID from the email provider
  metadata     jsonb       not null default '{}',
  scheduled_at timestamptz not null default now(),
  sent_at      timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index email_queue_status_idx      on public.email_queue (status, scheduled_at) where status = 'pending';
create index email_queue_to_email_idx    on public.email_queue (to_email);
create index email_queue_template_idx    on public.email_queue (template_key) where template_key is not null;

create trigger email_queue_set_updated_at
  before update on public.email_queue
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- email_events: delivery tracking (sent, opened, clicked, bounced, etc.)
-- ---------------------------------------------------------------------------
create table public.email_events (
  id          uuid        primary key default gen_random_uuid(),
  email_id    uuid        references public.email_queue(id) on delete cascade,
  event_type  text        not null,
  metadata    jsonb       not null default '{}',
  occurred_at timestamptz not null default now()
);

create index email_events_email_id_idx on public.email_events (email_id);
create index email_events_type_idx     on public.email_events (event_type);

-- ---------------------------------------------------------------------------
-- RLS: email system is admin-managed; regular users cannot see others' emails
-- ---------------------------------------------------------------------------
alter table public.email_templates enable row level security;
alter table public.email_queue     enable row level security;
alter table public.email_events    enable row level security;

create policy "email_templates_admin_all" on public.email_templates
  for all using (public.is_admin()) with check (public.is_admin());

create policy "email_templates_public_read" on public.email_templates
  for select using (is_active);

create policy "email_queue_admin_all" on public.email_queue
  for all using (public.is_admin()) with check (public.is_admin());

create policy "email_events_admin_all" on public.email_events
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Seed: essential transactional email templates
-- ---------------------------------------------------------------------------
insert into public.email_templates (key, name, subject, html_body, text_body, variables, category) values
  (
    'candidate_application_received',
    'Application Received',
    'Your application has been received — {{company_name}}',
    '<h2>Application Received</h2><p>Hi {{candidate_name}},</p><p>We received your application for <strong>{{job_title}}</strong> at <strong>{{company_name}}</strong>. We''ll review it and be in touch soon.</p><p>Best regards,<br/>{{company_name}}</p>',
    'Hi {{candidate_name}}, your application for {{job_title}} at {{company_name}} has been received.',
    '["candidate_name","job_title","company_name"]'::jsonb,
    'transactional'
  ),
  (
    'interview_scheduled',
    'Interview Scheduled',
    'Interview scheduled — {{job_title}}',
    '<h2>Interview Scheduled</h2><p>Hi {{candidate_name}},</p><p>Your interview for <strong>{{job_title}}</strong> has been scheduled for <strong>{{interview_date}}</strong>.</p><p>Details: {{interview_details}}</p>',
    'Hi {{candidate_name}}, your interview for {{job_title}} is scheduled for {{interview_date}}.',
    '["candidate_name","job_title","interview_date","interview_details"]'::jsonb,
    'transactional'
  ),
  (
    'offer_extended',
    'Offer Extended',
    'You have received an offer — {{company_name}}',
    '<h2>Congratulations!</h2><p>Hi {{candidate_name}},</p><p>We are pleased to extend an offer for the role of <strong>{{job_title}}</strong> at <strong>{{company_name}}</strong>.</p><p>{{offer_details}}</p>',
    'Hi {{candidate_name}}, you have received an offer for {{job_title}} at {{company_name}}.',
    '["candidate_name","job_title","company_name","offer_details"]'::jsonb,
    'transactional'
  ),
  (
    'account_created',
    'Welcome to PRA',
    'Welcome to PRA Talent Intelligence',
    '<h2>Welcome!</h2><p>Hi {{full_name}},</p><p>Your account on PRA Talent Intelligence has been created. <a href="{{login_url}}">Sign in now</a> to get started.</p>',
    'Hi {{full_name}}, welcome to PRA Talent Intelligence. Sign in at {{login_url}}.',
    '["full_name","login_url"]'::jsonb,
    'transactional'
  ),
  (
    'payment_failed',
    'Payment Failed',
    'Action required: payment failed',
    '<h2>Payment Failed</h2><p>Hi {{company_admin_name}},</p><p>The payment for your <strong>{{plan}}</strong> subscription could not be processed. Please update your billing information to avoid service interruption.</p>',
    'Hi {{company_admin_name}}, the payment for your {{plan}} subscription failed. Please update billing details.',
    '["company_admin_name","plan"]'::jsonb,
    'billing'
  ),
  (
    'subscription_cancelled',
    'Subscription Cancelled',
    'Your subscription has been cancelled',
    '<h2>Subscription Cancelled</h2><p>Hi {{company_admin_name}},</p><p>Your <strong>{{plan}}</strong> subscription has been cancelled. You will retain access until <strong>{{access_until}}</strong>.</p>',
    'Hi {{company_admin_name}}, your {{plan}} subscription has been cancelled. Access until {{access_until}}.',
    '["company_admin_name","plan","access_until"]'::jsonb,
    'billing'
  )
on conflict (key) do nothing;

commit;
