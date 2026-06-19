#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  installAllBridges,
  resolveConsumerTargetDir,
  isConsumerInstall,
} = require("./install-bridges.cjs");
const { applyConsumerGitignore } = require("./consumer-gitignore.cjs");

function structuredLog(component, action, status, details) {
  const ts = new Date().toISOString();
  const detailsPart = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`${ts} [${component}] ${action} - ${String(status).toUpperCase()}${detailsPart}`);
}

const packageRoot = path.join(__dirname, "..", "..");
const targetDir = resolveConsumerTargetDir(packageRoot, process.env.PWD || process.cwd());
const resolvedPackage = path.resolve(packageRoot);
const resolvedTarget = path.resolve(targetDir);

const XRAY_MANAGED_AGENTS_MARKER = "<!-- 0xray-managed -->";

// Copy AGENTS-consumer.md → AGENTS.md (only if absent or still 0xray-managed)
const agentsConsumer = path.join(packageRoot, "AGENTS-consumer.md");
const agentsDest = path.join(targetDir, "AGENTS.md");
if (fs.existsSync(agentsConsumer) && isConsumerInstall(resolvedPackage, resolvedTarget)) {
  const shouldDeployAgents =
    !fs.existsSync(agentsDest) ||
    fs.readFileSync(agentsDest, "utf8").includes(XRAY_MANAGED_AGENTS_MARKER);
  if (shouldDeployAgents) {
    let content = fs.readFileSync(agentsConsumer, "utf8");
    if (!content.includes(XRAY_MANAGED_AGENTS_MARKER)) {
      content = `${content.trimEnd()}\n\n${XRAY_MANAGED_AGENTS_MARKER}\n`;
    }
    fs.writeFileSync(agentsDest, content);
  } else {
    structuredLog("postinstall", "Skipped AGENTS.md (consumer-customized)", "info");
  }
}

// .gitignore: full template when absent; merge suit block when existing
if (isConsumerInstall(resolvedPackage, resolvedTarget)) {
  const gitignoreResult = applyConsumerGitignore(targetDir, packageRoot);
  if (gitignoreResult === "created") {
    structuredLog("postinstall", "Created .gitignore from template", "info");
  } else if (gitignoreResult === "merged") {
    structuredLog("postinstall", "Merged 0xray suit entries into .gitignore", "info");
  }
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
    structuredLog("postinstall", "Bridge install failed", "error", { error: e.message });
    console.error("\n❌ 0xRay postinstall failed — bridge wiring did not complete.\n");
    process.exit(1);
  }

  structuredLog(
    "postinstall",
    "0xRay framework installed (4 bridges). Run `npx 0xray setup` for symlinks/Hermes skill extras.",
    "success"
  );
}