/**
 * Suit seat: the fastened plant, the wear proof, and the station stamp.
 * TODO(#385): the role picker ranks the full catalog. Until then the lens
 * is the plant or a plane named by the suit config, not a fleet roster.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const millPlantProtocol = require("../foundry/mill-plant.cjs");

/** Card a plant shows. Not a fleet roster. */
const PLANT_PLANE = {
  mill: "integration",
  sound: "ecosystem",
  blip: "ecosystem",
};

const CARD_PLANES = ["dev", "integration", "domain", "ecosystem"];

const NOTES_SEED = ["Point:", "Open:", "Learned:", "Next cut:", ""].join("\n");

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

function foundryExtra(root) {
  const candidates = [path.join(root, "foundry.json"), path.join(root, ".xray", "foundry.json")];
  for (const file of candidates) {
    const parsed = readJson(file);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
  }
  return {};
}

function normalizePlant(raw) {
  const token = String(raw || "").trim().toLowerCase();
  if (!token) return "";
  if (token === "mill" || token === "sound" || token === "blip") return token;
  const tail = token.split("/").filter(Boolean).pop() || "";
  if (tail === "sound" || tail === "blip" || tail === "mill") return tail;
  if (token === "@0xray/blip") return "blip";
  return tail;
}

function declaredPlant(root) {
  const extra = foundryExtra(root);
  if (typeof extra.plant === "string" && extra.plant.trim()) return extra.plant.trim();
  if (Array.isArray(extra.plant) && extra.plant.length) return String(extra.plant[0]);
  const inventory = readJson(path.join(root, ".xray", "foundry-inventory.json"));
  if (inventory && Array.isArray(inventory.plant) && inventory.plant.length) {
    return String(inventory.plant[0]);
  }
  return "";
}

function declaredRole(root) {
  const config = readJson(path.join(root, ".xray", "config.json")) || {};
  if (typeof config.role === "string" && config.role.trim()) return config.role.trim().toLowerCase();
  const extra = foundryExtra(root);
  if (typeof extra.role === "string" && extra.role.trim()) return extra.role.trim().toLowerCase();
  return "";
}

function pushNames(into, list) {
  if (!Array.isArray(list)) return;
  for (const name of list) {
    if (typeof name !== "string") continue;
    const trimmed = name.trim();
    if (trimmed && !into.includes(trimmed)) into.push(trimmed);
  }
}

function installedPackageRoot(root) {
  const linked = path.join(root, "node_modules", "0xray");
  if (fs.existsSync(path.join(linked, "package.json"))) {
    try {
      return fs.realpathSync(linked);
    } catch {
      return linked;
    }
  }
  const own = readJson(path.join(root, "package.json"));
  if (own && own.name === "0xray") return root;
  return "";
}

/** Skills for one fastened plant. Inventory for that plant, else the mill package. */
function skillsForPlant(root, plant) {
  const kind = normalizePlant(plant) || "mill";
  const inventory = readJson(path.join(root, ".xray", "foundry-inventory.json"));
  const names = [];
  if (inventory) {
    const spec = millPlantProtocol.inventoryFilesForKind(inventory, kind);
    pushNames(names, spec && spec.skills);
  }
  if (names.length) return names;
  const packageRoot = installedPackageRoot(root);
  const declared = normalizePlant(declaredPlant(root));
  const extra = foundryExtra(root);
  const request = declared === kind && Object.keys(extra).length ? extra : { plant: kind };
  try {
    const seats = millPlantProtocol.resolvePlantSeats(root, packageRoot || root, request);
    const seat = seats.find((item) => item.kind === kind);
    if (seat && Array.isArray(seat.skills) && seat.skills.length) return seat.skills.slice();
  } catch {
    /* this folder has no mill package for that plant */
  }
  if (kind === "mill") return millPlantProtocol.BUILTIN_MILL.skills.slice();
  return [];
}

function fastenedPlantSkills(root) {
  return skillsForPlant(root, normalizePlant(declaredPlant(root)) || "mill");
}

function wornVersion(root) {
  const inventory = readJson(path.join(root, ".xray", "foundry-inventory.json"));
  if (inventory && inventory.mill && inventory.mill.version) return String(inventory.mill.version);
  const local = readJson(path.join(root, "node_modules", "0xray", "package.json"));
  if (local && local.version) return String(local.version);
  const own = readJson(path.join(root, "package.json"));
  if (own && own.name === "0xray" && own.version) return String(own.version);
  return "";
}

