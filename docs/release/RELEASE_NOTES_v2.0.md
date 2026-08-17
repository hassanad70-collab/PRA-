# Release Notes — v2.0 (Stabilization Sprint)

**Release Date:** 2026-08-17  
**Commit:** `1d56b08` (HEAD — main)  
**Branch:** `main`  
**Production:** https://pra-eta-umber.vercel.app

---

## What is v2.0?

v2.0 is the **Stabilization Sprint release** of the PRA Talent Intelligence Platform. It does not introduce new user-facing features. Instead, it formally designates the current state of the platform as a stable, documented, enterprise-ready milestone by:

1. Completing comprehensive documentation across all system layers
2. Establishing an Architecture Decision Record (ADR) set
3. Generating an OpenAPI specification and database data dictionary
4. Preparing this release designation

All features in this release were shipped across v1.0 through v1.9.

---

## Platform Summary at v2.0

### Scale

| Dimension | Count |
|---|---|
| Database migrations | 50 |
| Server Action modules | 36 |
| AI capabilities | 29 |
| End-to-end tests | 129 (127 passing, 2 skipped) |
| Supported locales | 2 (EN, AR) |
| User roles | 4 (super_admin, recruiter, hr_manager, candidate) |
| Portal trees | 3 (admin, recruiter, candidate) |

### Tech Stack

Next.js 15.4 · TypeScript 5 · React 19 · Supabase (PostgreSQL 15 + Auth + Storage) · OpenRouter (OpenAI SDK) · Resend · Stripe (webhook-ready) · next-intl 4 · Playwright · Vercel

---

## Features Shipped Through v1.8

### Candidate AI Workspace (v1.3 — v1.4)

- **AI Resume Studio** — 3-panel collaborative editor, section drag-and-drop, AI rewrite/optimize, PDF/DOCX export, version history
- **Resume Intelligence Hub** — ATS score, structural health check, AI improvement suggestions, resume heatmap
- **Application Intelligence** — funnel visualization, win probability, AI application insights
- **Interview Intelligence** — 6 interview types, streaming AI mock interviews, per-answer scoring, final assessment report
- **Career Advisor** — personalized AI career coaching
- **Salary Insights** — AI-estimated compensation ranges
- **Skills Gap Analyzer** — competency gap analysis for target roles
- **LinkedIn Optimizer** — AI headline, summary, skills
- **Portfolio Generator** — public portfolio pages with AI content
- **Cover Letter Generator** — role-tailored generation

### Recruiter Intelligence Platform (v1.5 — v1.6)

- **Executive Dashboard** — KPIs (open jobs, pipeline velocity, offer acceptance rate, time-to-hire), monthly trend chart, activity feed
- **Hiring Pipeline** — Kanban and list views, drag-and-drop stage management
- **AI Candidate Matching** — semantic matching with ranked reasoning
- **AI Candidate Intelligence** — per-candidate suitability scoring, strengths, concerns
- **AI Shortlisting** — automated ranking with transparent reasoning
- **Candidate Comparison** — side-by-side AI comparison with PDF export
- **Bulk Operations** — multi-select status changes, recruiter assignment, archive
- **Interview Intelligence** — scheduling, structured feedback, AI post-interview summary
- **Hiring Analytics** — full funnel with recruiter workload breakdown, CSV export
- **Recruiter Copilot** — AI assistant with multi-intent natural language queries
- **Messaging Hub** — split-panel recruiter↔candidate inbox with AI message drafting
- **Offer Management** — offer creation, AI letter generation, accept/decline tracking with notifications
- **Resume Intelligence** — AI resume parsing and enrichment

### Platform & Admin (v1.0 — v1.2)

- **Multi-tenant model** — company-scoped data isolation via PostgreSQL RLS
- **Enterprise RBAC** — granular role and permission management, capability matrix
- **Admin Portal** — user management (create, lock/unlock, bulk ops), company management, audit logs
- **Feature Flags** — data-driven toggles without redeployment
- **Billing Infrastructure** — Stripe-ready subscription management (read-only UI)
- **Background Job Queue** — cron-based processing and monitoring
- **Email Automation** — Resend-powered transactional emails with templates
- **Platform Diagnostics** — live health checks (DB, AI, Queue, Email, Billing)

### Engagement & UX (v1.7 — v1.8)

