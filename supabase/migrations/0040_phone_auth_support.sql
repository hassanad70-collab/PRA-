-- ============================================================================
-- Migration 0040: Phone Auth Support
-- Allows Supabase phone OTP authentication alongside email/password and OAuth.
-- The handle_new_user trigger previously required email (NOT NULL) and derived
-- full_name from the email prefix — both assumptions break for phone-only users
-- who have no email address at all.
-- ============================================================================

begin;

-- 1. Make profiles.email nullable so phone-only users can have a profile row.
alter table public.profiles alter column email drop not null;

-- 2. Replace handle_new_user to handle three identity types:
--      a) Email/password users  — email set, phone null
--      b) OAuth users (Google)  — email set, phone null, full_name from metadata
--      c) Phone OTP users       — email null, phone set; use phone as name placeholder
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, avatar_url, phone)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'candidate'),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
      case when new.email is not null then split_part(new.email, '@', 1) else null end,
      new.phone,
      'User'
    ),
    new.email,        -- null for phone-only users; the column is now nullable
    new.raw_user_meta_data->>'avatar_url',
    new.phone         -- store phone directly from auth.users
  );
  return new;
end;
$$;

-- 3. Add an index on profiles.phone for fast phone-based lookups.
create index if not exists profiles_phone_idx on public.profiles (phone)
  where phone is not null;

commit;
