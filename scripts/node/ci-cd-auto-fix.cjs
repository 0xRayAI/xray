#!/usr/bin/env node
/**
 * Mill does not auto-push CI fixes. Report only.
 *
 *   node scripts/node/ci-cd-auto-fix.cjs
 */

const { spawnSync } = require("child_process");
const path = require("path");

const mill = path.join(__dirname, "../foundry/ci-monitor.mjs");
const root = process.env.FOUNDRY_ROOT || process.cwd();
const result = spawnSync(process.execPath, [mill, "--report", ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, FOUNDRY_ROOT: root },
});
process.exit(result.status === null ? 1 : result.status);
