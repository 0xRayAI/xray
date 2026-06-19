#!/usr/bin/env node
/**
 * install-hooks.cjs — Installs xray pre-commit + post-commit hooks into consumer .git/hooks/.
 *
 * Called from postinstall.cjs or standalone via:
 *   node scripts/hooks/install-hooks.cjs
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const packageRoot = path.resolve(path.join(__dirname, "..", ".."));

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

const isConsumer = packageRoot.includes("node_modules");
const runHookRelativePath = isConsumer
  ? "node_modules/0xray/scripts/hooks/run-hook.js"
  : "scripts/hooks/run-hook.js";
const loadReflectionRelativePath = isConsumer
  ? "node_modules/0xray/scripts/node/load-reflection-config.mjs"
  : "scripts/node/load-reflection-config.mjs";
const autoReflectionRelativePath = isConsumer
  ? "node_modules/0xray/scripts/node/auto-reflection-generator.mjs"
  : "scripts/node/auto-reflection-generator.mjs";

function hookRunnerExists(projectRoot) {
  return (
    fs.existsSync(path.join(projectRoot, "node_modules/0xray/scripts/hooks/run-hook.js")) ||
    fs.existsSync(path.join(projectRoot, "scripts/hooks/run-hook.js"))
  );
}

function isXrayHookContent(content) {
  return content.includes("0xRay") || content.includes("xray");
}

function backupExistingHook(hookPath) {
  const backupPath = `${hookPath}.backup-${Date.now()}`;
  fs.copyFileSync(hookPath, backupPath);
  console.log(`ℹ️  Backed up existing hook to ${path.basename(backupPath)}`);
}

const preCommitContent = `#!/bin/bash
# 0xRay Pre-Commit Hook — Consumer Install
# Installed by xray setup on ${new Date().toISOString().split("T")[0]}
# BLOCKS the commit if validation fails

set -e

PROJECT_ROOT=$(git rev-parse --show-toplevel)

STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(ts|tsx|js|jsx|mjs)$' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

if command -v node >/dev/null 2>&1; then
  export HOOK_TYPE="pre-commit"
  export STAGED_FILES="$STAGED_FILES"
  export PROJECT_ROOT="$PROJECT_ROOT"
  if [ -f "$PROJECT_ROOT/${runHookRelativePath}" ]; then
    node "$PROJECT_ROOT/${runHookRelativePath}" pre-commit
    exit $?
  else
    echo "Error: xray hook runner not found at ${runHookRelativePath} — run npm install 0xray"
    exit 1
  fi
else
  echo "Error: Node.js not found — xray pre-commit validation requires node"
  exit 1
fi
`;

const postCommitContent = `#!/bin/bash
# 0xRay Post-Commit Hook — Consumer Install
# Runs activity logging and auto-reflection after commit (non-blocking)

PROJECT_ROOT=$(git rev-parse --show-toplevel)
COMMIT_SHA=$(git rev-parse HEAD)
BRANCH=$(git rev-parse --abbrev-ref HEAD)

(
  if command -v node >/dev/null 2>&1 && [ -f "$PROJECT_ROOT/${runHookRelativePath}" ]; then
    export HOOK_TYPE="post-commit"
    export COMMIT_SHA="$COMMIT_SHA"
    export BRANCH="$BRANCH"
    export PROJECT_ROOT="$PROJECT_ROOT"
    node "$PROJECT_ROOT/${runHookRelativePath}" post-commit 2>/dev/null || true
  fi
) &

MODE="minimal"
COMMIT_THRESHOLD=50
DAYS_THRESHOLD=14
AUTO_GENERATE=false
PROMPT_USER=true

if command -v node >/dev/null 2>&1; then
  LOAD_SCRIPT="$PROJECT_ROOT/${loadReflectionRelativePath}"
  if [ -f "$LOAD_SCRIPT" ]; then
    export PROJECT_ROOT="$PROJECT_ROOT"
    REFLECTION_JSON=$(node "$LOAD_SCRIPT" --json 2>/dev/null || echo '{}')
    MODE=$(node -e 'const c=JSON.parse(process.argv[1]);process.stdout.write(String(c.mode||"minimal"))' "$REFLECTION_JSON")
    COMMIT_THRESHOLD=$(node -e 'const c=JSON.parse(process.argv[1]);process.stdout.write(String(c.commitThreshold??25))' "$REFLECTION_JSON")
    DAYS_THRESHOLD=$(node -e 'const c=JSON.parse(process.argv[1]);process.stdout.write(String(c.daysThreshold??14))' "$REFLECTION_JSON")
    AUTO_GENERATE=$(node -e 'const c=JSON.parse(process.argv[1]);process.stdout.write(c.autoGenerate===false?"false":"true")' "$REFLECTION_JSON")
    PROMPT_USER=$(node -e 'const c=JSON.parse(process.argv[1]);process.stdout.write(c.promptUser===false?"false":"true")' "$REFLECTION_JSON")
  fi
fi

COMMIT_MSG=$(git log -1 --pretty=%B)
SIGNIFICANT_KEYWORDS="fix|bug|debug|deploy|release|feature|refactor|kernel|learning|pattern|wire|connect|integrate"

if echo "$COMMIT_MSG" | grep -qiE "$SIGNIFICANT_KEYWORDS" && [ "$PROMPT_USER" = true ]; then
  echo ""
  echo "📝 REFLECTION SUGGESTION: This commit appears to involve significant changes."
  echo "   Consider writing a reflection using the v3.0 template:"
  echo "   → cat docs/reflections/TEMPLATE_v3.md"
  echo ""
fi

if [ "$AUTO_GENERATE" = true ] && [ -d "$PROJECT_ROOT/docs/reflections" ]; then
  if stat --version >/dev/null 2>&1; then
    LAST_REFLECTION=$(find "$PROJECT_ROOT/docs/reflections" -name "*.md" -type f -exec stat --format="%Y" {} \\; 2>/dev/null | sort -rn | head -1)
  else
    LAST_REFLECTION=$(find "$PROJECT_ROOT/docs/reflections" -name "*.md" -type f -exec stat -f "%m" {} \\; 2>/dev/null | sort -rn | head -1)
  fi

  if [ -n "$LAST_REFLECTION" ]; then
    REFLECTION_EPOCH=$(date -r "$LAST_REFLECTION" +%s 2>/dev/null || echo "0")
    NOW_EPOCH=$(date +%s)
    DAYS_SINCE=$(( (NOW_EPOCH - REFLECTION_EPOCH) / 86400 ))
    COMMITS_SINCE=$(git log --since="$LAST_REFLECTION" --oneline 2>/dev/null | wc -l | tr -d ' ')
  else
    DAYS_SINCE=999
    COMMITS_SINCE=$(git rev-list --count HEAD 2>/dev/null || echo "0")
  fi

  if [ "$COMMITS_SINCE" -gt "$COMMIT_THRESHOLD" ] || [ "$DAYS_SINCE" -gt "$DAYS_THRESHOLD" ]; then
    echo ""
    echo "⚠️  AUTO-REFLECTION TRIGGERED (mode: $MODE)"
    echo "   $COMMITS_SINCE commits since last reflection ($DAYS_SINCE days)"
    if [ "$MODE" != "off" ]; then
      cd "$PROJECT_ROOT"
      if [ -f "$PROJECT_ROOT/${autoReflectionRelativePath}" ]; then
        node "$PROJECT_ROOT/${autoReflectionRelativePath}" --trigger commit-threshold \\
          --title "Multiple commits since last reflection" 2>/dev/null || true
      fi
    fi
  fi
fi

exit 0
`;

function installHook(name, content, { forceReinstall = false } = {}) {
  const hookPath = path.join(gitHooksDir, name);
  const existing = fs.existsSync(hookPath);
  if (existing) {
    const existingContent = fs.readFileSync(hookPath, "utf-8");
    const isXray = isXrayHookContent(existingContent);
    if (isXray && hookRunnerExists(targetDir) && !forceReinstall) {
      console.log(`ℹ️  ${name} hook already installed by xray — skipping`);
      return false;
    }
    if (isXray && !hookRunnerExists(targetDir)) {
      console.log(`⚠️  Stale xray ${name} hook detected — reinstalling`);
    } else if (!isXray) {
      backupExistingHook(hookPath);
    }
  }
  fs.writeFileSync(hookPath, content, { mode: 0o755 });
  console.log(
    existing
      ? `✅ ${name} hook updated for xray`
      : `✅ ${name} hook installed`,
  );
  return true;
}

installHook("pre-commit", preCommitContent);
installHook("post-commit", postCommitContent);