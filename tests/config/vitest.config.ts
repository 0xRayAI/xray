import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/__tests__/setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "node_modules",
      "dist",
      "coverage",
      "src/__tests__/plugins/marketplace-service.test.ts",
      "src/__tests__/performance/enterprise-performance-tests.ts", // Tests deleted plugin infrastructure
      "src/__tests__/playwright/**",
    ],
    silent: true, // Reduce console output in CI
    reporters: process.env.CI ? ["verbose"] : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "coverage/",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "src/__tests__/",
        "scripts/",
      ],
      thresholds: {
        global: {
          branches: 85,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
    testTimeout: 60000,
    hookTimeout: 120000,
    bail: 0,
    pool: "forks",
    retry: process.env.CI ? 3 : 2,
    maxThreads: 2,
    minThreads: 1,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
