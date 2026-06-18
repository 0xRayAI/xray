#!/usr/bin/env node
/**
 * @deprecated Use: node scripts/node/version-manager.mjs --artifacts-only
 * SSOT for version strings is package.json (see reconcile-version.mjs).
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

console.warn("\n⚠️  sync-versions.mjs is deprecated.");
console.warn("    Use: node scripts/node/version-manager.mjs --artifacts-only\n");

execSync("node scripts/node/version-manager.mjs --artifacts-only", {
  cwd: rootDir,
  stdio: "inherit",
});