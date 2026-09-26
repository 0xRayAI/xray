#!/usr/bin/env node
/**
 * Shared MCP registry wiring for Hermes + OpenCode + OpenClaw bridges.
 * Used by install-bridges.cjs and platform install commands.
 */
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync, execSync } = require("child_process");

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

function isRepertoirePackageRoot(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return pkg.name === "@0xray/repertoire" || pkg.name === "repertoire";
  } catch {
    return false;
  }
}

function resolveRepertoireMcp(targetDir) {
  const selfRoot = targetDir;
  const siblingRoot = path.join(targetDir, "..", "repertoire");
  const candidates = [
    path.join(targetDir, "node_modules", "@0xray", "repertoire", "dist", "mcp", "server.js"),
    path.join(targetDir, "vendor", "@0xray", "repertoire", "dist", "mcp", "server.js"),
    path.join(
      targetDir,
      "node_modules",
      "0xray",
      "vendor",
      "@0xray",
      "repertoire",
      "dist",
      "mcp",
      "server.js",
    ),
    isRepertoirePackageRoot(selfRoot) ? path.join(selfRoot, "dist", "mcp", "server.js") : null,
    isRepertoirePackageRoot(siblingRoot) ? path.join(siblingRoot, "dist", "mcp", "server.js") : null,
  ];
  return candidates.find((p) => p && fs.existsSync(p)) || null;
}

function resolveRepertoireProvider(targetDir) {
  const siblingRoot = path.join(targetDir, "..", "repertoire");
  const siblingProvider = path.join(siblingRoot, "dist", "provider", "memory-routing-provider.js");
  const nmProvider = path.join(
    targetDir,
    "node_modules",
    "@0xray",
    "repertoire",
    "dist",
    "provider",
    "memory-routing-provider.js",
  );
  const vendorProvider = path.join(
    targetDir,
    "vendor",
    "@0xray",
    "repertoire",
    "dist",
    "provider",
    "memory-routing-provider.js",
  );
  const packedVendorProvider = path.join(
    targetDir,
    "node_modules",
    "0xray",
    "vendor",
    "@0xray",
    "repertoire",
    "dist",
    "provider",
    "memory-routing-provider.js",
  );
  if (fs.existsSync(nmProvider)) return nmProvider;
  if (fs.existsSync(vendorProvider)) return vendorProvider;
  if (fs.existsSync(packedVendorProvider)) return packedVendorProvider;
  if (isRepertoirePackageRoot(siblingRoot) && fs.existsSync(siblingProvider)) return siblingProvider;
  return null;
}

function isDefaultMemoryRoutingOff(mr) {
  if (!mr || typeof mr !== "object") return true;
  if (mr.enabled === true) return false;
  const provider = mr.provider == null || mr.provider === "" ? "null" : mr.provider;
  return provider === "null";
}

function enableMemoryRoutingIfResolves(features, targetDir) {
  const modulePath = resolveRepertoireProvider(targetDir);
  if (!modulePath) return { features, changed: false };
  const mr = (features && features.memory_routing) || {};
  if (!isDefaultMemoryRoutingOff(mr)) return { features, changed: false };

  const siblingRel = "../repertoire/dist/provider/memory-routing-provider.js";
  const siblingAbs = path.join(targetDir, "..", "repertoire", "dist", "provider", "memory-routing-provider.js");
  const useSibling = path.resolve(modulePath) === path.resolve(siblingAbs);
  const repertoireRoot = path.resolve(modulePath, "..", "..", "..");
  const signalsAbs = path.join(repertoireRoot, "data", "curated_signals.json");
  const config = { ...(mr.config || {}) };
  if (!config.signalsPath && fs.existsSync(signalsAbs)) {
    config.signalsPath = useSibling ? "../repertoire/data/curated_signals.json" : signalsAbs;
  }
  if (!config.statePath) {
    config.statePath = ".xray/state/repertoire/inference-state.json";
  }
  if (!config.feedbackDir) {
    config.feedbackDir = ".xray/state/repertoire/feedback";
  }

  return {
    features: {
      ...features,
      memory_routing: {
        ...mr,
        enabled: true,
        provider: "repertoire",
        module_path: useSibling ? siblingRel : modulePath,
        config,
      },
    },
    changed: true,
  };
}

