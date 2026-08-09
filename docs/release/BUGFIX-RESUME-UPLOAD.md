# Bug Fix Report — My Resumes Upload & View Workflow

**Status:** CLOSED  
**Severity:** High — feature completely non-functional  
**Commit:** `1fb5646`  
**Deployed:** 2026-08-09  
**Production URL:** https://pra-eta-umber.vercel.app/en/candidate/workspace/resumes

---

## Problem Summary

The "My Resumes" page (`/candidate/workspace/resumes`) was silently broken after the Candidate Nav Redesign (commit `0b53d44`). Two user-facing actions did nothing:

1. **Upload Resume** — clicking any Upload button caused the page to visually reload with no dialog, no file picker, and no upload.
2. **View** — clicking the View button on any listed resume did nothing (or opened a blank tab for resumes > 7 days old).

Neither action produced an error message. Both failures were silent.

---

## Root Cause Analysis

### Root Cause 1 — Circular Redirect (Upload)

During the Candidate Nav Redesign, `src/app/[locale]/candidate/resume/page.tsx` was converted from the real resume management page to a one-line redirect stub:

```tsx
// src/app/[locale]/candidate/resume/page.tsx (redirect stub)
redirect({ href: "/candidate/workspace/resumes", locale });
```

The new `workspace/resumes/page.tsx` was created to replace it, but its Upload CTAs still linked to `/${locale}/candidate/resume` — the redirect stub. Every click sent the user to the stub, which immediately redirected back to `workspace/resumes`, producing what looked like a page reload:

```
User clicks Upload Resume
→ navigates to /en/candidate/resume
→ server redirects to /en/candidate/workspace/resumes
→ page appears to reload
→ no file picker, no upload
```

The `ResumeUpload` client component (drag-and-drop + file picker) was never embedded in `workspace/resumes/page.tsx` — it was orphaned on the legacy `/candidate/resume` path that no longer rendered.

### Root Cause 2 — Expired Signed URL (View)

Supabase Storage's `resumes` bucket is configured as private (`public: false`). The `uploadResume` Server Action correctly generates a signed URL at upload time with a **7-day TTL** and stores it in the `file_url` column. The `workspace/resumes/page.tsx` read `resume.file_url` directly for the View button `href`.

For resumes uploaded within the past 7 days this worked. For any resume older than 7 days, the stored URL was expired. The private bucket returns HTTP 403 on expired URLs, which the browser either surfaced as a blank/error tab or silently ignored.

The `uploadResume` source code even contained the comment:
> _"callers that need a fresh link later should re-sign at request time since this one expires"_

— but `workspace/resumes/page.tsx` never followed this instruction.

### Root Cause 3 — Wrong Revalidation Path (Silent Cache Staleness)

After a successful upload via the ATS Checker (which bypasses the redirect), three `revalidateCandidatePath` calls in `src/actions/resume.ts` targeted `/candidate/resume` (the redirect stub, not the real page):

```ts
// Before fix — revalidating the redirect stub, not the real page
revalidateCandidatePath("/candidate/resume");
```

Next.js revalidated the stub's cache (a no-op since it has no data), leaving `workspace/resumes` stale. The uploaded resume would not appear in the list until the user performed a hard refresh.

---

## Technical Fix

### 1. Embed `ResumeUpload` inline ([`workspace/resumes/page.tsx`](../src/app/[locale]/candidate/workspace/resumes/page.tsx))

Removed all `<a href="/${locale}/candidate/resume">` Upload CTAs. Imported `ResumeUpload` and rendered it as a permanent "Upload a Resume" section directly on the page — no navigation required.

```tsx
// After fix
<section className="space-y-3">
  <h2 className="text-sm font-semibold ...">Upload a Resume</h2>
  <ResumeUpload />
</section>
```

### 2. Re-sign all URLs at render time ([`workspace/resumes/page.tsx`](../src/app/[locale]/candidate/workspace/resumes/page.tsx))

Added a `Promise.all` in the Server Component that calls `createSignedUrl(resume.file_path, 3600)` for every resume, generating fresh 1-hour tokens at every page render. If signing fails, the View button renders as `disabled` instead of holding a stale href.

```tsx
const resumesWithUrls = await Promise.all(
  resumes.map(async (resume) => {
    const { data: signed } = await supabase.storage
      .from("resumes")
      .createSignedUrl(resume.file_path, 60 * 60);
    return { ...resume, viewUrl: signed?.signedUrl ?? null };
  })
);
```

### 3. Correct revalidation paths ([`src/actions/resume.ts`](../src/actions/resume.ts))

Changed all three `revalidateCandidatePath` calls from the redirect stub to the real page:

```ts
// Before
revalidateCandidatePath("/candidate/resume");

// After
revalidateCandidatePath("/candidate/workspace/resumes");
```

Calls fixed in:
- `uploadResume` — success path (line ~118)
- `uploadResume` — parse-fail error path (line ~112)
- `reparseResume` — success path (line ~241)

---

## Files Changed

