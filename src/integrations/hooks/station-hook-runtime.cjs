/**
 * Station heat — compaction / host-swap card.
 * SSOT remains session-boot.json. STATION.md is the projection the model Reads.
 * Grok ignores SessionStart/UserPromptSubmit stdout; disk + AGENTS.md is the contract.
 */
const { execFileSync } = require("child_process");
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const INTENT_MAX = 240;

function stationMarkdownPath(root) {
  return join(root, ".xray", "state", "STATION.md");
}

function sessionBootPath(root) {
  return join(root, ".xray", "state", "session-boot.json");
}

function clipIntent(raw) {
  if (raw == null) return null;
  const text = String(raw).replace(/\s+/g, " ").trim();
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

function readPlanLine(root) {
  const planPath = join(root, ".xray", "state", "lead-dev-plan.json");
  if (!existsSync(planPath)) return null;
  try {
    const plan = JSON.parse(readFileSync(planPath, "utf8"));
    return clipIntent(plan.description || plan.goal || plan.name);
  } catch {
    return null;
  }
}

function resolveRepertoireProviderModule(root) {
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
  try {
    const pkg = JSON.parse(readFileSync(join(siblingRoot, "package.json"), "utf8"));
    if ((pkg.name === "@0xray/repertoire" || pkg.name === "repertoire") && existsSync(siblingProvider)) {
      return siblingProvider;
    }
  } catch {
    /* sibling missing */
  }
  if (existsSync(nmProvider)) return nmProvider;
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

function buildRepertoireResume(root) {
  const modulePath = resolveRepertoireProviderModule(root);
  let mr = {};
  const featuresPath = join(root, ".xray", "features.json");
  if (existsSync(featuresPath)) {
    try {
      mr = JSON.parse(readFileSync(featuresPath, "utf8")).memory_routing || {};
    } catch {
      mr = {};
    }
  }
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
  if (mr.enabled === true && mr.provider === "repertoire") {
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
  const stationLine = `${swapBit}. ${intentBit}. ${planBit}. ${gitBit}. ${repertoireResume}`;
  return {
    lastHost: prevHost,
    hotSwap,
    intent,
    git,
    planLine,
    repertoireResume,
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
  lines.push("");
  lines.push("Continue this card. Compaction and host change are the same cut. Do not cold-start.");
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
  readPlanLine,
  buildRepertoireResume,
  applyStationHeat,
  formatStationMarkdown,
  writeStationMarkdown,
};
