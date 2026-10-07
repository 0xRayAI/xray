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

function resolveGogglesMcp(targetDir) {
  const candidates = [
    path.join(targetDir, "node_modules", "0xray", "scripts", "mjs", "run-goggles-mcp.mjs"),
    path.join(targetDir, "scripts", "mjs", "run-goggles-mcp.mjs"),
  ];
  return candidates.find((file) => fs.existsSync(file)) || null;
}

function gogglesScopedLaunch(targetDir, launcher) {
  return wrapScopedLaunch(
    { command: "node", args: [launcher] },
    mergeScopedEnv([
      baseScopedEnv(targetDir),
      { GOGGLES_ROOT: targetDir, GOGGLES_PLANES_PATH: "" },
    ]),
  );
}

function detectConsumerExtraMcpServers(targetDir) {
  const extras = { hermes: {}, opencode: {}, openclaw: {} };
  try {
    const repertoireMcp = resolveRepertoireMcp(targetDir);
    if (repertoireMcp) {
      const launch = wrapScopedLaunch(
        { command: "node", args: [repertoireMcp] },
        baseScopedEnv(targetDir),
      );
      extras.hermes.repertoire = {
        command: launch.command,
        args: launch.args,
        env: launch.env,
      };
      extras.opencode.repertoire = {
        type: "local",
        command: launch.commandList,
        enabled: true,
        environment: launch.env,
      };
      extras.openclaw.repertoire = {
        command: launch.command,
        args: launch.args,
        env: launch.env,
      };
    }
    const gogglesMcp = resolveGogglesMcp(targetDir);
    if (gogglesMcp) {
      const launch = gogglesScopedLaunch(targetDir, gogglesMcp);
      extras.hermes.goggles = {
        command: launch.command,
        args: launch.args,
        env: launch.env,
      };
      extras.opencode.goggles = {
        type: "local",
        command: launch.commandList,
        enabled: true,
        environment: launch.env,
      };
      extras.openclaw.goggles = {
        command: launch.command,
        args: launch.args,
        env: launch.env,
      };
    }
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

/**
 * npm installs the package named `0xray` at `node_modules/0xray`.
 * `node_modules/xray` is the pre-rename folder. Use it only when that tree
 * is the one on disk. Never prefer the old name over the real install.
 */
const INSTALLED_PACKAGE_DIRS = ["0xray", "xray"];

function normalizeLaunchToken(token) {
  return String(token).replace(/\\/g, "/");
}

function localXrayCli(targetDir) {
  if (!targetDir) return null;
  for (const dirName of INSTALLED_PACKAGE_DIRS) {
    const cli = path.join(targetDir, "node_modules", dirName, "dist", "cli", "index.js");
    if (fs.existsSync(cli)) return cli;
  }
  return null;
}

function isInstalledPackageCli(token) {
  const normalized = normalizeLaunchToken(token);
  return INSTALLED_PACKAGE_DIRS.some((dirName) =>
    normalized.includes(`node_modules/${dirName}/dist/cli/index.js`),
  );
}

/** Project-root `dist/cli/index.js` is the factory checkout. It is gitignored and goes stale. */
function isCheckoutDistCliLaunch(server) {
  return launchTokens(server).some((token) => {
    const normalized = normalizeLaunchToken(token);
    const isDistCli =
      normalized === "dist/cli/index.js" ||
      normalized === "./dist/cli/index.js" ||
      normalized.endsWith("/dist/cli/index.js");
    return isDistCli && !isInstalledPackageCli(normalized);
  });
}

function isLegacyXrayCliLaunch(server) {
  return launchTokens(server).some((token) => {
    const normalized = normalizeLaunchToken(token);
    return normalized.includes("node_modules/xray/dist/cli/index.js");
  });
}

function mcpSubcommand(inner) {
  if (!inner || !Array.isArray(inner.args)) return null;
  const idx = inner.args.indexOf("mcp");
  if (idx >= 0 && inner.args[idx + 1]) return inner.args[idx + 1];
  return null;
}

/**
 * A checkout `dist/cli` launch is replaced with the installed package.
 * A legacy `node_modules/xray` launch is replaced only when `node_modules/0xray` exists.
 */
function shouldRepinToInstalledCli(inner, targetDir) {
  if (!inner || hasVersionPin(inner)) return false;
  if (isCheckoutDistCliLaunch(inner)) return true;
  if (!isLegacyXrayCliLaunch(inner)) return false;
  const cli = localXrayCli(targetDir);
  return Boolean(cli && normalizeLaunchToken(cli).includes("/node_modules/0xray/"));
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

/**
 * Stdio MCP hosts merge an `env` object onto the parent process. They cannot
 * drop inherited secrets. argv is world-readable, so values never go on the
 * command line. Every launch is:
 *   node <mcp-launch.cjs> --keep PATH,HOME,XRAY_ROOT[,flag][,user names] -- <pinned command>
 * `scripts/node/mcp-launch.cjs` copies those names from its own environ (the
 * live host, after the host merged this entry's `env` block) and spawns the
 * server. PATH and HOME are names only; their values are whatever the host
 * has at launch. XRAY_ROOT and non-secret server flags stay in the `env`
 * block. User keys stay in that block too, and their names are appended to
 * --keep. NODE_OPTIONS is omitted: none of the seven stdio servers read it.
 */
const LIVE_ENV_NAMES = ["PATH", "HOME"];

let launcherPackageRoot = "";

/** Wear sets this so a /tmp checkout is not the path written into a real project. */
function pinLauncherPackageRoot(packageRoot) {
  launcherPackageRoot = packageRoot ? path.resolve(packageRoot) : "";
}

function mcpLauncherPath() {
  if (launcherPackageRoot) {
    const candidate = path.join(launcherPackageRoot, "scripts", "node", "mcp-launch.cjs");
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(__dirname, "mcp-launch.cjs");
}

function baseScopedEnv(targetDir) {
  const env = {};
  if (targetDir) env.XRAY_ROOT = targetDir;
  return env;
}

function orderedEnv(envMap) {
  const preferred = ["PATH", "HOME", "XRAY_ROOT"];
  const ordered = {};
  for (const key of preferred) {
    if (Object.prototype.hasOwnProperty.call(envMap, key)) ordered[key] = String(envMap[key]);
  }
  for (const key of Object.keys(envMap)) {
    if (!Object.prototype.hasOwnProperty.call(ordered, key)) ordered[key] = String(envMap[key]);
  }
  return ordered;
}

function mergeScopedEnv(layers) {
  const merged = {};
  for (const layer of layers) {
    if (!layer || typeof layer !== "object" || Array.isArray(layer)) continue;
    for (const key of Object.keys(layer)) {
      if (layer[key] == null) continue;
      merged[key] = String(layer[key]);
    }
  }
  return orderedEnv(merged);
}

function configEnvFromMap(envMap) {
  const ordered = orderedEnv(envMap || {});
  const config = {};
  for (const key of Object.keys(ordered)) {
    if (LIVE_ENV_NAMES.includes(key)) continue;
    config[key] = ordered[key];
  }
  return config;
}

function keepList(config) {
  return [...LIVE_ENV_NAMES, ...Object.keys(config)];
}

function wrapScopedLaunch(inner, envMap) {
  const env = configEnvFromMap(envMap);
  const tail = [mcpLauncherPath(), "--keep", keepList(env).join(","), "--", inner.command, ...inner.args];
  return {
    command: "node",
    args: tail,
    commandList: ["node", ...tail],
    env,
  };
}

function scopedMcpLaunch(targetDir, mcpCmd, serverEnv) {
  return wrapScopedLaunch(pinnedMcpLaunch(targetDir, mcpCmd), mergeScopedEnv([baseScopedEnv(targetDir), serverEnv]));
}

function commandTokens(server) {
  if (!server || typeof server !== "object") return [];
  if (Array.isArray(server.command)) return server.command.map(String);
  const tokens = [];
  if (typeof server.command === "string") tokens.push(server.command);
  if (Array.isArray(server.args)) tokens.push(...server.args.map(String));
  return tokens;
}

function isMcpLauncherToken(token) {
  return token === "mcp-launch.cjs" || token.endsWith(`${path.sep}mcp-launch.cjs`) || token.endsWith("/mcp-launch.cjs");
}

function peelScopedLaunch(tokens) {
  if (tokens[0] === "env") {
    let i = 1;
    if (tokens[i] === "-i" || tokens[i] === "--ignore-environment") i += 1;
    else return tokens.slice();
    while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i += 1;
    return tokens.slice(i);
  }
  if (tokens[0] === "node" && isMcpLauncherToken(tokens[1] || "")) {
    const dash = tokens.indexOf("--");
    if (dash >= 0) return tokens.slice(dash + 1);
  }
  return tokens.slice();
}

function launchTokens(server) {
  return peelScopedLaunch(commandTokens(server));
}

function innerFromTokens(tokens) {
  if (!tokens.length) return null;
  return { command: tokens[0], args: tokens.slice(1) };
}

function usesCommandArray(server) {
  return Array.isArray(server && server.command);
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

function mcpCmdFromInner(inner) {
  const idx = inner.args.indexOf("mcp");
  if (idx >= 0 && inner.args[idx + 1]) return inner.args[idx + 1];
  return inner.args.length > 0 ? inner.args[inner.args.length - 1] : null;
}

/** Framework fills gaps. User env, enabled/disabled, and version pins win. Unpinned `0xray` and a checkout `dist/cli` launch are repinned to the installed package. Launch is `node mcp-launch.cjs --keep names -- cmd`. */
function mergeUserWinsServer(framework, user, targetDir) {
  if (!user || typeof user !== "object") return framework;
  if (!framework || typeof framework !== "object") return user;
  const next = { ...user };
  const userInner = innerFromTokens(launchTokens(user));
  const frameworkInner = innerFromTokens(launchTokens(framework));
  let inner = userInner || frameworkInner;
  if (userInner && !hasVersionPin(user) && isUnpinnedXrayLaunch(user) && frameworkInner) {
    inner = frameworkInner;
  }
  if (inner && isUnpinnedXrayLaunch({ command: inner.command, args: inner.args })) {
    const mcpCmd = mcpCmdFromInner(inner);
    if (mcpCmd) inner = pinnedMcpLaunch(targetDir, mcpCmd);
  }
  if (inner && shouldRepinToInstalledCli(inner, targetDir)) {
    const mcpCmd = mcpSubcommand(inner);
    if (mcpCmd) inner = pinnedMcpLaunch(targetDir, mcpCmd);
  }
  if (!inner) return framework;
  const mergedEnv = mergeScopedEnv([
    baseScopedEnv(targetDir),
    framework.env,
    framework.environment,
    user.env,
    user.environment,
  ]);
  const wrapped = wrapScopedLaunch(inner, mergedEnv);
  if (usesCommandArray(user) || usesCommandArray(framework)) {
    next.command = wrapped.commandList;
    delete next.args;
  } else {
    next.command = wrapped.command;
    next.args = wrapped.args;
  }
  const wantEnvironment =
    Object.prototype.hasOwnProperty.call(user, "environment") ||
    Object.prototype.hasOwnProperty.call(framework, "environment");
  const wantEnv =
    Object.prototype.hasOwnProperty.call(user, "env") || Object.prototype.hasOwnProperty.call(framework, "env");
  if (wantEnvironment) next.environment = mergedEnv;
  if (wantEnv) next.env = mergedEnv;
  else if (!wantEnvironment) next.env = mergedEnv;
  if (!Object.prototype.hasOwnProperty.call(user, "enabled") && Object.prototype.hasOwnProperty.call(framework, "enabled")) {
    next.enabled = framework.enabled;
  }
  if (!Object.prototype.hasOwnProperty.call(user, "disabled") && Object.prototype.hasOwnProperty.call(framework, "disabled")) {
    next.disabled = framework.disabled;
  }
  return next;
}

function mergeMcpMap(frameworkServers, userServers, targetDir) {
  const framework = frameworkServers && typeof frameworkServers === "object" ? frameworkServers : {};
  const user = userServers && typeof userServers === "object" ? userServers : {};
  const merged = {};
  const seen = new Set();
  for (const name of Object.keys(user)) {
    seen.add(name);
    merged[name] = framework[name] ? mergeUserWinsServer(framework[name], user[name], targetDir) : user[name];
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
  const launch = scopedMcpLaunch(targetDir, mcpCmd, env);
  return {
    command: launch.command,
    args: launch.args,
    env: launch.env,
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
    const launch = scopedMcpLaunch(targetDir, s.mcpCmd, s.env);
    entries[s.name] = {
      type: "local",
      command: launch.commandList,
      enabled: true,
      environment: launch.env,
    };
  }
  const extras = detectConsumerExtraMcpServers(targetDir);
  return { ...entries, ...extras.opencode };
}

function buildPluginMcpJson(targetDir) {
  const mcpServers = {};
  for (const s of XRAY_MCP_SERVERS) {
    const launch = scopedMcpLaunch(targetDir, s.mcpCmd, s.env);
    mcpServers[s.name] = {
      command: launch.command,
      args: launch.args,
      env: launch.env,
    };
  }
  return { mcpServers };
}

/** Project .mcp.json for Grok/Cursor. Launcher allowlist drops inherited secrets; XRAY_ROOT is set when targetDir is known. */
function buildPortableProjectMcpJson(targetDir) {
  const mcpServers = {};
  for (const s of XRAY_MCP_SERVERS) {
    const launch = scopedMcpLaunch(targetDir, s.mcpCmd, s.env);
    mcpServers[s.name] = {
      command: launch.command,
      args: launch.args,
      env: launch.env,
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
  const nextMcp = mergeMcpMap(entries, config.mcp || {}, targetDir);
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
    mcpServers: mergeMcpMap(framework, existing.mcpServers || {}, targetDir),
  };
  if (hadFile && jsonDeepEqual(merged, existing)) return false;
  fs.writeFileSync(destPath, `${JSON.stringify(merged, null, 2)}\n`);
  return true;
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
  scopedMcpLaunch,
  baseScopedEnv,
  wrapScopedLaunch,
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
  resolveGogglesMcp,
  resolveRepertoireProvider,
  isDefaultMemoryRoutingOff,
  enableMemoryRoutingIfResolves,
  isEphemeralInstallRoot,
  isIsolatedHome,
  pinLauncherPackageRoot,
  copyHermesHookRuntimes,
  resolveOpenClawPreToolHookSource,
  resolveOpenClawPluginDir,
  installOpenClawHostWear,
  maybeWriteOpenClawCliBackend,
};