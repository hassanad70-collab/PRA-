-- migration 0045: ai_salary_estimates table for Salary Insights (Unit E, Phase 3)
create table if not exists ai_salary_estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  target_role text not null,
  location text,
  years_experience integer,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table ai_salary_estimates enable row level security;

create policy "users manage own salary estimates"
  on ai_salary_estimates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index if not exists idx_salary_estimates_user_id on ai_salary_estimates(user_id, created_at desc);
