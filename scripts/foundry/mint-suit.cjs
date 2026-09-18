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

const { attachInventoryDna, inventoryDna } = require("./mill-dna.cjs");
const millPlantProtocol = require("./mill-plant.cjs");

const DEFAULT_PARAMS = {
  codex: "xray/codex.json",
  features: "xray/features.json",
  config: "xray/config.json",
  skills: "src/skills",
  agents: "src/opencode/agents",
  agentsCard: "xray/AGENTS.md",
};

/** Factory shop plant. First-class with mill plant. Not 45/42 costume. */
const FACTORY_SHOP_SKILLS = ["shop-extract", "shop-witness", "shop-pin"];

/** Builtin mill only. Package plants (blip, sound, @scope/pkg/prefix) use mill-plant.cjs. */
const FACTORY_PLANT_CATALOG = {
  mill: { skills: ["mill", "inspect"], agents: ["mill.yml", "inspect.yml"] },
};

function isFactoryPlantKind(kind) {
  return Boolean(millPlantProtocol.parsePlantToken(kind));
}

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
  return millPlantProtocol.foundryPlantDir(millPackageRoot);
}

function emptyPlantFiles() {
  return { skills: [], agents: [] };
}

function catalogPlant(kind, millPackageRoot) {
  if (!kind || kind === "mill") {
    const spec = FACTORY_PLANT_CATALOG.mill;
    return spec ? { skills: [...spec.skills], agents: [...spec.agents] } : emptyPlantFiles();
  }
  const parsed = millPlantProtocol.parsePlantToken(kind);
  if (!parsed || parsed.builtin) {
    const spec = FACTORY_PLANT_CATALOG.mill;
    return spec ? { skills: [...spec.skills], agents: [...spec.agents] } : emptyPlantFiles();
  }
  const pkgRoot = millPlantProtocol.resolvePackageRoot(parsed.packageName, {
    targetDir: millPackageRoot,
    millPackageRoot,
    cwd: process.cwd(),
  });
  if (!pkgRoot) throw millPlantProtocol.unresolvedPackageError(parsed.packageName);
  const plantId = parsed.plantId || millPlantProtocol.readProtocol(pkgRoot).default;
  if (!plantId) {
    throw millPlantProtocol.plantError(
      `foundry-plant: mill package "${parsed.packageName}" has no default plant id`,
    );
  }
  const files = millPlantProtocol.selectPlantFiles(pkgRoot, plantId);
  return { skills: [...files.skills], agents: [...files.agents] };
}

/** foundry.json plant: mill | @scope/name | @scope/name/id | blip|sound aliases | array. millPlant:false strips mill. */
function loadFactoryPlantKinds(targetDir, millPackageRoot) {
  const extra = loadFoundryExtra(targetDir);
  const seats = millPlantProtocol.resolvePlantSeats(targetDir, millPackageRoot, extra);
  return millPlantProtocol.plantKindsFromSeats(seats);
}

function unionPlantFiles(kinds, millPackageRoot) {
  const skills = [];
  const agents = [];
  for (const kind of kinds) {
    const spec = catalogPlant(kind, millPackageRoot);
    for (const name of spec.skills) {
      if (!skills.includes(name)) skills.push(name);
    }
    for (const file of spec.agents) {
      if (!agents.includes(file)) agents.push(file);
    }
  }
  return { skills, agents };
}

function existingPlantFiles(plantDir, spec) {
  if (!plantDir || !spec) return emptyPlantFiles();
  const skillsSrc = path.join(plantDir, "skills");
  const agentsSrc = path.join(plantDir, "agents");
  const haveSkills = new Set(listSkillNamesAt(skillsSrc));
  const haveAgents = new Set(listAgentFilesAt(agentsSrc));
  return {
    skills: spec.skills.filter((name) => haveSkills.has(name)),
    agents: spec.agents.filter((file) => haveAgents.has(file)),
  };
}

function factoryPlantAllowlist(millPackageRoot, targetDir) {
  const extra = loadFoundryExtra(targetDir);
  const seats = millPlantProtocol.resolvePlantSeats(targetDir, millPackageRoot, extra);
  const skills = [];
  const agents = [];
  for (const seat of seats) {
    for (const name of seat.skills || []) {
      if (!skills.includes(name)) skills.push(name);
    }
    for (const file of seat.agents || []) {
      if (!agents.includes(file)) agents.push(file);
    }
  }
  return { kinds: millPlantProtocol.plantKindsFromSeats(seats), skills, agents, seats };
}

