# ADR-004: Server Actions for All Data Mutations

**Status:** Accepted  
**Date:** 2025-Q4  
**Deciders:** Hassan Ahmed

---

## Context

In a Next.js App Router application, data mutations can be performed via:
1. **Server Actions** (`"use server"` functions called directly from components or forms)
2. **API Routes** (`src/app/api/` handlers reached via `fetch`)
3. **tRPC** (type-safe RPC layer over HTTP)
4. **GraphQL** (schema-driven query/mutation API)

---

## Decision

We use **Server Actions for all data mutations**. API Routes are reserved for:
- Streaming responses (`/api/mock-interview` — SSE streaming)
- External webhooks (`/api/webhooks/stripe`)
- Background job triggers (`/api/cron/*`)
- Open Graph image generation (`/api/og`)
- Browser telemetry (`/api/web-vitals`)

---

## Rationale

### No HTTP boilerplate for internal mutations

A Server Action is a TypeScript function annotated with `"use server"`. Calling it from a component looks identical to calling a local function. No `fetch`, no URL, no JSON serialization, no status code handling. The framework handles all of that.

### End-to-end type safety without a schema layer

Server Actions are typed TypeScript functions. The call site gets the return type automatically — no schema definition, no code generation, no versioning. When the action's signature changes, TypeScript surfaces every broken call site at compile time.

### Co-location with the domain

Actions live in `src/actions/` grouped by domain (`resume.ts`, `jobs.ts`, `pipeline.ts`, etc.). Each module imports only what it needs: the Supabase server client, the relevant Zod schema, and the auth guard. No framework-layer routing table needed.

### Simplicity for a single-app deployment

This platform has one client (the Next.js app itself). There are no external consumers of the mutation API. The overhead of REST or tRPC is not justified by the complexity they solve — they solve federation and public API problems that don't apply here.

---

## Pattern

Every Server Action follows this structure:

```typescript
"use server";

import { createClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/auth/guards";
import { resumeSchema } from "@/lib/validations/resume";

export async function updateResume(formData: FormData) {
  const supabase = await createClient();
  const user = await requireAuth(supabase, ["candidate"]);
  
  const parsed = resumeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.flatten() };
  
  const { error } = await supabase
    .from("resumes")
    .update(parsed.data)
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);  // belt-and-suspenders alongside RLS
  
  if (error) return { error: error.message };
  return { success: true };
}
```

Return type is always `{ success: true } | { error: string | FieldErrors }`.

---

## Consequences

### Positive
- No HTTP boilerplate for the 36 internal mutation modules
- Full TypeScript safety from component to database
- Simpler mental model: one layer (functions), not two (functions + HTTP)

### Negative / Watch points
- **Cannot be called from external clients** — Server Actions use a POST transport that is specific to the Next.js framework. If an external service ever needs to trigger a mutation, a traditional API route must be added.
- **No built-in rate limiting** — rate limiting must be added per-action when needed. Guest-facing mutations use IP-based rate limiting implemented with a middleware or in-action check.
- **Progressive enhancement** — Server Actions work with HTML forms (no JavaScript required). Complex interactions that need instant feedback still need Client Components with optimistic updates.

---

## Related

- ADR-001: Next.js App Router
- ADR-002: Supabase (the DB target of most actions)
