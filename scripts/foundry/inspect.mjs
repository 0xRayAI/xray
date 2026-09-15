#!/usr/bin/env node
/**
 * Mill inspect organ. Runs the six checks. Not an 8th MCP. Not PPE.
 *
 *   npx @0xray/foundry inspect [--skip-live]
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { millPackageDir, resolveMillRoot } from "./mill-root.mjs";

const require = createRequire(import.meta.url);
const mint = require("./mint-suit.cjs");

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

function checkPlantVsWorn(root, millRoot) {
  const kinds = mint.loadFactoryPlantKinds(root);
  const allow = mint.factoryPlantAllowlist(millRoot, root);
  const millPlant = {
    skills: kinds.includes("mill") ? mint.catalogPlant("mill").skills : [],
    agents: kinds.includes("mill") ? mint.catalogPlant("mill").agents : [],
    sound: kinds.includes("sound") ? mint.catalogPlant("sound") : { skills: [], agents: [] },
    blip: kinds.includes("blip") ? mint.catalogPlant("blip") : { skills: [], agents: [] },
  };
  const params = mint.loadFoundryParams(root);
  const tree = {
    skills: mint.listConsumerSkillNames(root, params.skills),
    agents: mint.listConsumerAgentFiles(root, params.agents),
    plantKinds: kinds,
    soundPlantSkills: millPlant.sound.skills,
    soundPlantAgents: millPlant.sound.agents,
    sound: millPlant.sound,
    blipPlantSkills: millPlant.blip.skills,
    blipPlantAgents: millPlant.blip.agents,
    blip: millPlant.blip,
  };
  const shopPlant = mint.loadShopPlant(root);
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

function checkReceipt(root) {
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
  const needSound = kinds.includes("sound");
  const needBlip = kinds.includes("blip");
  const millOk = !needMill || (millPlantSkills.includes("mill") && millPlantSkills.includes("inspect"));
  const soundOk =
    !needSound || (soundPlantSkills.includes("sound") && soundPlantSkills.includes("sound-inspect"));
  const blipOk =
    !needBlip || (blipPlantSkills.includes("blip") && blipPlantSkills.includes("blip-inspect"));
  const ok = millOk && soundOk && blipOk && (needMill || needSound || needBlip);
  let detail = null;
  if (!ok && needMill && !millOk) detail = "millPlant.skills must include mill and inspect";
  else if (!ok && needSound && !soundOk) detail = "soundPlant.skills must include sound and sound-inspect";
  else if (!ok && needBlip && !blipOk) detail = "blipPlant.skills must include blip and blip-inspect";
  else if (!ok) detail = "inventory plant is empty";
  return {
    id: "receipt",
    ok,
    suit: inventory.suit,
    mill: inventory.mill,
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

  const checks = [];
  checks.push(checkDiff(root));
  checks.push(checkPlantVsWorn(root, millRoot));
  checks.push(checkReceipt(root));
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

  const failed = checks.filter((c) => c.ok === false);
  const receipt = checks.find((c) => c.id === "receipt") || {};
  return {
    ok: failed.length === 0,
    failed: failed.map((c) => c.id),
    checks,
    dna: receipt.dna || null,
    pack: "0xray-suit",
  };
}

async function main() {
  const skipLive = process.argv.includes("--skip-live");
  const root = resolveMillRoot();
  const report = await inspectSuit(root, { skipLive });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.ok ? 0 : 1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
