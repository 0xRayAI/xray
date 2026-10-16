#!/usr/bin/env node
/**
 * release-gate.mjs — Single release checkpoint.
 *
 * Modes:
 *   (default)     build + test + docs + consumer smoke (fresh + upgrade merge)
 *   --verify-only git + reconcile + release docs + consumer smoke — after push, before publish
 *   --skip-smoke  skip consumer install smoke
 *   --prove-published  Gate D only: npm lists this version, the annotated tag points at HEAD,
 *                      and the GitHub Release exists. This command does not publish.
 *   --skip-docs   refused. Gate C runs on every gate.
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
const provePublished = process.argv.includes("--prove-published");

function step(label, cmd) {
  console.log(`\n${"─".repeat(60)}\n🔄 ${label}\n${"─".repeat(60)}\n`);
  execSync(cmd, { cwd: rootDir, stdio: "inherit", env: { ...process.env, FOUNDRY_ROOT: rootDir } });
}

function docsCheckCmd() {
  return `${JSON.stringify(process.execPath)} ${JSON.stringify(millScript("validate-release-docs.mjs"))}`;
}


/** Gate C is the docs check. A ship gate that skips it is not a pass. */
export function gateCRefusal(argv = process.argv) {
  if (argv.includes("--skip-docs")) {
    return "Gate C cannot be skipped. Remove --skip-docs. The docs check runs on every gate.";
  }
  return null;
}

/**
 * Gate D facts. listed, tagAnnotated, and tagMatchesHead are booleans.
 * releaseUrl is the GitHub Release page, or empty when that page is missing.
 */
export function provePublishedRelease(proof) {
  const version = proof.version;
  const errors = [];
  if (proof.listed !== true) errors.push(`npm does not list ${version}`);
  if (proof.tagAnnotated !== true) errors.push(`annotated tag v${version} is missing`);
  if (proof.tagMatchesHead !== true) errors.push(`annotated tag v${version} does not point at HEAD`);
  if (typeof proof.releaseUrl !== "string" || proof.releaseUrl.length === 0) {
    errors.push(`GitHub Release v${version} is missing`);
  }
  return errors;
}

