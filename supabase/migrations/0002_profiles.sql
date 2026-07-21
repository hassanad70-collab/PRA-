-- ============================================================================
-- Migration 0002: Profiles (extends auth.users)
-- ============================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'candidate',
  full_name text not null,
  email text not null,
  avatar_url text,
  phone text,
  is_active boolean not null default true,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Base identity + role for every authenticated user (candidate, recruiter, hr_manager, super_admin).';

create index profiles_role_idx on public.profiles (role);
create index profiles_email_idx on public.profiles (email);

-- Automatically create a profile row whenever a new auth user is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, full_name, email, avatar_url)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'candidate'),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh on every update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
