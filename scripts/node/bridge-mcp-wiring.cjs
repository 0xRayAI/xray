#!/usr/bin/env node
/**
 * Shared MCP registry wiring for Hermes + OpenCode + OpenClaw bridges.
 * Used by install-bridges.cjs and platform install commands.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

/** Canonical 7-server MCP surface */
const XRAY_MCP_SERVERS = [
  { name: "xray-governance", mcpCmd: "governance", env: { XRAY_FORCE_MCP_GOVERNANCE: "true" } },
  { name: "xray-skills", mcpCmd: "skills", env: {} },
  { name: "xray-orchestrator", mcpCmd: "orchestrator", env: {} },
  { name: "xray-enforcer", mcpCmd: "enforcer", env: {} },
  { name: "xray-researcher", mcpCmd: "researcher", env: {} },
  { name: "xray-code-review", mcpCmd: "code-review", env: {} },
  { name: "xray-architect-tools", mcpCmd: "architect-tools", env: {} },
];

const HERMES_CONFIG_PATH = path.join(os.homedir(), ".hermes", "config.yaml");
const HERMES_PLUGIN_DIR = path.join(os.homedir(), ".hermes", "plugins", "xray-hermes");
const OPENCLAW_CONFIG_PATH = path.join(os.homedir(), ".openclaw", "openclaw.json");
const OPENCLAW_STATE_DIR = path.join(os.homedir(), ".openclaw");

function detectConsumerExtraMcpServers(targetDir) {
  const extras = { hermes: {}, opencode: {}, openclaw: {} };
  try {
    const pkgPath = path.join(targetDir, "package.json");
    if (!fs.existsSync(pkgPath)) return extras;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    const localRepertoireMcp = path.join(targetDir, "dist", "mcp", "server.js");
    if (pkg.name === "@0xray/repertoire" && fs.existsSync(localRepertoireMcp)) {
      extras.hermes.repertoire = {
        command: "node",
        args: [localRepertoireMcp],
        env: { XRAY_ROOT: targetDir },
      };
      extras.opencode.repertoire = {
        type: "local",
        command: ["node", "dist/mcp/server.js"],
        enabled: true,
        cwd: ".",
      };
      extras.openclaw.repertoire = {
        command: "node",
        args: [localRepertoireMcp],
        env: { XRAY_ROOT: targetDir },
      };
    }
  } catch {
    // best-effort
  }
  return extras;
}

function buildStdioMcpServer(mcpCmd, env, targetDir) {
  return {
    command: "npx",
    args: ["-y", "0xray", "mcp", mcpCmd],
    env: { ...env, XRAY_ROOT: targetDir },
  };
}

function buildHermesMcpServers(targetDir) {
  const servers = {};
  for (const s of XRAY_MCP_SERVERS) {
    servers[s.name] = buildStdioMcpServer(s.mcpCmd, s.env, targetDir);
  }
  const extras = detectConsumerExtraMcpServers(targetDir);
  return { ...servers, ...extras.hermes };
}

function buildOpenClawMcpServers(targetDir) {
  const servers = {};
  for (const s of XRAY_MCP_SERVERS) {
    servers[s.name] = buildStdioMcpServer(s.mcpCmd, s.env, targetDir);
  }
  const extras = detectConsumerExtraMcpServers(targetDir);
  return { ...servers, ...extras.openclaw };
}

function buildOpencodeMcpEntries(targetDir) {
  const entries = {};
  for (const s of XRAY_MCP_SERVERS) {
    const environment = { ...s.env };
    entries[s.name] = {
      type: "local",
      command: ["npx", "-y", "0xray", "mcp", s.mcpCmd],
      enabled: true,
      ...(Object.keys(environment).length > 0 ? { environment } : {}),
    };
  }
  const extras = detectConsumerExtraMcpServers(targetDir);
  return { ...entries, ...extras.opencode };
}

