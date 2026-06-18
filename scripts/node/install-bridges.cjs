#!/usr/bin/env node
/**
 * install-bridges.cjs — Unified 4-platform bridge installer for consumer postinstall.
 * Mirrors npx 0xray {opencode,grok,hermes,openclaw} install in one synchronous pass.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");
const {
  wireHermesBridge,
  wireOpencodeBridge,
  wireOpenClawBridge,
  deployPortableProjectMcpJson,
} = require("./bridge-mcp-wiring.cjs");

const SKIP_DIRS = new Set(["node_modules", "logs"]);
const MERGE_FILES = new Set(["enforcer-config.json"]);
const KEEP_IF_EXISTS = new Set([".yml", ".yaml", ".md"]);

/** Canonical 7-server MCP surface — matches package .mcp.json and Grok plugin */
const XRAY_MCP_SERVERS = [
  { name: "xray-governance", mcpCmd: "governance", env: { XRAY_FORCE_MCP_GOVERNANCE: "true" } },
  { name: "xray-skills", mcpCmd: "skills", env: {} },
  { name: "xray-orchestrator", mcpCmd: "orchestrator", env: {} },
  { name: "xray-enforcer", mcpCmd: "enforcer", env: {} },
  { name: "xray-researcher", mcpCmd: "researcher", env: {} },
  { name: "xray-code-review", mcpCmd: "code-review", env: {} },
  { name: "xray-architect-tools", mcpCmd: "architect-tools", env: {} },
];

function resolveConsumerTargetDir(packageRoot, fallbackDir) {
  const resolved = path.resolve(packageRoot);
  const inNodeModules =
    resolved.includes(`${path.sep}node_modules${path.sep}`) ||
    resolved.endsWith(`${path.sep}node_modules`);

  if (!inNodeModules) {
    return fallbackDir || process.env.PWD || process.cwd();
  }

  let current = resolved;
  while (path.basename(current) !== "node_modules") {
    const parent = path.dirname(current);
    if (parent === current) return fallbackDir || process.cwd();
    current = parent;
  }
  return path.dirname(current);
}

function isConsumerInstall(packageRoot, targetDir) {
  return path.resolve(packageRoot) !== path.resolve(targetDir);
}

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

function syncBuiltinSkills(targetSkillsDir, packageRoot) {
  const candidateDirs = [
    path.join(packageRoot, "dist", "skills"),
    path.join(packageRoot, "src", "skills"),
  ];
  const sourceDir = candidateDirs.find((p) => fs.existsSync(p));
  if (!sourceDir) return 0;

  let copied = 0;
  try {
    if (!fs.existsSync(targetSkillsDir)) fs.mkdirSync(targetSkillsDir, { recursive: true });
    for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillMd = path.join(sourceDir, entry.name, "SKILL.md");
      if (!fs.existsSync(skillMd)) continue;
      const destMd = path.join(targetSkillsDir, entry.name, "SKILL.md");
      const destDir = path.dirname(destMd);
      if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
      if (fs.existsSync(destMd) && fs.statSync(skillMd).mtime <= fs.statSync(destMd).mtime) continue;
      fs.copyFileSync(skillMd, destMd);
      copied++;
    }
  } catch {
    // best-effort
  }
  return copied;
}

