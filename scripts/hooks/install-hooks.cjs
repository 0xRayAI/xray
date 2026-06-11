#!/usr/bin/env node
/**
 * install-hooks.cjs — Installs xray pre-commit hook into the consumer project's .git/hooks/.
 *
 * Called from setup.cjs or standalone via:
 *   node scripts/hooks/install-hooks.cjs
 *
 * Creates a consumer-aware pre-commit hook that references the installed
 * package's run-hook.js and LightweightValidator via node_modules/ paths.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packageRoot = path.resolve(path.join(__dirname, "..", ".."));

// Determine the target project root (where .git/ lives)
let targetDir;
try {
  targetDir = execSync("git rev-parse --show-toplevel 2>/dev/null", {
    encoding: "utf-8",
    stdio: "pipe",
  }).trim();
} catch {
  console.warn("⚠️  Not a git repository — cannot install hooks");
  process.exit(0);
}

const gitHooksDir = path.join(targetDir, ".git", "hooks");
if (!fs.existsSync(gitHooksDir)) {
  console.warn("⚠️  No .git/hooks/ directory found");
  process.exit(0);
}

// Check if we're in a consumer install (via node_modules) or dev
const isConsumer = packageRoot.includes("node_modules");

// Resolve run-hook.js path
// In dev: scripts/hooks/run-hook.js (relative to project root)
// In consumer: node_modules/0xray/scripts/hooks/run-hook.js (relative to project root)
const runHookRelativePath = isConsumer
  ? "node_modules/0xray/scripts/hooks/run-hook.js"
  : "scripts/hooks/run-hook.js";

const hookContent = `#!/bin/bash
# 0xRay Pre-Commit Hook — Consumer Install
# Installed by xray setup on $(new Date().toISOString().split('T')[0])
# Runs TypeScript check, linting, and Codex validation before commit
# BLOCKS the commit if validation fails

set -e

PROJECT_ROOT=$(git rev-parse --show-toplevel)

# Get staged files (only source files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx|js|jsx|mjs)$' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Run the Node.js hook runner
if command -v node >/dev/null 2>&1; then
  export HOOK_TYPE="pre-commit"
  export STAGED_FILES="$STAGED_FILES"
  export PROJECT_ROOT="$PROJECT_ROOT"
  if [ -f "$PROJECT_ROOT/${runHookRelativePath}" ]; then
    node "$PROJECT_ROOT/${runHookRelativePath}" pre-commit
    exit $?
  else
    echo "Warning: xray hook runner not found — install may be incomplete"
    exit 0
  fi
else
  echo "Warning: Node.js not found, skipping xray pre-commit validation"
  exit 0
fi
`;

const hookPath = path.join(gitHooksDir, "pre-commit");
const existing = fs.existsSync(hookPath);
if (existing) {
  const existingContent = fs.readFileSync(hookPath, "utf-8");
  if (existingContent.includes("0xRay") || existingContent.includes("xray")) {
    console.log("ℹ️  Pre-commit hook already installed by xray — skipping");
    process.exit(0);
  }
}

try {
  fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
  if (existing) {
    console.log("✅ Pre-commit hook updated for xray validation");
  } else {
    console.log("✅ Pre-commit hook installed — runs Codex validation on every commit");
  }
} catch (e) {
  console.warn(`⚠️ Failed to install pre-commit hook: ${e.message}`);
}
