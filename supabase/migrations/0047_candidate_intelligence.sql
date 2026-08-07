-- ============================================================
-- Migration 0047: Candidate Intelligence Platform (v1.4)
-- AI Mock Interview Sessions
-- ============================================================

create table ai_mock_interview_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  interview_type   text not null check (interview_type in ('hr','technical','behavioral','star','case_study','company')),
  target_role      text not null,
  company_name     text,
  job_description  text,
  experience_level text,
  -- Full conversation history: [{role, content, evaluation?: {score,communication,technical,confidence,grammar,feedback}}]
  messages         jsonb not null default '[]',
  -- Dimension scores once session is complete
  scores           jsonb,   -- {overall,communication,confidence,technical,grammar,leadership}
  strengths        text[],
  weaknesses       text[],
  coaching_tips    text[],
  ai_summary       text,
  readiness_score  integer,
  question_count   integer not null default 0,
  status           text not null default 'active' check (status in ('active','completed')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table ai_mock_interview_sessions enable row level security;

create policy "mock_sessions_owner" on ai_mock_interview_sessions
  for all
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

create index idx_mock_sessions_user_time
  on ai_mock_interview_sessions (user_id, created_at desc);
