#!/usr/bin/env node
/**
 * Overlay their mill SSOT onto the project (cwd / FOUNDRY_ROOT).
 * Not a fifth 0xray CLI. Not PPE.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { millPackageDir, resolveMillRoot } from "./mill-root.mjs";
import { inspectSuit } from "./inspect.mjs";

const require = createRequire(import.meta.url);
const { mintConsumerSuit } = require("./mint-suit.cjs");

async function main() {
  const target = resolveMillRoot();
  const millRoot = millPackageDir();
  const skipLive = process.argv.includes("--skip-live");
  let inventory;
  try {
    inventory = mintConsumerSuit(millRoot, target, (component, action, status) => {
      process.stdout.write(`${component} ${action} ${status}\n`);
    });
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
  if (inventory.skipped) {
    process.stderr.write("mint: skipped dogfood / 0xray exo plant (not a consumer project)\n");
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
  const report = await inspectSuit(target, { millRoot, skipLive });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exit(1);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
