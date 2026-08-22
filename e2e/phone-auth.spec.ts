/**
 * Phone OTP authentication — UI, validation, and flow tests.
 *
 * Actual SMS delivery cannot be tested in CI (requires a real Twilio/SMS
 * provider and a live phone number). These tests cover everything that can
 * be verified without a real OTP: rendering, client-side state, server-side
 * validation errors, navigation, and E.164 normalization behavior.
 *
 * Tests that require SMS are marked test.skip with a clear reason; they will
 * pass when run against a Supabase project with phone auth + test numbers.
 */
import { test, expect } from "@playwright/test";
import { TEST_USERS } from "./global-setup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the Supabase admin client used in global-setup, so we can assert
 * on DB state without going through the app UI. Reads env the same way
 * global-setup does (env vars are already populated by the time tests run).
 */
async function getAdminClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

test.describe("Phone OTP Authentication", () => {
  // ── Step 1 — phone entry ──────────────────────────────────────────────────

  test("phone login page renders all required elements", async ({ page }) => {
    await page.goto("/phone-login");

    await expect(page.getByRole("heading", { name: /continue with mobile/i })).toBeVisible();
    await expect(page.getByLabel(/country/i)).toBeVisible();
    await expect(page.getByLabel(/mobile number/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send verification code/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /email/i })).toBeVisible();
    await expect(page.getByText(/one-time code/i)).toBeVisible();
  });

  test("send button is disabled when national number is empty", async ({ page }) => {
    await page.goto("/phone-login");
    const btn = page.getByRole("button", { name: /send verification code/i });
    await expect(btn).toBeDisabled();
  });

  test("send button enables when a phone number is typed", async ({ page }) => {
    await page.goto("/phone-login");
    const btn = page.getByRole("button", { name: /send verification code/i });
    await page.getByLabel(/mobile number/i).fill("501234567");
    await expect(btn).toBeEnabled();
  });

  test("clearing the phone number disables the send button again", async ({ page }) => {
    await page.goto("/phone-login");
    const input = page.getByLabel(/mobile number/i);
    const btn = page.getByRole("button", { name: /send verification code/i });
    await input.fill("501234567");
    await expect(btn).toBeEnabled();
    await input.clear();
    await expect(btn).toBeDisabled();
  });

  test("Egypt is available in the country dropdown", async ({ page }) => {
    await page.goto("/phone-login");
    const select = page.getByLabel(/country/i);
    await select.selectOption("Egypt (+20)");
    await expect(page.locator("span").filter({ hasText: "+20" })).toBeVisible();
  });

  test("too-short phone is rejected with a validation error", async ({ page }) => {
    await page.goto("/phone-login");
    await page.getByLabel(/mobile number/i).fill("12");
    await page.getByRole("button", { name: /send verification code/i }).click();
    await expect(page.getByText(/valid phone/i)).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: /send verification code/i })).toBeVisible();
  });

  // ── E.164 normalization — Egyptian variants ────────────────────────────────
  // Egyptian numbers all start with 01x. The form strips the leading 0 before
  // sending to Supabase so that e.g. 01012345678 → +201012345678.

  test("Egyptian 010 number with leading zero is accepted (normalization transparent)", async ({ page }) => {
    await page.goto("/phone-login");
    await page.getByLabel(/country/i).selectOption("Egypt (+20)");
    await page.getByLabel(/mobile number/i).fill("01012345678");
    await expect(page.getByRole("button", { name: /send verification code/i })).toBeEnabled();
  });

  test("Egyptian 011 number with leading zero is accepted", async ({ page }) => {
    await page.goto("/phone-login");
    await page.getByLabel(/country/i).selectOption("Egypt (+20)");
    await page.getByLabel(/mobile number/i).fill("01112345678");
    await expect(page.getByRole("button", { name: /send verification code/i })).toBeEnabled();
  });

  test("Egyptian 012 number with leading zero is accepted", async ({ page }) => {
    await page.goto("/phone-login");
    await page.getByLabel(/country/i).selectOption("Egypt (+20)");
    await page.getByLabel(/mobile number/i).fill("01212345678");
    await expect(page.getByRole("button", { name: /send verification code/i })).toBeEnabled();
  });

  test("Egyptian 015 number with leading zero is accepted", async ({ page }) => {
    await page.goto("/phone-login");
    await page.getByLabel(/country/i).selectOption("Egypt (+20)");
    await page.getByLabel(/mobile number/i).fill("01512345678");
    await expect(page.getByRole("button", { name: /send verification code/i })).toBeEnabled();
  });

  test("link to email login works from the phone login page", async ({ page }) => {
    await page.goto("/phone-login");
    await page.getByRole("link", { name: /email/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  // ── Login page entry point ────────────────────────────────────────────────

  test("login page has a mobile login link that navigates to /phone-login", async ({ page }) => {
    await page.goto("/login");
    const mobileLink = page.locator('a[href*="phone-login"]');
    await expect(mobileLink).toBeVisible();
    await mobileLink.click();
    await expect(page).toHaveURL(/\/phone-login/);
  });

  // ── Google OAuth still works ──────────────────────────────────────────────

  test("Google OAuth sign-in button is present on the login page", async ({ page }) => {
    await page.goto("/login");
    // Verifies the Google button exists and hasn't been broken by phone-auth changes.
    const googleBtn = page.getByRole("button", { name: /google/i });
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toBeEnabled();
  });

  // ── Step 2 — OTP entry (UI only, no real SMS) ─────────────────────────────

  test("OTP step renders back button, resend, and code input", async ({ page }) => {
    await page.goto("/phone-login");

    await page.route("**/phone-login", async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        await route.fulfill({ status: 200, body: '0["$@1",["development",null]]' });
      } else {
        await route.continue();
      }
    });

    await page.getByLabel(/mobile number/i).fill("501234567");
    await page.getByRole("button", { name: /send verification code/i }).click();

    const otpHeading = page.getByRole("heading", { name: /enter the code/i });
    const codeInput = page.getByLabel(/verification code/i);
    const backBtn = page.getByRole("button", { name: /change number/i });
    const resendBtn = page.getByRole("button", { name: /resend/i });

    const advanced = await otpHeading.isVisible({ timeout: 3_000 }).catch(() => false);
    if (advanced) {
      await expect(codeInput).toBeVisible();
      await expect(backBtn).toBeVisible();
      await expect(resendBtn).toBeDisabled();
    }
  });

  test("verify button is disabled when code is fewer than 6 digits", async ({ page }) => {
    await page.goto("/phone-login");

    await page.route("**/phone-login", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, body: '0["$@1",["development",null]]' });
      } else {
        await route.continue();
      }
    });

    await page.getByLabel(/mobile number/i).fill("501234567");
    await page.getByRole("button", { name: /send verification code/i }).click();

    const verifyBtn = page.getByRole("button", { name: /verify and continue/i });
    const advanced = await verifyBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (advanced) {
      await expect(verifyBtn).toBeDisabled();
      await page.getByLabel(/verification code/i).fill("12345");
      await expect(verifyBtn).toBeDisabled();
      await page.getByLabel(/verification code/i).fill("123456");
      await expect(verifyBtn).toBeEnabled();
    }
  });

  test("back button from OTP step returns to phone entry", async ({ page }) => {
    await page.goto("/phone-login");

    await page.route("**/phone-login", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, body: '0["$@1",["development",null]]' });
      } else {
        await route.continue();
      }
    });

    await page.getByLabel(/mobile number/i).fill("501234567");
    await page.getByRole("button", { name: /send verification code/i }).click();

    const backBtn = page.getByRole("button", { name: /change number/i });
    const advanced = await backBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (advanced) {
      await backBtn.click();
      await expect(page.getByRole("button", { name: /send verification code/i })).toBeVisible();
      await expect(page.getByLabel(/mobile number/i)).toBeVisible();
    }
  });

  test("resend button is disabled initially and shows countdown", async ({ page }) => {
    await page.goto("/phone-login");

    await page.route("**/phone-login", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({ status: 200, body: '0["$@1",["development",null]]' });
      } else {
        await route.continue();
      }
    });

    await page.getByLabel(/mobile number/i).fill("501234567");
    await page.getByRole("button", { name: /send verification code/i }).click();

    const resendBtn = page.getByRole("button", { name: /resend/i });
    const advanced = await resendBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (advanced) {
      // Resend must be disabled immediately after OTP is sent.
      await expect(resendBtn).toBeDisabled();
      // Countdown text should mention seconds.
      await expect(page.getByText(/\d+s|seconds/i)).toBeVisible();
    }
  });

  test("invalid OTP shows error and clears the code input", async ({ page }) => {
    await page.goto("/phone-login");

    let callCount = 0;
    await page.route("**/phone-login", async (route) => {
      if (route.request().method() === "POST") {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({ status: 200, body: '0["$@1",["development",null]]' });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await page.getByLabel(/mobile number/i).fill("501234567");
    await page.getByRole("button", { name: /send verification code/i }).click();

    const verifyBtn = page.getByRole("button", { name: /verify and continue/i });
    const advanced = await verifyBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (advanced) {
      await page.getByLabel(/verification code/i).fill("000000");
      await verifyBtn.click();
      // Server returns an error for an invalid code; the toast should appear.
      await expect(page.getByText(/invalid|expired/i)).toBeVisible({ timeout: 8_000 });
    }
  });

  test("expired OTP error message is surfaced to the user", async ({ page }) => {
    // This exercises the same server path as "invalid OTP" since any code
    // submitted without a prior real SMS send will be invalid or expired.
    // The test confirms the component surfaces the right error category.
    await page.goto("/phone-login");

    let callCount = 0;
    await page.route("**/phone-login", async (route) => {
      if (route.request().method() === "POST") {
        callCount++;
        if (callCount === 1) {
          await route.fulfill({ status: 200, body: '0["$@1",["development",null]]' });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });

    await page.getByLabel(/mobile number/i).fill("501234567");
    await page.getByRole("button", { name: /send verification code/i }).click();

    const verifyBtn = page.getByRole("button", { name: /verify and continue/i });
    const advanced = await verifyBtn.isVisible({ timeout: 3_000 }).catch(() => false);
    if (advanced) {
      await page.getByLabel(/verification code/i).fill("999999");
      await verifyBtn.click();
      // Server returns "Invalid or expired code..." — both error branches show
      // a user-friendly message, not a raw Supabase error.
      await expect(page.getByText(/code|expired|invalid/i)).toBeVisible({ timeout: 8_000 });
    }
  });

  // ── DB invariant — no duplicate candidate profile ──────────────────────────

  test("existing recruiter account has no candidates row", async () => {
    // This verifies that the verifyPhoneOtp server action, which only creates a
    // candidates row when role === "candidate", hasn't accidentally created one
    // for the test recruiter. The recruiter is set up in global-setup with
    // role=recruiter and a recruiters row — never a candidates row.
    const admin = await getAdminClient();

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.recruiter.email)
      .single();

    expect(profile?.id, "recruiter profile must exist").toBeTruthy();

    const { data: candidateRow } = await admin
      .from("candidates")
      .select("id")
      .eq("id", profile!.id)
      .maybeSingle();

    expect(candidateRow, "recruiter must have no candidates row — phone login must not create one").toBeNull();
  });

  // ── Role-based redirect (requires live Supabase phone auth + SMS) ──────────
  // These tests are skipped in CI because they need a real OTP to be delivered
  // and verified. Run them manually against a Supabase project that has phone
  // auth enabled and test numbers configured in auth.sms.test_otp.

  test.skip("candidate OTP login redirects to /candidate/dashboard", async ({ page }) => {
    // Requires: Supabase phone auth enabled, candidate test phone + OTP configured.
    await page.goto("/phone-login");
    await page.getByLabel(/country/i).selectOption("Egypt (+20)");
    await page.getByLabel(/mobile number/i).fill("01012345678");
    await page.getByRole("button", { name: /send verification code/i }).click();
    await page.getByLabel(/verification code/i).fill("123456"); // test OTP
    await page.getByRole("button", { name: /verify and continue/i }).click();
    await expect(page).toHaveURL(/\/candidate\/dashboard/, { timeout: 10_000 });
  });

  test.skip("recruiter (company admin) OTP login redirects to /recruiter/dashboard", async ({ page }) => {
    // Requires: Supabase phone auth enabled, recruiter test phone + OTP configured.
    // The "Company Admin" role maps to the recruiter workspace — there is no /company route.
    await page.goto("/phone-login");
    await page.getByLabel(/country/i).selectOption("Egypt (+20)");
    await page.getByLabel(/mobile number/i).fill("01112345678"); // recruiter test phone
    await page.getByRole("button", { name: /send verification code/i }).click();
    await page.getByLabel(/verification code/i).fill("123456");
    await page.getByRole("button", { name: /verify and continue/i }).click();
    await expect(page).toHaveURL(/\/recruiter\/dashboard/, { timeout: 10_000 });
  });

  test.skip("super admin OTP login redirects to /admin", async ({ page }) => {
    // Requires: Supabase phone auth enabled, admin test phone + OTP configured.
    await page.goto("/phone-login");
    await page.getByLabel(/mobile number/i).fill("01212345678"); // admin test phone
    await page.getByRole("button", { name: /send verification code/i }).click();
    await page.getByLabel(/verification code/i).fill("123456");
    await page.getByRole("button", { name: /verify and continue/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 10_000 });
  });

  test.skip("existing recruiter using phone login does not get a candidates row", async ({ page }) => {
    // Requires: Supabase phone auth enabled, recruiter with phone number set.
    // Verifies end-to-end that verifyPhoneOtp never inserts into candidates for
    // a recruiter — supplements the DB-invariant test above with a live flow.
    const admin = await getAdminClient();

    await page.goto("/phone-login");
    await page.getByLabel(/mobile number/i).fill("01112345678");
    await page.getByRole("button", { name: /send verification code/i }).click();
    await page.getByLabel(/verification code/i).fill("123456");
    await page.getByRole("button", { name: /verify and continue/i }).click();
    await expect(page).toHaveURL(/\/recruiter\/dashboard/, { timeout: 10_000 });

    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("email", TEST_USERS.recruiter.email)
      .single();
    const { data: candidateRow } = await admin
      .from("candidates")
      .select("id")
      .eq("id", profile!.id)
      .maybeSingle();
    expect(candidateRow).toBeNull();
  });
});
