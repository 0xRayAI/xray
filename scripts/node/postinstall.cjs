#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  installAllBridges,
  resolveConsumerTargetDir,
  isConsumerInstall,
} = require("./install-bridges.cjs");
const { applyConsumerGitignore } = require("./consumer-gitignore.cjs");
const {
  overlayConsumerTree,
  mintConsumerFromSsot,
  mintConsumerSuit,
  listConsumerSkillNames,
  listConsumerAgentFiles,
  loadFoundryParams,
  readPackageIdentity,
} = require("../foundry/mint-suit.cjs");

function structuredLog(component, action, status, details) {
  const ts = new Date().toISOString();
  const detailsPart = details ? ` | ${JSON.stringify(details)}` : "";
  console.log(`${ts} [${component}] ${action} - ${String(status).toUpperCase()}${detailsPart}`);
}

const XRAY_MANAGED_AGENTS_MARKER = "<!-- 0xray-managed -->";

function fillConsumerPlaceholders(content, consumer) {
  const name = consumer.name || "this project";
  const versionParen = consumer.version ? ` (${consumer.version})` : "";
  return content
    .split("{{CONSUMER_NAME}}")
    .join(name)
    .split("{{CONSUMER_VERSION_PAREN}}")
    .join(versionParen);
}

function deployManagedAgents(packageRoot, targetDir, log) {
  const agentsConsumer = path.join(packageRoot, "AGENTS-consumer.md");
  const agentsDest = path.join(targetDir, "AGENTS.md");
  if (!fs.existsSync(agentsConsumer)) return;
  const shouldDeployAgents =
    !fs.existsSync(agentsDest) ||
    fs.readFileSync(agentsDest, "utf8").includes(XRAY_MANAGED_AGENTS_MARKER);
  if (shouldDeployAgents) {
    let content = fs.readFileSync(agentsConsumer, "utf8");
    const consumer = readPackageIdentity(path.join(targetDir, "package.json"));
    content = fillConsumerPlaceholders(content, consumer);
    if (!content.includes(XRAY_MANAGED_AGENTS_MARKER)) {
      content = `${content.trimEnd()}\n\n${XRAY_MANAGED_AGENTS_MARKER}\n`;
    }
    fs.writeFileSync(agentsDest, content);
  } else {
    log("postinstall", "Skipped AGENTS.md (consumer-customized)", "info");
  }
}

function deployConsumerGitignore(packageRoot, targetDir, log) {
  const gitignoreResult = applyConsumerGitignore(targetDir, packageRoot);
  if (gitignoreResult === "created") {
    log("postinstall", "Created .gitignore from template", "info");
  } else if (gitignoreResult === "merged") {
    log("postinstall", "Merged 0xray suit entries into .gitignore", "info");
  }
}

/**
 * Wear bridges for consumers (full 4-platform) and the framework repo (dogfood).
 * installAllBridges already decides which path.
 */
function runPostinstall(packageRoot, targetDir, log) {
  const logFn = log || structuredLog;
  const resolvedPackage = path.resolve(packageRoot);
  const resolvedTarget = path.resolve(targetDir);
  const consumer = isConsumerInstall(resolvedPackage, resolvedTarget);

  if (consumer) {
    deployManagedAgents(resolvedPackage, resolvedTarget, logFn);
    deployConsumerGitignore(resolvedPackage, resolvedTarget, logFn);
  }

  try {
    installAllBridges({
      targetDir: resolvedTarget,
      packageRoot: resolvedPackage,
      log: logFn,
    });
    if (consumer) {
      mintConsumerSuit(resolvedPackage, resolvedTarget, logFn);
    }
  } catch (e) {
    logFn("postinstall", "Bridge install failed", "error", { error: e.message });
    throw e;
  }

  if (consumer) {
    logFn(
      "postinstall",
      "0xRay framework installed (4 bridges). Run `npx 0xray setup` for symlinks/Hermes skill extras.",
      "success",
    );
  } else {
    logFn("postinstall", "framework dogfood wear complete", "success");
  }
}

module.exports = {
  runPostinstall,
  mintConsumerFromSsot,
  mintConsumerSuit,
  overlayConsumerTree,
  listConsumerSkillNames,
  listConsumerAgentFiles,
  loadFoundryParams,
  fillConsumerPlaceholders,
  readPackageIdentity,
  deployManagedAgents,
};

if (require.main === module) {
  const packageRoot = path.join(__dirname, "..", "..");
  const targetDir = resolveConsumerTargetDir(packageRoot, process.env.PWD || process.cwd());
  try {
    runPostinstall(packageRoot, targetDir);
  } catch {
    console.error("\n❌ 0xRay postinstall failed — bridge wiring did not complete.\n");
    process.exit(1);
  }
}
