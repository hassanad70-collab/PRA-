# ADR-006: Three-Layer RBAC Design

**Status:** Accepted  
**Date:** 2026-Q1  
**Deciders:** Hassan Ahmed

---

## Context

The platform serves three distinct user types (candidate, recruiter/hr_manager, super_admin) across three separate portal trees. We needed an access control model that:
- Prevents cross-portal access at the routing layer
- Prevents unauthorized mutations at the application layer
- Prevents data leakage at the database layer
- Supports a multi-tenant model where recruiters only see their company's data
- Allows super_admin to inspect any part of the system

---

## Decision

We implement **three independent RBAC layers** that must all pass for any privileged operation to succeed:

1. **Edge Middleware** — route-level guard on every request
2. **Server Action / Layout Guard** — application-level check in auth library
3. **Supabase RLS** — database-level policy enforcement

Additionally, a **fine-grained capability system** (`role_capabilities` table) controls feature-level access within the recruiter portal.

---

## Layer 1: Edge Middleware

`src/middleware.ts` runs on every HTTP request before any page renders. It:
1. Validates the Supabase session JWT via `getUser()`
2. Detects locale from the URL prefix
3. Enforces portal access:
   - `/admin/*` → requires `super_admin` role
   - `/[locale]/recruiter/*` → requires `recruiter` or `hr_manager` role (or super_admin in View As mode)
   - `/[locale]/candidate/*` → requires `candidate` role (or super_admin in View As mode)
4. Redirects unauthenticated or unauthorized requests to the appropriate login page

The middleware is the first and cheapest line of defense — it stops unauthorized requests before any database query runs.

### View As exception

When a super_admin has the `pra-view-as` cookie set to `"candidate"` or `"recruiter"`, the middleware allows them through those route guards. The super_admin's actual Supabase role is unchanged.

---

## Layer 2: Application Guards

`src/lib/auth/guards.ts` provides:
- `requireAuth(supabase, allowedRoles)` — validates session and role; throws redirect if unauthorized
- `getUser(supabase)` — returns the current user or null

Called in:
- Server Component layouts (e.g., `src/app/[locale]/recruiter/layout.tsx`)
- Server Actions (every mutation validates the caller's role)
- API Routes (streaming and webhook handlers)

This layer is independent of middleware — it re-validates the session using the same Supabase client, so a bug in middleware cannot bypass it.

---

## Layer 3: Supabase Row Level Security

Every table has RLS enabled with policies that enforce:

**User isolation (candidates)**
```sql
-- candidates can only access their own profile
CREATE POLICY "own_profile" ON profiles
  FOR ALL USING (auth.uid() = id);
```

**Company isolation (recruiters)**
```sql
-- recruiters can only access their company's applications
CREATE POLICY "company_applications" ON job_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recruiters r
      WHERE r.user_id = auth.uid()
        AND r.company_id = (
          SELECT company_id FROM jobs WHERE id = job_id
        )
    )
  );
```

**Admin access**
```sql
-- super_admin can read all data
CREATE POLICY "super_admin_read_all" ON job_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
```

---

## Capability System

The `role_capabilities` table and `has_capability()` SQL function implement feature-level permissions within the recruiter portal. Examples:
- `can_post_jobs` — permission to create job listings
- `can_view_salary` — permission to see compensation data
- `can_invite_team` — permission to invite new team members

These are checked in Server Actions before performing the relevant operation. The super_admin can edit capabilities per-role in `/admin/rbac`.

---

## Consequences

### Positive
- Defense in depth: a bug in any one layer doesn't compromise security
- Multi-tenant isolation is enforced at the DB engine level (RLS), not just application code
- The View As Switcher can grant UI access without changing DB access
- Fine-grained capability system enables recruiter role differentiation

### Negative / Watch points
- **Three places to update for new roles**: adding a new role requires updates to middleware, auth guards, and RLS policies. All three must be in sync.
- **RLS policy complexity grows with schema**: every new table needs RLS policies. The pattern is established but the volume adds maintenance surface.
- **Service role key bypasses RLS**: all Server Actions using `SUPABASE_SERVICE_ROLE_KEY` are effectively outside RLS enforcement and rely on application-layer checks only.

---

## Related

- ADR-002: Supabase (RLS implementation)
- ADR-007: View As Switcher (super_admin bypass)
- Migration `ac3e7f8`: Initial RBAC tables
- Migration `0048`: Company model and recruiter team
