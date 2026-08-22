import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { STORAGE_STATE } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

/**
 * Unit B (Modular AI Writing Tools): the Resume Intelligence Hub's
 * "Rewrite & Optimize" module. This project runs without OPENAI_API_KEY
 * configured, so generateSummarySuggestion falls back to a fixed string
 * when the candidate has no summary yet -- that's exploited here as a
 * deterministic way to get a real, visible suggestion (and therefore a
 * real Accept -> persisted-to-profile round trip) without requiring a
 * live API key, matching this suite's existing "works either way"
 * philosophy for AI-backed features.
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe("Resume Intelligence Hub — Rewrite & Optimize (Unit B)", () => {
  test.use({ storageState: STORAGE_STATE.candidate });

  test.beforeEach(async ({ page }) => {
    await page.goto("/candidate/dashboard");
  });

  test("generating suggestions with no data to improve shows the empty state, not a blank panel", async ({ page }) => {
    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    // A non-empty summary plus no experience/skills means every decomposed
    // tool's fallback returns "no change" -- the exact case that used to
    // render nothing at all before the empty-state fix.
    await admin.from("candidates").update({ summary: "Existing summary that AI won't change without a real key." }).eq("id", profile!.id);
    await admin.from("candidate_experience").delete().eq("candidate_id", profile!.id);
    await admin.from("candidate_skills").delete().eq("candidate_id", profile!.id);

    await page.goto("/candidate/workspace/ats-checker");
    await page.getByRole("heading", { name: "Rewrite & Optimize" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Generate suggestions" }).click();
    await expect(page.getByText(/no new suggestions right now/i)).toBeVisible({ timeout: 15_000 });
  });

  test("accepting a summary suggestion writes it to the candidate's profile", async ({ page }) => {
    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await admin.from("candidates").update({ summary: null }).eq("id", profile!.id);

    await page.goto("/candidate/workspace/ats-checker");
    await page.getByRole("heading", { name: "Rewrite & Optimize" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Generate suggestions" }).click();

    // Not scoped with .first() this text would also match a History (Unit C)
    // entry from a prior run of this same suite -- that module renders the
    // same "Professional summary" label for its own accepted/rejected rows.
    await expect(page.getByText("Professional summary").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Accept" }).first().click();
    await expect(page.getByText("Applied").first()).toBeVisible({ timeout: 10_000 });

    const { data: updated } = await admin.from("candidates").select("summary").eq("id", profile!.id).single();
    expect(updated?.summary).toBeTruthy();
    expect(updated?.summary).not.toBeNull();

    // Restore a normal summary so this doesn't leak into other specs.
    await admin.from("candidates").update({ summary: "Experienced software engineer." }).eq("id", profile!.id);
  });

  test("rejecting a suggestion dismisses it without changing the profile", async ({ page }) => {
    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await admin.from("candidates").update({ summary: null }).eq("id", profile!.id);

    await page.goto("/candidate/workspace/ats-checker");
    await page.getByRole("heading", { name: "Rewrite & Optimize" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Generate suggestions" }).click();

    await expect(page.getByText("Professional summary").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Reject" }).first().click();
    await expect(page.getByText("Rejected").first()).toBeVisible();

    const { data: unchanged } = await admin.from("candidates").select("summary").eq("id", profile!.id).single();
    expect(unchanged?.summary).toBeNull();

    await admin.from("candidates").update({ summary: "Experienced software engineer." }).eq("id", profile!.id);
  });
});