function buildPluginMcpJson(targetDir) {
  const mcpServers = {};
  for (const s of XRAY_MCP_SERVERS) {
    mcpServers[s.name] = {
      command: "npx",
      args: ["-y", "0xray", "mcp", s.mcpCmd],
      env: { ...s.env, XRAY_ROOT: targetDir },
    };
  }
  return { mcpServers };
}

/** Portable .mcp.json for Grok/Cursor — no absolute XRAY_ROOT */
function buildPortableProjectMcpJson() {
  const mcpServers = {};
  for (const s of XRAY_MCP_SERVERS) {
    mcpServers[s.name] = {
      command: "npx",
      args: ["-y", "0xray", "mcp", s.mcpCmd],
      ...(Object.keys(s.env).length > 0 ? { env: { ...s.env } } : {}),
    };
  }
  return { mcpServers };
}

function writeHermesPluginArtifacts(targetDir) {
  if (!fs.existsSync(HERMES_PLUGIN_DIR)) return false;
  fs.writeFileSync(path.join(HERMES_PLUGIN_DIR, "xray-consumer-root.txt"), `${targetDir}\n`);
  fs.writeFileSync(
    path.join(HERMES_PLUGIN_DIR, ".mcp.json"),
    `${JSON.stringify(buildPluginMcpJson(targetDir), null, 2)}\n`
  );
  return true;
}

function syncHermesMcpRegistry(targetDir) {
  const servers = buildHermesMcpServers(targetDir);
  const syncScript = path.join(__dirname, "sync-hermes-mcp-servers.py");
  if (!fs.existsSync(syncScript)) {
    throw new Error("sync-hermes-mcp-servers.py missing");
  }
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "xray-hermes-mcp-"));
  const serversPath = path.join(tmpDir, "servers.json");
  try {
    fs.writeFileSync(serversPath, JSON.stringify(servers));
    if (!fs.existsSync(path.dirname(HERMES_CONFIG_PATH))) {
      fs.mkdirSync(path.dirname(HERMES_CONFIG_PATH), { recursive: true });
    }
    if (!fs.existsSync(HERMES_CONFIG_PATH)) {
      fs.writeFileSync(HERMES_CONFIG_PATH, "mcp_servers: {}\n");
    }
    const out = execSync(`python3 "${syncScript}" "${HERMES_CONFIG_PATH}" "${serversPath}"`, {
      encoding: "utf8",
    });
    return JSON.parse(out.trim());
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function mergeOpencodeMcpRegistry(targetDir) {
  const opencodePath = path.join(targetDir, "opencode.json");
  const entries = buildOpencodeMcpEntries(targetDir);
  let config = { $schema: "https://opencode.ai/config.json", mcp: {} };
  if (fs.existsSync(opencodePath)) {
    try {
      config = JSON.parse(fs.readFileSync(opencodePath, "utf8"));
    } catch {
      config = { $schema: "https://opencode.ai/config.json", mcp: {} };
    }
  }
  config.mcp = { ...(config.mcp || {}), ...entries };
  fs.writeFileSync(opencodePath, `${JSON.stringify(config, null, 2)}\n`);
  return Object.keys(entries).length;
}

function deployPortableProjectMcpJson(targetDir) {
  const destPath = path.join(targetDir, ".mcp.json");
  const portable = buildPortableProjectMcpJson();
  let existing = { mcpServers: {} };
  if (fs.existsSync(destPath)) {
    try {
      existing = JSON.parse(fs.readFileSync(destPath, "utf8"));
    } catch {
      existing = { mcpServers: {} };
    }
  }
  const merged = {
    ...existing,
    mcpServers: {
      ...(existing.mcpServers || {}),
      ...portable.mcpServers,
    },
  };
  fs.writeFileSync(destPath, `${JSON.stringify(merged, null, 2)}\n`);
}

function enableHermesPluginBestEffort() {
  try {
    execSync("hermes plugins enable 0xray-hermes", { stdio: "pipe", encoding: "utf8" });
    return true;
  } catch {
    return false;
  }
}

function wireHermesBridge(targetDir) {
  writeHermesPluginArtifacts(targetDir);
  const result = syncHermesMcpRegistry(targetDir);
  enableHermesPluginBestEffort();
  return result;
}

function wireOpencodeBridge(targetDir) {
  return mergeOpencodeMcpRegistry(targetDir);
}

function resolveOpenClawConfigPath() {
  if (process.env.OPENCLAW_CONFIG_PATH && fs.existsSync(process.env.OPENCLAW_CONFIG_PATH)) {
    return process.env.OPENCLAW_CONFIG_PATH;
  }
  return OPENCLAW_CONFIG_PATH;
}

function syncOpenClawMcpRegistryFile(targetDir, configPath) {
  const servers = buildOpenClawMcpServers(targetDir);
  if (!fs.existsSync(path.dirname(configPath))) {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  }
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch {
      config = {};
    }
  }
  config.mcp = config.mcp || {};
  config.mcp.servers = { ...(config.mcp.servers || {}), ...servers };
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return { count: Object.keys(config.mcp.servers).length, path: configPath, method: "file" };
}

