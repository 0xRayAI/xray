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
  const plantDir = mint.millPlantDir(millRoot);
  const millPlant = {
    skills: plantDir ? mint.listSkillNamesAt(path.join(plantDir, "skills")) : [],
    agents: plantDir ? mint.listAgentFilesAt(path.join(plantDir, "agents")) : [],
  };
  const params = mint.loadFoundryParams(root);
  const tree = {
    skills: mint.listConsumerSkillNames(root, params.skills),
    agents: mint.listConsumerAgentFiles(root, params.agents),
  };
  try {
    mint.assertNoCostumeDump(root, millPlant, tree);
    return {
      id: "plant-vs-worn",
      ok: true,
      millPlant: millPlant.skills,
      tree: tree.skills,
      worn: mint.wornSkillNames(root),
    };
  } catch (err) {
    return {
      id: "plant-vs-worn",
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
      extraSkills: err.extraSkills || [],
      extraAgents: err.extraAgents || [],
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
  const hasMill = millPlantSkills.includes("mill");
  const hasInspect = millPlantSkills.includes("inspect");
  const ok = hasMill && hasInspect;
  return {
    id: "receipt",
    ok,
    suit: inventory.suit,
    mill: inventory.mill,
    millPlant: millPlantSkills,
    detail: ok ? null : "millPlant.skills must include mill and inspect",
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

function packagesToProbe(root) {
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
  const seen = new Set();
  return pkgs.filter((p) => {
    const key = `${p.name}@${p.version}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function checkIsolatedHome(env = process.env, machine = mint.machineHome()) {
  const isolated = isIsolatedHome(env, machine);
  const machinePlugin = machineGrokPluginDir(machine);
  const home = env.HOME || env.USERPROFILE || "";
  const dest = home ? path.join(home, ".grok", "plugins", "0xray") : "";
  const clobber = wouldClobberMachineGrok(dest, env, machine);
  if (clobber) {
    return {
      id: "isolated-home",
      ok: false,
      isolated,
      detail: `isolated HOME must not write ${machinePlugin}`,
    };
  }
  return {
    id: "isolated-home",
    ok: true,
    isolated,
    machinePlugin,
    dest: dest || null,
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

  checks.push(checkIsolatedHome(env, machineHome));

  const failed = checks.filter((c) => c.ok === false);
  return {
    ok: failed.length === 0,
    failed: failed.map((c) => c.id),
    checks,
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
