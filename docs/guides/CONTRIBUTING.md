# Contributing Guide

## Development Philosophy

This codebase follows a **stability-first, minimal-abstraction** approach:
- Stability > code quality > maintainability > scalability > performance > speed
- Fix the actual bug; don't refactor surrounding code while you're at it
- No premature abstractions — three similar lines beat an abstraction for two
- No speculative features — build what the task requires, no more

---

## Getting Started

### Prerequisites

- Node.js 20+ (LTS)
- npm 10+
- A Supabase project (or use the shared dev instance)
- An OpenRouter API key

### Setup

```bash
git clone https://github.com/hassanad70-collab/PRA-.git
cd PRA-
npm install
cp .env.example .env.local
# Fill in environment variables — see docs/deployment/ENVIRONMENT_VARIABLES.md
npm run dev
```

---

## Branch Strategy

| Branch | Purpose |
|---|---|
| `main` | Production-ready code. All deployments target this branch. |
| `feature/*` | New features or enhancements |
| `fix/*` | Bug fixes |
| `docs/*` | Documentation-only changes |

All work happens on feature branches. Merge to `main` via PR (or direct commit for solo development).

---

## Coding Standards

### TypeScript

- All files are TypeScript. No `any` without a comment explaining why.
- Use `type` for unions and intersections; `interface` for object shapes you'll extend.
- Co-locate types with the code that uses them. Only move to `src/types/` if three or more files need the same type.

### React / Next.js

- Default to **Server Components**. Add `"use client"` only when you need interactivity (event handlers, browser APIs, client state).
- **Server Actions** for all mutations. No API routes for data writes unless the client needs streaming.
- Never call Supabase from client components directly. Read data in Server Components; mutate via Server Actions.

### File organization

```
src/actions/        ← All "use server" mutations
src/app/            ← Next.js App Router (pages, layouts, API routes)
src/components/     ← React components (portal-specific + shared)
src/lib/
  ai/               ← AI modules (one file per capability)
  auth/             ← Auth guards
  email/            ← Email dispatch
  queries/          ← Read-only DB modules
  supabase/         ← Client factories (browser, server, middleware)
  validations/      ← Zod schemas
src/types/          ← Shared TypeScript types
```

### Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `resume-builder.ts` |
| Components | PascalCase | `ResumeBuilder.tsx` |
| Server Actions | camelCase functions | `updateResume()` |
| Database tables | snake_case | `job_applications` |
| Environment variables | SCREAMING_SNAKE_CASE | `NEXT_PUBLIC_SUPABASE_URL` |

### Comments

Write no comments by default. Only add one when the **why** is non-obvious:
- A hidden constraint
- A workaround for a specific bug
- Behavior that would surprise a reader

Do not comment what the code does — well-named identifiers do that.

---

## Database Changes

All schema changes must go through a migration:

```bash
supabase migration new your_migration_name
# Edit the generated file in supabase/migrations/
supabase db reset   # Apply locally
supabase db push    # Apply to production (after code is ready)
```

**Rules:**
- One concern per migration file
- Migrations are append-only — never edit an existing migration
- Add RLS policies for every new table
- Update `docs/database/DATA_DICTIONARY.md` and `docs/database/DATABASE_ERD.md` for significant schema changes

---

## Testing

### End-to-end tests (Playwright)

```bash
npm run test:e2e           # Headless
npm run test:e2e:ui        # Interactive UI
```

All 101 tests must pass before merging to main. Tests are in `e2e/`.

**Test accounts (local dev):**

| Role | Email | Password |
|---|---|---|
| super_admin | `admin@test.com` | `password` |
| recruiter | `recruiter@test.com` | `password` |
| candidate | `candidate@test.com` | `password` |

### What to test

For new features:
- Happy path (primary user flow)
- Key edge cases (empty state, error state, validation)
- Role isolation (feature is inaccessible to wrong role)

For bug fixes:
- A test that reproduces the bug (should fail before fix, pass after)

---

## AI Module Guidelines

All AI capabilities live in `src/lib/ai/`. When adding a new capability:

1. Create a new file (e.g., `src/lib/ai/my-capability.ts`)
2. Use the shared `openai` client from `src/lib/ai/openai.ts`
3. Keep prompts in the module file (no separate prompt directory)
4. Return typed data — define an interface for the response shape
5. For streaming: return `ReadableStream<string>`
6. For structured JSON: parse with `JSON.parse()` and validate the shape

Never call OpenRouter directly — always go through the shared client. This ensures the model and base URL are controlled by environment variables.

---

## Pull Request Process

1. Create a branch from `main`
2. Write your changes
3. Run `npm run type-check && npm run lint && npm run test:e2e`
4. Open a PR with:
   - A short title describing **what** changed
   - A body explaining **why** (motivation, what problem this solves)
   - Screenshots for any UI changes
5. PR is merged when all checks pass

---

## Deployment

After merging to `main`:

```bash
vercel deploy --prod
```

GitHub push does **not** auto-deploy. Manual deployment is required. See [`docs/deployment/DEPLOYMENT_GUIDE.md`](../deployment/DEPLOYMENT_GUIDE.md).

---

## i18n

All user-facing strings must be added to both translation files:
- `messages/en.json` (English)
- `messages/ar.json` (Arabic)

Use `next-intl`'s `useTranslations()` in client components and `getTranslations()` in server components. Never hard-code English strings in component files.

For RTL layout considerations, see `docs/architecture/i18n-architecture-gotchas.md`.
