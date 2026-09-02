/**
 * Station heat — compaction / host-swap card.
 * SSOT remains session-boot.json. STATION.md is the projection the model Reads.
 * Grok ignores SessionStart/UserPromptSubmit stdout; disk + AGENTS.md is the contract.
 */
const { execFileSync } = require("child_process");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const HOOKS_DIR = __dirname;

const INTENT_MAX = 240;

function stationMarkdownPath(root) {
  return join(root, ".xray", "state", "STATION.md");
}

function sessionBootPath(root) {
  return join(root, ".xray", "state", "session-boot.json");
}

function clipIntent(raw) {
  if (raw == null) return null;
  const text = String(raw)
    .replace(/<\/?user_query>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if (text.length <= INTENT_MAX) return text;
  return `${text.slice(0, INTENT_MAX - 1)}…`;
}

function readExistingBoot(root) {
  const bootPath = sessionBootPath(root);
  if (!existsSync(bootPath)) return {};
  try {
    const data = JSON.parse(readFileSync(bootPath, "utf8"));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function readGitBrief(root) {
  try {
    const opts = { cwd: root, encoding: "utf8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"] };
    const head = execFileSync("git", ["rev-parse", "--short", "HEAD"], opts).trim();
    const branch = execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], opts).trim();
    if (!head) return null;
    return { branch: branch || "HEAD", head };
  } catch {
    return null;
  }
}

function readGitSubject(root) {
  try {
    const opts = { cwd: root, encoding: "utf8", timeout: 2000, stdio: ["ignore", "pipe", "ignore"] };
    const subject = execFileSync("git", ["log", "-1", "--format=%s"], opts).trim();
    return clipIntent(subject);
  } catch {
    return null;
  }
}

function readLiveTodoLine(plan) {
  const phases = Array.isArray(plan.phases) ? plan.phases : [];
  for (const phase of phases) {
    const todos = Array.isArray(phase && phase.todos) ? phase.todos : [];
    for (const todo of todos) {
      const status = String((todo && todo.status) || "pending");
      if (status === "completed" || status === "cancelled") continue;
      const task = clipIntent((todo && (todo.task || todo.description)) || "");
      if (task) return task;
    }
  }
  return null;
}

function readPlanLine(root) {
  const planPath = join(root, ".xray", "state", "lead-dev-plan.json");
  if (existsSync(planPath)) {
    try {
      const plan = JSON.parse(readFileSync(planPath, "utf8"));
      if (plan && plan.active !== false) {
        const live = readLiveTodoLine(plan);
        if (live) return live;
      }
    } catch {
      /* fall through to git subject — stale / empty plan is not the card */
    }
  }
  return readGitSubject(root);
}

function resolveRepertoireProviderModule(root) {
  const mr = readMemoryRoutingConfig(root);
  if (mr && typeof mr.module_path === "string" && mr.module_path) {
    const configured = mr.module_path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(mr.module_path)
      ? mr.module_path
      : join(root, mr.module_path);
    if (existsSync(configured)) return configured;
  }
  const siblingRoot = join(root, "..", "repertoire");
  const siblingProvider = join(siblingRoot, "dist", "provider", "memory-routing-provider.js");
  const nmProvider = join(
    root,
    "node_modules",
    "@0xray",
    "repertoire",
    "dist",
    "provider",
    "memory-routing-provider.js",
  );
  const vendorProvider = join(
    root,
    "vendor",
    "@0xray",
    "repertoire",
    "dist",
    "provider",
    "memory-routing-provider.js",
  );
  if (existsSync(nmProvider)) return nmProvider;
  if (existsSync(vendorProvider)) return vendorProvider;
  try {
    const pkg = JSON.parse(readFileSync(join(siblingRoot, "package.json"), "utf8"));
    if ((pkg.name === "@0xray/repertoire" || pkg.name === "repertoire") && existsSync(siblingProvider)) {
      return siblingProvider;
    }
  } catch {
    /* sibling missing */
  }
  return null;
}

function countCuratedSignals(signalsPath) {
  try {
    const data = JSON.parse(readFileSync(signalsPath, "utf8"));
    if (Array.isArray(data.signals)) return data.signals.length;
    if (Array.isArray(data)) return data.length;
  } catch {
    /* unreadable */
  }
  return null;
}

function readMemoryRoutingConfig(root) {
  const featuresPath = join(root, ".xray", "features.json");
  if (!existsSync(featuresPath)) return {};
  try {
    return JSON.parse(readFileSync(featuresPath, "utf8")).memory_routing || {};
  } catch {
    return {};
  }
}

function isExplicitMemoryRoutingOptOut(mr) {
  return Boolean(mr) && mr.enabled === false && mr.provider === "repertoire";
}

