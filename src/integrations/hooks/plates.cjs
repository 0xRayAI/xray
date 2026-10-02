/**
 * Runtime plate reader. One implementation.
 * src/memory-routing/plates.ts is the typed API and delegates here so
 * Station (CJS) and the Cursor preCompact hook (plain node) cannot drift.
 */
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("fs");
const { dirname, join } = require("path");

const PLATE_IDS = Object.freeze([
  "routing",
  "governance",
  "boot",
  "orchestration",
  "processor",
  "reporting",
  "memory-recall",
  "stamp-plate",
  "house",
  "review",
  "goggles",
  "suit",
  "kits",
  "host-pack",
  "glossary",
  "record-map",
  "write-home",
  "activity-log",
  "session-capture",
  "suit-wear",
  "suit-organs",
  "station-card",
  "notes-page",
  "reflection-page",
  "site-manual",
  "package-face",
  "suit-settings",
  "trail-state",
  "inference-files",
  "grok-compact",
  "payload-heat",
  "station-heat",
  "pickup-stamp",
  "cursor-compact",
]);

/** Id token, then extra phrases. Equal top scores recall nothing. */
const CUES = {
  routing: [
    [/\brouting\b/i, 5],
    [/thindispatch/i, 4],
    [/task-skill-router|taskskillrouter/i, 4],
    [/scoreandroute/i, 3],
    [/\broute(?:s|d)?\b/i, 3],
  ],
  governance: [
    [/\bgovernance\b/i, 5],
    [/rule-enforcer|ruleenforcer/i, 4],
    [/dynamo solar/i, 3],
  ],
  boot: [
    [/\bboot\b/i, 5],
    [/boot-orchestrator|bootorchestrator/i, 4],
    [/executebootsequence/i, 4],
  ],
  orchestration: [
    [/\borchestrat\w*/i, 5],
    [/aside-?context/i, 4],
    [/spawnaside|spawn aside/i, 3],
    [/analyze-complexity/i, 2],
    [/govern-and-apply/i, 2],
  ],
  processor: [
    [/\bprocessors?\b/i, 5],
    [/pre[\s-]+processors?/i, 6],
    [/post[\s-]+processors?/i, 4],
    [/executepreprocessors|execute-pre-processors/i, 6],
    [/processor-?manager/i, 4],
  ],
  reporting: [
    [/\breporting\b/i, 5],
    [/framework-reporting|framework report/i, 4],
    [/activity report/i, 4],
    [/\breports?\b/i, 2],
  ],
  "memory-recall": [
    [/\bmemory-recall\b/i, 5],
    [/memory\s+recall/i, 5],
    [/recall(?:s|ed|ing)?\s+(?:a\s+|one\s+|the\s+)?plate/i, 5],
    [/stamp(?:ed|ing)?\s+plates?/i, 4],
  ],
  house: [
    [/house init/i, 4],
    [/HOUSE\.md/i, 4],
    [/GROK_BOT_HOUSE/i, 4],
    [/setup-house/i, 4],
  ],
  review: [
    [/review plate/i, 6],
    [/plates\/review\b/i, 6],
    [/re-review/i, 5],
    [/critic\s+FAIL/i, 5],
    [/critic\s+PASS/i, 5],
  ],
  goggles: [
    [/\bgoggles\b/i, 6],
  ],
  suit: [
    [/suit plate/i, 6],
    [/plates\/suit\b/i, 6],
  ],
  kits: [
    [/\bkits plate\b/i, 6],
    [/\bkits\b/i, 5],
  ],
  "host-pack": [
    [/host\s*pack/i, 6],
    [/host-pack/i, 6],
  ],
  glossary: [
    [/\bglossary\b/i, 6],
  ],
  "stamp-plate": [
    [/stamp plate/i, 6],
    [/plates\/stamp-plate/i, 6],
  ],
  "record-map": [
    [/record map/i, 6],
    [/five pages the agent/i, 6],
    [/plates\/record-map/i, 6],
  ],
  "write-home": [
    [/write home/i, 6],
    [/\.xray\/logs/i, 6],
    [/plates\/write-home/i, 6],
  ],
  "activity-log": [
    [/activity log pipeline/i, 6],
    [/plates\/activity-log/i, 6],
  ],
  "session-capture": [
    [/session capture/i, 6],
    [/latest-session\.json/i, 5],
    [/plates\/session-capture/i, 6],
  ],
  "suit-wear": [
    [/suit wear/i, 6],
    [/consumer gitignore/i, 5],
    [/plates\/suit-wear/i, 6],
  ],
  "suit-organs": [
    [/suit organs/i, 6],
    [/plates\/suit-organs/i, 6],
  ],
  "station-card": [
    [/station card/i, 6],
    [/plates\/station-card/i, 6],
  ],
  "notes-page": [
    [/notes page/i, 6],
    [/plates\/notes-page/i, 6],
  ],
  "reflection-page": [
    [/reflection page/i, 6],
    [/plates\/reflection-page/i, 6],
  ],
  "site-manual": [
    [/site manual/i, 6],
    [/plates\/site-manual/i, 6],
  ],
  "package-face": [
    [/package face/i, 6],
    [/plates\/package-face/i, 6],
  ],
  "suit-settings": [
    [/suit settings/i, 6],
    [/plates\/suit-settings/i, 6],
  ],
  "trail-state": [
    [/trail state/i, 6],
    [/plates\/trail-state/i, 6],
  ],
  "inference-files": [
    [/inference files/i, 6],
    [/plates\/inference-files/i, 6],
  ],
  "grok-compact": [
    [/grok compact/i, 6],
    [/plates\/grok-compact/i, 6],
  ],
  "payload-heat": [
    [/payload heat/i, 6],
    [/plates\/payload-heat/i, 6],
  ],
  "station-heat": [
    [/station heat/i, 6],
    [/plates\/station-heat/i, 6],
  ],
  "pickup-stamp": [
    [/pickup stamp/i, 6],
    [/plates\/pickup-stamp/i, 6],
  ],
  "cursor-compact": [
    [/cursor compact/i, 6],
    [/plates\/cursor-compact/i, 6],
  ],
};

