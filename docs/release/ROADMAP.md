# Product Roadmap

**Platform:** PRA Talent Intelligence Platform  
**Production:** https://pra-eta-umber.vercel.app

---

## ROADMAP STATUS

```
Platform:              PRA Talent Intelligence Platform
Current Production:    v2.0.0 (commit dfc739f — 2026-08-17)
Next Planned Release:  v2.1
Roadmap Status:        PLANNED / ON HOLD
Implementation Status: NOT STARTED

No Phase has been approved for implementation.
Implementation begins only after explicit approval of a specific Phase.
```

---

## Current State: v2.0.0

v2.0.0 is the official production baseline — the stabilized, documented, enterprise-ready form of everything shipped through v1.9. The core hiring lifecycle is complete end-to-end:

- Full Candidate AI Workspace (Resume Studio, Career Intelligence Hub, Interview Intelligence, Application Intelligence)
- Full Recruiter Intelligence Platform (Pipeline, AI Matching, Copilot, Analytics, Messaging, Offers)
- Multi-tenant Admin Portal (Users, Companies, RBAC, Feature Flags, Billing, Diagnostics)
- View As Switcher for Super Admin role preview
- Internationalization (EN/AR) across all portals
- 29 AI capabilities, 50 DB migrations, 134 Playwright tests (132 passing, 2 skipped)
- GitHub Release: https://github.com/hassanad70-collab/PRA-/releases/tag/v2.0.0

---

## v2.1 — AI-First Candidate Experience + Platform Hardening

**Roadmap Status:** PLANNED / ON HOLD — Not started  
**Target:** Q4 2026  
**Approval gate:** Every Phase requires explicit approval before implementation begins

### Approved AI Architecture Decisions

Before implementation, the following architectural decisions are locked:

| AI Product | Status | Decision |
|---|---|---|
| **AI Career Chatbot** | Evolution of existing AI Career Assistant | Enhance `/candidate/workspace/assistant` — add persistence, richer context, platform guidance. No new chatbot created. |
| **AI Career Coach** | Absorbs/evolves authenticated Career Advisor | `/candidate/workspace/career-advisor` becomes the Coach. One-shot report becomes "Initial Assessment". Goal-setting, check-ins, progress tracking, roadmap added on top. |
| **Guest Career Advisor** | Unchanged | Remains public lead-gen tool at `/ai-tools/career-advisor`. No changes. |
| **Recruiter Copilot** | Unchanged | Recruiter-side only. Not touched in v2.1. |

**Responsibility separation:**

| Question type | AI product |
|---|---|
| "Help me with my resume right now" | AI Career Chatbot |
| "What's my 2-year career plan?" | AI Career Coach |
| "How do I use the ATS Checker?" | AI Career Chatbot |
| "Am I on track toward my goal?" | AI Career Coach |
| First-time visitor, no account | Guest Career Advisor |
| Recruiter hiring pipeline questions | Recruiter Copilot |

---

### Phase 1 — Foundation Hardening

**Status:** APPROVED (plan) / NOT STARTED (implementation)  
**Dependencies:** None — first phase

**Features:**
- DEBT-002: Distributed Rate Limiting — replace in-process `Map` in `src/lib/rate-limit.ts` with Upstash Redis (`@upstash/ratelimit` + `@upstash/redis`), fail-open fallback when credentials absent
- DEBT-005: Email Base URL — replace 8 hardcoded `https://pra-eta-umber.vercel.app` URLs in `messaging.ts` + `offers.ts` with `process.env.NEXT_PUBLIC_SITE_URL`
- DEBT-004: `any` type fix in `src/actions/studio.ts:37–38` → `Json` or `unknown`
- DEBT-006: Remove 5 unused variable declarations across 5 files
- DEBT-011: Write `docs/adr/ADR-008-mock-interview-api-route.md` (streaming exception documentation)

**User Problem:** Auth endpoints are unprotected on Vercel's serverless fleet (per-instance rate limiter is bypassed by load balancing). Email links from staging environments point to production. ESLint warnings pollute the build output.

**Business Value:** Production security hardening before new AI capabilities are built on top. Closes the one remaining medium-severity technical debt item. Unblocks Phase 2 (Chatbot needs distributed rate limiting).

**Technical Complexity:** Low. Rate limiter rewrite is the most complex element. All other changes are 1–3 line removals or substitutions.

