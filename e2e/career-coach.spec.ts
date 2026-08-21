import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { STORAGE_STATE } from "./helpers/auth";
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
  await page.goto("/en/candidate/dashboard");
}

async function loginAsRecruiter(page: Page) {
  await page.goto("/en/recruiter/dashboard");
}

test.use({ storageState: STORAGE_STATE.candidate });

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

  test("assessment card shows trigger button when no assessment exists", async ({ page }) => {
    await page.goto(COACH_URL);
    const card = page.getByTestId("assessment-card");
    await expect(card).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("run-assessment-button")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId("run-assessment-button")).toBeEnabled({ timeout: 3_000 });
  });

  test("actions card shows roadmap-first prompt when no roadmap exists", async ({ page }) => {
    await page.goto(COACH_URL);
    const card = page.getByTestId("actions-card");
    await expect(card).toBeVisible({ timeout: 8_000 });
    // No "generate actions" button without a roadmap
    await expect(page.getByTestId("generate-actions-button")).not.toBeVisible({ timeout: 3_000 });
    await expect(card.getByText(/roadmap/i)).toBeVisible({ timeout: 3_000 });
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
  test.use({ storageState: STORAGE_STATE.recruiter });

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
    await loginAsCandidate(page);
    await page.goto(AR_COACH_URL);
    await expect(page).toHaveURL(/\/ar\/candidate\/workspace\/career-coach/, { timeout: 8_000 });
    // Should show Arabic heading or empty state
    const body = page.locator("body");
    await expect(body).not.toContainText("Application error", { timeout: 5_000 });
  });
});

// ─── Block 9: Phase 2C — Assessment, Roadmap, Actions UI ─────────────────────