function detectConsumerExtraMcpServers(targetDir) {
  const extras = { hermes: {}, opencode: {}, openclaw: {} };
  try {
    const repertoireMcp = resolveRepertoireMcp(targetDir);
    if (!repertoireMcp) return extras;
    extras.hermes.repertoire = {
      command: "node",
      args: [repertoireMcp],
      env: { XRAY_ROOT: targetDir },
    };
    extras.opencode.repertoire = {
      type: "local",
      command: ["node", repertoireMcp],
      enabled: true,
    };
    extras.openclaw.repertoire = {
      command: "node",
      args: [repertoireMcp],
      env: { XRAY_ROOT: targetDir },
    };
  } catch {
    // best-effort
  }
  return extras;
}

function readInstalledXrayVersion() {
  const pkgPath = path.join(__dirname, "..", "..", "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  if (typeof pkg.version !== "string" || !pkg.version) {
    throw new Error("0xray package.json version missing; refusing unpinned MCP launch");
  }
  return pkg.version;
}

function localXrayCli(targetDir) {
  if (!targetDir) return null;
  const cli = path.join(targetDir, "node_modules", "0xray", "dist", "cli", "index.js");
  return fs.existsSync(cli) ? cli : null;
}

/** Prefer the installed CLI. Else pin npx to this package version. Never bare `0xray`. */
function pinnedMcpLaunch(targetDir, mcpCmd) {
  const cli = localXrayCli(targetDir);
  if (cli) {
    return {
      command: "node",
      args: [cli, "mcp", mcpCmd],
      commandList: ["node", cli, "mcp", mcpCmd],
    };
  }
  const spec = `0xray@${readInstalledXrayVersion()}`;
  return {
    command: "npx",
    args: ["-y", spec, "mcp", mcpCmd],
    commandList: ["npx", "-y", spec, "mcp", mcpCmd],
  };
}

function launchTokens(server) {
  if (!server || typeof server !== "object") return [];
  const tokens = [];
  if (typeof server.command === "string") tokens.push(server.command);
  else if (Array.isArray(server.command)) tokens.push(...server.command.map(String));
  if (Array.isArray(server.args)) tokens.push(...server.args.map(String));
  return tokens;
}

function hasVersionPin(server) {
  return launchTokens(server).some((token) => /^0xray@.+/.test(token));
}

function isUnpinnedXrayLaunch(server) {
  return launchTokens(server).some((token) => token === "0xray");
}

function jsonDeepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== "object") return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, i) => jsonDeepEqual(item, b[i]));
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => Object.prototype.hasOwnProperty.call(b, key) && jsonDeepEqual(a[key], b[key]));
}

/** Framework fills gaps. User env, enabled/disabled, and version pins win. Unpinned `0xray` is repinned. */
function mergeUserWinsServer(framework, user) {
  if (!user || typeof user !== "object") return framework;
  if (!framework || typeof framework !== "object") return user;
  const next = { ...user };
  if (!hasVersionPin(user) && isUnpinnedXrayLaunch(user)) {
    next.command = framework.command;
    if (Object.prototype.hasOwnProperty.call(framework, "args")) next.args = framework.args;
    else delete next.args;
  }
  for (const envKey of ["env", "environment"]) {
    if (!framework[envKey] && !user[envKey]) continue;
    const mergedEnv = { ...(framework[envKey] || {}), ...(user[envKey] || {}) };
    if (!jsonDeepEqual(mergedEnv, user[envKey] || {})) next[envKey] = mergedEnv;
  }
  if (!Object.prototype.hasOwnProperty.call(user, "enabled") && Object.prototype.hasOwnProperty.call(framework, "enabled")) {
    next.enabled = framework.enabled;
  }
  if (!Object.prototype.hasOwnProperty.call(user, "disabled") && Object.prototype.hasOwnProperty.call(framework, "disabled")) {
    next.disabled = framework.disabled;
  }
  return next;
}

