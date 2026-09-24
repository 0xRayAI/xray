/**
 * Station heat — compaction / host-swap card.
 * STATION.md is the pickup ticket. session-boot.json is the snapshot.
 * Heat must not paint leftover boot extras onto the card.
 * Grok ignores SessionStart/UserPromptSubmit stdout; disk + AGENTS.md is the contract.
 * Heat writers merge stock fields; unknown keys and ## Durable / ## Seed survive.
 */
const { execFileSync } = require("child_process");
const {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} = require("fs");
const { join } = require("path");

const HOOKS_DIR = __dirname;
const { plateStockLine } = require("./plates.cjs");

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

function isStockTicket(value) {
  const text = String(value || "").trim().toLowerCase();
  return !text || text === "(none)" || text === "(none yet)";
}

function readStationTicketField(root, field) {
  const md = readExistingStationMarkdown(root);
  const re = field === "Plan" ? /^Plan:\s*(.*)$/im : /^Intent:\s*(.*)$/im;
  const match = md.match(re);
  if (!match) return null;
  const value = clipIntent(match[1]);
  if (!value || isStockTicket(value)) return null;
  return value;
}

function bootHeadMoved(root, existing) {
  const live = readGitBrief(root);
  const bootHead = existing && existing.git && existing.git.head ? String(existing.git.head) : "";
  return Boolean(live && live.head && bootHead && bootHead !== live.head);
}

/** Live ticket beats leftover boot. Extra spoken intent still wins. */
function resolveHeatIntent(root, extra, existing) {
  const incoming = clipIntent(
    extra.intent || extra.prompt || extra.userMessage || extra.user_prompt,
  );
  if (incoming) return { intent: incoming, rematch: true };
  const card = readStationTicketField(root, "Intent");
  const pickup = clipIntent(readNotesPickup(root));
  const bootIntent = typeof existing.intent === "string" ? clipIntent(existing.intent) : null;
  const cardIsBootEcho = Boolean(card && bootIntent && card === bootIntent);
  if (pickup && cardIsBootEcho && pickup !== bootIntent) {
    return { intent: pickup, rematch: true };
  }
  if (card && !cardIsBootEcho) return { intent: card, rematch: card !== bootIntent };
  if (pickup && pickup !== bootIntent) return { intent: pickup, rematch: true };
  if (card) return { intent: card, rematch: false };
  if (bootIntent) return { intent: bootIntent, rematch: false };
  const git = readGitSubject(root);
  return { intent: git, rematch: Boolean(git) };
}

