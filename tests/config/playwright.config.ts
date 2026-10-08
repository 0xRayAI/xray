import { defineConfig, devices } from "@playwright/test";

/**
 * Arch1 release-gate Playwright battery.
 * Vitest e2e files stay under src/__tests__/e2e — this config only loads *.spec.ts here.
 */
export default defineConfig({
  testDir: "../../src/__tests__/playwright",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "../../coverage/playwright/results.json" }]],
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "node ../../scripts/node/playwright-smoke-server.cjs",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
