#!/usr/bin/env node
/**
 * Overlay their mill SSOT onto the hanger (cwd / FOUNDRY_ROOT).
 * Not a fifth 0xray CLI. Not PPE.
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { millPackageDir, resolveMillRoot } from "./mill-root.mjs";

const require = createRequire(import.meta.url);
const { mintConsumerSuit } = require("./mint-suit.cjs");

function main() {
  const target = resolveMillRoot();
  const millRoot = millPackageDir();
  const inventory = mintConsumerSuit(millRoot, target, (component, action, status) => {
    process.stdout.write(`${component} ${action} ${status}\n`);
  });
  if (inventory.skipped) {
    process.stderr.write("mint: skipped dogfood / 0xray exo plant (not a consumer hanger)\n");
    process.exit(0);
  }
  process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main();
}
