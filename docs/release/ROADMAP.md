# Product Roadmap

**Current Version:** v2.0 (Stabilization Sprint — 2026-08-09)  
**Platform:** PRA Talent Intelligence Platform  
**Production:** https://pra-eta-umber.vercel.app

---

## Current State: v2.0

v2.0 represents the stabilized, documented, enterprise-ready form of everything shipped through v1.8. The core hiring lifecycle is complete end-to-end:

- Full Candidate AI Workspace (Resume Studio, Career Intelligence Hub, Interview Intelligence, Application Intelligence)
- Full Recruiter Intelligence Platform (Pipeline, AI Matching, Copilot, Analytics, Messaging, Offers)
- Multi-tenant Admin Portal (Users, Companies, RBAC, Feature Flags, Billing, Diagnostics)
- View As Switcher for Super Admin role preview
- Internationalization (EN/AR) across all portals
- 29 AI capabilities, 50 DB migrations, 129 Playwright tests (127 passing)

---

## v2.1 — Employer Workspace

**Target:** Q4 2026  
**Theme:** Employer brand management and public company presence

### Planned Features

#### Company Public Profile
- Rich company profile pages (story, culture, benefits, team)
- Branded job listing pages with company header
- "Life at [Company]" media galleries

#### Employer Branding Tools
- Custom career site subdomain (`[company].pra.app/careers`)
- Company logo and cover photo management
- Employee spotlight posts

#### Employer Analytics
- Profile view analytics (how many candidates viewed the company page)
- Job listing performance (views → applications conversion)
- Competitive benchmarking vs. industry averages

#### Application Form Builder
- Custom application questions per job
- Conditional logic (show/hide questions based on answers)
- Application form analytics (drop-off analysis)

#### Job Distribution
- Multi-board posting (LinkedIn, Indeed, etc.) from a single posting
- Sponsored listing management
- Posting performance dashboard

---

## v2.2 — Recruiter Intelligence

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

#### Session Management
- Admin-initiated session revocation
- IP allowlisting per company
- Active session dashboard

---

## v2.4 — Billing & Subscriptions

**Target:** Q3 2027  
**Theme:** Full Stripe billing integration and subscription management

### Planned Features

#### Subscription Plans
- **Free tier** — 1 active job posting, 5 applications/month, basic ATS score
- **Pro** — unlimited jobs, 100 applications/month, all AI features, priority support
- **Enterprise** — unlimited everything, SSO, custom RBAC, dedicated SLA

#### Stripe Integration (Live)
- Full payment checkout flow (currently infrastructure is Stripe-ready but billing UI is read-only)
- Subscription creation, upgrade, downgrade, and cancellation
- Proration handling and invoice generation

#### Usage Metering
- AI call consumption tracking per company
- Application volume monitoring
- Feature flag enforcement based on subscription tier

#### Self-Service Billing Portal
- Stripe Customer Portal integration for payment method management
- Invoice history and PDF download
- Seat management (add/remove recruiter seats)

#### Reseller & Partner Billing
- Multi-company billing (resellers managing multiple client companies)
- Revenue share model for integration partners
- White-label billing under custom domain

---

## v3.0 — AI Talent Intelligence

**Target:** Q4 2027 — Q1 2028  
**Theme:** AI-native hiring intelligence layer across the entire talent lifecycle

### Vision

v3.0 transforms PRA from a recruitment platform with AI features into an **AI-native talent intelligence system**. Every hiring decision is augmented by a platform-wide model trained on anonymized, consent-based aggregate hiring outcomes.

### Planned Features

#### Platform-Wide Hiring Intelligence
- Aggregate success patterns across all hiring on the platform (fully anonymized)
- "What predicts success in this role at similar companies?" model
- Benchmarking: "Your time-to-hire is 12% longer than comparable companies"

#### Autonomous Sourcing Agent
- AI agent that proactively sources passive candidates from public profiles (with consent)
- Automated outreach sequences personalized per candidate
- Response scoring and pipeline injection

#### AI Interview Scoring (Live)
- Live interview transcription (video/audio)
- Real-time coaching suggestions for interviewers
- AI scoring against structured rubrics immediately after interview completion

#### Market Intelligence Feed
- Real-time job market signals relevant to open positions
- Salary movement alerts ("Benchmark salary for Senior Engineer roles +8% in the last 90 days")
- Talent supply/demand dashboard per skill and location

#### Candidate Success Prediction
- Post-hire success tracking (linked to performance data with candidate consent)
- Model refinement using actual hiring outcomes
- "Match score" calibrated to predict 90-day performance, not just application progression

#### Conversational Hiring Interface
- Natural language interface replacing most form-based interactions
- "Post a senior backend engineer role, similar to the one we filled last March" → job draft in 2 seconds
- Candidate-facing conversational application ("Tell me about your experience with Kubernetes")

---

## Beyond v3.0 — Long-Term Vision

- **Mobile-native apps** (iOS/Android) for candidates and recruiters
- **Public API** with developer ecosystem and integration marketplace
- **Workforce planning** module (headcount planning, succession planning, skills forecasting)
- **Candidate communities** (skill-based groups, mentorship matching)
- **Global expansion** with additional locales (FR, DE, ES, ZH)
