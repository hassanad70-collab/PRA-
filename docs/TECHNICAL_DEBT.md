# Technical Debt Register

**Generated:** 2026-08-17  
**Platform version:** v2.0 (commit `1d56b08`)  
**Status:** Audit-only — no changes have been made. Review each item before acting.

---

## Severity scale

| Level | Meaning |
|---|---|
| **Critical** | Data corruption, security hole, or silent data loss in production |
| **High** | Broken production behavior; users may see stale/incorrect data |
| **Medium** | Suboptimal architecture; no current user-visible impact |
| **Low** | Code quality; maintainability; cosmetic |

---

## DEBT-001 — Bare `revalidatePath()` in employer actions (stale UI after company/talent actions)

| Field | Value |
|---|---|
| **Severity** | High |
| **File** | `src/actions/employer.ts` (lines 36, 37, 48, 49, 60, 87, 97, 156, 178, 189, 200) |
| **Impact** | After a recruiter saves/unsaves a candidate, updates company profile, or adds to talent pool, the affected pages are NOT revalidated — Next.js cache serves stale data until the next full page reload. |
| **Root cause** | `revalidatePath("/recruiter/saved-candidates")` uses a bare, non-locale-prefixed path. Since Recruiter Intelligence v2.0 moved all recruiter routes under `[locale]`, the real routes are `/en/recruiter/saved-candidates` and `/ar/recruiter/saved-candidates`. A bare call matches no real route and silently does nothing. |
| **Recommended fix** | Replace all bare `revalidatePath("/recruiter/...")` calls with `revalidateRecruiterPath("/saved-candidates")` etc., using the existing `src/lib/revalidate-recruiter-path.ts` helper — exactly the same pattern applied elsewhere. |
| **Risk** | Low risk to fix; the helper is already written and proven. The fix is a mechanical find-and-replace within one file. |
| **Priority** | P1 — fix before v2.0.0 tag |

---

## DEBT-002 — In-memory rate limiter is non-distributed (not effective on Vercel's serverless fleet)

| Field | Value |
|---|---|
| **Severity** | Medium |
| **File** | `src/lib/rate-limit.ts` |
| **Impact** | The rate limiter protecting auth actions (login, registration, password reset, guest ATS checker) stores state in Node process memory. On Vercel's serverless fleet, each invocation may be handled by a different function instance, so limits only apply within a single instance — a scripted attacker cycling across instances could bypass them. A naive single-process attacker or casual testing-account creation is still blocked. |
| **Root cause** | Intentional design decision documented in the source file comments: the `checkRateLimit` function uses an in-process `Map`. This was correct and sufficient for the MVP but is not production-grade for a multi-instance deployment. |
| **Recommended fix** | Replace with Upstash Redis + `@upstash/ratelimit` using the same `rateLimitByIp` / `rateLimitByIpAndTarget` call sites. The rate limiter module is well-isolated so the change is contained to `src/lib/rate-limit.ts`. |
| **Risk** | Low risk — the fix is well-understood and the call interface doesn't need to change. Requires adding `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` environment variables. |
| **Priority** | P2 — pre-production launch hardening |

---

## DEBT-003 — Backward-compatibility locale redirect layer in middleware

| Field | Value |
|---|---|
| **Severity** | Low |
| **File** | `src/middleware.ts` (lines 20–28) |
| **Impact** | Old bookmarks and emails with bare `/candidate/...` or `/recruiter/...` URLs redirect correctly for now. No user-visible issue. |
| **Root cause** | When both candidate and recruiter portals were moved under `[locale]`, bare unprefixed routes were not added to `EXCLUDED_PREFIXES`. The intl middleware's "add missing locale" pass handles them correctly — a `/candidate/dashboard` request gets redirected to `/en/candidate/dashboard`. The TODO notes this is intentional but temporary. |
| **Recommended fix** | Once legacy traffic (old bookmarks, emails, external docs) has fully aged out, add `/candidate` and `/recruiter` to `EXCLUDED_PREFIXES` and serve a clean 404 for bare paths instead. Monitor old path traffic via analytics before removing. |
| **Risk** | Zero risk to remove once traffic has migrated. No rush. |
| **Priority** | P4 — future cleanup, low urgency |

---

## DEBT-004 — `any` type in studio server action

| Field | Value |
|---|---|
| **Severity** | Low |
| **File** | `src/actions/studio.ts` (lines 37–38) |
| **Impact** | TypeScript does not check the `content` field passed into `updateSectionContentStudio` — a wrong shape would only fail at runtime. |
| **Root cause** | Resume Studio sections have heterogeneous content shapes (`string`, `ExperienceEntry[]`, `EducationEntry[]`, etc.) and the studio action was written before a discriminated union or generic type was designed for section content. |
| **Recommended fix** | Define a `SectionContent` union type or use `z.discriminatedUnion` on the section type. Update the action parameter accordingly. |
| **Risk** | Low risk — the calling component already passes the correct shape; the `any` just bypasses the compile-time check. |
| **Priority** | P3 — type safety improvement |

