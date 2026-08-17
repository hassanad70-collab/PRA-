# Deployment Guide

## Overview

The PRA Talent Intelligence Platform is deployed on **Vercel** using the Next.js preset. This document covers the complete deployment workflow from local development to production.

**Production URL:** https://pra-eta-umber.vercel.app

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| Node.js | 20+ (LTS) | Runtime |
| npm | 10+ | Package manager |
| Vercel CLI | Latest | Deployment |
| Supabase CLI | Latest | Database migrations |
| Git | Any | Version control |

```bash
npm install -g vercel supabase
```

---

## Environment Setup

See [`ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) for every required variable and its purpose.

```bash
cp .env.example .env.local
# Fill in all values before running locally
```

---

## Database Setup

### Initial setup (new project)

```bash
# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# Push all 50 migrations
supabase db push
```

### Applying new migrations

```bash
# Generate a new migration
supabase migration new migration_name

# Apply to local
supabase db reset

# Apply to production
supabase db push
```

### Migration inventory

All migrations live in `supabase/migrations/`. There are 50 migration files covering:
- Migrations 0001–0010: Core schema (extensions, enums, users, companies, jobs, applications)
- Migrations 0011–0020: Auth, profiles, resume storage, ATS scoring
- Migrations 0021–0030: Recruiter workspace, pipeline stages, multi-tenant model
- Migrations 0031–0040: Job discovery, search history, alerts, notifications
- Migrations 0041–0050: Career intelligence, portfolio, billing, messaging, offers, hiring completion, resume upload v2

---

## Local Development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:3000`.

**Hot Module Replacement** is active for all client components. Server Components and Server Actions require a page reload to pick up changes.

---

## Build

```bash
npm run build
```

The build validates TypeScript, runs ESLint, and generates the production bundle. A successful build with no errors is required before deployment.

```bash
npm run type-check   # TypeScript only
npm run lint         # ESLint only
```

---

## Deployment

### IMPORTANT: GitHub push does NOT auto-deploy

Vercel is connected to the GitHub repository, but auto-deployments are **disabled**. All production deployments must be triggered manually:

```bash
vercel deploy --prod
```

This command:
1. Uploads the project to Vercel
2. Builds using the Next.js preset
3. Promotes the build to the production alias

### Preview deployments

```bash
vercel deploy
```

Creates a preview URL (not promoted to production alias).

### Vercel project configuration

| Setting | Value |
|---|---|
| Framework | Next.js |
| Build Command | `npm run build` |
| Output Directory | `.next` |
| Node.js Version | 20.x |
| Production alias | `pra-eta-umber.vercel.app` |

---

## Cron Jobs

Cron jobs are defined in `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/job-alerts", "schedule": "0 8 * * *" },
    { "path": "/api/cron/process-queue", "schedule": "*/5 * * * *" },
    { "path": "/api/cron/cleanup", "schedule": "0 2 * * *" }
  ]
}
```

All cron routes require the `Authorization: Bearer CRON_SECRET` header, which Vercel injects automatically.

---

## Environment Variables in Vercel

Set all variables in the Vercel dashboard under **Project → Settings → Environment Variables**.

Variables prefixed `NEXT_PUBLIC_` are embedded in the client bundle at build time. All others are server-only.

Required variables for production (see [`ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md)):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `AI_BASE_URL`
- `AI_MODEL_REASONING`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `CRON_SECRET`

---

## Post-Deployment Checklist

After every production deployment:

- [ ] Open https://pra-eta-umber.vercel.app — homepage loads
- [ ] Log in as `Hassan.ad70@gmail.com` (super_admin) — admin dashboard accessible
- [ ] Platform Diagnostics (`/admin/diagnostics`) — all health checks green
- [ ] Switch to Candidate view via View As Switcher — candidate dashboard loads
- [ ] Switch to Recruiter view — recruiter dashboard loads
- [ ] Run key Playwright tests against production:
  ```bash
  PLAYWRIGHT_BASE_URL=https://pra-eta-umber.vercel.app npm run test:e2e
  ```

---

## Rollback

To roll back to a previous deployment:

```bash
# List recent deployments
vercel ls

# Promote a previous deployment
vercel promote DEPLOYMENT_URL --scope YOUR_SCOPE
```

---

## Monitoring

- **Vercel Dashboard** — build logs, function execution logs, cron job history
- **Supabase Dashboard** — query logs, auth events, storage usage
- **Platform Diagnostics** — `/admin/diagnostics` — live health checks for DB, AI, Queue, Email, Billing

---

## Stripe Webhook (Production)

Register the webhook endpoint in the Stripe dashboard:
- URL: `https://pra-eta-umber.vercel.app/api/webhooks/stripe`
- Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copy the signing secret to `STRIPE_WEBHOOK_SECRET` environment variable
