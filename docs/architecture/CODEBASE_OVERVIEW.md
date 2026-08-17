# Codebase Overview

> A developer's guide to the PRA Talent Intelligence Platform codebase.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [App Router](#2-app-router)
3. [Server Actions](#3-server-actions)
4. [Query Layer](#4-query-layer)
5. [Components](#5-components)
6. [AI Services](#6-ai-services)
7. [Middleware](#7-middleware)
8. [Internationalization](#8-internationalization)
9. [Authentication Flow](#9-authentication-flow)
10. [Database Access](#10-database-access)
11. [Utilities](#11-utilities)
12. [Testing](#12-testing)
13. [Coding Conventions](#13-coding-conventions)

---

## 1. Project Structure

```
src/
├── actions/          # Server Actions (36 modules — all mutations live here)
├── app/              # Next.js App Router (pages, layouts, API routes)
├── components/       # React components (130+ files across 9 directories)
├── i18n/             # next-intl configuration
├── lib/              # Core business logic (queries, AI, utilities, validations)
├── middleware.ts     # Edge middleware entry point
└── types/            # TypeScript type definitions
```

---

## 2. App Router

### Route Trees

The application has three distinct authenticated trees and one public tree:

#### `/admin/*` — Super Admin Portal
- Lives at `src/app/admin/`
- No locale prefix — English only
- Protected: middleware redirects non-`super_admin` roles to their home
- Layout: `src/app/admin/layout.tsx` — flat `navItems` list

#### `/[locale]/candidate/*` — Candidate Portal
- Lives at `src/app/[locale]/candidate/`
- Locale-prefixed (en/ar)
- Protected: middleware redirects non-`candidate` roles (super_admin bypassed for View As)
- Layout: `src/app/[locale]/candidate/layout.tsx` — collapsible grouped nav

#### `/[locale]/recruiter/*` — Recruiter Portal
- Lives at `src/app/[locale]/recruiter/`
- Locale-prefixed (en/ar)
- Protected: `STAFF_ROLES` (recruiter, hr_manager, super_admin) allowed through middleware
- Layout: `src/app/[locale]/recruiter/layout.tsx` — grouped nav + Copilot dialog

#### `/[locale]/*` — Public Surface
- Auth pages under `(auth)/` route group (no nav)
- Guest AI tools at `ai-tools/`
- Public job listings at `jobs/[id]/`
- Company profiles at `companies/[slug]/`
- Portfolio pages at `portfolio/[slug]/`

### Page Conventions

Every page is an `async` Server Component:

```typescript
// Standard page pattern
export default async function RecruiterDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await getCurrentUser();
  if (!user) redirect({ href: "/login", locale });

  const data = await getSomething(user.id);
  return <ClientComponent data={data} />;
}
```

### Layouts

Layouts perform:
1. Authentication check (redirect if unauthenticated)
2. Role check (redirect if wrong role)
3. Data fetching for nav items (badges, counts)
4. Shell rendering (DashboardShell)

---

## 3. Server Actions

Server Actions live in `src/actions/` and follow a consistent pattern:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/queries/candidate";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({ ... });

export async function myAction(input: unknown) {
  const user = await getCurrentUser();
  if (!user) return { error: "Unauthorized" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.message };

  const supabase = await createClient();
  const { error } = await supabase.from("table").insert(parsed.data);
  if (error) return { error: error.message };

  revalidatePath("/relevant/path");
  return { success: true };
}
```

### Action Modules

| File | Domain | Key Actions |
|---|---|---|
| `auth.ts` | Authentication | `signIn`, `signUp`, `signOut`, `completeProfile` |
| `jobs.ts` | Job management | `createJob`, `updateJob`, `publishJob`, `deleteJob` |
| `applications.ts` | Applications | `applyToJob`, `updateApplicationStatus`, `withdrawApplication` |
| `interviews.ts` | Interviews | `scheduleInterview`, `submitFeedback`, `generateAISummary` |
| `resume.ts` | Resume files | `uploadResume`, `setPrimaryResume`, `deleteResume` |
| `resume-builder.ts` | Builder drafts | `createDraft`, `updateDraft`, `finalizeDraft`, `importFromPrimary` |
| `studio.ts` | Studio editor | `createStudioDraft`, `aiRewrite`, `aiTailor`, `exportPDF` |
| `resume-intelligence.ts` | AI suggestions | `generateSuggestions`, `applySuggestion`, `dismissSuggestion` |
| `messaging.ts` | Messages | `sendMessage`, `markThreadRead`, `getThreadMessages` |
| `offers.ts` | Offers | `createOffer`, `generateOfferLetter`, `acceptOffer`, `declineOffer` |
| `bulk-applications.ts` | Bulk ops | `bulkUpdateStatus`, `bulkAssignRecruiter`, `bulkArchive` |
| `workspace.ts` | AI Workspace | `generateCareerAnalysis`, `savePortfolioProject`, `generateLinkedIn` |
| `admin-users.ts` | User admin | `createUser`, `lockUser`, `unlockUser`, `deleteUser`, `changeRole` |
| `admin-companies.ts` | Company admin | `createCompany`, `updateCompany`, `assignRecruiter` |
| `admin-feature-flags.ts` | Feature flags | `toggleFlag`, `createFlag`, `deleteFlag` |
| `recruiter-copilot.ts` | Copilot AI | `sendCopilotMessage` (multi-intent routing) |

---

## 4. Query Layer

The query layer (`src/lib/queries/`) contains **pure async functions** that read from Supabase. They never write, never redirect, and never call `revalidatePath`.

```typescript
// Standard query pattern
export async function getJobsForCompany(
  companyId: string,
  options?: { status?: JobStatus }
): Promise<Job[]> {
  const supabase = await createClient();
  const query = supabase
    .from("jobs")
    .select("id, title, status, created_at, applications(count)")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (options?.status) query.eq("status", options.status);

  const { data, error } = await query;
  if (error) { console.error("getJobsForCompany failed", error); return []; }
  return data ?? [];
}
```

**Conventions:**
- Accept a pre-created Supabase client or call `createClient()` internally
- Catch errors silently and return typed empty results (to avoid crashing Server Components)
- Never throw — Server Components call these in `Promise.all()` and expect graceful degradation

---

## 5. Components

### Organization

```
src/components/
├── admin/         # Admin-portal-specific components (18 files)
├── ai-tools/      # Guest AI tool UIs (3 files)
├── auth/          # Auth forms (7 files)
├── candidate/     # Candidate portal components (25 files)
│   ├── resume-builder/        # Builder sub-components (5)
│   └── resume-intelligence/   # Intelligence sub-components (3)
├── guest/         # Guest-only components (2 files)
├── marketing/     # Homepage/landing components (12 files)
├── recruiter/     # Recruiter portal components (30 files)
│   └── charts/    # Recharts-based chart components (6)
├── shared/        # Cross-portal shared utilities (11 files)
├── super-admin/   # Super Admin-only components (1 file)
├── ui/            # shadcn/ui primitives (20 files)
└── workspace/     # AI Career Workspace components (13 files)
```

### shadcn/ui (`src/components/ui/`)

Provides the base design system: `Button`, `Card`, `Dialog`, `Input`, `Select`, `Table`, `Tabs`, `Badge`, `Avatar`, `Tooltip`, `Skeleton`, `Progress`, `Switch`, `Checkbox`, `Textarea`, `Popover`, `Label`, `Separator`, `DropdownMenu`, `Sonner`.

All are pre-configured with the project's Tailwind theme and support dark mode via CSS variables.

### DashboardShell (`src/components/shared/dashboard-shell.tsx`)

The single most reused component. Renders the three-column layout (sidebar nav, topbar, main content) for all three authenticated portals. Accepts:
- `navItems: NavItem[]` or `navGroups: NavGroup[]` — flat list or collapsible groups
- `user` — for the avatar/name display and sign-out
- `headerExtra` — slot for portal-specific topbar additions (LanguageSwitcher, ViewAsSwitcher, CopilotDialog)
- `settingsHref` — settings link in the avatar dropdown

### Chart Components (`src/components/recruiter/charts/`)

Recharts-based components wrapping `ResponsiveContainer` for the recruiter dashboard:
- `TrendChart` — line chart for applications over time
- `FunnelChart` — bar chart for hiring funnel stages
- `TopSkillsChart` — horizontal bar chart for top skills
- `DepartmentChart` — pie chart for department breakdown
- `TimeToHireChart` — bar chart for time-to-hire distribution
- `SourceBreakdownChart` — pie chart for application sources

All are wrapped in `DynamicCharts` (`src/components/shared/dynamic-charts.tsx`) for code-splitting — charts are imported with `next/dynamic` and `{ ssr: false }`.

---

## 6. AI Services

### Shared Client (`src/lib/ai/openai.ts`)

```typescript
import OpenAI from "openai";
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1",
});
```

**Model selection** uses `process.env.AI_MODEL_REASONING` (default: `openai/gpt-4o-mini`).

### AI Module Pattern

```typescript
// Standard AI module pattern
export async function generateJobDescription(input: {
  title: string;
  requirements: string[];
}): Promise<string> {
  const completion = await client.chat.completions.create({
    model: process.env.AI_MODEL_REASONING ?? "openai/gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildPrompt(input) },
    ],
    temperature: 0.7,
  });
  return completion.choices[0]?.message?.content ?? "";
}
```

### Text Extraction (`src/lib/ai/extract-text.ts`)

Before sending files to the AI, text is extracted from uploads:
- **PDF**: uses `pdf-parse` (server-side only, in `serverExternalPackages`)
- **DOCX**: uses `mammoth` (server-side only)

Both packages are listed in `next.config.ts > serverExternalPackages` to prevent bundling into the client.

---

## 7. Middleware

### Entry (`src/middleware.ts`)

```typescript
export async function middleware(request: NextRequest) {
  // 1. Always: refresh Supabase session
  const sessionResponse = await updateSession(request);
  if (sessionResponse.headers.get("location")) return sessionResponse; // auth redirect

  // 2. Conditionally: locale routing (skip admin/api/auth/invite)
  if (isExcludedFromLocaleRouting(pathname)) return sessionResponse;
  const intlResponse = intlMiddleware(request);

  // 3. Merge refreshed session cookies onto intl response
  sessionResponse.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie")
      intlResponse.headers.append(key, value);
  });
  return intlResponse;
}
```

**Matcher**: Everything except `_next/static`, `_next/image`, `favicon.ico`, and static image files.

### Auth Middleware (`src/lib/supabase/middleware.ts`)

Handles:
1. `auth.getUser()` — checks session validity
2. `profiles` lookup — gets role, is_active, deleted_at
3. Route-role matching — redirects mis-routed users to their home
4. `super_admin` View As bypass — allows super_admin through candidate routes

---

## 8. Internationalization

### Routing (`src/i18n/routing.ts`)

```typescript
export const locales = ["en", "ar"] as const;
export const defaultLocale = "en";
```

All public routes (auth, candidate portal, recruiter portal, marketing) are prefixed with the locale. The admin portal is excluded.

### Navigation (`src/i18n/navigation.ts`)

Exports locale-aware `Link`, `redirect`, and `useRouter` wrappers that automatically prepend the current locale to paths. All internal navigation uses these instead of Next.js native exports.

### Translations

Translation files are `messages/en.json` and `messages/ar.json`, organized into namespaces:

```
Common.*          Shared across portals
Candidate.Nav.*   Candidate navigation labels
Candidate.*       Candidate page strings
Recruiter.Nav.*   Recruiter navigation labels
Recruiter.*       Recruiter page strings
```

Server Components use `getTranslations("Namespace")` from `next-intl/server`.
Client Components use `useTranslations("Namespace")`.

---

## 9. Authentication Flow

### Sign In

```
1. User submits /login form
2. signIn() action called:
   a. supabase.auth.signInWithPassword(email, password)
   b. On success: redirect to role-appropriate home
   c. On failure: return { error: "Invalid credentials" }
3. Supabase sets sb-* cookies on the response
4. Middleware reads cookies on next request
```

### Session Refresh

Every request triggers `updateSession()` in middleware, which calls `supabase.auth.getUser()`. Supabase SSR automatically refreshes the access token from the refresh token if needed, setting new cookies in the response.

### Sign Out

```
1. User clicks Sign Out (from DashboardShell)
2. signOut() action:
   a. supabase.auth.signOut()
   b. redirect to /login
3. Supabase clears sb-* cookies
```

---

## 10. Database Access

### Supabase Client Factory

Three clients serve different contexts:

| Module | Usage |
|---|---|
| `src/lib/supabase/client.ts` | Browser-side (Client Components only) |
| `src/lib/supabase/server.ts` | Server-side (Server Components, Actions) — reads cookies |
| `src/lib/supabase/admin.ts` | Server-side with service role key — bypasses RLS |

The service role client (`admin.ts`) is used **only** in admin actions and AI pipelines that need to read across company boundaries. It is never imported in client-side code.

### Type Safety

`src/types/database.ts` contains the TypeScript type definitions generated from the Supabase schema. Query results are typed using `Database["public"]["Tables"]["table_name"]["Row"]` patterns, or wrapped with `.returns<T>()` for complex RPC calls.

---

## 11. Utilities

### `src/lib/utils.ts`

Core utility functions:
- `cn(...classes)` — Tailwind class merging via `tailwind-merge` + `clsx`
- `formatDate(date)` — locale-aware date formatting
- `formatRelativeTime(date)` — "2 hours ago" relative time
- `initials(name)` — "John Doe" → "JD" for avatars

### `src/lib/env.ts`

```typescript
export function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}
```

Used by the Supabase client factory to fail fast on missing configuration.

### `src/lib/rate-limit.ts`

Simple in-memory rate limiting for guest AI tools. Limits calls per IP address per time window. Not suitable for distributed environments — intended for development/demo use.

### `src/lib/validations/`

Zod schemas for all user-facing inputs:
- `auth.ts` — login, register, phone OTP schemas
- `job.ts` — job creation and update schema
- `profile.ts` — candidate profile update schema
- `company.ts` — company creation/update schema
- `interview.ts` — interview scheduling schema
- `team.ts` — invite and role management schemas

---

## 12. Testing

### Playwright E2E (`e2e/`)

The project uses Playwright for end-to-end testing against a seeded test database. The suite includes 101 passing tests across 22 spec files.

**Test categories:**
- Authentication flows (login, register, phone OTP, sign out)
- Admin portal (user management, company management, diagnostics)
- Candidate portal (dashboard, applications, resume upload, workspace tools)
- Recruiter portal (job management, pipeline, interviews, offers, messaging)
- View As Switcher (super_admin cross-portal navigation)
- i18n (locale switching, Arabic RTL rendering)
- Guest tools (ATS checker rate limiting)

**Test accounts** (seeded in test DB):
- `e2e.admin@example.test` — super_admin
- `e2e.candidate@example.test` — candidate
- `e2e.recruiter@example.test` — recruiter

**Run tests:**
```bash
npm run test:e2e           # headless
npm run test:e2e:ui        # with Playwright UI
npm run test:e2e:report    # view last report
```

---

## 13. Coding Conventions

### File Naming
- Pages: `page.tsx` (Next.js convention)
- Layouts: `layout.tsx`
- Components: `kebab-case.tsx`
- Actions: `kebab-case.ts` (domain grouped, e.g., `admin-users.ts`)
- Queries: `kebab-case.ts` (domain grouped)
- AI modules: `kebab-case.ts` (capability named, e.g., `resume-parser.ts`)

### Import Paths
All imports use the `@/` alias (resolves to `src/`):
```typescript
import { getCurrentUser } from "@/lib/queries/candidate";
import { Button } from "@/components/ui/button";
```

### Comments
Comments are written only when the **why** is non-obvious (a workaround, a hidden constraint, a subtle invariant). What the code does should be clear from names alone.

### Error Handling
- Server Actions return `{ error: string }` on failure — never throw
- Query functions catch errors and return empty results — never throw
- Client Components display errors from action returns using `sonner` toasts

### `"use client"` Boundary
Only components that need browser APIs, event handlers, or React state are marked `"use client"`. Server Components are the default and preferred. Client components receive all their data as props — they never fetch data directly.
