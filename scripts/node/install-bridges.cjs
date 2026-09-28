#!/usr/bin/env node
/**
 * install-bridges.cjs — Unified 4-platform bridge installer for consumer postinstall.
 * Mirrors npx 0xray {opencode,grok,hermes,openclaw} install in one synchronous pass
 * plus Cursor project hooks (fifth wear — not a fifth chat TUI).
 */

const fs = require("fs");
const path = require("path");
const { execFileSync, execSync } = require("child_process");
const {
  wantsCostume,
  isIsolatedHome,
  machineHome,
  processHome,
  resolveGrokPluginDests,
  wouldClobberMachineGrok,
} = require("../foundry/mint-suit.cjs");
const { wearVendoredRepertoire } = require("./wear-vendored-repertoire.cjs");
const {
  wireHermesBridge,
  wireOpencodeBridge,
  wireOpenClawBridge,
  deployPortableProjectMcpJson,
  scopedMcpLaunch,
  mergeMcpMap,
  mergeNamedRecords,
  jsonDeepEqual,
  copyHermesFindProjectRootHelper,
  copyHermesHookRuntimes,
  installOpenClawHostWear,
  maybeWriteOpenClawCliBackend,
  isEphemeralInstallRoot,
  enableMemoryRoutingIfResolves,
  XRAY_MCP_SERVERS,
} = require("./bridge-mcp-wiring.cjs");

const SKIP_DIRS = new Set(["node_modules", "logs"]);
const MERGE_FILES = new Set(["enforcer-config.json"]);
const KEEP_IF_EXISTS = new Set([".yml", ".yaml", ".md"]);

function isInstallPrefixTarget(dir) {
  const n = path.resolve(dir);
  const norm = n.replace(/\\/g, "/");
  if (norm.includes("/_npx/") || norm.endsWith("/_npx")) return true;
  if (!fs.existsSync(path.join(n, "package.json"))) return true;
  return false;
}

function resolveConsumerTargetDir(packageRoot, fallbackDir) {
  const resolved = path.resolve(packageRoot);
  const fallback = path.resolve(
    fallbackDir || process.env.INIT_CWD || process.env.PWD || process.cwd(),
  );
  const inNodeModules =
    resolved.includes(`${path.sep}node_modules${path.sep}`) ||
    resolved.endsWith(`${path.sep}node_modules`);

  let candidate;
  if (!inNodeModules) {
    candidate = fallback;
  } else {
    let current = resolved;
    while (path.basename(current) !== "node_modules") {
      const parent = path.dirname(current);
      if (parent === current) {
        candidate = fallback;
        break;
      }
      current = parent;
    }
    if (!candidate) candidate = path.dirname(current);
  }

  if (isInstallPrefixTarget(candidate)) {
    if (!isInstallPrefixTarget(fallback)) return fallback;
    return resolved;
  }
  return candidate;
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

function syncCostumeSkills(targetSkillsDir, packageRoot, targetDir) {
  if (targetDir && !wantsCostume(targetDir)) return 0;
  return syncBuiltinSkills(targetSkillsDir, packageRoot);
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
  try {
    if (fs.existsSync(dest)) {
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.cpSync(src, dest, { recursive: true, force: true });
    return true;
  } catch (e) {
    try {
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(src, dest, { recursive: true, force: true });
      return true;
    } catch {
      throw e;
    }
  }
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
      if (srcData.agent || destData.agent) {
        merged.agent = mergeNamedRecords(srcData.agent, destData.agent);
      }
      if (srcData.mcp || destData.mcp) {
        merged.mcp = mergeMcpMap(srcData.mcp, destData.mcp, targetDir);
      }
      if (srcData.compaction || destData.compaction) {
        merged.compaction =
          srcData.compaction && destData.compaction
            ? { ...srcData.compaction, ...destData.compaction }
            : destData.compaction || srcData.compaction;
      }
      if (!jsonDeepEqual(merged, destData)) {
        fs.writeFileSync(userOpencode, JSON.stringify(merged, null, 2) + "\n");
      }
    } else {
      fs.copyFileSync(rootOpencode, userOpencode);
    }
    log("opencode-bridge", "opencode.json merged", "info");
  } catch (e) {
    log("opencode-bridge", "opencode.json merge failed", "warn", { error: e.message });
  }
}

function grokHookShellCommand(packageRoot, scriptName, extraArgs) {
  const script = path.join(packageRoot, "dist", "integrations", "grok", "hooks", scriptName);
  const extra = extraArgs ? ` ${extraArgs}` : "";
  // JSON.stringify quotes so spaces/$ in install paths still exec (Grok fail-opens on crash).
  return `XRAY_AI_PATH=${JSON.stringify(packageRoot)} node ${JSON.stringify(script)}${extra}`;
}

function patchGrokHookEntry(hook, packageRoot, targetDir, scriptName, extraArgs) {
  if (!hook) return;
  hook.type = "command";
  hook.command = grokHookShellCommand(packageRoot, scriptName, extraArgs);
  hook.timeout = 30;
  delete hook.args;
  hook.env = {
    ...(hook.env || {}),
    XRAY_ROOT: targetDir,
    XRAY_AI_PATH: packageRoot,
  };
}

function ensureGrokHookEvent(hooks, eventName) {
  if (!hooks.hooks) hooks.hooks = {};
  if (!Array.isArray(hooks.hooks[eventName]) || !hooks.hooks[eventName][0]) {
    hooks.hooks[eventName] = [{ hooks: [{}] }];
  }
  if (!Array.isArray(hooks.hooks[eventName][0].hooks) || !hooks.hooks[eventName][0].hooks[0]) {
    hooks.hooks[eventName][0].hooks = [{}];
  }
}

function patchGrokHooks(pluginDir, packageRoot, targetDir, log, label) {
  const hooksDir = path.join(pluginDir, "hooks");
  const hooksPath = path.join(hooksDir, "hooks.json");
  const hookScript = path.join(packageRoot, "dist", "integrations", "grok", "hooks", "pre-tool-use.js");
  if (!fs.existsSync(hooksPath)) {
    if (!fs.existsSync(hooksDir)) fs.mkdirSync(hooksDir, { recursive: true });
    if (!fs.existsSync(hooksPath)) return;
  }

  try {
    const hooks = JSON.parse(fs.readFileSync(hooksPath, "utf8"));
    if (!fs.existsSync(hookScript)) return;
    patchGrokHookEntry(hooks.hooks?.PreToolUse?.[0]?.hooks?.[0], packageRoot, targetDir, "pre-tool-use.js");
    patchGrokHookEntry(hooks.hooks?.SessionStart?.[0]?.hooks?.[0], packageRoot, targetDir, "session-start.js");
    patchGrokHookEntry(
      hooks.hooks?.UserPromptSubmit?.[0]?.hooks?.[0],
      packageRoot,
      targetDir,
      "session-start.js",
      "--hook-event=user_prompt_submit",
    );
    patchGrokHookEntry(hooks.hooks?.PostToolUse?.[0]?.hooks?.[0], packageRoot, targetDir, "post-tool-use.js");
    ensureGrokHookEvent(hooks, "PreCompact");
    ensureGrokHookEvent(hooks, "PostCompact");
    patchGrokHookEntry(
      hooks.hooks?.PreCompact?.[0]?.hooks?.[0],
      packageRoot,
      targetDir,
      "session-start.js",
      "--hook-event=pre_compact",
    );
    patchGrokHookEntry(
      hooks.hooks?.PostCompact?.[0]?.hooks?.[0],
      packageRoot,
      targetDir,
      "session-start.js",
      "--hook-event=post_compact",
    );
    fs.writeFileSync(hooksPath, JSON.stringify(hooks, null, 2) + "\n");
    writeGrokDiscoveredHooks(targetDir, hooksPath, log, label);
    log(label, "hooks.json patched → Grok command-string enforcement gate", "info");
  } catch (e) {
    log(label, "hooks.json patch failed", "warn", { error: e.message });
  }
}

