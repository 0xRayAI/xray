#!/usr/bin/env node
/**
 * @deprecated Use release.mjs — npm run release:patch|minor|major
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

console.error("\n⚠️  release.js is deprecated. Use: npm run release:patch (release.mjs)\n");

const bump = process.argv.find((a) => ["patch", "minor", "major"].includes(a)) || "patch";
const dry = process.argv.includes("--dry-run") ? " --dry-run" : "";

execSync(`node scripts/node/release.mjs ${bump}${dry}`, { cwd: rootDir, stdio: "inherit" });