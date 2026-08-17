# C4 Architecture — Level 1: System Context

> This diagram shows the PRA Talent Intelligence Platform as a black box, the people who use it, and the external systems it depends on.

---

## Context Diagram

```mermaid
C4Context
    title System Context — PRA Talent Intelligence Platform

    Person(candidate, "Job Seeker / Candidate", "Uses the AI Career Workspace to build resumes, prepare for interviews, and track applications")
    Person(recruiter, "Recruiter / HR Manager", "Uses the Recruiter Portal to post jobs, evaluate candidates, manage the hiring pipeline, and communicate with applicants")
    Person(admin, "Super Admin", "Manages the platform: users, companies, billing, feature flags, and diagnostics")
    Person(guest, "Guest User", "Uses rate-limited AI tools (ATS Checker, Career Advisor) without an account")

    System(pra, "PRA Talent Intelligence Platform", "A multi-tenant SaaS recruitment platform providing AI-powered hiring tools for both candidates and recruiters")

    System_Ext(supabase, "Supabase", "PostgreSQL database, authentication, and file storage. Hosts all application data with Row Level Security enforcement.")
    System_Ext(openrouter, "OpenRouter", "AI gateway providing access to large language models (GPT-4o-mini by default) for all 29 AI capabilities")
    System_Ext(resend, "Resend", "Transactional email delivery for notifications, alerts, and offer letters")
    System_Ext(stripe, "Stripe", "Payment processing and subscription billing infrastructure (webhook-ready)")
    System_Ext(vercel, "Vercel", "Hosting platform for the Next.js application; provides edge functions, CDN, and cron jobs")

    Rel(candidate, pra, "Signs in, builds resume, applies to jobs, tracks applications, uses AI workspace")
    Rel(recruiter, pra, "Posts jobs, reviews candidates, manages pipeline, conducts interviews, sends offers")
    Rel(admin, pra, "Manages platform configuration, users, companies, billing, and diagnostics")
    Rel(guest, pra, "Uses public AI tools without account (rate-limited)")

    Rel(pra, supabase, "Reads/writes all persistent data; authenticates users via Supabase Auth; stores resume files in Supabase Storage", "HTTPS / Supabase SDK")
    Rel(pra, openrouter, "Sends prompts and receives AI-generated content for all 29 AI capabilities", "HTTPS / OpenAI SDK")
    Rel(pra, resend, "Sends transactional emails (welcome, notifications, offers, alerts)", "HTTPS / Resend SDK")
    Rel(pra, stripe, "Processes subscription payments; receives payment events via webhook", "HTTPS / Stripe SDK")
    Rel(vercel, pra, "Hosts and serves the Next.js application; triggers cron jobs", "Infrastructure")
```

---

## Context Narrative

### Users

| Person | Volume | Primary Use Case |
|---|---|---|
| **Job Seeker** | High | Building competitive resumes, applying to jobs, interview prep |
| **Recruiter** | Medium | Finding candidates, managing hiring pipeline, analytics |
| **Super Admin** | Very Low | Platform configuration, billing, user management |
| **Guest** | High | Trying AI tools before registering |

### External Dependencies

| System | Criticality | Fallback |
|---|---|---|
| **Supabase** | Critical (P0) | None — all data is stored here |
| **OpenRouter** | High (P1) | AI features degrade gracefully (show error state) |
| **Resend** | Medium (P2) | Emails are fire-and-forget; failures are logged, not fatal |
| **Stripe** | Low (P3) | Billing UI shows read-only state; no financial data loss |
| **Vercel** | Critical (P0) | Platform is unavailable; no self-hosted fallback |

### Trust Boundaries

- All user requests enter through Vercel Edge (Next.js Middleware)
- No user data is stored outside Supabase (no third-party analytics with PII)
- AI prompts sent to OpenRouter include only the minimum data needed (resume text, job title — never full PII like email/phone)
- Stripe receives no resume or application data
