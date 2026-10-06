/**
 * Sleeve: on means this root's wake returned, the plate is the work,
 * the ticket reads back as that wake, and inspect ran here.
 */
const { execFileSync } = require("child_process");
const { existsSync, mkdtempSync, readFileSync, rmSync } = require("fs");
const { tmpdir } = require("os");
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
const millMemo = new Map();

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

function stationText(root) {
  const file = join(root, ".xray", "state", "STATION.md");
  if (!existsSync(file)) return "";
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function fieldValue(text, label) {
  const line = String(text || "").split(/\r?\n/).find((row) => row.startsWith(`${label}: `));
  return line ? line.slice(label.length + 2).trim() : "";
}

function ticketIntent(root) {
  return fieldValue(stationText(root), "Intent");
}

function ticketHost(root) {
  const line = fieldValue(stationText(root), "Host");
  return line.split(/\s+/)[0] || "";
}

function workingFile(root) {
  return readJson(join(root, ".xray", "state", "repertoire-working.json"));
}

function oneLine(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 80);
}

function loopStitch(root) {
  const card = ticketIntent(root);
  const working = workingFile(root);
  const prior = working && typeof working.priorIntent === "string" ? working.priorIntent : "";
  const kept = working && typeof working.intent === "string" ? working.intent : "";
  const returned = Boolean(prior && kept && card && prior === kept && card === kept);
  return stitch("loop", returned, returned ? [oneLine(kept)] : []);
}

function plateBody(raw) {
  return String(raw || "").replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
}

function domainStitch(root) {
  const intent = ticketIntent(root);
  if (!intent) return stitch("domain", false, []);
  let plates = null;
  try {
    plates = require("./plates.cjs");
  } catch {
    return stitch("domain", false, []);
  }
  let plate = null;
  try {
    plate = plates.recallPlate(intent);
  } catch {
    plate = null;
  }
  if (!plate || !plate.id || !plate.body) return stitch("domain", false, []);
  const worn = join(root, ".xray", "state", "plates", `${plate.id}.md`);
  if (!existsSync(worn)) return stitch("domain", false, []);
  let raw = "";
  try {
    raw = readFileSync(worn, "utf8");
  } catch {
    return stitch("domain", false, []);
  }
  if (plateBody(raw) !== plate.body) return stitch("domain", false, []);
  return stitch("domain", true, [plate.id]);
}

function stateStitch(root) {
  const card = ticketIntent(root);
  const host = ticketHost(root);
  const working = workingFile(root);
  const kept = working && typeof working.intent === "string" ? working.intent : "";
  const heldHost = working && typeof working.host === "string" ? working.host : "";
  const same = Boolean(card && kept && host && heldHost && card === kept && host === heldHost);
  return stitch("state", same, same ? [".xray/state/STATION.md"] : []);
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

function runInspect(root, cli) {
  const home = mkdtempSync(join(tmpdir(), "xray-sleeve-home-"));
  const machine = mkdtempSync(join(tmpdir(), "xray-sleeve-machine-"));
  try {
    let out = "";
    try {
      out = execFileSync(process.execPath, [cli, "inspect", "--skip-live"], {
        cwd: root,
        env: {
          ...process.env,
          HOME: home,
          FOUNDRY_MACHINE_HOME: machine,
          FOUNDRY_ROOT: root,
        },
        encoding: "utf8",
        timeout: 20000,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      out = err && err.stdout ? String(err.stdout) : "";
    }
    const report = JSON.parse(out);
    if (report && report.ok === true) return stitch("foundry", true, ["inspect --skip-live"]);
    const failed = report && Array.isArray(report.failed) ? report.failed.map(String) : [];
    return stitch("foundry", false, failed);
  } catch {
    return stitch("foundry", false, []);
  } finally {
    rmSync(home, { recursive: true, force: true });
    rmSync(machine, { recursive: true, force: true });
  }
}

function foundryStitch(root) {
  const dir = foundryDir(root);
  if (!dir) return stitch("foundry", false, []);
  const key = `${root}\n${dir}`;
  if (millMemo.has(key)) return millMemo.get(key);
  const result = runInspect(root, join(dir, "cli.mjs"));
  millMemo.set(key, result);
  return result;
}

function readSleeve(root) {
  const stitches = [
    loopStitch(root),
    domainStitch(root),
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
  if (row.at.length) return row.at.join(", ");
  return row.on ? "on" : "off";
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
