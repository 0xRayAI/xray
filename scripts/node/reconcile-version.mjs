#!/usr/bin/env node
/**
 * reconcile-version.mjs — Single version truth before bump/tag/publish.
 *
 * Sources: npm registry, package.json, latest git tag.
 *
 * Usage:
 *   node scripts/node/reconcile-version.mjs              # report
 *   node scripts/node/reconcile-version.mjs --check        # fail if not publish-ready
 *   node scripts/node/reconcile-version.mjs patch        # print next patch target
 *   node scripts/node/reconcile-version.mjs patch --apply # write package.json
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");
const pkgPath = path.join(rootDir, "package.json");

const args = process.argv.slice(2);
const checkMode = args.includes("--check");
const applyMode = args.includes("--apply");
const bumpType = args.find((a) => ["major", "minor", "patch"].includes(a)) || null;

function run(cmd) {
  try {
    return execSync(cmd, { cwd: rootDir, encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function readLocalVersion() {
  return JSON.parse(fs.readFileSync(pkgPath, "utf-8")).version;
}

function readPublishedVersion() {
  const v = run("npm view 0xray version");
  return v || "0.0.0";
}

function readLatestTag() {
  const tag = run('git describe --tags --abbrev=0 2>/dev/null');
  if (!tag) return null;
  return tag.replace(/^v/, "");
}

function parseVersion(version) {
  const [major, minor, patch] = version.split(".").map((n) => parseInt(n, 10));
  return { major, minor, patch };
}

function bumpVersion(version, type) {
  const v = parseVersion(version);
  switch (type) {
    case "major":
      return `${v.major + 1}.0.0`;
    case "minor":
      return `${v.major}.${v.minor + 1}.0`;
    case "patch":
      return `${v.major}.${v.minor}.${v.patch + 1}`;
    default:
      return version;
  }
}

function compare(a, b) {
  const va = parseVersion(a);
  const vb = parseVersion(b);
  if (va.major !== vb.major) return va.major - vb.major;
  if (va.minor !== vb.minor) return va.minor - vb.minor;
  return va.patch - vb.patch;
}

function maxVersion(...versions) {
  return versions.reduce((best, cur) => (compare(cur, best) > 0 ? cur : best));
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function main() {
  const local = readLocalVersion();
  const npm = readPublishedVersion();
  const tag = readLatestTag();

  const baseline = maxVersion(npm, tag || "0.0.0");
  const target = bumpType ? bumpVersion(baseline, bumpType) : local;

  console.log("\n=== Version Reconcile ===\n");
  console.log(`  npm registry : ${npm}`);
  console.log(`  package.json : ${local}`);
  console.log(`  latest tag   : ${tag ? `v${tag}` : "(none)"}`);
  if (bumpType) {
    console.log(`  bump ${bumpType}  : ${target} (from baseline ${baseline})`);
  }

  if (applyMode && bumpType) {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
    pkg.version = target;
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    console.log(`\n✅ Updated package.json → ${target}`);
  }

  if (!checkMode) {
    if (compare(local, npm) <= 0 && !bumpType) {
      console.log("\n⚠️  Local version is not ahead of npm — bump before publishing.");
    } else {
      console.log("\n✅ Reconcile report complete.");
    }
    return;
  }

  // Strict checks for release gate / pre-tag
  if (compare(local, npm) <= 0) {
    fail(`package.json (${local}) must be > npm (${npm}). Run: node scripts/node/reconcile-version.mjs patch --apply`);
  }

  if (tag && compare(local, tag) < 0) {
    fail(`package.json (${local}) is behind latest tag v${tag}`);
  }

  if (tag && compare(local, tag) === 0 && compare(npm, local) < 0) {
    fail(`tag v${tag} exists but npm is only ${npm} — publish or retag`);
  }

  if (tag && compare(local, tag) > 0 && compare(npm, tag) === 0) {
    console.log(`✅ Ready to tag v${local} (npm at ${npm})`);
  } else if (compare(local, npm) > 0) {
    console.log(`✅ Ready to publish ${local} (npm at ${npm})`);
  } else {
    console.log("✅ Version reconcile OK");
  }
}

main();