#!/usr/bin/env node
/**
 * consumer-install-smoke.mjs — Clean-room pack + install verification.
 *
 * Simulates what consumers receive from npm without publishing.
 * Runs fresh install checks + upgrade merge simulation.
 *
 * Usage:
 *   node scripts/node/consumer-install-smoke.mjs
 */

import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

const XRAY_MCP_NAMES = [
  "xray-governance",
  "xray-skills",
  "xray-orchestrator",
  "xray-enforcer",
  "xray-researcher",
  "xray-code-review",
  "xray-architect-tools",
];

function run(cmd, cwd, { inherit = false } = {}) {
  const result = execSync(cmd, {
    cwd,
    encoding: inherit ? undefined : "utf-8",
    stdio: inherit ? "inherit" : "pipe",
  });
  return inherit ? "" : String(result).trim();
}

function assertFreshInstallDefaults(tmpRoot, version) {
  const consumerFeaturesPath = path.join(tmpRoot, ".xray", "features.json");
  if (!fs.existsSync(consumerFeaturesPath)) {
    throw new Error(".xray/features.json not deployed to consumer project by postinstall");
  }
  const features = JSON.parse(fs.readFileSync(consumerFeaturesPath, "utf-8"));
  if (!features.memory_routing) {
    throw new Error("Deployed features.json missing memory_routing block");
  }
  if (features.memory_routing.enabled !== false) {
    throw new Error(
      `Fresh install must default memory_routing.enabled=false (got ${features.memory_routing.enabled})`,
    );
  }
  if (!features.inference_governance) {
    throw new Error("Deployed features.json missing inference_governance block");
  }
  if (features.inference_governance.enabled !== false) {
    throw new Error("Fresh install must default inference_governance.enabled=false");
  }
  console.log("  ✅ .xray/features.json fresh-install defaults (opt-in off)");
  return { consumerFeaturesPath, features };
}

function runUpgradeMergeSmoke(tmpRoot, nmRoot, version) {
  console.log("\n📋 Upgrade merge smoke (consumer opt-ins preserved)...");

  const { deployXrayConfig } = require(path.join(nmRoot, "scripts/node/install-bridges.cjs"));
  const consumerFeaturesPath = path.join(tmpRoot, ".xray", "features.json");

  fs.writeFileSync(
    consumerFeaturesPath,
    `${JSON.stringify(
      {
        version: "3.4.0",
        memory_routing: {
          enabled: true,
          provider: "repertoire",
          module_path: "dist/provider/memory-routing-provider.js",
        },
        inference_governance: { enabled: true },
        consumer_custom_block: { kept: true },
      },
      null,
      2,
    )}\n`,
  );

  const shippedTemplate = JSON.parse(
    fs.readFileSync(path.join(nmRoot, "xray/features.json"), "utf-8"),
  );
  const shippedMarker = shippedTemplate.token_optimization ? "token_optimization" : null;

  deployXrayConfig(tmpRoot, nmRoot, () => {});

  const merged = JSON.parse(fs.readFileSync(consumerFeaturesPath, "utf-8"));

  if (merged.memory_routing?.enabled !== true) {
    throw new Error(`Upgrade merge lost memory_routing.enabled (got ${merged.memory_routing?.enabled})`);
  }
  if (merged.memory_routing?.provider !== "repertoire") {
    throw new Error(`Upgrade merge lost memory_routing.provider (got ${merged.memory_routing?.provider})`);
  }
  if (merged.inference_governance?.enabled !== true) {
    throw new Error("Upgrade merge lost inference_governance.enabled");
  }
  if (merged.consumer_custom_block?.kept !== true) {
    throw new Error("Upgrade merge dropped consumer-only keys");
  }
  if (merged.version !== version) {
    throw new Error(`Upgrade merge version: expected ${version}, got ${merged.version}`);
  }
  if (shippedMarker && !merged[shippedMarker]) {
    throw new Error(`Upgrade merge missing shipped template key: ${shippedMarker}`);
  }

  console.log("  ✅ upgrade merge preserves opt-ins + bumps features.version");
}

