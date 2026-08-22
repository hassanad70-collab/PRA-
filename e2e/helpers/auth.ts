import path from "path";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

// Pre-authenticated browser storage states generated in globalSetup.
// Use test.use({ storageState: STORAGE_STATE.X }) in any describe block that
// doesn't need to exercise the login flow itself — this avoids per-test
// Supabase auth API calls and keeps the suite well within rate limits.
export const STORAGE_STATE = {
  candidate: path.join(__dirname, "../.auth/candidate.json"),
  candidateOther: path.join(__dirname, "../.auth/candidate-other.json"),
  recruiter: path.join(__dirname, "../.auth/recruiter.json"),
  recruiterOther: path.join(__dirname, "../.auth/recruiter-other.json"),
  admin: path.join(__dirname, "../.auth/admin.json"),
};

export async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByPlaceholder("you@company.com").fill(email);
  await page.getByPlaceholder("••••••••").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function logout(page: Page) {
  await page.getByRole("button").filter({ hasText: /@/ }).first().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}