function isLeftoverMemoryRoutingOff(mr) {
  if (!mr || typeof mr !== "object") return true;
  if (mr.enabled === true) return false;
  if (isExplicitMemoryRoutingOptOut(mr)) return false;
  const provider = mr.provider == null || mr.provider === "" ? "null" : mr.provider;
  return provider === "null";
}

function isMemoryRoutingResolvedOn(mr, modulePath) {
  if (!modulePath) return false;
  if (isExplicitMemoryRoutingOptOut(mr)) return false;
  if (mr.enabled === true && (mr.provider === "repertoire" || mr.provider === "custom")) return true;
  return isLeftoverMemoryRoutingOff(mr);
}

function repertoireWorkingPath(root) {
  return join(root, ".xray", "state", "repertoire-working.json");
}

function readRepertoireWorking(root) {
  const dest = repertoireWorkingPath(root);
  if (!existsSync(dest)) return null;
  try {
    const data = JSON.parse(readFileSync(dest, "utf8"));
    return data && typeof data === "object" ? data : null;
  } catch {
    return null;
  }
}

function stationSafeSignals(names) {
  if (!Array.isArray(names)) return [];
  const out = [];
  for (const raw of names) {
    const name = String(raw || "").trim();
    if (!name) continue;
    if (name.toLowerCase().startsWith("bedrock-")) continue;
    out.push(name);
    if (out.length >= 4) break;
  }
  return out;
}

function persistRepertoireWorking(root, snapshot) {
  try {
    mkdirSync(join(root, ".xray", "state"), { recursive: true });
    const prev = readRepertoireWorking(root) || {};
    const next = { ...prev, ...snapshot, updatedAt: new Date().toISOString() };
    writeFileSync(repertoireWorkingPath(root), `${JSON.stringify(next, null, 2)}\n`);
    return next;
  } catch {
    return null;
  }
}