function mergeMcpMap(frameworkServers, userServers) {
  const framework = frameworkServers && typeof frameworkServers === "object" ? frameworkServers : {};
  const user = userServers && typeof userServers === "object" ? userServers : {};
  const merged = {};
  const seen = new Set();
  for (const name of Object.keys(user)) {
    seen.add(name);
    merged[name] = framework[name] ? mergeUserWinsServer(framework[name], user[name]) : user[name];
  }
  for (const name of Object.keys(framework)) {
    if (seen.has(name)) continue;
    merged[name] = framework[name];
  }
  return merged;
}

function mergeNamedRecords(src, dest) {
  const source = src && typeof src === "object" ? src : {};
  const user = dest && typeof dest === "object" ? dest : {};
  const merged = {};
  const seen = new Set();
  for (const name of Object.keys(user)) {
    seen.add(name);
    const fromSrc = source[name];
    const fromUser = user[name];
    if (
      fromSrc &&
      fromUser &&
      typeof fromSrc === "object" &&
      typeof fromUser === "object" &&
      !Array.isArray(fromSrc) &&
      !Array.isArray(fromUser)
    ) {
      merged[name] = { ...fromSrc, ...fromUser };
    } else {
      merged[name] = fromUser;
    }
  }
  for (const name of Object.keys(source)) {
    if (seen.has(name)) continue;
    merged[name] = source[name];
  }
  return merged;
}

