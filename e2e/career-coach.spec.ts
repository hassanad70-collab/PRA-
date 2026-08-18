import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COACH_URL = "/en/candidate/workspace/career-coach";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function getCandidateId(): Promise<string> {
  const admin = adminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("email", TEST_USERS.candidate.email)
    .single();
  return data!.id;
}

async function deleteGoals(userId: string) {
  const admin = adminClient();
  await admin.from("career_goals").delete().eq("user_id", userId);
}

async function loginAsCandidate(page: Page) {
  await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
  await expect(page).toHaveURL(/\/candidate\/dashboard$/, { timeout: 15_000 });
}

async function loginAsRecruiter(page: Page) {
  await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
  await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
}

// ─── Block 1: Access and empty state ─────────────────────────────────────────

test.describe("Career Coach — access and empty state", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await getCandidateId();
  });

  test.beforeEach(async ({ page }) => {
    await deleteGoals(userId);
    await loginAsCandidate(page);
  });

  test("candidate can access Career Coach page", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page).toHaveURL(/career-coach/, { timeout: 8_000 });
    await expect(page.getByRole("heading", { name: "AI Career Coach" })).toBeVisible({ timeout: 5_000 });
  });

  test("candidate with no goal sees the empty onboarding state", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("coach-empty-state")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Start Your Career Journey")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId("create-goal-cta")).toBeVisible({ timeout: 3_000 });
  });

  test("career coach appears in nav under AI Career Workspace", async ({ page }) => {
    await page.goto("/en/candidate/dashboard");
    // The nav item should exist
    const navItem = page.getByRole("link", { name: /AI Career Coach/i });
    await expect(navItem).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Block 2: Goal creation ───────────────────────────────────────────────────

test.describe("Career Coach — goal creation", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await getCandidateId();
  });

  test.beforeEach(async ({ page }) => {
    await deleteGoals(userId);
    await loginAsCandidate(page);
  });

  test("candidate can create a career goal from the empty state CTA", async ({ page }) => {
    await page.goto(COACH_URL);
    await page.getByTestId("create-goal-cta").click();

    const dialog = page.getByTestId("goal-dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await page.getByTestId("goal-title-input").fill("Become a Senior Engineer");
    await page.getByTestId("goal-target-input").fill("Senior Software Engineer");
    await page.getByTestId("goal-current-input").fill("Software Engineer");

    await page.getByTestId("goal-save-button").click();

    // Should show the dashboard with the goal card
    await expect(page.getByTestId("goal-card")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("goal-title")).toContainText("Become a Senior Engineer");
    await expect(page.getByTestId("goal-target-role")).toContainText("Senior Software Engineer");
  });

  test("goal persists after page refresh", async ({ page }) => {
    // Seed goal directly
    const admin = adminClient();
    await admin.from("career_goals").insert({
      user_id: userId,
      title: "Become a Staff Engineer",
      target_role: "Staff Engineer",
      status: "active",
    });

    await page.goto(COACH_URL);
    await expect(page.getByTestId("goal-title")).toContainText("Become a Staff Engineer", { timeout: 8_000 });

    // Reload
    await page.reload();
    await expect(page.getByTestId("goal-title")).toContainText("Become a Staff Engineer", { timeout: 8_000 });
  });

  test("goal dialog requires title and target role", async ({ page }) => {
    await page.goto(COACH_URL);
    await page.getByTestId("create-goal-cta").click();

    const dialog = page.getByTestId("goal-dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Try to submit empty
    await page.getByTestId("goal-save-button").click();

    // Should not close (dialog still visible)
    await expect(dialog).toBeVisible({ timeout: 2_000 });
  });
});

// ─── Block 3: Goal management ─────────────────────────────────────────────────

test.describe("Career Coach — goal management", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await getCandidateId();
  });

  test.beforeEach(async ({ page }) => {
    await deleteGoals(userId);
    // Seed an active goal
    const admin = adminClient();
    await admin.from("career_goals").insert({
      user_id: userId,
      title: "Transition to Data Science",
      target_role: "Data Scientist",
      current_role: "Software Engineer",
      status: "active",
    });
    await loginAsCandidate(page);
  });

  test("candidate can edit an existing goal", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("goal-card")).toBeVisible({ timeout: 8_000 });

    await page.getByRole("button", { name: "Edit" }).click();

    const dialog = page.getByTestId("goal-dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Update target role
    await page.getByTestId("goal-target-input").clear();
    await page.getByTestId("goal-target-input").fill("Senior Data Scientist");
    await page.getByTestId("goal-save-button").click();

    await expect(page.getByTestId("goal-target-role")).toContainText("Senior Data Scientist", { timeout: 8_000 });
  });

  test("candidate can pause a goal", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("goal-card")).toBeVisible({ timeout: 8_000 });

    await page.getByTestId("pause-goal-button").click();

    // Confirm dialog
    await page.getByTestId("confirm-status-button").click();

    // Goal should now show paused status
    await expect(page.getByText("Paused")).toBeVisible({ timeout: 8_000 });
  });

  test("candidate can resume a paused goal", async ({ page }) => {
    // Seed paused goal
    const admin = adminClient();
    await admin.from("career_goals").delete().eq("user_id", userId);
    await admin.from("career_goals").insert({
      user_id: userId,
      title: "Paused Career Goal",
      target_role: "Engineering Manager",
      status: "paused",
    });

    await page.goto(COACH_URL);
    await expect(page.getByTestId("goal-card")).toBeVisible({ timeout: 8_000 });

    await page.getByTestId("resume-goal-button").click();
    await page.getByTestId("confirm-status-button").click();

    await expect(page.getByText("Active")).toBeVisible({ timeout: 8_000 });
  });

  test("candidate can mark a goal as complete", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("goal-card")).toBeVisible({ timeout: 8_000 });

    await page.getByTestId("complete-goal-button").click();
    await page.getByTestId("confirm-status-button").click();

    // After completion, the active goal disappears — should see empty state or completed badge
    await expect(page.getByTestId("coach-empty-state")).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Block 4: Progress and readiness ─────────────────────────────────────────

