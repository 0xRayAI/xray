#!/usr/bin/env node
/**
 * Undo Cursor hook wear. Restores `.cursor/hooks.json` to the bytes from
 * before wear, or removes the file when wear created it.
 *
 * From the consumer project:
 *   node node_modules/0xray/scripts/node/unwear-cursor-hooks.cjs
 * Optional argument: a project root (defaults to cwd).
 */
const path = require("path");
const { unwearCursorHooks } = require("./install-bridges.cjs");

const target = path.resolve(process.argv[2] || process.cwd());
const restored = unwearCursorHooks(target);
if (!restored) {
  process.stderr.write(`unwear: no 0xray cursor wear snapshot at ${target}\n`);
  process.exit(1);
}
process.stdout.write(`unwear: restored cursor hooks at ${target}\n`);
