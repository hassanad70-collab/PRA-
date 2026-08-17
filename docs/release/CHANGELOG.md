# Changelog

All notable changes to the PRA Talent Intelligence Platform.

Format: `[commit_sha] Description` — newest first within each version section.  
Full git history: `git log --oneline --no-merges`

---

## [v1.9] — 2026-08-17 — Resume Upload Architecture

`[1d56b08]` v1.9 Resume Upload Architecture: FK guarantee, UUID filenames, fresh signed URLs, drag-and-drop UX  
`[0e6ec49]` fix(auth): session consistency — authenticated users no longer see sign-in prompts

### Issues Resolved (6)

1. **FK violation on upload** — `resumes` insert sometimes failed with `insert or update on table "resumes" violates foreign key constraint "resumes_candidate_id_fkey"`. Root cause: `candidates` row was not guaranteed to exist before the insert. Fix: admin upsert of `candidates` row before every resume insert (`onConflict: "id", ignoreDuplicates: true`).
2. **Filename restrictions** — Filenames with spaces, Arabic, Unicode, duplicates, or uppercase characters were rejected. Fix: UUID-based storage filename (`{uuid}_{timestamp}.{ext}`) completely decoupled from the original filename. Original filename stored in `file_name` (display only); no filename validation ever performed.
3. **Stale/broken View links** — `file_url` was a 7-day Supabase signed URL that expired silently. The `resumes` bucket is private so `getPublicUrl()` always returns HTTP 403. Fix: `createSignedUrl(file_path, 3600)` called at render time on both the My Resumes page and the Documents page; `file_url` column made nullable (migration 0050).
4. **Auth inconsistency** — Authenticated users occasionally saw sign-in prompts due to mixed `getSession`/`getUser` patterns. Fix: all server actions use only `supabase.auth.getUser()`.
5. **Upload UX** — No progress indicator, no drag-and-drop, no error recovery. Fix: staged 6-phase progress bar with animation, drag-and-drop zone, MIME + extension + size validation only.
6. **Missing test coverage** — 28 new Playwright tests across all 6 issues.

### Database Changes

- Migration `0050_resume_upload_v2.sql` — `ALTER TABLE resumes ALTER COLUMN file_url DROP NOT NULL`

### Test Suite

127 passed, 2 skipped, 0 failed (129 total)

### Files Changed

- `src/actions/resume.ts` — complete rewrite
- `src/components/candidate/resume-upload.tsx` — complete rewrite  
- `src/app/[locale]/candidate/workspace/documents/page.tsx` — null file_path guard + hide View when no file_path
- `src/types/database.ts` — `Resume.file_url: string | null`
- `e2e/resume-upload-v2.spec.ts` — new (28 tests)
- `e2e/resume-upload.spec.ts` — `.first()` strict-mode fix
- `e2e/ai-workflow.spec.ts` — `.first()` strict-mode fix in helper

---

## [Hotfix] — 2026-08-09 — My Resumes Upload & View

`[1fb5646]` fix: My Resumes page upload and view workflow fully restored

### Bug Fixed
Three independent failures caused the My Resumes page to be completely non-functional after the Candidate Nav Redesign:

1. **Circular redirect on Upload** — Upload CTAs linked to `/candidate/resume` (a redirect stub), causing a loop that looked like a page reload. Fixed by embedding `ResumeUpload` inline on `workspace/resumes/page.tsx`.
2. **Expired signed URL on View** — The page used the stored `file_url` (7-day TTL Supabase signed URL). Resumes older than 7 days returned HTTP 403 silently. Fixed by calling `createSignedUrl(file_path, 3600)` in the Server Component at every render.
3. **Wrong revalidation path** — Three `revalidateCandidatePath("/candidate/resume")` calls targeted the redirect stub. Fixed to `/candidate/workspace/resumes`.