function resolveHeatPlan(root, extra, existing) {
  const incoming = clipIntent(extra.plan || extra.planLine);
  if (incoming) return incoming;
  const card = readStationTicketField(root, "Plan");
  const bootPlan = typeof existing.planLine === "string" ? clipIntent(existing.planLine) : null;
  const live = readPlanLine(root);
  const cardIsBootEcho = Boolean(card && bootPlan && card === bootPlan);
  if (card && !cardIsBootEcho) return card;
  if (bootHeadMoved(root, existing) && bootPlan && live === bootPlan) {
    return readGitSubject(root) || card || live;
  }
  if (card) return card;
  return live;
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

function isKeywordDestName(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return true;
  if (n.startsWith("repo-") || n.startsWith("bedrock-")) return true;
  if (n === "test-expansion" || n === "dead-code-removal" || n === "station-heat") return true;
  if (/^release-v?\d/.test(n) || /^stamp-/.test(n) || /^drop-stale-/.test(n)) return true;
  if (/\b4-0-\d{2}\b/.test(n) && /npm|package-lock|release|stamp/.test(n)) return true;
  return false;
}

function isGenericFieldObservedSignal(signal) {
  const definition = String((signal && signal.definition) || "");
  return /field-observed domain primitive/i.test(definition);
}

function stationSafeSignals(names) {
  if (!Array.isArray(names)) return [];
  const out = [];
  for (const raw of names) {
    const name = String(raw || "").trim();
    if (!name || isKeywordDestName(name)) continue;
    out.push(name);
    if (out.length >= 4) break;
  }
  return out;
}

/** Laws only. Hangar repo-* and git-slug keywords stay off the card. */
function preferLawHits(names, cap = 8) {
  if (!Array.isArray(names)) return [];
  const unique = [];
  for (const raw of names) {
    const name = String(raw || "").trim();
    if (!name || isKeywordDestName(name)) continue;
    if (unique.includes(name)) continue;
    unique.push(name);
  }
  return unique.slice(0, cap);
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
    join(root, "vendor", "@0xray", "repertoire"),
    join(root, "..", "repertoire"),
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

function destLawNameSet(root) {
  const names = new Set();
  for (const fileName of ["curated_signals.json", "stack-overlay.json"]) {
    for (const name of signalNameSet(repertoireDataFile(root, fileName))) {
      if (!isKeywordDestName(name)) names.add(name);
    }
  }
  for (const name of signalNameSet(destSignalsPath(root))) {
    if (!isKeywordDestName(name)) names.add(name);
  }
  return names;
}

/** Drop hangar repo-* and git-slug keywords. Keep factory + stack laws. */
function pruneKeywordDest(root) {
  const dest = destSignalsPath(root);
  if (!dest || !existsSync(dest)) return { removed: 0, kept: 0 };
  let data;
  try {
    data = JSON.parse(readFileSync(dest, "utf8"));
  } catch {
    return { removed: 0, kept: 0 };
  }
  if (!Array.isArray(data.signals)) return { removed: 0, kept: 0 };
  const factory = signalNameSet(repertoireDataFile(root, "curated_signals.json"));
  const stack = signalNameSet(repertoireDataFile(root, "stack-overlay.json"));
  const kept = [];
  let removed = 0;
  for (const signal of data.signals) {
    const name = String((signal && signal.name) || "").trim();
    if (!name) continue;
    const protectedLaw = factory.has(name) || stack.has(name);
    if (!protectedLaw && (isKeywordDestName(name) || isGenericFieldObservedSignal(signal))) {
      removed += 1;
      continue;
    }
    kept.push(signal);
  }
  if (removed) {
    data.signals = kept;
    data.last_updated = new Date().toISOString();
    writeFileSync(dest, `${JSON.stringify(data, null, 2)}\n`);
  }
  return { removed, kept: kept.length };
}

const STACK_LAW_FIELDS = [
  "definition",
  "tags",
  "priority",
  "evaluation_criteria",
  "validation_experiment",
  "example_inference_snippet",
  "implementation_notes",
];

/** Stack text cadences onto an existing project law. Observation stats stay. */
function refreshStackLaw(existing, signal) {
  let dirty = false;
  for (const field of STACK_LAW_FIELDS) {
    if (signal[field] == null) continue;
    const next = signal[field];
    const prev = existing[field];
    if (JSON.stringify(prev) === JSON.stringify(next)) continue;
    existing[field] = next;
    dirty = true;
  }
  return dirty;
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
  const byName = new Map();
  for (const signal of data.signals) {
    const name = String((signal && signal.name) || "").trim();
    if (name) byName.set(name, signal);
  }
  let changed = 0;
  for (const signal of incoming) {
    const name = String(signal.name).trim();
    if (!name) continue;
    const existing = byName.get(name);
    if (!existing) {
      const created = {
        ...signal,
        name,
        tags: Array.isArray(signal.tags) ? signal.tags : [],
        definition: typeof signal.definition === "string" ? signal.definition : name,
      };
      data.signals.push(created);
      byName.set(name, created);
      changed += 1;
      continue;
    }
    if (refreshStackLaw(existing, signal)) changed += 1;
  }
  if (changed) {
    data.last_updated = new Date().toISOString();
    writeFileSync(destPath, `${JSON.stringify(data, null, 2)}\n`);
  }
  return changed;
}

/** Hydrate project dest from seed + stack. Subject repo-* stay off dest. */
function hydrateDestOnWake(root) {
  const dest = destSignalsPath(root);
  const seed = repertoireDataFile(root, "curated_signals.json");
  if (!existsSync(dest) && seed) {
    mkdirSync(join(root, ".xray", "state", "repertoire"), { recursive: true });
    copyFileSync(seed, dest);
  }
  if (!existsSync(dest)) return { dest: null, added: 0, destCount: 0 };
  const added = mergeMissingSignals(
    dest,
    readSignalRecords(repertoireDataFile(root, "stack-overlay.json")),
  );
  const pruned = pruneKeywordDest(root);
  return { dest, added, destCount: countCuratedSignals(dest) || 0, pruned };
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

function destLockPath(root) {
  return join(root, ".xray", "state", "repertoire", "dest.lock");
}

function sleepMs(ms) {
  try {
    const buf = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(buf, 0, 0, ms);
  } catch {
    /* lock retry is best-effort */
  }
}

/** Parallel live contexts share one project copy. Exclusive create; stale after 60s. */
function withDestLock(root, fn) {
  const lockPath = destLockPath(root);
  try {
    mkdirSync(join(root, ".xray", "state", "repertoire"), { recursive: true });
  } catch (err) {
    if (err && (err.code === "EACCES" || err.code === "EPERM")) return null;
    throw err;
  }
  const started = Date.now();
  while (Date.now() - started < 50000) {
    try {
      const fd = openSync(lockPath, "wx");
      try {
        writeFileSync(fd, `${JSON.stringify({ pid: process.pid, at: new Date().toISOString() })}\n`);
        return fn();
      } finally {
        try {
          closeSync(fd);
        } catch {
          /* leftover */
        }
        try {
          unlinkSync(lockPath);
        } catch {
          /* leftover */
        }
      }
    } catch (err) {
      if (!err || err.code !== "EEXIST") return fn();
      try {
        const st = statSync(lockPath);
        if (Date.now() - st.mtimeMs > 60000) unlinkSync(lockPath);
      } catch {
        /* leftover */
      }
      sleepMs(40);
    }
  }
  return fn();
}

function slugPrimitiveName(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const bare = trimmed.replace(/^@[^/]+\//, "");
  const slug = bare
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!/^[a-z][a-z0-9-]{2,119}$/.test(slug)) return null;
  if (/^phase-\d/.test(slug)) return null;
  if (/^\d/.test(slug)) return null;
  if (
    slug === "criteria-selection-gap" ||
    slug === "external-norm-smuggling-risk" ||
    slug === "model-latent-geometry-as-true-invariant"
  ) {
    return null;
  }
  return slug;
}

function stripConventionalSubject(message) {
  return String(message || "")
    .replace(/^(feat|fix|chore|docs|test|refactor|perf|style|ci|build|revert)(\([^)]+\))?:\s*/i, "")
    .trim();
}

/** Observe existing laws mentioned in git. Do not mint commit slugs. */
function patternsFromGit(root, commits) {
  const text = (Array.isArray(commits) ? commits : [])
    .map((row) => String((row && row.message) || ""))
    .join("\n")
    .toLowerCase();
  const patterns = [];
  if (!text.trim()) return patterns;
  for (const name of destLawNameSet(root)) {
    if (text.includes(name) || text.includes(name.replace(/-/g, " "))) {
      patterns.push({ name, confidence: 0.7, description: "observe existing law from git" });
    }
  }
  return patterns;
}

function latestSessionNewerThanGrow(root) {
  const latest = join(root, "docs", "inference", "latest-session.json");
  if (!existsSync(latest)) return false;
  const working = readRepertoireWorking(root);
  const grownAt = working && working.grow && (working.grow.at || working.updatedAt);
  if (!grownAt) return true;
  try {
    return statSync(latest).mtimeMs > Date.parse(String(grownAt));
  } catch {
    return true;
  }
}

/** Capture then grow. Skip-path for floors that already have a live card. */
function heatLiveMemory(root) {
  try {
    const mr = readMemoryRoutingConfig(root);
    if (isExplicitMemoryRoutingOptOut(mr)) {
      return { captured: null, grow: null };
    }
    const result = withDestLock(root, () => {
      const captured = maybeCaptureSessionOnHeadMove(root);
      const grow = captured || latestSessionNewerThanGrow(root) ? growDestOnWake(root) : null;
      if (grow) persistRepertoireWorking(root, { grow });
      return { captured, grow };
    });
    return result || { captured: null, grow: null };
  } catch {
    /* dest EACCES / unwritable heat root must not deny the host tool */
    return { captured: null, grow: null };
  }
}

/**
 * Station note on HEAD move. Dedup per HEAD.
 * Commit subjects are match text for the card, not a graded lesson.
 * Do not mint session-<date>-<short HEAD> under docs/inference.
 */
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
  const approaches = commits.map((row) => row.message).filter(Boolean);
  const span = {
    from: stamp && stamp.head ? stamp.head : commits[commits.length - 1] ? commits[commits.length - 1].hash : git.head,
    to: git.head,
  };
  const patterns = patternsFromGit(root, commits, span);
  const stationNote = {
    timestamp: new Date().toISOString(),
    span,
    approaches,
    patterns,
    matched_primitives: preferLawHits(patterns.map((row) => row && row.name)),
    metrics: { commits: commits.length },
  };
  const outDir = join(root, "docs", "inference");
  mkdirSync(outDir, { recursive: true });
  const filePath = join(outDir, "latest-session.json");
  writeFileSync(filePath, `${JSON.stringify(stationNote, null, 2)}\n`);
  mkdirSync(join(root, ".xray", "state"), { recursive: true });
  writeFileSync(
    sessionCaptureStampPath(root),
    `${JSON.stringify({ head: git.head, path: filePath, updatedAt: stationNote.timestamp }, null, 2)}\n`,
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

function growDestOnWake(root) {
  const helper = join(HOOKS_DIR, "station-memory-ingest.mjs");
  if (!existsSync(helper)) return null;
  try {
    const out = execFileSync(process.execPath, [helper, root, "--grow"], {
      encoding: "utf8",
      timeout: 45000,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, REPERTOIRE_FIELD_SYNC: "0", REPERTOIRE_DEST_LOCK: "held" },
    });
    const line = String(out).trim().split("\n").filter(Boolean).at(-1) || "{}";
    const parsed = JSON.parse(line);
    const pruned = pruneKeywordDest(root);
    const destCount = countCuratedSignals(destSignalsPath(root)) || 0;
    if (!parsed || typeof parsed !== "object") return { pruned: pruned.removed, destCount };
    const heated = Array.isArray(parsed.heated) ? parsed.heated.length : 0;
    return {
      ...parsed,
      observed: heated,
      pruned: pruned.removed,
      destCount,
      after: destCount,
    };
  } catch {
    return null;
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

function isCompactEventName(value) {
  return /compact/i.test(String(value || ""));
}

/** Keep Compact boot fields after later preToolUse / HEAD rewrite. */
function retainCompactFields(existing, extra = {}) {
  const incomingHook = extra && (extra.hookEvent || extra.source || extra.hook);
  if (isCompactEventName(incomingHook) || (extra && extra.event_class)) {
    const kept = {};
    if (extra.hookEvent) kept.hookEvent = extra.hookEvent;
    if (extra.conversation_id) kept.conversation_id = extra.conversation_id;
    if (extra.generation_id) kept.generation_id = extra.generation_id;
    if (extra.event_class) kept.event_class = extra.event_class;
    return kept;
  }
  const prior = existing && typeof existing === "object" ? existing : {};
  if (!isCompactEventName(prior.hookEvent) && !prior.event_class) return {};
  const kept = {};
  if (prior.hookEvent) kept.hookEvent = prior.hookEvent;
  if (prior.conversation_id) kept.conversation_id = prior.conversation_id;
  if (prior.generation_id) kept.generation_id = prior.generation_id;
  if (prior.event_class) kept.event_class = prior.event_class;
  return kept;
}

/** Persist heated length. A number stays a number. An array is a count. Never drop a number to 0. */
function workingGrowSnapshot(grow) {
  if (!grow || typeof grow !== "object") return null;
  if (typeof grow.after !== "number") {
    return typeof grow.skipped === "string" ? grow.skipped : null;
  }
  const observed =
    typeof grow.observed === "number"
      ? grow.observed
      : Array.isArray(grow.observed)
        ? grow.observed.length
        : Array.isArray(grow.heated)
          ? grow.heated.length
          : 0;
  return {
    before: grow.before,
    after: grow.after,
    imported: grow.imported,
    observed,
  };
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
    return "Repertoire: module unresolved";
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
  const mr = readMemoryRoutingConfig(root);
  const memoryOff = isExplicitMemoryRoutingOptOut(mr);
  const live = memoryOff
    ? { hydrate: { dest: null, added: 0, destCount: 0 }, captured: null, grow: null }
    : withDestLock(root, () => {
        const hydrateInner = hydrateDestOnWake(root);
        const capturedInner = maybeCaptureSessionOnHeadMove(root);
        const growInner = growDestOnWake(root);
        return { hydrate: hydrateInner, captured: capturedInner, grow: growInner };
      });
  const hydrate = live.hydrate;
  const captured = live.captured;
  const grow = live.grow;
  const destCountAfterGrow =
    grow && typeof grow.after === "number"
      ? grow.after
      : existsSync(destSignalsPath(root))
        ? countCuratedSignals(destSignalsPath(root)) || 0
        : hydrate.destCount;
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
  const resolved = resolveHeatIntent(root, extra, existing);
  const intent = resolved.intent;
  const rematch = resolved.rematch;
  const matchText = clipIntent([intent, pickup, approaches].filter(Boolean).join(" "));
  const git = readGitBrief(root);
  const planLine = resolveHeatPlan(root, extra, existing);
  const repertoireResume =
    typeof extra.repertoireResume === "string" ? extra.repertoireResume : buildRepertoireResume(root);
  const swapBit = hotSwap ? `hot-swap ${hotSwap.from} → ${hotSwap.to}` : `host ${host}`;
  const intentBit = intent ? `intent: ${intent}` : "intent: (none yet)";
  const gitBit = git ? `git ${git.branch}@${git.head}` : "git: n/a";
  const planBit = planLine ? `plan: ${planLine}` : "plan: (none)";
  let matchedSignals = [];
  if (Array.isArray(extra.matchedSignals) && extra.matchedSignals.length) {
    matchedSignals = preferLawHits(extra.matchedSignals, 8);
  }
  const priorWorking = readRepertoireWorking(root);
  const destCount =
    destCountAfterGrow ||
    hydrate.destCount ||
    (existsSync(destSignalsPath(root)) ? countCuratedSignals(destSignalsPath(root)) : 0);
  if (!memoryOff && !matchedSignals.length && matchText) {
    if (
      !rematch &&
      priorWorking &&
      priorWorking.matchText === matchText &&
      priorWorking.destCount === destCount &&
      Array.isArray(priorWorking.matchedSignals) &&
      priorWorking.matchedSignals.length
    ) {
      matchedSignals = preferLawHits(priorWorking.matchedSignals, 8);
    } else {
      matchedSignals = preferLawHits(
        matchStationSignalsSync(root, rematch && intent ? intent : matchText),
        8,
      );
    }
  }
  if (!matchedSignals.length && priorWorking) {
    matchedSignals = stationSafeSignals(priorWorking.matchedSignals);
  }
  const compactHold = retainCompactFields(existing, extra);
  const nextHook = compactHold.hookEvent || extra.hookEvent || extra.source || null;
  const workingSnapshot = {
    host,
    intent,
    git,
    hotSwap,
    memoryRouting: repertoireResume.startsWith("Repertoire: on") ? "on" : "off",
    repertoireResume,
    destCount,
  };
  if (nextHook) workingSnapshot.hookEvent = nextHook;
  if (pickup) workingSnapshot.pickup = pickup;
  if (matchText) workingSnapshot.matchText = matchText;
  if (captured) workingSnapshot.sessionCapture = captured;
  const growReceipt = workingGrowSnapshot(grow);
  if (growReceipt) workingSnapshot.grow = growReceipt;
  if (matchedSignals.length) workingSnapshot.matchedSignals = matchedSignals.slice(0, 8);
  const opProcNames = readOpProcNames(root);
  if (opProcNames.length) workingSnapshot.opProcNames = opProcNames;
  const pickupChanged = Boolean(pickup && (!priorWorking || priorWorking.pickup !== pickup));
  if (
    !memoryOff &&
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
  if (!memoryOff) {
    const latePrune = pruneKeywordDest(root);
    if (latePrune.kept) workingSnapshot.destCount = latePrune.kept;
  }
  const working = persistRepertoireWorking(root, workingSnapshot);
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
    ...compactHold,
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
  "plate:",
];

/** Stock design map. Exact lines so a later heat does not preserve a second copy. */
const DESIGN_MAP_LINES = [
  "Subsystem map:",
  "+----------------------+------------------------------------------+",
  "| Subsystem            | After compact                            |",
  "+----------------------+------------------------------------------+",
  "| Inference            | proposals, reflection, Repertoire        |",
  "| External Governance  | Dynamo vote, Codex                       |",
  "| Autonomous Engine    | thinDispatch, AsideContext               |",
  "| Lessons              | hot lines on the signal; this card       |",
  "+----------------------+------------------------------------------+",
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

/** Same-session skip must still rewrite when HEAD, organ count, or Hold npm diverges. */
function stationBootNeedsRefresh(existing, root, host) {
  if (!existing || typeof existing !== "object") return true;
  if (host && existing.host && existing.host !== host) return true;
  if (!existing.suit_profile) return true;
  if (existing.workspaceRoot && existing.workspaceRoot !== root) return true;
  if (!existing.stationLine) return true;
  const liveGit = readGitBrief(root);
  const bootHead = existing.git && existing.git.head ? String(existing.git.head) : "";
  if (liveGit && liveGit.head && bootHead !== liveGit.head) return true;
  const liveResume = buildRepertoireResume(root);
  if (liveResume && existing.repertoireResume && liveResume !== existing.repertoireResume) return true;
  if (stationDurableHoldsNpm(root)) return true;
  const cardIntent = readStationTicketField(root, "Intent");
  const bootIntent = typeof existing.intent === "string" ? clipIntent(existing.intent) : null;
  if (cardIntent && bootIntent && cardIntent !== bootIntent) return true;
  const cardPlan = readStationTicketField(root, "Plan");
  const bootPlan = typeof existing.planLine === "string" ? clipIntent(existing.planLine) : null;
  if (cardPlan && bootPlan && cardPlan !== bootPlan) return true;
  return false;
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
  if (DESIGN_MAP_LINES.includes(trimmed)) return true;
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
  lines.push(fields.repertoireResume || "Repertoire: module unresolved");
  if (fields.workingLine) {
    lines.push(fields.workingLine);
  }
  const plateLine = plateStockLine(fields.intent);
  if (plateLine) lines.push(plateLine);
  lines.push("");
  lines.push(...DESIGN_MAP_LINES);
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
  growDestOnWake,
  heatLiveMemory,
  withDestLock,
  slugPrimitiveName,
  patternsFromGit,
  readNotesPickup,
  maybeCaptureSessionOnHeadMove,
  formatWorkingLine,
  workingGrowSnapshot,
  applyStationHeat,
  isStockTicket,
  readStationTicketField,
  resolveHeatIntent,
  resolveHeatPlan,
  extractPreservedStationLines,
  mergeStationMarkdown,
  formatStationMarkdown,
  writeStationMarkdown,
  isHoldNpmLine,
  stationDurableHoldsNpm,
  stationBootNeedsRefresh,
  isKeywordDestName,
  pruneKeywordDest,
  preferLawHits,
  retainCompactFields,
  destLawNameSet,
};
