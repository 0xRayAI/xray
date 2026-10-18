/**
 * Suit seat: the fastened plant, the wear proof, and the station stamp.
 * TODO(#385): the role picker ranks the full catalog. This map is only the
 * plant or role line from suit config until that picker lands.
 */
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PLANT_SKILLS = {
  mill: ["mill", "inspect"],
  sound: ["sound", "sound-inspect", "sound-mixer"],
  blip: ["blip-vibe", "blip-looker"],
};

const SEAT_LENS = {
  mill: {
    card: "integration",
    plane: "integration",
    skills: "mill, inspect, testing-best-practices, backend-engineer, git-workflow",
  },
  implementer: {
    card: "integration",
    plane: "integration",
    skills: "mill, inspect, testing-best-practices, backend-engineer, git-workflow",
  },
  sound: {
    card: "ecosystem",
    plane: "ecosystem",
    skills: "sound, sound-inspect, sound-mixer, foundry, tech-writer",
  },
  blip: {
    card: "ecosystem",
    plane: "ecosystem",
    skills: "blip-vibe, blip-looker, foundry, tech-writer, project-analysis",
  },
  critic: {
    card: "integration",
    plane: "integration",
    skills: "code-review, testing-best-practices, security-audit, enforcer, researcher",
  },
  reviewer: {
    card: "integration",
    plane: "integration",
    skills: "code-review, testing-best-practices, security-audit, enforcer, researcher",
  },
  forge: {
    card: "integration",
    plane: "integration",
    skills: "orchestrator, foundry, git-workflow, project-analysis, tech-writer",
  },
  cos: {
    card: "integration",
    plane: "integration",
    skills: "orchestrator, strategist, reporting, project-analysis, git-workflow",
  },
  herald: {
    card: "integration",
    plane: "integration",
    skills: "reporting, orchestrator, tech-writer, project-analysis, git-workflow",
  },
  blinky: {
    card: "ecosystem",
    plane: "ecosystem",
    skills: "foundry, tech-writer, project-analysis, git-workflow, orchestrator",
  },
  nibbler: {
    card: "dev",
    plane: "dev",
    skills: "researcher, content-creator, seo-consultant, tech-writer, project-analysis",
  },
};

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

function fastenedPlantSkills(root) {
  const inventory = readJson(path.join(root, ".xray", "foundry-inventory.json"));
  const fromInventory = [];
  if (inventory && typeof inventory === "object") {
    pushNames(fromInventory, inventory.millPlant && inventory.millPlant.skills);
    pushNames(fromInventory, inventory.soundPlant && inventory.soundPlant.skills);
    pushNames(fromInventory, inventory.blipPlant && inventory.blipPlant.skills);
    if (inventory.plants && typeof inventory.plants === "object") {
      for (const spec of Object.values(inventory.plants)) {
        pushNames(fromInventory, spec && spec.skills);
      }
    }
  }
  if (fromInventory.length) return fromInventory;
  const kinds = [];
  const extra = foundryExtra(root);
  if (Array.isArray(extra.plant)) pushNames(kinds, extra.plant);
  else if (typeof extra.plant === "string" && extra.plant.trim()) kinds.push(extra.plant.trim());
  else if (declaredPlant(root)) kinds.push(declaredPlant(root));
  const names = [];
  for (const kind of kinds) {
    const list = PLANT_SKILLS[normalizePlant(kind)];
    if (list) pushNames(names, list);
  }
  if (names.length) return names;
  return PLANT_SKILLS.mill.slice();
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
  const plant = normalizePlant(declaredPlant(root));
  const version = wornVersion(root);
  if (!role && !plant && !version) return null;
  return { role, plant: plant || "mill", version };
}

function seatLens(root) {
  const seat = seatConfig(root);
  if (!seat) return null;
  const picked = (seat.role && SEAT_LENS[seat.role]) || SEAT_LENS[seat.plant] || SEAT_LENS.mill;
  const worn = seat.version ? `${seat.plant} ${seat.version}` : seat.plant;
  return {
    card: picked.card,
    plane: picked.plane,
    skills: picked.skills,
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
  const line = freshLine(version);
  if (/^Fresh:.*\bpackage\s+\d+\.\d+\.\d+/m.test(text)) {
    return text.replace(/^(Fresh:.*\bpackage\s+)\d+\.\d+\.\d+/m, `$1${version}`);
  }
  if (/^Fresh:/m.test(text)) return text.replace(/^Fresh:.*$/m, line);
  if (/^Git:.*$/m.test(text)) return text.replace(/^(Git:.*)$/m, `$1\n${line}`);
  return text.replace(/^(# Station\s*\n)/, `$1\n${line}\n`);
}

function restampPlane(text, plane) {
  if (/^Plane:/m.test(text)) return text.replace(/^Plane:.*$/m, `Plane: ${plane}`);
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
  PLANT_SKILLS,
  SEAT_LENS,
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
