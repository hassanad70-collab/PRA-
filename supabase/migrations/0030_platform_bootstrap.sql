-- ============================================================================
-- Migration 0030: Platform Bootstrap
--
-- Idempotent one-time setup:
--   1. Creates the "PRA Consultancy" company (Enterprise plan, Active).
--   2. Promotes Hassan.ad70@gmail.com to super_admin and associates that
--      profile with PRA Consultancy via profiles.company_id.
--
-- IMPORTANT: The email lookup here is strictly a one-time bootstrap
-- convenience. After this migration runs, all authorization decisions use the
-- immutable User UUID returned by auth.uid() -- never email addresses.
-- ============================================================================

do $$
declare
  v_company_id uuid;
  v_user_id    uuid;
begin

  -- -------------------------------------------------------------------------
  -- 1. Create PRA Consultancy (idempotent -- safe to run multiple times)
  -- -------------------------------------------------------------------------
  insert into public.companies (
    name,
    slug,
    subscription_plan,
    subscription_status,
    is_active,
    is_verified,
    country,
    timezone
  )
  values (
    'PRA Consultancy',
    'pra-consultancy',
    'enterprise',
    'active',
    true,
    true,
    'United Kingdom',
    'Europe/London'
  )
  on conflict (slug) do update
    set subscription_plan   = excluded.subscription_plan,
        subscription_status = excluded.subscription_status,
        is_verified         = excluded.is_verified;

  -- Fetch the id regardless of whether the row was inserted or updated
  select id into v_company_id
  from public.companies
  where slug = 'pra-consultancy';

  -- -------------------------------------------------------------------------
  -- 2. Promote Hassan.ad70@gmail.com to super_admin
  --    Email lookup is used here ONLY; UUID governs all subsequent auth.
  -- -------------------------------------------------------------------------
  select au.id into v_user_id
  from auth.users au
  where lower(au.email) = 'hassan.ad70@gmail.com'
  limit 1;

  if v_user_id is not null then
    update public.profiles
    set role       = 'super_admin',
        company_id = v_company_id
    where id = v_user_id;
  end if;

end;
$$;