- **Notifications Foundation** — unread badges on nav items, fire-and-forget delivery
- **Email Notifications** — job alerts, application updates, offer notifications
- **Activity Feed** — last 24h activity on the recruiter dashboard
- **Candidate Nav Redesign** — collapsible AI Career Workspace, 8-item quick actions, AI-tagged tools
- **View As Switcher** — Super Admin amber dropdown to preview any portal without role change
- **Job Discovery** — smart autocomplete, search history, saved searches, AI career intelligence, job alerts

### Infrastructure

- **Internationalization** — English/Arabic (RTL) across all portals
- **Guest AI Tools** — ATS checker, career advisor, cover letter, interview prep (rate-limited, no account required)
- **Public Job Board** — browsable without authentication
- **Command Palette** — global keyboard search (⌘K)
- **Dark/Light mode** — system-aware across all portals

---

## Bug Fixes and Hardening (Cumulative)

- View As Switcher: fixed no-op when cookie already matched current view
- View As Switcher: fixed UUID error in recruiter dashboard when super_admin has no recruiter profile
- View As Switcher: fixed cross-tree navigation not updating browser URL (switched to `window.location.href`)
- Resume Health Checklist: fixed false-negative field detection
- Phase 1D: fixed stale `<html lang>` / `<html dir>` after locale switch (moved `NextIntlClientProvider` to `[locale]/layout.tsx`)
- Phase 1C: fixed production 404 on all job/company detail pages
- Phase 1C: fixed og:image/twitter:image not rendering
- Production: hardened security headers, RLS policies, email templates
- Auth: replaced LinkedIn OAuth with phone OTP; added profile completion flow
- Mobile: fixed horizontal overflow app-wide

---

## Documentation Published in v2.0

All docs at `docs/`:

| Document | Path |
|---|---|
| System Architecture | `docs/architecture/SYSTEM_ARCHITECTURE.md` |
| Codebase Overview | `docs/architecture/CODEBASE_OVERVIEW.md` |
| C4 Context | `docs/architecture/c4-context.md` |
| C4 Container | `docs/architecture/c4-container.md` |
| C4 Component | `docs/architecture/c4-component.md` |
| Database ERD | `docs/database/DATABASE_ERD.md` |
| Data Dictionary (55 tables) | `docs/database/DATA_DICTIONARY.md` |
| API Reference | `docs/api/API_REFERENCE.md` |
| OpenAPI Spec | `docs/api/openapi.yaml` |
| Deployment Guide | `docs/deployment/DEPLOYMENT_GUIDE.md` |
| Environment Variables | `docs/deployment/ENVIRONMENT_VARIABLES.md` |
| Security | `docs/security/SECURITY.md` |
| User Guide | `docs/guides/USER_GUIDE.md` |
| Contributing | `docs/guides/CONTRIBUTING.md` |
| Changelog | `docs/release/CHANGELOG.md` |
| Roadmap | `docs/release/ROADMAP.md` |
| Repository Cleanup Report | `docs/release/REPOSITORY_CLEANUP_REPORT.md` |
| ADR-001 through ADR-007 | `docs/adr/` |

---

## Known Limitations

- **Stripe billing is read-only** — the infrastructure (webhook handler, subscription tables) is in place, but the Stripe API keys and payment checkout flow are not active. Live billing requires real Stripe credentials and a production subscription product configuration.
- **Employer portal (View As)** — the Employer option in the View As Switcher dropdown is present but disabled, pending the Employer Workspace milestone (v2.1 roadmap).
- **No mobile apps** — the platform is responsive web-only. Native iOS/Android apps are on the long-term roadmap.
- **AI translation of dynamic content** — AI-generated text (resume suggestions, copilot responses) is always in English, regardless of the user's selected locale.

---

## v1.9 Resume Upload Architecture (Included in v2.0)

Shipped 2026-08-17 as the final hardening commit before v2.0 tag:

- **FK guarantee** — `candidates` row upserted before every resume insert; no FK violation possible
- **UUID storage filenames** — original filename fully decoupled from storage path; any character accepted
- **Fresh signed URLs** — `resumes` bucket is private; both resume pages re-sign from `file_path` at render time
- **Drag-and-drop upload** — staged 6-phase progress, MIME/size validation, success/error toast
- **Auth hardening** — server actions use only `supabase.auth.getUser()`
- **28 new e2e tests** — 127/129 passing
- **Migration 0050** — `resumes.file_url` column made nullable

---

## Upgrade Notes

No breaking changes from v1.8 to v2.0. Migration 0050 makes `resumes.file_url` nullable (a non-breaking schema change — existing rows retain their previous value; new uploads store `null` and re-sign at render time).
