#!/usr/bin/env node

/**
 * Canonical 0xRay release script.
 *
 * 1. Bump version from npm registry baseline (reconcile-version)
 * 2. Release gate once (build + test + consumer smoke)
 * 3. Update CHANGELOG / README / AGENTS (version-manager --artifacts-only)
 * 4. Commit release artifacts → push
 * 5. Verify gate (reconcile + git + smoke)
 * 6. Tag → push tag → npm publish
 *
 * Usage:
 *   npm run release:patch
 *   npm run release:minor
 *   npm run release:major
 *   node scripts/node/release.mjs patch --dry-run
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const releaseType = args.find((a) => ["major", "minor", "patch"].includes(a)) || "patch";

function run(cmd, label) {
  console.log(`\n> ${cmd}`);
  if (dryRun) {
    console.log(`  (dry-run skip: ${label})`);
    return;
  }
  execSync(cmd, { cwd: rootDir, stdio: "inherit", encoding: "utf-8" });
}

function readVersion() {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")).version;
}

function currentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", { cwd: rootDir, encoding: "utf-8" }).trim();
}

async function main() {
  if (!["major", "minor", "patch"].includes(releaseType)) {
    console.error("Usage: node scripts/node/release.mjs [patch|minor|major] [--dry-run]");
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║        🚀 0xRay Release (canonical)                   ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  if (dryRun) console.log("\n⚠️  DRY RUN — no writes, commits, tags, or publish\n");

  // 1. Version bump from npm SSOT
  console.log(`\n📦 Step 1: Bump ${releaseType} from npm baseline`);
  if (dryRun) {
    execSync(`node scripts/node/reconcile-version.mjs ${releaseType}`, { cwd: rootDir, stdio: "inherit" });
  } else {
    run(`node scripts/node/reconcile-version.mjs ${releaseType} --apply`, "version bump");
  }
  const newVersion = dryRun
    ? execSync(`node scripts/node/reconcile-version.mjs ${releaseType} --print-target`, {
        cwd: rootDir,
        encoding: "utf-8",
      }).trim()
    : readVersion();
  console.log(`📌 Release version: ${newVersion}`);

  // 2. Single gate before commit
  console.log("\n📦 Step 2: Release gate (build + test + smoke)");
  run("node scripts/node/release-gate.mjs", "release gate");

  // 3. Changelog + doc artifacts
  console.log("\n📦 Step 3: Release artifacts (CHANGELOG, README, AGENTS)");
  run("node scripts/node/version-manager.mjs --artifacts-only", "release artifacts");

  // 4. Commit + push
  console.log("\n📦 Step 4: Commit & push");
  const releaseFiles = ["package.json", "CHANGELOG.md", "README.md", "AGENTS.md"];
  if (!dryRun) {
    run(`git add ${releaseFiles.join(" ")}`, "git add");
    try {
      execSync(`git commit --no-verify -m "release: v${newVersion}"`, { cwd: rootDir, stdio: "inherit" });
    } catch (e) {
      const out = String(e.stdout || e.stderr || "");
      if (!out.includes("nothing to commit")) throw e;
      console.log("ℹ️  Nothing to commit (release files unchanged)");
    }
  } else {
    console.log(`  would: git add ${releaseFiles.join(" ")} && git commit -m "release: v${newVersion}"`);
  }

  const branch = currentBranch();
  run(`git push origin ${branch}`, "git push");

  // 5. Post-push verify before tag
  console.log("\n📦 Step 5: Verify gate (reconcile + git + smoke)");
  run("node scripts/node/release-gate.mjs --verify-only", "verify gate");

  // 6. Tag
  console.log("\n📦 Step 6: Tag");
  if (!dryRun) {
    execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: rootDir, stdio: "inherit" });
    console.log(`✅ Created tag v${newVersion}`);
  } else {
    console.log(`  would: git tag -a v${newVersion}`);
  }
  run(`git push origin v${newVersion}`, "push tag");

  // 7. Publish
  console.log("\n📦 Step 7: npm publish");
  run("npm publish --access public", "npm publish");

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║        ✅ Release Complete!                            ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  if (!dryRun) {
    console.log(`\n📦 0xray@${newVersion}  🏷  v${newVersion}\n`);
    const tweetPath = path.join(rootDir, "tweets", `v${newVersion}.md`);
    if (!fs.existsSync(tweetPath)) {
      fs.mkdirSync(path.join(rootDir, "tweets"), { recursive: true });
      fs.writeFileSync(
        tweetPath,
        `🎉 0xRay v${newVersion} is LIVE - {THEME}!\n...\n\`\`\`\nnpm install 0xray@latest\n\`\`\`\n`,
      );
      console.log(`📝 Tweet template: tweets/v${newVersion}.md`);
    }
  }
}

main().catch((err) => {
  console.error("\n❌ Release failed:", err.message);
  process.exit(1);
});