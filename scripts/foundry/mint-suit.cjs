/**
 * Mill overlay: their plant onto the hanger. Not PPE (evaluatePreToolGate).
 *
 * Default SSOT (override with foundry.json or .xray/foundry.json):
 *   xray/codex.json, xray/features.json, xray/config.json,
 *   src/skills/<name>/SKILL.md, src/opencode/agents/*.yml
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_PARAMS = {
  codex: "xray/codex.json",
  features: "xray/features.json",
  config: "xray/config.json",
  skills: "src/skills",
  agents: "src/opencode/agents",
  agentsCard: "xray/AGENTS.md",
};

function deepMerge(src, dest) {
  if (typeof src !== "object" || src === null) return dest !== undefined ? dest : src;
  if (Array.isArray(src)) return Array.isArray(dest) ? dest : src;
  const result = {};
  for (const key of Object.keys(src)) {
    result[key] =
      dest && typeof dest[key] !== "undefined" ? deepMerge(src[key], dest[key]) : src[key];
  }
  if (dest && typeof dest === "object") {
    for (const key of Object.keys(dest)) {
      if (!(key in src)) result[key] = dest[key];
    }
  }
  return result;
}

function readPackageIdentity(pkgPath) {
  if (!fs.existsSync(pkgPath)) return { name: null, version: null };
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    return {
      name: typeof pkg.name === "string" ? pkg.name : null,
      version: typeof pkg.version === "string" ? pkg.version : null,
    };
  } catch {
    return { name: null, version: null };
  }
}

function isExoRepo(dir) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8"));
    return pkg.name === "0xray" && fs.existsSync(path.join(dir, "docs-site"));
  } catch {
    return false;
  }
}

function isDogfood(millPackageRoot, targetDir) {
  if (path.resolve(millPackageRoot) === path.resolve(targetDir)) return true;
  return isExoRepo(targetDir);
}

/** Rel must stay inside targetDir. Absolute and `..` escapes return null. */
function resolveInside(targetDir, rel) {
  if (typeof rel !== "string" || !rel.trim()) return null;
  if (path.isAbsolute(rel)) return null;
  const rootAbs = path.resolve(targetDir);
  const resolved = path.resolve(rootAbs, rel);
  const prefix = rootAbs.endsWith(path.sep) ? rootAbs : `${rootAbs}${path.sep}`;
  if (resolved !== rootAbs && !resolved.startsWith(prefix)) return null;
  return resolved;
}