**New Env Vars Required:**
- `UPSTASH_REDIS_REST_URL` (server-only)
- `UPSTASH_REDIS_REST_TOKEN` (server-only)

**Database Impact:** None. No migrations.

**AI Impact:** None.

**Security:** Upstash REST token must never be `NEXT_PUBLIC_`. Fail-open fallback preserves availability when Redis is unreachable.

**Recommended Priority:** P0

**Implementation Order:**
1. Code quality removals (DEBT-006, DEBT-004, ADR-008 doc)
2. Email base URL fix (DEBT-005)
3. Distributed rate limiter (DEBT-002)

---

### Phase 2 — Candidate AI Intelligence

**Status:** PLANNED / NOT STARTED  
**Dependencies:** Phase 1 (rate limiting required by Chatbot)

**Features:**

**2A — AI Career Chatbot** (evolution of existing AI Career Assistant at `/candidate/workspace/assistant`)
- Conversation persistence: new `ai_chat_sessions` + `ai_chat_messages` DB tables; history survives page reloads, accessible across devices
- Expanded context: candidate profile (name, title, years experience, skills), active applications, current job searches, active career goals from Coach
- Platform feature guidance: system prompt includes PRA feature knowledge (answers "how do I use X?")
- Rate limiting: wire `rateLimitByIp` to chat send action (Upstash from Phase 1)
- Model alignment: replace hardcoded `gpt-4o-mini` with `AI_MODELS.reasoning` env-configured model
- Session management UI: list past conversations, resume any session, delete

**2B — AI Career Coach** (absorbs and evolves `/candidate/workspace/career-advisor`)
- Goal-setting onboarding: target role, timeline, current level, motivation, blockers
- Initial Assessment: reuses existing `career-recommendations.ts` AI call (no new AI — zero duplication)
- Career roadmap: structured milestones toward target role
- Experience-gap analysis: what specific experience is missing vs. target role requirements
- Learning roadmap: skills → resources → estimated timelines
- Weekly action goals (reused from existing `weeklyGoals` output already in AI layer)
- Certification recommendations (surfaced prominently from existing AI output)
- Check-in system: manual + 30-day prompted reassessment
- Progress tracking: assessment snapshots compared over time
- Reassessment: re-run AI against updated profile, compare to previous check-in

**User Problem (Chatbot):** Candidates have no general-purpose AI for day-to-day questions. They must navigate to the correct specific tool for every question. Context is fragmented. Discovery is poor.

**User Problem (Coach):** The Career Advisor generates one report and stops. There is no longitudinal relationship, no goal tracking, no progress measurement. Candidates have no way to know if they're actually moving forward.

**Business Value:** AI Career Chatbot improves time-on-platform and feature discovery. AI Career Coach creates a habitual weekly return loop — the primary differentiator from job boards. Both features justify a premium subscription tier (Phase 5).

**Technical Complexity:** Medium-high. Chatbot: moderate (DB persistence, context assembly, session UX). Coach: high (new data model, progress comparison logic, onboarding flow, check-in system, multi-screen UX).

**Database Impact:** 2 new migrations

*Migration A — AI Chat Persistence:*
- `ai_chat_sessions` (id, user_id, domain, title, message_count, created_at, updated_at)
- `ai_chat_messages` (id, session_id, role, content, created_at)
- RLS: `user_id = auth.uid()` via sessions; sessions JOIN for messages

*Migration B — Career Coach:*
- `career_goals` (id, candidate_id, target_role, timeline, current_level, motivation, challenges, is_active, created_at, updated_at)
- `career_check_ins` (id, candidate_id, goal_id, check_in_type, assessment_data jsonb, progress_notes, skills_gained text[], created_at)
- RLS: `candidate_id = auth.uid()` on both tables

*Reusing existing (no migration):*
- `ai_career_reports` — saved assessment snapshots
- `candidate_ai_recommendations` — 24h AI cache

**AI Impact:** High. Chatbot: 1 API call per message turn with full history. Coach: initial assessment + periodic check-ins. Monitor token usage — long Chatbot conversations grow expensive. Both use `AI_MODELS.reasoning` config.

**Security:** All chat + coach data is personal and career-sensitive. Strict RLS required on all new tables. No Recruiter-side visibility into candidate career goals or chat history.

**Recommended Priority:** P0