### Regression Tests Added
- `My Resumes page shows upload component and not a broken redirect button`
- `candidate can upload a PDF from My Resumes page and it appears in the list`
- `View button on My Resumes page points to a real signed URL, not a blank/null href`

See [BUGFIX-RESUME-UPLOAD.md](BUGFIX-RESUME-UPLOAD.md) for full root cause analysis and production evidence.

---

## [v2.0.0] — 2026-08-09 — Stabilization Sprint

**No new user-facing features.** v2.0 designates the current state as a stable, documented release.

### Documentation Added
- Full `docs/` directory: System Architecture, C4 diagrams (Context/Container/Component), Database ERD, Data Dictionary (55 tables), API Reference, OpenAPI spec, Deployment Guide, Environment Variables, Security, User Guide, Contributing, CHANGELOG, ROADMAP, Release Notes, Repository Cleanup Report, 7 ADRs

---

## [v1.8] — 2026-08-09 — View As Switcher

`[384687b]` v1.8 View As Switcher: Super Admin can preview any role's UI

### Changes
- Super Admin gets an amber "View as…" dropdown in all portal topbars
- Cookie `pra-view-as` (7-day, non-HttpOnly) stores the active view
- Middleware allows super_admin through candidate/recruiter route guards when cookie is set
- `window.location.href` used for cross-tree navigation (admin ↔ candidate/recruiter layout trees)
- Recruiter dashboard: `hasCompany` guard prevents UUID errors when super_admin has no recruiter profile
- Employer option present in dropdown but disabled ("soon" label)

---

## [Candidate Nav Redesign] — 2026-08-09

`[7838c10]` Candidate Nav Redesign v2: modern workspace nav + test suite hardening (101/101 pass)  
`[0b53d44]` Candidate Nav Redesign: collapsible groups, AI tags, legacy redirects, quick actions

### Changes
- Collapsible nav groups: "AI Career Workspace", "Jobs & Applications", "Career", "Account"
- AI tags on 8 AI-powered tools in the sidebar
- Pending-offers badge on "Offers" nav item
- 8-item quick actions menu for common tasks
- 3 legacy route redirects for old nav paths
- 101 Playwright tests hardened and passing

---

## [v1.7] — 2026-08-08 — Notifications & Engagement

`[06218c8]` v1.7 Notifications & Engagement: email alerts, unread badges, activity feed

### Changes
- Email notifications dispatched fire-and-forget via `dispatch.ts`
- Unread badges on nav items (`NavItem.badge` pattern)
- Activity feed on recruiter dashboard (last 24h: applications, messages, offer responses)
- Job alert emails via cron worker
- Notification foundation: `notifications` table (migration 0037), RPC, fire-and-forget pattern

---

## [v1.6] — 2026-08-08 — Hiring Completion Platform

`[056f049]` v1.6 Hiring Completion Platform: Messaging + Offer Management

### Changes
- **Messaging Hub** — split-panel recruiter↔candidate inbox with AI message drafting
- **Offer Management** — offer creation, AI letter generation, accept/decline tracking
- Migration 0049 (messaging and offers tables)
- Closes end-to-end hiring loop: find → evaluate → interview → offer → accept

---

## [v1.5] — 2026-08-08 — Employer Intelligence Platform

`[89985db]` v1.5 Employer Intelligence Platform: 16-module recruiter workspace

### Changes
- **Pipeline Kanban** — drag-and-drop hiring pipeline with list toggle
- **Candidate Search** — semantic search with filters
- **Saved Candidates** — talent pool management
- **Company Profile** — public company presence management
- **Hiring Team** — team member management within company
- **Resume Intelligence** — AI parsing and enrichment for candidate profiles
- **AI Job Description Generator** — structured JD creation
- **AI Candidate Matching** — semantic job-to-candidate ranking
- **Talent Pool** — cross-job candidate discovery
- **AI Assistant (Copilot)** — multi-intent natural language recruiter assistant
- Migration 0048 (recruiter workspace tables)

