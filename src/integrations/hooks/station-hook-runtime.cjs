/**
 * Station heat — compaction / host-swap card.
 * SSOT remains session-boot.json. STATION.md is the projection the model Reads.
 * Grok ignores SessionStart/UserPromptSubmit stdout; disk + AGENTS.md is the contract.
 * Heat writers merge stock fields; unknown keys and ## Durable / ## Seed survive.
 */
const { execFileSync } = require("child_process");
const { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
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

function destSignalsPath(root) {
  return join(root, ".xray", "state", "repertoire", "curated_signals.json");
}

function notesPath(root) {
  return join(root, ".xray", "state", "NOTES.md");
}

function repertoirePackageRoots(root) {
  const candidates = [
    join(root, "node_modules", "@0xray", "repertoire"),
    join(root, "..", "repertoire"),
    join(root, "vendor", "@0xray", "repertoire"),
  ];
  const out = [];
  for (const pkgRoot of candidates) {
    const pkgFile = join(pkgRoot, "package.json");
    if (!existsSync(pkgFile)) continue;
    try {
      const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
      if (pkg.name === "@0xray/repertoire" || pkg.name === "repertoire") out.push(pkgRoot);
    } catch {
      /* skip */
    }
  }
  return out;
}

function repertoireDataFile(root, fileName) {
  for (const pkgRoot of repertoirePackageRoots(root)) {
    const dest = join(pkgRoot, "data", fileName);
    if (existsSync(dest)) return dest;
  }
  return null;
}

function readSignalRecords(filePath) {
  if (!filePath || !existsSync(filePath)) return [];
  try {
    const data = JSON.parse(readFileSync(filePath, "utf8"));
    const signals = Array.isArray(data.signals) ? data.signals : [];
    return signals.filter((signal) => signal && String(signal.name || "").trim());
  } catch {
    return [];
  }
}

function signalNameSet(filePath) {
  return new Set(readSignalRecords(filePath).map((signal) => String(signal.name).trim()));
}

function mergeMissingSignals(destPath, incoming) {
  if (!incoming.length || !existsSync(destPath)) return 0;
  let data;
  try {
    data = JSON.parse(readFileSync(destPath, "utf8"));
  } catch {
    return 0;
  }
  if (!Array.isArray(data.signals)) return 0;
  const have = new Set(
    data.signals.map((signal) => String((signal && signal.name) || "").trim()).filter(Boolean),
  );
  let added = 0;
  for (const signal of incoming) {
    const name = String(signal.name).trim();
    if (!name || have.has(name)) continue;
    data.signals.push(signal);
    have.add(name);
    added += 1;
  }
  if (added) writeFileSync(destPath, `${JSON.stringify(data, null, 2)}\n`);
  return added;
}

/** Hydrate project dest from seed + stack + subject overlays. Never write the tarball. */
function hydrateDestOnWake(root) {
  const dest = destSignalsPath(root);
  const seed = repertoireDataFile(root, "curated_signals.json");
  if (!existsSync(dest) && seed) {
    mkdirSync(join(root, ".xray", "state", "repertoire"), { recursive: true });
    copyFileSync(seed, dest);
  }
  if (!existsSync(dest)) return { dest: null, added: 0, destCount: 0 };
  const added =
    mergeMissingSignals(dest, readSignalRecords(repertoireDataFile(root, "stack-overlay.json"))) +
    mergeMissingSignals(dest, readSignalRecords(repertoireDataFile(root, "subject-overlay.json")));
  return { dest, added, destCount: countCuratedSignals(dest) || 0 };
}

function readNotesPickup(root) {
  const dest = notesPath(root);
  if (!existsSync(dest)) return null;
  try {
    const text = readFileSync(dest, "utf8");
    const match = text.match(/\*\*Pickup line:\*\*\s*([^\n]+)/);
    return clipIntent(match && match[1] ? match[1] : null);
  } catch {
    return null;
  }
}

function readLatestSessionApproaches(root) {
  const latest = join(root, "docs", "inference", "latest-session.json");
  if (!existsSync(latest)) return null;
  try {
    const data = JSON.parse(readFileSync(latest, "utf8"));
    const approaches = Array.isArray(data.approaches) ? data.approaches : [];
    return clipIntent(approaches.filter(Boolean).join(" "));
  } catch {
    return null;
  }
}

function sessionCaptureStampPath(root) {
  return join(root, ".xray", "state", "session-capture-stamp.json");
}

function readSessionCaptureConfig(root) {
  let cfg = {};
  try {
    cfg = JSON.parse(readFileSync(join(root, ".xray", "features.json"), "utf8")).inference_session_capture || {};
  } catch {
    cfg = {};
  }
  return {
    enabled: cfg.enabled === true,
    minCommits: typeof cfg.min_commits === "number" && cfg.min_commits > 0 ? cfg.min_commits : 3,
    lookback: typeof cfg.lookback_commits === "number" && cfg.lookback_commits > 0 ? cfg.lookback_commits : 20,
  };
}

function gitCommitSubjects(root, args) {
  try {
    const out = execFileSync("git", ["log", "--format=%h||%s", "--no-merges", ...args], {
      cwd: root,
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return String(out)
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const idx = line.indexOf("||");
        return {
          hash: idx === -1 ? line : line.slice(0, idx),
          message: idx === -1 ? "" : line.slice(idx + 2),
        };
      });
  } catch {
    return [];
  }
}

/** Every floor that heats. Dedup per HEAD. Cursor-only copy was the leftover. */
function maybeCaptureSessionOnHeadMove(root) {
  const cfg = readSessionCaptureConfig(root);
  if (!cfg.enabled) return null;
  const git = readGitBrief(root);
  if (!git || !git.head) return null;
  let stamp = null;
  try {
    stamp = JSON.parse(readFileSync(sessionCaptureStampPath(root), "utf8"));
  } catch {
    stamp = null;
  }
  if (stamp && stamp.head === git.head) return null;
  const commits = stamp && stamp.head
    ? gitCommitSubjects(root, [`${stamp.head}..HEAD`])
    : gitCommitSubjects(root, ["-n", String(cfg.lookback)]);
  if (commits.length < cfg.minCommits) return null;
  const sessionId = `session-${new Date().toISOString().slice(0, 10)}-${git.head}`;
  const approaches = commits.map((row) => row.message).filter(Boolean);
  const session = {
    sessionId,
    timestamp: new Date().toISOString(),
    span: {
      from: stamp && stamp.head ? stamp.head : `HEAD~${cfg.lookback}`,
      to: git.head,
    },
    problems: [],
    approaches,
    wrongTurns: [],
    solutions: [],
    patterns: [],
    matched_primitives: [],
    metrics: { commits: commits.length },
  };
  const outDir = join(root, "docs", "inference");
  mkdirSync(outDir, { recursive: true });
  const filePath = join(outDir, `session-${sessionId.replace(/^session-/, "")}.json`);
  writeFileSync(filePath, `${JSON.stringify(session, null, 2)}\n`);
  writeFileSync(join(outDir, "latest-session.json"), `${JSON.stringify(session, null, 2)}\n`);
  mkdirSync(join(root, ".xray", "state"), { recursive: true });
  writeFileSync(
    sessionCaptureStampPath(root),
    `${JSON.stringify({ head: git.head, sessionId, path: filePath, updatedAt: session.timestamp }, null, 2)}\n`,
  );
  return filePath;
}

/** Overlay + factory names on dest. Subject repo-* stay off this list. */
function readOpProcNames(root) {
  const dest = destSignalsPath(root);
  if (!existsSync(dest)) return [];
  const factory = signalNameSet(repertoireDataFile(root, "curated_signals.json"));
  const stack = signalNameSet(repertoireDataFile(root, "stack-overlay.json"));
  const filter = factory.size || stack.size;
  try {
    const data = JSON.parse(readFileSync(dest, "utf8"));
    if (!Array.isArray(data.signals)) return [];
    const names = [];
    for (const signal of data.signals) {
      const name = String(signal && signal.name ? signal.name : "").trim();
      if (!name || name.toLowerCase().startsWith("bedrock-")) continue;
      if (name.toLowerCase().startsWith("repo-")) continue;
      if (filter && !factory.has(name) && !stack.has(name)) continue;
      names.push(name);
    }
    return names;
  } catch {
    return [];
  }
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
  const destPath = destSignalsPath(root);
  let signalsPath = existsSync(destPath) ? destPath : mr.config && mr.config.signalsPath;
  if (signalsPath && signalsPath !== destPath && !signalsPath.startsWith("/") && !/^[A-Za-z]:[\\/]/.test(signalsPath)) {
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
  const hydrate = hydrateDestOnWake(root);
  const captured = maybeCaptureSessionOnHeadMove(root);
  const pickup = readNotesPickup(root);
  const approaches = readLatestSessionApproaches(root);
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
  const matchText = clipIntent([intent, pickup, approaches].filter(Boolean).join(" "));
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
  const destCount = hydrate.destCount || (existsSync(destSignalsPath(root)) ? countCuratedSignals(destSignalsPath(root)) : 0);
  if (!matchedSignals.length && matchText) {
    if (
      priorWorking &&
      priorWorking.matchText === matchText &&
      priorWorking.destCount === destCount &&
      Array.isArray(priorWorking.matchedSignals) &&
      priorWorking.matchedSignals.length
    ) {
      matchedSignals = stationSafeSignals(priorWorking.matchedSignals);
    } else {
      matchedSignals = stationSafeSignals(matchStationSignalsSync(root, matchText));
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
    destCount,
  };
  if (pickup) workingSnapshot.pickup = pickup;
  if (matchText) workingSnapshot.matchText = matchText;
  if (captured) workingSnapshot.sessionCapture = captured;
  if (matchedSignals.length) workingSnapshot.matchedSignals = matchedSignals;
  const opProcNames = readOpProcNames(root);
  if (opProcNames.length) workingSnapshot.opProcNames = opProcNames;
  const working = persistRepertoireWorking(root, workingSnapshot);
  const pickupChanged = Boolean(pickup && (!priorWorking || priorWorking.pickup !== pickup));
  if (
    matchedSignals.length &&
    (isCompactHook(extra) || hydrate.added > 0 || pickupChanged)
  ) {
    ingestCompactFeedbackSync(
      root,
      typeof extra.sessionId === "string" ? extra.sessionId : "station",
      extra.hookEvent || extra.source || (isCompactHook(extra) ? "post_compact" : "wake"),
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

const STOCK_STATION_PREFIXES = [
  "hot-swap:",
  "host:",
  "intent:",
  "plan:",
  "git:",
  "repertoire:",
  "working:",
];

const STOCK_STATION_FOOTERS = [
  "continue this card. compaction and host change are the same cut. do not cold-start.",
  "grok does not inject this file — read it. opencode injects. do not thicken the grok exo.",
];

function isDurableStationHeading(line) {
  return /^##\s+(durable|seed)\b/i.test(String(line || "").trim());
}

/** Durable is identity. Hold/ship lives in mill-gate — not on the card. */
function isHoldNpmLine(line) {
  return /\bhold\s+npm\b/i.test(String(line || "").trim());
}

function stripHoldNpm(line) {
  return String(line || "")
    .replace(/\s*hold\s+npm\.?/gi, "")
    .replace(/[ \t]+$/g, "");
}

function stationDurableHoldsNpm(root) {
  return readExistingStationMarkdown(root)
    .split(/\r?\n/)
    .some((line) => isHoldNpmLine(line));
}

function isStockStationLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed) return true;
  if (/^#\s+station\s*$/i.test(trimmed)) return true;
  const lower = trimmed.toLowerCase();
  if (STOCK_STATION_FOOTERS.includes(lower)) return true;
  return STOCK_STATION_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/** Keep unknown keys and ## Durable / ## Seed blocks across heat rewrites. */
function extractPreservedStationLines(existing) {
  if (!existing || typeof existing !== "string") return [];
  const preserved = [];
  let inDurable = false;
  for (const line of existing.split(/\r?\n/)) {
    if (isDurableStationHeading(line)) {
      inDurable = true;
      preserved.push(line);
      continue;
    }
    if (inDurable) {
      const trimmed = String(line || "").trim();
      const otherHeading = /^##\s+\S/.test(trimmed) && !isDurableStationHeading(line);
      // Stock prefixes, blank lines, and stock footers close the section.
      // Otherwise Seed swallows Compact/Usage/footers and each heat pastes another footer.
      if (otherHeading || isStockStationLine(line)) {
        inDurable = false;
      } else {
        const durableLine = stripHoldNpm(line);
        if (durableLine.trim()) preserved.push(durableLine);
        continue;
      }
    }
    if (isStockStationLine(line)) continue;
    const kept = stripHoldNpm(line);
    if (kept.trim()) preserved.push(kept);
  }
  while (preserved.length && !preserved[0].trim()) preserved.shift();
  while (preserved.length && !preserved[preserved.length - 1].trim()) preserved.pop();
  return preserved;
}

function mergeStationMarkdown(stockMd, existingMd) {
  const preserved = extractPreservedStationLines(existingMd);
  if (!preserved.length) return stockMd;
  const stock = String(stockMd || "");
  const block = preserved.join("\n");
  const marker = "Continue this card.";
  const idx = stock.indexOf(marker);
  if (idx === -1) {
    return `${stock.replace(/\s*$/, "")}\n\n${block}\n`;
  }
  const head = stock.slice(0, idx).replace(/\s*$/, "");
  const foot = stock.slice(idx);
  return `${head}\n\n${block}\n\n${foot}`;
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

function readExistingStationMarkdown(root) {
  const dest = stationMarkdownPath(root);
  if (!existsSync(dest)) return "";
  try {
    return readFileSync(dest, "utf8");
  } catch {
    return "";
  }
}

function writeStationMarkdown(root, fields) {
  try {
    const dir = join(root, ".xray", "state");
    mkdirSync(dir, { recursive: true });
    const dest = stationMarkdownPath(root);
    const next = mergeStationMarkdown(formatStationMarkdown(fields), readExistingStationMarkdown(root));
    writeFileSync(dest, next);
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
  readOpProcNames,
  hydrateDestOnWake,
  readNotesPickup,
  maybeCaptureSessionOnHeadMove,
  formatWorkingLine,
  applyStationHeat,
  extractPreservedStationLines,
  mergeStationMarkdown,
  formatStationMarkdown,
  writeStationMarkdown,
  isHoldNpmLine,
  stationDurableHoldsNpm,
};
