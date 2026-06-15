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

const packageRoot = path.join(__dirname, "..", "..");

let targetDir;
if (__dirname.includes("node_modules/xray")) {
  // plain xray (final identity)
  targetDir = path.join(__dirname, "..", "..", "..", "..");
} else {
  targetDir = process.env.PWD || process.cwd();
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

// Copy .gitignore.default → .gitignore (never overwrite existing)
const gitignoreSource = path.join(packageRoot, ".gitignore.default");
const gitignoreDest = path.join(targetDir, ".gitignore");
if (!fs.existsSync(gitignoreDest) && resolvedPackage !== resolvedTarget) {
  fs.copyFileSync(gitignoreSource, gitignoreDest);
  structuredLog('postinstall', 'Created .gitignore from template', 'info');
}

// Sync core skills from dist/ → .opencode/skills/
const skillsSource = path.join(packageRoot, 'dist', 'skills');
const skillsDest = path.join(targetDir, '.opencode', 'skills');
if (fs.existsSync(skillsSource) && resolvedPackage !== resolvedTarget) {
  try {
    if (!fs.existsSync(skillsDest)) fs.mkdirSync(skillsDest, { recursive: true });
    const skillDirs = fs.readdirSync(skillsSource, { withFileTypes: true });
    let copied = 0, skipped = 0;
    for (const entry of skillDirs) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(skillsSource, entry.name, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;
      const destMd = path.join(skillsDest, entry.name, 'SKILL.md');
      const destDir = path.dirname(destMd);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      if (fs.existsSync(destMd)) {
        if (fs.statSync(skillMd).mtime <= fs.statSync(destMd).mtime) continue;
      }
      fs.copyFileSync(skillMd, destMd);
      copied++;
    }
    if (copied > 0) structuredLog('postinstall', `Skills: ${copied} installed to .opencode/skills/`, 'info');
  } catch (e) {
    structuredLog('postinstall', `Skills sync skipped: ${e.message}`, 'warn');
  }
}

// Register MCP servers with Grok CLI (if available) using absolute paths to installed dist
// Full v2 surface: governance + skills + orchestrator + enforcer (additive, preserves prior behavior)
if (resolvedPackage !== resolvedTarget) {
  try {
    execSync('which grok', { stdio: 'ignore' });
    const govServer = path.join(packageRoot, 'dist/mcps/governance.server.js');
    const skillsServer = path.join(packageRoot, 'dist/mcps/knowledge-skills/skill-invocation.server.js');
    const orchServer = path.join(packageRoot, 'dist/mcps/orchestrator.server.js');
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

if (resolvedPackage !== resolvedTarget) {
  structuredLog('postinstall', 'xray v2 framework installed. Run `npx xray setup` for full configuration (hooks, Hermes, symlinks).', 'success');
}
