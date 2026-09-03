#!/usr/bin/env node
/**
 * @0xray/foundry CLI — mill, not exo. No fifth MCP.
 *
 *   npx @0xray/foundry <reconcile|stamp|gate|release|docs-check> [...args]
 */

import { spawnSync } from "node:child_process";
import { millScript, resolveMillRoot } from "./mill-root.mjs";

const COMMANDS = {
  reconcile: { script: "reconcile-version.mjs", preset: [] },
  stamp: { script: "version-manager.mjs", preset: ["--artifacts-only"] },
  gate: { script: "release-gate.mjs", preset: [] },
  release: { script: "release.mjs", preset: [] },
  "docs-check": { script: "validate-release-docs.mjs", preset: [] },
};

const cmd = process.argv[2];
const rest = process.argv.slice(3);

if (!cmd || !COMMANDS[cmd]) {
  process.stderr.write(
    "Usage: npx @0xray/foundry <reconcile|stamp|gate|release|docs-check> [...args]\n",
  );
  process.exit(1);
}

const spec = COMMANDS[cmd];
const root = resolveMillRoot();
const result = spawnSync(
  process.execPath,
  [millScript(spec.script), ...spec.preset, ...rest],
  {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, FOUNDRY_ROOT: root },
  },
);
process.exit(result.status === null ? 1 : result.status);
