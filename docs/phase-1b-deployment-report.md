# Version 1.1 — Phase 1B: Final Documentation (Archived)

Status: **Phase 1B closed.** Phase 1C not yet approved.

This document archives the two final reports produced at Phase 1B close: the SEV-1 incident report for the environment-configuration outage encountered during Phase 1B verification, and the Phase 1B deployment report itself.

---

## SEV-1 Incident Report

**1. Executive Summary**
A production environment-variable misconfiguration during a manual Vercel edit caused two sequential incidents: first, silent data-loss on public pages and broken authentication (queries routed to the wrong host); second, a full site outage (`MIDDLEWARE_INVOCATION_FAILED` on every route) when a required variable was left empty during correction. Both were operational/environment issues, not application defects. Production is now restored and verified for core functionality, with one operational environment issue still open (see Remaining Risks).

**2. Timeline** (all times UTC, July 22)
- **13:xx** — Phase 1A verification confirms `/jobs`, login, dashboards all working correctly (baseline healthy).
- **~14:30** — User begins correcting `NEXT_PUBLIC_SITE_URL` in Vercel.
- **14:37** — Phase 1B verification discovers `/jobs` empty, `/companies/[slug]` returning 404.
- **14:45** — Temporary diagnostic route deployed; confirms `NEXT_PUBLIC_SUPABASE_URL` was set to the app's own domain (`https://pra-eta-umber.vercel.app`) instead of the Supabase project URL — root cause of incident 1, and login confirmed broken by direct test.
- **14:52** — Diagnostic route removed.
- User applies a fix and redeploys; a second, more severe incident begins — every route returns 500 (`MIDDLEWARE_INVOCATION_FAILED`), including the homepage — full outage.
- User corrects environment variables again and redeploys.
- **14:45:01** — New deployment succeeds; verification confirms homepage, jobs, companies, login, dashboards all restored.
- Independently, three unrelated issues are found and fixed during Phase 1B re-verification (see Phase 1B report below) — none of them incident-related.

**3. Customer Impact**
- **Incident 1** (wrong Supabase URL): public job/company browsing showed no data; login silently failed for all users (server actions returned 200 but never authenticated). Duration: from whenever the URL was first miswritten (exact start unknown) until ~14:45.
- **Incident 2** (missing/empty env var): total outage, every route 500, for the duration of that deployment.

**4. Blast Radius**
Incident 1: every route using the regular (anon-key) Supabase client — public job/company pages, login, registration-dependent flows. Incident 2: literally every route, since middleware runs on the entire matcher.

**5. Root Cause**
- Incident 1: `NEXT_PUBLIC_SUPABASE_URL` in Vercel Production was set to the value intended for `NEXT_PUBLIC_SITE_URL` (or similar mix-up between the two similarly-purposed variables during manual editing).
- Incident 2: a required Supabase environment variable was left empty/missing during the correction, causing `getRequiredEnv()` (`src/lib/env.ts`) to throw on every middleware invocation.

**6. Evidence**
- Temporary diagnostic route output showing `NEXT_PUBLIC_SUPABASE_URL: "https://pra-eta-umber.vercel.app"` (should be `https://abmnvhyoxigxoyfkarje.supabase.co`).
- Live login test: POST to `/login` returned 200 but never redirected — consistent with the auth call failing silently against the wrong host.
- `curl` against every route returning `MIDDLEWARE_INVOCATION_FAILED` during incident 2, correlated with `getRequiredEnv()`'s explicit throw-on-missing behavior.
- GitHub deployment-status timestamps confirming two distinct deployments in the relevant window.

**7. Resolution**
User corrected the Supabase environment variables in Vercel and triggered a full rebuild (required since `NEXT_PUBLIC_*` values are inlined at build time). Confirmed via fresh `curl` checks (`X-Vercel-Cache: MISS`) and live browser testing.

**8. Validation Performed**
Homepage (200, correct title/metadata), login (fresh credential sign-in → dashboard, zero console errors), registration path unaffected, jobs (`/jobs` lists all 3 published jobs by name), companies (`/companies/prod-audit-company` renders correctly), guest ATS checker (page loads, analytics events recorded with live timestamps), candidate dashboard, recruiter dashboard, sitemap/robots served (structure correct, one remaining value issue — see Remaining Risks), mobile/tablet/desktop responsiveness, zero console errors across all checks.

**9. Remaining Risks**
- `NEXT_PUBLIC_SITE_URL` is **still** `http://localhost:3001` in production (confirmed via `sitemap.xml`/`robots.txt` post-resolution) — never actually corrected despite being the original trigger for this edit session. Affects password-reset and OAuth redirect URLs, plus sitemap/robots SEO correctness. Tracked as an operational follow-up, not Phase 1B development work.
- No automated safeguard currently exists to catch this class of misconfiguration before it reaches production (see Preventive Actions).

**10. Lessons Learned**
- `NEXT_PUBLIC_*` environment variables are inlined at build time; a dashboard edit alone does nothing until a fresh build runs.
- Discarding the Supabase `error` object (as `getPublishedJobs()`/`getCompanyBySlug()` do, keeping only `data`) meant a total connectivity failure surfaced as "no results" instead of a visible error — silent by design, which delayed diagnosis.
- A temporary, narrowly-scoped diagnostic route (deployed and removed within minutes) was the fastest way to get ground truth from inside Vercel's actual runtime, given no CLI/dashboard access was available in this session.

**11. Preventive Actions**
- **Follow-up engineering task (scoped separately, not implemented as part of this incident):** an automated pre-deployment environment sanity check verifying `NEXT_PUBLIC_SUPABASE_URL` resolves to a real Supabase host, `NEXT_PUBLIC_SITE_URL` matches the production domain, all required variables are present and non-empty, with clear diagnostics on failure.
- Recommend (future): have `getPublishedJobs()`/`getCompanyBySlug()` and similar query functions log the discarded `error` object, so a connectivity failure is visible in server logs immediately rather than only inferable from empty results.

