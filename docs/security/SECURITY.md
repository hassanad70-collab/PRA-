# Security Documentation

## Overview

Security in the PRA Talent Intelligence Platform is enforced at three independent layers, creating defense in depth:

1. **Edge Middleware** — route-level authentication and RBAC on every request
2. **Server Component / Server Action guards** — role checks inside the application layer
3. **Supabase Row Level Security** — database-level access control enforced by PostgreSQL

No data mutation or sensitive read can succeed unless all three layers allow it.

---

## Authentication

### Provider

Authentication is handled by **Supabase Auth**:
- Email/password sign-in
- Phone OTP (one-time password)
- OAuth (configured in Supabase dashboard)

### Session model

Supabase Auth issues a JWT stored in an **HttpOnly cookie** (set by the Supabase SSR helper). This cookie is:
- `HttpOnly` — inaccessible to JavaScript
- `Secure` — HTTPS only in production
- `SameSite=Lax` — CSRF protection for standard navigation

The cookie is validated on every request by the Edge Middleware using `supabase.auth.getUser()`. Invalid or expired sessions are redirected to `/[locale]/login`.

### Session refresh

The Supabase SSR middleware refreshes the session token automatically before it expires. This is handled in `src/lib/supabase/middleware.ts`.

---

## RBAC (Role-Based Access Control)

### Roles

| Role | Portal | Access |
|---|---|---|
| `super_admin` | `/admin` | Full platform access. Can preview other roles via View As Switcher. |
| `recruiter` | `/[locale]/recruiter` | All hiring pipeline and candidate features for their assigned company. |
| `hr_manager` | `/[locale]/recruiter` | Same portal as recruiter; capability subset controlled by permissions table. |
| `candidate` | `/[locale]/candidate` | Full AI Career Workspace. Cannot access recruiter or admin portals. |

### Layer 1: Edge Middleware (`src/middleware.ts`)

Runs on every request before any page renders:

```
/admin/*         → requireRole('super_admin') OR redirect to /
/[locale]/recruiter/* → requireRole('recruiter' | 'hr_manager') OR redirect to login
                    Exception: super_admin is allowed through for View As mode
/[locale]/candidate/* → requireRole('candidate') OR redirect to login
                    Exception: super_admin is allowed through for View As mode
```

### Layer 2: Layout and Page Guards (`src/lib/auth/`)

Server Component layouts call `requireAuth()` or role-specific guards. These re-validate the session independently of middleware, providing defense in depth. Server Actions also call auth checks before executing any mutation.

### Layer 3: Row Level Security (Supabase)

All database tables have RLS policies enabled. The policies enforce:
- **User isolation**: candidates can only read/write their own profile, resumes, and applications
- **Company isolation**: recruiters can only read/write data for their assigned company (enforced via `company_id` column + policy)
- **Admin access**: `super_admin` role has elevated access in specific policies

The service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS. It is only used in controlled Server Actions where explicit role checks have already passed.

---

## View As Switcher

The View As Switcher allows super_admin to preview the Candidate or Recruiter UI without actually changing their role.

### Implementation

- Cookie `pra-view-as` (non-HttpOnly, 7-day TTL) stores the current view (`""`, `"candidate"`, or `"recruiter"`)
- Middleware reads this cookie and permits super_admin through candidate/recruiter route guards
- **The user's actual Supabase role is never changed**
- All RLS policies still enforce based on the real role

### Security properties

- A candidate cannot set `pra-view-as` to gain super_admin access — the middleware checks the Supabase session role first
- The cookie is client-writable by design (allows super_admin to set it from the browser), but it only grants access if the session role is `super_admin`
- There is no privilege escalation: the View As cookie grants read access to the target portal's UI, not write access to the target role's data

---

## Data Security

### Sensitive data handling

| Data Type | Storage | Protection |
|---|---|---|
| User passwords | Supabase Auth (bcrypt) | Never stored by the application |
| Resume files | Supabase Storage | Access controlled by RLS-backed signed URLs |
| Application data | PostgreSQL (RLS) | Company-scoped isolation |
| AI prompts | Not stored | Passed to OpenRouter and discarded |
| Email content | Resend API | Transmitted over HTTPS; not stored locally |
| Stripe payment data | Stripe (PCI-compliant) | Payment data never touches our DB |

### What we send to OpenRouter

AI prompts contain only the minimum required data:
- Resume text (no email, phone, or address)
- Job title/description
- Skills lists
- No authentication tokens or database IDs

### Resume file storage

Resume files are stored in Supabase Storage. Access is via signed URLs with short expiry times. No resume is publicly accessible without a valid signed URL.

---

## HTTP Security Headers

The following security headers are set via `next.config.ts`:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: (configured in next.config.ts)
```

---

## API Security

### REST API routes

- All routes that require authentication validate the session via `supabase.auth.getUser()` at the start of the handler
- Cron routes require `Authorization: Bearer CRON_SECRET` — requests without the correct secret return `401`
- The Stripe webhook validates the signature via `stripe.webhooks.constructEvent()` — invalid signatures return `400`

### Server Actions

- All Server Actions are prefixed with `"use server"` and run server-side only
- They cannot be called from external clients directly (they use a framework-level POST protocol)
- Each action validates the caller's session and role before executing

### Rate limiting

Guest AI tools (`/api/ai-tools/*`) implement IP-based rate limiting to prevent abuse of unauthenticated AI endpoints.

---

## Vulnerability Reporting

To report a security vulnerability:

1. **Do not** open a public GitHub issue
2. Email `Hassan.a7md@yahoo.com` with subject line `[SECURITY] PRA Platform`
3. Include: description of the vulnerability, steps to reproduce, potential impact
4. You will receive a response within 72 hours

We follow responsible disclosure. Please give us reasonable time to patch before public disclosure.

---

## Dependency Security

```bash
# Check for known vulnerabilities
npm audit

# Fix automatically (safe fixes only)
npm audit fix
```

Dependencies are audited on every CI run. High and critical severity vulnerabilities block deployment.