function main() {
  console.log("\n=== Consumer Install Smoke ===\n");

  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf-8"));
  const version = pkg.version;
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "0xray-smoke-"));
  let tarball = null;

  try {
    console.log("📦 npm pack...");
    const packOut = run("npm pack --silent", rootDir);
    tarball = packOut.split("\n").filter(Boolean).pop();
    const tarballPath = path.join(rootDir, tarball);
    if (!fs.existsSync(tarballPath)) {
      throw new Error(`Tarball not found: ${tarballPath}`);
    }

    const consumerPkg = {
      name: "0xray-smoke-consumer",
      private: true,
      version: "1.0.0",
      dependencies: {
        "0xray": `file:${tarballPath}`,
      },
    };
    fs.writeFileSync(
      path.join(tmpRoot, "package.json"),
      JSON.stringify(consumerPkg, null, 2) + "\n",
    );

    console.log("📥 npm install (runs postinstall)...");
    run("npm install", tmpRoot, { inherit: true });

    const nmRoot = path.join(tmpRoot, "node_modules", "0xray");
    const requiredFiles = [
      "scripts/node/install-bridges.cjs",
      "scripts/node/postinstall.cjs",
      "package.json",
      "xray/features.json",
      "xray/features.schema.json",
    ];

    for (const rel of requiredFiles) {
      const full = path.join(nmRoot, rel);
      if (!fs.existsSync(full)) {
        throw new Error(`Missing in tarball install: ${rel}`);
      }
      console.log(`  ✅ ${rel}`);
    }

    const installedPkg = JSON.parse(fs.readFileSync(path.join(nmRoot, "package.json"), "utf-8"));
    if (installedPkg.version !== version) {
      throw new Error(`Installed version ${installedPkg.version} != packed ${version}`);
    }

    const bridges = require(path.join(nmRoot, "scripts/node/install-bridges.cjs"));
    for (const exp of ["installAllBridges", "resolveConsumerTargetDir", "isConsumerInstall", "deployXrayConfig"]) {
      if (typeof bridges[exp] !== "function") {
        throw new Error(`install-bridges missing export: ${exp}`);
      }
    }
    console.log("  ✅ install-bridges exports");

    if (!bridges.isConsumerInstall(nmRoot, tmpRoot)) {
      throw new Error("isConsumerInstall should be true for node_modules/0xray → project root");
    }
    console.log("  ✅ consumer target resolution");

    const mcpPath = path.join(tmpRoot, ".mcp.json");
    if (!fs.existsSync(mcpPath)) {
      throw new Error(".mcp.json not created by postinstall");
    }
    const mcp = JSON.parse(fs.readFileSync(mcpPath, "utf-8"));
    const servers = Object.keys(mcp.mcpServers || {});
    for (const name of XRAY_MCP_NAMES) {
      if (!servers.includes(name)) {
        throw new Error(`Missing MCP server in .mcp.json: ${name}`);
      }
      const entry = mcp.mcpServers[name];
      if (entry.command !== "npx") {
        throw new Error(`${name} should use npx, got ${entry.command}`);
      }
    }
    console.log(`  ✅ .mcp.json has ${XRAY_MCP_NAMES.length} npx MCP servers`);

    assertFreshInstallDefaults(tmpRoot, version);

    const schemaInPackage = path.join(nmRoot, "xray", "features.schema.json");
    if (!fs.existsSync(schemaInPackage)) {
      throw new Error("xray/features.schema.json missing from installed package");
    }
    console.log("  ✅ xray/features.schema.json in package");

    runUpgradeMergeSmoke(tmpRoot, nmRoot, version);

    console.log("\n✅ Consumer install smoke passed\n");
  } catch (err) {
    console.error(`\n❌ Consumer smoke failed: ${err.message}\n`);
    process.exit(1);
  } finally {
    if (tarball) {
      try {
        fs.unlinkSync(path.join(rootDir, tarball));
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

main();