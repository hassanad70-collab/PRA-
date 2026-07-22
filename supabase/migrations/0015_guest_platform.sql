begin;

-- Generic guest-usage ledger, shared across all current and future
-- guest-accessible AI tools (not just the ATS checker). tool_key lets a
-- future tool reuse this same abuse-gating table without a new migration.
-- Stores only what's needed to enforce "one free scan per guest" — no
-- resume content, parsed data, or AI output is ever written here.
create table public.guest_tool_usage (
  id uuid primary key default uuid_generate_v4(),
  tool_key text not null default 'ats_checker',
  guest_session_id uuid not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);

create index guest_tool_usage_session_idx on public.guest_tool_usage (tool_key, guest_session_id);
create index guest_tool_usage_ip_created_idx on public.guest_tool_usage (tool_key, ip_hash, created_at);

alter table public.guest_tool_usage enable row level security;
-- No policies: written/read exclusively via the service-role client,
-- server-side only. Deny-by-default for anon/authenticated.

-- Lightweight, generic analytics events for both guest and authenticated
-- flows. event_name is an open string (not an enum) so future AI tools
-- reuse this table instead of getting one each.
create table public.analytics_events (
  id uuid primary key default uuid_generate_v4(),
  event_name text not null,
  guest_session_id uuid,
  user_id uuid references public.profiles(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index analytics_events_name_created_idx on public.analytics_events (event_name, created_at);
create index analytics_events_guest_idx on public.analytics_events (guest_session_id);

alter table public.analytics_events enable row level security;
-- No policies: service-role only, same reasoning as above.

commit;
