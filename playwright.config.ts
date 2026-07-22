import { defineConfig, devices } from "@playwright/test";
import fs from "fs";
import path from "path";

// Load .env.local manually (no dotenv dependency in this project) so both
// this config and the spawned dev server see real Supabase credentials.
const envPath = path.resolve(__dirname, ".env.local");
if (fs.existsSync(envPath)) {
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    if (!process.env[key]) process.env[key] = trimmed.slice(idx + 1).trim();
  }
}

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  timeout: 30_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Build + start (production mode) rather than `next dev`: dev mode
    // compiles each route on demand the first time it's requested, which can
    // take several seconds per route on a cold server. That latency is
    // specific to dev mode — Vercel always serves precompiled routes — and
    // was blowing past this suite's assertion timeouts on never-before-hit
    // routes, producing failures that don't reflect any real app bug.
    // Testing against a production build also matches what actually ships.
    command: "npm run build && npm run start",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      PORT: String(PORT),
      NEXT_PUBLIC_SITE_URL: baseURL,
      // Isolates this local test server from the production auth
      // rate limits — see the E2E_TEST_MODE check in src/lib/rate-limit.ts.
      // Never set for the deployed (Vercel) app.
      E2E_TEST_MODE: "true",
    },
  },
});
