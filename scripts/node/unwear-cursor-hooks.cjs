#!/usr/bin/env node
/**
 * Undo Cursor hook wear. Restores `.cursor/hooks.json` from
 * `<project>/.xray/state/cursor-hook-wear/` when the file still matches what wear
 * wrote. If that directory is gone, or the file changed after wear, removes
 * only the installed dist entries.
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
