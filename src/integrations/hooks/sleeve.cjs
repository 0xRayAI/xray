/**
 * Sleeve: on means this root is in a loop, inside a domain,
 * holding state, and standing in the foundry.
 * Loop is a held plane. Domain is a plate this root has entered.
 * State is the ticket or the working file. Foundry is the mill answering here.
 */
const { execFileSync } = require("child_process");
const { existsSync, readFileSync } = require("fs");
const { join } = require("path");

const STITCHES = ["loop", "domain", "state", "foundry"];
const SLEEVE_PLANES = [
  "record-map",
  "station-card",
  "notes-page",
  "memory-recall",
  "suit-wear",
  "suit-organs",
  "suit-settings",
  "trail-state",
];
const FOUNDRY_FILES = ["cli.mjs", "mill-root.mjs", "inspect.mjs", "reconcile-version.mjs"];

function isSleevePlane(id) {
  return SLEEVE_PLANES.includes(String(id || ""));
}

function stitch(name, on, at) {
  return {
    name,
    on: Boolean(on),
    at: Array.isArray(at) ? at.filter((item) => typeof item === "string" && item) : [],
  };
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function planeMap() {
  return readJson(join(__dirname, "goggles-planes.json")) || {};
}

function loopStitch(root) {
  const data = readJson(join(root, ".xray", "state", "goggles-reading.json"));
  const plane = data && typeof data.plane === "string" ? data.plane : "";
  if (!plane || (data && data.drift)) return stitch("loop", false, []);
  const entry = planeMap()[plane];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return stitch("loop", false, []);
  const scope = typeof data.scope === "string" && data.scope ? data.scope : "";
  return stitch("loop", true, [scope ? `${plane} · ${scope}` : plane]);
}

function plateBody(raw) {
  return String(raw || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

function plateIdFromCard(root) {
  const file = join(root, ".xray", "state", "STATION.md");
  if (!existsSync(file)) return "";
  let text = "";
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return "";
  }
  const line = text.split(/\r?\n/).find((row) => row.startsWith("Plate: "));
  if (!line) return "";
  const id = line.slice("Plate: ".length).split("—")[0].trim();
  return /^[a-z0-9-]+$/.test(id) ? id : "";
}

function domainIds(root, opts) {
  const ids = [];
  const fromCard = plateIdFromCard(root);
  if (fromCard) ids.push(fromCard);
  if (opts && opts.intent) {
    try {
      const plate = require("./plates.cjs").recallPlate(opts.intent);
      if (plate && plate.id && !ids.includes(plate.id)) ids.push(plate.id);
    } catch {
      /* a missed plate leaves the domain empty */
    }
  }
  return ids;
}

function domainStitch(root, opts) {
  let plates = null;
  try {
    plates = require("./plates.cjs");
  } catch {
    return stitch("domain", false, []);
  }
  for (const id of domainIds(root, opts)) {
    const worn = join(root, ".xray", "state", "plates", `${id}.md`);
    if (!existsSync(worn)) continue;
    let raw = "";
    try {
      raw = readFileSync(worn, "utf8");
    } catch {
      continue;
    }
    if (!plateBody(raw)) continue;
    try {
      const loaded = plates.loadPlate(id);
      if (!loaded || !loaded.body) continue;
    } catch {
      continue;
    }
    return stitch("domain", true, [id]);
  }
  return stitch("domain", false, []);
}

function stateStitch(root) {
  const held = [];
  const station = join(root, ".xray", "state", "STATION.md");
  if (existsSync(station)) {
    try {
      const text = readFileSync(station, "utf8");
      if (/^Intent: /m.test(text)) held.push(".xray/state/STATION.md");
    } catch {
      /* unreadable ticket is not held */
    }
  }
  const working = join(root, ".xray", "state", "repertoire-working.json");
  const data = existsSync(working) ? readJson(working) : null;
  if (data && typeof data.host === "string" && data.host) {
    held.push(".xray/state/repertoire-working.json");
  }
  return stitch("state", held.length > 0, held);
}

function foundryDir(root) {
  const candidates = [
    join(root, "scripts", "foundry"),
    join(root, "node_modules", "0xray", "scripts", "foundry"),
  ];
  for (const dir of candidates) {
    if (FOUNDRY_FILES.every((name) => existsSync(join(dir, name)))) return dir;
  }
  return "";
}

function foundryAt(root, dir) {
  if (dir === join(root, "scripts", "foundry")) return "scripts/foundry";
  return "node_modules/0xray/scripts/foundry";
}

function foundryStitch(root) {
  const dir = foundryDir(root);
  if (!dir) return stitch("foundry", false, []);
  try {
    const out = execFileSync(process.execPath, [join(dir, "cli.mjs"), "help"], {
      cwd: root,
      env: { ...process.env, FOUNDRY_ROOT: root },
      encoding: "utf8",
      timeout: 8000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (!String(out).includes("FOUNDRY_ROOT")) return stitch("foundry", false, []);
    return stitch("foundry", true, [foundryAt(root, dir)]);
  } catch {
    return stitch("foundry", false, []);
  }
}

function readSleeve(root, opts = {}) {
  const stitches = [
    loopStitch(root),
    domainStitch(root, opts),
    stateStitch(root),
    foundryStitch(root),
  ];
  const missing = stitches.filter((row) => !row.on).map((row) => row.name);
  return { on: missing.length === 0, missing, stitches };
}

function rowsOf(sleeve) {
  const listed = sleeve && Array.isArray(sleeve.stitches) ? sleeve.stitches : [];
  return STITCHES.map((name) => {
    const found = listed.find((row) => row && row.name === name);
    return found ? stitch(name, found.on, found.at) : stitch(name, false, []);
  });
}

function formatSleevePointer(sleeve) {
  if (sleeve && sleeve.on) return "Sleeve: on";
  const missing = sleeve && Array.isArray(sleeve.missing) && sleeve.missing.length
    ? STITCHES.filter((name) => sleeve.missing.includes(name))
    : rowsOf(sleeve).filter((row) => !row.on).map((row) => row.name);
  const names = missing.length ? missing : STITCHES.slice();
  return `Sleeve: off ${names.join(", ")}`;
}

function stitchText(row) {
  if (!row.on) return "off";
  return row.at.length ? row.at.join(", ") : "on";
}

function labelOf(name) {
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : "";
}

function formatSleeveReading(sleeve) {
  const lines = [formatSleevePointer(sleeve)];
  for (const row of rowsOf(sleeve)) lines.push(`${labelOf(row.name)}: ${stitchText(row)}`);
  return lines.join("\n");
}

module.exports = {
  STITCHES,
  SLEEVE_PLANES,
  isSleevePlane,
  readSleeve,
  formatSleevePointer,
  formatSleeveReading,
};