function buildStdioMcpServer(mcpCmd, env, targetDir) {
  const launch = pinnedMcpLaunch(targetDir, mcpCmd);
  return {
    command: launch.command,
    args: launch.args,
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
    const launch = pinnedMcpLaunch(targetDir, s.mcpCmd);
    entries[s.name] = {
      type: "local",
      command: launch.commandList,
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
    const launch = pinnedMcpLaunch(targetDir, s.mcpCmd);
    mcpServers[s.name] = {
      command: launch.command,
      args: launch.args,
      env: { ...s.env, XRAY_ROOT: targetDir },
    };
  }
  return { mcpServers };
}

/** Portable .mcp.json for Grok/Cursor — no absolute XRAY_ROOT */
function buildPortableProjectMcpJson(targetDir) {
  const mcpServers = {};
  for (const s of XRAY_MCP_SERVERS) {
    const launch = pinnedMcpLaunch(targetDir, s.mcpCmd);
    mcpServers[s.name] = {
      command: launch.command,
      args: launch.args,
      ...(Object.keys(s.env).length > 0 ? { env: { ...s.env } } : {}),
    };
  }
  return { mcpServers };
}

function copyHermesFindProjectRootHelper(packageRoot, targetPluginDir) {
  const helperSrc = path.join(packageRoot, "scripts", "helpers", "find-project-root.mjs");
  if (!fs.existsSync(helperSrc)) return false;
  const helperDst = path.join(targetPluginDir, "scripts", "helpers", "find-project-root.mjs");
  fs.mkdirSync(path.dirname(helperDst), { recursive: true });
  fs.copyFileSync(helperSrc, helperDst);
  return true;
}

function isEphemeralInstallRoot(targetDir) {
  const normalized = String(targetDir || "").replace(/\\/g, "/");
  return /\/T\/|\/tmp\/|\/var\/folders\/|\/Temp\//i.test(normalized);
}

const millSuit = require("../foundry/mint-suit.cjs");

/** Last-mile isolated HOME vs passwd home. `os.homedir()` follows $HOME. */
function isIsolatedHome(env = process.env, machine = millSuit.machineHome()) {
  return millSuit.isIsolatedHome(env, machine);
}

function copyHermesHookRuntimes(packageRoot) {
  if (millSuit.isIsolatedHome()) return false;
  const hooksSrc = [
    path.join(packageRoot, "dist", "integrations", "hooks"),
    path.join(packageRoot, "src", "integrations", "hooks"),
  ].find((p) => fs.existsSync(p));
  if (!hooksSrc) return false;
  const hooksDst = path.join(millSuit.machineHome(), ".hermes", "plugins", "hooks");
  fs.mkdirSync(hooksDst, { recursive: true });
  fs.cpSync(hooksSrc, hooksDst, { recursive: true, force: true });
  return true;
}

function writeHermesPluginArtifacts(targetDir) {
  if (!fs.existsSync(HERMES_PLUGIN_DIR)) return false;
  fs.writeFileSync(
    path.join(HERMES_PLUGIN_DIR, ".mcp.json"),
    `${JSON.stringify(buildPluginMcpJson(targetDir), null, 2)}\n`
  );
  if (isEphemeralInstallRoot(targetDir)) return true;
  fs.writeFileSync(path.join(HERMES_PLUGIN_DIR, "xray-consumer-root.txt"), `${targetDir}\n`);
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
  const existed = fs.existsSync(opencodePath);
  const nextMcp = mergeMcpMap(entries, config.mcp || {});
  const next = { ...config, mcp: nextMcp };
  if (existed && jsonDeepEqual(next, config)) return Object.keys(entries).length;
  fs.writeFileSync(opencodePath, `${JSON.stringify(next, null, 2)}\n`);
  return Object.keys(entries).length;
}

function deployPortableProjectMcpJson(targetDir) {
  const destPath = path.join(targetDir, ".mcp.json");
  const portable = buildPortableProjectMcpJson(targetDir);
  let existing = { mcpServers: {} };
  let hadFile = false;
  if (fs.existsSync(destPath)) {
    hadFile = true;
    try {
      existing = JSON.parse(fs.readFileSync(destPath, "utf8"));
    } catch {
      existing = { mcpServers: {} };
    }
  }
  const extras = detectConsumerExtraMcpServers(targetDir);
  const framework = { ...portable.mcpServers, ...(extras.openclaw || {}) };
  const merged = {
    ...existing,
    mcpServers: mergeMcpMap(framework, existing.mcpServers || {}),
  };
  if (hadFile && jsonDeepEqual(merged, existing)) return;
  fs.writeFileSync(destPath, `${JSON.stringify(merged, null, 2)}\n`);
}

function enableHermesPluginBestEffort() {
  try {
    execSync("hermes plugins enable xray-hermes", { stdio: "pipe", encoding: "utf8" });
    try {
      execSync("hermes plugins disable 0xray-hermes", { stdio: "pipe", encoding: "utf8" });
    } catch {
      /* stale id may be absent */
    }
    return true;
  } catch {
    try {
      execSync("hermes plugins enable 0xray-hermes", { stdio: "pipe", encoding: "utf8" });
      return true;
    } catch {
      return false;
    }
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
  if (!isEphemeralInstallRoot(targetDir)) {
    if (!fs.existsSync(OPENCLAW_STATE_DIR)) {
      fs.mkdirSync(OPENCLAW_STATE_DIR, { recursive: true });
    }
    fs.writeFileSync(path.join(OPENCLAW_STATE_DIR, "xray-consumer-root.txt"), `${targetDir}\n`);
  }

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

function resolveOpenClawPreToolHookSource(packageRoot) {
  return [
    path.join(packageRoot, "dist", "integrations", "openclaw", "hooks", "pre-tool-gate-runtime.mjs"),
    path.join(packageRoot, "src", "integrations", "openclaw", "hooks", "pre-tool-gate-runtime.mjs"),
  ].find((p) => fs.existsSync(p)) || null;
}

function resolveOpenClawPluginDir(packageRoot) {
  return [
    path.join(packageRoot, "dist", "integrations", "openclaw", "plugin", "xray-pre-tool"),
    path.join(packageRoot, "src", "integrations", "openclaw", "plugin", "xray-pre-tool"),
  ].find((p) => fs.existsSync(path.join(p, "index.js"))) || null;
}

function installOpenClawHostWear(packageRoot) {
  if (millSuit.isIsolatedHome()) return null;
  const source = resolveOpenClawPreToolHookSource(packageRoot);
  if (!source) return null;

  const hookDir = path.join(millSuit.machineHome(), ".openclaw", "hooks");
  fs.mkdirSync(hookDir, { recursive: true });
  const dest = path.join(hookDir, "xray-pre-tool.mjs");
  fs.copyFileSync(source, dest);
  fs.writeFileSync(
    path.join(hookDir, "xray-pre-tool.json"),
    `${JSON.stringify(
      {
        name: "xray-pre-tool",
        command: "node",
        args: [dest],
        stdin: "json",
        blockExitCode: 2,
        env: { XRAY_AI_PATH: packageRoot },
      },
      null,
      2,
    )}\n`,
  );

  const pluginSrc = resolveOpenClawPluginDir(packageRoot);
  if (pluginSrc) {
    try {
      execFileSync("openclaw", ["plugins", "install", "-l", pluginSrc], {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 60000,
      });
    } catch {
      /* link is best-effort — stdin runtime is still installed */
    }
    try {
      execFileSync("openclaw", ["config", "set", "plugins.entries.xray-pre-tool.enabled", "true"], {
        stdio: "pipe",
        encoding: "utf8",
        timeout: 20000,
      });
    } catch {
      /* enable is best-effort */
    }
  }
  return dest;
}

function resolveOpencodeBin() {
  try {
    const found = execSync("command -v opencode", { encoding: "utf8" }).trim();
    return found || null;
  } catch {
    return null;
  }
}

function maybeWriteOpenClawCliBackend() {
  const bin = resolveOpencodeBin();
  if (!bin) return false;
  const configPath = resolveOpenClawConfigPath();
  if (!fs.existsSync(configPath)) return false;
  let config;
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return false;
  }
  if (!config.agents || typeof config.agents !== "object") config.agents = {};
  if (!config.agents.defaults || typeof config.agents.defaults !== "object") {
    config.agents.defaults = {};
  }
  const defaults = config.agents.defaults;
  if (!defaults.cliBackends || typeof defaults.cliBackends !== "object") {
    defaults.cliBackends = {};
  }
  defaults.cliBackends["opencode-cli"] = {
    command: bin,
    args: ["run", "--pure"],
    output: "text",
    input: "arg",
    modelArg: "--model",
    modelAliases: { "big-pickle": "opencode/big-pickle" },
    sessionMode: "none",
  };
  if (!defaults.models || typeof defaults.models !== "object") defaults.models = {};
  defaults.models["opencode-cli/big-pickle"] = {};
  const model = defaults.model && typeof defaults.model === "object" ? defaults.model : {};
  const primary = model.primary;
  if (!primary || primary === "opencode/big-pickle") {
    const fallbacks = Array.isArray(model.fallbacks) ? model.fallbacks.slice() : [];
    if (primary === "opencode/big-pickle" && !fallbacks.includes("opencode/big-pickle")) {
      fallbacks.unshift("opencode/big-pickle");
    }
    defaults.model = {
      ...model,
      primary: "opencode-cli/big-pickle",
      fallbacks,
    };
  }
  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
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
  pinnedMcpLaunch,
  mergeMcpMap,
  mergeNamedRecords,
  mergeUserWinsServer,
  jsonDeepEqual,
  copyHermesFindProjectRootHelper,
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
  isRepertoirePackageRoot,
  resolveRepertoireMcp,
  resolveRepertoireProvider,
  isDefaultMemoryRoutingOff,
  enableMemoryRoutingIfResolves,
  isEphemeralInstallRoot,
  isIsolatedHome,
  copyHermesHookRuntimes,
  resolveOpenClawPreToolHookSource,
  resolveOpenClawPluginDir,
  installOpenClawHostWear,
  maybeWriteOpenClawCliBackend,
};