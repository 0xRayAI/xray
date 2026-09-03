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

const XRAY_MANAGED_AGENTS_MARKER = "<!-- 0xray-managed -->";

function readPackageIdentity(pkgPath) {
  if (!fs.existsSync(pkgPath)) return { name: null, version: null };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return {
      name: typeof pkg.name === "string" ? pkg.name : null,
      version: typeof pkg.version === "string" ? pkg.version : null,
    };
  } catch {
    return { name: null, version: null };
  }
}

function listConsumerSkillNames(targetDir) {
  const skillsSrc = path.join(targetDir, "src", "skills");
  if (!fs.existsSync(skillsSrc)) return [];
  const names = [];
  for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const skillMd = path.join(skillsSrc, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
    names.push(entry.name);
  }
  return names;
}

function listConsumerAgentFiles(targetDir) {
  const agentsSrc = path.join(targetDir, "src", "opencode", "agents");
  if (!fs.existsSync(agentsSrc)) return [];
  return fs
    .readdirSync(agentsSrc, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")),
    )
    .map((entry) => entry.name);
}

/**
 * After mill garment is on the hanger, their src/skills and src/opencode/agents win same name.
 * Does not invent skills from source files that are not SKILL.md / agent yml.
 */
function overlayConsumerTree(targetDir, log) {
  const skills = listConsumerSkillNames(targetDir);
  const agents = listConsumerAgentFiles(targetDir);
  const skillsDest = path.join(targetDir, ".opencode", "skills");
  const agentsDest = path.join(targetDir, ".opencode", "agents");

  for (const name of skills) {
    const src = path.join(targetDir, "src", "skills", name, "SKILL.md");
    const destDir = path.join(skillsDest, name);
    fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, path.join(destDir, "SKILL.md"));
  }
  for (const file of agents) {
    fs.mkdirSync(agentsDest, { recursive: true });
    fs.copyFileSync(path.join(targetDir, "src", "opencode", "agents", file), path.join(agentsDest, file));
  }

  if (log && (skills.length > 0 || agents.length > 0)) {
    log("postinstall", "Overlaid consumer skills/agents onto .opencode", "info", {
      skills: skills.length,
      agents: agents.length,
    });
  }
  return { skills, agents };
}

/** Mint a receipt from the consumer's package.json and optional overlay tree. */
function mintConsumerFromSsot(packageRoot, targetDir, log, tree) {
  const mill = readPackageIdentity(path.join(packageRoot, "package.json"));
  const consumer = readPackageIdentity(path.join(targetDir, "package.json"));
  const skills = Array.isArray(tree?.skills) ? tree.skills : [];
  const agents = Array.isArray(tree?.agents) ? tree.agents : [];
  const overlayed = skills.length > 0 || agents.length > 0;
  const garment = overlayed
    ? "overlay"
    : consumer.name && consumer.name !== mill.name
      ? "copied-onto-hanger"
      : "dogfood";
  const inventory = {
    mill: { name: mill.name || "0xray", version: mill.version },
    consumer: { name: consumer.name, version: consumer.version },
    garment,
    tree: { skills, agents },
    mintedAt: new Date().toISOString(),
  };
  const xrayDir = path.join(targetDir, ".xray");
  if (!fs.existsSync(xrayDir)) fs.mkdirSync(xrayDir, { recursive: true });
  fs.writeFileSync(
    path.join(xrayDir, "foundry-inventory.json"),
    `${JSON.stringify(inventory, null, 2)}\n`,
  );
  if (log) {
    log("postinstall", "Minted foundry-inventory from consumer package.json", "info", {
      consumer: consumer.name,
      version: consumer.version,
      garment,
    });
  }
  return inventory;
}

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
  } catch (e) {
    logFn("postinstall", "Bridge install failed", "error", { error: e.message });
    throw e;
  }

  if (consumer) {
    const tree = overlayConsumerTree(resolvedTarget, logFn);
    mintConsumerFromSsot(resolvedPackage, resolvedTarget, logFn, tree);
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
  overlayConsumerTree,
  listConsumerSkillNames,
  listConsumerAgentFiles,
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
