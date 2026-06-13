#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Structured logging shim (fwLogger discipline for script context; mirrors FrameworkUsageLogger format to logs/framework/activity.log in full runs)
function structuredLog(component, action, status, details) {
  const ts = new Date().toISOString();
  const detailsPart = details ? ` | ${JSON.stringify(details)}` : '';
  console.log(`${ts} [${component}] ${action} - ${String(status).toUpperCase()}${detailsPart}`);
}

const packageRoot = path.resolve(__dirname, "..", "..");

// Consumer-friendly targetDir resolution:
// - In node_modules/0xray (or legacy xray): walk up until outside node_modules to reach consumer project root.
// - Otherwise (dev): use cwd.
let targetDir = process.env.PWD || process.cwd();
if (packageRoot.includes("node_modules")) {
  let current = packageRoot;
  while (current.includes("node_modules")) {
    current = path.dirname(current);
  }
  targetDir = current;
}

const resolvedPackage = path.resolve(packageRoot);
const resolvedTarget = path.resolve(targetDir);


const SKIP_DIRS = new Set(["node_modules", "logs"]);

// Copy AGENTS-consumer.md → AGENTS.md
const agentsConsumer = path.join(packageRoot, "AGENTS-consumer.md");
const agentsDest = path.join(targetDir, "AGENTS.md");
if (fs.existsSync(agentsConsumer) && resolvedPackage !== resolvedTarget) {
  fs.copyFileSync(agentsConsumer, agentsDest);
}

// Register MCP servers with Grok CLI (if available) using absolute paths to installed dist
// Full v2 surface: governance + skills + orchestrator + enforcer (additive, preserves prior behavior)
if (resolvedPackage !== resolvedTarget) {
  try {
    execSync('which grok', { stdio: 'ignore' });
    const govServer = path.join(packageRoot, 'dist/mcps/governance.server.js');
    const skillsServer = path.join(packageRoot, 'dist/mcps/knowledge-skills/skill-invocation.server.js');
    const orchServer = path.join(packageRoot, 'dist/mcps/orchestrator/server.js');
    const enforcerServer = path.join(packageRoot, 'dist/mcps/enforcer-tools.server.js');
    const xrayRoot = targetDir;

    execSync(
      `grok mcp add xray-governance --command node --args "${govServer}" --env "XRAY_FORCE_MCP_GOVERNANCE=true" --env "XRAY_ROOT=${xrayRoot}"`,
      { stdio: 'pipe' }
    );
    structuredLog('postinstall', 'Registered xray-governance with Grok CLI', 'info');

    execSync(
      `grok mcp add xray-skills --command node --args "${skillsServer}" --env "XRAY_ROOT=${xrayRoot}"`,
      { stdio: 'pipe' }
    );
    structuredLog('postinstall', 'Registered xray-skills with Grok CLI', 'info');

    execSync(
      `grok mcp add xray-orchestrator --command node --args "${orchServer}" --env "XRAY_ROOT=${xrayRoot}"`,
      { stdio: 'pipe' }
    );
    structuredLog('postinstall', 'Registered xray-orchestrator with Grok CLI', 'info');

    execSync(
      `grok mcp add xray-enforcer --command node --args "${enforcerServer}" --env "XRAY_ROOT=${xrayRoot}"`,
      { stdio: 'pipe' }
    );
    structuredLog('postinstall', 'Registered xray-enforcer with Grok CLI', 'info');
  } catch (_e) {
    // grok not on PATH or registration failed — skip gracefully
  }
}

// Install pre-commit hook (LightweightValidator + gate, if git repo)
try {
  const installHooks = path.join(packageRoot, "scripts", "hooks", "install-hooks.cjs");
  if (fs.existsSync(installHooks)) {
    execSync(`node "${installHooks}"`, { stdio: 'pipe' });
  }
} catch (_e) {
  // Non-git or install failure — not blocking
}

if (resolvedPackage !== resolvedTarget) {
  structuredLog('postinstall', 'xray v3 framework installed. Run `npx 0xray setup` for full configuration (hooks, Hermes, symlinks).', 'success');
}
