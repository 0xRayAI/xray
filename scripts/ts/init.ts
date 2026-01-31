#!/usr/bin/env node

/**
 * StrRay Standalone Framework Initialization
 *
 * Converted from shell script to TypeScript for better integration
 * and cross-platform compatibility.
 */

import { execSync, spawn } from "child_process";
import { existsSync, copyFileSync, mkdirSync } from "fs";
import { join } from "path";
import { compare as compareVersions } from "semver";

function log(message: string): void {
  console.log(message);
}

function error(message: string): void {
  console.error(`❌ Error: ${message}`);
}

function success(message: string): void {
  console.log(`✅ ${message}`);
}

async function main() {
  log("🚀 StrRay Standalone Framework Initialization");
  log("============================================");

  // Check if we're in the right directory
  if (!existsSync("src/codex-injector.ts")) {
    error("Please run this script from the strray-standalone directory");
    process.exit(1);
  }

  // Check if Node.js is installed
  try {
    execSync("node --version", { stdio: "pipe" });
  } catch {
    error("Node.js is not installed. Please install Node.js 18+ first.");
    process.exit(1);
  }

  // Check Node.js version
  const nodeVersionOutput = execSync("node --version", {
    encoding: "utf8",
  }).trim();
  const nodeVersion = nodeVersionOutput.replace("v", "");
  const requiredVersion = "18.0.0";

  const comparison = compareVersions(nodeVersion, requiredVersion);
  if (comparison && comparison < 0) {
    error(
      `Node.js version ${nodeVersion} is too old. Please upgrade to Node.js 18+.`,
    );
    process.exit(1);
  }

  success(`Node.js ${nodeVersion} detected`);
}

main().catch((err) => {
  error(`Initialization failed: ${err.message}`);
  process.exit(1);
});