function gitOut(cmd) {
  return execSync(cmd, { cwd: rootDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function originSlug() {
  const url = gitOut("git remote get-url origin");
  const match = url.match(/github\.com[:/]([^/]+)\/([^/.]+)(?:\.git)?$/);
  if (!match) throw new Error(`origin is not a GitHub repo: ${url}`);
  return { owner: match[1], repo: match[2] };
}

function collectPublishedProof() {
  const pkg = readRootPackage(rootDir);
  const version = pkg.version;
  const name = pkg.name;
  let listed = false;
  try {
    const view = gitOut(`npm view ${name}@${version} version`);
    listed = view.split(/\s+/).includes(version);
  } catch {
    listed = false;
  }
  let tagAnnotated = false;
  let tagMatchesHead = false;
  try {
    tagAnnotated = gitOut(`git cat-file -t v${version}`) === "tag";
    const tagged = gitOut(`git rev-parse v${version}^{}`);
    const head = gitOut("git rev-parse HEAD");
    tagMatchesHead = tagAnnotated && tagged === head;
  } catch {
    tagAnnotated = false;
    tagMatchesHead = false;
  }
  let releaseUrl = "";
  try {
    const { owner, repo } = originSlug();
    const body = gitOut(
      `curl -fsS -H "Accept: application/vnd.github+json" -H "User-Agent: 0xray-release-gate" https://api.github.com/repos/${owner}/${repo}/releases/tags/v${version}`,
    );
    const parsed = JSON.parse(body);
    releaseUrl = typeof parsed.html_url === "string" ? parsed.html_url : "";
  } catch {
    releaseUrl = "";
  }
  return { version, name, listed, tagAnnotated, tagMatchesHead, releaseUrl };
}

function runProvePublished() {
  const proof = collectPublishedProof();
  const errors = provePublishedRelease(proof);
  process.stdout.write(`\nGate D — ${proof.name}@${proof.version}\n`);
  if (errors.length) {
    for (const error of errors) process.stderr.write(`❌ ${error}\n`);
    process.stderr.write("\n❌ GATE D FAILED — npm listing, annotated tag at HEAD, and GitHub Release are all required\n\n");
    process.exit(1);
  }
  process.stdout.write(`✅ npm lists ${proof.version}\n`);
  process.stdout.write(`✅ annotated tag v${proof.version} points at HEAD\n`);
  process.stdout.write(`✅ GitHub Release ${proof.releaseUrl}\n`);
  process.stdout.write("\n✅ GATE D PROVEN\n\n");
}

function runLightGate() {
  const pkg = readRootPackage(rootDir);
  if (verifyOnly) {
    step("1/1 Release docs (light)", docsCheckCmd());
    return;
  }
  if (pkg.scripts.build) step("1/3 Build", "npm run build");
  if (pkg.scripts.test) step("2/3 Tests", "npm test");
  step("3/3 Release docs (light)", docsCheckCmd());
}

function main() {
  const refused = gateCRefusal();
  if (refused) {
    process.stderr.write(`\n❌ ${refused}\n\n`);
    process.exit(1);
  }
  if (provePublished) {
    runProvePublished();
    return;
  }
  const mode = verifyOnly ? "verify" : "full";
  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log(`║        🛡️  0xRay Release Gate (${mode})`.padEnd(57) + "║");
  console.log("╚════════════════════════════════════════════════════════╝");

  try {
    if (!isXrayExoRepo(rootDir)) {
      runLightGate();
    } else if (verifyOnly) {
      step("1/6 Git + reconcile", "node scripts/node/pre-publish-guard.js --verify-only");
      step("2/6 Release docs", docsCheckCmd());
      step(
        "3/6 Plugin infrastructure",
        "node scripts/test/validate-plugins-e2e.cjs --structural-only",
      );
      step(
        "4/6 Packed dist/cli",
        `${JSON.stringify(process.execPath)} ${JSON.stringify(millScript("assert-packed-dist-cli.mjs"))}`,
      );
      if (!skipSmoke) {
        step("5/6 Consumer install smoke", "node scripts/node/consumer-install-smoke.mjs");
      }
    } else {
      step("1/8 Build", "npm run build");
      step(
        "2/8 Packed dist/cli",
        `${JSON.stringify(process.execPath)} ${JSON.stringify(millScript("assert-packed-dist-cli.mjs"))}`,
      );
      step("3/8 Tests", "npm run test:comprehensive");
      step("4/8 Release docs", docsCheckCmd());
      step(
        "5/8 Consumer hook verifiers",
        "npm run verify:pre-commit-diff && npm run verify:pre-push-diff && node scripts/mjs/verify-delegation-gate-core.mjs --host=grok && node scripts/mjs/verify-delegation-gate-core.mjs --host=hermes && node scripts/mjs/verify-delegation-gate-core.mjs --host=opencode && node scripts/mjs/verify-hermes-session-start.mjs && node scripts/mjs/verify-confer-core.mjs && npm run verify:user-aside && npm run build && node scripts/mjs/verify-pipeline-facets.mjs --package-only",
      );
      step(
        "6/8 Plugin infrastructure",
        "node scripts/test/validate-plugins-e2e.cjs --structural-only",
      );
      if (!skipSmoke) {
        step("7/8 Consumer install smoke (fresh + upgrade)", "node scripts/node/consumer-install-smoke.mjs");
      }
    }

    process.stdout.write("\n╔════════════════════════════════════════════════════════╗\n");
    process.stdout.write("║  ✅ GATE A–C LOCAL PASS                                ║\n");
    process.stdout.write("║  Gate D is not proven by this command.                 ║\n");
    process.stdout.write("╚════════════════════════════════════════════════════════╝\n");
    process.stdout.write("Prove D after publish: npx @0xray/foundry gate --prove-published\n\n");
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