| File | Change |
|---|---|
| [`src/app/[locale]/candidate/workspace/resumes/page.tsx`](../src/app/%5Blocale%5D/candidate/workspace/resumes/page.tsx) | Full rewrite: embed `ResumeUpload`, re-sign all URLs, remove broken CTAs |
| [`src/actions/resume.ts`](../src/actions/resume.ts) | Fix 3× `revalidateCandidatePath` paths |
| [`e2e/resume-upload.spec.ts`](../../e2e/resume-upload.spec.ts) | Add 3 regression tests covering all three root causes |

---

## Testing Performed

### Automated — Playwright E2E (5/5 pass)

| Test | Covers |
|---|---|
| `My Resumes page shows upload component and not a broken redirect button` | Root Cause 1: no circular redirect, `ResumeUpload` mounted inline |
| `candidate can upload a PDF from My Resumes page and it appears in the list` | Root Cause 1 + 3: upload works, list updates immediately |
| `View button on My Resumes page points to a real signed URL, not a blank/null href` | Root Cause 2: `href` is a Supabase signed URL |
| `candidate can upload a PDF through ATS Checker and it processes without crashing` | Pre-existing, unaffected path |
| `oversized files are rejected client-side with a clear message` | Pre-existing, unaffected path |

### Static Analysis

| Check | Result |
|---|---|
| ESLint | ✅ 0 errors (2 pre-existing warnings unrelated to this fix) |
| TypeScript | ✅ 0 errors |
| Production build (`next build`) | ✅ 153 pages generated |

---

## Production Verification

Performed live on 2026-08-09 as Super Admin → View As Candidate on the production deployment.

| Check | Result |
|---|---|
| Upload section visible without any redirect | ✅ `ResumeUpload` mounted inline |
| Upload a new PDF (`Hassan-Ahmed-Prod-Verification.pdf`) | ✅ Count: 9 → 10, appeared immediately |
| New upload has valid Supabase signed URL | ✅ `abmnvhyoxigxoyfkarje.supabase.co/storage/v1/object/sign/resumes/…` |
| New upload token freshness | ✅ `iat: 2026-08-09T09:54:29Z`, `exp: +1h` |
| Refresh — new upload still present | ✅ Count still 10 |
| Refresh — tokens re-minted | ✅ `iat: 2026-08-09T09:55:49Z` (new render time) |
| Oldest resume (Jul 21, 19 days old) has valid View URL | ✅ Fresh token, not the 19-day-old expired one |
| Zero broken legacy redirect links on page | ✅ `brokenLegacyLinks: 0` |

### Signed URL Token Evidence (post-refresh)

All 10 resumes — including the oldest from **Jul 21, 2026 (19 days old)** — received fresh tokens with:
- `iat: 2026-08-09T09:55:49Z` — signed at this render
- `exp: 2026-08-09T10:55:49Z` — valid for 1 hour

The Jul 21 resume's original `file_url` would have expired on Jul 28. The fix re-signs from `file_path` at every request, making expiry irrelevant.

---

## Evidence

### Before (broken state)
```
User: clicks "Upload Resume"
→ GET /en/candidate/resume       (linked by 3 broken Upload CTAs)
→ 307 redirect /en/candidate/workspace/resumes
→ page appears to reload
→ no file picker opens, no upload occurs
```

```
User: clicks "View" on 8-day-old resume
→ href = "https://...supabase.co/storage/...?token=<expired>"
→ Supabase returns HTTP 403
→ browser shows blank tab or error
```

### After (fixed state)
```
User: page loads /en/candidate/workspace/resumes
→ ResumeUpload component rendered inline
→ drag-and-drop zone + Browse files button visible immediately
→ file upload triggers Server Action directly
→ resume appears in list after router.refresh()
```

```
User: page loads /en/candidate/workspace/resumes
→ Server Component calls createSignedUrl(file_path, 3600) for every resume
→ View href = "https://...supabase.co/storage/.../sign/...?token=<fresh 1h>"
→ clicking View opens the PDF in a new tab
```

---

## Lessons Learned

1. **Redirect stubs must be tracked at the feature level.** When a page is demoted to a redirect stub during a nav redesign, a global grep for links to the old path must be part of the same commit. In this case `workspace/resumes/page.tsx` was written from scratch without checking whether anything linked to the old path.

2. **Private-bucket signed URLs must never be persisted as display links.** Storing a signed URL at write time and reading it back at display time creates a hidden 7-day time bomb. The correct pattern — re-sign at render time from `file_path` — was documented in a source code comment but never applied to the page that needed it.

3. **`revalidatePath` targets must match the real page path.** After a route restructure, all `revalidatePath`/`revalidateCandidatePath` call sites that reference the old path become no-ops. A TypeScript-level `ROUTES` constant would have caught this at build time.

4. **Silent failures need regression coverage at the URL level.** All three failures were silent — no console errors, no toasts, no crashes. The only observable symptom was a visual no-op. Tests that assert on `href` values and on the presence of the upload widget (not just the page loading) are the only automated defense against this class of bug.
