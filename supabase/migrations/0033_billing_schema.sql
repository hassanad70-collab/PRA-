-- ============================================================================
-- Migration 0033: Billing & Subscription Schema
-- Stripe-ready billing infrastructure. The companies.subscription_plan and
-- subscription_status columns (migration 0029) remain the denormalized truth
-- for fast plan checks. This migration adds the full billing record layer:
-- subscriptions (Stripe metadata), invoices, and billing events.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- subscriptions: one row per company, holds Stripe integration metadata
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                      uuid        primary key default gen_random_uuid(),
  company_id              uuid        not null unique references public.companies(id) on delete cascade,
  stripe_customer_id      text,
  stripe_subscription_id  text        unique,
  plan                    text        not null default 'free'
    check (plan in ('free','starter','professional','enterprise')),
  status                  text        not null default 'active'
    check (status in ('active','trialing','past_due','cancelled','suspended','incomplete','incomplete_expired')),
  trial_ends_at           timestamptz,
  current_period_start    timestamptz,
  current_period_end      timestamptz,
  cancel_at_period_end    boolean     not null default false,
  billing_email           text,
  billing_name            text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index subscriptions_stripe_customer_idx      on public.subscriptions (stripe_customer_id) where stripe_customer_id is not null;
create index subscriptions_stripe_subscription_idx  on public.subscriptions (stripe_subscription_id) where stripe_subscription_id is not null;
create index subscriptions_status_idx               on public.subscriptions (status);
create index subscriptions_plan_idx                 on public.subscriptions (plan);

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- invoices: billing invoice records (synced from Stripe webhooks)
-- ---------------------------------------------------------------------------
create table public.invoices (
  id                uuid        primary key default gen_random_uuid(),
  company_id        uuid        not null references public.companies(id) on delete cascade,
  stripe_invoice_id text        unique,
  amount_due        int         not null default 0,   -- in cents
  amount_paid       int         not null default 0,   -- in cents
  currency          text        not null default 'usd',
  status            text        not null default 'draft'
    check (status in ('draft','open','paid','uncollectible','void')),
  description       text,
  invoice_url       text,
  due_date          timestamptz,
  paid_at           timestamptz,
  period_start      timestamptz,
  period_end        timestamptz,
  created_at        timestamptz not null default now()
);

create index invoices_company_id_idx       on public.invoices (company_id);
create index invoices_stripe_invoice_idx   on public.invoices (stripe_invoice_id) where stripe_invoice_id is not null;
create index invoices_status_idx           on public.invoices (status);

-- ---------------------------------------------------------------------------
-- billing_events: immutable log of all Stripe webhook events
-- ---------------------------------------------------------------------------
create table public.billing_events (
  id               uuid        primary key default gen_random_uuid(),
  company_id       uuid        references public.companies(id) on delete set null,
  event_type       text        not null,
  stripe_event_id  text        unique,
  payload          jsonb       not null default '{}',
  processed        boolean     not null default false,
  error            text,
  processed_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index billing_events_company_idx     on public.billing_events (company_id) where company_id is not null;
create index billing_events_type_idx        on public.billing_events (event_type);
create index billing_events_processed_idx   on public.billing_events (processed) where not processed;

-- ---------------------------------------------------------------------------
-- RLS: billing is super_admin only; company admins cannot see raw Stripe data
-- ---------------------------------------------------------------------------
alter table public.subscriptions   enable row level security;
alter table public.invoices        enable row level security;
alter table public.billing_events  enable row level security;

create policy "subscriptions_admin_all" on public.subscriptions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "subscriptions_company_read" on public.subscriptions
  for select using (company_id = public.my_company_id());

create policy "invoices_admin_all" on public.invoices
  for all using (public.is_admin()) with check (public.is_admin());

create policy "invoices_company_read" on public.invoices
  for select using (company_id = public.my_company_id());

create policy "billing_events_admin_all" on public.billing_events
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Billing analytics RPC (super_admin only -- called with service role in actions)
-- ---------------------------------------------------------------------------
create or replace function public.get_billing_overview()
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result json;
begin
  select json_build_object(
    'total_companies',      (select count(*) from public.companies where deleted_at is null),
    'active_subscriptions', (select count(*) from public.subscriptions where status = 'active'),
    'trialing',             (select count(*) from public.subscriptions where status = 'trialing'),
    'past_due',             (select count(*) from public.subscriptions where status = 'past_due'),
    'cancelled',            (select count(*) from public.subscriptions where status = 'cancelled'),
    'plan_breakdown', (
      select json_object_agg(plan, cnt) from (
        select subscription_plan as plan, count(*) as cnt
        from public.companies
        where deleted_at is null
        group by subscription_plan
      ) t
    ),
    'mrr_cents', (
      select coalesce(sum(
        case plan
          when 'starter'      then 4900
          when 'professional' then 14900
          when 'enterprise'   then 49900
          else 0
        end
      ), 0)
      from public.subscriptions
      where status = 'active'
    ),
    'total_invoiced_cents', (select coalesce(sum(amount_paid), 0) from public.invoices where status = 'paid'),
    'outstanding_cents',    (select coalesce(sum(amount_due - amount_paid), 0) from public.invoices where status = 'open')
  ) into v_result;

  return v_result;
end;
$$;

commit;