function matchStationSignalsSync(root, intent) {
  if (!intent) return [];
  const helper = join(HOOKS_DIR, "station-memory-match.mjs");
  if (!existsSync(helper)) return [];
  try {
    const out = execFileSync(process.execPath, [helper, root, intent], {
      encoding: "utf8",
      timeout: 20000,
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });
    const line = String(out).trim().split("\n").filter(Boolean).at(-1) || "[]";
    const parsed = JSON.parse(line);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function ingestCompactFeedbackSync(root, sessionId, hookEvent, signals) {
  if (!signals.length) return;
  const helper = join(HOOKS_DIR, "station-memory-ingest.mjs");
  if (!existsSync(helper)) return;
  try {
    execFileSync(
      process.execPath,
      [helper, root, sessionId || "station", hookEvent || "post_compact", JSON.stringify(signals)],
      {
        encoding: "utf8",
        timeout: 20000,
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env,
      },
    );
  } catch {
    /* working-state file is the session memory; registry ingest is best-effort */
  }
}

function isCompactHook(extra) {
  const hook = String(extra.hookEvent || extra.source || "");
  return /compact/i.test(hook);
}

function formatWorkingLine(working) {
  if (!working || typeof working !== "object") return null;
  const matched = stationSafeSignals(working.matchedSignals);
  if (matched.length) return `Working: ${matched.join(", ")}`;
  const hook = typeof working.hookEvent === "string" ? working.hookEvent : null;
  const head = working.git && working.git.head ? String(working.git.head) : null;
  if (hook && head) return `Working: last ${hook} @ ${head}`;
  if (hook) return `Working: last ${hook}`;
  return "Working: station snapshot";
}

function buildRepertoireResume(root) {
  const modulePath = resolveRepertoireProviderModule(root);
  const mr = readMemoryRoutingConfig(root);
  if (!modulePath) {
    return "Repertoire: not installed (memory_routing stays off)";
  }
  let signalsPath = mr.config && mr.config.signalsPath;
  if (signalsPath && !signalsPath.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(signalsPath)) {
    signalsPath = join(root, signalsPath);
  }
  if (!signalsPath) {
    signalsPath = join(modulePath, "..", "..", "..", "data", "curated_signals.json");
  }
  const n = existsSync(signalsPath) ? countCuratedSignals(signalsPath) : null;
  const count = n == null ? "" : ` — ${n} signals`;
  if (isMemoryRoutingResolvedOn(mr, modulePath)) {
    return `Repertoire: on${count}`;
  }
  return `Repertoire: present, memory_routing off${count}`;
}

function applyStationHeat(root, host, extra = {}, existing = {}) {
  const prevHost = typeof existing.host === "string" ? existing.host : null;
  const nextSwap = prevHost && host && prevHost !== host ? { from: prevHost, to: host } : null;
  const keptSwap =
    existing.hotSwap &&
    typeof existing.hotSwap === "object" &&
    existing.hotSwap.from &&
    existing.hotSwap.to
      ? existing.hotSwap
      : null;
  const hotSwap = nextSwap || keptSwap;
  const intent =
    clipIntent(extra.intent || extra.prompt || extra.userMessage || extra.user_prompt) ||
    (typeof existing.intent === "string" ? existing.intent : null);
  const git = readGitBrief(root);
  const planLine = readPlanLine(root);
  const repertoireResume =
    typeof extra.repertoireResume === "string" ? extra.repertoireResume : buildRepertoireResume(root);
  const swapBit = hotSwap ? `hot-swap ${hotSwap.from} → ${hotSwap.to}` : `host ${host}`;
  const intentBit = intent ? `intent: ${intent}` : "intent: (none yet)";
  const gitBit = git ? `git ${git.branch}@${git.head}` : "git: n/a";
  const planBit = planLine ? `plan: ${planLine}` : "plan: (none)";
  let matchedSignals = stationSafeSignals(extra.matchedSignals);
  const priorWorking = readRepertoireWorking(root);
  if (!matchedSignals.length && intent) {
    if (
      priorWorking &&
      priorWorking.intent === intent &&
      Array.isArray(priorWorking.matchedSignals) &&
      priorWorking.matchedSignals.length
    ) {
      matchedSignals = stationSafeSignals(priorWorking.matchedSignals);
    } else {
      matchedSignals = stationSafeSignals(matchStationSignalsSync(root, intent));
    }
  }
  if (!matchedSignals.length && priorWorking) {
    matchedSignals = stationSafeSignals(priorWorking.matchedSignals);
  }
  const workingSnapshot = {
    host,
    intent,
    git,
    hotSwap,
    hookEvent: extra.hookEvent || extra.source || null,
    memoryRouting: repertoireResume.startsWith("Repertoire: on") ? "on" : "off",
    repertoireResume,
  };
  if (matchedSignals.length) workingSnapshot.matchedSignals = matchedSignals;
  const working = persistRepertoireWorking(root, workingSnapshot);
  if (isCompactHook(extra) && matchedSignals.length) {
    ingestCompactFeedbackSync(
      root,
      typeof extra.sessionId === "string" ? extra.sessionId : "station",
      extra.hookEvent || extra.source || "post_compact",
      matchedSignals,
    );
  }
  const workingLine = formatWorkingLine(working);
  const workingBit = workingLine ? workingLine : "working: (none)";
  const stationLine = `${swapBit}. ${intentBit}. ${planBit}. ${gitBit}. ${repertoireResume}. ${workingBit}`;
  return {
    lastHost: prevHost,
    hotSwap,
    intent,
    git,
    planLine,
    repertoireResume,
    workingLine,
    stationLine,
  };
}

function formatStationMarkdown(fields) {
  const host = fields.host || "unknown";
  const profile = fields.suit_profile || "guided";
  const lines = ["# Station", ""];
  if (fields.hotSwap && fields.hotSwap.from && fields.hotSwap.to) {
    lines.push(`Hot-swap: ${fields.hotSwap.from} → ${fields.hotSwap.to}`);
  }
  lines.push(`Host: ${host} (${profile})`);
  lines.push(`Intent: ${fields.intent || "(none yet)"}`);
  lines.push(`Plan: ${fields.planLine || "(none)"}`);
  if (fields.git && fields.git.head) {
    lines.push(`Git: ${fields.git.branch}@${fields.git.head}`);
  } else {
    lines.push("Git: n/a");
  }
  lines.push(fields.repertoireResume || "Repertoire: not installed (memory_routing stays off)");
  if (fields.workingLine) {
    lines.push(fields.workingLine);
  }
  lines.push("");
  lines.push("Continue this card. Compaction and host change are the same cut. Do not cold-start.");
  lines.push("Grok does not inject this file — Read it. OpenCode injects. Do not thicken the Grok exo.");
  lines.push("");
  return lines.join("\n");
}

function writeStationMarkdown(root, fields) {
  try {
    const dir = join(root, ".xray", "state");
    mkdirSync(dir, { recursive: true });
    const dest = stationMarkdownPath(root);
    writeFileSync(dest, formatStationMarkdown(fields));
    return dest;
  } catch {
    return null;
  }
}

module.exports = {
  stationMarkdownPath,
  sessionBootPath,
  clipIntent,
  readExistingBoot,
  readGitBrief,
  readGitSubject,
  readPlanLine,
  buildRepertoireResume,
  isExplicitMemoryRoutingOptOut,
  isLeftoverMemoryRoutingOff,
  persistRepertoireWorking,
  readRepertoireWorking,
  formatWorkingLine,
  applyStationHeat,
  formatStationMarkdown,
  writeStationMarkdown,
};