/** Grok TUI loads `<project>/.grok/hooks/*.json`, not `plugins/0xray/hooks`. */
function writeGrokDiscoveredHooks(targetDir, hooksPath, log, label) {
  if (!targetDir || !fs.existsSync(hooksPath)) return;
  try {
    const destDir = path.join(targetDir, ".grok", "hooks");
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, "0xray.json");
    fs.copyFileSync(hooksPath, dest);
    log(label, "Grok discovered hooks → .grok/hooks/0xray.json", "info", { dest });
  } catch (e) {
    log(label, "Grok discovered hooks copy failed", "warn", { error: e.message });
  }
}

function copyOpencodePlugin(packageRoot, opencodeDest, log) {
  const pluginSource = path.join(packageRoot, "dist", "plugin", "xray-codex-injection.js");
  const pluginDest = path.join(opencodeDest, "plugin", "xray-codex-injection.js");
  if (!fs.existsSync(pluginSource)) return;
  const pluginDestDir = path.dirname(pluginDest);
  if (!fs.existsSync(pluginDestDir)) fs.mkdirSync(pluginDestDir, { recursive: true });
  const scopePkg = path.join(opencodeDest, "package.json");
  if (!fs.existsSync(scopePkg)) {
    fs.writeFileSync(scopePkg, `${JSON.stringify({ type: "module" })}\n`);
  }
  const shim = `export { default } from ${JSON.stringify(pluginSource)};\n`;
  fs.writeFileSync(pluginDest, shim);
  log("opencode-bridge", "plugin shim written", "info");
}

function installOpencodeBridge(targetDir, packageRoot, log) {
  const opencodeSource = path.join(packageRoot, ".opencode");
  const opencodeDest = path.join(targetDir, ".opencode");
  const costume = wantsCostume(targetDir);

  if (costume) {
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
    copyOpencodePlugin(packageRoot, opencodeDest, log);
    const copied = syncCostumeSkills(path.join(opencodeDest, "skills"), packageRoot, targetDir);
    if (copied > 0) log("opencode-bridge", `skills synced (${copied})`, "info", { path: ".opencode/skills/" });
  } else {
    log("opencode-bridge", "mill plant — plugin only, not costume dump", "info");
    fs.mkdirSync(opencodeDest, { recursive: true });
    copyOpencodePlugin(packageRoot, opencodeDest, log);
  }

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

function registerGrokMcpServers(targetDir, log, pluginDirs) {
  try {
    execSync("which grok", { stdio: "ignore" });
  } catch {
    log("grok-bridge", "grok CLI not on PATH — plugin .mcp.json still configured", "info");
    return;
  }

  for (const s of XRAY_MCP_SERVERS) {
    try {
      const launch = scopedMcpLaunch(targetDir, s.mcpCmd, s.env);
      const argv = ["mcp", "add", s.name, "--command", launch.command, "--args", launch.args[0], ...launch.args.slice(1)];
      for (const [key, value] of Object.entries(launch.env)) {
        argv.push("--env", `${key}=${value}`);
      }
      execFileSync("grok", argv, { stdio: "pipe" });
      log("grok-bridge", `registered ${s.name} (mcp-launch)`, "info");
    } catch {
      // already registered or grok config conflict — non-blocking
    }
  }

  const dirs =
    Array.isArray(pluginDirs) && pluginDirs.length > 0
      ? pluginDirs
      : [path.join(targetDir, ".grok", "plugins", "0xray")];
  for (const pluginDir of dirs) {
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

function installGrokBridge(targetDir, packageRoot, log, opts) {
  const sourceDir = findGrokPluginSource(packageRoot);
  if (!sourceDir) {
    log("grok-bridge", "skipped", "warn", { reason: "grok plugin source missing" });
    return;
  }

  const env = (opts && opts.env) || process.env;
  const machine = (opts && opts.machineHome) || machineHome();
  const ephemeral = isEphemeralInstallRoot(targetDir);
  const isolated = isIsolatedHome(env, machine);
  const targets = resolveGrokPluginDests(targetDir, env, machine);

  if (ephemeral) {
    log("grok-bridge", "skip machine ~/.grok plugin — ephemeral consumer", "info");
  } else if (isolated) {
    log("grok-bridge", "skip machine ~/.grok plugin — isolated HOME", "info");
  } else {
    log("grok-bridge", "skip machine ~/.grok plugin — project-scoped wear", "info");
  }

  for (const dest of targets) {
    if (wouldClobberMachineGrok(dest, env, machine)) {
      log("grok-bridge", "refuse-machine-grok-clobber", "error", {
        dest,
        machinePlugin: path.join(machine, ".grok", "plugins", "0xray"),
      });
      continue;
    }
    if (copyPluginDir(sourceDir, dest)) {
      const rel = dest.startsWith(machine) ? dest.replace(machine, "~") : path.relative(targetDir, dest);
      log("grok-bridge", "plugin copied", "info", { path: rel || dest });
      writePluginMcpJson(dest, targetDir, log, "grok-bridge");
      patchGrokHooks(dest, packageRoot, targetDir, log, "grok-bridge");
      const copied = syncCostumeSkills(path.join(dest, "skills"), packageRoot, targetDir);
      if (copied > 0) log("grok-bridge", `plugin skills synced (${copied})`, "info", { path: rel });
    }
  }

  if (isolated && !ephemeral) {
    const home = processHome(env);
    const grokGlobalSkills = path.join(home, ".grok", "skills");
    const globalCopied = syncCostumeSkills(grokGlobalSkills, packageRoot, targetDir);
    if (globalCopied > 0) {
      log("grok-bridge", `global skills synced (${globalCopied})`, "info", { path: grokGlobalSkills });
    }
    registerGrokMcpServers(targetDir, log, targets);
  }
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

  const ephemeral = isEphemeralInstallRoot(targetDir);
  const isolated = isIsolatedHome();
  const machine = machineHome();
  const targetPluginDir =
    ephemeral || isolated
      ? path.join(targetDir, ".hermes", "plugins", "xray-hermes")
      : path.join(machine, ".hermes", "plugins", "xray-hermes");
  if (isolated) {
    log("hermes-bridge", "skip machine ~/.hermes plugin — isolated HOME", "info");
  }
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
  copyHermesFindProjectRootHelper(packageRoot, targetPluginDir);
  if (!ephemeral && !isolated && copyHermesHookRuntimes(packageRoot)) {
    log("hermes-bridge", "hook runtimes copied", "info", { path: "~/.hermes/plugins/hooks" });
  }
  log(
    "hermes-bridge",
    "plugin copied",
    "info",
    { path: ephemeral || isolated ? path.relative(targetDir, targetPluginDir) : "~/.hermes/plugins/xray-hermes" },
  );

  writePluginMcpJson(targetPluginDir, targetDir, log, "hermes-bridge");

  const copied = syncCostumeSkills(path.join(targetPluginDir, "skills"), packageRoot, targetDir);
  if (copied > 0) log("hermes-bridge", `skills synced (${copied})`, "info");

  const rootMarker = path.join(targetPluginDir, "xray-consumer-root.txt");
  if (!isEphemeralInstallRoot(targetDir)) {
    fs.writeFileSync(rootMarker, targetDir + "\n");
    log("hermes-bridge", "consumer root marker written", "info");
  } else {
    log("hermes-bridge", "skip machine consumer marker — ephemeral consumer", "info");
  }

  if (!ephemeral && !isolated) {
    try {
      const result = wireHermesBridge(targetDir);
      log("hermes-bridge", `mcp_servers wired (${result.count} servers)`, "info");
    } catch (e) {
      log("hermes-bridge", "mcp_servers wire failed", "warn", { error: e.message });
    }
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

  const ephemeralOpenclaw = isEphemeralInstallRoot(targetDir);
  const isolatedOpenclaw = isIsolatedHome();
  if (!ephemeralOpenclaw && !isolatedOpenclaw) {
    const copied = syncCostumeSkills(
      path.join(machineHome(), ".openclaw", "skills"),
      packageRoot,
      targetDir,
    );
    if (copied > 0) {
      log("openclaw-bridge", `skills synced (${copied})`, "info", { path: "~/.openclaw/skills/" });
    }
  } else {
    log(
      "openclaw-bridge",
      isolatedOpenclaw
        ? "skip machine ~/.openclaw skills — isolated HOME"
        : "skip machine ~/.openclaw skills — ephemeral consumer",
      "info",
    );
  }

  if (!ephemeralOpenclaw && !isolatedOpenclaw) {
    try {
      const result = wireOpenClawBridge(targetDir);
      log("openclaw-bridge", `openclaw.json mcp wired (${result.count} servers)`, "info", {
        method: result.method,
      });
    } catch (e) {
      log("openclaw-bridge", "openclaw.json mcp wire failed", "warn", { error: e.message });
    }
  }

  if (!ephemeralOpenclaw && !isolatedOpenclaw) {
    const hook = installOpenClawHostWear(packageRoot);
    if (hook) log("openclaw-bridge", "PreToolUse hook installed", "info", { path: hook });
    if (maybeWriteOpenClawCliBackend()) {
      log("openclaw-bridge", "opencode-cli backend written", "info");
    }
  } else {
    log(
      "openclaw-bridge",
      isolatedOpenclaw
        ? "skip machine PreToolUse wear — isolated HOME"
        : "skip machine PreToolUse wear — ephemeral consumer",
      "info",
    );
  }
}

const XRAY_CONFIG_FILES = ["codex.json", "features.json", "features.schema.json", "config.json"];

/** Consumer JSON configs merge on upgrade — consumer values win; shipped fills new keys. */
const MERGE_CONFIG_FILES = new Set(["features.json", "config.json", "codex.json"]);

function readPackageVersion(packageRoot) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));
    return pkg.version || null;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function applyResolvedMemoryRouting(dst, targetDir) {
  try {
    const features = JSON.parse(fs.readFileSync(dst, "utf8"));
    const next = enableMemoryRoutingIfResolves(features, targetDir);
    if (next.changed) writeJsonFile(dst, next.features);
  } catch {
    /* leftover default stays off when features.json is unreadable */
  }
}

function deployXrayConfigFile(file, src, dst, packageRoot, targetDir) {
  if (!fs.existsSync(dst)) {
    fs.copyFileSync(src, dst);
    if (file === "features.json") applyResolvedMemoryRouting(dst, targetDir);
    return true;
  }

  if (file === "features.schema.json") {
    if (fs.statSync(src).mtime > fs.statSync(dst).mtime) {
      fs.copyFileSync(src, dst);
      return true;
    }
    return false;
  }

  if (MERGE_CONFIG_FILES.has(file)) {
    try {
      const shipped = JSON.parse(fs.readFileSync(src, "utf8"));
      const consumer = JSON.parse(fs.readFileSync(dst, "utf8"));
      const merged = deepMerge(shipped, consumer);
      if (file === "features.json") {
        const pkgVersion = readPackageVersion(packageRoot);
        if (pkgVersion) merged.version = pkgVersion;
        else if (shipped.version) merged.version = shipped.version;
        // v3: existing consumers without suit_temperament stay guided on upgrade.
        // Fresh copy (dst missing) already returned above with shipped auto.
        const hadTemperament =
          consumer.suit_temperament &&
          typeof consumer.suit_temperament === "object" &&
          consumer.suit_temperament.profile;
        if (!hadTemperament) {
          merged.suit_temperament = {
            ...(merged.suit_temperament || {}),
            profile: "guided",
          };
        }
        writeJsonFile(dst, merged);
        applyResolvedMemoryRouting(dst, targetDir);
        return true;
      }
      writeJsonFile(dst, merged);
      return true;
    } catch {
      if (fs.statSync(src).mtime > fs.statSync(dst).mtime) {
        fs.copyFileSync(src, dst);
        if (file === "features.json") applyResolvedMemoryRouting(dst, targetDir);
        return true;
      }
      return false;
    }
  }

  if (fs.statSync(src).mtime > fs.statSync(dst).mtime) {
    fs.copyFileSync(src, dst);
    return true;
  }
  return false;
}

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
    if (deployXrayConfigFile(file, src, dst, packageRoot, targetDir)) {
      copied++;
    }
  }
  if (copied > 0) log("xray-config", `${copied} files deployed`, "info", { path: ".xray/" });
  return copied;
}

