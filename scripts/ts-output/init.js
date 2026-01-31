#!/usr/bin/env node
/**
 * StrRay Standalone Framework Initialization
 *
 * Converted from shell script to TypeScript for better integration
 * and cross-platform compatibility.
 */
import { execSync } from "child_process";
import { existsSync } from "fs";
function log(message) {
    console.log(message);
}
function error(message) {
    console.error(`❌ Error: ${message}`);
}
function success(message) {
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
    }
    catch {
        error("Node.js is not installed. Please install Node.js 18+ first.");
        process.exit(1);
    }
    // Check Node.js version
    const nodeVersionOutput = execSync("node --version", {
        encoding: "utf8",
    }).trim();
    const nodeVersion = nodeVersionOutput.replace("v", "");
    const requiredVersion = "18.0.0";
    // Simple version comparison
    const [major] = nodeVersion.split('.').map(Number);
    const [reqMajor] = requiredVersion.split('.').map(Number);
    if (major < reqMajor) {
        error(`Node.js version ${nodeVersion} is too old. Please upgrade to Node.js 18+.`);
        process.exit(1);
    }
    success(`Node.js ${nodeVersion} detected`);
}
main().catch((err) => {
    error(`Initialization failed: ${err.message}`);
    process.exit(1);
});
