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
 *   npx @0xray/foundry gate
 *   npx @0xray/foundry gate --verify-only
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { isXrayExoRepo, millScript, readRootPackage, resolveMillRoot } from "./mill-root.mjs";

const rootDir = resolveMillRoot();
const verifyOnly = process.argv.includes("--verify-only");
const skipSmoke = process.argv.includes("--skip-smoke");
const skipDocs = process.argv.includes("--skip-docs");

function step(label, cmd) {
  console.log(`\n${"─".repeat(60)}\n🔄 ${label}\n${"─".repeat(60)}\n`);
  execSync(cmd, { cwd: rootDir, stdio: "inherit", env: { ...process.env, FOUNDRY_ROOT: rootDir } });
}

function docsCheckCmd() {
  return `${JSON.stringify(process.execPath)} ${JSON.stringify(millScript("validate-release-docs.mjs"))}`;
}

function runLightGate() {
  const pkg = readRootPackage(rootDir);
  if (verifyOnly) {
    if (!skipDocs) step("1/1 Release docs (light)", docsCheckCmd());
    return;
  }
  if (pkg.scripts.build) step("1/3 Build", "npm run build");
  if (pkg.scripts.test) step("2/3 Tests", "npm test");
  if (!skipDocs) step("3/3 Release docs (light)", docsCheckCmd());
}

function main() {
  const mode = verifyOnly ? "verify" : "full";
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log(`║        🛡️  0xRay Release Gate (${mode})`.padEnd(57) + "║");
  console.log("╚════════════════════════════════════════════════════════╝");

  try {
    if (!isXrayExoRepo(rootDir)) {
      runLightGate();
    } else if (verifyOnly) {
      step("1/5 Git + reconcile", "node scripts/node/pre-publish-guard.js --verify-only");
      if (!skipDocs) {
        step("2/5 Release docs", docsCheckCmd());
      }
      step(
        "3/5 Plugin infrastructure",
        "node scripts/test/validate-plugins-e2e.cjs --structural-only",
      );
      if (!skipSmoke) {
        step("4/5 Consumer install smoke", "node scripts/node/consumer-install-smoke.mjs");
      }
    } else {
      step("1/7 Build", "npm run build");
      step("2/7 Tests", "npm test");
      if (!skipDocs) {
        step("3/7 Release docs", docsCheckCmd());
      }
      step(
        "4/7 Consumer hook verifiers",
        "npm run verify:pre-commit-diff && npm run verify:pre-push-diff && node scripts/mjs/verify-delegation-gate-core.mjs --host=grok && node scripts/mjs/verify-delegation-gate-core.mjs --host=hermes && node scripts/mjs/verify-delegation-gate-core.mjs --host=opencode && node scripts/mjs/verify-hermes-session-start.mjs && node scripts/mjs/verify-confer-core.mjs && npm run verify:user-aside && npm run build && node scripts/mjs/verify-pipeline-facets.mjs --package-only",
      );
      step(
        "5/7 Plugin infrastructure",
        "node scripts/test/validate-plugins-e2e.cjs --structural-only",
      );
      if (!skipSmoke) {
        step("6/7 Consumer install smoke (fresh + upgrade)", "node scripts/node/consumer-install-smoke.mjs");
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

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}