test.describe("Career Coach — Phase 2C UI (seeded state)", () => {
  let userId: string;
  let goalId: string;

  test.beforeAll(async () => {
    userId = await getCandidateId();
  });

  test.beforeEach(async ({ page }) => {
    await deleteGoals(userId);
    // Seed a fresh active goal and capture its id
    const admin = adminClient();
    const { data } = await admin
      .from("career_goals")
      .insert({
        user_id: userId,
        title: "Phase 2C Test Goal",
        target_role: "Senior Engineer",
        current_role: "Engineer",
        status: "active",
      })
      .select("id")
      .single();
    goalId = data!.id;
    await loginAsCandidate(page);
  });

  // ── Assessment card ──────────────────────────────────────────────────────────

  test("run-assessment button is visible with active goal and no assessment", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("assessment-card")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("run-assessment-button")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId("run-assessment-button")).toBeEnabled();
  });

  test("next-step assessment button is visible from NextStepsCard with no assessment", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("next-step-assessment-button")).toBeVisible({ timeout: 8_000 });
  });

  test("assessment card shows results when assessment is seeded", async ({ page }) => {
    const admin = adminClient();
    await admin.from("career_assessments").insert({
      user_id: userId,
      goal_id: goalId,
      strengths: ["Strong communicator", "Systems thinking"],
      weaknesses: ["Limited cloud experience"],
      opportunities: ["Growing demand for full-stack"],
      skill_gaps: [{ skill: "Kubernetes", priority: "high", estimated_months: 2 }],
      experience_gaps: [],
      leadership_gaps: [],
      suggested_roles: ["Staff Engineer"],
      raw_data: {},
    });

    await page.goto(COACH_URL);
    await expect(page.getByTestId("assessment-card")).toBeVisible({ timeout: 8_000 });
    // Run button should be gone
    await expect(page.getByTestId("run-assessment-button")).not.toBeVisible({ timeout: 3_000 });
    // Strengths section should be present
    await expect(page.getByTestId("assessment-card").getByText("Strong communicator")).toBeVisible({ timeout: 5_000 });
  });

  // ── Roadmap card ─────────────────────────────────────────────────────────────

  test("roadmap card is not rendered when no assessment exists", async ({ page }) => {
    await page.goto(COACH_URL);
    await expect(page.getByTestId("roadmap-card")).not.toBeVisible({ timeout: 5_000 });
  });

  test("roadmap card shows generate button after assessment is seeded", async ({ page }) => {
    const admin = adminClient();
    await admin.from("career_assessments").insert({
      user_id: userId,
      goal_id: goalId,
      strengths: ["Leadership"],
      weaknesses: [],
      opportunities: [],
      skill_gaps: [],
      experience_gaps: [],
      leadership_gaps: [],
      suggested_roles: [],
      raw_data: {},
    });

    await page.goto(COACH_URL);
    await expect(page.getByTestId("roadmap-card")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("generate-roadmap-button")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId("generate-roadmap-button")).toBeEnabled();
  });

  test("next-step roadmap button visible after assessment but before roadmap", async ({ page }) => {
    const admin = adminClient();
    await admin.from("career_assessments").insert({
      user_id: userId,
      goal_id: goalId,
      strengths: ["Leadership"],
      weaknesses: [],
      opportunities: [],
      skill_gaps: [],
      experience_gaps: [],
      leadership_gaps: [],
      suggested_roles: [],
      raw_data: {},
    });

    await page.goto(COACH_URL);
    await expect(page.getByTestId("next-step-roadmap-button")).toBeVisible({ timeout: 8_000 });
  });

  test("roadmap card shows phases when roadmap is seeded", async ({ page }) => {
    const admin = adminClient();
    await admin.from("career_assessments").insert({
      user_id: userId,
      goal_id: goalId,
      strengths: ["Leadership"],
      weaknesses: [],
      opportunities: [],
      skill_gaps: [],
      experience_gaps: [],
      leadership_gaps: [],
      suggested_roles: [],
      raw_data: {},
    });
    const { data: roadmapRow } = await admin
      .from("career_roadmaps")
      .insert({
        user_id: userId,
        goal_id: goalId,
        phases: [
          {
            phase: 1,
            label: "Foundation",
            duration_weeks: 4,
            focus: "Core skills",
            milestones: ["Complete course A"],
          },
          {
            phase: 2,
            label: "Growth",
            duration_weeks: 8,
            focus: "Applied projects",
            milestones: ["Ship project B"],
          },
        ],
      })
      .select("id")
      .single();
    expect(roadmapRow).not.toBeNull();

    await page.goto(COACH_URL);
    await expect(page.getByTestId("roadmap-card")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("generate-roadmap-button")).not.toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId("roadmap-card").getByText("Foundation")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("roadmap-card").getByText("Growth")).toBeVisible({ timeout: 5_000 });
  });

  // ── Actions card ─────────────────────────────────────────────────────────────

  test("generate-actions button appears when roadmap is seeded", async ({ page }) => {
    const admin = adminClient();
    await admin.from("career_assessments").insert({
      user_id: userId,
      goal_id: goalId,
      strengths: [],
      weaknesses: [],
      opportunities: [],
      skill_gaps: [],
      experience_gaps: [],
      leadership_gaps: [],
      suggested_roles: [],
      raw_data: {},
    });
    const { data: roadmapRow } = await admin
      .from("career_roadmaps")
      .insert({
        user_id: userId,
        goal_id: goalId,
        phases: [{ phase: 1, label: "Foundation", duration_weeks: 4, focus: "Core", milestones: [] }],
      })
      .select("id")
      .single();
    expect(roadmapRow).not.toBeNull();

    await page.goto(COACH_URL);
    await expect(page.getByTestId("actions-card")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByTestId("generate-actions-button")).toBeVisible({ timeout: 3_000 });
    await expect(page.getByTestId("generate-actions-button")).toBeEnabled();
  });

  test("actions checklist renders and action can be toggled", async ({ page }) => {
    const admin = adminClient();
    await admin.from("career_assessments").insert({
      user_id: userId,
      goal_id: goalId,
      strengths: [],
      weaknesses: [],
      opportunities: [],
      skill_gaps: [],
      experience_gaps: [],
      leadership_gaps: [],
      suggested_roles: [],
      raw_data: {},
    });
    const { data: roadmapRow } = await admin
      .from("career_roadmaps")
      .insert({
        user_id: userId,
        goal_id: goalId,
        phases: [{ phase: 1, label: "Foundation", duration_weeks: 4, focus: "Core", milestones: [] }],
      })
      .select("id")
      .single();
    const { data: actionRow } = await admin
      .from("career_weekly_actions")
      .insert({
        user_id: userId,
        goal_id: goalId,
        roadmap_id: roadmapRow!.id,
        title: "Read system design book",
        description: "Read chapters 1-3",
        action_type: "learning",
        status: "pending",
        week_number: 1,
        source: "ai",
      })
      .select("id")
      .single();
    expect(actionRow).not.toBeNull();

    await page.goto(COACH_URL);
    const actionItem = page.getByTestId(`action-item-${actionRow!.id}`);
    await expect(actionItem).toBeVisible({ timeout: 8_000 });
    // Generate button should not be visible when actions exist
    await expect(page.getByTestId("generate-actions-button")).not.toBeVisible({ timeout: 3_000 });

    // Toggle action to completed
    await actionItem.click();
    // After toggle, the item should still be visible (the UI updates optimistically or refreshes)
    await expect(actionItem).toBeVisible({ timeout: 8_000 });
  });
});
