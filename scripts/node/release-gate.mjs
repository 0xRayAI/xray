#!/usr/bin/env node
/**
 * release-gate.mjs — Single release checkpoint.
 *
 * Modes:
 *   (default)     build + test + consumer smoke (fresh + upgrade merge)
 *   --verify-only git + reconcile + release docs + consumer smoke — after push, before publish
 *   --skip-smoke  skip consumer install smoke
 *   --skip-docs   skip release docs validation (not recommended for publish)
 *
 * Usage:
 *   node scripts/node/release-gate.mjs
 *   node scripts/node/release-gate.mjs --verify-only
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const verifyOnly = process.argv.includes("--verify-only");
const skipSmoke = process.argv.includes("--skip-smoke");
const skipDocs = process.argv.includes("--skip-docs");

function step(label, cmd) {
  console.log(`\n${"─".repeat(60)}\n🔄 ${label}\n${"─".repeat(60)}\n`);
  execSync(cmd, { cwd: rootDir, stdio: "inherit" });
}

function main() {
  const mode = verifyOnly ? "verify" : "full";
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log(`║        🛡️  0xRay Release Gate (${mode})`.padEnd(57) + "║");
  console.log("╚════════════════════════════════════════════════════════╝");

  try {
    if (verifyOnly) {
      step("1/5 Git + reconcile", "node scripts/node/pre-publish-guard.js --verify-only");
      if (!skipDocs) {
        step("2/5 Release docs", "node scripts/node/validate-release-docs.mjs");
      }
      step(
        "3/5 Plugin infrastructure",
        "node scripts/test/validate-plugins-e2e.cjs --structural-only",
      );
      if (!skipSmoke) {
        step("4/5 Consumer install smoke", "node scripts/node/consumer-install-smoke.mjs");
      }
    } else {
      step("1/6 Build", "npm run build");
      step("2/6 Tests", "npm test");
      step(
        "3/6 Consumer hook verifiers",
        "npm run verify:pre-commit-diff && npm run verify:pre-push-diff && node scripts/mjs/verify-delegation-gate-core.mjs --host=grok && node scripts/mjs/verify-delegation-gate-core.mjs --host=hermes && node scripts/mjs/verify-hermes-session-start.mjs && node scripts/mjs/verify-confer-core.mjs",
      );
      step(
        "4/6 Plugin infrastructure",
        "node scripts/test/validate-plugins-e2e.cjs --structural-only",
      );
      if (!skipSmoke) {
        step("5/6 Consumer install smoke (fresh + upgrade)", "node scripts/node/consumer-install-smoke.mjs");
      }
    }

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║  ✅ RELEASE GATE PASSED                                ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
  } catch {
    console.error("\n❌ RELEASE GATE FAILED — do not tag or publish\n");
    process.exit(1);
  }
}

main();