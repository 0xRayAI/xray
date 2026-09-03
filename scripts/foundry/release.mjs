#!/usr/bin/env node

/**
 * Canonical 0xRay release script.
 *
 * 1. Bump version from npm registry baseline (reconcile-version)
 * 2. Release artifacts (CHANGELOG / README / AGENTS / docs) — before gate so docs tests pass
 * 3. Release gate (build + test + consumer smoke)
 * 4. Commit release artifacts → push
 * 5. Verify gate (reconcile + git + release docs + smoke)
 * 6. npm publish (idempotent — skip if version already on registry)
 * 7. Tag → push tag (only after successful publish)
 *
 * Usage:
 *   node scripts/foundry/release.mjs patch|minor|major [--dry-run]
 *   node scripts/foundry/release.mjs --publish-only [--dry-run]
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getReleaseArtifactPaths } from "./version-manager.mjs";
import {
  isXrayExoRepo,
  millScript,
  readRootPackage,
  resolveMillRoot,
} from "./mill-root.mjs";

const rootDir = resolveMillRoot();
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const publishOnly = args.includes("--publish-only");
const releaseType = args.find((a) => ["major", "minor", "patch"].includes(a));

function run(cmd, label) {
  console.log(`\n> ${cmd}`);
  if (dryRun) {
    console.log(`  (dry-run skip: ${label})`);
    return;
  }
  execSync(cmd, {
    cwd: rootDir,
    stdio: "inherit",
    encoding: "utf-8",
    env: { ...process.env, FOUNDRY_ROOT: rootDir },
  });
}

function runMill(script, extraArgs, label) {
  const quoted = [millScript(script), ...extraArgs].map((a) => JSON.stringify(a)).join(" ");
  run(`${JSON.stringify(process.execPath)} ${quoted}`, label);
}

function readVersion() {
  return JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8")).version;
}

function packageName() {
  const name = readRootPackage(rootDir).name;
  if (!name) {
    process.stderr.write("package.json name is required to mill publish\n");
    process.exit(1);
  }
  return name;
}

function currentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", { cwd: rootDir, encoding: "utf-8" }).trim();
}

function npmVersionPublished(version) {
  try {
    const out = execSync(`npm view ${packageName()}@${version} version`, {
      cwd: rootDir,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
    return out === version;
  } catch {
    return false;
  }
}

function publishIdempotent(version) {
  if (dryRun) {
    console.log(`  would: npm publish --access public (check ${packageName()}@${version} first)`);
    return;
  }
  if (npmVersionPublished(version)) {
    console.log(`ℹ️  ${packageName()}@${version} already on npm — skipping publish`);
    return;
  }
  execSync("npm publish --access public", { cwd: rootDir, stdio: "inherit", encoding: "utf-8" });
  console.log(`✅ Published ${packageName()}@${version}`);
}

async function main() {
  if (publishOnly) {
    const version = readVersion();
    runMill("release-gate.mjs", [], "release gate");
    if (isXrayExoRepo(rootDir)) {
      run("npm run prepare-consumer && npm run build", "safe-publish");
    } else if (readRootPackage(rootDir).scripts.build) {
      run("npm run build", "build");
    }
    publishIdempotent(version);
    if (!dryRun) {
      try {
        execSync(`git tag -a v${version} -m "Release v${version}"`, {
          cwd: rootDir,
          stdio: "inherit",
        });
      } catch (e) {
        const msg = String(e.stderr || e.message || "");
        if (!msg.includes("already exists")) throw e;
      }
    }
    run(`git push origin v${version}`, "push tag");
    return;
  }

  if (!releaseType || !["major", "minor", "patch"].includes(releaseType)) {
    process.stderr.write("Usage: node scripts/foundry/release.mjs [patch|minor|major] [--dry-run]\n");
    process.stderr.write("       node scripts/foundry/release.mjs --publish-only [--dry-run]\n");
    process.exit(1);
  }

  console.log("╔════════════════════════════════════════════════════════╗");
  console.log("║        🚀 0xRay Release (canonical)                   ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  if (dryRun) console.log("\n⚠️  DRY RUN — no writes, commits, tags, or publish\n");

  // 1. Version bump from npm SSOT
  console.log(`\n📦 Step 1: Bump ${releaseType} from npm baseline`);
  if (dryRun) {
    runMill("reconcile-version.mjs", [releaseType], "version bump (dry)");
  } else {
    runMill("reconcile-version.mjs", [releaseType, "--apply"], "version bump");
  }
  const newVersion = dryRun
    ? execSync(
        `${JSON.stringify(process.execPath)} ${JSON.stringify(millScript("reconcile-version.mjs"))} ${JSON.stringify(releaseType)} --print-target`,
        {
          cwd: rootDir,
          encoding: "utf-8",
          env: { ...process.env, FOUNDRY_ROOT: rootDir },
        },
      ).trim()
    : readVersion();
  console.log(`📌 Release version: ${newVersion}`);

  // 2. Artifacts BEFORE gate (docs vitest matches package.json version)
  console.log("\n📦 Step 2: Release artifacts (CHANGELOG, README, AGENTS, docs)");
  runMill("version-manager.mjs", ["--artifacts-only"], "release artifacts");

  // 3. Gate
  console.log("\n📦 Step 3: Release gate (build + test + smoke)");
  runMill("release-gate.mjs", [], "release gate");

  // 4. Commit + push
  console.log("\n📦 Step 4: Commit & push");
  const releaseFiles = getReleaseArtifactPaths();
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

  // 5. Post-push verify before publish
  console.log("\n📦 Step 5: Verify gate (reconcile + git + docs + smoke)");
  runMill("release-gate.mjs", ["--verify-only"], "verify gate");

  // 6. Publish (idempotent)
  console.log("\n📦 Step 6: npm publish");
  publishIdempotent(newVersion); // name from package.json via packageName()

  // 7. Tag after publish
  console.log("\n📦 Step 7: Tag");
  if (!dryRun) {
    try {
      execSync(`git tag -a v${newVersion} -m "Release v${newVersion}"`, { cwd: rootDir, stdio: "inherit" });
      console.log(`✅ Created tag v${newVersion}`);
    } catch (e) {
      const msg = String(e.stderr || e.message || "");
      if (msg.includes("already exists")) {
        console.log(`ℹ️  Tag v${newVersion} already exists`);
      } else {
        throw e;
      }
    }
  } else {
    console.log(`  would: git tag -a v${newVersion}`);
  }
  run(`git push origin v${newVersion}`, "push tag");

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║        ✅ Release Complete!                            ║");
  console.log("╚════════════════════════════════════════════════════════╝");
  if (!dryRun) {
    process.stdout.write(`\n📦 ${packageName()}@${newVersion}  🏷  v${newVersion}\n`);
    if (isXrayExoRepo(rootDir)) {
      const tweetPath = path.join(rootDir, "tweets", `v${newVersion}.md`);
      if (!fs.existsSync(tweetPath)) {
        fs.mkdirSync(path.join(rootDir, "tweets"), { recursive: true });
        fs.writeFileSync(
          tweetPath,
          `🎉 0xRay v${newVersion} is LIVE - consumer-safe upgrades!\n...\n\`\`\`\nnpm install 0xray@latest\n\`\`\`\n`,
        );
        process.stdout.write(`📝 Tweet template: tweets/v${newVersion}.md\n`);
      }
    }
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main().catch((err) => {
    process.stderr.write(`\n❌ Release failed: ${err.message}\n`);
    process.exit(1);
  });
}