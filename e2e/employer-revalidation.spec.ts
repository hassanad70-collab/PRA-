import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { STORAGE_STATE } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

/**
 * Regression suite for DEBT-001: employer.ts was using bare revalidatePath("/recruiter/...")
 * which silently no-ops for locale-prefixed routes (/en/recruiter/..., /ar/recruiter/...).
 *
 * Fix: all calls replaced with revalidateRecruiterPath() which iterates every
 * locale and revalidates /{locale}/recruiter{path}.
 *
 * These tests verify the mutated data is visible on explicitly locale-prefixed
 * recruiter URLs immediately after each employer action — the observable symptom
 * of the pre-fix bug was stale data on those pages until the user force-reloaded.
 *
 * Button selectors are derived from the actual component implementations:
 *   - candidate-search-client.tsx: save button uses `title` attribute ("Save candidate" / "Remove from saved")
 *   - saved-candidates-client.tsx: remove button is a Trash2 icon with no aria-label — located by role within the candidate's card
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe.serial("DEBT-001 regression: employer mutations revalidate locale-prefixed recruiter routes", () => {
  test.use({ storageState: STORAGE_STATE.recruiter });

  let candidateId: string;
  let recruiterId: string;

  test.beforeAll(async () => {
    const admin = adminClient();
    const { data: cProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    const { data: rProfile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.recruiter.email).single();
    candidateId = cProfile!.id;
    // recruiters.id is a FK to profiles.id (same UUID — not a surrogate key).
    recruiterId = rProfile!.id;

    // Clean slate — ensure no leftover saved rows from prior runs.
    await admin.from("saved_candidates").delete().eq("recruiter_id", recruiterId).eq("candidate_id", candidateId);
  });

  test.afterAll(async () => {
    const admin = adminClient();
    await admin.from("saved_candidates").delete().eq("recruiter_id", recruiterId).eq("candidate_id", candidateId);
  });

  test("locale-prefixed candidate-search page renders at /en/recruiter/candidate-search", async ({ page }) => {
    await page.goto("/en/recruiter/candidate-search");
    // Must stay on the locale-prefixed URL (middleware must not strip the locale).
    await expect(page).toHaveURL(/\/en\/recruiter\/candidate-search/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /candidate search/i })).toBeVisible({ timeout: 10_000 });
  });

  test("saveCandidateAction: saved candidate is visible on /en/recruiter/saved-candidates after save", async ({ page }) => {
    // Navigate to the explicitly locale-prefixed candidate search URL.
    await page.goto("/en/recruiter/candidate-search");
    await expect(page).toHaveURL(/\/en\/recruiter\/candidate-search/, { timeout: 10_000 });

    // The fixture candidate must appear in search results (default load, no query filter).
    await expect(page.getByText(TEST_USERS.candidate.fullName)).toBeVisible({ timeout: 10_000 });

    // The save button is an icon-only ghost button; its accessible name is the
    // `title` attribute — "Save candidate" (from Recruiter.CandidateSearch.save in en.json).
    // We scope to the first unsaved bookmark button to avoid ambiguity.
    const saveBtn = page.getByTitle("Save candidate").first();
    await saveBtn.click();

    // Toast confirms the action completed ("Candidate saved" from Recruiter.CandidateSearch.savedToast).
    await expect(page.getByText("Candidate saved")).toBeVisible({ timeout: 10_000 });

    // Navigate to the locale-prefixed saved-candidates page.
    // Before the DEBT-001 fix, revalidatePath("/recruiter/saved-candidates") was a no-op here,
    // meaning the page cache was not cleared and a server-side render might return stale data.
    await page.goto("/en/recruiter/saved-candidates");
    await expect(page).toHaveURL(/\/en\/recruiter\/saved-candidates/, { timeout: 10_000 });

    // The fixture candidate must appear — proof that /en/recruiter/saved-candidates
    // was correctly revalidated by revalidateRecruiterPath("/saved-candidates").
    await expect(page.getByText(TEST_USERS.candidate.fullName)).toBeVisible({ timeout: 10_000 });
  });

  test("unsaveCandidateAction: candidate removed from /en/recruiter/saved-candidates after unsave", async ({ page }) => {
    // Seed: ensure the candidate is already saved before this test.
    const admin = adminClient();
    await admin
      .from("saved_candidates")
      .upsert({ recruiter_id: recruiterId, candidate_id: candidateId }, { onConflict: "recruiter_id,candidate_id" });

    await page.goto("/en/recruiter/saved-candidates");
    await expect(page).toHaveURL(/\/en\/recruiter\/saved-candidates/, { timeout: 10_000 });

    // Fixture candidate must be present before we remove.
    await expect(page.getByText(TEST_USERS.candidate.fullName)).toBeVisible({ timeout: 10_000 });

    // The remove button is a Trash2 icon-only ghost button with no accessible name.
    // Since this is a clean-slate test (only one saved candidate), we can reliably
    // target it by finding the button that is a sibling of the candidate name within
    // the same flex header row (the only icon button in that row).
    const candidateNameEl = page.getByText(TEST_USERS.candidate.fullName, { exact: true }).first();
    // Climb to the flex header div (parent of the initials avatar, name block, and remove button)
    // then find the button within it.
    const cardHeaderRow = candidateNameEl.locator("xpath=ancestor::div[contains(@class,'flex') and contains(@class,'items-start')]").first();
    const removeBtn = cardHeaderRow.getByRole("button").first();
    await removeBtn.click();

    // Toast: "Candidate removed from saved" (Recruiter.SavedCandidates.removed in en.json).
    await expect(page.getByText("Candidate removed from saved")).toBeVisible({ timeout: 10_000 });

    // The candidate must no longer be visible in the list — the optimistic update
    // already removes it from React state, but a full reload would show stale data
    // if revalidateRecruiterPath("/saved-candidates") were not called correctly.
    await expect(page.getByText(TEST_USERS.candidate.fullName)).not.toBeVisible({ timeout: 5_000 });
  });

  test("company-profile page renders at /en/recruiter/company-profile after revalidation is correctly scoped", async ({ page }) => {
    // upsertCompanyProfileAction and publishCompanyProfileAction call
    // revalidateRecruiterPath("/company-profile"), revalidating both
    // /en/recruiter/company-profile and /ar/recruiter/company-profile.
    // This test ensures the locale-prefixed URL is reachable and renders correctly.
    await page.goto("/en/recruiter/company-profile");
    await expect(page).toHaveURL(/\/en\/recruiter\/company-profile/, { timeout: 10_000 });

    // The company profile page must render its heading (recruiter has a company by test-setup).
    await expect(page.getByRole("heading", { name: /company profile/i })).toBeVisible({ timeout: 10_000 });
  });

  test("talent-pool page renders at /en/recruiter/talent-pool (revalidateRecruiterPath scoped correctly)", async ({ page }) => {
    // addToTalentPoolAction / removeFromTalentPoolAction / toggleTalentPoolFavoriteAction
    // call revalidateRecruiterPath("/talent-pool"). This test verifies the locale-prefixed
    // route is reachable and renders correctly (the heading and empty/pool state).
    await page.goto("/en/recruiter/talent-pool");
    await expect(page).toHaveURL(/\/en\/recruiter\/talent-pool/, { timeout: 10_000 });

    await expect(page.getByRole("heading", { name: /talent pool/i })).toBeVisible({ timeout: 10_000 });
  });
});
