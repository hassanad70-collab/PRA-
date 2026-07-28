-- ============================================================================
-- Migration 0020: Resume Suggestion Events (Unit C -- Resume Versioning & History)
-- ============================================================================
--
-- Durable, append-only log of every AI writing suggestion a candidate has
-- been shown, across both existing suggestion mechanisms -- the Resume
-- Builder's per-section suggestions (resume_draft_sections) and the Resume
-- Intelligence Hub's Rewrite & Optimize module (Unit B) -- one log, not two.
--
-- This table is audit data, not application state: once a row exists it is
-- never dropped or truncated as part of normal operation, and only
-- `outcome`/`decided_at` may change after creation (enforced below by
-- trigger, not just application discipline). If this feature is ever
-- retired, do that in application code (stop writing new rows / stop
-- reading them), not by dropping the table.
--
-- `source` and `suggestion_type` are deliberately plain `text`, not enums or
-- CHECK-constrained, since new Resume Intelligence modules (Units D/F/G and
-- beyond) will keep introducing new writing capabilities -- validated at the
-- application layer instead (see src/lib/resume-intelligence/suggestion-events.ts's
-- documented constants) so adding one never requires a migration. `outcome`
-- stays CHECK-constrained: a suggestion's lifecycle (pending/accepted/
-- rejected) is a closed, stable set independent of how many suggestion
-- types exist.

create table public.resume_suggestion_events (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  source text not null,
  draft_id uuid references public.resume_drafts(id) on delete cascade,
  section_id uuid references public.resume_draft_sections(id) on delete cascade,
  suggestion_type text not null,
  -- Not a strict FK: depending on suggestion_type this points at different
  -- tables (e.g. candidate_experience.id for a bullet-rewrite accept), or
  -- is null for suggestions that don't target an existing row (summary,
  -- net-new skill/achievement additions).
  target_id uuid,
  before_value jsonb,
  after_value jsonb not null,
  outcome text not null default 'pending' check (outcome in ('pending', 'accepted', 'rejected')),
  ai_model text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index resume_suggestion_events_candidate_idx on public.resume_suggestion_events (candidate_id);
create index resume_suggestion_events_draft_idx on public.resume_suggestion_events (draft_id);
create index resume_suggestion_events_outcome_idx on public.resume_suggestion_events (candidate_id, outcome);

-- Enforces immutability of every column except outcome/decided_at at the
-- database layer -- an audit log shouldn't rely on every future call site
-- remembering not to rewrite history.
create or replace function public.enforce_resume_suggestion_event_immutability()
returns trigger
language plpgsql
as $$
begin
  if new.before_value is distinct from old.before_value
    or new.after_value is distinct from old.after_value
    or new.suggestion_type is distinct from old.suggestion_type
    or new.source is distinct from old.source
    or new.target_id is distinct from old.target_id
    or new.ai_model is distinct from old.ai_model
  then
    raise exception 'resume_suggestion_events rows are immutable except outcome/decided_at';
  end if;
  return new;
end;
$$;

create trigger resume_suggestion_events_immutable
  before update on public.resume_suggestion_events
  for each row execute function public.enforce_resume_suggestion_event_immutability();

alter table public.resume_suggestion_events enable row level security;

create policy "resume_suggestion_events_owner_select" on public.resume_suggestion_events
  for select using (candidate_id = auth.uid() or public.is_admin());

create policy "resume_suggestion_events_owner_insert" on public.resume_suggestion_events
  for insert with check (candidate_id = auth.uid());

create policy "resume_suggestion_events_owner_update" on public.resume_suggestion_events
  for update using (candidate_id = auth.uid()) with check (candidate_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Lightweight version counter on resume_drafts (the approved blueprint's
-- "lightweight version concept" -- a counter, not full content snapshots or
-- point-in-time restore).
-- ---------------------------------------------------------------------------

alter table public.resume_drafts add column version int not null default 1;