**Implementation Order:**
1. DB migrations (chat + coach tables)
2. Career Coach: goal-setting, initial assessment, roadmap display
3. Career Coach: check-in system, progress tracking, weekly goals
4. AI Career Chatbot: DB persistence for sessions/messages
5. AI Career Chatbot: expanded context injection
6. AI Career Chatbot: platform guidance system prompt
7. AI Career Chatbot: session management UI
8. e2e tests for both features

---

### Phase 3 — Employer Workspace

**Status:** PLANNED / NOT STARTED  
**Dependencies:** Phase 2

**Features:**
- Company Public Profile: publishable employer brand page visible to candidates (schema already exists in `company_profiles` since migration 0048)
- Employer branding: banner, about, culture, benefits, tech stack, headquarters fields — data storable now, UI and publishing workflow is Phase 3
- Employer Analytics Dashboard: aggregate KPIs across all company jobs (applicant pipeline, role performance, time-to-hire) — new aggregate RPC over existing data
- View As: Employer — enable the disabled "Employer" option in the Super Admin View As Switcher (DEBT-008)

**User Problem:** Companies cannot present their brand through PRA. Candidates researching a company see no employer context. Recruiters have no cross-job aggregate analytics.

**Business Value:** Employer-branded profiles are a primary reason enterprises choose job platforms over raw posting boards. Enables employer subscription differentiation (Phase 5 billing).

**Technical Complexity:** Medium. Company Profile schema already exists — work is the public-facing page, publishing workflow, and public RLS. Analytics requires a new aggregate view or RPC but reads existing data. View As Employer is a minor extension of the existing switcher.

**Database Impact:** Low.
- One migration: aggregate analytics view or RPC over existing tables
- Possible: add `published_at timestamptz` to `company_profiles`
- Public RLS policy: `is_published = true` allows anon select on `company_profiles`

**AI Impact:** Optional. AI-assisted "About Us" copy generation is a stretch goal, not required.

**Security:** Published profiles are publicly readable (anon). Draft profiles: recruiter-only, scoped by `company_id`. Employer Analytics must be scoped to `company_id`.

**Recommended Priority:** P0

**Implementation Order:**
1. Company Public Profile: page + publishing workflow + public RLS
2. Employer branding fields UI (banner, about, culture, benefits, tech stack)
3. Employer Analytics Dashboard: queries/RPC + charts + KPIs
4. View As: Employer enabled in switcher

---

### Phase 4 — i18n Completeness + AI Language

**Status:** PLANNED / NOT STARTED  
**Dependencies:** Phases 2 + 3 (new pages from those phases must be translated here)

**Features:**
- DEBT-010: AI-generated content in user's locale — thread `locale` parameter through all AI functions; append language instruction for Arabic ("Reply entirely in Arabic (Modern Standard Arabic)")
- DEBT-013: Invite route i18n — move `src/app/invite/[token]/` under `src/app/[locale]/invite/[token]/`
- DEBT-012: Admin portal i18n — assessment of full vs. partial scope; implement based on decision
- Arabic translation strings for all Phase 2 + Phase 3 new pages (Career Coach, Chatbot, Employer Workspace must support EN/AR from launch)

**User Problem:** Arabic-locale users receive AI career advice, coach check-ins, and chatbot responses in English. Invite page and (potentially) admin portal are English-only.

**Business Value:** Full Arabic-language AI is a meaningful differentiator in MENA markets. Closes the gap between the platform's i18n promise and actual AI behavior.

**Technical Complexity:** Medium. AI language: mechanical — add `locale` threading through 15+ AI functions. Quality testing in Arabic required before shipping. Admin i18n: high effort if full migration.

**Database Impact:** None.

**AI Impact:** Significant and additive. All AI functions gain `locale?: string`. Arabic responses may be longer (higher token usage). Quality must be validated before shipping.

**Security:** Locale value must come from authenticated session — never from URL parameters (prompt injection risk).

**Recommended Priority:** P1

**Implementation Order:**
1. Thread `locale` through all AI function signatures
2. Quality test Arabic AI output across 6 key functions
3. Invite route i18n (DEBT-013)
4. Phase 2 + Phase 3 Arabic translation strings
5. Admin portal i18n (scope decision first)

---

### Phase 5 — Monetization

**Status:** PLANNED / NOT STARTED  
**Dependencies:** Phases 2 + 3 (premium features must exist before they can be sold)

