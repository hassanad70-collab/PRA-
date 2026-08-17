# ADR-002: Supabase for Database, Auth, and Storage

**Status:** Accepted  
**Date:** 2025-Q4  
**Deciders:** Hassan Ahmed

---

## Context

The platform requires:
- A relational database with strong consistency and complex queries
- Authentication (email/password, OAuth, OTP) with SSR-compatible session management
- File storage for resume uploads (PDF/DOCX)
- Row-level access control so multi-tenant data isolation is enforced at the DB layer, not the application layer

Options considered:
1. **Supabase** — PostgreSQL + Auth + Storage as a managed service
2. **PlanetScale + Clerk + S3** — separate managed services for each concern
3. **Neon + Auth.js + S3** — serverless Postgres + framework auth + AWS storage
4. **Railway PostgreSQL + NextAuth + Cloudflare R2**

---

## Decision

We chose **Supabase** for all three concerns: database, authentication, and file storage.

---

## Rationale

### Single vendor for three concerns reduces integration surface

Auth, DB, and Storage are co-designed in Supabase: Auth tokens map directly to RLS policies, Storage buckets can use RLS backed by Auth identity. There are no cross-service JWT translation layers.

### Row Level Security is enforced by PostgreSQL, not application code

RLS policies run inside the database engine on every query. Even if an application bug bypasses the auth guard in a Server Action, the database rejects the query. This is a stronger isolation guarantee than application-layer checks alone.

### The multi-tenant model maps cleanly to RLS

Company-scoped data isolation is implemented as `company_id` foreign keys on all tenant tables with `auth.uid()` → `profiles.id` → `recruiters.company_id` RLS chains. This pattern scales to many companies without application changes.

### Supabase Auth is SSR-compatible via `@supabase/ssr`

The `@supabase/ssr` package creates an SSR-aware auth client that reads and writes the session cookie correctly in Next.js Server Components, Server Actions, and Edge Middleware. JWT-in-cookie with HttpOnly is the result.

### Local development parity with Supabase CLI

`supabase start` runs a full local Supabase stack (PostgreSQL, Auth, Storage, Studio) in Docker. Migration files applied locally are the same files pushed to production. There is no "different DB for dev" problem.

---

## Consequences

### Positive
- RLS enforces multi-tenant isolation at the database engine level
- Auth, DB, and Storage share the same identity model
- Local dev parity via Supabase CLI
- 49 migration files give a complete audit trail of every schema change

### Negative / Watch points
- **No generated Database generic**: this project does not use `@supabase/supabase-js`'s generated `Database` type. Narrowing embedded-relation selects breaks cardinality inference. Fix with `.returns<T>()` on queries that embed related tables (see `docs/adr/i18n-architecture-gotchas.md` — actually see [`supabase_query_typing_gotcha.md`](../../memory/supabase_query_typing_gotcha.md)).
- **Service role key bypasses RLS**: `SUPABASE_SERVICE_ROLE_KEY` must never be used client-side. Every Server Action that uses it must have its own explicit role check.
- **Empty string UUID rejection**: Supabase throws `22P02` when an empty string is passed as a UUID parameter. Always guard optional UUID fields (e.g., `company_id`) with existence checks before querying.
- Supabase is a managed service. Outages affect the entire platform (no local fallback in production).

---

## Related

- ADR-006: RBAC design
- Memory: `supabase_query_typing_gotcha.md`