const CURSOR_HOOK_SCRIPTS = [
  "xray-cloud-hook.sh",
  "pre-tool-use.sh",
  "pre-compact.sh",
  "after-file-edit.sh",
  "before-read-file.sh",
  "before-shell-execution.sh",
];

/** Five Cursor hook events 0xray ships. preCompact is one of them.
 * Dogfood `.cursor/hooks` also holds the shared runner and invoke-probe.sh;
 * those are not hook events. */
const CURSOR_HOOK_EVENTS = [
  ["preToolUse", "pre-tool-use.sh"],
  ["preCompact", "pre-compact.sh"],
  ["afterFileEdit", "after-file-edit.sh"],
  ["beforeShellExecution", "before-shell-execution.sh"],
  ["beforeReadFile", "before-read-file.sh"],
];

const CURSOR_WEAR_BACKUP = "hooks.json.xray-before";

const CLOUD_SAFE_CURSOR_HOOKS = {
  version: 1,
  hooks: {
    preToolUse: [{ command: ".cursor/hooks/pre-tool-use.sh" }],
    preCompact: [{ command: ".cursor/hooks/pre-compact.sh" }],
    afterFileEdit: [{ command: ".cursor/hooks/after-file-edit.sh" }],
    beforeShellExecution: [{ command: ".cursor/hooks/before-shell-execution.sh" }],
    beforeReadFile: [{ command: ".cursor/hooks/before-read-file.sh" }],
  },
};

function resolveCursorHooksTemplate(packageRoot) {
  const src = path.join(packageRoot, "src", "integrations", "cursor", "hooks", "hooks.json");
  if (fs.existsSync(src)) return src;
  const dist = path.join(packageRoot, "dist", "integrations", "cursor", "hooks", "hooks.json");
  if (fs.existsSync(dist)) return dist;
  return null;
}

function resolveCursorHookScriptDir(packageRoot) {
  const src = path.join(packageRoot, "src", "integrations", "cursor", "hooks");
  if (fs.existsSync(path.join(src, "xray-cloud-hook.sh"))) return src;
  const dist = path.join(packageRoot, "dist", "integrations", "cursor", "hooks");
  if (fs.existsSync(path.join(dist, "xray-cloud-hook.sh"))) return dist;
  return null;
}