function copyTree(src, dest, relPath = "") {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const rel = path.join(relPath, entry.name);
    if (entry.isDirectory()) {
      copyTree(srcPath, destPath, rel);
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
      continue;
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function copyPluginDir(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.cpSync(src, dest, { recursive: true, force: true });
  return true;
}

function writePluginMcpJson(pluginDir, targetDir, log, label) {
  if (!fs.existsSync(pluginDir)) return;
  const { buildPluginMcpJson } = require("./bridge-mcp-wiring.cjs");
  const dest = path.join(pluginDir, ".mcp.json");
  fs.writeFileSync(dest, JSON.stringify(buildPluginMcpJson(targetDir), null, 2) + "\n");
  log(label, "plugin .mcp.json patched for consumer", "info");
}

function deployProjectMcpJson(targetDir, log) {
  deployPortableProjectMcpJson(targetDir);
  log("mcp-config", "project .mcp.json deployed (7 xray servers, portable)", "info");
}

function mergeOpencodeJson(targetDir, packageRoot, log) {
  const rootOpencode = path.join(packageRoot, "opencode.json");
  const userOpencode = path.join(targetDir, "opencode.json");
  if (!fs.existsSync(rootOpencode)) return;

  try {
    const srcData = JSON.parse(fs.readFileSync(rootOpencode, "utf8"));
    if (fs.existsSync(userOpencode)) {
      const destData = JSON.parse(fs.readFileSync(userOpencode, "utf8"));
      const merged = { ...destData };
      if (srcData.agent) merged.agent = srcData.agent;
      if (srcData.mcp) merged.mcp = { ...destData.mcp, ...srcData.mcp };
      if (srcData.compaction) merged.compaction = srcData.compaction;
      fs.writeFileSync(userOpencode, JSON.stringify(merged, null, 2) + "\n");
    } else {
      fs.copyFileSync(rootOpencode, userOpencode);
    }
    log("opencode-bridge", "opencode.json merged", "info");
  } catch (e) {
    log("opencode-bridge", "opencode.json merge failed", "warn", { error: e.message });
  }
}

function patchGrokHooks(pluginDir, packageRoot, targetDir, log, label) {
  const hooksPath = path.join(pluginDir, "hooks", "hooks.json");
  const hookScript = path.join(packageRoot, "dist", "integrations", "grok", "hooks", "pre-tool-use.js");
  if (!fs.existsSync(hooksPath)) return;

  try {
    const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
    const preTool = hooks.hooks?.PreToolUse?.[0]?.hooks?.[0];
    if (preTool && fs.existsSync(hookScript)) {
      preTool.command = "node";
      preTool.args = [hookScript];
      preTool.env = {
        ...(preTool.env || {}),
        XRAY_ROOT: targetDir,
        XRAY_AI_PATH: packageRoot,
      };
      fs.writeFileSync(hooksPath, JSON.stringify(hooks, null, 2) + "\n");
      log(label, "hooks.json patched → enforcement gate", "info");
    }
  } catch (e) {
    log(label, "hooks.json patch failed", "warn", { error: e.message });
  }
}

function installOpencodeBridge(targetDir, packageRoot, log) {
  const opencodeSource = path.join(packageRoot, ".opencode");
  const opencodeDest = path.join(targetDir, ".opencode");
  if (!fs.existsSync(opencodeSource)) {
    log("opencode-bridge", "skipped", "warn", { reason: ".opencode source missing" });
    return;
  }

  if (!fs.existsSync(opencodeDest)) {
    copyTree(opencodeSource, opencodeDest);
    log("opencode-bridge", "copied .opencode tree", "info");
  } else {
    log("opencode-bridge", ".opencode exists — merging skills/plugin only", "info");
  }

  const pluginSource = path.join(packageRoot, "dist", "plugin", "xray-codex-injection.js");
  const pluginDest = path.join(opencodeDest, "plugin", "xray-codex-injection.js");
  if (fs.existsSync(pluginSource)) {
    const pluginDestDir = path.dirname(pluginDest);
    if (!fs.existsSync(pluginDestDir)) fs.mkdirSync(pluginDestDir, { recursive: true });
    const shouldCopy =
      !fs.existsSync(pluginDest) ||
      fs.statSync(pluginSource).mtime > fs.statSync(pluginDest).mtime;
    if (shouldCopy) {
      fs.copyFileSync(pluginSource, pluginDest);
      log("opencode-bridge", "plugin updated", "info");
    }
  }

  const copied = syncBuiltinSkills(path.join(opencodeDest, "skills"), packageRoot);
  if (copied > 0) log("opencode-bridge", `skills synced (${copied})`, "info", { path: ".opencode/skills/" });

  try {
    const count = wireOpencodeBridge(targetDir);
    log("opencode-bridge", `opencode.json mcp wired (${count} servers)`, "info");
  } catch (e) {
    log("opencode-bridge", "opencode.json mcp wire failed", "warn", { error: e.message });
  }
}

function findGrokPluginSource(packageRoot) {
  const candidates = [
    path.join(packageRoot, "src", "integrations", "grok", "plugin", "0xray"),
    path.join(packageRoot, ".grok", "plugins", "0xray"),
  ];
  return candidates.find((p) => fs.existsSync(p));
}

function registerGrokMcpServers(targetDir, log) {
  try {
    execSync("which grok", { stdio: "ignore" });
  } catch {
    log("grok-bridge", "grok CLI not on PATH — plugin .mcp.json still configured", "info");
    return;
  }

  for (const s of XRAY_MCP_SERVERS) {
    try {
      const envEntries = { ...s.env, XRAY_ROOT: targetDir };
      const envFlags = Object.entries(envEntries)
        .map(([k, v]) => `--env "${k}=${v}"`)
        .join(" ");
      execSync(
        `grok mcp add ${s.name} --command npx --args "-y" "0xray" "mcp" "${s.mcpCmd}" ${envFlags}`,
        { stdio: "pipe" }
      );
      log("grok-bridge", `registered ${s.name} (npx)`, "info");
    } catch {
      // already registered or grok config conflict — non-blocking
    }
  }

  for (const pluginDir of [
    path.join(targetDir, ".grok", "plugins", "0xray"),
    path.join(os.homedir(), ".grok", "plugins", "0xray"),
  ]) {
    if (!fs.existsSync(pluginDir)) continue;
    try {
      execSync(`grok plugins trust "${pluginDir}"`, { stdio: "ignore" });
      log("grok-bridge", "plugin trusted", "info", { path: pluginDir });
      break;
    } catch {
      // best-effort
    }
  }
}

function installGrokBridge(targetDir, packageRoot, log) {
  const sourceDir = findGrokPluginSource(packageRoot);
  if (!sourceDir) {
    log("grok-bridge", "skipped", "warn", { reason: "grok plugin source missing" });
    return;
  }

  const home = os.homedir();
  const targets = [
    path.join(targetDir, ".grok", "plugins", "0xray"),
    path.join(home, ".grok", "plugins", "0xray"),
  ];

  for (const dest of targets) {
    if (copyPluginDir(sourceDir, dest)) {
      const rel = dest.startsWith(home) ? dest.replace(home, "~") : path.relative(targetDir, dest);
      log("grok-bridge", "plugin copied", "info", { path: rel || dest });
      writePluginMcpJson(dest, targetDir, log, "grok-bridge");
      patchGrokHooks(dest, packageRoot, targetDir, log, "grok-bridge");
      const copied = syncBuiltinSkills(path.join(dest, "skills"), packageRoot);
      if (copied > 0) log("grok-bridge", `plugin skills synced (${copied})`, "info", { path: rel });
    }
  }

  // Grok Build / Cursor also reads ~/.grok/skills/ for agent_skills
  const grokGlobalSkills = path.join(home, ".grok", "skills");
  const globalCopied = syncBuiltinSkills(grokGlobalSkills, packageRoot);
  if (globalCopied > 0) {
    log("grok-bridge", `global skills synced (${globalCopied})`, "info", { path: "~/.grok/skills/" });
  }

  registerGrokMcpServers(targetDir, log);
}

function installHermesBridge(targetDir, packageRoot, log) {
  const sources = [
    path.join(packageRoot, "dist", "integrations", "hermes-agent"),
    path.join(packageRoot, "src", "integrations", "hermes-agent"),
  ];
  const sourceDir = sources.find((p) => fs.existsSync(p));
  if (!sourceDir) {
    log("hermes-bridge", "skipped", "warn", { reason: "hermes plugin source missing" });
    return;
  }

  const targetPluginDir = path.join(os.homedir(), ".hermes", "plugins", "xray-hermes");
  fs.mkdirSync(targetPluginDir, { recursive: true });
  for (const entry of fs.readdirSync(sourceDir)) {
    const src = path.join(sourceDir, entry);
    const dst = path.join(targetPluginDir, entry);
    if (fs.statSync(src).isDirectory()) {
      fs.cpSync(src, dst, { recursive: true, force: true });
    } else {
      fs.copyFileSync(src, dst);
    }
  }
  log("hermes-bridge", "plugin copied", "info", { path: "~/.hermes/plugins/xray-hermes" });

  writePluginMcpJson(targetPluginDir, targetDir, log, "hermes-bridge");

  const copied = syncBuiltinSkills(path.join(targetPluginDir, "skills"), packageRoot);
  if (copied > 0) log("hermes-bridge", `skills synced (${copied})`, "info");

  // Marker so bridge.mjs resolves the consumer project on hook invocation
  const rootMarker = path.join(targetPluginDir, "xray-consumer-root.txt");
  fs.writeFileSync(rootMarker, targetDir + "\n");
  log("hermes-bridge", "consumer root marker written", "info");

  try {
    const result = wireHermesBridge(targetDir);
    log("hermes-bridge", `mcp_servers wired (${result.count} servers)`, "info");
  } catch (e) {
    log("hermes-bridge", "mcp_servers wire failed", "warn", { error: e.message });
  }
}

function installOpenclawBridge(targetDir, packageRoot, log) {
  const configPath = path.join(targetDir, ".xray", "config", "openclaw.json");
  if (!fs.existsSync(configPath)) {
    const configDir = path.dirname(configPath);
    fs.mkdirSync(configDir, { recursive: true });
    const sampleConfig = {
      gatewayUrl: "ws://127.0.0.1:18789",
      authToken: process.env.OPENCLAW_AUTH_TOKEN || "",
      deviceId: process.env.OPENCLAW_DEVICE_ID || "your-device-id",
      autoReconnect: true,
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      apiServer: {
        enabled: true,
        port: 18431,
        host: "127.0.0.1",
        ...(process.env.OPENCLAW_API_KEY ? { apiKey: process.env.OPENCLAW_API_KEY } : {}),
      },
      hooks: {
        enabled: true,
        toolBefore: true,
        toolAfter: true,
        includeArgs: true,
        includeResult: true,
      },
      enabled: true,
      debug: false,
      logLevel: "info",
    };
    fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2) + "\n");
    log("openclaw-bridge", "config created", "info", { path: ".xray/config/openclaw.json" });
  }

  const copied = syncBuiltinSkills(path.join(os.homedir(), ".openclaw", "skills"), packageRoot);
  if (copied > 0) log("openclaw-bridge", `skills synced (${copied})`, "info", { path: "~/.openclaw/skills/" });

  try {
    const result = wireOpenClawBridge(targetDir);
    log("openclaw-bridge", `openclaw.json mcp wired (${result.count} servers)`, "info", {
      method: result.method,
    });
  } catch (e) {
    log("openclaw-bridge", "openclaw.json mcp wire failed", "warn", { error: e.message });
  }
}

