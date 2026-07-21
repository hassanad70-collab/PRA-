# PRA Talent Intelligence Platform

Enterprise AI Recruitment & Talent Intelligence System — Phase 1 (Foundation + core end-to-end flow).

## What's included in this phase

- **Architecture**: Next.js 15 (App Router) + React 19 + TypeScript + Tailwind + shadcn/ui, Server Actions for all mutations, no client-side data fetching libraries needed.
- **Auth**: Supabase Auth with email/password, Google, and LinkedIn OIDC, role-based routing middleware (candidate / recruiter / hr_manager / super_admin).
- **Database**: Full Postgres schema in `supabase/migrations/` — 25+ tables, pgvector embeddings, Row Level Security on every table, RPC functions for matching and dashboard stats.
- **Landing page**: Hero, trusted companies, features, how it works, AI recruitment showcase, testimonials, FAQ, dark mode.
- **Candidate portal**: Registration, profile (experience/education/skills/languages/projects/certificates), resume upload, applications, job browsing.
- **AI Resume Parser**: Uploads are parsed with GPT-4o-mini into structured data and auto-populate the candidate profile.
- **AI ATS Scoring**: Overall/experience/skills/formatting/education/achievement scores, keyword density, weaknesses, and suggestions.
- **AI Job Matching**: Resume and job embeddings (`text-embedding-3-small`) + pgvector cosine similarity shortlist, refined with an LLM analysis pass (match score, strengths, weaknesses, missing skills, interview probability).
- **AI Resume Improvement**: "Improve My Resume" rewrites the summary/bullets, suggests ATS keywords and missing skills, and generates achievement statement ideas.
- **Job management**: Create/edit/publish/close/archive/duplicate jobs.
- **Application flow**: Apply, withdraw, automatic AI screening on submission (experience/skills/education/culture fit/leadership/communication/technical scores + interview recommendation), automatic candidate ranking per job.
- **Recruiter dashboard**: HR analytics (KPIs, hiring funnel, application trend, top skills) powered by a Postgres RPC + Recharts.
- **Talent pool** and **settings** scaffolding.

Everything reads and writes real Supabase tables — there is no mock/sample data anywhere in the app.

## Getting started

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then in the SQL Editor run every file in `supabase/migrations/` **in order** (0001 through 0011). These create the schema, RLS policies, storage buckets, and RPC functions.

### 2. Configure Auth providers

In Supabase Dashboard → Authentication → Providers:
- Enable **Google** and add your OAuth client ID/secret.
- Enable **LinkedIn (OIDC)** and add your client ID/secret.
- Set the redirect URL to `{NEXT_PUBLIC_SITE_URL}/auth/callback` for both.

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The service role key is required — the AI pipelines (resume parsing, ATS scoring, job matching, screening) write across Row Level Security boundaries using `src/lib/supabase/admin.ts`. Never expose it to the client.

### 4. Install and run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`.

### 5. Try the end-to-end flow

1. Register as a **recruiter** (creates your company) and post + publish a job.
2. Register as a **candidate**, upload a resume on `/candidate/resume`. Watch the AI parse it, populate your profile, and generate an ATS score (takes ~20-40s).
3. Visit `/candidate/jobs` — the job you published should appear with an AI match score.
4. Apply to the job. AI screening runs automatically.
5. Back in the recruiter account, open the job's **Candidates** tab — the application is ranked with AI scores, strengths/weaknesses, and an interview recommendation.

## Project structure

```
src/
  app/                    Routes (App Router), grouped by (auth) / candidate / recruiter
  actions/                Server Actions — all mutations live here
  lib/
    ai/                   OpenAI wrappers: resume parsing, ATS scoring, job matching, screening, embeddings
    supabase/             Browser / server / admin / middleware Supabase clients
    queries/               Server-side data fetchers (reads)
    validations/          Zod schemas
  components/
    ui/                   shadcn/ui primitives
    marketing/             Landing page sections
    candidate/ recruiter/  Feature components
    shared/                Cross-cutting (dashboard shell, theme, score ring)
  types/database.ts       Hand-authored types mirroring the SQL schema
supabase/migrations/      Numbered SQL migrations — run in order
```

## Deployment

Deploy to [Vercel](https://vercel.com): import the repo, add the same environment variables from `.env.local`, and deploy. Supabase Auth redirect URLs and `NEXT_PUBLIC_SITE_URL` should point at your production domain.

## What's next (Phase 2+)

Per the full platform spec, still to build: candidate comparison, interview scheduling + STAR evaluation, AI interview question generator, email automation, natural-language AI search, admin panel, personality analysis, predictive success score, job description generator, duplicate/fraud detection, salary recommendation, career path recommendation, skills gap analysis, video/voice interview analysis, recruitment copilot, workforce planning, and the executive dashboard.