function seatConfig(root) {
  const role = declaredRole(root);
  const declared = normalizePlant(declaredPlant(root));
  const rolePlant = PLANT_PLANE[role] ? role : "";
  const rolePlane = CARD_PLANES.includes(role) ? role : "";
  const plant = rolePlant || declared;
  if (!plant && !rolePlane) return null;
  const plane = rolePlane || PLANT_PLANE[plant] || "";
  if (!plane) return null;
  return { role, plant, plane, version: wornVersion(root) };
}

function seatLens(root) {
  const seat = seatConfig(root);
  if (!seat) return null;
  const skills = seat.plant ? skillsForPlant(root, seat.plant) : [];
  const worn = seat.plant ? (seat.version ? `${seat.plant} ${seat.version}` : seat.plant) : "";
  return {
    card: seat.plane,
    plane: seat.plane,
    skills: skills.join(", "),
    worn,
    plant: seat.plant,
  };
}

function isGitWorkTree(root) {
  try {
    const inside = execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
    return inside === "true";
  } catch {
    return false;
  }
}

function gogglesDisabled(root) {
  const data = readJson(path.join(root, ".xray", "features.json"));
  return Boolean(data && data.goggles && data.goggles.enabled === false);
}

function suitIsWorn(root) {
  if (!fs.existsSync(path.join(root, ".xray", "features.json"))) return false;
  return fastenedPlantSkills(root).every((name) =>
    fs.existsSync(path.join(root, ".opencode", "skills", name, "SKILL.md")),
  );
}

function wearLine(root) {
  if (!suitIsWorn(root)) return "not worn";
  if (!isGitWorkTree(root)) return "worn (no git: hooks skipped)";
  return "worn";
}

function packageVersion(packageRoot) {
  const pkg = readJson(path.join(packageRoot, "package.json"));
  return pkg && pkg.version ? String(pkg.version) : "";
}

function freshLine(version) {
  return `Fresh: up to date. package ${version}.`;
}

function seedNotes(root) {
  const dest = path.join(root, ".xray", "state", "NOTES.md");
  if (fs.existsSync(dest)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, NOTES_SEED);
  return true;
}

function stationSeed(version, plane) {
  return [
    "# Station",
    "",
    "Host: unknown (guided)",
    "Intent: (none yet)",
    "Plan: (none)",
    "Git: n/a",
    freshLine(version),
    "Repertoire: module unresolved",
    "Library: record-map — .agents/skills/record-map/SKILL.md",
    `Plane: ${plane}`,
    "Judgement: start",
    "Payments: off",
    "",
    "Continue this card. Compaction and host change are the same cut. Do not cold-start.",
    "Grok does not inject this file — Read it. OpenCode injects. Do not thicken the Grok exo.",
    "",
  ].join("\n");
}

function restampFresh(text, version) {
  if (!version) return text;
  if (!/^Fresh:.*\bpackage\s+\d+\.\d+\.\d+/m.test(text)) return text;
  return text.replace(/^(Fresh:.*\bpackage\s+)\d+\.\d+\.\d+/m, `$1${version}`);
}

function restampPlane(text, plane) {
  if (/^Plane:/m.test(text)) return text;
  if (!plane) return text;
  if (/^Library:.*$/m.test(text)) return text.replace(/^(Library:.*)$/m, `$1\nPlane: ${plane}`);
  return `${text.replace(/\s*$/, "")}\nPlane: ${plane}\n`;
}

function seedSuitPages(root, packageRoot) {
  const version = packageVersion(packageRoot);
  const lens = seatLens(root);
  const plane = lens && lens.plane ? lens.plane : "dev";
  seedNotes(root);
  const dest = path.join(root, ".xray", "state", "STATION.md");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, stationSeed(version, plane));
    return { version, plane, seeded: true };
  }
  const next = restampPlane(restampFresh(fs.readFileSync(dest, "utf8"), version), plane);
  if (next !== fs.readFileSync(dest, "utf8")) fs.writeFileSync(dest, next);
  return { version, plane, seeded: false };
}

module.exports = {
  PLANT_PLANE,
  NOTES_SEED,
  normalizePlant,
  fastenedPlantSkills,
  wornVersion,
  seatConfig,
  seatLens,
  isGitWorkTree,
  gogglesDisabled,
  suitIsWorn,
  wearLine,
  seedSuitPages,
  freshLine,
};
