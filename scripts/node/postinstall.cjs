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

const MERGE_FILES = new Set(["enforcer-config.json"]);
const SKIP_DIRS = new Set(["node_modules", "logs"]);
const KEEP_IF_EXISTS = new Set([".yml", ".yaml", ".md"]); // agent configs, commands, workflows

function deepMerge(src, dest) {
  if (typeof src !== "object" || src === null) return dest !== undefined ? dest : src;
  if (Array.isArray(src)) return Array.isArray(dest) ? dest : src;
  const result = {};
  for (const key of Object.keys(src)) {
    result[key] = dest && typeof dest[key] !== "undefined" ? deepMerge(src[key], dest[key]) : src[key];
  }
  if (dest && typeof dest === "object") {
    for (const key of Object.keys(dest)) {
      if (!(key in src)) result[key] = dest[key];
    }
  }
  return result;
}

// Copy .opencode/ to consumer project (source of truth built during npm run build)
const opencodeSource = path.join(packageRoot, ".opencode");
const opencodeDest = path.join(targetDir, ".opencode");

if (fs.existsSync(opencodeSource) && resolvedPackage !== resolvedTarget) {
  function copyDir(src, dest, relPath = "") {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      const rel = path.join(relPath, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath, rel);
      } else if (MERGE_FILES.has(rel)) {
        try {
          const srcData = JSON.parse(fs.readFileSync(srcPath, "utf8"));
          if (fs.existsSync(destPath)) {
            const destData = JSON.parse(fs.readFileSync(destPath, "utf8"));
            fs.writeFileSync(destPath, JSON.stringify(deepMerge(srcData, destData), null, 2));
          } else {
            fs.copyFileSync(srcPath, destPath);
          }
        } catch {
          fs.copyFileSync(srcPath, destPath);
        }
      } else if (KEEP_IF_EXISTS.has(path.extname(srcPath)) && fs.existsSync(destPath)) {
        // Skip agent YAMLs, commands, workflows if consumer has customized them
        continue;
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  copyDir(opencodeSource, opencodeDest);
}

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

if (resolvedPackage !== resolvedTarget) {
  structuredLog('postinstall', 'xray v2 framework installed. Run `npx xray setup` for full configuration (hooks, Hermes, symlinks).', 'success');
}