function isEnvAssignmentCursorCommand(command) {
  const cmd = String(command || "");
  return (
    /XRAY_AI_PATH=/.test(cmd) ||
    /XRAY_HOOK_EVENT=/.test(cmd) ||
    /invoke-probe\.sh/.test(cmd) ||
    /\$\{XRAY_AI_PATH/.test(cmd) ||
    /^\s*node\s+/.test(cmd)
  );
}

function isRelativeCursorHookCommand(command) {
  return /^\.cursor\/hooks\/[\w.-]+\.sh$/.test(String(command || ""));
}

function mergeCloudSafeCursorHooks(existing) {
  const next =
    existing && typeof existing === "object" ? { ...existing, hooks: { ...(existing.hooks || {}) } } : { version: 1, hooks: {} };
  next.version = 1;
  for (const [name, entries] of Object.entries(CLOUD_SAFE_CURSOR_HOOKS.hooks)) {
    const current = next.hooks[name];
    const leftover = Array.isArray(current) && current.some((h) => isEnvAssignmentCursorCommand(h && h.command));
    const missingRelative =
      !Array.isArray(current) || !current.some((h) => isRelativeCursorHookCommand(h && h.command));
    if (!current || leftover || missingRelative) {
      next.hooks[name] = entries;
    }
  }
  return next;
}

function fastenCursorHookScripts(targetDir, packageRoot, log) {
  const srcDir = resolveCursorHookScriptDir(packageRoot);
  const destDir = path.join(targetDir, ".cursor", "hooks");
  fs.mkdirSync(destDir, { recursive: true });
  if (!srcDir) {
    log("cursor-bridge", "hook scripts missing", "warn", { reason: "xray-cloud-hook.sh not in src or dist" });
    return 0;
  }
  let copied = 0;
  for (const name of CURSOR_HOOK_SCRIPTS) {
    const src = path.join(srcDir, name);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(destDir, name);
    fs.copyFileSync(src, dest);
    try {
      fs.chmodSync(dest, 0o755);
    } catch {
      // chmod is best-effort on hosts that ignore mode
    }
    copied++;
  }
  return copied;
}

/**
 * Multi-repo Cloud workspaces bind hooks at the daemon cwd (e.g. /agent),
 * not the primary git checkout. Fasten that root too when it is visible.
 */
function resolveCursorWorkspaceRoot(targetDir) {
  const envRoot = process.env.CURSOR_PROJECT_DIR;
  if (envRoot) {
    const resolved = path.resolve(envRoot);
    if (fs.existsSync(resolved) && resolved !== path.resolve(targetDir)) {
      return resolved;
    }
  }
  let dir = path.resolve(targetDir);
  for (let i = 0; i < 6; i += 1) {
    const parent = path.dirname(dir);
    if (parent === dir) break;
    if (
      fs.existsSync(path.join(parent, "repos", "xray")) ||
      fs.existsSync(path.join(parent, "repos", "repertoire"))
    ) {
      return parent;
    }
    dir = parent;
  }
  return null;
}

function fastenCursorHooksAt(targetDir, packageRoot, log) {
  try {
    return fastenCursorHooksAtUnsafe(targetDir, packageRoot, log);
  } catch (err) {
    log("cursor-bridge", "workspace fasten skipped", "warn", {
      target: targetDir,
      error: err && err.message ? err.message : String(err),
    });
    return null;
  }
}

function fastenCursorHooksAtUnsafe(targetDir, packageRoot, log) {
  const dest = path.join(targetDir, ".cursor", "hooks.json");
  const copied = fastenCursorHookScripts(targetDir, packageRoot, log);
  let existing = null;
  if (fs.existsSync(dest)) {
    try {
      existing = JSON.parse(fs.readFileSync(dest, "utf8"));
    } catch {
      existing = null;
    }
  }
  const template = resolveCursorHooksTemplate(packageRoot);
  if (!existing && !template) {
    log("cursor-bridge", "skipped", "warn", { reason: "cursor hooks template missing", target: targetDir });
    return null;
  }
  const next = mergeCloudSafeCursorHooks(existing);
  const body = `${JSON.stringify(next, null, 2)}\n`;
  const previousText = fs.existsSync(dest) ? fs.readFileSync(dest, "utf8") : null;
  if (previousText !== body) {
    saveCursorWearSnapshot(targetDir, previousText, body);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body);
  }
  log("cursor-bridge", existing ? "hooks.json rewritten cloud-safe" : "hooks.json fastened", "info", {
    path: dest,
    scripts: copied,
  });
  return dest;
}

/**
 * Fifth wear: project `.cursor/hooks.json` + relative `.cursor/hooks/*.sh`.
 * Cloud execs argv[0] without a shell — leftover `XRAY_AI_PATH=` one-liners never start.
 * Also fasten the daemon workspace root on multi-repo Cloud seats.
 */
function parseExecDaemonCmdline(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return null;
  const joined = parts.join(" ");
  if (!joined.includes("exec-daemon")) return null;
  let port = "";
  let token = "";
  for (let i = 0; i < parts.length; i += 1) {
    const arg = parts[i];
    if (arg === "--port" || arg === "-p") port = parts[i + 1] || "";
    if (arg === "--auth-token" || arg === "--authToken") token = parts[i + 1] || "";
    if (typeof arg === "string" && arg.startsWith("--port=")) port = arg.slice("--port=".length);
    if (typeof arg === "string" && arg.startsWith("--auth-token=")) {
      token = arg.slice("--auth-token=".length);
    }
  }
  if (!port || !token) return null;
  return { port: String(port), token: String(token) };
}

function findLocalExecDaemon() {
  let names;
  try {
    names = fs.readdirSync("/proc");
  } catch {
    return null;
  }
  for (const name of names) {
    if (!/^\d+$/.test(name)) continue;
    let parts;
    try {
      parts = fs.readFileSync(path.join("/proc", name, "cmdline"), "utf8").split("\0");
    } catch {
      continue;
    }
    const parsed = parseExecDaemonCmdline(parts);
    if (parsed) return parsed;
  }
  return null;
}

function reloadCursorHostHooks(log) {
  const write =
    typeof log === "function"
      ? log
      : () => {
          /* noop */
        };
  try {
    const daemon = findLocalExecDaemon();
    if (!daemon) {
      write("cursor-bridge", "host reload skipped", "info", { reason: "no-local-daemon" });
      return false;
    }
    const script = [
      'const http = require("http");',
      "const req = http.request({",
      '  host: "127.0.0.1",',
      "  port: process.env.XRAY_RELOAD_PORT,",
      '  path: "/agent.v1.ControlService/ReloadAgentSkills",',
      '  method: "POST",',
      "  headers: {",
      '    "content-type": "application/json",',
      '    authorization: "Bearer " + process.env.XRAY_RELOAD_TOKEN,',
      '    "connect-protocol-version": "1",',
      "  },",
      "}, (res) => { res.resume(); res.on(\"end\", () => process.stdout.write(String(res.statusCode || 0))); });",
      "req.on(\"error\", () => process.exit(2));",
      "req.setTimeout(3000, () => { req.destroy(); process.exit(3); });",
      'req.end("{}");',
    ].join("\n");
    const status = execFileSync(process.execPath, ["-e", script], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        XRAY_RELOAD_PORT: String(daemon.port),
        XRAY_RELOAD_TOKEN: daemon.token,
      },
      timeout: 4000,
    }).trim();
    const code = Number(status);
    write("cursor-bridge", "host hooks reloaded", code === 200 ? "info" : "warn", {
      status: code,
      port: daemon.port,
    });
    return code === 200;
  } catch (err) {
    write("cursor-bridge", "host reload skipped", "warn", {
      error: err && err.message ? err.message : String(err),
    });
    return false;
  }
}

function consumerDistHooksReady(packageRoot) {
  const dir = path.join(packageRoot, "dist", "integrations", "cursor", "hooks");
  if (!fs.existsSync(path.join(dir, "xray-cloud-hook.sh"))) return false;
  return CURSOR_HOOK_EVENTS.every(([, script]) => fs.existsSync(path.join(dir, script)));
}

