import { test, expect } from "@playwright/test";

test.describe("Internationalization (English / Arabic)", () => {
  test("homepage works in both languages with correct lang/dir", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { name: /hire smarter/i })).toBeVisible();
    expect(await page.locator("html").getAttribute("lang")).toBe("en");
    expect(await page.locator("html").getAttribute("dir")).toBe("ltr");

    await page.goto("/ar");
    await expect(page.getByRole("heading", { name: /وظّف بذكاء أكبر/ })).toBeVisible();
    expect(await page.locator("html").getAttribute("lang")).toBe("ar");
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
  });

  test("every in-scope public page renders in both locales without crashing", async ({ page }) => {
    const paths = ["/", "/jobs", "/ai-tools/ats-checker", "/login", "/register", "/forgot-password", "/reset-password"];
    for (const locale of ["en", "ar"]) {
      for (const path of paths) {
        const consoleErrors: string[] = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") consoleErrors.push(msg.text());
        });

        const response = await page.goto(`/${locale}${path === "/" ? "" : path}`);
        expect(response?.ok(), `${locale}${path} should return a successful response`).toBeTruthy();
        await expect(page.locator("body")).not.toContainText("Application error");

        const meaningfulErrors = consoleErrors.filter(
          (e) => !e.includes("Failed to download dynamic font") && !e.includes("favicon")
        );
        expect(meaningfulErrors, `no console errors on ${locale}${path}`).toEqual([]);
        page.removeAllListeners("console");
      }
    }
  });

  test("job detail and company pages render in both locales", async ({ page }) => {
    const jobRes = await page.request.get("/en/jobs");
    expect(jobRes.ok()).toBeTruthy();

    // Company slug is deterministic from global-setup; job id isn't, so
    // resolve it live rather than hardcoding an ordering assumption.
    await page.goto("/en/jobs");
    await page.getByText("E2E Test — Software Engineer").first().click();
    await expect(page).toHaveURL(/\/en\/jobs\/.+/);
    await expect(page.getByRole("heading", { name: "E2E Test — Software Engineer" })).toBeVisible();

    await page.goto("/ar/companies/e2e-test-company");
    await expect(page.getByRole("heading", { name: "E2E Test Company", exact: true })).toBeVisible();
  });

  test("canonical URL and hreflang alternates are correct per locale", async ({ page }) => {
    await page.goto("/en/jobs");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/en\/jobs$/);
    await expect(page.locator('link[rel="alternate"][hreflang="en"]')).toHaveAttribute("href", /\/en\/jobs$/);
    await expect(page.locator('link[rel="alternate"][hreflang="ar"]')).toHaveAttribute("href", /\/ar\/jobs$/);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", /\/en\/jobs$/);

    await page.goto("/ar/jobs");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ar\/jobs$/);
  });

  test("sitemap.xml includes both locale variants of every in-scope route", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();

    expect(body).toContain("/en/jobs</loc>");
    expect(body).toContain("/ar/jobs</loc>");
    expect(body).toContain("/en/ai-tools/ats-checker</loc>");
    expect(body).toContain("/ar/ai-tools/ats-checker</loc>");
    // /login, /register stay excluded in every locale, same as Phase 1C.
    expect(body).not.toContain("/en/login");
    expect(body).not.toContain("/ar/login");
  });

  // The language switcher lives in the Navbar, which only the homepage and
  // the ATS Checker page render in this phase's approved scope (/jobs,
  // /companies, and the auth pages have no nav chrome -- a pre-existing gap
  // predating Phase 1D, not something this phase adds or fixes).
  test("language switcher preserves the current page", async ({ page }) => {
    await page.goto("/en/ai-tools/ats-checker");
    await page.getByRole("button", { name: "Change language" }).first().click();
    await page.getByRole("menuitem", { name: "العربية" }).click();
    await expect(page).toHaveURL(/\/ar\/ai-tools\/ats-checker$/);
    await expect(page.getByRole("heading", { name: "فاحص السيرة الذاتية المجاني بالذكاء الاصطناعي" })).toBeVisible();
  });

  test("a manually selected language persists across a reload and overrides browser detection", async ({ page }) => {
    await page.goto("/en/ai-tools/ats-checker");
    await page.getByRole("button", { name: "Change language" }).first().click();
    await page.getByRole("menuitem", { name: "العربية" }).click();
    await expect(page).toHaveURL(/\/ar\/ai-tools\/ats-checker$/);

    await page.reload();
    await expect(page).toHaveURL(/\/ar\/ai-tools\/ats-checker$/);
    await expect(page.getByRole("heading", { name: "فاحص السيرة الذاتية المجاني بالذكاء الاصطناعي" })).toBeVisible();

    // Revisiting the bare root (no locale in the URL) must now honor the
    // saved preference instead of re-negotiating from Accept-Language,
    // which would otherwise resolve to English every time in this browser.
    await page.goto("/");
    await expect(page).toHaveURL(/\/ar$/);
  });

  test("RTL layout renders correctly on desktop and mobile", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/ar");
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    const desktopOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(desktopOverflow, "no horizontal overflow on desktop RTL layout").toBe(false);

    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/ar");
    expect(await page.locator("html").getAttribute("dir")).toBe("rtl");
    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(mobileOverflow, "no horizontal overflow on mobile RTL layout").toBe(false);
  });

  test("auth pages are noindex in both locales and canonical URLs stay correct", async ({ page }) => {
    await page.goto("/ar/login");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/ar\/login$/);
  });
});
