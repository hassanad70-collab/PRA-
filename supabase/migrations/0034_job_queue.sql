-- ============================================================================
-- Migration 0034: Background Job Queue
-- Database-backed queue for async processing on Vercel (serverless). Workers
-- are Vercel cron jobs that poll this table via /api/cron/process-queue.
-- claim_next_job() atomically marks the oldest pending job as 'running' so
-- concurrent invocations don't double-process.
-- ============================================================================

begin;

create table public.job_queue (
  id           uuid        primary key default gen_random_uuid(),
  type         text        not null,   -- 'resume_parse', 'ats_score', 'email_send', etc.
  payload      jsonb       not null default '{}',
  status       text        not null default 'pending'
    check (status in ('pending','running','completed','failed','cancelled')),
  priority     int         not null default 0,  -- higher = processed sooner
  attempts     int         not null default 0,
  max_attempts int         not null default 3,
  last_error   text,
  context      jsonb       not null default '{}',  -- correlation ids, trace context
  scheduled_at timestamptz not null default now(),
  started_at   timestamptz,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Partial index for the hot path: only pending jobs that are due now
create index job_queue_pending_idx on public.job_queue (priority desc, scheduled_at asc)
  where status = 'pending';

create index job_queue_type_idx   on public.job_queue (type);
create index job_queue_status_idx on public.job_queue (status);

create trigger job_queue_set_updated_at
  before update on public.job_queue
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- claim_next_job(p_types): atomically claim the next pending job.
-- Uses FOR UPDATE SKIP LOCKED so concurrent workers don't race.
-- Returns the claimed row or nothing if the queue is empty.
-- ---------------------------------------------------------------------------
create or replace function public.claim_next_job(p_types text[] default null)
returns public.job_queue
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.job_queue;
begin
  select *
  into v_job
  from public.job_queue
  where status = 'pending'
    and scheduled_at <= now()
    and attempts < max_attempts
    and (p_types is null or type = any(p_types))
  order by priority desc, scheduled_at asc
  limit 1
  for update skip locked;

  if not found then
    return null;
  end if;

  update public.job_queue
  set status     = 'running',
      started_at = now(),
      attempts   = attempts + 1
  where id = v_job.id;

  return v_job;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: queue is platform-internal; only service role / admin can touch it
-- ---------------------------------------------------------------------------
alter table public.job_queue enable row level security;

create policy "job_queue_admin_all" on public.job_queue
  for all using (public.is_admin()) with check (public.is_admin());

commit;