function installedHookCommand(fromDir, packageRoot, scriptName) {
  const abs = path.join(packageRoot, "dist", "integrations", "cursor", "hooks", scriptName);
  return path.relative(fromDir, abs).split(path.sep).join("/");
}

function installedCursorHookEntries(fromDir, packageRoot) {
  const hooks = {};
  for (const [event, script] of CURSOR_HOOK_EVENTS) {
    hooks[event] = [{ command: installedHookCommand(fromDir, packageRoot, script) }];
  }
  return hooks;
}

/**
 * Ours only when the command points at the installed dist hook.
 * Legacy one-liners count only when they launch that same dist `.js`.
 * A user's `.cursor/hooks/pre-compact.sh` is not ours.
 */
function isXrayHookCommand(command) {
  const cmd = String(command || "").trim();
  if (!cmd) return false;
  if (/(?:^|[/\\])node_modules\/0xray\/dist\/integrations\/cursor\/hooks\/[\w.-]+\.sh$/.test(cmd)) {
    return true;
  }
  return (
    /XRAY_AI_PATH=/.test(cmd) &&
    /node_modules\/0xray\/dist\/integrations\/cursor\/hooks\/[\w.-]+\.js/.test(cmd)
  );
}

function commandAlreadyRunsXrayHook(command, targetDir) {
  if (isXrayHookCommand(command)) return true;
  const match = /^(?:\.\/)?\.cursor\/hooks\/([\w.-]+\.sh)$/.exec(String(command || "").trim());
  if (!match || !targetDir) return false;
  const abs = path.join(path.resolve(targetDir), ".cursor", "hooks", match[1]);
  try {
    return fs.readFileSync(abs, "utf8").includes("xray-cloud-hook.sh");
  } catch {
    return false;
  }
}

function scanJsonc(text) {
  let hasComments = false;
  let i = 0;
  let inString = false;
  let escape = false;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      i += 1;
      continue;
    }
    if (c === '"') {
      inString = true;
      i += 1;
      continue;
    }
    if (c === "/" && n === "/") {
      hasComments = true;
      i += 2;
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && n === "*") {
      hasComments = true;
      const end = text.indexOf("*/", i + 2);
      if (end < 0) return { ok: false, reason: "unclosed block comment", hasComments: true };
      i = end + 2;
      continue;
    }
    i += 1;
  }
  if (inString) return { ok: false, reason: "unclosed string", hasComments };
  return { ok: true, hasComments };
}

function stripJsonComments(text) {
  let out = "";
  let i = 0;
  let inString = false;
  let escape = false;
  while (i < text.length) {
    const c = text[i];
    const n = text[i + 1];
    if (inString) {
      out += c;
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      i += 1;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i += 1;
      continue;
    }
    if (c === "/" && n === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i += 1;
      out += " ";
      continue;
    }
    if (c === "/" && n === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) break;
      i = end + 2;
      out += " ";
      continue;
    }
    out += c;
    i += 1;
  }
  return out;
}

function refuseHooksEdit(hooksPath, reason) {
  throw new Error(`cursor-wear: refusing to edit ${hooksPath}: ${reason}. Wrote nothing.`);
}

function assertUniqueJsonKeys(text) {
  const tokens = tokenizeJsonc(text);
  const visit = (idx) => {
    const token = tokens[idx];
    if (!token) return;
    if (token.type === "{") {
      const obj = objectPairs(tokens, idx);
      for (const pair of obj.pairs) visit(pair.valIdx);
      return;
    }
    if (token.type === "[") {
      const close = matchingBracket(tokens, idx);
      for (const el of arrayElements(tokens, idx, close)) visit(el.startIdx);
    }
  };
  if (tokens.length) visit(0);
}

function parseHooksText(text, hooksPath) {
  const scan = scanJsonc(text);
  if (!scan.ok) refuseHooksEdit(hooksPath, scan.reason);
  try {
    assertUniqueJsonKeys(text);
  } catch (err) {
    refuseHooksEdit(hooksPath, err.message || String(err));
  }
  let parsed;
  try {
    parsed = JSON.parse(stripJsonComments(text));
  } catch (err) {
    refuseHooksEdit(hooksPath, `hooks.json is not valid JSONC (${err.message})`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    refuseHooksEdit(hooksPath, "hooks.json must be a JSON object");
  }
  return { parsed, hasComments: scan.hasComments };
}

function tokenizeJsonc(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "/") {
      i += 2;
      while (i < text.length && text[i] !== "\n") i += 1;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      if (end < 0) throw new Error("unclosed block comment");
      i = end + 2;
      continue;
    }
    if (c === '"') {
      const start = i;
      i += 1;
      let escape = false;
      while (i < text.length) {
        if (escape) {
          escape = false;
          i += 1;
          continue;
        }
        if (text[i] === "\\") {
          escape = true;
          i += 1;
          continue;
        }
        if (text[i] === '"') {
          i += 1;
          break;
        }
        i += 1;
      }
      tokens.push({ type: "string", start, end: i, value: JSON.parse(text.slice(start, i)) });
      continue;
    }
    if ("{}[],:".includes(c)) {
      tokens.push({ type: c, start: i, end: i + 1 });
      i += 1;
      continue;
    }
    const atom = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(text.slice(i));
    if (atom) {
      tokens.push({ type: "atom", start: i, end: i + atom[0].length, value: atom[0] });
      i += atom[0].length;
      continue;
    }
    throw new Error(`unexpected token at ${i}`);
  }
  return tokens;
}

function matchingBracket(tokens, openIdx) {
  const open = tokens[openIdx] && tokens[openIdx].type;
  if (open !== "{" && open !== "[") return -1;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  for (let i = openIdx; i < tokens.length; i += 1) {
    const type = tokens[i].type;
    if (type === "{" || type === "[") depth += 1;
    else if (type === "}" || type === "]") {
      depth -= 1;
      if (depth === 0) return type === close ? i : -1;
    }
  }
  return -1;
}

function objectPairs(tokens, openIdx) {
  const closeIdx = matchingBracket(tokens, openIdx);
  if (closeIdx < 0) throw new Error("unbalanced braces");
  const pairs = [];
  let i = openIdx + 1;
  while (i < closeIdx) {
    const keyTok = tokens[i];
    if (!keyTok || keyTok.type !== "string" || !tokens[i + 1] || tokens[i + 1].type !== ":") {
      throw new Error("unexpected object entry");
    }
    const valIdx = i + 2;
    const val = tokens[valIdx];
    if (!val) throw new Error("missing value");
    let valEnd = valIdx;
    if (val.type === "{" || val.type === "[") {
      valEnd = matchingBracket(tokens, valIdx);
      if (valEnd < 0) throw new Error("unbalanced braces");
    }
    if (pairs.some((pair) => pair.key === keyTok.value)) {
      throw new Error(`duplicate key ${JSON.stringify(keyTok.value)}`);
    }
    pairs.push({ key: keyTok.value, keyIdx: i, valIdx, valEnd });
    i = valEnd + 1;
    if (i < closeIdx && tokens[i] && tokens[i].type === ",") i += 1;
  }
  return { closeIdx, pairs };
}

function arrayElements(tokens, openIdx, closeIdx) {
  const elements = [];
  let i = openIdx + 1;
  while (i < closeIdx) {
    const token = tokens[i];
    if (!token || token.type === ",") {
      i += 1;
      continue;
    }
    let end = i;
    if (token.type === "{" || token.type === "[") {
      end = matchingBracket(tokens, i);
      if (end < 0) throw new Error("unbalanced braces");
    }
    elements.push({ startIdx: i, endIdx: end });
    i = end + 1;
  }
  return elements;
}

function commandOfObject(tokens, startIdx) {
  const obj = objectPairs(tokens, startIdx);
  const cmd = obj.pairs.find((pair) => pair.key === "command");
  if (!cmd) return null;
  const val = tokens[cmd.valIdx];
  if (!val || val.type !== "string") return null;
  return { value: val.value, token: val };
}