test.describe("Career Coach — progress display", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await getCandidateId();
  });

  test.beforeEach(async ({ page }) => {
    await deleteGoals(userId);
    const admin = adminClient();
    await admin.from("career_goals").insert({
      user_id: userId,
      title: "Grow Into Leadership",
      target_role: "Engineering Manager",
      status: "active",
    });
    await loginAsCandidate(page);
  });

  test("progress score card renders with 0/100 for new goal", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("progress-card")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("progress-score")).toContainText("0", { timeout: 5_000 });
  });

  test("readiness card is visible and separate from progress score", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("readiness-card")).toBeVisible({ timeout: 8_000 });

    // Readiness card should mention separation
    await expect(page.getByText(/separate from your progress score/i)).toBeVisible({ timeout: 3_000 });
  });

  test("assessment card shows locked state when no assessment exists", async ({ page }) => {
    await page.goto(COACH_URL);
    const card = page.getByTestId("assessment-card");
    await expect(card).toBeVisible({ timeout: 8_000 });
    await expect(card.getByText(/coming in next phase/i)).toBeVisible({ timeout: 3_000 });
  });

  test("actions card shows locked state when no roadmap exists", async ({ page }) => {
    await page.goto(COACH_URL);
    const card = page.getByTestId("actions-card");
    await expect(card).toBeVisible({ timeout: 8_000 });
    await expect(card.getByText(/coming in next phase/i)).toBeVisible({ timeout: 3_000 });
  });
});

// ─── Block 5: Global AI Assistant remains available ───────────────────────────

test.describe("Career Coach — Global AI Assistant coexistence", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test("global AI Assistant tab is visible on the Career Coach page", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("global-ai-tab")).toBeVisible({ timeout: 8_000 });
  });

  test("global AI Assistant can be opened from Career Coach page", async ({ page }) => {
    await page.goto(COACH_URL);
    await page.getByTestId("global-ai-tab").click();
    await expect(page.getByRole("dialog", { name: "AI Assistant" })).toBeVisible({ timeout: 5_000 });
  });
});

// ─── Block 6: Security — recruiter cannot access candidate coach ───────────────

test.describe("Career Coach — access control", () => {
  test("recruiter is redirected away from candidate career-coach page", async ({ page }) => {
    await loginAsRecruiter(page);
    await page.goto(COACH_URL);
    // Should NOT land on career-coach — redirected to login or recruiter portal
    await expect(page).not.toHaveURL(/career-coach$/, { timeout: 8_000 });
  });
});

// ─── Block 7: Mobile layout ───────────────────────────────────────────────────

test.describe("Career Coach — mobile layout", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await getCandidateId();
  });

  test.beforeEach(async ({ page }) => {
    await deleteGoals(userId);
  });

  test("empty state is visible on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsCandidate(page);
    await page.goto(COACH_URL);
    await expect(page.getByTestId("coach-empty-state")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("create-goal-cta")).toBeVisible({ timeout: 3_000 });
  });

  test("goal dialog is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsCandidate(page);
    await page.goto(COACH_URL);
    await page.getByTestId("create-goal-cta").click();
    await expect(page.getByTestId("goal-dialog")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("goal-title-input")).toBeVisible({ timeout: 3_000 });
  });
});

// ─── Block 8: Arabic/RTL ──────────────────────────────────────────────────────

test.describe("Career Coach — Arabic/RTL", () => {
  const AR_COACH_URL = "/ar/candidate/workspace/career-coach";
  let userId: string;

  test.beforeAll(async () => {
    userId = await getCandidateId();
  });

  test.beforeEach(async ({ page }) => {
    await deleteGoals(userId);
  });

  test("Arabic career-coach page loads without errors", async ({ page }) => {
    await login(page, TEST_USERS.candidate.email, TEST_USERS.candidate.password);
    await page.goto(AR_COACH_URL);
    await expect(page).toHaveURL(/\/ar\/candidate\/workspace\/career-coach/, { timeout: 8_000 });
    // Should show Arabic heading or empty state
    const body = page.locator("body");
    await expect(body).not.toContainText("Application error", { timeout: 5_000 });
  });
});
