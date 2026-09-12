#!/usr/bin/env node
/**
 * pack-tmp-suit-proof.mjs — Clean-room pack → tmp install → mill fasten → hangar plant → inspect.
 *
 * Asserts (Task B):
 *   1. `npm install` of the packed 0xray tgz works
 *   2. `foundry mint --skip-live` fastens mill+inspect (not 45/42 costume)
 *   3. groover-hangar factory shops + inspect do not costume-dump
 *
 * Usage:
 *   node scripts/node/pack-tmp-suit-proof.mjs
 *   npm run pack:tmp-proof
 *
 * Playwright / UI: n/a (mill CLI).
 */

import { execSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

export const FACTORY_SHOP_SKILLS = ["shop-extract", "shop-witness", "shop-pin"];
export const MILL_PLANT_SKILLS = ["mill", "inspect"];

function run(cmd, cwd, { inherit = false } = {}) {
  const result = execSync(cmd, {
    cwd,
    encoding: inherit ? undefined : "utf-8",
    stdio: inherit ? "inherit" : "pipe",
  });
  return inherit ? "" : String(result).trim();
}

export function foundryCliPath(millRoot) {
  return path.join(millRoot, "cli.js");
}

export function runFoundryCli(millRoot, consumerRoot, args) {
  const isolatedHome = path.join(consumerRoot, ".proof-home");
  fs.mkdirSync(isolatedHome, { recursive: true });
  return spawnSync(process.execPath, [foundryCliPath(millRoot), ...args], {
    cwd: consumerRoot,
    encoding: "utf8",
    env: {
      ...process.env,
      FOUNDRY_ROOT: consumerRoot,
      HOME: isolatedHome,
    },
  });
}

export function lastJsonObject(text) {
  const src = String(text || "");
  for (let end = src.length - 1; end >= 0; end -= 1) {
    if (src[end] !== "}") continue;
    let depth = 0;
    for (let start = end; start >= 0; start -= 1) {
      const ch = src[start];
      if (ch === "}") depth += 1;
      else if (ch === "{") {
        depth -= 1;
        if (depth === 0) {
          try {
            return JSON.parse(src.slice(start, end + 1));
          } catch {
            break;
          }
        }
      }
    }
  }
  return null;
}

export function plantHangarFactoryShops(consumerRoot) {
  for (const name of FACTORY_SHOP_SKILLS) {
    const dir = path.join(consumerRoot, ".opencode", "skills", name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), `groover-hangar plant ${name}\n`);
  }
}

export function wornSkillNames(consumerRoot) {
  const skillsDir = path.join(consumerRoot, ".opencode", "skills");
  if (!fs.existsSync(skillsDir)) return [];
  return fs.readdirSync(skillsDir).filter((name) =>
    fs.existsSync(path.join(skillsDir, name, "SKILL.md")),
  );
}

export function assertFastenedMillPlant(consumerRoot) {
  const inventoryPath = path.join(consumerRoot, ".xray", "foundry-inventory.json");
  if (!fs.existsSync(inventoryPath)) {
    throw new Error("foundry-inventory.json missing — mill did not fasten");
  }
  const inventory = JSON.parse(fs.readFileSync(inventoryPath, "utf8"));
  if (inventory.costume === true) {
    throw new Error("inventory.costume is true — costume dump is not default mill plant");
  }
  const millSkills = inventory.millPlant?.skills || [];
  for (const name of MILL_PLANT_SKILLS) {
    if (!millSkills.includes(name)) {
      throw new Error(`mill plant missing ${name} (got ${millSkills.join(",")})`);
    }
    if (!fs.existsSync(path.join(consumerRoot, ".opencode", "skills", name, "SKILL.md"))) {
      throw new Error(`worn mill plant missing ${name}`);
    }
  }
  const foundry = path.join(consumerRoot, "foundry.json");
  if (fs.existsSync(foundry)) {
    const extra = JSON.parse(fs.readFileSync(foundry, "utf8"));
    if (extra.costume === true) {
      throw new Error("foundry.json costume:true is not the mill+inspect path");
    }
  }
  const worn = wornSkillNames(consumerRoot);
  const extras = worn.filter(
    (name) => !MILL_PLANT_SKILLS.includes(name) && !FACTORY_SHOP_SKILLS.includes(name),
  );
  if (extras.length > 0) {
    throw new Error(`costume dump extras before hangar plant: ${extras.join(",")}`);
  }
  return inventory;
}

