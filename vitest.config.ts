import { defineConfig } from "vitest/config";
import { resolve } from "path";

const base = {
  globals: true,
  environment: "node",
  setupFiles: ["./src/__tests__/setup.ts"],
  exclude: [
    "node_modules",
    "dist",
    "coverage",
    "src/__tests__/plugins/marketplace-service.test.ts",
    "src/__tests__/performance/enterprise-performance-tests.ts",
  ],
  silent: true,
  reporters: process.env.CI ? ["verbose"] : ["default"],
  testTimeout: 90000,
  hookTimeout: 180000,
  bail: 0,
  pool: "forks",
  maxWorkers: 2,
  minWorkers: 1,
  retry: process.env.CI ? 3 : 2,
};

const alias = {
  "@": resolve(__dirname, "./src"),
  "api": resolve(__dirname, "./api"),
};

export default defineConfig({
  test: {
    ...base,
    projects: [
      {
        test: {
          name: "all",
          include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
          exclude: [
            ...base.exclude,
            "src/__tests__/unit/nucleus-*.test.ts",
            "src/__tests__/unit/default-plugins.test.ts",
            "src/__tests__/integration/nucleus-*.test.ts",
            "src/__tests__/unit/inference/**",
            "src/__tests__/unit/inference-*.test.ts",
            "src/__tests__/integration/inference-*.test.ts",
            "src/__tests__/e2e/inference-*.test.ts",
          ],
        },
        resolve: { alias },
      },
      {
        test: {
          name: "nucleus",
          include: [
            "src/__tests__/unit/nucleus-*.test.ts",
            "src/__tests__/unit/default-plugins.test.ts",
            "src/__tests__/integration/nucleus-*.test.ts",
            "src/__tests__/unit/inference/**/*.test.ts",
            "src/__tests__/unit/inference-*.test.ts",
            "src/__tests__/integration/inference-*.test.ts",
            "src/__tests__/e2e/inference-*.test.ts",
          ],
        },
        resolve: { alias },
      },
    ],
  },
  resolve: { alias },
});
