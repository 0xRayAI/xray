#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  installAllBridges,
  resolveConsumerTargetDir,
  isConsumerInstall,
} = require("./install-bridges.cjs");

function structuredLog(component, action, status, details) {
  const ts = new Date().toISOString();
  const detailsPart = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`${ts} [${component}] ${action} - ${String(status).toUpperCase()}${detailsPart}`);
}

const packageRoot = path.join(__dirname, "..", "..");
const targetDir = resolveConsumerTargetDir(packageRoot, process.env.PWD || process.cwd());
const resolvedPackage = path.resolve(packageRoot);
const resolvedTarget = path.resolve(targetDir);

// Copy AGENTS-consumer.md → AGENTS.md
const agentsConsumer = path.join(packageRoot, "AGENTS-consumer.md");
const agentsDest = path.join(targetDir, "AGENTS.md");
if (fs.existsSync(agentsConsumer) && isConsumerInstall(resolvedPackage, resolvedTarget)) {
  fs.copyFileSync(agentsConsumer, agentsDest);
}

// Copy .gitignore.default → .gitignore (never overwrite existing)
const gitignoreSource = path.join(packageRoot, ".gitignore.default");
const gitignoreDest = path.join(targetDir, ".gitignore");
if (!fs.existsSync(gitignoreDest) && isConsumerInstall(resolvedPackage, resolvedTarget)) {
  fs.copyFileSync(gitignoreSource, gitignoreDest);
  structuredLog("postinstall", "Created .gitignore from template", "info");
}

// Unified 4-platform bridge install (OpenCode, Grok, Hermes, OpenClaw)
if (isConsumerInstall(resolvedPackage, resolvedTarget)) {
  try {
    installAllBridges({
      targetDir,
      packageRoot,
      log: structuredLog,
    });
  } catch (e) {
    structuredLog("postinstall", "Bridge install failed", "warn", { error: e.message });
  }

  structuredLog(
    "postinstall",
    "0xRay framework installed (4 bridges). Run `npx 0xray setup` for symlinks/Hermes skill extras.",
    "success"
  );
}