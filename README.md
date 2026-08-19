# PRA Talent Intelligence Platform

> An enterprise-grade, AI-powered recruitment and career intelligence platform built for the modern hiring lifecycle.

[![Production](https://img.shields.io/badge/production-live-brightgreen)](https://pra-eta-umber.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15.4-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Overview

PRA Talent Intelligence Platform is a full-stack SaaS recruitment platform that bridges two worlds: a **Candidate Intelligence Workspace** giving job seekers AI-powered tools to compete at the highest level, and a **Recruiter Intelligence Platform** giving hiring teams LinkedIn Recruiter-grade capabilities without the price tag.

The platform is built on Next.js 15 (App Router), Supabase (PostgreSQL + Auth + Storage), and a composable AI layer powered by OpenRouter — enabling 29 distinct AI capabilities across resume processing, candidate matching, interview intelligence, career coaching, and hiring analytics.

---

## Key Features

### Candidate Workspace
- **AI Resume Studio** — 3-panel enterprise editor with AI rewrite, ATS optimization, version history, PDF/DOCX export
- **Resume Intelligence Hub** — structural health score, ATS compatibility analysis, AI-powered improvement suggestions
- **Interview Intelligence** — streaming AI mock interviews (6 types), per-answer scoring, final report
- **Application Intelligence** — funnel visualization, win probability scoring, AI-generated application insights
- **Career Advisor** — personalized AI career coaching and path recommendations
- **Salary Insights** — AI-estimated compensation ranges by role and market
- **LinkedIn Optimizer** — AI headline, summary, and skills optimization
- **Portfolio Generator** — public portfolio pages with AI content assistance
- **Cover Letter Generator** — role-tailored AI cover letter generation
- **Skills Gap Analyzer** — identify and close competency gaps for target roles

### Recruiter Platform
- **Executive Dashboard** — real-time KPIs: open jobs, pipeline velocity, offer acceptance rate, time-to-hire
- **Hiring Pipeline** — Kanban and list views across all applicant stages
- **AI Candidate Matching** — semantic matching of candidates to job requirements with ranked reasoning
- **Candidate Intelligence** — per-candidate AI insights, suitability scoring, side-by-side comparison, PDF export
- **AI Shortlisting** — automated ranking with transparent reasoning
- **Bulk Operations** — multi-select status changes, recruiter assignment, archive
- **Interview Management** — scheduling, structured feedback collection, AI post-interview summary
- **Messaging Hub** — split-panel recruiter↔candidate inbox with AI message drafting
- **Offer Management** — offer creation, AI letter generation, accept/decline tracking
- **Hiring Analytics** — full hiring funnel with CSV export and recruiter workload breakdown
- **Resume Intelligence** — AI resume parsing and enrichment for candidate profiles
- **Recruiter Copilot** — AI assistant with multi-intent query understanding (search, analytics, advice)

### Admin Portal
- **Platform Dashboard** — company-wide metrics and platform health overview
- **User Management** — create, lock/unlock, bulk operations, role assignment
- **Multi-Tenant Company Management** — company CRUD with recruiter assignment
- **Enterprise RBAC** — granular role and permission management with capability matrix
- **Feature Flags** — data-driven feature toggles without redeployment
- **Billing Management** — Stripe-ready subscription management
- **Background Job Queue** — cron-based task processing and monitoring
- **Email Automation** — Resend-powered transactional email with template management
- **Platform Diagnostics** — live health checks (DB, AI, Queue, Email, Billing)
- **Audit Logs** — immutable activity log across all entities
- **View As Switcher** — Super Admin can preview Candidate/Recruiter UI without changing real role

### Public Surface
- **Marketing Homepage** — candidate-first with live ATS checker teaser
- **Guest ATS Checker** — full resume scoring without an account (rate-limited)
- **Guest AI Tools** — career advisor, cover letter, interview prep (session-limited)
- **Job Board** — public job listings with company profiles
- **Public Portfolios** — candidate portfolio pages at `/portfolio/[slug]`

### Platform Capabilities
- **Internationalization** — English and Arabic (RTL) across all portals
- **Dark / Light mode** — system-aware theming
- **Command Palette** — global search (⌘K)
- **Responsive design** — mobile-first, all breakpoints

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Framework** | Next.js 15.4 (App Router) | Full-stack React with Server Components, Server Actions, Edge Middleware |
| **Language** | TypeScript 5.x | End-to-end type safety |
| **UI** | React 19, Tailwind CSS 3, shadcn/ui, Radix UI | Component library on Headless UI primitives |
| **Database** | Supabase (PostgreSQL 15) | Relational DB with Row Level Security |
| **Auth** | Supabase Auth | Email/password + phone OTP + OAuth, SSR-aware |
| **Storage** | Supabase Storage | Resume file uploads (PDF/DOCX) |
| **AI** | OpenRouter (OpenAI SDK) | Access to GPT-4o-mini and other models via unified API |
| **Email** | Resend | Transactional email delivery |
| **Payments** | Stripe (webhook-ready) | Subscription billing infrastructure |
| **i18n** | next-intl 4.x | Locale routing, translations, RTL support |
| **Animations** | Framer Motion | Micro-interactions and transitions |
| **Charts** | Recharts | Dashboard analytics visualizations |
| **Forms** | React Hook Form + Zod | Type-safe form validation |
| **PDF** | @react-pdf/renderer | Resume PDF generation |
| **DOCX** | docx + mammoth | Resume DOCX generation and parsing |
| **Drag-and-drop** | @dnd-kit | Resume builder section ordering |
| **Testing** | Playwright | End-to-end test suite (101 passing) |
| **Deployment** | Vercel | Edge functions, automatic preview deployments |

---

## Screenshots

> _Screenshots will be added to `docs/images/` in a forthcoming update._

| View | Description |
|---|---|
| `docs/images/candidate-dashboard.png` | Candidate home dashboard with AI widgets |
| `docs/images/resume-studio.png` | 3-panel Resume Studio editor |
| `docs/images/recruiter-dashboard.png` | Recruiter executive dashboard with KPIs |
| `docs/images/pipeline-kanban.png` | Hiring pipeline Kanban board |
| `docs/images/admin-dashboard.png` | Super Admin platform overview |
| `docs/images/view-as-switcher.png` | View As Switcher for role previewing |

---

## Installation

### Prerequisites

- Node.js 20+ (LTS)
- npm 10+
- A [Supabase](https://supabase.com) project
- An [OpenRouter](https://openrouter.ai) API key
- A [Resend](https://resend.com) API key (optional for local dev)

### Clone and install

```bash
git clone https://github.com/hassanad70-collab/PRA-.git
cd PRA-
npm install
```

### Environment setup

```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

See [`docs/deployment/ENVIRONMENT_VARIABLES.md`](docs/deployment/ENVIRONMENT_VARIABLES.md) for full documentation of every variable.

### Database setup

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run all 49 migrations
supabase db push
```

---

## Local Development

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with HMR |
| `npm run build` | Production build |
| `npm run build:analyze` | Build with bundle analyzer |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript check (no emit) |
| `npm run test:e2e` | Run full Playwright suite |
| `npm run test:e2e:ui` | Playwright with interactive UI |

---

## Deployment

The production deployment targets Vercel. See [`docs/deployment/DEPLOYMENT_GUIDE.md`](docs/deployment/DEPLOYMENT_GUIDE.md) for the complete guide.

```bash
# Deploy to production
vercel deploy --prod
```

**Production URL:** https://pra-eta-umber.vercel.app

---

## Folder Structure

```
PRA-/
├── docs/                       # All project documentation
│   ├── README.md               # Documentation index
│   ├── architecture/           # System, C4, and codebase docs
│   ├── database/               # ERD and data dictionary
│   ├── api/                    # API reference and OpenAPI spec
│   ├── deployment/             # Deployment guide and env vars
│   ├── security/               # Security documentation
│   ├── guides/                 # User and contributor guides
│   ├── release/                # Changelog, roadmap, release notes
│   ├── adr/                    # Architecture Decision Records
│   └── images/                 # Screenshot placeholders
├── e2e/                        # Playwright end-to-end tests
├── messages/                   # i18n translation files (en.json, ar.json)
├── src/
│   ├── actions/                # Next.js Server Actions (36 modules)
│   ├── app/                    # Next.js App Router
│   │   ├── admin/              # Super Admin portal (unprefixed)
│   │   ├── api/                # REST API routes
│   │   ├── auth/               # OAuth callback
│   │   ├── invite/             # Team invite acceptance
│   │   └── [locale]/           # i18n-prefixed routes
│   │       ├── (auth)/         # Login, register, etc.
│   │       ├── ai-tools/       # Guest AI tools
│   │       ├── candidate/      # Candidate portal + workspace
│   │       ├── companies/      # Public company profiles
│   │       ├── jobs/           # Public job listings
│   │       ├── portfolio/      # Public candidate portfolios
│   │       └── recruiter/      # Recruiter portal
│   ├── components/             # React components
│   │   ├── admin/              # Admin-only components
│   │   ├── candidate/          # Candidate portal components
│   │   ├── recruiter/          # Recruiter portal components
│   │   ├── shared/             # Cross-portal shared components
│   │   ├── super-admin/        # Super Admin-only components
│   │   ├── ui/                 # shadcn/ui primitives
│   │   └── workspace/          # AI Workspace components
│   ├── i18n/                   # i18n configuration and routing
│   ├── lib/                    # Core business logic
│   │   ├── ai/                 # AI modules (29 capabilities)
│   │   ├── auth/               # Auth guards and permissions
│   │   ├── queries/            # Supabase query layer (15 modules)
│   │   ├── supabase/           # Supabase client factory
│   │   └── validations/        # Zod schemas
│   ├── middleware.ts            # Edge middleware (auth + i18n)
│   └── types/                  # TypeScript type definitions
├── supabase/
│   └── migrations/             # 49 PostgreSQL migration files
├── next.config.ts
├── playwright.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

---

## Architecture Overview

The platform uses a **layered server-first architecture**:

```
Browser → Edge Middleware (auth + locale) → Next.js Server Components
       → Server Actions / API Routes → Query Layer → Supabase (PostgreSQL)
                                    → AI Layer → OpenRouter (GPT-4o-mini)
                                    → Storage → Supabase Storage (resumes)
                                    → Email → Resend
```

See [`docs/architecture/SYSTEM_ARCHITECTURE.md`](docs/architecture/SYSTEM_ARCHITECTURE.md) for the full architecture document with C4 and Mermaid diagrams.

---

## AI Features

The platform implements 29 distinct AI capabilities through a unified `openai` SDK client pointed at OpenRouter:

| Category | Capabilities |
|---|---|
| **Resume** | Parse, improve, ATS-score, rewrite sections, tailor to job |
| **Matching** | Semantic job-to-candidate matching with ranked reasoning |
| **Interview** | Question generation, mock interview streaming, post-interview summary |
| **Career** | Career advisor, salary insights, skills gap analysis, path recommendations |
| **Recruiter** | Candidate insights, AI shortlisting, copilot multi-intent queries |
| **Communication** | Cover letter generation, candidate message drafting, offer letter generation |
| **Portfolio** | LinkedIn optimization, portfolio content assistance |
| **Guest** | Rate-limited ATS checker, career advisor, interview prep |

All AI calls are routed through `src/lib/ai/openai.ts` which reads `AI_BASE_URL` and `AI_MODEL_REASONING` from environment variables, enabling model swapping without code changes.

---

## User Roles

| Role | Portal | Description |
|---|---|---|
| `super_admin` | `/admin` | Full platform access; can preview other roles via View As Switcher |
| `recruiter` | `/[locale]/recruiter` | Manages hiring for their assigned company |
| `hr_manager` | `/[locale]/recruiter` | Same as recruiter (different capability subset) |
| `candidate` | `/[locale]/candidate` | Job seeker with full AI Career Workspace |
| Guest | `/[locale]/ai-tools` | Unauthenticated user with rate-limited AI tool access |

RBAC is enforced at three layers: Edge Middleware, Server Component layout guards, and Supabase Row Level Security policies.

See [`docs/security/SECURITY.md`](docs/security/SECURITY.md) for full RBAC documentation.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server-only service role key |
| `OPENAI_API_KEY` | ✅ | OpenRouter API key |
| `AI_BASE_URL` | ✅ | OpenRouter base URL |
| `AI_MODEL_REASONING` | ✅ | Default AI model |
| `RESEND_API_KEY` | ✅ | Email delivery key |
| `NEXT_PUBLIC_SITE_URL` | ✅ | Full site URL |
| `CRON_SECRET` | ✅ | Cron route authorization |
| `STRIPE_WEBHOOK_SECRET` | Optional | Stripe webhook validation |

Full documentation: [`docs/deployment/ENVIRONMENT_VARIABLES.md`](docs/deployment/ENVIRONMENT_VARIABLES.md)

---

## Contributing

See [`docs/guides/CONTRIBUTING.md`](docs/guides/CONTRIBUTING.md) for contribution guidelines, coding standards, branch strategy, and PR process.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Documentation

Full documentation is available in the [`/docs`](docs/README.md) directory:

- [System Architecture](docs/architecture/SYSTEM_ARCHITECTURE.md)
- [Database ERD](docs/database/DATABASE_ERD.md)
- [API Reference](docs/api/API_REFERENCE.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- [Security](docs/security/SECURITY.md)
- [User Guide](docs/guides/USER_GUIDE.md)
- [Changelog](docs/release/CHANGELOG.md)
- [Roadmap](docs/release/ROADMAP.md)