**Features:**
- Stripe checkout session creation (full payment flow — currently infrastructure exists but checkout is not implemented)
- Plan tier enforcement: wire `feature_flags` table to subscription plan level
- Subscription management UI: upgrade, downgrade, cancel
- Candidate plan differentiation: free vs. premium (AI Career Coach, unlimited Chatbot history, advanced tools)
- Recruiter plan differentiation: starter vs. professional vs. enterprise
- Stripe webhook: wire production events to `subscriptions` table sync

**User Problem:** The platform has zero monetization. Full Stripe infrastructure (webhook handler, `subscriptions`, `invoices`, `billing_events` tables from migration 0033, plan enum: free/starter/professional/enterprise) is in place but no checkout flow exists.

**Business Value:** This is the revenue unlock. Nothing generates revenue until Phase 5 ships.

**Technical Complexity:** High. Requires real Stripe production credentials and product/price configuration in the Stripe dashboard (outside the codebase). Plan enforcement must be server-side.

**External Requirements:**
- `STRIPE_SECRET_KEY` (production)
- `STRIPE_WEBHOOK_SECRET` (production)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (production)
- Stripe product + price objects configured in Stripe dashboard

**Database Impact:** Low — schema already exists.
- Minor: add `trial_ends_at timestamptz` to `subscriptions` if trial logic is needed

**AI Impact:** Gate expensive AI features (Career Coach check-ins, Chatbot history, Resume Studio ops) behind paid plans using the `feature_flags` enforcement layer.

**Security:** Webhook must validate `Stripe-Signature` before processing. Plan enforcement must be server-side in Server Actions — never trust client-side plan checks. `stripe_customer_id` scoped per user.

**Recommended Priority:** P1

**Implementation Order:**
1. Stripe product + price configuration (external, Stripe dashboard)
2. Checkout session creation Server Action + flow
3. Webhook: wire plan sync to `subscriptions` table
4. Plan enforcement: `requireSubscription()` helper in premium AI actions
5. Billing UI: current plan, upgrade prompt, manage subscription
6. Feature flag wiring: subscription tier → `feature_flags` enforcement

---

### Phase 6 — Distribution + Growth

**Status:** PLANNED / NOT STARTED  
**Dependencies:** Phases 3 + 5

**Features:**
- Application Form Builder: recruiters create custom application forms per job (structured questions beyond resume submission)
- Job Distribution: broadcast job postings to external boards (LinkedIn, Indeed) via webhook/API integrations
- Remaining admin portal i18n (if deferred from Phase 4)
- SEO improvements for public job listings and employer profiles

**User Problem:** Recruiters cannot capture structured candidate data at application time. Jobs posted on PRA aren't visible on the boards where candidates actually search.

**Business Value:** Application Form Builder is a premium recruiter feature. Job Distribution solves the candidate supply problem — jobs reach more candidates without relying on organic PRA traffic.

**Technical Complexity:** High. Form Builder requires a new schema and rendering engine. Job Distribution requires external API integrations with their own authentication models.

**Database Impact:** New migration.
- `application_form_templates` (id, company_id, job_id, fields jsonb[], is_active)
- `application_form_responses` (id, application_id, form_template_id, responses jsonb)
- `job_distributions` (id, job_id, platform, external_id, status, distributed_at)

**AI Impact:** Optional. AI can suggest form questions from job description. AI can summarize form responses for recruiter review.

**Security:** Form responses contain sensitive candidate data — strict RLS (company + candidate scoped). Text/multiline form fields need XSS sanitization before storage and display. External distribution API OAuth tokens must be server-side env vars.

**Recommended Priority:** P2

**Implementation Order:**
1. Application Form Builder: schema + template builder UI + candidate form rendering
2. Form response collection + recruiter review UI
3. Job Distribution: webhook-based (Zapier) as first implementation
4. Job Distribution: native API integrations (LinkedIn, Indeed) as follow-up

---

## Phase Summary

| Phase | Name | Key Deliverables | New DB | AI Impact | Priority | Depends On |
|---|---|---|---|---|---|---|
| **1** | Foundation Hardening | DEBT-002/004/005/006/011 | None | None | P0 | — |
| **2** | Candidate AI Intelligence | AI Career Chatbot, AI Career Coach | 2 migrations | High | P0 | Phase 1 |
| **3** | Employer Workspace | Company Profile, Employer Analytics, View As Employer | 0–1 migration | Optional | P0 | Phase 2 |
| **4** | i18n + AI Language | DEBT-010/012/013, Phase 2+3 Arabic strings | None | Significant | P1 | Phases 2+3 |
| **5** | Monetization | Stripe checkout, plan gating, billing UI | 0–1 migration | Gate existing | P1 | Phases 2+3 |
| **6** | Distribution + Growth | Form Builder, Job Distribution, remaining i18n | 1 migration | Optional | P2 | Phases 3+5 |