function applyTextEdits(text, edits) {
  const ordered = edits.slice().sort((a, b) => b.start - a.start || b.end - a.end);
  let out = text;
  for (const edit of ordered) {
    out = out.slice(0, edit.start) + edit.insert + out.slice(edit.end);
  }
  return out;
}

function ownedDeletionEdits(tokens, elements) {
  const claimed = new Set();
  const edits = [];
  for (const el of elements) {
    const startTok = tokens[el.startIdx];
    const endTok = tokens[el.endIdx];
    let start = startTok.start;
    let end = endTok.end;
    const next = tokens[el.endIdx + 1];
    const prev = tokens[el.startIdx - 1];
    if (next && next.type === "," && !claimed.has(next.start)) {
      claimed.add(next.start);
      end = next.end;
    } else if (prev && prev.type === "," && !claimed.has(prev.start)) {
      claimed.add(prev.start);
      start = prev.start;
    }
    edits.push({ start, end, insert: "" });
  }
  return edits;
}

function renderEventEntry(command) {
  return `{ "command": ${JSON.stringify(command)} }`;
}

function editJsoncHooks(text, xrayByEvent, targetDir) {
  let tokens;
  try {
    tokens = tokenizeJsonc(text);
  } catch (err) {
    throw new Error(err.message || String(err));
  }
  if (!tokens.length || tokens[0].type !== "{") throw new Error("hooks.json must be a JSON object");
  const root = objectPairs(tokens, 0);
  const edits = [];
  const hooksPair = root.pairs.find((pair) => pair.key === "hooks");
  if (!hooksPair) {
    const inner = Object.entries(xrayByEvent)
      .map(([event, entries]) => `"${event}": [${renderEventEntry(entries[0].command)}]`)
      .join(", ");
    const needsComma = root.pairs.length > 0;
    edits.push({
      start: tokens[root.closeIdx].start,
      end: tokens[root.closeIdx].start,
      insert: `${needsComma ? ", " : ""}"hooks": { ${inner} }`,
    });
    return applyTextEdits(text, edits);
  }
  if (tokens[hooksPair.valIdx].type !== "{") throw new Error("hooks is not an object");
  const hooksObj = objectPairs(tokens, hooksPair.valIdx);
  const missing = [];
  for (const [event, entries] of Object.entries(xrayByEvent)) {
    const command = entries[0].command;
    const pair = hooksObj.pairs.find((item) => item.key === event);
    if (!pair) {
      missing.push([event, command]);
      continue;
    }
    if (tokens[pair.valIdx].type !== "[") throw new Error(`${event} is not an array`);
    const elements = arrayElements(tokens, pair.valIdx, pair.valEnd);
    const owned = [];
    let coveredByRunner = false;
    for (const el of elements) {
      if (tokens[el.startIdx].type !== "{") continue;
      const cmd = commandOfObject(tokens, el.startIdx);
      if (!cmd) continue;
      if (isXrayHookCommand(cmd.value)) owned.push({ el, cmd });
      else if (commandAlreadyRunsXrayHook(cmd.value, targetDir)) coveredByRunner = true;
    }
    if (coveredByRunner) {
      if (owned.length > 0) edits.push(...ownedDeletionEdits(tokens, owned.map((item) => item.el)));
      continue;
    }
    if (owned.length === 0) {
      edits.push({
        start: tokens[pair.valEnd].start,
        end: tokens[pair.valEnd].start,
        insert: `${elements.length > 0 ? ", " : ""}${renderEventEntry(command)}`,
      });
      continue;
    }
    const first = owned[0];
    if (first.cmd.value !== command) {
      edits.push({
        start: first.cmd.token.start,
        end: first.cmd.token.end,
        insert: JSON.stringify(command),
      });
    }
    if (owned.length > 1) {
      edits.push(...ownedDeletionEdits(tokens, owned.slice(1).map((item) => item.el)));
    }
  }
  if (missing.length > 0) {
    const rendered = missing
      .map(([event, command]) => `"${event}": [${renderEventEntry(command)}]`)
      .join(", ");
    edits.push({
      start: tokens[hooksObj.closeIdx].start,
      end: tokens[hooksObj.closeIdx].start,
      insert: `${hooksObj.pairs.length > 0 ? ", " : ""}${rendered}`,
    });
  }
  return applyTextEdits(text, edits);
}

function renderWornHooks(originalText, hooksPath, xrayByEvent, targetDir) {
  parseHooksText(originalText, hooksPath);
  try {
    return editJsoncHooks(originalText, xrayByEvent, targetDir);
  } catch (err) {
    refuseHooksEdit(hooksPath, err.message || String(err));
  }
  return "";
}

function stripOwnedHookEntries(text) {
  const tokens = tokenizeJsonc(text);
  if (!tokens.length || tokens[0].type !== "{") return text;
  const root = objectPairs(tokens, 0);
  const hooksPair = root.pairs.find((pair) => pair.key === "hooks");
  if (!hooksPair || tokens[hooksPair.valIdx].type !== "{") return text;
  const hooksObj = objectPairs(tokens, hooksPair.valIdx);
  const owned = [];
  for (const pair of hooksObj.pairs) {
    if (tokens[pair.valIdx].type !== "[") continue;
    const elements = arrayElements(tokens, pair.valIdx, pair.valEnd);
    for (const el of elements) {
      if (tokens[el.startIdx].type !== "{") continue;
      const cmd = commandOfObject(tokens, el.startIdx);
      if (cmd && isXrayHookCommand(cmd.value)) owned.push(el);
    }
  }
  return stripDanglingCommas(stripEmptyShippedEvents(applyTextEdits(text, ownedDeletionEdits(tokens, owned))));
}

function stripDanglingCommas(text) {
  const tokens = tokenizeJsonc(text);
  const edits = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].type !== ",") continue;
    const next = tokens[i + 1];
    if (next && (next.type === "}" || next.type === "]")) {
      edits.push({ start: tokens[i].start, end: next.start, insert: "" });
    }
  }
  return applyTextEdits(text, edits);
}

function stripEmptyShippedEvents(text) {
  const shipped = new Set(CURSOR_HOOK_EVENTS.map(([event]) => event));
  const tokens = tokenizeJsonc(text);
  if (!tokens.length || tokens[0].type !== "{") return text;
  const root = objectPairs(tokens, 0);
  const hooksPair = root.pairs.find((pair) => pair.key === "hooks");
  if (!hooksPair || tokens[hooksPair.valIdx].type !== "{") return text;
  const hooksObj = objectPairs(tokens, hooksPair.valIdx);
  const empty = [];
  for (const pair of hooksObj.pairs) {
    if (!shipped.has(pair.key) || tokens[pair.valIdx].type !== "[") continue;
    if (arrayElements(tokens, pair.valIdx, pair.valEnd).length === 0) {
      empty.push({ startIdx: pair.keyIdx, endIdx: pair.valEnd });
    }
  }
  return applyTextEdits(text, ownedDeletionEdits(tokens, empty));
}

/**
 * Keep every non-0xray entry. Add or replace only 0xray's shipped commands.
 * A second pass on the result is stable (same keys, same commands).
 */
