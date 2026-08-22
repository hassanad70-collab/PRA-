import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { STORAGE_STATE } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

async function loginAsCandidate(page: Page) {
  await page.goto("/en/candidate/dashboard");
}

async function loginAsRecruiter(page: Page) {
  await page.goto("/en/recruiter/dashboard");
}

async function getUserId(email: string): Promise<string> {
  const admin = adminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();
  return data!.id;
}

async function deleteCandidateSessions(userId: string) {
  const admin = adminClient();
  await admin.from("ai_chat_sessions").delete().eq("user_id", userId);
}

test.use({ storageState: STORAGE_STATE.candidate });

// ─── Block 1a: Floating tab visibility (candidate pages) ─────────────────────

test.describe("Global AI Assistant — floating tab visibility on candidate pages", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test("floating tab is visible on the candidate dashboard", async ({ page }) => {
    await page.goto("/en/candidate/dashboard");
    const tab = page.getByTestId("global-ai-tab");
    await expect(tab).toBeVisible({ timeout: 8_000 });
  });

  test("floating tab persists after navigating to another candidate page", async ({ page }) => {
    await page.goto("/en/candidate/dashboard");
    await expect(page.getByTestId("global-ai-tab")).toBeVisible({ timeout: 8_000 });

    await page.goto("/en/candidate/workspace/studio");
    await expect(page.getByTestId("global-ai-tab")).toBeVisible({ timeout: 8_000 });

    await page.goto("/en/candidate/workspace/ats-checker");
    await expect(page.getByTestId("global-ai-tab")).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Block 1b: Floating tab NOT shown on recruiter portal ────────────────────
// Separate describe so the candidate-login beforeEach does not interfere.

test.describe("Global AI Assistant — NOT shown on recruiter portal", () => {
  test.use({ storageState: STORAGE_STATE.recruiter });

  test("floating tab is NOT shown on the recruiter portal", async ({ page }) => {
    await loginAsRecruiter(page);
    await page.goto("/en/recruiter/dashboard");
    await expect(page.getByTestId("global-ai-tab")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("global-ai-fab")).not.toBeVisible({ timeout: 3_000 });
  });
});

// ─── Block 2: Open / close / persistence ─────────────────────────────────────

test.describe("Global AI Assistant — open/close/persistence", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await getUserId(TEST_USERS.candidate.email);
  });

  test.beforeEach(async ({ page }) => {
    await deleteCandidateSessions(userId);
    await loginAsCandidate(page);
  });

  test("clicking the floating tab opens the AI Assistant drawer", async ({ page }) => {
    await page.goto("/en/candidate/dashboard");
    await page.getByTestId("global-ai-tab").click();
    await expect(page.getByRole("dialog", { name: "AI Assistant" })).toBeVisible({ timeout: 5_000 });
  });

  test("clicking the close button dismisses the drawer", async ({ page }) => {
    await page.goto("/en/candidate/dashboard");
    await page.getByTestId("global-ai-tab").click();
    await expect(page.getByRole("dialog", { name: "AI Assistant" })).toBeVisible({ timeout: 5_000 });

    // Close via the X button
    await page.getByRole("button", { name: "Close AI Assistant" }).click();
    await expect(page.getByRole("dialog", { name: "AI Assistant" })).not.toBeVisible({ timeout: 3_000 });
  });

  test("session created in drawer still visible after close → reopen", async ({ page }) => {
    const admin = adminClient();
    await admin
      .from("ai_chat_sessions")
      .insert({ user_id: userId, domain: "general", title: "Persisted drawer session" });

    await page.goto("/en/candidate/dashboard");

    // Open drawer
    await page.getByTestId("global-ai-tab").click();
    await expect(page.getByRole("dialog", { name: "AI Assistant" })).toBeVisible({ timeout: 5_000 });

    // Open history view
    await page.getByRole("button", { name: "Conversation History" }).click();
    await expect(page.getByText("Persisted drawer session")).toBeVisible({ timeout: 8_000 });

    // Close drawer
    await page.getByRole("button", { name: "Close AI Assistant" }).click();
    await expect(page.getByRole("dialog", { name: "AI Assistant" })).not.toBeVisible({ timeout: 3_000 });

    // Reopen — session must still be there
    await page.getByTestId("global-ai-tab").click();
    await page.getByRole("button", { name: "Conversation History" }).click();
    await expect(page.getByText("Persisted drawer session")).toBeVisible({ timeout: 5_000 });
  });

  test("floating tab is NOT rendered on the dedicated chatbot page", async ({ page }) => {
    await page.goto("/en/candidate/workspace/assistant");
    await expect(page.getByTestId("global-ai-tab")).not.toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("global-ai-fab")).not.toBeVisible({ timeout: 3_000 });
  });
});

