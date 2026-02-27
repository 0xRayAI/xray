#!/usr/bin/env node

function log(message) {
  console.log(message);
}

function error(message) {
  console.error("Error: ${message}");
}

function success(message) {
  console.log("Success: ${message}");
}

async function main() {
  log("StrRay Standalone Framework Initialization");
  log("============================================");

  // Check if we are in the right directory
  if (!require("fs").existsSync("src/codex-injector.ts")) {
    error("Please run this script from the strray-standalone directory");
    process.exit(1);
  }

  // Check if Node.js is installed
  try {
    const { execSync } = require("child_process");
    const nodeVersionOutput = execSync("node --version", { stdio: "pipe" });
    const nodeVersion = nodeVersionOutput.replace("v", "");
    const requiredVersion = "18.0.0";

    if (require("semver").compare(nodeVersion, requiredVersion) < 0) {
      error(`Node.js version ${nodeVersion} is too old. Please upgrade to Node.js 18+.`);
      process.exit(1);
    }
  } catch {
    error("Node.js is not installed. Please install Node.js 18+ first.");
    process.exit(1);
  }

  success(`Node.js ${nodeVersion} detected`);
}
