#!/usr/bin/env node
/**
 * Remove the Cursor suit. Prints "restored" only when the file bytes match
 * the snapshot exactly. A mismatch keeps the snapshot and exits non-zero.
 *
 *   npx 0xray unwear
 *   node node_modules/0xray/scripts/node/unwear-cursor-hooks.cjs [project]
 */
const path = require("path");
const { unwearCursorHooks } = require("./install-bridges.cjs");

const target = path.resolve(process.argv[2] || process.cwd());
let restored = false;
try {
  restored = unwearCursorHooks(target);
} catch (err) {
  process.stderr.write(`${err && err.message ? err.message : err}\n`);
  process.exit(1);
}
if (!restored) process.exit(1);
process.stdout.write(`unwear: restored cursor hooks at ${target}\n`);
