#!/usr/bin/env node

/**
 * Version Sync Script
 *
 * Syncs version strings across all config and doc files to match package.json.
 * Called automatically by the release script after `npm version patch`.
 *
 * Append-only for docs — never overwrites existing content, only replaces
 * version strings in known patterns.
 *
 * Usage:
 *   node scripts/node/sync-versions.mjs          # dry run (prints changes)
 *   node scripts/node/sync-versions.mjs --apply   # apply changes
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
const apply = process.argv.includes("--apply");

function readPkgVersion() {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf-8"));
  return pkg.version;
}

function replaceVersionInFile(filePath, patterns, newVersion) {
  if (!existsSync(filePath)) {
    return { file: filePath, skipped: true, reason: "not found" };
  }

  let content = readFileSync(filePath, "utf-8");
  const oldContent = content;
  let changes = 0;

  for (const pattern of patterns) {
    const regex = pattern(newVersion);
    const matches = content.match(regex.regex);
    if (matches) {
      content = content.replace(regex.regex, regex.replacement);
      changes += matches.length;
    }
  }

  if (content !== oldContent && apply) {
    writeFileSync(filePath, content, "utf-8");
  }

  return { file: filePath, changes, applied: apply };
}

function replaceJsonVersion(filePath, newVersion) {
  return replaceVersionInFile(filePath, [
    (v) => ({
      regex: /"version"\s*:\s*"\d+\.\d+\.\d+"/g,
      replacement: `"version": "${v}"`,
    }),
  ], newVersion);
}

function replaceMdVersion(filePath, newVersion) {
  return replaceVersionInFile(filePath, [
    (v) => ({
      regex: /version-(\d+\.\d+\.\d+)/g,
      replacement: `version-${v}`,
    }),
    (v) => ({
      regex: /Version\*\*:\s*\d+\.\d+\.\d+/g,
      replacement: `Version**: ${v}`,
    }),
    (v) => ({
      regex: /v(\d+\.\d+\.\d+)/g,
      replacement: `v${v}`,
    }),
    (v) => ({
      regex: /\*\*Version\*\*:\s*\d+\.\d+\.\d+/g,
      replacement: `**Version**: ${v}`,
    }),
    (v) => ({
      regex: /"version":\s*"(\d+\.\d+\.\d+)"/g,
      replacement: `"version": "${v}"`,
    }),
    (v) => ({
      regex: /\d+\.\d+\.\d+(?=[^\d]*\.svg)/g,
      replacement: v,
    }),
  ], newVersion);
}

function main() {
  const newVersion = readPkgVersion();
  console.log(`\n=== Version Sync: ${newVersion} ===\n`);
  console.log(apply ? "Mode: APPLY" : "Mode: DRY RUN (use --apply to write)\n");

  const results = [];

  // Config JSON files (source of truth in src/opencode/)
  const configFiles = [
    "src/opencode/strray/config.json",
    "src/opencode/strray/features.json",
    "src/opencode/strray/codex.json",
    "src/opencode/strray/integrations.json",
  ];

  for (const file of configFiles) {
    results.push(replaceJsonVersion(join(root, file), newVersion));
  }

  // Doc files
  const docFiles = [
    "AGENTS.md",
    "AGENTS-full.md",
    "docs/README.md",
  ];

  for (const file of docFiles) {
    results.push(replaceMdVersion(join(root, file), newVersion));
  }

  // Report
  let totalChanges = 0;
  for (const r of results) {
    if (r.skipped) {
      console.log(`  SKIP  ${r.file} (${r.reason})`);
    } else if (r.changes > 0) {
      totalChanges += r.changes;
      console.log(`  ${r.applied ? "FIX" : "DRY"}  ${r.file} (${r.changes} replacements)`);
    } else {
      console.log(`  OK    ${r.file}`);
    }
  }

  console.log(`\nTotal: ${totalChanges} version strings ${apply ? "updated" : "would update"}`);
  if (!apply && totalChanges > 0) {
    console.log("Run with --apply to write changes.");
  }
}

main();