---

## DEBT-005 — Hardcoded production URLs in email notification bodies

| Field | Value |
|---|---|
| **Severity** | Low |
| **File** | `src/actions/messaging.ts` (lines 93–94), `src/actions/offers.ts` (lines 72–73) |
| **Impact** | Notification emails sent from a staging or local deployment contain links to `https://pra-eta-umber.vercel.app` (production). If staging sends real emails, links land on production. |
| **Root cause** | The production URL was hardcoded when the email notification system was built. There is no `NEXT_PUBLIC_BASE_URL` or equivalent environment variable plumbed through to these action files. |
| **Recommended fix** | Add `NEXT_PUBLIC_BASE_URL=https://pra-eta-umber.vercel.app` to environment variables, read it in the email actions with `process.env.NEXT_PUBLIC_BASE_URL ?? "https://pra-eta-umber.vercel.app"`, and document it in `docs/deployment/ENVIRONMENT_VARIABLES.md`. |
| **Risk** | Zero risk — purely additive environment variable change. |
| **Priority** | P3 — good practice; needed before staging environment is used for real email testing |

---

## DEBT-006 — ESLint unused-variable warnings (5 warnings total)

| Field | Value |
|---|---|
| **Severity** | Low |
| **Files** | `src/components/recruiter/job-matches-client.tsx:34` (`jobTitle`), `src/components/recruiter/resume-intelligence-client.tsx:75` (`selectedCandidate`), `e2e/resume-upload-v2.spec.ts:4` (`createClient`), `e2e/resume-upload-v2.spec.ts:37` (`makeNamedPdf`), `e2e/resume-upload-v2.spec.ts:129` (`countBefore`) |
| **Impact** | Build warns but does not fail. 2 are dead variables in production components; 3 are unused helpers in e2e test code. |
| **Root cause** | Production components: leftover from earlier iterations. E2E spec: `createClient` import and `makeNamedPdf` helper were defined during development but not referenced in the final test suite; `countBefore` was used in an earlier version of a count assertion. |
| **Recommended fix** | Remove the unused declarations (one line each in all 5 files). |
| **Risk** | Zero risk — the variables are provably unused. |
| **Priority** | P3 — trivial cleanup |

---

## DEBT-007 — Stripe billing is infrastructure-only (no live checkout flow)

| Field | Value |
|---|---|
| **Severity** | Medium |
| **File** | `src/app/api/webhooks/stripe/route.ts`, `src/actions/admin-billing.ts`, `supabase/migrations/0033_billing_schema.sql` |
| **Impact** | The Billing page in the Admin portal renders subscription and invoice data (read-only). No active Stripe subscription can be created via the platform — the checkout flow is not implemented. If `STRIPE_SECRET_KEY` is absent, the webhook handler returns early silently. |
| **Root cause** | Billing infrastructure was built as a foundation milestone (v1.2) with real Stripe credentials intentionally deferred until the product is ready for monetization. This is a known planned limitation. |
| **Recommended fix** | Implement the customer portal (`Stripe.BillingPortal.Session`) and checkout session creation. Requires real Stripe credentials and production subscription product configuration. Covered in v2.4 roadmap. |
| **Risk** | No user-facing impact until billing is activated. |
| **Priority** | P2 — roadmap item (v2.4) |

---

## DEBT-008 — "Employer" option in View As Switcher is disabled stub

| Field | Value |
|---|---|
| **Severity** | Low |
| **File** | Super-admin View As Switcher dropdown component |
| **Impact** | A "soon" label appears next to the Employer option in the dropdown. No functional impact. |
| **Root cause** | The Employer portal tree does not yet exist. The option was added anticipating the v2.1 Employer Workspace milestone. |
| **Recommended fix** | Implement the Employer portal (v2.1 roadmap) and wire the View As option then. Until v2.1 ships, the disabled state is correct. |
| **Risk** | None — disabled UI cannot be triggered. |
| **Priority** | P4 — part of v2.1 roadmap |

---

## DEBT-009 — Two overlapping resume builder UIs (Classic Builder + Resume Studio)

| Field | Value |
|---|---|
| **Severity** | Medium |
| **File** | `src/app/[locale]/candidate/resume-builder/` (classic) vs `src/app/[locale]/candidate/workspace/studio/` (studio) |
| **Impact** | Candidates have two different resume creation experiences. Both write to the same `resume_drafts` table. Documentation and user navigation must explain two separate workflows. Maintenance burden: two sets of components, actions, and queries for overlapping functionality. |
| **Root cause** | The Resume Studio was built as a premium, feature-rich editor (AI section operations, version history, templates, 3-panel layout) added on top of the existing simpler Classic Builder. Both were kept to avoid breaking existing drafts. |
| **Recommended fix** | Deprecate the Classic Builder route (`/candidate/resume-builder`) in favor of the Studio. The nav already routes primarily to the Studio. Consider adding a redirect stub and removing the Classic Builder UI in v2.1 or later. |
| **Risk** | Low risk — the Studio is a superset of the Classic Builder. Any existing drafts work in both. Requires ensuring all Classic Builder users are migrated gracefully via nav/UX copy. |
| **Priority** | P3 — post-v2.0 cleanup |

