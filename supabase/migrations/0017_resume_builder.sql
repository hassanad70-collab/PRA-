-- AI Resume Builder (v1.1.6)
--
-- A resume draft is a candidate-owned working copy assembled from their
-- platform profile (priority 1), optionally merged with an uploaded
-- resume's parsed data (priority 2, never auto-applied -- see
-- applyImportedFields in src/actions/resume-builder.ts), or built up
-- manually (priority 3). Each section is its own row so the candidate can
-- regenerate/accept/reject/edit one section (Summary, Experience, Skills,
-- etc.) independently of the others, per the approved editing workflow.

create type resume_draft_status as enum ('draft', 'finalized');

create type resume_section_type as enum (
  'personal_info',
  'summary',
  'experience',
  'education',
  'skills',
  'certifications',
  'languages',
  'projects',
  'achievements',
  'social_links'
);

-- 'ai_suggested' means the AI wrote `content` and the candidate hasn't
-- reviewed it yet; sections seeded from the profile or entered by hand go
-- straight to 'accepted'. Factual sections (education, certifications,
-- languages, projects, achievements, personal_info, social_links) never
-- pass through 'ai_suggested' at all -- the AI only rewrites prose
-- (summary, experience, skills), per the explicit "never invent
-- employment history/education" rule.
create type resume_section_status as enum ('empty', 'ai_suggested', 'accepted', 'edited');

create table public.resume_drafts (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid not null references public.candidates(id) on delete cascade,
  title text not null default 'My Resume',
  status resume_draft_status not null default 'draft',
  source_resume_id uuid references public.resumes(id) on delete set null,
  finalized_pdf_url text,
  finalized_docx_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index resume_drafts_candidate_idx on public.resume_drafts (candidate_id);

create table public.resume_draft_sections (
  id uuid primary key default uuid_generate_v4(),
  draft_id uuid not null references public.resume_drafts(id) on delete cascade,
  section_type resume_section_type not null,
  -- Shape depends on section_type: summary is {text}, experience/education/
  -- certifications/languages/projects/achievements are arrays of entries
  -- (the same field shapes already used by candidate_experience etc. and
  -- ParsedResumeData), skills is {items: string[]}, personal_info is
  -- {full_name, email, phone, address, current_position}, social_links is
  -- {linkedin_url, github_url, portfolio_url, website_url}.
  content jsonb not null default '{}'::jsonb,
  ai_suggestion jsonb,
  status resume_section_status not null default 'empty',
  order_index int not null default 0,
  updated_at timestamptz not null default now(),
  unique (draft_id, section_type)
);

create index resume_draft_sections_draft_idx on public.resume_draft_sections (draft_id);

alter table public.resume_drafts enable row level security;
alter table public.resume_draft_sections enable row level security;

create policy "resume_drafts_owner" on public.resume_drafts
  for all using (candidate_id = auth.uid() or public.is_staff())
  with check (candidate_id = auth.uid());

create policy "resume_draft_sections_owner" on public.resume_draft_sections
  for all using (
    draft_id in (select id from public.resume_drafts where candidate_id = auth.uid())
    or public.is_staff()
  )
  with check (
    draft_id in (select id from public.resume_drafts where candidate_id = auth.uid())
  );