function mergeInstalledCursorHooks(existing, xrayByEvent) {
  const sourceHooks =
    existing && existing.hooks && typeof existing.hooks === "object" && !Array.isArray(existing.hooks)
      ? existing.hooks
      : {};
  const names = Object.keys(sourceHooks);
  for (const name of Object.keys(xrayByEvent)) {
    if (!names.includes(name)) names.push(name);
  }
  const hooks = {};
  for (const name of names) {
    const current = Array.isArray(sourceHooks[name]) ? sourceHooks[name] : [];
    const shipped = xrayByEvent[name];
    if (!shipped) {
      hooks[name] = current.slice();
      continue;
    }
    const command = shipped[0].command;
    let replaced = false;
    const next = [];
    for (const entry of current) {
      const cmd = entry && typeof entry === "object" ? entry.command : "";
      if (isXrayHookCommand(cmd)) {
        if (!replaced) {
          next.push({ ...entry, command });
          replaced = true;
        }
        continue;
      }
      next.push(entry);
    }
    if (!replaced) next.push({ command });
    hooks[name] = next;
  }
  const doc = {};
  if (existing && typeof existing === "object" && !Array.isArray(existing)) {
    for (const key of Object.keys(existing)) {
      if (key !== "hooks") doc[key] = existing[key];
    }
  }
  if (doc.version == null) doc.version = 1;
  doc.hooks = hooks;
  return doc;
}

function serializeHooksDoc(doc) {
  return `${JSON.stringify(doc, null, 2)}\n`;
}

function wearStateDir(targetDir) {
  return path.join(path.resolve(targetDir), ".xray", "state", "cursor-hook-wear");
}

/**
 * The snapshot lives in the project, outside node_modules. Append its path to
 * $GIT_DIR/info/exclude when nothing already ignores it. exclude is local git
 * metadata, so a fresh repo's `git status` does not grow a new `.gitignore`.
 */
