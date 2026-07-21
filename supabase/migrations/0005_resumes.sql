-- ============================================================================
-- Migration 0005: Resumes (with AI parsing + embeddings)
-- ============================================================================

create table public.resumes (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_path text not null,
  file_type text,
  file_size_bytes bigint,
  raw_text text,
  parsed_data jsonb,
  parse_status text not null default 'pending' check (parse_status in ('pending', 'processing', 'completed', 'failed')),
  parse_error text,
  -- text-embedding-3-small dimension
  embedding vector(1536),
  is_primary boolean not null default false,
  uploaded_at timestamptz not null default now(),
  parsed_at timestamptz
);

create index resumes_candidate_idx on public.resumes (candidate_id);
create index resumes_embedding_idx on public.resumes using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Now that resumes exists, wire the FK from candidates.primary_resume_id.
alter table public.candidates
  add constraint candidates_primary_resume_fk
  foreign key (primary_resume_id) references public.resumes(id) on delete set null;

-- Cover letters (also stored as resume-like uploads, separate for clarity)
create table public.cover_letters (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  file_name text,
  file_url text,
  file_path text,
  content text,
  created_at timestamptz not null default now()
);

-- Portfolio items
create table public.portfolio_items (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  title text not null,
  description text,
  file_url text,
  link_url text,
  created_at timestamptz not null default now()
);
