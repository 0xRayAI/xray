#!/usr/bin/env node
/**
 * Mill inspect organ. Runs the six plant checks plus observational harness.
 * Not an 8th MCP. Not PPE. Does not fasten hooks or Repertoire.
 *
 *   npx @0xray/foundry inspect [--skip-live] [--go] [--go-out PATH]
 *     [--require-harness=bare|suited|partial] [--goal TEXT]
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { millPackageDir, resolveMillRoot } from "./mill-root.mjs";

const require = createRequire(import.meta.url);
const mint = require("./mint-suit.cjs");
const millProtocol = require("./mill-plant.cjs");

export function npmTarballUrl(name, version) {
  if (typeof name !== "string" || !name || typeof version !== "string" || !version) return null;
  if (name.startsWith("@")) {
    const slash = name.indexOf("/");
    if (slash < 1) return null;
    const pkg = name.slice(slash + 1);
    return `https://registry.npmjs.org/${name}/-/${pkg}-${version}.tgz`;
  }
  return `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;
}

export function isIsolatedHome(env = process.env, machine = mint.machineHome()) {
  return mint.isIsolatedHome(env, machine);
}

export function machineGrokPluginDir(machine = mint.machineHome()) {
  return mint.machineGrokPluginDir(machine);
}

export function wouldClobberMachineGrok(
  dest,
  env = process.env,
  machine = mint.machineHome(),
) {
  return mint.wouldClobberMachineGrok(dest, env, machine);
}

export function projectGrokPluginDir(targetDir) {
  return mint.projectGrokPluginDir(targetDir);
}

export function resolveGrokPluginDests(
  targetDir,
  env = process.env,
  machine = mint.machineHome(),
) {
  return mint.resolveGrokPluginDests(targetDir, env, machine);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const HARNESS_PROFILES = new Set(["bare", "suited", "partial"]);

export function parseInspectArgs(argv = process.argv.slice(2)) {
  const out = {
    skipLive: false,
    go: false,
    goOut: null,
    requireHarness: null,
    goal: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--skip-live") out.skipLive = true;
    else if (arg === "--go") out.go = true;
    else if (arg === "--go-out") out.goOut = argv[++i] || null;
    else if (arg.startsWith("--go-out=")) out.goOut = arg.slice("--go-out=".length);
    else if (arg === "--require-harness") out.requireHarness = argv[++i] || null;
    else if (arg.startsWith("--require-harness=")) {
      out.requireHarness = arg.slice("--require-harness=".length);
    } else if (arg === "--goal") out.goal = argv[++i] || null;
    else if (arg.startsWith("--goal=")) out.goal = arg.slice("--goal=".length);
  }
  if (out.goOut) out.go = true;
  return out;
}

function hooksFileBound(file) {
  if (!fs.existsSync(file)) return false;
  const json = readJson(file);
  const hooks = json?.hooks;
  if (!hooks || typeof hooks !== "object") return false;
  return Object.values(hooks).some(
    (list) =>
      Array.isArray(list) &&
      list.some((entry) => typeof entry?.command === "string" && entry.command.trim()),
  );
}

export function classifyHarnessProfile({ hooksBound, repertoireFastened, stationPresent }) {
  if (!hooksBound && !repertoireFastened && !stationPresent) return "bare";
  if (hooksBound && repertoireFastened) return "suited";
  return "partial";
}

export function probeHarness(root) {
  const cursorHooks = path.join(root, ".cursor", "hooks.json");
  const grokHooks = path.join(root, ".grok", "plugins", "0xray", "hooks", "hooks.json");
  const grokPluginHooks = path.join(root, ".grok-plugin", "hooks", "hooks.json");
  const hooks = {
    cursor: hooksFileBound(cursorHooks),
    grok: hooksFileBound(grokHooks) || hooksFileBound(grokPluginHooks),
  };
  hooks.bound = Boolean(hooks.cursor || hooks.grok);

  const repertoire = {
    nodeModules: fs.existsSync(path.join(root, "node_modules", "@0xray", "repertoire")),
    state: fs.existsSync(path.join(root, ".xray", "state", "repertoire")),
    vendorSource: fs.existsSync(path.join(root, "vendor", "@0xray", "repertoire")),
  };
  repertoire.fastened = Boolean(repertoire.nodeModules || repertoire.state);

  const features =
    readJson(path.join(root, ".xray", "features.json")) ||
    readJson(path.join(root, "xray", "features.json"));
  repertoire.memoryRoutingDeclared = features?.memory_routing?.provider === "repertoire";

  const stationPresent = fs.existsSync(path.join(root, ".xray", "state", "STATION.md"));
  const profile = classifyHarnessProfile({
    hooksBound: hooks.bound,
    repertoireFastened: repertoire.fastened,
    stationPresent,
  });

  return {
    id: "harness",
    hooks,
    repertoire,
    station: { present: stationPresent },
    profile,
  };
}

export function checkHarness(root, requireHarness = null) {
  const probe = probeHarness(root);
  if (requireHarness && !HARNESS_PROFILES.has(requireHarness)) {
    return {
      ...probe,
      ok: false,
      require: requireHarness,
      detail: `unknown --require-harness=${requireHarness} (bare|suited|partial)`,
    };
  }
  if (requireHarness && probe.profile !== requireHarness) {
    return {
      ...probe,
      ok: false,
      require: requireHarness,
      detail: `harness profile ${probe.profile} != required ${requireHarness}`,
    };
  }
  return {
    ...probe,
    ok: true,
    require: requireHarness,
    skipped: !requireHarness,
    detail: requireHarness ? null : "observational — pass --require-harness to gate",
  };
}

function gitRemote(root) {
  const remote = spawnSync("git", ["config", "--get", "remote.origin.url"], {
    cwd: root,
    encoding: "utf8",
  });
  if (remote.error || remote.status !== 0) return null;
  return (remote.stdout || "").trim() || null;
}

export function buildForgeGo(root, harness, opts = {}) {
  return {
    kind: "forge-go",
    mill: "inspect",
    profile: harness.profile,
    hooksBound: Boolean(harness.hooks?.bound),
    repertoireFastened: Boolean(harness.repertoire?.fastened),
    stationPresent: Boolean(harness.station?.present),
    require: harness.require || null,
    ok: harness.ok !== false,
    goal: opts.goal || process.env.FOUNDRY_GO_GOAL || null,
    repo: gitRemote(root),
    generatedAt: new Date().toISOString(),
  };
}

function checkDiff(root) {
  const status = spawnSync("git", ["status", "-sb"], { cwd: root, encoding: "utf8" });
  if (status.error || status.status === 128) {
    return {
      id: "diff",
      ok: true,
      skipped: true,
      detail: status.stderr?.trim() || "not a git repo",
    };
  }
  const diff = spawnSync("git", ["diff", "--stat"], { cwd: root, encoding: "utf8" });
  return {
    id: "diff",
    ok: true,
    status: (status.stdout || "").trim(),
    diffStat: (diff.stdout || "").trim(),
  };
}

function emptyPlantFiles() {
  return { skills: [], agents: [] };
}

function checkPlantVsWorn(root, millRoot) {
  let seats;
  try {
    seats = millProtocol.resolvePlantSeats(root, millRoot);
  } catch (err) {
    return {
      id: "plant-vs-worn",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  const kinds = millProtocol.plantKindsFromSeats(seats);
  const millSeat = seats.find((seat) => seat.kind === "mill");
  const soundSeat = seats.find((seat) => seat.kind === "sound");
  const blipSeat = seats.find((seat) => seat.kind === "blip");
  const millPlant = {
    skills: millSeat ? millSeat.skills : [],
    agents: millSeat ? millSeat.agents : [],
    sound: soundSeat
      ? { skills: soundSeat.skills, agents: soundSeat.agents }
      : emptyPlantFiles(),
    blip: blipSeat ? { skills: blipSeat.skills, agents: blipSeat.agents } : emptyPlantFiles(),
    plants: Object.fromEntries(
      seats
        .filter((seat) => !seat.builtin)
        .map((seat) => [seat.kind, { skills: seat.skills, agents: seat.agents }]),
    ),
  };
  const params = mint.loadFoundryParams(root);
  const tree = {
    skills: mint.listConsumerSkillNames(root, params.skills),
    agents: mint.listConsumerAgentFiles(root, params.agents),
    plantKinds: kinds,
    seats,
    millPackageRoot: millRoot,
    soundPlantSkills: millPlant.sound.skills,
    soundPlantAgents: millPlant.sound.agents,
    sound: millPlant.sound,
    blipPlantSkills: millPlant.blip.skills,
    blipPlantAgents: millPlant.blip.agents,
    blip: millPlant.blip,
  };
  const shopPlant = mint.loadShopPlant(root);
  const allow = mint.factoryPlantAllowlist(millRoot, root);
  try {
    mint.assertNoCostumeDump(root, millPlant, tree);
    return {
      id: "plant-vs-worn",
      ok: true,
      plant: kinds,
      millPlant: millPlant.skills,
      soundPlant: millPlant.sound.skills,
      blipPlant: millPlant.blip.skills,
      shopPlant,
      tree: tree.skills,
      worn: mint.wornSkillNames(root),
      allow: allow.skills,
    };
  } catch (err) {
    return {
      id: "plant-vs-worn",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      extraSkills: err.extraSkills || [],
      extraAgents: err.extraAgents || [],
      plant: kinds,
      soundPlant: millPlant.sound.skills,
      blipPlant: millPlant.blip.skills,
      shopPlant,
    };
  }
}

function checkReceipt(root, millRoot) {
  const file = path.join(root, ".xray", "foundry-inventory.json");
  if (mint.isDogfood(millPackageDir(), root)) {
    return { id: "receipt", ok: true, skipped: true, detail: "dogfood / exo — no consumer inventory" };
  }
  const inventory = readJson(file);
  if (!inventory) {
    return { id: "receipt", ok: false, detail: "missing .xray/foundry-inventory.json" };
  }
  const millPlantSkills = inventory.millPlant?.skills || [];
  const soundPlantSkills = inventory.soundPlant?.skills || [];
  const blipPlantSkills = inventory.blipPlant?.skills || [];
  const kinds = mint.inventoryPlantKinds(inventory);
  const needMill = kinds.includes("mill");
  const millOk = !needMill || (millPlantSkills.includes("mill") && millPlantSkills.includes("inspect"));
  let detail = null;
  if (needMill && !millOk) detail = "millPlant.skills must include mill and inspect";
  const packageKinds = kinds.filter((kind) => kind !== "mill");
  if (!detail && packageKinds.length > 0) {
    try {
      const declared = millProtocol.declaredReceiptSeats(inventory, root, millRoot);
      for (const seat of declared) {
        if (seat.builtin) continue;
        const have = millProtocol.inventoryFilesForKind(inventory, seat.kind);
        const haveSkills = Array.isArray(have?.skills) ? have.skills : [];
        if (!seat.skills || seat.skills.length === 0) {
          detail = `${seat.kind} plant declared no skills`;
          break;
        }
        const missing = seat.skills.filter((name) => !haveSkills.includes(name));
        if (missing.length > 0) {
          detail = `${seat.kind}Plant.skills must include protocol skills (${missing.join(", ")})`;
          break;
        }
      }
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
  }
  const ok = !detail && (needMill || packageKinds.length > 0);
  if (!ok && !detail) detail = "inventory plant is empty";
  return {
    id: "receipt",
    ok,
    suit: inventory.suit,
    mill: inventory.mill,
    millPackage: inventory.millPackage || null,
    millProtocol: inventory.millProtocol || null,
    plant: kinds,
    millPlant: millPlantSkills,
    soundPlant: soundPlantSkills,
    blipPlant: blipPlantSkills,
    dna: typeof inventory.dna === "string" ? inventory.dna : null,
    pack: "0xray-suit",
    detail,
  };
}

function checkSoundBed(root) {
  const inventory = readJson(path.join(root, ".xray", "foundry-inventory.json"));
  const kinds = inventory ? mint.inventoryPlantKinds(inventory) : mint.loadFactoryPlantKinds(root);
  if (!kinds.includes("sound")) return null;
  const bed = require("./sound-bed.cjs");
  const receipt = bed.readReceipt(root);
  if (!receipt) {
    return {
      id: "sound-bed",
      ok: true,
      skipped: true,
      status: "NONE",
      plant: kinds,
      detail: "no bed receipt yet — npx @0xray/foundry sound render",
    };
  }
  const status = receipt.status === "PASS" ? "PASS" : "FAIL";
  const unreadable = receipt.reason === "receipt-unreadable";
  return {
    id: "sound-bed",
    ok: status === "PASS" && !unreadable,
    status,
    failClosed: true,
    plant: kinds,
    metrics: receipt.metrics || null,
    gates: receipt.gates || null,
    wav: receipt.wav || null,
    seed: receipt.seed || null,
    detail: status === "PASS" ? null : receipt.reason || "bed receipt FAIL",
  };
}

function checkBlip(root) {
  const inventory = readJson(path.join(root, ".xray", "foundry-inventory.json"));
  const kinds = inventory ? mint.inventoryPlantKinds(inventory) : mint.loadFactoryPlantKinds(root);
  if (!kinds.includes("blip")) return null;
  const blip = require("./blip-render.cjs");
  const receipt = blip.readReceipt(root);
  const motions = blip.listMotionIds();
  if (!receipt) {
    return {
      id: "blip",
      ok: true,
      skipped: true,
      status: "NONE",
      plant: kinds,
      motions,
      detail: "no blip receipt yet — npx @0xray/foundry blip render --brief \"...\" --mode still",
    };
  }
  const evaluated = blip.evaluateReceipt(root, receipt);
  const status = evaluated.status === "PASS" ? "PASS" : "FAIL";
  const unreadable = receipt.reason === "receipt-unreadable";
  return {
    id: "blip",
    ok: status === "PASS" && !unreadable,
    status,
    failClosed: true,
    plant: kinds,
    motions,
    mode: evaluated.mode || receipt.motionId || receipt.mode || null,
    pictureMode: evaluated.pictureMode || receipt.pictureMode || null,
    palette: receipt.palette || null,
    plate: receipt.plate || null,
    durationSec: evaluated.durationSec ?? receipt.durationSec ?? null,
    mp4: evaluated.mp4 || receipt.mp4 || null,
    hasVideo: evaluated.hasVideo ?? receipt.hasVideo ?? null,
    hasAudio: evaluated.hasAudio ?? receipt.hasAudio ?? null,
    detail: status === "PASS" ? null : evaluated.reason || receipt.reason || "blip receipt FAIL",
  };
}

function checkCi(root) {
  const millPath = path.join(root, ".xray", "foundry-ci-report.json");
  const shimPath = path.join(root, ".opencode", "logs", "ci-cd-monitor-report.json");
  const report = readJson(millPath) || readJson(shimPath);
  if (!report) {
    return {
      id: "ci",
      ok: true,
      skipped: true,
      detail: "no mill ci report — run npx @0xray/foundry ci --report",
    };
  }
  const status = String(report.ci_status || "");
  if (status === "failure" || status === "unhealthy") {
    return { id: "ci", ok: false, status, reason: report.reason || null };
  }
  return {
    id: "ci",
    ok: true,
    skipped: status === "unknown",
    status,
    reason: report.reason || null,
  };
}

export async function checkLivePut(packages, fetchFn = fetch) {
  const results = [];
  for (const pkg of packages) {
    const url = npmTarballUrl(pkg.name, pkg.version);
    if (!url) {
      results.push({ name: pkg.name, version: pkg.version, ok: false, detail: "missing name/version" });
      continue;
    }
    let status = 0;
    try {
      const head = await fetchFn(url, { method: "HEAD" });
      status = head.status;
      if (status === 405 || status === 501) {
        const get = await fetchFn(url, { method: "GET" });
        status = get.status;
      }
    } catch (err) {
      results.push({
        name: pkg.name,
        version: pkg.version,
        url,
        ok: false,
        detail: err instanceof Error ? err.message : String(err),
      });
      continue;
    }
    results.push({ name: pkg.name, version: pkg.version, url, status, ok: status === 200 });
  }
  return results;
}

export function packagesToProbe(root) {
  const pkgs = [];
  const inventory = readJson(path.join(root, ".xray", "foundry-inventory.json"));
  if (inventory?.mill?.name && inventory?.mill?.version) {
    pkgs.push({ name: inventory.mill.name, version: inventory.mill.version });
  }
  const worn = readJson(path.join(root, "node_modules", "0xray", "package.json"));
  if (worn?.name && worn?.version) {
    pkgs.push({ name: worn.name, version: worn.version });
  }
  const self = readJson(path.join(root, "package.json"));
  if (self?.name === "0xray" && self?.version) {
    pkgs.push({ name: "0xray", version: self.version });
  }
  if (
    self &&
    self.private !== true &&
    inventory?.consumer?.name &&
    inventory?.consumer?.version
  ) {
    pkgs.push({
      name: inventory.consumer.name,
      version: inventory.consumer.version,
    });
  }
  const seen = new Set();
  return pkgs.filter((p) => {
    const key = `${p.name}@${p.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function checkIsolatedHome(root, env = process.env, machine = mint.machineHome()) {
  const isolated = isIsolatedHome(env, machine);
  const machinePlugin = machineGrokPluginDir(machine);
  const dests = mint.resolveGrokPluginDests(root, env, machine);
  const dest = dests[0] || null;
  const clobber = dests.some((d) => wouldClobberMachineGrok(d, env, machine));
  if (clobber) {
    return {
      id: "isolated-home",
      ok: false,
      isolated,
      dest,
      dests,
      machinePlugin,
      detail: `isolated HOME must not write ${machinePlugin}`,
    };
  }
  return {
    id: "isolated-home",
    ok: true,
    isolated,
    machinePlugin,
    dest,
    dests,
  };
}

export async function inspectSuit(root, opts = {}) {
  const millRoot = opts.millRoot || millPackageDir();
  const fetchFn = opts.fetch || fetch;
  const skipLive = Boolean(opts.skipLive);
  const env = opts.env || process.env;
  const machineHome = opts.machineHome || mint.machineHome();
  const requireHarness = opts.requireHarness || null;
  const go = Boolean(opts.go);
  const goal = opts.goal || null;

  const checks = [];
  checks.push(checkDiff(root));
  checks.push(checkPlantVsWorn(root, millRoot));
  checks.push(checkReceipt(root, millRoot));
  const soundBed = checkSoundBed(root);
  if (soundBed) checks.push(soundBed);
  const blip = checkBlip(root);
  if (blip) checks.push(blip);
  checks.push(checkCi(root));

  if (skipLive) {
    checks.push({ id: "live-put", ok: true, skipped: true, detail: "--skip-live" });
  } else {
    const pkgs = packagesToProbe(root);
    if (pkgs.length === 0) {
      checks.push({
        id: "live-put",
        ok: true,
        skipped: true,
        detail: "no mill/0xray package identity to GET",
      });
    } else {
      const puts = await checkLivePut(pkgs, fetchFn);
      checks.push({
        id: "live-put",
        ok: puts.every((p) => p.ok),
        packages: puts,
      });
    }
  }

  checks.push(checkIsolatedHome(root, env, machineHome));
  checks.push(checkHarness(root, requireHarness));

  const failed = checks.filter((c) => c.ok === false);
  const receipt = checks.find((c) => c.id === "receipt") || {};
  const harness = checks.find((c) => c.id === "harness") || {};
  const report = {
    ok: failed.length === 0,
    failed: failed.map((c) => c.id),
    checks,
    dna: receipt.dna || null,
    pack: "0xray-suit",
  };
  if (go) {
    report.go = buildForgeGo(root, harness, { goal });
  }
  return report;
}

async function main() {
  const args = parseInspectArgs(process.argv.slice(2));
  const root = resolveMillRoot();
  const report = await inspectSuit(root, {
    skipLive: args.skipLive,
    requireHarness: args.requireHarness,
    go: args.go,
    goal: args.goal,
  });
  if (args.goOut) {
    const dest = path.isAbsolute(args.goOut) ? args.goOut : path.join(root, args.goOut);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, `${JSON.stringify(report.go || report, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
