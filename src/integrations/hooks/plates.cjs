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

function plateStockLine(intent) {
  const plate = recallPlate(intent);
  if (!plate) return null;
  return `Plate: ${plate.id} — .xray/state/plates/${plate.id}.md`;
}

module.exports = {
  PLATE_IDS,
  loadPlate,
  recallPlate,
  stampPlateIfMissing,
  plateStockLine,
  wornPlatePath,
};