---

## v2.2 — Recruiter Intelligence Enhancements

**Target:** Q1 2027  
**Theme:** AI-driven recruiter productivity and pipeline intelligence

### Planned Features

#### Predictive Hire Probability
- ML model estimating probability of successful hire per candidate-job pair
- Calibrated using historical hiring outcomes from the platform
- Dashboard widget showing pipeline risk at a glance

#### AI Pipeline Insights
- Automated bottleneck detection ("Applications are stalling in Screening for 8+ days")
- Recruiter workload balancing suggestions
- Time-to-hire forecast per open position

#### Candidate Rediscovery
- AI search across talent pool (including past applicants who didn't progress)
- "Hidden gem" detection — candidates who scored well but weren't hired
- Automatic talent pool enrichment from public sources (with consent)

#### Structured Interview Kits
- Reusable interview question kits per role family
- Interviewer calibration scores
- AI-generated post-interview summaries linked to the kit questions

#### Recruiter Automation Rules
- Event-triggered automations ("When application stage = Offer Sent → send offer email template")
- Notification rules per recruiter
- Auto-assign candidates to recruiters by workload balance

---

## v2.3 — Enterprise RBAC

**Target:** Q2 2027  
**Theme:** Granular permission control for large enterprise customers

### Planned Features

#### Custom Roles
- Create named roles beyond the built-in set (e.g., "Senior Recruiter", "Hiring Manager", "Coordinator")
- Assign capability sets per custom role
- Role templates for fast onboarding

#### Department-Level Isolation
- Restrict recruiters to specific departments or business units
- Department-scoped analytics
- Cross-department visibility controls

#### Approval Workflows
- Configurable approval chains for job posting (e.g., Recruiter → HR Manager → VP)
- Offer approval workflow with configurable thresholds
- Audit log of approvals and rejections

#### Single Sign-On (SSO)
- SAML 2.0 / OIDC integration for enterprise identity providers (Okta, Azure AD, Google Workspace)
- JIT provisioning on first SSO login
- SSO-enforced role mapping from IdP groups

---

## v3.0 — AI Talent Intelligence

**Target:** Q4 2027 — Q1 2028  
**Theme:** AI-native hiring intelligence layer across the entire talent lifecycle

### Vision

v3.0 transforms PRA from a recruitment platform with AI features into an **AI-native talent intelligence system**. Every hiring decision is augmented by platform-wide aggregate intelligence.

### Planned Features

#### Platform-Wide Hiring Intelligence
- Aggregate success patterns across all hiring on the platform (fully anonymized)
- "What predicts success in this role at similar companies?" model
- Benchmarking vs. comparable companies

#### Autonomous Sourcing Agent
- AI agent that proactively sources passive candidates from public profiles (with consent)
- Automated outreach sequences personalized per candidate
- Response scoring and pipeline injection

#### AI Interview Scoring (Live)
- Live interview transcription (video/audio)
- Real-time coaching suggestions for interviewers
- AI scoring against structured rubrics immediately after completion

#### Market Intelligence Feed
- Real-time job market signals relevant to open positions
- Salary movement alerts
- Talent supply/demand dashboard per skill and location

#### Conversational Hiring Interface
- Natural language interface replacing most form-based interactions
- "Post a senior backend engineer role, similar to the one we filled last March" → job draft in 2 seconds
- Candidate-facing conversational application

---

## Beyond v3.0 — Long-Term Vision

- **Mobile-native apps** (iOS/Android) for candidates and recruiters
- **Public API** with developer ecosystem and integration marketplace
- **Workforce planning** module (headcount planning, succession planning, skills forecasting)
- **Candidate communities** (skill-based groups, mentorship matching)
- **Global expansion** with additional locales (FR, DE, ES, ZH)

---

*Last updated: 2026-08-17 — v2.1 six-phase roadmap approved as planning baseline. Implementation status: ON HOLD pending explicit phase-by-phase approval.*
