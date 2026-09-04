#!/usr/bin/env node
/**
 * Shim onto the mill CI monitor. Not PPE.
 *
 *   node scripts/node/github-actions-monitor.cjs [--commit SHA] [--report]
 */

const { spawnSync } = require("child_process");
const path = require("path");

const mill = path.join(__dirname, "../foundry/ci-monitor.mjs");
const root = process.env.FOUNDRY_ROOT || process.cwd();
const result = spawnSync(process.execPath, [mill, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, FOUNDRY_ROOT: root },
});
process.exit(result.status === null ? 1 : result.status);