function inventoryPlantKinds(inventory) {
  return millPlantProtocol.plantKindsFromInventory(inventory);
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

function copyPlantFiles(plant, spec, targetDir) {
  const skillsSrc = spec.skillsDir || (plant ? path.join(plant, "skills") : null);
  const agentsSrc = spec.agentsDir || (plant ? path.join(plant, "agents") : null);
  const skills = spec.skills || [];
  const agents = spec.agents || [];
  const skillDirs = listProjectSkillDirs(targetDir);
  const agentsDest = path.join(targetDir, ".opencode", "agents");
  if (skillsSrc) {
    for (const dir of skillDirs) {
      for (const name of skills) {
        const src = path.join(skillsSrc, name, "SKILL.md");
        const destMd = path.join(dir, name, "SKILL.md");
        if (!fs.existsSync(src)) continue;
        if (path.resolve(src) === path.resolve(destMd)) continue;
        if (fs.existsSync(destMd)) continue;
        fs.mkdirSync(path.dirname(destMd), { recursive: true });
        fs.copyFileSync(src, destMd);
      }
    }
  }
  if (agentsSrc) {
    for (const file of agents) {
      const src = path.join(agentsSrc, file);
      const dest = path.join(agentsDest, file);
      if (!fs.existsSync(src)) continue;
      if (path.resolve(src) === path.resolve(dest)) continue;
      if (fs.existsSync(dest)) continue;
      fs.mkdirSync(agentsDest, { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
  return { skills, agents };
}

/** Fasten requested plants. Mill files come from this foundry plant/. Mill-package organs come from that package. */
function fastenMillPlant(millPackageRoot, targetDir, log) {
  const extra = loadFoundryExtra(targetDir);
  const seats = millPlantProtocol.resolvePlantSeats(targetDir, millPackageRoot, extra);
  const kinds = millPlantProtocol.plantKindsFromSeats(seats);
  const millSeat = seats.find((seat) => seat.builtin && seat.kind === "mill");
  const soundSeat = seats.find((seat) => seat.kind === "sound");
  const blipSeat = seats.find((seat) => seat.kind === "blip");
  const mill = millSeat
    ? { skills: [...millSeat.skills], agents: [...millSeat.agents] }
    : emptyPlantFiles();
  const sound = soundSeat
    ? { skills: [...soundSeat.skills], agents: [...soundSeat.agents] }
    : emptyPlantFiles();
  const blip = blipSeat
    ? { skills: [...blipSeat.skills], agents: [...blipSeat.agents] }
    : emptyPlantFiles();
  const plants = {};
  const fastenedSkills = [];
  const fastenedAgents = [];
  for (const seat of seats) {
    if (!seat.builtin) {
      plants[seat.kind] = { skills: [...seat.skills], agents: [...seat.agents] };
    }
    const copied = copyPlantFiles(
      seat.packageRoot,
      {
        skills: seat.skills,
        agents: seat.agents,
        skillsDir: seat.skillsDir,
        agentsDir: seat.agentsDir,
      },
      targetDir,
    );
    for (const name of copied.skills) {
      if (!fastenedSkills.includes(name)) fastenedSkills.push(name);
    }
    for (const file of copied.agents) {
      if (!fastenedAgents.includes(file)) fastenedAgents.push(file);
    }
  }
  const millPkgSeat = seats.find((seat) => seat.packageName);
  if (log && (fastenedSkills.length > 0 || fastenedAgents.length > 0)) {
    log("foundry-mint", "Fastened factory plant", "info", {
      plant: kinds,
      skills: fastenedSkills.length,
      agents: fastenedAgents.length,
    });
  }
  return {
    skills: mill.skills,
    agents: mill.agents,
    kinds,
    sound,
    blip,
    plants,
    seats,
    millPackage: millPkgSeat ? millPkgSeat.packageName : null,
    millProtocol: millPkgSeat ? millPkgSeat.protocol || millPlantProtocol.PROTOCOL : null,
  };
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

function projectGrokPluginDir(targetDir) {
  return path.join(targetDir, ".grok", "plugins", "0xray");
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
 * Last-mile Grok plugin dests. Project floor always.
 * Isolated HOME may also wear $HOME/.grok/plugins/0xray (not passwd machine).
 * Shared HOME never writes machine ~/.grok/plugins/0xray (multi-seat last-wins).
 */
function resolveGrokPluginDests(targetDir, env, machine) {
  const realMachine = machine || machineHome();
  const dests = [projectGrokPluginDir(targetDir)];
  if (!isIsolatedHome(env, realMachine)) return dests;
  const home = processHome(env);
  if (!home) return dests;
  const isolatedDest = path.join(home, ".grok", "plugins", "0xray");
  if (wouldClobberMachineGrok(isolatedDest, env, realMachine)) return dests;
  if (path.resolve(isolatedDest) === path.resolve(dests[0])) return dests;
  dests.push(isolatedDest);
  return dests;
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

function normalizeNameList(value) {
  if (!Array.isArray(value)) return [];
  const names = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const name = item.trim();
    if (name) names.push(name);
  }
  return names;
}

function shopPlantFromDir(targetDir, rel) {
  const resolved = resolveInside(targetDir, rel);
  if (!resolved || !isDirectory(resolved)) return [];
  const nested = path.join(resolved, "skills");
  return listSkillNamesAt(isDirectory(nested) ? nested : resolved);
}

function declaredShopPlant(targetDir) {
  const raw = loadFoundryExtra(targetDir).shopPlant;
  const names = [];
  if (Array.isArray(raw)) {
    names.push(...normalizeNameList(raw));
  } else if (typeof raw === "string" && raw.trim()) {
    names.push(...shopPlantFromDir(targetDir, raw.trim()));
  } else if (raw && typeof raw === "object") {
    names.push(...normalizeNameList(raw.skills));
    if (typeof raw.dir === "string" && raw.dir.trim()) {
      names.push(...shopPlantFromDir(targetDir, raw.dir.trim()));
    }
  }
  return names;
}

/** Factory shop names plus foundry.json shopPlant. Not costume. */
function loadShopPlant(targetDir) {
  return [...new Set([...FACTORY_SHOP_SKILLS, ...declaredShopPlant(targetDir)])];
}

function previousTreeAllowlist(targetDir) {
  const file = path.join(targetDir, ".xray", "foundry-inventory.json");
  if (!fs.existsSync(file)) return { skills: [], agents: [] };
  try {
    const inventory = JSON.parse(fs.readFileSync(file, "utf8"));
    const shopFromInv = inventory?.shopPlant;
    const shopSkills = Array.isArray(shopFromInv)
      ? normalizeNameList(shopFromInv)
      : normalizeNameList(shopFromInv?.skills);
    const soundFromInv = inventory?.soundPlant;
    const soundSkills = Array.isArray(soundFromInv)
      ? normalizeNameList(soundFromInv)
      : normalizeNameList(soundFromInv?.skills);
    const soundAgents = normalizeNameList(soundFromInv?.agents);
    const blipFromInv = inventory?.blipPlant;
    const blipSkills = Array.isArray(blipFromInv)
      ? normalizeNameList(blipFromInv)
      : normalizeNameList(blipFromInv?.skills);
    const blipAgents = normalizeNameList(blipFromInv?.agents);
    const extraPlantSkills = [];
    const extraPlantAgents = [];
    if (inventory?.plants && typeof inventory.plants === "object") {
      for (const spec of Object.values(inventory.plants)) {
        extraPlantSkills.push(...normalizeNameList(spec?.skills));
        extraPlantAgents.push(...normalizeNameList(spec?.agents));
      }
    }
    return {
      skills: [
        ...(Array.isArray(inventory?.tree?.skills) ? inventory.tree.skills : []),
        ...(Array.isArray(inventory?.millPlant?.skills) ? inventory.millPlant.skills : []),
        ...shopSkills,
        ...soundSkills,
        ...blipSkills,
        ...extraPlantSkills,
      ],
      agents: [
        ...(Array.isArray(inventory?.tree?.agents) ? inventory.tree.agents : []),
        ...(Array.isArray(inventory?.millPlant?.agents) ? inventory.millPlant.agents : []),
        ...soundAgents,
        ...blipAgents,
        ...extraPlantAgents,
      ],
    };
  } catch {
    return { skills: [], agents: [] };
  }
}

function millPackagePlantFromTree(targetDir, tree, plantId, millPackageRoot) {
  const seats = Array.isArray(tree?.seats)
    ? tree.seats
    : millPlantProtocol.resolvePlantSeats(targetDir, millPackageRoot || tree?.millPackageRoot);
  const seat = seats.find((item) => item.kind === plantId);
  return seat ? { skills: [...seat.skills], agents: [...seat.agents] } : emptyPlantFiles();
}

function soundPlantFromTree(targetDir, tree, millPackageRoot) {
  if (Array.isArray(tree?.soundPlantSkills) || Array.isArray(tree?.sound?.skills)) {
    return {
      skills: normalizeNameList(tree.soundPlantSkills || tree.sound?.skills),
      agents: normalizeNameList(tree.soundPlantAgents || tree.sound?.agents),
    };
  }
  const kinds = Array.isArray(tree?.plantKinds)
    ? tree.plantKinds
    : loadFactoryPlantKinds(targetDir, millPackageRoot);
  if (!kinds.includes("sound")) return emptyPlantFiles();
  return millPackagePlantFromTree(targetDir, tree, "sound", millPackageRoot);
}

function blipPlantFromTree(targetDir, tree, millPackageRoot) {
  if (Array.isArray(tree?.blipPlantSkills) || Array.isArray(tree?.blip?.skills)) {
    return {
      skills: normalizeNameList(tree.blipPlantSkills || tree.blip?.skills),
      agents: normalizeNameList(tree.blipPlantAgents || tree.blip?.agents),
    };
  }
  const kinds = Array.isArray(tree?.plantKinds)
    ? tree.plantKinds
    : loadFactoryPlantKinds(targetDir, millPackageRoot);
  if (!kinds.includes("blip")) return emptyPlantFiles();
  return millPackagePlantFromTree(targetDir, tree, "blip", millPackageRoot);
}

/** Extra worn names that are neither mill/sound/blip plant, their plant, shop plant, nor a prior overlay. */
function costumeDumpExtras(targetDir, millPlant, tree) {
  const prior = previousTreeAllowlist(targetDir);
  const shopPlant = loadShopPlant(targetDir);
  const soundPlant = soundPlantFromTree(targetDir, tree);
  const blipPlant = blipPlantFromTree(targetDir, tree);
  const plantMapSkills = [];
  const plantMapAgents = [];
  if (millPlant?.plants && typeof millPlant.plants === "object") {
    for (const spec of Object.values(millPlant.plants)) {
      if (Array.isArray(spec?.skills)) plantMapSkills.push(...spec.skills);
      if (Array.isArray(spec?.agents)) plantMapAgents.push(...spec.agents);
    }
  }
  const allowedSkills = new Set([
    ...(Array.isArray(millPlant?.skills) ? millPlant.skills : []),
    ...(Array.isArray(millPlant?.sound?.skills) ? millPlant.sound.skills : []),
    ...(Array.isArray(millPlant?.blip?.skills) ? millPlant.blip.skills : []),
    ...plantMapSkills,
    ...soundPlant.skills,
    ...blipPlant.skills,
    ...(Array.isArray(tree?.skills) ? tree.skills : []),
    ...prior.skills,
    ...shopPlant,
  ]);
  const allowedAgents = new Set([
    ...(Array.isArray(millPlant?.agents) ? millPlant.agents : []),
    ...(Array.isArray(millPlant?.sound?.agents) ? millPlant.sound.agents : []),
    ...(Array.isArray(millPlant?.blip?.agents) ? millPlant.blip.agents : []),
    ...plantMapAgents,
    ...soundPlant.agents,
    ...blipPlant.agents,
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
  const soundPlanted =
    (Array.isArray(tree?.soundPlantSkills) && tree.soundPlantSkills.length > 0) ||
    (Array.isArray(tree?.soundPlantAgents) && tree.soundPlantAgents.length > 0);
  const blipPlanted =
    (Array.isArray(tree?.blipPlantSkills) && tree.blipPlantSkills.length > 0) ||
    (Array.isArray(tree?.blipPlantAgents) && tree.blipPlantAgents.length > 0);
  const plantKinds = Array.isArray(tree?.plantKinds) && tree.plantKinds.length > 0
    ? tree.plantKinds
    : loadFactoryPlantKinds(targetDir);
  const costume = wantsCostume(targetDir);
  const suit = overlayed
    ? "overlay"
    : millPlanted || soundPlanted || blipPlanted
      ? "fastened"
      : costume
        ? "costume"
        : "fastened";
  const inventory = {
    mill: { name: mill.name || "@0xray/foundry", version: mill.version },
    consumer: { name: consumer.name, version: consumer.version },
    suit,
    plant: plantKinds,
    params: tree?.params || loadFoundryParams(targetDir),
    tree: { skills, agents },
    millPlant: {
      skills: Array.isArray(tree?.millPlantSkills) ? tree.millPlantSkills : [],
      agents: Array.isArray(tree?.millPlantAgents) ? tree.millPlantAgents : [],
    },
    soundPlant: {
      skills: Array.isArray(tree?.soundPlantSkills) ? tree.soundPlantSkills : [],
      agents: Array.isArray(tree?.soundPlantAgents) ? tree.soundPlantAgents : [],
    },
    blipPlant: {
      skills: Array.isArray(tree?.blipPlantSkills) ? tree.blipPlantSkills : [],
      agents: Array.isArray(tree?.blipPlantAgents) ? tree.blipPlantAgents : [],
    },
    shopPlant: {
      skills: Array.isArray(tree?.shopPlantSkills) ? tree.shopPlantSkills : loadShopPlant(targetDir),
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
  if (tree?.millPackage) {
    inventory.millPackage = tree.millPackage;
    inventory.millProtocol = tree.millProtocol || millPlantProtocol.PROTOCOL;
  }
  if (tree?.plants && typeof tree.plants === "object" && Object.keys(tree.plants).length > 0) {
    inventory.plants = tree.plants;
  }
  const withDna = attachInventoryDna(inventory);
  const xrayDir = path.join(targetDir, ".xray");
  if (!fs.existsSync(xrayDir)) fs.mkdirSync(xrayDir, { recursive: true });
  fs.writeFileSync(
    path.join(xrayDir, "foundry-inventory.json"),
    `${JSON.stringify(withDna, null, 2)}\n`,
  );
  if (log) {
    log("foundry-mint", "Minted foundry-inventory from consumer mill SSOT", "info", {
      consumer: consumer.name,
      version: consumer.version,
      suit,
      dna: withDna.dna,
    });
  }
  return withDna;
}

function mintConsumerSuit(millPackageRoot, targetDir, log) {
  if (isDogfood(millPackageRoot, targetDir)) {
    return { suit: "dogfood", skipped: true };
  }
  const params = loadFoundryParams(targetDir);
  const millPlant = fastenMillPlant(millPackageRoot, targetDir, log);
  const tree = overlayConsumerTree(targetDir, log, params);
  tree.plantKinds = millPlant.kinds || loadFactoryPlantKinds(targetDir);
  tree.millPlantSkills = millPlant.skills;
  tree.millPlantAgents = millPlant.agents;
  tree.soundPlantSkills = millPlant.sound?.skills || [];
  tree.soundPlantAgents = millPlant.sound?.agents || [];
  tree.sound = millPlant.sound || emptyPlantFiles();
  tree.blipPlantSkills = millPlant.blip?.skills || [];
  tree.blipPlantAgents = millPlant.blip?.agents || [];
  tree.blip = millPlant.blip || emptyPlantFiles();
  tree.plants = millPlant.plants || {};
  tree.seats = millPlant.seats || [];
  tree.millPackage = millPlant.millPackage || null;
  tree.millProtocol = millPlant.millProtocol || null;
  tree.millPackageRoot = millPackageRoot;
  tree.shopPlantSkills = loadShopPlant(targetDir);
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
  FACTORY_SHOP_SKILLS,
  FACTORY_PLANT_CATALOG,
  FOUNDRY_PLANT_PROTOCOL: millPlantProtocol.PROTOCOL,
  PROTOCOL: millPlantProtocol.PROTOCOL,
  PACKAGE_ALIASES: millPlantProtocol.PACKAGE_ALIASES,
  parsePlantToken: millPlantProtocol.parsePlantToken,
  parsePlantRef: millPlantProtocol.parsePlantRef,
  resolvePackageRoot: millPlantProtocol.resolvePackageRoot,
  readProtocol: millPlantProtocol.readProtocol,
  prefixSelect: millPlantProtocol.prefixSelect,
  selectPlantFiles: millPlantProtocol.selectPlantFiles,
  declaredPlantFiles: millPlantProtocol.declaredPlantFiles,
  resolvePlantSeats: millPlantProtocol.resolvePlantSeats,
  loadPlantRequests: millPlantProtocol.loadPlantRequests,
  declaredReceiptSeats: millPlantProtocol.declaredReceiptSeats,
  inventoryFilesForKind: millPlantProtocol.inventoryFilesForKind,
  isFactoryPlantKind,
  deepMerge,
  loadFoundryParams,
  loadFoundryExtra,
  loadShopPlant,
  declaredShopPlant,
  wantsCostume,
  millPlantDir,
  loadFactoryPlantKinds,
  factoryPlantAllowlist,
  inventoryPlantKinds,
  catalogPlant,
  unionPlantFiles,
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
  attachInventoryDna,
  inventoryDna,
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
  projectGrokPluginDir,
  resolveGrokPluginDests,
  wouldClobberMachineGrok,
};