const XRAY_CONFIG_FILES = ["codex.json", "features.json", "features.schema.json", "config.json"];

function resolveXrayConfigSource(packageRoot, file) {
  // Shipped SSOT: xray/ template wins over dev .xray/ runtime copy (P0.2)
  const xrayDir = path.join(packageRoot, "xray", file);
  if (fs.existsSync(xrayDir)) return xrayDir;
  const dotXray = path.join(packageRoot, ".xray", file);
  if (fs.existsSync(dotXray)) return dotXray;
  return null;
}

function deployXrayConfig(targetDir, packageRoot, log) {
  const xrayTargetDir = path.join(targetDir, ".xray");
  const hasAnySource = XRAY_CONFIG_FILES.some((file) => resolveXrayConfigSource(packageRoot, file));
  if (!hasAnySource) return;

  if (!fs.existsSync(xrayTargetDir)) fs.mkdirSync(xrayTargetDir, { recursive: true });
  let copied = 0;
  for (const file of XRAY_CONFIG_FILES) {
    const src = resolveXrayConfigSource(packageRoot, file);
    const dst = path.join(xrayTargetDir, file);
    if (!src) continue;
    const shouldCopy = !fs.existsSync(dst) || fs.statSync(src).mtime > fs.statSync(dst).mtime;
    if (shouldCopy) {
      fs.copyFileSync(src, dst);
      copied++;
    }
  }
  if (copied > 0) log("xray-config", `${copied} files deployed`, "info", { path: ".xray/" });
  return copied;
}