function ensureWearStateGitignored(targetDir) {
  const stateDir = wearStateDir(targetDir);
  const probe = path.join(stateDir, "meta.json");
  try {
    execFileSync("git", ["check-ignore", "-q", "--", probe], {
      cwd: targetDir,
      stdio: "ignore",
    });
    return;
  } catch (err) {
    const notARepo = !err || err.code === "ENOENT" || err.status === 128;
    const notIgnored = Boolean(err && err.status === 1);
    if (notARepo || !notIgnored) return;
  }
  let top = "";
  let excludeRel = "";
  try {
    top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: targetDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    excludeRel = execFileSync("git", ["rev-parse", "--git-path", "info/exclude"], {
      cwd: targetDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return;
  }
  if (!top || !excludeRel) return;
  const rel = path.relative(top, stateDir).split(path.sep).join("/");
  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return;
  const pattern = `${rel}/`;
  const excludeFile = path.resolve(targetDir, excludeRel);
  try {
    fs.mkdirSync(path.dirname(excludeFile), { recursive: true });
    const existing = fs.existsSync(excludeFile) ? fs.readFileSync(excludeFile, "utf8") : "";
    if (existing.split("\n").some((line) => line.trim() === pattern)) return;
    const suffix = existing.length === 0 || existing.endsWith("\n") ? "" : "\n";
    fs.appendFileSync(excludeFile, `${suffix}${pattern}\n`);
  } catch {
    // exclude not writable — snapshot is still under .xray/state/
  }
}

function wearStatePaths(targetDir) {
  const dir = wearStateDir(targetDir);
  return {
    dir,
    meta: path.join(dir, "meta.json"),
    backup: path.join(dir, CURSOR_WEAR_BACKUP),
    written: path.join(dir, "hooks.json.written"),
  };
}

function textHasDistHookEntries(text) {
  return /(?:^|[/\\])node_modules\/0xray\/dist\/integrations\/cursor\/hooks\/[\w.-]+\.sh/.test(
    String(text || ""),
  );
}

function userBytesBeforeWear(previousText) {
  if (previousText == null) return null;
  if (!textHasDistHookEntries(previousText)) return previousText;
  return stripOwnedHookEntries(previousText);
}

function saveCursorWearSnapshot(targetDir, previousText, writtenBody) {
  ensureWearStateGitignored(targetDir);
  const paths = wearStatePaths(targetDir);
  fs.mkdirSync(paths.dir, { recursive: true });
  let meta;
  if (fs.existsSync(paths.meta)) {
    meta = JSON.parse(fs.readFileSync(paths.meta, "utf8"));
  } else {
    const backup = userBytesBeforeWear(previousText);
    meta = {
      version: 1,
      existed: previousText != null,
      cursorDirExisted: fs.existsSync(path.join(targetDir, ".cursor")),
      also: [],
    };
    if (backup != null) fs.writeFileSync(paths.backup, backup);
  }
  fs.writeFileSync(paths.written, writtenBody);
  fs.writeFileSync(paths.meta, `${JSON.stringify(meta, null, 2)}\n`);
  return { paths, meta };
}

function saveWearState(paths, meta) {
  fs.mkdirSync(paths.dir, { recursive: true });
  fs.writeFileSync(paths.meta, `${JSON.stringify(meta, null, 2)}\n`);
}

function resolveGitToplevel(targetDir) {
  try {
    const top = execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: targetDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!top) return null;
    const resolved = path.resolve(top);
    if (resolved === path.resolve(targetDir)) return null;
    return resolved;
  } catch {
    return null;
  }
}

function linkedWearRoots(targetDir) {
  const roots = [];
  const add = (root) => {
    if (!root) return;
    const resolved = path.resolve(root);
    if (resolved === path.resolve(targetDir)) return;
    if (roots.some((item) => path.resolve(item) === resolved)) return;
    roots.push(resolved);
  };
  add(resolveCursorWorkspaceRoot(targetDir));
  add(resolveGitToplevel(targetDir));
  roots.sort();
  return roots;
}

function removeDirIfEmpty(dir) {
  try {
    fs.rmdirSync(dir);
  } catch {
    // still holds user files
  }
}

/**
 * Merge the five shipped Cursor hooks into the target project's
 * `.cursor/hooks.json`. Writes only `targetDir`. An event whose command
 * already runs xray-cloud-hook.sh is left alone, so a committed suited
 * hooks.json is not given a second copy. Pass `{ outerRoots: true }` to also
 * write outer paths; each one is printed.
 * The snapshot is `<project>/.xray/state/cursor-hook-wear/` (gitignored, not packed).
 * An already-worn file is never stored as the pre-wear backup.
 */
function wearCursorHooks(targetDir, packageRoot, log, opts) {
  const write = typeof log === "function" ? log : () => {};
  const options = opts || {};
  const resolvedTarget = path.resolve(targetDir);
  const resolvedPackage = path.resolve(packageRoot);
  if (!isConsumerInstall(resolvedPackage, resolvedTarget) || !consumerDistHooksReady(resolvedPackage)) {
    return fastenCursorHooksAt(resolvedTarget, resolvedPackage, write);
  }

  const hooksPath = path.join(resolvedTarget, ".cursor", "hooks.json");
  const xrayByEvent = installedCursorHookEntries(resolvedTarget, resolvedPackage);
  const originalText = fs.existsSync(hooksPath) ? fs.readFileSync(hooksPath, "utf8") : null;
  const body =
    originalText == null
      ? serializeHooksDoc(mergeInstalledCursorHooks(null, xrayByEvent))
      : renderWornHooks(originalText, hooksPath, xrayByEvent, resolvedTarget);
  const changed = originalText == null || body !== originalText;
  let snap = null;
  if (changed) {
    snap = saveCursorWearSnapshot(resolvedTarget, originalText, body);
    fs.mkdirSync(path.dirname(hooksPath), { recursive: true });
    fs.writeFileSync(hooksPath, body);
  } else {
    write("cursor-bridge", "hooks.json already runs these hooks", "info", { path: hooksPath });
  }

  if (options.outerRoots === true) {
    if (!snap) snap = saveCursorWearSnapshot(resolvedTarget, originalText, body);
    snap.meta.also = linkedWearRoots(resolvedTarget);
    saveWearState(snap.paths, snap.meta);
    for (const extra of snap.meta.also) {
      wearCursorHooks(extra, resolvedPackage, write, { outerRoots: false });
      process.stdout.write(`cursor-wear: wrote outer hooks at ${extra}\n`);
    }
    saveWearState(snap.paths, snap.meta);
  }
  write("cursor-bridge", "hooks.json wired to installed dist", "info", { path: hooksPath });
  return hooksPath;
}

function stripHooksWithoutSnapshot(hooksPath, write) {
  if (!fs.existsSync(hooksPath)) {
    write("cursor-bridge", "unwear skipped", "info", { reason: "no snapshot", target: hooksPath });
    return false;
  }
  const text = fs.readFileSync(hooksPath, "utf8");
  let next;
  try {
    next = stripOwnedHookEntries(text);
  } catch (err) {
    process.stderr.write(
      `cursor-wear: ${hooksPath} has no snapshot and could not be parsed (${err.message}); left it unchanged\n`,
    );
    return false;
  }
  if (next === text) {
    write("cursor-bridge", "unwear skipped", "info", { reason: "no snapshot", target: hooksPath });
    return false;
  }
  fs.writeFileSync(hooksPath, next);
  write("cursor-bridge", "hooks.json dist entries removed", "info", { path: hooksPath });
  return true;
}

/**
 * Restore `.cursor/hooks.json` from the project snapshot when the file still
 * matches what wear wrote. Without a snapshot, remove dist entries anyway.
 * If the user edited the file after wear, warn and remove only those entries.
 */
function unwearCursorHooks(targetDir, log) {
  const write = typeof log === "function" ? log : () => {};
  const resolvedTarget = path.resolve(targetDir);
  const paths = wearStatePaths(resolvedTarget);
  const cursor = path.join(resolvedTarget, ".cursor");
  const hooksPath = path.join(cursor, "hooks.json");
  if (!fs.existsSync(paths.meta)) return stripHooksWithoutSnapshot(hooksPath, write);
  const meta = JSON.parse(fs.readFileSync(paths.meta, "utf8"));
  const current = fs.existsSync(hooksPath) ? fs.readFileSync(hooksPath) : null;
  const written = fs.existsSync(paths.written) ? fs.readFileSync(paths.written) : null;
  const unchanged = Boolean(current && written && current.equals(written));
  if (unchanged && meta.existed && fs.existsSync(paths.backup)) {
    fs.copyFileSync(paths.backup, hooksPath);
  } else if (unchanged && !meta.existed) {
    if (fs.existsSync(hooksPath)) fs.unlinkSync(hooksPath);
  } else if (current) {
    if (unchanged) {
      process.stderr.write(`cursor-wear: ${hooksPath} backup missing; removing only 0xray dist entries\n`);
    } else {
      process.stderr.write(
        `cursor-wear: ${hooksPath} changed after wear; keeping those edits and removing only 0xray dist entries\n`,
      );
    }
    try {
      fs.writeFileSync(hooksPath, stripOwnedHookEntries(current.toString("utf8")));
    } catch (err) {
      process.stderr.write(
        `cursor-wear: ${hooksPath} changed after wear and could not be parsed (${err.message}); left it unchanged\n`,
      );
    }
  }
  const also = meta.also || [];
  fs.rmSync(paths.dir, { recursive: true, force: true });
  if (unchanged && !meta.cursorDirExisted) removeDirIfEmpty(cursor);
  for (const extra of also) unwearCursorHooks(extra, write);
  write("cursor-bridge", "hooks.json restored", "info", { path: hooksPath });
  return true;
}

function installCursorBridge(targetDir, packageRoot, log) {
  const consumerDist = isConsumerInstall(packageRoot, targetDir) && consumerDistHooksReady(packageRoot);
  const dest = consumerDist
    ? wearCursorHooks(targetDir, packageRoot, log)
    : fastenCursorHooksAt(targetDir, packageRoot, log);
  if (!consumerDist) {
    const workspace = resolveCursorWorkspaceRoot(targetDir);
    if (workspace && path.resolve(workspace) !== path.resolve(targetDir)) {
      fastenCursorHooksAt(workspace, packageRoot, log);
    }
  }
  reloadCursorHostHooks(log);
  return dest;
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
 * Framework dogfood: do not deploy consumer copies over the package,
 * but keep Grok discovery hooks hot and enable Repertoire when it resolves.
 */
function installFrameworkDogfoodWear(packageRoot, log) {
  const featuresPath = path.join(packageRoot, ".xray", "features.json");
  if (fs.existsSync(featuresPath)) {
    applyResolvedMemoryRouting(featuresPath, packageRoot);
  }

  installCursorBridge(packageRoot, packageRoot, log);

  const sourceDir = findGrokPluginSource(packageRoot);
  const pluginDest = path.join(packageRoot, ".grok", "plugins", "0xray");
  if (!sourceDir) {
    log("grok-dogfood", "skipped", "warn", { reason: "grok plugin source missing" });
    return;
  }
  const hooksJson = path.join(pluginDest, "hooks", "hooks.json");
  if (!fs.existsSync(hooksJson)) {
    copyPluginDir(sourceDir, pluginDest);
  }
  patchGrokHooks(pluginDest, packageRoot, packageRoot, log, "grok-dogfood");
}

/**
 * Install 4 chat bridges plus Cursor project hooks for a consumer project.
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

  wearVendoredRepertoire(packageRoot, targetDir, log);

  if (!isConsumerInstall(packageRoot, targetDir)) {
    log("install-bridges", "framework dogfood wear", "info");
    installFrameworkDogfoodWear(packageRoot, log);
    return;
  }

  log("install-bridges", "starting 4-platform + cursor wear", "info");

  deployXrayConfig(targetDir, packageRoot, log);
  deployProjectMcpJson(targetDir, log);
  mergeOpencodeJson(targetDir, packageRoot, log);
  installOpencodeBridge(targetDir, packageRoot, log);
  installGrokBridge(targetDir, packageRoot, log);
  installHermesBridge(targetDir, packageRoot, log);
  installOpenclawBridge(targetDir, packageRoot, log);
  installCursorBridge(targetDir, packageRoot, log);
  installGitHooks(packageRoot, log);

  log("install-bridges", "4-platform + cursor wear complete", "success");
}

module.exports = {
  installAllBridges,
  installGrokBridge,
  resolveGrokPluginDests,
  resolveConsumerTargetDir,
  isInstallPrefixTarget,
  syncBuiltinSkills,
  isConsumerInstall,
  deployXrayConfig,
  deployXrayConfigFile,
  resolveXrayConfigSource,
  XRAY_CONFIG_FILES,
  MERGE_CONFIG_FILES,
  patchGrokHooks,
  grokHookShellCommand,
  writeGrokDiscoveredHooks,
  isEphemeralInstallRoot,
  isIsolatedHome,
  installFrameworkDogfoodWear,
  wearVendoredRepertoire,
  installCursorBridge,
  mergeOpencodeJson,
  copyOpencodePlugin,
  parseExecDaemonCmdline,
  reloadCursorHostHooks,
  resolveCursorHooksTemplate,
  resolveCursorWorkspaceRoot,
  fastenCursorHooksAt,
  resolveCursorHookScriptDir,
  fastenCursorHookScripts,
  mergeCloudSafeCursorHooks,
  isEnvAssignmentCursorCommand,
  CURSOR_HOOK_SCRIPTS,
  CURSOR_HOOK_EVENTS,
  CLOUD_SAFE_CURSOR_HOOKS,
  wearCursorHooks,
  unwearCursorHooks,
  mergeInstalledCursorHooks,
  isXrayHookCommand,
  installedHookCommand,
  consumerDistHooksReady,
};