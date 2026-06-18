#!/usr/bin/env node
/**
 * release-gate.mjs — Checkpoint before tag or npm publish.
 *
 * Order: version reconcile → pre-publish guard → consumer smoke
 *
 * Usage:
 *   node scripts/node/release-gate.mjs              # full gate (before tag/publish)
 *   node scripts/node/release-gate.mjs --pre-commit # build + test + smoke only
 *   node scripts/node/release-gate.mjs --skip-smoke   # skip consumer smoke
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const skipSmoke = process.argv.includes("--skip-smoke");
const preCommit = process.argv.includes("--pre-commit");

function step(label, cmd) {
  console.log(`\n${"─".repeat(60)}\n🔄 ${label}\n${"─".repeat(60)}\n`);
  execSync(cmd, { cwd: rootDir, stdio: "inherit" });
}

function main() {
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log(`║        🛡️  0xRay Release Gate${preCommit ? " (pre-commit)" : ""}`.padEnd(57) + "║");
  console.log("╚════════════════════════════════════════════════════════╝");

  try {
    if (preCommit) {
      step("1/3 Build", "npm run build");
      step("2/3 Tests", "npm test");
      if (!skipSmoke) {
        step("3/3 Consumer install smoke", "node scripts/node/consumer-install-smoke.mjs");
      }
    } else {
      step("1/3 Version reconcile", "node scripts/node/reconcile-version.mjs --check");
      step("2/3 Pre-publish guard", "node scripts/node/pre-publish-guard.js --skip-smoke");
      if (!skipSmoke) {
        step("3/3 Consumer install smoke", "node scripts/node/consumer-install-smoke.mjs");
      }
    }

    console.log("\n╔════════════════════════════════════════════════════════╗");
    console.log("║  ✅ RELEASE GATE PASSED — safe to tag & publish        ║");
    console.log("╚════════════════════════════════════════════════════════╝\n");
    if (!preCommit) {
      console.log("Checkpoint: registry/npm verified, guard green, consumer smoke green");
      console.log("Next: git tag v$(node -p \"require('./package.json').version\") && npm publish\n");
    }
  } catch {
    console.error("\n❌ RELEASE GATE FAILED — do not tag or publish\n");
    process.exit(1);
  }
}

main();