// ─── Block 3: Context awareness ───────────────────────────────────────────────

test.describe("Global AI Assistant — context awareness", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test("shows 'ATS Checker' context chip when opened from the ATS page", async ({ page }) => {
    await page.goto("/en/candidate/workspace/ats-checker");
    await page.getByTestId("global-ai-tab").click();

    const dialog = page.getByRole("dialog", { name: "AI Assistant" });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // Context chip in the drawer header reflects the current page
    await expect(dialog.getByText("ATS Checker", { exact: true })).toBeVisible({ timeout: 3_000 });
  });

  test("shows 'Resume Studio' context when opened from Resume Studio page", async ({ page }) => {
    await page.goto("/en/candidate/workspace/studio");
    await page.getByTestId("global-ai-tab").click();

    const dialog = page.getByRole("dialog", { name: "AI Assistant" });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    await expect(dialog.getByText("Resume Studio", { exact: true })).toBeVisible({ timeout: 3_000 });
  });
});

// ─── Block 4: Sessions and cross-component sharing ───────────────────────────

test.describe("Global AI Assistant — sessions and sharing", () => {
  let userId: string;

  test.beforeAll(async () => {
    userId = await getUserId(TEST_USERS.candidate.email);
  });

  test.beforeEach(async () => {
    await deleteCandidateSessions(userId);
  });

  test("session created in drawer appears on the dedicated chatbot page", async ({ page }) => {
    await loginAsCandidate(page);

    // Seed a session directly in the DB
    const admin = adminClient();
    await admin
      .from("ai_chat_sessions")
      .insert({ user_id: userId, domain: "resume", title: "Cross-component session" });

    await page.goto("/en/candidate/dashboard");

    // Open drawer → go to history
    await page.getByTestId("global-ai-tab").click();
    await page.getByRole("button", { name: "Conversation History" }).click();
    await expect(page.getByText("Cross-component session")).toBeVisible({ timeout: 8_000 });

    // Navigate to the dedicated chatbot page
    await page.goto("/en/candidate/workspace/assistant");
    await expect(page.getByText("Cross-component session")).toBeVisible({ timeout: 8_000 });
  });

  test("ATS domain tab is auto-selected when opening drawer from ATS Checker", async ({ page }) => {
    await loginAsCandidate(page);
    await page.goto("/en/candidate/workspace/ats-checker");

    await page.getByTestId("global-ai-tab").click();

    const dialog = page.getByRole("dialog", { name: "AI Assistant" });
    await expect(dialog).toBeVisible({ timeout: 5_000 });

    // The ATS domain tab inside the dialog should appear as active (primary border)
    const atsTab = dialog.getByRole("button", { name: "ATS", exact: true });
    await expect(atsTab).toBeVisible({ timeout: 3_000 });
    await expect(atsTab).toHaveClass(/border-primary/, { timeout: 3_000 });
  });

  test("mobile FAB visible and opens full-screen chat on mobile viewport", async ({ page }) => {
    await loginAsCandidate(page);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/en/candidate/dashboard");

    // FAB should be visible, desktop tab hidden
    const fab = page.getByTestId("global-ai-fab");
    await expect(fab).toBeVisible({ timeout: 8_000 });

    // Click FAB — full-screen chat should open
    await fab.click();

    const dialog = page.getByRole("dialog", { name: "AI Assistant" });
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    // Title is inside the dialog
    await expect(dialog.getByText("AI Assistant")).toBeVisible({ timeout: 3_000 });
  });
});
