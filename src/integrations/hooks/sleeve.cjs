/**
 * One sleeve, four stitches, one record each: name, on, at.
 * Loop is in the outer set. Domain and state are plate ids.
 * Foundry is scripts/foundry. The card says on, or the missing names.
 */
const { existsSync, readdirSync, readFileSync } = require("fs");
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

function isSleevePlane(id) {
  return SLEEVE_PLANES.includes(String(id || ""));
}

function suitHome() {
  return join(__dirname, "..", "..", "..");
}

function stitch(name, on, at) {
  return {
    name,
    on: Boolean(on),
    at: Array.isArray(at) ? at.filter((item) => typeof item === "string" && item) : [],
  };
}

function frontMatter(text) {
  const body = String(text || "");
  if (!body.startsWith("---")) return "";
  const end = body.indexOf("\n---", 3);
  if (end < 0) return "";
  return body.slice(0, end);
}

function plateIds(dir, type) {
  if (!dir || !existsSync(dir)) return [];
  let names = [];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const ids = [];
  for (const name of names) {
    if (!name.endsWith(".md")) continue;
    let text = "";
    try {
      text = readFileSync(join(dir, name), "utf8");
    } catch {
      continue;
    }
    const line = frontMatter(text).split(/\r?\n/).find((row) => row.startsWith("plate_type:"));
    if (!line) continue;
    if (line.slice("plate_type:".length).trim() !== type) continue;
    ids.push(name.slice(0, -3));
  }
  ids.sort();
  return ids;
}

function clothAt(home) {
  const plates = join(home, "docs-site", "docs", "plates");
  const foundry = existsSync(join(home, "scripts", "foundry", "cli.mjs"));
  return {
    domain: plateIds(plates, "domain model"),
    state: plateIds(plates, "state flow"),
    foundry: foundry ? "scripts/foundry" : "",
  };
}

function homesFor(root, opts) {
  if (opts && opts.home) return [opts.home];
  const homes = [];
  if (root) homes.push(root);
  homes.push(suitHome());
  if (root) homes.push(join(root, "node_modules", "0xray"));
  const seen = new Set();
  const out = [];
  for (const home of homes) {
    if (!home || seen.has(home)) continue;
    seen.add(home);
    out.push(home);
  }
  return out;
}

function pickCloth(homes) {
  let partial = null;
  for (const home of homes) {
    const cloth = clothAt(home);
    const any = cloth.domain.length || cloth.state.length || cloth.foundry;
    if (!partial && any) partial = cloth;
    if (cloth.domain.length && cloth.state.length && cloth.foundry) return cloth;
  }
  return partial || { domain: [], state: [], foundry: "" };
}

function loopStitch(planesFile) {
  try {
    const data = JSON.parse(readFileSync(planesFile, "utf8"));
    const names = Array.isArray(data.planes) ? data.planes.map((name) => String(name)) : [];
    const entry = data.loop;
    const file = entry && typeof entry === "object" && typeof entry.file === "string" ? entry.file : "";
    return stitch("loop", names.includes("loop"), file ? [file] : []);
  } catch {
    return stitch("loop", false, []);
  }
}

function readSleeve(root, opts = {}) {
  const planesFile = (opts && opts.planesFile) || join(__dirname, "goggles-planes.json");
  const cloth = pickCloth(homesFor(root, opts));
  const stitches = [
    loopStitch(planesFile),
    stitch("domain", cloth.domain.length > 0, cloth.domain),
    stitch("state", cloth.state.length > 0, cloth.state),
    stitch("foundry", Boolean(cloth.foundry), cloth.foundry ? [cloth.foundry] : []),
  ];
  const missing = stitches.filter((row) => !row.on).map((row) => row.name);
  return {
    on: missing.length === 0,
    missing,
    stitches,
  };
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
