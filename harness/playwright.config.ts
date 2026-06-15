import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the full-stack exercise self-assessment harness.
 *
 * Assumes the candidate's app is already running:
 *   - frontend on http://localhost:3000
 *   - backend  on http://localhost:8000
 *
 * Override with environment variables FRONTEND_URL and BACKEND_URL if needed.
 */
const FRONTEND_URL = process.env.FRONTEND_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  timeout: 30_000,
  expect: { timeout: 8_000 },
  use: {
    baseURL: FRONTEND_URL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    actionTimeout: 8_000,
    navigationTimeout: 15_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
