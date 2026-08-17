# ADR-001: Next.js App Router (Server Components)

**Status:** Accepted  
**Date:** 2025-Q4  
**Deciders:** Hassan Ahmed

---

## Context

We needed a React framework for a complex multi-portal SaaS application with three distinct user types (candidate, recruiter, admin), server-side data fetching, authentication, internationalization, and API routes — all in a single deployment.

The primary options considered were:
1. **Next.js App Router** (React Server Components)
2. **Next.js Pages Router** (classic SSR/SSG)
3. **Remix**
4. **SvelteKit**

---

## Decision

We chose **Next.js 15 with the App Router and React Server Components**.

---

## Rationale

### Server Components eliminate client/server waterfalls

With RSC, data fetching happens on the server during render. There is no client-side fetch-then-render cycle for authenticated, data-heavy dashboards. The recruiter pipeline, candidate dashboard, and admin analytics all benefit directly.

### Co-located layouts enable the three-portal architecture

The App Router's nested layouts (`layout.tsx`) allow each portal to have its own auth guard, navigation shell, and data context without sharing a root layout. The `/admin`, `/[locale]/candidate`, and `/[locale]/recruiter` trees are fully independent.

### Server Actions eliminate API route boilerplate

All data mutations are Server Actions (`"use server"` functions). There is no need to write REST endpoint handlers for standard CRUD — the framework handles the POST transport. This cut the API surface significantly.

### Native i18n routing with next-intl

The `[locale]` dynamic segment provides a first-class slot for internationalization routing. Combined with `next-intl`, locale detection and RTL support integrate cleanly without a separate routing layer.

### Vercel deployment is frictionless

Next.js and Vercel are designed together. Cron jobs, edge functions, ISR, and OG image generation all work without additional infrastructure.

---

## Consequences

### Positive
- Server Components reduce Time to First Contentful Paint on data-heavy pages
- No REST API needed for internal data mutations
- Nested layouts match the three-portal domain model exactly
- Vercel deployment is one command

### Negative / Watch points
- **Cross-tree navigation** (e.g., from `/admin` to `/[locale]/recruiter`) requires `window.location.href` rather than `router.push()`, because they are different layout segment trees. `router.push()` completes server-side but doesn't update the browser URL. See ADR-007 for the View As Switcher implications.
- **Middleware runs on every request** — it must be fast (edge-compatible only, no Node.js APIs)
- Client Components must be explicitly marked `"use client"` — implicit client boundaries are a source of confusion for new contributors
- The App Router's caching model (fetch cache, Data Cache, Full Route Cache) requires understanding to avoid stale data bugs

---

## Related

- ADR-004: Server Actions pattern
- ADR-005: next-intl for i18n
- ADR-007: View As Switcher (cross-tree navigation)
