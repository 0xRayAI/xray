#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const {
  installAllBridges,
  resolveConsumerTargetDir,
  isConsumerInstall,
} = require("./install-bridges.cjs");
const { applyConsumerGitignore } = require("./consumer-gitignore.cjs");
const { guardHostInstallWrites } = require("./host-install-guard.cjs");
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
const XRAY_MANAGED_AGENTS_BEGIN = "<!-- 0xray-managed:begin -->";
const XRAY_MANAGED_AGENTS_END = "<!-- 0xray-managed:end -->";

function fillConsumerPlaceholders(content, consumer) {
  const name = consumer.name || "this project";
  const versionParen = consumer.version ? ` (${consumer.version})` : "";
  return content
    .split("{{CONSUMER_NAME}}")
    .join(name)
    .split("{{CONSUMER_VERSION_PAREN}}")
    .join(versionParen);
}

function renderManagedAgents(packageRoot, targetDir) {
  let content = fs.readFileSync(path.join(packageRoot, "AGENTS-consumer.md"), "utf8");
  const consumer = readPackageIdentity(path.join(targetDir, "package.json"));
  content = fillConsumerPlaceholders(content, consumer).trim();
  if (!content.includes(XRAY_MANAGED_AGENTS_MARKER)) {
    content = `${content}\n\n${XRAY_MANAGED_AGENTS_MARKER}`;
  }
  return `${XRAY_MANAGED_AGENTS_BEGIN}\n${content}\n${XRAY_MANAGED_AGENTS_END}\n`;
}

function managedRegion(text) {
  const beginAt = text.indexOf(XRAY_MANAGED_AGENTS_BEGIN);
  const endAt = text.indexOf(XRAY_MANAGED_AGENTS_END);
  if (beginAt === -1 || endAt === -1 || endAt < beginAt) return null;
  return {
    before: text.slice(0, beginAt),
    after: text.slice(endAt + XRAY_MANAGED_AGENTS_END.length),
  };
}

function outsideRegionEdited(parts) {
  return parts.before.trim() !== "" || parts.after.trim() !== "";
}

function deployManagedAgents(packageRoot, targetDir, log) {
  const agentsConsumer = path.join(packageRoot, "AGENTS-consumer.md");
  const agentsDest = path.join(targetDir, "AGENTS.md");
  if (!fs.existsSync(agentsConsumer)) return;
  const next = renderManagedAgents(packageRoot, targetDir);
  if (!fs.existsSync(agentsDest)) {
    fs.writeFileSync(agentsDest, next);
    return;
  }
  const current = fs.readFileSync(agentsDest, "utf8");
  const parts = managedRegion(current);
  if (!parts || outsideRegionEdited(parts)) {
    fs.writeFileSync(path.join(targetDir, "AGENTS.md.0xray-new"), next);
    log("postinstall", "AGENTS.md left in place; wrote AGENTS.md.0xray-new", "info");
    return;
  }
  const beginAt = next.indexOf(XRAY_MANAGED_AGENTS_BEGIN);
  const endAt = next.indexOf(XRAY_MANAGED_AGENTS_END);
  const interior = next.slice(beginAt, endAt + XRAY_MANAGED_AGENTS_END.length);
  const updated = `${parts.before}${interior}${parts.after}`;
  if (updated !== current) fs.writeFileSync(agentsDest, updated);
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
  return guardHostInstallWrites(resolvedTarget, () => {
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
  });
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
  const targetDir = resolveConsumerTargetDir(
    packageRoot,
    process.env.INIT_CWD || process.env.PWD || process.cwd(),
  );
  try {
    runPostinstall(packageRoot, targetDir);
  } catch {
    console.error("\n❌ 0xRay postinstall failed — bridge wiring did not complete.\n");
    process.exit(1);
  }
}