---

## [v1.4] — 2026-08-07 — Candidate Intelligence Platform

`[e5f0d25]` v1.4 Candidate Intelligence Platform: Application Intelligence + Interview Intelligence

### Changes
- **Application Intelligence** — recharts funnel dashboard, win probability scoring, AI application insights
- **Interview Intelligence** — streaming mock interview (6 types), per-answer scoring, final assessment report
- Migration 0047

---

## [Phase 4 — Personal Brand Tools] — 2026-08-07

`[6bcef76]` Phase 4: Personal Brand Tools — Portfolio, LinkedIn Optimizer, Recruiter Sim

### Changes
- **Portfolio Generator** — public portfolio pages with AI content assistance
- **LinkedIn Optimizer** — AI headline, summary, skills optimization
- **Recruiter Simulator** — personal brand analysis from a recruiter's perspective
- Migration 0046 (portfolio fields on candidates table)
- v1.3 roadmap fully shipped

---

## [Phase 3 — Career Intelligence Hub] — 2026-08-07

`[f5f44ff]` Phase 3: Career Intelligence Hub — Skills Gap, Salary Insights, Resume Heatmap

### Changes
- **Skills Gap Analyzer** — competency gap analysis for target roles
- **Salary Insights** — AI-estimated compensation ranges by role and market (migration 0045)
- **Resume Heatmap** — visual section strength analysis
- Sidebar `h-screen` overflow fix

---

## [Phase 2 — Resume Studio Enterprise] — 2026-08-07

`[54fbcd2]` Phase 2: Resume Studio Enterprise editor

### Changes
- 3-panel enterprise editor (sections / editor / preview)
- AI rewrite per section
- ATS optimization with job description input
- Full-screen mode
- Drag-and-drop section ordering

---

## [Pre-Phase 2 Improvements] — 2026-08-07

`[4cd7864]` Pre-Phase 2 improvements: Global AI, Command Palette, Dashboard enrichment, Studio full-screen

### Changes
- Global AI Workspace accessible from all candidate pages
- Command Palette (⌘K) global search
- Dashboard enriched with AI-powered widgets
- Resume Studio full-screen mode

---

## [AI Career Workspace Phase 1] — 2026-08-07

`[d2d2ed1]` AI Career Workspace Phase 1: 18-item grouped nav, 13 new pages, real dashboard

### Changes
- 18-item grouped navigation in candidate sidebar
- 13 new AI workspace pages (career tools, cover letter, interview prep, etc.)
- Candidate dashboard with real data and AI widgets

---

## [Enterprise IAM] — 2026-08-07

`[a403103]` Enterprise IAM module: Create User, Lock/Unlock, Bulk Actions, Department, Sorting  
`[144fdf7]` Fix ambiguous company FK in getAdminUsers, update e2e headings

### Changes
- Admin user management: create, lock/unlock, bulk operations
- Department assignment
- Sortable user table
- Bug fix: ambiguous `company_id` FK in `getAdminUsers` query

---

## [Global AI Workspace] — 2026-08-07

`[c8e7c59]` Add Global AI Workspace: resume context service, cover letter, interview prep, and career advisor  
`[1c8273e]` Fix reserved keyword: rename current_role to current_job_role in ai_career_reports  
`[9aa6d6e]` Fix e2e tests: update homepage heading assertions to candidate-focused copy

### Changes
- Resume context service (AI reads the active resume to inform all other AI tools)
- Cover letter generation
- Interview prep AI tool
- Career advisor AI tool
- Bug fix: reserved SQL keyword `current_role` renamed to `current_job_role`

---

## [Marketing Overhaul] — 2026-08-07

`[ebda9dc]` Marketing platform overhaul: candidate-first homepage, dual-context nav, employer landing, 4 AI tools

### Changes
- Candidate-first homepage with live ATS checker teaser
- Dual-context navigation (candidate / recruiter)
- Employer landing page
- 4 guest AI tools (ATS checker, career advisor, cover letter, interview prep)

