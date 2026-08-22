import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

import { login } from "./helpers/auth";
import { TEST_USERS } from "./global-setup";

const INVITED_EMAIL = "e2e.invited.member@example.test";
const INVITED_PASSWORD = "TestPass123!";

function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

test.describe.serial("Organizations & Roles", () => {
  test.beforeAll(async () => {
    // Clean slate: delete any leftover account from a previous local run so
    // the invite flow's "email must not already have an account" check
    // doesn't reject this run's invite.
    const admin = adminClient();
    const { data: existing } = await admin.from("profiles").select("id").eq("email", INVITED_EMAIL).maybeSingle();
    if (existing) await admin.auth.admin.deleteUser(existing.id);
    await admin.from("recruiter_invites").delete().eq("email", INVITED_EMAIL);
  });

  test("owner can generate an invite link, and it lets a new person join the company", async ({ page }) => {
    await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
    await page.goto("/recruiter/settings/team");
    await page.getByRole("button", { name: "Invite teammate" }).click();
    await page.getByLabel("Email").fill(INVITED_EMAIL);
    await page.getByRole("button", { name: "Generate invite link" }).click();

    const linkText = await page.getByText(new RegExp(`/invite/`)).textContent({ timeout: 10_000 });
    const inviteUrl = linkText?.trim();
    expect(inviteUrl).toBeTruthy();

    // NEXT_PUBLIC_SITE_URL is baked at build time and may use a different
    // port than the Playwright test server. Extract just the path so we
    // always navigate to the correct server regardless of the base URL.
    const invitePath = inviteUrl ? new URL(inviteUrl).pathname : null;
    expect(invitePath).toMatch(/^\/invite\//);

    // Close the dialog first, then clear cookies (local logout without revoking
    // the server-side session so the shared recruiter.json storageState stays valid).
    await page.getByRole("button", { name: "Done" }).click();
    await page.context().clearCookies();
    await page.goto(invitePath!);
    await expect(page.getByRole("heading", { name: /Join/ })).toBeVisible();

    await page.getByLabel("Full name").fill("E2E Invited Member");
    await page.getByLabel("Password", { exact: true }).fill(INVITED_PASSWORD);
    await page.getByLabel("Confirm password").fill(INVITED_PASSWORD);
    await page.getByRole("button", { name: /Accept invite/ }).click();

    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
  });

  test("the invited member (default recruiter role) does not see the invite button, but the owner sees them on the team list", async ({ page }) => {
    await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
    await page.goto("/recruiter/settings/team");
    await expect(page.getByText("E2E Invited Member")).toBeVisible();

    // Clear cookies locally (no server-side signOut) to avoid revoking the shared recruiter session.
    await page.context().clearCookies();
    await login(page, INVITED_EMAIL, INVITED_PASSWORD);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });

    await page.goto("/recruiter/settings/team");
    await expect(page.getByRole("button", { name: "Invite teammate" })).not.toBeVisible();
  });

  test("owner can change the member's role and then remove them", async ({ page }) => {
    await login(page, TEST_USERS.recruiter.email, TEST_USERS.recruiter.password);
    await expect(page).toHaveURL(/\/recruiter\/dashboard$/, { timeout: 15_000 });
    await page.goto("/recruiter/settings/team");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Viewer" }).click();
    await expect(page.getByText("Role updated")).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: "Remove member" }).click();
    await expect(page.getByText("Member removed")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("E2E Invited Member")).not.toBeVisible();
  });
});

test.describe("Organizations & Roles -- RLS / capability enforcement", () => {
  function client() {
    return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }

  test("has_capability() reflects the caller's actual role, and there is never more than one owner per company", async () => {
    const supabase = client();
    const { data: signIn, error } = await supabase.auth.signInWithPassword({
      email: TEST_USERS.recruiter.email,
      password: TEST_USERS.recruiter.password,
    });
    if (error || !signIn.user) throw error ?? new Error("Sign-in failed");

    const { data: ownerCanBill } = await supabase.rpc("has_capability", { p_capability: "manage_billing" });
    expect(ownerCanBill).toBe(true);

    const admin = adminClient();
    const { data: recruiterRow } = await admin.from("recruiters").select("company_id").eq("id", signIn.user.id).single();
    const { data: owners } = await admin.from("recruiters").select("id").eq("company_id", recruiterRow!.company_id).eq("role", "owner");
    expect(owners?.length).toBe(1);
  });
});
