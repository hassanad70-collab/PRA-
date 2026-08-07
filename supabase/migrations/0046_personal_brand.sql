-- ============================================================================
-- Migration 0046: Personal Brand Tools (Unit F)
--   • Extends portfolio_items with type, technologies, thumbnail, order
--   • Extends candidates with portfolio_is_public + portfolio_slug
--   • Adds public-read RLS policy for portfolio_items when portfolio is public
--   • Creates ai_linkedin_suggestions table (LinkedIn Optimizer)
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extend portfolio_items with new fields
-- ---------------------------------------------------------------------------
alter table public.portfolio_items
  add column if not exists type text not null default 'project'
    check (type in ('project', 'publication', 'design', 'other')),
  add column if not exists technologies text[] not null default '{}',
  add column if not exists thumbnail_url text,
  add column if not exists display_order integer not null default 0;

-- ---------------------------------------------------------------------------
-- Extend candidates with portfolio visibility settings
-- ---------------------------------------------------------------------------
alter table public.candidates
  add column if not exists portfolio_is_public boolean not null default false,
  add column if not exists portfolio_slug text unique;

create index if not exists candidates_portfolio_slug_idx
  on public.candidates (portfolio_slug)
  where portfolio_slug is not null;

-- ---------------------------------------------------------------------------
-- Public read policy for portfolio_items (active only when portfolio is public)
-- RLS SELECT policies are OR'd, so this adds to the existing owner/staff policy.
-- ---------------------------------------------------------------------------
create policy "portfolio_items_public_read" on public.portfolio_items
  for select
  using (
    exists (
      select 1 from public.candidates c
      where c.id = portfolio_items.candidate_id
        and c.portfolio_is_public = true
    )
  );

-- ---------------------------------------------------------------------------
-- LinkedIn Optimizer suggestions
-- ---------------------------------------------------------------------------
create table public.ai_linkedin_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('about', 'headline', 'experience', 'skills_summary')),
  original_text text not null,
  target_role text,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.ai_linkedin_suggestions enable row level security;

create policy "linkedin_suggestions_owner" on public.ai_linkedin_suggestions
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_linkedin_suggestions_user_id
  on public.ai_linkedin_suggestions (user_id, created_at desc);