---

## [Enterprise RBAC] — 2026-08-07

`[ac3e7f8]` Enterprise RBAC: roles, permissions, role_permissions, user_roles

### Changes
- RBAC tables: `roles`, `permissions`, `role_permissions`, `user_roles`
- Admin UI for role and permission management
- Capability matrix per role

---

## [Auth System] — 2026-08-07

`[07cbcd2]` Auth system: remove LinkedIn, add phone OTP, profile completion

### Changes
- Removed LinkedIn OAuth provider
- Added phone OTP sign-in
- Profile completion flow for new users

---

## [Pre-Launch Hardening] — 2026-08-07

`[ad6f42b]` Pre-launch hardening: accessibility, dark mode, security, SEO  
`[fa2e267]` Production hardening: security headers, env fixes, RLS, email templates  
`[f289322]` Fix social login, welcome email, external search UX, enterprise design system

### Changes
- Accessibility audit and fixes
- Dark mode support across all portals
- Security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.)
- RLS policy hardening
- Email template design
- Welcome email flow
- Enterprise design system tokens

---

## [Job Discovery] — 2026-08-07

`[68742f5]` Add Smart Autocomplete, Search Analytics, Notifications, migration 0037  
`[2d3aa4b]` Add AI-powered Job Discovery: search history, saved searches, alerts, AI career intelligence  
`[3d11ba1]` Add Enterprise External Job Search to the Browse Jobs page

### Changes
- Smart autocomplete in job search
- Admin search analytics dashboard
- Notification foundation (migration 0037)
- Search history persistence
- Saved searches with email alerts
- AI career intelligence (24h cached) panel
- Enterprise external job search integration
- 5-tab job discovery UI

---

## [Platform Evolution] — 2026-08-07

`[99d2f76]` Add enterprise platform evolution: analytics, billing, feature flags, job queue, email  
`[92ed7d2]` Expand diagnostics: Database, Queue, Email, Billing health panels  
`[5425002]` Production hardening: audit fixes for queue, email, stripe, and cron

### Changes
- Analytics dashboard for admin portal
- Billing management UI (Stripe-ready)
- Feature flags data model + admin UI
- Background job queue with cron worker
- Email automation with Resend templates
- Platform diagnostics expanded: DB, AI, Queue, Email, Billing health checks

---

## [Platform Bootstrap] — 2026-08-07

`[3a9153e]` Add multi-tenant company model, platform bootstrap, and diagnostics hardening

### Changes
- Multi-tenant company model (migrations 0029/0030)
- PRA Consultancy company created as seed tenant
- Diagnostics hardened with HTTP 403 + expanded fields

---

## [OpenRouter Integration] — 2026-08-07

`[a40d0f9]` Support OpenRouter as the AI provider via configurable base URL/models  
`[d9be52e]` Add live OpenAI integration diagnostic (super_admin only)  
`[bcf1f90]` Improve OpenAI error handling: classify failures instead of one generic fallback

### Changes
- `AI_BASE_URL` and `AI_MODEL_REASONING` environment variables for model-agnostic AI
- Live diagnostic for AI provider (admin only)
- Classified AI error handling (auth errors, rate limit, timeout, model not found)

---

## [Recruiter Intelligence v2.0] — 2026-08-07

`[1c07477]` Add e2e coverage for Recruiter Intelligence v2.0 + fix Kanban empty-column label (Phase 9)  
`[f178e0b]` Fix mobile-viewport horizontal overflow app-wide (Phase 9)  
`[c4d8184]` Add Enterprise Polish i18n audit (Phase 9)  
`[ac1e94a]` Add Interview Intelligence (Phase 8)  
`[fb73830]` Add Bulk Recruiter Operations (Phase 7)  
`[e5234f0]` Add Hiring Analytics with CSV export (Phase 6)  
`[6c24d8d]` Add Recruiter Copilot (Phase 5)  
`[ff036de]` Add AI Shortlisting (Phase 4)  
`[b2f3cfc]` Add Candidate Comparison with PDF export (Phase 3)  
`[5c177d3]` Add AI Candidate Intelligence panel (Phase 2)  
`[73d0767]` Add Recruiter Portal Internationalization + Executive Dashboard (Phase 0-1)

