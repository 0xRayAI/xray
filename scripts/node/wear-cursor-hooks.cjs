#!/usr/bin/env node
/**
 * Wear the Cursor suit in a git work tree.
 *   npx 0xray wear
 *   node node_modules/0xray/scripts/node/wear-cursor-hooks.cjs [project]
 */
const path = require("path");
const { wearCursorHooks } = require("./install-bridges.cjs");

const target = path.resolve(process.argv[2] || process.cwd());
const packageRoot = path.resolve(__dirname, "..", "..");
try {
  wearCursorHooks(target, packageRoot, () => {});
} catch (err) {
  process.stderr.write(`${err && err.message ? err.message : err}\n`);
  process.exit(1);
}
