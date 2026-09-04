/**
 * Mill overlay: fasten their plant as the suit. Not PPE (evaluatePreToolGate).
 *
 * Default SSOT (override with foundry.json or .xray/foundry.json):
 *   xray/codex.json, xray/features.json, xray/config.json,
 *   src/skills/<name>/SKILL.md, src/opencode/agents/*.yml
 */

const fs = require("fs");
const os = require("os");
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

/** Fasten mill plant first. Mill names they did not plant stay; same-name overlay wins. */
function fastenMillPlant(millPackageRoot, targetDir, log) {
  const plant = millPlantDir(millPackageRoot);
  if (!plant) return { skills: [], agents: [] };
  const skillsSrc = path.join(plant, "skills");
  const agentsSrc = path.join(plant, "agents");
  const skills = listSkillNamesAt(skillsSrc);
  const agents = listAgentFilesAt(agentsSrc);
  const skillDirs = listProjectSkillDirs(targetDir);
  const agentsDest = path.join(targetDir, ".opencode", "agents");
  for (const dir of skillDirs) {
    for (const name of skills) {
      const src = path.join(skillsSrc, name, "SKILL.md");
      const destMd = path.join(dir, name, "SKILL.md");
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
    log("foundry-mint", "Fastened mill plant", "info", {
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

/** Passwd home. `os.homedir()` follows $HOME and cannot detect last-mile isolation. */
function machineHome() {
  try {
    const passwd = os.userInfo().homedir;
    if (typeof passwd === "string" && passwd) return passwd;
  } catch {
    /* no passwd */
  }
  return os.homedir();
}

function processHome(env) {
  const e = env || process.env;
  return e.HOME || e.USERPROFILE || "";
}

function isIsolatedHome(env, machine) {
  const home = processHome(env);
  if (!home) return false;
  const real = machine || machineHome();
  try {
    return path.resolve(home) !== path.resolve(real);
  } catch {
    return false;
  }
}

function machineGrokPluginDir(machine) {
  return path.join(machine || machineHome(), ".grok", "plugins", "0xray");
}

function wouldClobberMachineGrok(dest, env, machine) {
  if (!dest) return false;
  const realMachine = machine || machineHome();
  if (!isIsolatedHome(env, realMachine)) return false;
  const real = path.resolve(machineGrokPluginDir(realMachine));
  const target = path.resolve(dest);
  return target === real || target.startsWith(`${real}${path.sep}`);
}

/**
 * Project skill dirs on every TUI floor. Create on fasten. Never machine home.
 * YML agents stay OpenCode (`.opencode/agents`).
 */
function listProjectSkillDirs(targetDir) {
  return [
    path.join(targetDir, ".opencode", "skills"),
    path.join(targetDir, ".grok", "plugins", "0xray", "skills"),
    path.join(targetDir, ".hermes", "plugins", "xray-hermes", "skills"),
    path.join(targetDir, ".openclaw", "skills"),
  ];
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

function wornSkillNames(targetDir) {
  const names = new Set();
  for (const dir of listProjectSkillDirs(targetDir)) {
    for (const name of listSkillNamesAt(dir)) names.add(name);
  }
  return [...names];
}

function wornAgentFiles(targetDir) {
  return listAgentFilesAt(path.join(targetDir, ".opencode", "agents"));
}

function previousTreeAllowlist(targetDir) {
  const file = path.join(targetDir, ".xray", "foundry-inventory.json");
  if (!fs.existsSync(file)) return { skills: [], agents: [] };
  try {
    const inventory = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      skills: Array.isArray(inventory?.tree?.skills) ? inventory.tree.skills : [],
      agents: Array.isArray(inventory?.tree?.agents) ? inventory.tree.agents : [],
    };
  } catch {
    return { skills: [], agents: [] };
  }
}

/** Extra worn names that are neither mill plant, their plant, nor a prior overlay. */
function costumeDumpExtras(targetDir, millPlant, tree) {
  const prior = previousTreeAllowlist(targetDir);
  const allowedSkills = new Set([
    ...(Array.isArray(millPlant?.skills) ? millPlant.skills : []),
    ...(Array.isArray(tree?.skills) ? tree.skills : []),
    ...prior.skills,
  ]);
  const allowedAgents = new Set([
    ...(Array.isArray(millPlant?.agents) ? millPlant.agents : []),
    ...(Array.isArray(tree?.agents) ? tree.agents : []),
    ...prior.agents,
  ]);
  return {
    extraSkills: wornSkillNames(targetDir).filter((name) => !allowedSkills.has(name)),
    extraAgents: wornAgentFiles(targetDir).filter((name) => !allowedAgents.has(name)),
  };
}

function assertNoCostumeDump(targetDir, millPlant, tree) {
  if (wantsCostume(targetDir)) {
    return { ok: true, extraSkills: [], extraAgents: [] };
  }
  const extras = costumeDumpExtras(targetDir, millPlant, tree);
  if (extras.extraSkills.length > 0 || extras.extraAgents.length > 0) {
    const listed = [...extras.extraSkills, ...extras.extraAgents].join(", ");
    const err = new Error(
      `foundry-inspect: costume dump without foundry.json "costume": true (${listed})`,
    );
    err.code = "FOUNDRY_COSTUME_DUMP";
    err.extraSkills = extras.extraSkills;
    err.extraAgents = extras.extraAgents;
    throw err;
  }
  return { ok: true, extraSkills: [], extraAgents: [] };
}

function overlayConsumerTree(targetDir, log, params) {
  const resolved = params || loadFoundryParams(targetDir);
  const skillsRel = resolved.skills;
  const agentsRel = resolved.agents;
  const skills = listConsumerSkillNames(targetDir, skillsRel);
  const agents = listConsumerAgentFiles(targetDir, agentsRel);
  const skillsSrc = resolveInside(targetDir, skillsRel);
  const agentsSrc = resolveInside(targetDir, agentsRel);
  const skillDirs = listProjectSkillDirs(targetDir);
  const agentsDest = path.join(targetDir, ".opencode", "agents");

  for (const dir of skillDirs) {
    for (const name of skills) {
      const src = path.join(skillsSrc, name, "SKILL.md");
      const destMd = path.join(dir, name, "SKILL.md");
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
    log("foundry-mint", "Overlaid consumer skills/agents", "info", {
      skills: skills.length,
      agents: agents.length,
      skillDirs: skillDirs.length,
    });
  }
  return { skills, agents, params: resolved };
}

function mintConsumerFromSsot(packageRoot, targetDir, log, tree) {
  if (isDogfood(packageRoot, targetDir)) {
    return { suit: "dogfood", skipped: true, consumer: readPackageIdentity(path.join(targetDir, "package.json")) };
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
  const suit = overlayed
    ? "overlay"
    : millPlanted
      ? "fastened"
      : costume
        ? "costume"
        : "fastened";
  const inventory = {
    mill: { name: mill.name || "@0xray/foundry", version: mill.version },
    consumer: { name: consumer.name, version: consumer.version },
    suit,
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
      suit,
    });
  }
  return inventory;
}

function mintConsumerSuit(millPackageRoot, targetDir, log) {
  if (isDogfood(millPackageRoot, targetDir)) {
    return { suit: "dogfood", skipped: true };
  }
  const params = loadFoundryParams(targetDir);
  const millPlant = fastenMillPlant(millPackageRoot, targetDir, log);
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
  assertNoCostumeDump(targetDir, millPlant, tree);
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
  listSkillNamesAt,
  listAgentFilesAt,
  fastenMillPlant,
  resolveInside,
  overlayJsonFacet,
  overlayAgentsCard,
  overlayConsumerTree,
  listConsumerSkillNames,
  listConsumerAgentFiles,
  listProjectSkillDirs,
  mintConsumerFromSsot,
  mintConsumerSuit,
  isDogfood,
  readPackageIdentity,
  wornSkillNames,
  wornAgentFiles,
  costumeDumpExtras,
  assertNoCostumeDump,
  machineHome,
  processHome,
  isIsolatedHome,
  machineGrokPluginDir,
  wouldClobberMachineGrok,
};