---

## Phase 1B — Final Deployment Report

**1. Architecture Summary** — Homepage repositioned around the live Guest ATS Checker via four new, purely-additive marketing sections (`AtsCheckerTeaser`, `AICareerToolsSection`, `JobsPreviewSection`, `CompaniesPreviewSection`), a navbar/footer link, one shared `getPublishedJobs()` call (no duplicate queries), and homepage-specific metadata. No existing section removed; authenticated pipeline untouched.

**2. Files Changed** — `src/app/page.tsx`, `src/components/marketing/{navbar,footer,hero}.tsx`, `src/lib/marketing/ai-tools.ts`, new: `ai-career-tools-section.tsx`, `ats-checker-teaser.tsx`, `jobs-preview-section.tsx`, `companies-preview-section.tsx`. Follow-up fixes: `src/components/marketing/navbar.tsx` (breakpoints), `src/lib/ai/extract-text.ts` (retry ceiling + logging), `e2e/global-setup.ts` (test-data cleanup).

**3. Database Changes** — None.

**4. API Changes** — None (no new server actions; existing `getPublishedJobs()` reused unmodified).

**5. Build Result** — Clean, all 32 routes compiled. Homepage moved from static (`○`) to dynamic (`ƒ`) due to the new data dependency; mitigated with `revalidate = 300`.

**6. Lint Result** — Clean.

**7. Playwright Result** — 46/46 passing (final clean run, 2.2 min).

**8. Commit Hash**
- `ed37948` — Phase 1B homepage repositioning (initial implementation)
- `d80826b` — Phase 1B fixes (navbar breakpoints, pdf-parse retry margin, test-data cleanup)

**9. GitHub Push Status** — Both pushed to `origin/main` successfully.

**10. Vercel Deployment Status** — Both deployments confirmed `"Deployment has completed"` via GitHub commit-status API.

**11. Production Verification** — Core production functionality is fully healthy and verified, with one remaining operational environment configuration issue tracked separately. Homepage, navigation, guest ATS checker (page-view analytics confirmed with live timestamps), authenticated candidate dashboard, recruiter dashboard, jobs, and companies are all verified live and working. The outstanding item is `NEXT_PUBLIC_SITE_URL` (see item 16) — it affects SEO output and auth redirect URLs, not application functionality, and is tracked as an operational follow-up rather than Phase 1B development work.

**12. Mobile Verification** — 375px: no horizontal overflow, zero console errors. Tablet (768px) and desktop confirmed clean after the navbar fix.

**13. Accessibility Verification** — "Coming soon" AI-tool cards use a real `<button>` (not a fake link) with `aria-haspopup="dialog"`; the modal reuses Radix `Dialog` (built-in focus trap, `Escape`-to-close, `sr-only` close label) — same pattern already proven in `apply-dialog.tsx`. Not separately screen-reader-tested beyond this structural review.

**14. Performance Notes** — Homepage First Load JS: 159kB → 174kB (+15kB, four new sections). `getPublishedJobs()` fetched once, shared via props to both preview sections — no duplicate queries, confirmed by design and by code review.

**15. Analytics Verification** — Confirmed live: fresh `ats_checker_page_view` event recorded in `analytics_events` matching the exact timestamp of a real browser visit during verification.

**16. SEO Verification** — Homepage now has explicit title/description (previously relied on root layout default). Sitemap includes `/ai-tools/ats-checker`. Canonical URLs, Open Graph tags, and structured data confirmed **absent** (pre-existing gap across the whole app, not Phase 1B scope — deferred to v1.1.3 per the roadmap). **`NEXT_PUBLIC_SITE_URL` is still incorrect** — sitemap.xml and robots.txt both currently emit `http://localhost:3001` instead of the production domain, and this same variable feeds password-reset/OAuth redirect URLs. Operational follow-up, not a Phase 1B application defect.

**17. Security Notes** — No new attack surface; no new server actions; "coming soon" tools structurally cannot link to a nonexistent route (registry's discriminated union).

**18. Issues Fixed (this phase's own regressions)**
- Navbar tablet overflow (768px) — Phase 1B added a third nav-link item that pushed the `md:` breakpoint over the edge. Fixed by moving to `lg:`.

**19. Pre-existing Technical Debt (found, not introduced by Phase 1B)**
- `pdf-parse`'s cold-start retry margin was occasionally insufficient under the real upload pipeline (isolated tests always succeeded by attempt 8; the real pipeline once exhausted 10). Raising the cap to 25 **mitigates the observed failure rate but does not eliminate the underlying dependency's cold-start characteristics** — the retry is a hedge against a third-party library defect, not a fix for it. A longer-term resolution would replace `pdf-parse` with an actively-maintained library.
- E2E test-data accumulation (27 profiles, ~12 throwaway registration accounts across multiple days) pushed a fixture user off the admin panel's default listing. Added cleanup.
- No canonical URLs, Open Graph tags, or structured data anywhere in the app (confirmed absent, pre-existing, deferred to v1.1.3).
- Footer's About/Careers/Blog/Contact/Privacy/Terms/Security links remain placeholder `#` hrefs (pre-existing, Phase 1C/marketing-pages scope).

**20. Recommended Future Improvements** — Environment sanity-check task (scoped separately); `NEXT_PUBLIC_SITE_URL` correction in Vercel (outstanding operational follow-up); consider replacing `pdf-parse` with an actively-maintained library; add OG/canonical/structured-data in v1.1.3 as planned.

---

**Phase 1B is officially closed.** Phase 1C awaits explicit approval.