function platesDir() {
  let dir = __dirname;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(dir, "docs-site", "docs", "plates");
    if (existsSync(join(candidate, "index.md"))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function assertPlateId(id) {
  if (!PLATE_IDS.includes(id)) {
    throw new Error(`unknown plate: ${id}`);
  }
}

function plateSourcePath(id) {
  assertPlateId(id);
  const dir = platesDir();
  if (!dir) throw new Error("plate docs missing");
  const sourcePath = join(dir, `${id}.md`);
  if (!existsSync(sourcePath)) throw new Error(`plate file missing: ${id}`);
  return sourcePath;
}

function stripFrontmatter(markdown) {
  return String(markdown).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

function loadPlate(id) {
  const sourcePath = plateSourcePath(id);
  const raw = readFileSync(sourcePath, "utf8");
  return {
    id,
    body: stripFrontmatter(raw),
    sourcePath,
  };
}

function scorePlate(id, text) {
  const cues = CUES[id] || [];
  let score = 0;
  for (const [pattern, weight] of cues) {
    if (pattern.test(text)) score += weight;
  }
  return score;
}

function recallPlate(intent) {
  const text = String(intent || "").trim();
  if (!text || !platesDir()) return null;
  let bestId = null;
  let best = 0;
  let second = 0;
  for (const id of PLATE_IDS) {
    const score = scorePlate(id, text);
    if (score > best) {
      second = best;
      best = score;
      bestId = id;
    } else if (score > second) {
      second = score;
    }
  }
  if (!bestId || best === 0 || best === second) return null;
  return loadPlate(bestId);
}

function wornPlatePath(projectRoot, id) {
  assertPlateId(id);
  return join(projectRoot, ".xray", "state", "plates", `${id}.md`);
}

function stampPlateIfMissing(projectRoot, id) {
  const path = wornPlatePath(projectRoot, id);
  if (existsSync(path)) {
    return { id, path, written: false };
  }
  const sourcePath = plateSourcePath(id);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, readFileSync(sourcePath, "utf8"));
  return { id, path, written: true };
}

function organFile(intent) {
  try {
    const { suitHint } = require("./goggles-pipeline.mjs");
    const hint = suitHint(String(intent || ""));
    if (!hint || hint === "Name one plane." || hint.includes("\n")) return "";
    const file = hint.split(": ").slice(1).join(": ").trim();
    return file;
  } catch {
    return "";
  }
}

function plateStockLine(intent) {
  const plate = recallPlate(intent);
  if (!plate) return null;
  const line = `Plate: ${plate.id} — .xray/state/plates/${plate.id}.md`;
  const file = organFile(intent);
  return file ? `${line} File: ${file}` : line;
}

module.exports = {
  PLATE_IDS,
  loadPlate,
  recallPlate,
  stampPlateIfMissing,
  plateStockLine,
  wornPlatePath,
};
