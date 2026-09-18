/**
 * foundry-plant/0 — mill packages declare plants; foundry does not catalog organs.
 */
"use strict";

const fs = require("fs");
const path = require("path");
const { createRequire } = require("module");

const PROTOCOL = "foundry-plant/0";
const BUILTIN_MILL = { skills: ["mill", "inspect"], agents: ["mill.yml", "inspect.yml"] };
const PACKAGE_ALIASES = {
  blip: "@0xray/blip",
  sound: "@0xray/blip",
};

function plantError(message, code) {
  const err = new Error(message);
  err.code = code || "FOUNDRY_PLANT";
  return err;
}

function unresolvedPackageError(packageName) {
  const name = typeof packageName === "string" && packageName.trim() ? packageName.trim() : "mill";
  return plantError(
    `foundry-plant: mill package "${name}" is not installed. npm i ${name}`,
    "FOUNDRY_MILL_UNRESOLVED",
  );
}

function isDirectory(p) {
  try {
    return Boolean(p) && fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function listSkillNamesAt(skillsSrc) {
  if (!isDirectory(skillsSrc)) return [];
  const names = [];
  for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    if (!fs.existsSync(path.join(skillsSrc, entry.name, "SKILL.md"))) continue;
    names.push(entry.name);
  }
  return names;
}

function listAgentFilesAt(agentsSrc) {
  if (!isDirectory(agentsSrc)) return [];
  return fs
    .readdirSync(agentsSrc, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() && (entry.name.endsWith(".yml") || entry.name.endsWith(".yaml")),
    )
    .map((entry) => entry.name);
}

function existingPlantFiles(plantDir, spec) {
  if (!plantDir || !spec) return { skills: [], agents: [] };
  const haveSkills = new Set(listSkillNamesAt(path.join(plantDir, "skills")));
  const haveAgents = new Set(listAgentFilesAt(path.join(plantDir, "agents")));
  return {
    skills: (spec.skills || []).filter((name) => haveSkills.has(name)),
    agents: (spec.agents || []).filter((file) => haveAgents.has(file)),
  };
}

function readFoundryExtra(targetDir) {
  if (!targetDir) return {};
  const candidates = [
    path.join(targetDir, "foundry.json"),
    path.join(targetDir, ".xray", "foundry.json"),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

function foundryPlantDir(millPackageRoot) {
  const bases = millPackageRoot ? [millPackageRoot] : [__dirname];
  for (const base of bases) {
    const nested = path.join(base, "scripts", "foundry", "plant");
    if (isDirectory(nested)) return nested;
    const packed = path.join(base, "plant");
    if (isDirectory(packed)) return packed;
  }
  return null;
}

function isPackageName(name) {
  if (typeof name !== "string" || !name.trim()) return false;
  if (name.startsWith(".") || name.includes("\\")) return false;
  const parts = name.split("/");
  if (parts.includes("..") || parts.includes("")) return false;
  if (name.startsWith("@")) {
    return parts.length === 2 && parts[0].length > 1 && parts[1].length > 0;
  }
  return parts.length === 1;
}

function parsePlantToken(raw) {
  if (typeof raw !== "string") return null;
  const token = raw.trim();
  if (!token) return null;
  if (token === "mill") {
    return { builtin: true, kind: "mill", plantId: "mill", packageName: null, alias: false };
  }
  if (PACKAGE_ALIASES[token]) {
    return {
      builtin: false,
      kind: token,
      plantId: token,
      packageName: PACKAGE_ALIASES[token],
      alias: true,
    };
  }
  if (token.startsWith("@")) {
    const parts = token.split("/");
    if (parts.length < 2 || parts.length > 3) return null;
    if (!parts[0] || parts[0].length < 2 || !parts[1]) return null;
    if (parts.includes("..") || parts.includes(".")) return null;
    const packageName = `${parts[0]}/${parts[1]}`;
    if (!isPackageName(packageName)) return null;
    const plantId = parts.length === 3 && parts[2] ? parts[2] : null;
    return { builtin: false, kind: plantId, plantId, packageName, alias: false };
  }
  if (token.includes("\\") || token.startsWith(".") || token.split("/").includes("..")) return null;
  const slash = token.indexOf("/");
  if (slash === -1) {
    if (!isPackageName(token)) return null;
    return { builtin: false, kind: null, plantId: null, packageName: token, alias: false };
  }
  const packageName = token.slice(0, slash);
  const plantId = token.slice(slash + 1);
  if (!isPackageName(packageName) || !plantId || plantId.includes("/")) return null;
  return { builtin: false, kind: plantId, plantId, packageName, alias: false };
}

function readPkgName(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return typeof pkg.name === "string" ? pkg.name : null;
  } catch {
    return null;
  }
}

function walkNodeModules(fromDir, packageName) {
  let dir = path.resolve(fromDir);
  for (;;) {
    const candidate = path.join(dir, "node_modules", packageName, "package.json");
    if (fs.existsSync(candidate)) return path.dirname(candidate);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function packageRootFromResolved(resolved, packageName) {
  let dir = path.resolve(resolved);
  try {
    if (fs.existsSync(dir) && fs.statSync(dir).isFile()) dir = path.dirname(dir);
  } catch {
    dir = path.dirname(dir);
  }
  for (;;) {
    if (readPkgName(dir) === packageName) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function tryRequireResolve(fromDir, packageName) {
  try {
    const req = createRequire(path.join(path.resolve(fromDir), "package.json"));
    return packageRootFromResolved(req.resolve(packageName), packageName);
  } catch {
    return null;
  }
}

function resolvePackageRoot(packageName, dirs) {
  if (!isPackageName(packageName)) return null;
  if (typeof dirs === "string") {
    dirs = { targetDir: dirs, millPackageRoot: dirs, cwd: process.cwd() };
  }
  const d = dirs || {};
  const bases = [d.targetDir, d.millPackageRoot, d.cwd || process.cwd()].filter(
    (base) => typeof base === "string" && base.trim(),
  );
  const seen = new Set();
  for (const base of bases) {
    const abs = path.resolve(base);
    if (seen.has(abs)) continue;
    seen.add(abs);
    if (!fs.existsSync(abs)) continue;
    if (readPkgName(abs) === packageName) return abs;
    const fromNm = walkNodeModules(abs, packageName);
    if (fromNm) return fromNm;
    const fromReq = tryRequireResolve(abs, packageName);
    if (fromReq) return fromReq;
  }
  return null;
}

function resolvePlantPath(packageRoot, rel) {
  if (typeof rel !== "string" || !rel.trim() || path.isAbsolute(rel)) return null;
  const parts = rel.split(/[\\/]/);
  if (parts.includes("..")) return null;
  const rootAbs = path.resolve(packageRoot);
  const resolved = path.resolve(rootAbs, rel);
  const prefix = rootAbs.endsWith(path.sep) ? rootAbs : `${rootAbs}${path.sep}`;
  if (resolved !== rootAbs && !resolved.startsWith(prefix)) return null;
  return resolved;
}

function readMillOff(spec) {
  if (!spec || typeof spec !== "object") return undefined;
  if (spec.millOff === true) return true;
  if (spec.millOff === false) return false;
  return undefined;
}

function readProtocol(packageRoot) {
  if (!isDirectory(packageRoot)) {
    throw plantError(`foundry-plant: mill package root is missing (${packageRoot || ""})`);
  }
  const pkgPath = path.join(packageRoot, "package.json");
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  } catch {
    throw plantError(`foundry-plant: mill package.json is unreadable (${pkgPath})`);
  }
  const packageName = typeof pkg.name === "string" ? pkg.name : null;
  const paths = { skills: "plant/skills", agents: "plant/agents" };
  const mill = pkg.mill;
  if (!mill || typeof mill !== "object" || Array.isArray(mill)) {
    return {
      protocol: PROTOCOL,
      default: null,
      paths,
      plants: {},
      packageName,
      implicit: true,
    };
  }
  if (typeof mill.protocol === "string" && mill.protocol.trim() && mill.protocol.trim() !== PROTOCOL) {
    throw plantError(
      `foundry-plant: mill package "${packageName || "?"}" declares protocol "${mill.protocol}", expected ${PROTOCOL}`,
    );
  }
  if (mill.paths && typeof mill.paths === "object" && !Array.isArray(mill.paths)) {
    if (typeof mill.paths.skills === "string" && mill.paths.skills.trim()) {
      paths.skills = mill.paths.skills.trim();
    }
    if (typeof mill.paths.agents === "string" && mill.paths.agents.trim()) {
      paths.agents = mill.paths.agents.trim();
    }
  }
  const plants = {};
  if (mill.plants && typeof mill.plants === "object" && !Array.isArray(mill.plants)) {
    for (const key of Object.keys(mill.plants)) {
      const spec = mill.plants[key];
      if (!spec || typeof spec !== "object" || Array.isArray(spec)) continue;
      const entry = {};
      if (spec.millOff === true) entry.millOff = true;
      if (spec.millOff === false) entry.millOff = false;
      if (Array.isArray(spec.skills)) {
        entry.skills = spec.skills.filter((name) => typeof name === "string" && name.trim());
      }
      if (Array.isArray(spec.agents)) {
        entry.agents = spec.agents.filter((name) => typeof name === "string" && name.trim());
      }
      plants[key] = entry;
    }
  }
  return {
    protocol: PROTOCOL,
    default: typeof mill.default === "string" && mill.default.trim() ? mill.default.trim() : null,
    paths,
    plants,
    packageName,
    implicit: false,
  };
}

function prefixSelect(plantId, names, isAgent) {
  if (typeof plantId !== "string" || !plantId || !Array.isArray(names)) return [];
  const selected = [];
  for (const name of names) {
    if (typeof name !== "string") continue;
    let base = name;
    if (isAgent) {
      if (!/\.ya?ml$/i.test(name)) continue;
      base = name.replace(/\.ya?ml$/i, "");
    }
    if (base === plantId || base.startsWith(`${plantId}-`)) selected.push(name);
  }
  return selected;
}

function declaredPlantFiles(packageRoot, plantId, protocol) {
  const proto = protocol || readProtocol(packageRoot);
  const spec = proto.plants[plantId] || {};
  const skillsDir = resolvePlantPath(packageRoot, proto.paths.skills);
  const agentsDir = resolvePlantPath(packageRoot, proto.paths.agents);
  const listedSkills = listSkillNamesAt(skillsDir);
  const listedAgents = listAgentFilesAt(agentsDir);
  const skills =
    Array.isArray(spec.skills) && spec.skills.length > 0
      ? spec.skills.filter((name) => typeof name === "string" && name.trim())
      : prefixSelect(plantId, listedSkills, false);
  const agents =
    Array.isArray(spec.agents) && spec.agents.length > 0
      ? spec.agents.filter((name) => typeof name === "string" && name.trim())
      : prefixSelect(plantId, listedAgents, true);
  return {
    skills,
    agents,
    millOff: readMillOff(spec),
    skillsDir,
    agentsDir,
    protocol: proto.protocol,
    packageName: proto.packageName,
    plantId,
  };
}

function selectPlantFiles(packageRoot, plantId, protocol) {
  const declared = declaredPlantFiles(packageRoot, plantId, protocol);
  const haveSkills = new Set(listSkillNamesAt(declared.skillsDir));
  const haveAgents = new Set(listAgentFilesAt(declared.agentsDir));
  return {
    ...declared,
    skills: declared.skills.filter((name) => haveSkills.has(name)),
    agents: declared.agents.filter((file) => haveAgents.has(file)),
  };
}

function collectPlantTokens(cfg) {
  const raw = cfg && cfg.plant;
  if (Array.isArray(raw)) {
    return { tokens: raw.filter((item) => typeof item === "string"), defaultMill: false };
  }
  if (typeof raw === "string" && raw.trim()) {
    return { tokens: [raw.trim()], defaultMill: false };
  }
  if (cfg && (cfg.soundPlant === true || cfg.blipPlant === true)) {
    const tokens = [];
    if (cfg.soundPlant === true) tokens.push("sound");
    if (cfg.blipPlant === true) tokens.push("blip");
    return { tokens, defaultMill: true };
  }
  return { tokens: [], defaultMill: true };
}

function builtinMillSeat(millPackageRoot) {
  const plant = foundryPlantDir(millPackageRoot);
  const files = existingPlantFiles(plant, BUILTIN_MILL);
  return {
    kind: "mill",
    builtin: true,
    packageName: null,
    packageRoot: millPackageRoot || __dirname,
    plantId: "mill",
    millOff: false,
    protocol: null,
    skills: files.skills,
    agents: files.agents,
    skillsDir: plant ? path.join(plant, "skills") : null,
    agentsDir: plant ? path.join(plant, "agents") : null,
  };
}

function includeMill(cfg, defaultMill, seats) {
  if (cfg && cfg.millPlant === false) return false;
  if (defaultMill) return true;
  if (seats.some((seat) => seat.millOff === true)) return false;
  if (seats.some((seat) => seat.millOff === false)) return true;
  return false;
}

function uniqueSeats(seats) {
  const seen = new Set();
  const out = [];
  for (const seat of seats) {
    if (!seat || !seat.kind || seen.has(seat.kind)) continue;
    seen.add(seat.kind);
    out.push(seat);
  }
  return out;
}

function resolvePlantSeats(targetDir, millPackageRoot, extra) {
  const cfg =
    extra && typeof extra === "object" && !Array.isArray(extra) ? extra : readFoundryExtra(targetDir);
  const { tokens, defaultMill } = collectPlantTokens(cfg);
  const dirs = { targetDir, millPackageRoot, cwd: process.cwd() };
  const seats = [];

  for (const token of tokens) {
    const parsed = parsePlantToken(token);
    if (!parsed) {
      throw plantError(`foundry-plant: invalid foundry.json plant ${JSON.stringify(token)}`);
    }
    if (parsed.builtin) {
      if (!seats.some((seat) => seat.builtin)) seats.push(builtinMillSeat(millPackageRoot));
      continue;
    }
    const packageRoot = resolvePackageRoot(parsed.packageName, dirs);
    if (!packageRoot) throw unresolvedPackageError(parsed.packageName);
    const protocol = readProtocol(packageRoot);
    const plantId = parsed.plantId || protocol.default;
    if (!plantId) {
      throw plantError(
        `foundry-plant: mill package "${parsed.packageName}" has no default plant id`,
      );
    }
    const files = selectPlantFiles(packageRoot, plantId, protocol);
    if (!files.skills || files.skills.length === 0) {
      throw plantError(
        `foundry-plant: mill package "${parsed.packageName}" plant "${plantId}" has no skills`,
      );
    }
    seats.push({
      kind: plantId,
      builtin: false,
      packageName: protocol.packageName || parsed.packageName,
      packageRoot,
      plantId,
      millOff: files.millOff,
      protocol: protocol.protocol,
      skills: files.skills,
      agents: files.agents,
      skillsDir: files.skillsDir,
      agentsDir: files.agentsDir,
    });
  }

  if (!seats.some((seat) => seat.builtin) && includeMill(cfg, defaultMill, seats)) {
    seats.unshift(builtinMillSeat(millPackageRoot));
  }
  if (cfg.millPlant === false) {
    return uniqueSeats(seats.filter((seat) => !seat.builtin));
  }
  return uniqueSeats(seats);
}

function plantKindsFromSeats(seats) {
  const kinds = [];
  for (const seat of Array.isArray(seats) ? seats : []) {
    if (seat && seat.kind && !kinds.includes(seat.kind)) kinds.push(seat.kind);
  }
  return kinds;
}

function plantKindsFromInventory(inventory) {
  if (!inventory || typeof inventory !== "object") return ["mill"];
  if (Array.isArray(inventory.plant) && inventory.plant.length > 0) {
    const kinds = [];
    for (const item of inventory.plant) {
      if (typeof item !== "string") continue;
      const kind = item.trim();
      if (kind && !kinds.includes(kind)) kinds.push(kind);
    }
    if (kinds.length > 0) return kinds;
  }
  if (typeof inventory.plant === "string" && inventory.plant.trim()) {
    return [inventory.plant.trim()];
  }
  const kinds = [];
  if (Array.isArray(inventory.millPlant?.skills) && inventory.millPlant.skills.length > 0) {
    kinds.push("mill");
  }
  if (Array.isArray(inventory.soundPlant?.skills) && inventory.soundPlant.skills.length > 0) {
    kinds.push("sound");
  }
  if (Array.isArray(inventory.blipPlant?.skills) && inventory.blipPlant.skills.length > 0) {
    kinds.push("blip");
  }
  if (inventory.plants && typeof inventory.plants === "object") {
    for (const key of Object.keys(inventory.plants)) {
      const spec = inventory.plants[key];
      if (Array.isArray(spec?.skills) && spec.skills.length > 0 && !kinds.includes(key)) {
        kinds.push(key);
      }
    }
  }
  return kinds.length > 0 ? kinds : ["mill"];
}

function inventoryFilesForKind(inventory, kind) {
  if (kind === "mill") return inventory?.millPlant || { skills: [], agents: [] };
  if (kind === "sound") return inventory?.soundPlant || { skills: [], agents: [] };
  if (kind === "blip") return inventory?.blipPlant || { skills: [], agents: [] };
  return (inventory?.plants && inventory.plants[kind]) || { skills: [], agents: [] };
}

function parsePlantRef(raw) {
  const parsed = parsePlantToken(raw);
  if (!parsed) {
    throw plantError(`foundry-plant: invalid foundry.json plant ${JSON.stringify(raw)}`);
  }
  return parsed;
}

function loadPlantRequests(targetDir, millPackageRoot, extra) {
  return resolvePlantSeats(targetDir, millPackageRoot, extra).map((seat) => ({
    plantId: seat.kind,
    builtin: Boolean(seat.builtin),
    packageName: seat.packageName,
    packageRoot: seat.packageRoot,
    millOff: seat.millOff,
    protocol: seat.protocol,
    skills: seat.skills,
    agents: seat.agents,
    skillsDir: seat.skillsDir,
    agentsDir: seat.agentsDir,
  }));
}

function declaredReceiptSeats(inventory, targetDir, millPackageRoot) {
  const kinds = plantKindsFromInventory(inventory);
  const dirs = { targetDir, millPackageRoot, cwd: process.cwd() };
  const seats = [];
  for (const kind of kinds) {
    if (kind === "mill") {
      seats.push({
        kind: "mill",
        builtin: true,
        skills: [...BUILTIN_MILL.skills],
        agents: [...BUILTIN_MILL.agents],
      });
      continue;
    }
    const packageName =
      (typeof inventory?.millPackage === "string" && inventory.millPackage.trim()) ||
      PACKAGE_ALIASES[kind] ||
      null;
    if (!packageName) throw unresolvedPackageError(kind);
    const packageRoot = resolvePackageRoot(packageName, dirs);
    if (!packageRoot) throw unresolvedPackageError(packageName);
    const protocol = readProtocol(packageRoot);
    const files = declaredPlantFiles(packageRoot, kind, protocol);
    seats.push({
      kind,
      builtin: false,
      packageName: protocol.packageName || packageName,
      packageRoot,
      plantId: kind,
      protocol: protocol.protocol,
      skills: files.skills,
      agents: files.agents,
    });
  }
  return seats;
}

module.exports = {
  PROTOCOL,
  FOUNDRY_PLANT_PROTOCOL: PROTOCOL,
  BUILTIN_MILL,
  PACKAGE_ALIASES,
  plantError,
  unresolvedPackageError,
  readFoundryExtra,
  foundryPlantDir,
  parsePlantToken,
  parsePlantRef,
  loadPlantRequests,
  resolvePackageRoot,
  readProtocol,
  prefixSelect,
  declaredPlantFiles,
  selectPlantFiles,
  resolvePlantSeats,
  plantKindsFromSeats,
  plantKindsFromInventory,
  inventoryFilesForKind,
  declaredReceiptSeats,
  listSkillNamesAt,
  listAgentFilesAt,
  existingPlantFiles,
};