### Changes
- **Phase 0-1** — Recruiter portal i18n (EN/AR), Executive Dashboard with KPIs
- **Phase 2** — AI Candidate Intelligence: per-candidate suitability scoring
- **Phase 3** — Candidate Comparison with AI analysis, PDF export
- **Phase 4** — AI Shortlisting: automated ranking with transparent reasoning
- **Phase 5** — Recruiter Copilot: natural language multi-intent AI assistant
- **Phase 6** — Hiring Analytics: full funnel, recruiter workload breakdown, CSV export
- **Phase 7** — Bulk Operations: multi-select stage changes, recruiter assignment, archive
- **Phase 8** — Interview Intelligence: timeline, structured feedback, AI post-interview summary
- **Phase 9** — Enterprise Polish: i18n audit, mobile overflow fix, e2e coverage, Kanban label fix

---

## [Job Seeker Expansion v1.3] — 2026-08-07

`[20ead67]` Add Resume Versioning & History (Unit C)  
`[a9ff339]` Add Modular AI Writing Tools: Rewrite & Optimize module (Unit B)  
`[3bb39e2]` Fix Resume Health Checklist false-negative field detection  
`[afc5bba]` Add Resume Intelligence Hub: Score & Health module (Unit A)  
`[05d16ee]` Add Application & Interview Tracking polish (Unit H)  
`[2063afb]` Add Candidate Portal Internationalization (Unit 0)

### Changes
- **Unit 0** — Candidate portal i18n (EN/AR + RTL), `NextIntlClientProvider` moved to `[locale]/layout.tsx`
- **Unit A** — Resume Intelligence Hub: structural health score, ATS compatibility
- **Unit B** — Modular AI Writing Tools: Rewrite & Optimize with per-section AI improvement
- **Unit C** — Resume Versioning & History: version counter, history browser, restore
- **Unit H** — Application & Interview Tracking: Kanban, list view, interview timeline

---

## [v1.1 Platform Milestones] — 2025-Q4 to 2026-Q1

`[f3d4f69]` Add Job Seeker Product Expansion Blueprint (approved)  
`[f30f171]` Add Stripe Integration Plan (approved Billing Architecture Blueprint)  
`[2b56f18]` Add v1.2 SaaS Architecture Proposal (approved blueprint)  
`[59751d4]` Add Organizations & Roles: role-capability permissions + teammate invites  
`[d425594]` Add Recruiter AI Assistant: job posting writer + candidate message drafts  
`[c171f81]` Add AI Interview Assistant: question generation, scheduling, structured feedback  
`[b66f385]` Add AI Resume Matching: opt-in candidate discovery for recruiters  
`[be16d12]` Add Phase 1F: AI Resume Builder (collaborative editor, PDF/DOCX export)  
`[6ee52b9]` Add Phase 1E: Performance & Production Optimization  
`[8d5ec7a]` Fix Phase 1D: language switcher left `<html>` lang/dir stale  
`[026a899]` Add Phase 1D: Internationalization (English/Arabic)

### Changes
- **Phase 1D** — Internationalization (EN/AR); NextIntlClientProvider architecture; RTL layout support
  - Bug fix: `<html lang>` / `<html dir>` went stale after locale switch — moved NextIntlClientProvider to `[locale]/layout.tsx`
