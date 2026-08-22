import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { STORAGE_STATE } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

/**
 * Unit C (Resume Versioning & History): the resume_suggestion_events audit
 * log behind the Resume Intelligence Hub's History module (migration 0020).
 * Covers the full pipeline (generate -> pending event -> accept/reject ->
 * History renders it) plus the DB-level immutability trigger, which is
 * cheaper and more precise to verify directly against the table than
 * through the UI.
 */

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe("Resume Intelligence Hub — Suggestion History (Unit C)", () => {
  test.use({ storageState: STORAGE_STATE.candidate });

  test.beforeEach(async ({ page }) => {
    await page.goto("/candidate/dashboard");
  });

  test("accepting a suggestion logs a pending event, updates it to accepted, and it appears in History", async ({ page }) => {
    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await admin.from("candidates").update({ summary: null }).eq("id", profile!.id);

    const since = new Date().toISOString();

    await page.goto("/candidate/workspace/ats-checker");
    await page.getByRole("heading", { name: "Rewrite & Optimize" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Generate suggestions" }).click();
    await expect(page.getByText("Professional summary").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Accept" }).first().click();
    await expect(page.getByText("Applied").first()).toBeVisible({ timeout: 10_000 });

    // decideSuggestionEvent is fired client-side, fire-and-forget -- poll
    // rather than assuming it has already landed the moment the UI updates.
    await expect
      .poll(async () => {
        const { data } = await admin
          .from("resume_suggestion_events")
          .select("outcome")
          .eq("candidate_id", profile!.id)
          .eq("suggestion_type", "summary")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data?.outcome ?? null;
      }, { timeout: 10_000 })
      .toBe("accepted");

    const { data: event } = await admin
      .from("resume_suggestion_events")
      .select("*")
      .eq("candidate_id", profile!.id)
      .eq("suggestion_type", "summary")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    expect(event!.source).toBe("rewrite_optimize");
    expect(event!.decided_at).toBeTruthy();
    expect(event!.after_value).toBeTruthy();

    await page.reload();
    const historyCard = page.getByTestId("suggestion-history");
    await historyCard.scrollIntoViewIfNeeded();
    await expect(historyCard.getByText("Professional summary").first()).toBeVisible();
    await expect(historyCard.getByText("Accepted").first()).toBeVisible();

    await admin.from("candidates").update({ summary: "Experienced software engineer." }).eq("id", profile!.id);
  });

  test("rejecting a suggestion logs an event updated to rejected", async ({ page }) => {
    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();
    await admin.from("candidates").update({ summary: null }).eq("id", profile!.id);

    const since = new Date().toISOString();

    await page.goto("/candidate/workspace/ats-checker");
    await page.getByRole("heading", { name: "Rewrite & Optimize" }).scrollIntoViewIfNeeded();
    await page.getByRole("button", { name: "Generate suggestions" }).click();
    await expect(page.getByText("Professional summary").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Reject" }).first().click();
    await expect(page.getByText("Rejected").first()).toBeVisible();

    await expect
      .poll(async () => {
        const { data } = await admin
          .from("resume_suggestion_events")
          .select("outcome")
          .eq("candidate_id", profile!.id)
          .eq("suggestion_type", "summary")
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data?.outcome ?? null;
      }, { timeout: 10_000 })
      .toBe("rejected");

    const { data: unchangedCandidate } = await admin.from("candidates").select("summary").eq("id", profile!.id).single();
    expect(unchangedCandidate?.summary).toBeNull();

    await page.reload();
    const historyCard = page.getByTestId("suggestion-history");
    await historyCard.scrollIntoViewIfNeeded();
    await expect(historyCard.getByText("Rejected").first()).toBeVisible();

    await admin.from("candidates").update({ summary: "Experienced software engineer." }).eq("id", profile!.id);
  });

  test("the immutability trigger blocks changes to protected columns but allows outcome/decided_at", async () => {
    const admin = adminClient();
    const { data: profile } = await admin.from("profiles").select("id").eq("email", TEST_USERS.candidate.email).single();

    const { data: inserted, error: insertError } = await admin
      .from("resume_suggestion_events")
      .insert({
        candidate_id: profile!.id,
        source: "rewrite_optimize",
        suggestion_type: "summary",
        after_value: { text: "e2e immutability probe" },
        outcome: "pending",
      })
      .select("id")
      .single();
    expect(insertError).toBeNull();

    const { error: mutableFieldsError } = await admin
      .from("resume_suggestion_events")
      .update({ outcome: "accepted", decided_at: new Date().toISOString() })
      .eq("id", inserted!.id);
    expect(mutableFieldsError).toBeNull();

    const { error: immutableFieldError } = await admin
      .from("resume_suggestion_events")
      .update({ after_value: { text: "mutated" } })
      .eq("id", inserted!.id);
    expect(immutableFieldError).not.toBeNull();
    expect(immutableFieldError!.message).toMatch(/immutable/i);

    const { data: unchanged } = await admin
      .from("resume_suggestion_events")
      .select("after_value, outcome")
      .eq("id", inserted!.id)
      .single();
    expect(unchanged!.after_value).toEqual({ text: "e2e immutability probe" });
    expect(unchanged!.outcome).toBe("accepted");

    // This is a synthetic probe row, not real candidate history -- clean it
    // up directly rather than leaving test fixtures in an audit table meant
    // for genuine suggestion review history.
    await admin.from("resume_suggestion_events").delete().eq("id", inserted!.id);
  });

  test("History module renders correctly in both locales", async ({ page }) => {
    await page.goto("/en/candidate/workspace/ats-checker");
    const historyCardEn = page.getByTestId("suggestion-history");
    await historyCardEn.scrollIntoViewIfNeeded();
    await expect(historyCardEn.getByRole("heading", { name: "History" })).toBeVisible();

    await page.goto("/ar/candidate/workspace/ats-checker");
    const historyCardAr = page.getByTestId("suggestion-history");
    await historyCardAr.scrollIntoViewIfNeeded();
    await expect(historyCardAr.getByRole("heading", { name: "السجل" })).toBeVisible();
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
  });
});
