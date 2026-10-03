#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { resolveConsumerTargetDir } = require("./install-bridges.cjs");
const { linkVendoredRepertoire } = require("./wear-vendored-repertoire.cjs");
const {
  overlayConsumerTree,
  mintConsumerFromSsot,
  mintConsumerSuit,
  listConsumerSkillNames,
  listConsumerAgentFiles,
  loadFoundryParams,
  readPackageIdentity,
} = require("../foundry/mint-suit.cjs");

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

function writeTextIfChanged(filePath, body) {
  try {
    if (fs.readFileSync(filePath, "utf8") === body) return false;
  } catch {
    /* absent */
  }
  fs.writeFileSync(filePath, body);
  return true;
}

function deployManagedAgents(packageRoot, targetDir, log) {
  const agentsConsumer = path.join(packageRoot, "AGENTS-consumer.md");
  const agentsDest = path.join(targetDir, "AGENTS.md");
  if (!fs.existsSync(agentsConsumer)) return;
  const next = renderManagedAgents(packageRoot, targetDir);
  if (!fs.existsSync(agentsDest)) {
    writeTextIfChanged(agentsDest, next);
    return;
  }
  const current = fs.readFileSync(agentsDest, "utf8");
  const parts = managedRegion(current);
  if (!parts || outsideRegionEdited(parts)) {
    const side = path.join(targetDir, "AGENTS.md.0xray-new");
    writeTextIfChanged(side, next);
    log("postinstall", "AGENTS.md left in place; wrote AGENTS.md.0xray-new", "info");
    return;
  }
  const beginAt = next.indexOf(XRAY_MANAGED_AGENTS_BEGIN);
  const endAt = next.indexOf(XRAY_MANAGED_AGENTS_END);
  const interior = next.slice(beginAt, endAt + XRAY_MANAGED_AGENTS_END.length);
  const updated = `${parts.before}${interior}${parts.after}`;
  writeTextIfChanged(agentsDest, updated);
}

/** npm install links vendored @0xray/repertoire and does not write `.mcp.json`. `npx 0xray wear` rewrites a checkout `dist/cli` launch to `node_modules/0xray`. */
function runPostinstall(packageRoot, targetDir, _log) {
  linkVendoredRepertoire(packageRoot, targetDir);
  console.log("Run `npx 0xray wear`");
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