- **Phase 1E** — Performance: bundle optimization, image optimization, prefetching, Core Web Vitals
- **Phase 1F** — AI Resume Builder: collaborative editor, real-time preview, PDF/DOCX export
- **AI Resume Matching** — opt-in candidate visibility for recruiters; semantic matching
- **AI Interview Assistant** — question generation, scheduling, structured feedback collection
- **Recruiter AI Assistant** — AI job description writer, AI candidate message drafts
- **Organizations & Roles** — `role_capabilities` table, `has_capability()` SQL function, teammate invite flow
- **v1.2 SaaS Architecture** — approved multi-tenant design blueprint
- **Stripe Blueprint** — approved billing architecture (infrastructure, not live payments)
- **Job Seeker Blueprint** — approved v1.3 expansion plan

---

## [Phase 1C — SEO & Technical SEO] — 2025-Q4

`[5ae42b4]` Fix Phase 1C: og:image/twitter:image missing on all pages except homepage  
`[8a57694]` Remove temporary env-var diagnostic route  
`[6ffdb5d]` Add minimal, direct env-var + deployment-identity diagnostic  
`[125de66]` Remove temporary diagnostic route  
`[8de4eaf]` Diagnostic: isolate id vs status filtering, direct PostgREST fetch  
`[b42be6e]` Diagnostic: compare SSR-wrapped client vs plain client from same runtime  
`[2d9611f]` Diagnostic: compare .single() vs .limit(1) vs .maybeSingle()  
`[f1235c0]` Expand diagnostic route to surface the raw Supabase error  
`[adef69f]` Add temporary diagnostic route for /jobs/[id] and /companies/[slug] 404 regression  
`[4a4588f]` Fix Phase 1C: production 404 on all job/company detail pages  
`[186ae63]` Fix Phase 1C: og:image/twitter:image not rendering  
`[ff3df1b]` Add Phase 1C: SEO & Technical SEO (v1.1.3)

### Changes
- SEO metadata on all pages (title templates, Open Graph, Twitter cards)
- Structured data (JSON-LD) for job listings and company profiles
- Sitemap generation
- **Bug investigation and fix**: production 404 on all `/jobs/[id]` and `/companies/[slug]` pages — root cause was Supabase query cardinality mismatch (`.single()` throwing when no row found vs. returning null)
- **Bug investigation and fix**: og:image/twitter:image not rendering — fixed meta tag placement
- Multiple diagnostic routes added and removed during the investigation

---

## [Phase 1B — Guest ATS Checker] — 2025-Q4

`[ac5d118]` Archive Phase 1B final documentation: SEV-1 incident report + deployment report  
`[d80826b]` Fix Phase 1B: navbar tablet overflow, pdf-parse retry margin, test data cleanup  
`[5806e0b]` Remove temporary diagnostic route  
`[c5186a4]` Add temporary diagnostic route for production job/company query incident  
`[ed37948]` Add Phase 1B: reposition homepage around the live Guest ATS Checker

### Changes
- Homepage redesigned around the live Guest ATS Checker as the primary CTA
- Navigation navbar tablet overflow fix
- PDF parse retry margin improvement
- SEV-1 production incident: job/company query failures investigated and resolved

---

## [Phase 1A — Guest ATS Resume Checker] — 2025-Q4

`[0098602]` Fix Phase 1A: duplicate page title + IP-cap test isolation  
`[004274e]` Add Phase 1A: ephemeral Guest ATS Resume Checker

### Changes
- Guest ATS Resume Checker — full resume scoring without an account
- IP-based rate limiting for guest AI endpoint
- Session-based ephemeral storage for guest resume data

---

## [v1.0 — Production Ready ATS Platform] — 2025-Q4

`[cc829d5]` Fix production 500 on job publish + resolve e2e reliability gaps  
`[61ff2a6]` Production Ready ATS Platform

### Changes
- Initial production-ready release of the ATS platform
- Job posting, application tracking, candidate profiles
- Recruiter dashboard with basic KPIs
- Public job board
- Bug fix: HTTP 500 on job publish due to missing FK constraint handling
- End-to-end test reliability hardening
