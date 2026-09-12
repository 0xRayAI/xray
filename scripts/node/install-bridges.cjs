#!/usr/bin/env node
/**
 * install-bridges.cjs — Unified 4-platform bridge installer for consumer postinstall.
 * Mirrors npx 0xray {opencode,grok,hermes,openclaw} install in one synchronous pass.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
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
  const shouldCopy =
    !fs.existsSync(pluginDest) ||
    fs.statSync(pluginSource).mtime > fs.statSync(pluginDest).mtime;
  if (shouldCopy) {
    fs.copyFileSync(pluginSource, pluginDest);
    log("opencode-bridge", "plugin updated", "info");
  }
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

  wearVendoredRepertoire(packageRoot, targetDir, log);

  if (!isConsumerInstall(packageRoot, targetDir)) {
    log("install-bridges", "framework dogfood wear", "info");
    installFrameworkDogfoodWear(packageRoot, log);
    return;
  }

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
};