export function proveSuitAfterInstall(consumerRoot, millRoot) {
  if (!fs.existsSync(foundryCliPath(millRoot))) {
    throw new Error(`foundry CLI missing at ${foundryCliPath(millRoot)}`);
  }

  console.log("  ⚒️  foundry mint --skip-live (fasten mill+inspect)...");
  const mint = runFoundryCli(millRoot, consumerRoot, ["mint", "--skip-live"]);
  if (mint.status !== 0) {
    throw new Error(`foundry mint --skip-live failed:\n${mint.stdout}\n${mint.stderr}`);
  }
  const inventory = assertFastenedMillPlant(consumerRoot);
  if (inventory.suit !== "fastened" && inventory.suit !== "overlay") {
    throw new Error(`expected fastened/overlay suit, got ${inventory.suit}`);
  }
  console.log(`  ✅ mint fastened mill+inspect (suit=${inventory.suit}, costume=${inventory.costume === true})`);

  console.log("  🏭 groover-hangar plant factory shops (not costume)...");
  plantHangarFactoryShops(consumerRoot);
  for (const name of FACTORY_SHOP_SKILLS) {
    if (!fs.existsSync(path.join(consumerRoot, ".opencode", "skills", name, "SKILL.md"))) {
      throw new Error(`hangar plant missing ${name}`);
    }
  }

  console.log("  🔍 foundry inspect --skip-live (shop plant must not costume-dump)...");
  const inspect = runFoundryCli(millRoot, consumerRoot, ["inspect", "--skip-live"]);
  const report = lastJsonObject(inspect.stdout);
  if (inspect.status !== 0 || !report?.ok) {
    throw new Error(
      `inspect failed after hangar plant (costume dump?):\n${inspect.stdout}\n${inspect.stderr}`,
    );
  }
  const plantVsWorn = (report.checks || []).find((c) => c.id === "plant-vs-worn");
  if (!plantVsWorn?.ok) {
    throw new Error(`plant-vs-worn failed: ${JSON.stringify(plantVsWorn)}`);
  }
  const shopPlant = plantVsWorn.shopPlant || [];
  for (const name of FACTORY_SHOP_SKILLS) {
    if (!shopPlant.includes(name)) {
      throw new Error(`inspect shopPlant missing ${name} (got ${shopPlant.join(",")})`);
    }
  }
  if (Array.isArray(plantVsWorn.extraSkills) && plantVsWorn.extraSkills.length > 0) {
    throw new Error(`inspect extraSkills after hangar plant: ${plantVsWorn.extraSkills.join(",")}`);
  }
  const after = assertFastenedMillPlant(consumerRoot);
  if (after.costume === true) {
    throw new Error("costume flipped true after hangar plant");
  }
  console.log("  ✅ hangar factory shops + inspect OK (costume false, no dump)");
  return { inventory: after, report };
}

export function packXrayTgz(xrayRoot = repoRoot) {
  const packOut = run("npm pack --silent", xrayRoot);
  const tarball = packOut.split("\n").filter(Boolean).pop();
  const tarballPath = path.join(xrayRoot, tarball);
  if (!fs.existsSync(tarballPath)) {
    throw new Error(`Tarball not found: ${tarballPath}`);
  }
  return tarballPath;
}

export function writeBareConsumerManifest(tmpRoot) {
  fs.writeFileSync(
    path.join(tmpRoot, "package.json"),
    `${JSON.stringify({ name: "xray-pack-tmp-proof", version: "0.0.1", private: true }, null, 2)}\n`,
  );
}

export function runPackTmpProof(xrayRoot = repoRoot) {
  console.log("\n=== Pack → tmp suit proof ===\n");
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-pack-tmp-proof-"));
  let tarballPath = null;
  try {
    console.log("📦 npm pack...");
    tarballPath = packXrayTgz(xrayRoot);
    writeBareConsumerManifest(tmpRoot);
    console.log("📥 npm install tgz into clean tmp...");
    run(`npm install ${JSON.stringify(tarballPath)}`, tmpRoot, { inherit: true });
    const millRoot = path.join(tmpRoot, "node_modules", "0xray", "scripts", "foundry");
    proveSuitAfterInstall(tmpRoot, millRoot);
    console.log("\n✅ Pack → tmp suit proof passed (Playwright n/a — mill CLI)\n");
    return { tmpRoot, tarballPath };
  } catch (err) {
    console.error(`\n❌ Pack → tmp suit proof failed: ${err.message}\n`);
    throw err;
  } finally {
    if (tarballPath) {
      try {
        fs.unlinkSync(tarballPath);
      } catch {
        /* best-effort */
      }
    }
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      /* best-effort */
    }
  }
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    runPackTmpProof();
  } catch {
    process.exit(1);
  }
}
