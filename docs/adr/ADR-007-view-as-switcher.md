# ADR-007: View As Switcher — Cookie-Based Role Preview

**Status:** Accepted  
**Date:** 2026-08-09  
**Deciders:** Hassan Ahmed

---

## Context

The Super Admin account (`super_admin` role) was always redirected to `/admin` and had no way to inspect the Candidate or Recruiter UI in the real application context. This made it difficult to:
- Verify UI features as they were developed
- Debug role-specific issues without creating a separate test account
- Demonstrate the platform to stakeholders without role-switching accounts

Requirements:
- Super Admin must be able to preview Candidate and Recruiter UIs
- The admin's actual Supabase role must not change
- All RBAC and RLS must remain intact (no privilege escalation)
- The switch must be reversible from within the target portal

---

## Decision

We implement a **cookie-based View As switcher** (`pra-view-as`) that:
1. Stores the current view selection in a non-HttpOnly client-writable cookie
2. Is read by Edge Middleware to permit super_admin through candidate/recruiter route guards
3. Uses hard navigation (`window.location.href`) to switch between portal trees

---

## Implementation

### Cookie

- **Name:** `pra-view-as`
- **Values:** `""` (default — admin view), `"candidate"`, `"recruiter"`
- **TTL:** 7 days
- **HttpOnly:** No (client-writable — the browser must be able to set it)
- **SameSite:** Lax
- **Secure:** Yes in production

### Component

`src/components/super-admin/view-as-switcher.tsx` — amber dropdown rendered in the `headerExtra` slot of all three portal layouts. Shows current view, available options, and disabled placeholder for unreleased views.

### Middleware modification

`src/middleware.ts` reads `pra-view-as` and, when the session role is `super_admin` and the cookie is set to `"candidate"` or `"recruiter"`, allows the request through the respective portal route guard.

---

## Key Design Decisions

### Hard navigation required for cross-tree switching

`/admin` (no locale prefix) and `/[locale]/candidate`, `/[locale]/recruiter` (with locale prefix) are separate Next.js App Router layout segment trees. Navigating between them with `router.push()`:
- Triggers a server response (HTTP 200)
- Does NOT update the browser URL bar
- Does NOT re-execute the root layout or middleware-driven layout switches

**Solution:** Use `window.location.href = destination` for hard navigation. This triggers a full page load, which correctly re-runs middleware, loads the new layout tree, and updates the browser URL.

This is a hard constraint of the Next.js App Router's segment-tree architecture, not a bug.

### No early return when cookie already matches view

An early guard `if (opt.value === viewAs) return` was initially added to prevent unnecessary navigation. This caused a regression: when returning from the candidate portal to admin, the cookie was cleared client-side but the React state still showed `"candidate"`, making the button appear to do nothing.

**Solution:** Remove the early return. Always write the cookie and navigate, even if the current value matches. Hard navigation is cheap enough to absorb.

### Recruiter dashboard UUID guard

When super_admin views the Recruiter portal via View As, they have no row in the `recruiters` table, so `companyId` is `""` (empty string). Supabase throws `22P02: invalid input syntax for type uuid: ""` when this is passed to any UUID-typed query parameter.

**Solution:** Guard all company-scoped dashboard queries:
```typescript
const companyId = recruiter?.company_id ?? "";
const hasCompany = companyId !== "";
const stats = hasCompany ? await getCompanyDashboardStats(companyId) : null;
```

---

## Security Properties

| Concern | Status |
|---|---|
| Privilege escalation | No. Cookie only grants UI navigation; RLS policies still run against the real `auth.uid()` which is always `super_admin`. A super_admin viewing the recruiter portal cannot see data from a specific company unless RLS policies explicitly grant it. |
| Cookie forgery by candidate | No. The middleware checks the Supabase session role before honoring the cookie. A candidate cannot set `pra-view-as` to gain super_admin access. |
| Persistent session pollution | No. The cookie expires in 7 days and is cleared when the admin switches back to Admin view. |

---

## Consequences

### Positive
- Super Admin can preview any portal UI without a separate test account
- RBAC and RLS are fully intact — no data from other companies is exposed
- Switcher is visible in all portals (admin can always navigate back)

### Negative / Watch points
- Non-HttpOnly cookie — visible to JavaScript on the page. This is by design (the switcher component reads and writes it) but means it can be inspected in browser devtools.
- Hard navigation causes a full page reload on every switch. This is acceptable for an admin debugging tool; it would not be acceptable for a high-frequency user action.
- The Employer option is disabled (planned for a future milestone).

---

## Related

- ADR-001: Next.js App Router (cross-tree navigation constraint)
- ADR-006: RBAC (super_admin bypass pattern)
- Commit `384687b`: View As Switcher implementation
- Memory: `view_as_switcher_milestone.md`