function installGitHooks(packageRoot, log) {
  const installHooks = path.join(packageRoot, "scripts", "hooks", "install-hooks.cjs");
  if (!fs.existsSync(installHooks)) return;
  try {
    execSync(`node "${installHooks}"`, { stdio: "pipe" });
    log("hooks", "pre-commit hook installed", "info");
  } catch {
    // non-git or hook failure — not blocking
  }
}

/**
 * Install all 4 platform bridges for a consumer project.
 * @param {{ targetDir: string, packageRoot: string, log?: Function }} opts
 */
function installAllBridges(opts) {
  const packageRoot = path.resolve(opts.packageRoot);
  const targetDir = path.resolve(opts.targetDir);
  const log =
    opts.log ||
    ((_component, _action, _status, _details) => {
      /* noop */
    });

  if (!isConsumerInstall(packageRoot, targetDir)) return;

  log("install-bridges", "starting 4-platform install", "info");

  deployXrayConfig(targetDir, packageRoot, log);
  deployProjectMcpJson(targetDir, log);
  mergeOpencodeJson(targetDir, packageRoot, log);
  installOpencodeBridge(targetDir, packageRoot, log);
  installGrokBridge(targetDir, packageRoot, log);
  installHermesBridge(targetDir, packageRoot, log);
  installOpenclawBridge(targetDir, packageRoot, log);
  installGitHooks(packageRoot, log);

  log("install-bridges", "4-platform install complete", "success");
}

module.exports = {
  installAllBridges,
  resolveConsumerTargetDir,
  syncBuiltinSkills,
  isConsumerInstall,
  deployXrayConfig,
  resolveXrayConfigSource,
  XRAY_CONFIG_FILES,
};