function loadFoundryExtra(targetDir) {
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

function loadFoundryParams(targetDir) {
  const extra = loadFoundryExtra(targetDir);
  const params = { ...DEFAULT_PARAMS };
  for (const key of ["codex", "features", "config", "skills", "agents", "agentsCard"]) {
    if (typeof extra[key] === "string" && extra[key].trim()) params[key] = extra[key].trim();
  }
  return params;
}

/** 45/42 costume dump. Default false on consumers. Exo mill keeps the costume. */
function wantsCostume(targetDir) {
  if (isExoRepo(targetDir)) return true;
  return loadFoundryExtra(targetDir).costume === true;
}

function millPlantDir(millPackageRoot) {
  const nested = path.join(millPackageRoot, "scripts", "foundry", "plant");
  if (isDirectory(nested)) return nested;
  const packed = path.join(millPackageRoot, "plant");
  if (isDirectory(packed)) return packed;
  return null;
}

function listSkillNamesAt(skillsSrc) {
  if (!isDirectory(skillsSrc)) return [];
  const names = [];
  for (const entry of fs.readdirSync(skillsSrc, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const skillMd = path.join(skillsSrc, entry.name, "SKILL.md");
    if (!fs.existsSync(skillMd)) continue;
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

/** Mill mill-fill mill plant: mill mill mill mill-fill mill names they did not plant stay. */
function millFillMillPlant(millPackageRoot, targetDir, log) {
  const plant = millPlantDir(millPackageRoot);
  if (!plant) return { skills: [], agents: [] };
  const skillsSrc = path.join(plant, "skills");
  const agentsSrc = path.join(plant, "agents");
  const skills = listSkillNamesAt(skillsSrc);
  const agents = listAgentFilesAt(agentsSrc);
  const skillHangers = listSkillHangers(targetDir);
  const agentsDest = path.join(targetDir, ".opencode", "agents");
  for (const hanger of skillHangers) {
    for (const name of skills) {
      const src = path.join(skillsSrc, name, "SKILL.md");
      const destMd = path.join(hanger, name, "SKILL.md");
      if (path.resolve(src) === path.resolve(destMd)) continue;
      if (fs.existsSync(destMd)) continue;
      fs.mkdirSync(path.dirname(destMd), { recursive: true });
      fs.copyFileSync(src, destMd);
    }
  }
  for (const file of agents) {
    const src = path.join(agentsSrc, file);
    const dest = path.join(agentsDest, file);
    if (path.resolve(src) === path.resolve(dest)) continue;
    if (fs.existsSync(dest)) continue;
    fs.mkdirSync(agentsDest, { recursive: true });
    fs.copyFileSync(src, dest);
  }
  if (log && (skills.length > 0 || agents.length > 0)) {
    log("foundry-mint", "Mill plant onto hangers", "info", {
      skills: skills.length,
      agents: agents.length,
    });
  }
  return { skills, agents };
}

function isDirectory(p) {
  try {
    return Boolean(p) && fs.existsSync(p) && fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/** Project skill hangers only. */
function listSkillHangers(targetDir) {
  const dests = [path.join(targetDir, ".opencode", "skills")];
  const projectGrok = path.join(targetDir, ".grok", "plugins", "0xray", "skills");
  if (isDirectory(projectGrok)) dests.push(projectGrok);
  return dests;
}

function overlayJsonFacet(src, dest) {
  if (!src || !fs.existsSync(src) || !fs.statSync(src).isFile()) return false;
  if (path.resolve(src) === path.resolve(dest)) return false;
  let theirs;
  try {
    theirs = JSON.parse(fs.readFileSync(src, "utf8"));
  } catch {
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (!fs.existsSync(dest)) {
    fs.writeFileSync(dest, `${JSON.stringify(theirs, null, 2)}\n`);
    return true;
  }
  try {
    const mill = JSON.parse(fs.readFileSync(dest, "utf8"));
    const merged = deepMerge(mill, theirs);
    fs.writeFileSync(dest, `${JSON.stringify(merged, null, 2)}\n`);
    return true;
  } catch {
    return false;
  }
}

function listConsumerSkillNames(targetDir, skillsRel) {
  const rel = skillsRel || DEFAULT_PARAMS.skills;
  const skillsSrc = resolveInside(targetDir, rel);
  return listSkillNamesAt(skillsSrc);
}

function listConsumerAgentFiles(targetDir, agentsRel) {
  const rel = agentsRel || DEFAULT_PARAMS.agents;
  const agentsSrc = resolveInside(targetDir, rel);
  return listAgentFilesAt(agentsSrc);
}

const MANAGED_AGENTS_MARKER = "<!-- 0xray-managed -->";

function overlayAgentsCard(targetDir, params) {
  const src = resolveInside(targetDir, params.agentsCard || DEFAULT_PARAMS.agentsCard);
  if (!src || !fs.existsSync(src) || !fs.statSync(src).isFile()) return false;
  const dest = path.join(targetDir, "AGENTS.md");
  if (path.resolve(src) === path.resolve(dest)) return false;
  if (fs.existsSync(dest) && !fs.readFileSync(dest, "utf8").includes(MANAGED_AGENTS_MARKER)) {
    return false;
  }
  fs.copyFileSync(src, dest);
  return true;
}

function overlayConsumerTree(targetDir, log, params) {
  const resolved = params || loadFoundryParams(targetDir);
  const skillsRel = resolved.skills;
  const agentsRel = resolved.agents;
  const skills = listConsumerSkillNames(targetDir, skillsRel);
  const agents = listConsumerAgentFiles(targetDir, agentsRel);
  const skillsSrc = resolveInside(targetDir, skillsRel);
  const agentsSrc = resolveInside(targetDir, agentsRel);
  const skillHangers = listSkillHangers(targetDir);
  const agentsDest = path.join(targetDir, ".opencode", "agents");

  for (const hanger of skillHangers) {
    for (const name of skills) {
      const src = path.join(skillsSrc, name, "SKILL.md");
      const destMd = path.join(hanger, name, "SKILL.md");
      if (path.resolve(src) === path.resolve(destMd)) continue;
      fs.mkdirSync(path.dirname(destMd), { recursive: true });
      fs.copyFileSync(src, destMd);
    }
  }
  for (const file of agents) {
    const src = path.join(agentsSrc, file);
    const dest = path.join(agentsDest, file);
    if (path.resolve(src) === path.resolve(dest)) continue;
    fs.mkdirSync(agentsDest, { recursive: true });
    fs.copyFileSync(src, dest);
  }

  if (log && (skills.length > 0 || agents.length > 0)) {
    log("foundry-mint", "Overlaid consumer skills/agents onto hangers", "info", {
      skills: skills.length,
      agents: agents.length,
      skillHangers: skillHangers.length,
    });
  }
  return { skills, agents, params: resolved };
}

function mintConsumerFromSsot(packageRoot, targetDir, log, tree) {
  if (isDogfood(packageRoot, targetDir)) {
    return { garment: "dogfood", skipped: true, consumer: readPackageIdentity(path.join(targetDir, "package.json")) };
  }
  const mill = readPackageIdentity(path.join(packageRoot, "package.json"));
  const consumer = readPackageIdentity(path.join(targetDir, "package.json"));
  const skills = Array.isArray(tree?.skills) ? tree.skills : [];
  const agents = Array.isArray(tree?.agents) ? tree.agents : [];
  const constitution = Boolean(tree?.codex);
  const features = Boolean(tree?.features);
  const config = Boolean(tree?.config);
  const agentsCard = Boolean(tree?.agentsCard);
  const overlayed =
    skills.length > 0 ||
    agents.length > 0 ||
    constitution ||
    features ||
    config ||
    agentsCard;
  const millPlanted =
    (Array.isArray(tree?.millPlantSkills) && tree.millPlantSkills.length > 0) ||
    (Array.isArray(tree?.millPlantAgents) && tree.millPlantAgents.length > 0);
  const costume = wantsCostume(targetDir);
  const garment = overlayed
    ? "overlay"
    : millPlanted
      ? "mill-fill"
      : costume
        ? "copied-onto-hanger"
        : "mill-fill";
  const inventory = {
    mill: { name: mill.name || "@0xray/foundry", version: mill.version },
    consumer: { name: consumer.name, version: consumer.version },
    garment,
    params: tree?.params || loadFoundryParams(targetDir),
    tree: { skills, agents },
    millPlant: {
      skills: Array.isArray(tree?.millPlantSkills) ? tree.millPlantSkills : [],
      agents: Array.isArray(tree?.millPlantAgents) ? tree.millPlantAgents : [],
    },
    costume,
    facets: {
      constitution,
      features,
      config,
      agentsCard,
      skills,
      agents,
    },
    mintedAt: new Date().toISOString(),
  };
  const xrayDir = path.join(targetDir, ".xray");
  if (!fs.existsSync(xrayDir)) fs.mkdirSync(xrayDir, { recursive: true });
  fs.writeFileSync(
    path.join(xrayDir, "foundry-inventory.json"),
    `${JSON.stringify(inventory, null, 2)}\n`,
  );
  if (log) {
    log("foundry-mint", "Minted foundry-inventory from consumer mill SSOT", "info", {
      consumer: consumer.name,
      version: consumer.version,
      garment,
    });
  }
  return inventory;
}

function mintConsumerSuit(millPackageRoot, targetDir, log) {
  if (isDogfood(millPackageRoot, targetDir)) {
    return { garment: "dogfood", skipped: true };
  }
  const params = loadFoundryParams(targetDir);
  const millPlant = millFillMillPlant(millPackageRoot, targetDir, log);
  const tree = overlayConsumerTree(targetDir, log, params);
  tree.millPlantSkills = millPlant.skills;
  tree.millPlantAgents = millPlant.agents;
  tree.codex = overlayJsonFacet(
    resolveInside(targetDir, params.codex),
    path.join(targetDir, ".xray", "codex.json"),
  );
  tree.features = overlayJsonFacet(
    resolveInside(targetDir, params.features),
    path.join(targetDir, ".xray", "features.json"),
  );
  tree.config = overlayJsonFacet(
    resolveInside(targetDir, params.config),
    path.join(targetDir, ".xray", "config.json"),
  );
  tree.agentsCard = overlayAgentsCard(targetDir, params);
  if (log && (tree.codex || tree.features || tree.config)) {
    log("foundry-mint", "Overlaid consumer suit facets onto .xray", "info", {
      constitution: tree.codex,
      features: tree.features,
      config: tree.config,
    });
  }
  return mintConsumerFromSsot(millPackageRoot, targetDir, log, tree);
}

module.exports = {
  DEFAULT_PARAMS,
  deepMerge,
  loadFoundryParams,
  loadFoundryExtra,
  wantsCostume,
  millPlantDir,
  millFillMillPlant,
  resolveInside,
  overlayJsonFacet,
  overlayAgentsCard,
  overlayConsumerTree,
  listConsumerSkillNames,
  listConsumerAgentFiles,
  listSkillHangers,
  mintConsumerFromSsot,
  mintConsumerSuit,
  isDogfood,
  readPackageIdentity,
};