---

## DEBT-010 — AI-generated text is always in English regardless of user locale

| Field | Value |
|---|---|
| **Severity** | Medium |
| **File** | All `src/lib/ai/*.ts` files (all AI prompt builders) |
| **Impact** | Arabic-locale users receive AI resume suggestions, copilot responses, career advice, and cover letters in English. This is a poor UX for RTL/Arabic users. |
| **Root cause** | All AI system prompts and user-facing prompt assembly are written in English. No locale context is passed into the AI layer. |
| **Recommended fix** | Accept a `locale` parameter in the AI functions and append a language instruction: `"Reply entirely in Arabic (Modern Standard Arabic)."` for Arabic locale. Alternatively, post-translate the AI response via a second AI call. |
| **Risk** | Medium risk — AI models have variable quality in Arabic; translation quality should be tested before shipping. |
| **Priority** | P2 — needed for full i18n compliance; a known gap in the current i18n implementation |

---

## DEBT-011 — Mock interview uses HTTP API route; other AI tools use Server Actions

| Field | Value |
|---|---|
| **Severity** | Low |
| **File** | `src/app/api/mock-interview/route.ts` vs `src/actions/*.ts` |
| **Impact** | Architectural inconsistency — the mock interview must use a streaming HTTP response (`ReadableStream`), which Server Actions do not support natively. The API route approach is correct for this use case, but it creates a different auth/error pattern. |
| **Root cause** | Server Actions cannot stream back a `ReadableStream`. The mock interview requires streaming to deliver AI turn-by-turn responses in real time. The API route was the correct technical choice. |
| **Recommended fix** | No change needed to the architecture. Document this as an accepted exception in the Architecture Decision Record. Add a note in the codebase overview for future contributors. |
| **Risk** | Zero — this is the correct design for streaming. |
| **Priority** | P4 — documentation only |

---

## DEBT-012 — `admin` route tree is English-only (not under `[locale]`)

| Field | Value |
|---|---|
| **Severity** | Low |
| **File** | `src/app/admin/` (entire directory) |
| **Impact** | The Admin portal is always in English. Arabic-speaking super admins get an English UI. |
| **Root cause** | The Admin portal was built before the i18n prerequisite and was intentionally left English-only as an admin tool. Super admins are typically technical staff; this was an accepted trade-off. |
| **Recommended fix** | Move `src/app/admin/` under `src/app/[locale]/admin/` and add Arabic translations for the admin namespace. This is a significant effort given the volume of admin UI pages. |
| **Risk** | Medium risk — moving the admin tree requires updating all admin route references and the middleware exclusion list. |
| **Priority** | P3 — post-v2.0, nice-to-have |

---

## DEBT-013 — `invite` route tree is English-only and outside `[locale]`

| Field | Value |
|---|---|
| **Severity** | Low |
| **File** | `src/app/invite/[token]/page.tsx` |
| **Impact** | The team invite acceptance page is always English — Arabic-speaking recruiter invitees see an English page. |
| **Root cause** | The invite flow was built alongside the Organizations & Roles feature before full i18n. Added to `EXCLUDED_PREFIXES` in middleware. |
| **Recommended fix** | Move to `src/app/[locale]/invite/[token]/page.tsx` and add translations. Remove `/invite` from `EXCLUDED_PREFIXES`. |
| **Risk** | Low risk — straightforward migration. |
| **Priority** | P3 — part of a future i18n completeness pass |

---

## Summary Table

| ID | Severity | Priority | Description |
|---|---|---|---|
| DEBT-001 | **High** | P1 | Bare `revalidatePath` in employer actions — stale UI |
| DEBT-002 | Medium | P2 | In-memory rate limiter not distributed across Vercel instances |
| DEBT-003 | Low | P4 | Backward-compat locale redirect layer in middleware |
| DEBT-004 | Low | P3 | `any` type in studio server action |
| DEBT-005 | Low | P3 | Hardcoded production URLs in email notification bodies |
| DEBT-006 | Low | P3 | Unused variables in two recruiter components (ESLint warnings) |
| DEBT-007 | Medium | P2 | Stripe billing is read-only infrastructure only |
| DEBT-008 | Low | P4 | "Employer" View As option is disabled stub |
| DEBT-009 | Medium | P3 | Two overlapping resume builder UIs |
| DEBT-010 | Medium | P2 | AI-generated text always in English regardless of locale |
| DEBT-011 | Low | P4 | Mock interview uses API route (accepted; streaming requirement) |
| DEBT-012 | Low | P3 | Admin portal is English-only, not under `[locale]` |
| DEBT-013 | Low | P3 | Invite route is English-only, not under `[locale]` |

---

> **IMPORTANT:** This document is an audit record only. No changes have been made to the codebase based on this report. All remediation actions require explicit approval. The one item requiring action before the v2.0.0 tag is DEBT-001 (employer revalidation).
