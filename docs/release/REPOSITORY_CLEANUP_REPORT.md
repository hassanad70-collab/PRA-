# Repository Cleanup Report

**Generated:** 2026-08-09 | **Updated:** 2026-08-17 (v1.9 refresh)  
**Status:** For Review — NO deletions or changes have been made  
**Purpose:** Identify candidates for removal/consolidation; all actions require explicit approval

---

## Summary

This report identifies code and files that are candidates for cleanup. Nothing has been removed. Review each section and approve individual items before any action is taken.

**Total candidates identified:** 24 items across 5 categories (updated for v1.9)

---

## Category 1: Temporary Diagnostic Routes (Removed in History)

These were already removed during development (based on commit history). Confirmed absent from the codebase — no action needed.

| Commit | What was added and removed |
|---|---|
| `c5186a4` / `5806e0b` | Temporary diagnostic route for production job/company query incident |
| `adef69f` / `125de66` | Temporary diagnostic route for /jobs/[id] 404 regression |
| `6ffdb5d` / `8a57694` | Minimal env-var + deployment-identity diagnostic route |
| `d9be52e` | OpenAI diagnostic — kept as admin-only feature (intentional) |

**Status:** ✅ Already clean — no action needed.

---

## Category 2: Blueprint/Planning Documents in Code

These commits added planning documents that were approved design artifacts. They may have been committed to the repository rather than existing only in conversation history.

| File Pattern | Commit | Recommendation |
|---|---|---|
| v1.2 SaaS Architecture Proposal | `2b56f18` | Verify no `.md` file was committed to `src/`; if so, move to `docs/` or remove |
| Stripe Integration Plan | `f30f171` | Same — verify location |
| Job Seeker Product Expansion Blueprint | `f3d4f69` | Same — verify location |

**Action needed:** Run `git show <commit>` to verify where these files landed. If they are in `src/` or root, they belong in `docs/` or can be removed (the information now lives in the ADRs and roadmap).

---

## Category 3: Stale or Redundant Files

These files may exist and be candidates for review:

### 3a. Engineering docs in non-standard location

| File | Location | Issue | Recommendation |
|---|---|---|---|
| `database-workflow.md` | `docs/engineering/` (committed in task #53) | Engineering subfolder may be outside the new `docs/` hierarchy | Move to `docs/architecture/` or `docs/guides/` |

### 3b. Legacy redirect TODO comments

Per commit `0b53d44`, legacy redirects were added for old candidate nav paths. These are intentional compatibility shims but should be reviewed:

| What | Where | Recommendation |
|---|---|---|
| Legacy route redirect `TODO` comments | `src/app/[locale]/candidate/` | Audit which redirects are still needed; remove the `TODO` marker once the redirect is accepted as permanent |

### 3c. e2e test accounts in seed data

Test accounts (`admin@test.com`, `recruiter@test.com`, `candidate@test.com`) must not exist in production. Verify they are only created via local Supabase seed scripts and are not in any production migration.

---

## Category 4: Code Quality Candidates (Non-Blocking)

These are not bugs but are worth addressing before major new feature work:

### 4a. Environment variable naming inconsistency

`OPENAI_API_KEY` is used for the OpenRouter key. This is confusing for new contributors. Consider:
- Add a comment in `.env.example` explaining the mismatch (low risk)
- Or rename to `AI_API_KEY` in a future migration (requires updating all references)

**Recommendation:** Comment in `.env.example` for now. Rename in v2.1 if OpenRouter becomes the long-term provider.

### 4b. `src/lib/ai/` module naming

Some AI modules are named by capability (`resume-ai.ts`) and some by tool type (`openai.ts`). No functional issue, but inconsistent. Low priority.

### 4c. `any` type usages

Some Server Action return types use `any` in intermediate processing. These should be narrowed. Run:
```bash
npx tsc --noEmit 2>&1 | grep "implicitly has an 'any' type"
```

### 4d. Console logs in production code

Some AI modules may have `console.log` statements for debugging. Run:
```bash
grep -r "console.log" src/ --include="*.ts" --include="*.tsx"
```
Remove any that are not intentional observability signals.

---

## Category 5: Dead Code Check

The following are worth auditing for dead exports (not called anywhere):

| Area | How to check |
|---|---|
| `src/lib/queries/` modules | Check for exported functions with zero `import` references |
| `src/actions/` modules | Same check |
| `src/components/workspace/` | Verify all workspace components are reachable from the nav |
| `src/types/` | Verify all shared types have active consumers |

**Tool:** VSCode "Find All References" on exports, or use a dead-code analyzer like `ts-prune`:
```bash
npx ts-prune --project tsconfig.json
```

---

## Category 6: v1.9 / Stabilization Sprint New Additions

These items were added or identified during the v2.0 stabilization sprint. All are intentional and in their correct location.

| Item | Location | Status |
|---|---|---|
| `e2e/resume-upload-v2.spec.ts` | `e2e/` | New — 28 e2e tests for v1.9 resume upload architecture. Keep. |
| `supabase/migrations/0050_resume_upload_v2.sql` | `supabase/migrations/` | New — nullable `file_url` column for resumes. Keep. |
| `docs/TECHNICAL_DEBT.md` | `docs/` | New — audit register, 13 items documented. Keep. |
| `docs/` directory tree (all) | `docs/` | New — 16+ documents created in stabilization sprint. Keep. |
| `docs/engineering/database-workflow.md` | `docs/engineering/` | Still exists — should be moved to `docs/guides/` to align with the new `docs/` hierarchy. No content change needed, only location. |

**Action needed for `docs/engineering/`:** Move `database-workflow.md` into `docs/guides/database-workflow.md` and remove the now-empty `docs/engineering/` folder. The file's content is still accurate. This was flagged in Category 3a above — confirming the file still exists as of 2026-08-17.

---

## Approved Actions Checklist

Use this checklist when reviewing:

- [ ] Verify no planning blueprints committed to `src/` — move to `docs/` if found
- [ ] Move `docs/engineering/database-workflow.md` into standard `docs/` subfolder
- [ ] Audit legacy redirect TODO comments in candidate nav
- [ ] Verify test accounts are not in any production Supabase migration
- [ ] Add clarifying comment to `.env.example` for `OPENAI_API_KEY`
- [ ] Audit `console.log` in `src/`
- [ ] Run `ts-prune` for dead exports audit

---

## What Was NOT Flagged

- No source files were flagged for deletion without explicit confirmation
- No routes were flagged for removal — all routes are actively linked in the navigation
- No database migrations were flagged for reversal — migrations are append-only
- The `docs/engineering/` folder is flagged for relocation, NOT deletion — content should be preserved