function syncOpenClawMcpRegistryCli(targetDir) {
  const servers = buildOpenClawMcpServers(targetDir);
  let wired = 0;
  for (const [name, serverConfig] of Object.entries(servers)) {
    const payload = JSON.stringify(serverConfig).replace(/'/g, "'\\''");
    execSync(`openclaw mcp set ${name} '${payload}'`, { stdio: "pipe", encoding: "utf8" });
    wired++;
  }
  return { count: wired, path: resolveOpenClawConfigPath(), method: "cli" };
}

function syncOpenClawMcpRegistry(targetDir) {
  try {
    execSync("which openclaw", { stdio: "ignore" });
    return syncOpenClawMcpRegistryCli(targetDir);
  } catch {
    return syncOpenClawMcpRegistryFile(targetDir, resolveOpenClawConfigPath());
  }
}

function writeOpenClawConsumerArtifacts(targetDir) {
  if (!fs.existsSync(OPENCLAW_STATE_DIR)) {
    fs.mkdirSync(OPENCLAW_STATE_DIR, { recursive: true });
  }
  fs.writeFileSync(path.join(OPENCLAW_STATE_DIR, "xray-consumer-root.txt"), `${targetDir}\n`);

  const consumerConfigPath = path.join(targetDir, ".xray", "config", "openclaw.json");
  if (fs.existsSync(consumerConfigPath)) {
    try {
      const consumerConfig = JSON.parse(fs.readFileSync(consumerConfigPath, "utf8"));
      consumerConfig.xrayRoot = targetDir;
      fs.writeFileSync(consumerConfigPath, `${JSON.stringify(consumerConfig, null, 2)}\n`);
    } catch {
      // best-effort
    }
  }
  return true;
}

function wireOpenClawBridge(targetDir) {
  writeOpenClawConsumerArtifacts(targetDir);
  return syncOpenClawMcpRegistry(targetDir);
}

module.exports = {
  XRAY_MCP_SERVERS,
  HERMES_CONFIG_PATH,
  HERMES_PLUGIN_DIR,
  OPENCLAW_CONFIG_PATH,
  OPENCLAW_STATE_DIR,
  buildHermesMcpServers,
  buildOpenClawMcpServers,
  buildOpencodeMcpEntries,
  buildStdioMcpServer,
  buildPluginMcpJson,
  buildPortableProjectMcpJson,
  writeHermesPluginArtifacts,
  syncHermesMcpRegistry,
  mergeOpencodeMcpRegistry,
  deployPortableProjectMcpJson,
  enableHermesPluginBestEffort,
  wireHermesBridge,
  wireOpencodeBridge,
  wireOpenClawBridge,
  syncOpenClawMcpRegistry,
  writeOpenClawConsumerArtifacts,
  resolveOpenClawConfigPath,
  detectConsumerExtraMcpServers,
};