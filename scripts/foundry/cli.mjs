#!/usr/bin/env node
/**
 * @0xray/foundry CLI — mill, not exo. No fifth MCP.
 *
 *   npx @0xray/foundry <reconcile|stamp|gate|release|docs-check|docs-build|mint|inspect|ci|hooks> [...args]
 */

import { spawnSync } from "node:child_process";
import { millScript, resolveMillRoot } from "./mill-root.mjs";

const COMMANDS = {
  reconcile: { script: "reconcile-version.mjs", preset: [] },
  stamp: { script: "version-manager.mjs", preset: ["--artifacts-only"] },
  gate: { script: "release-gate.mjs", preset: [] },
  release: { script: "release.mjs", preset: [] },
  "docs-check": { script: "validate-release-docs.mjs", preset: [] },
  "docs-build": { script: "docs-build.mjs", preset: [] },
  mint: { script: "mint.mjs", preset: [] },
  inspect: { script: "inspect.mjs", preset: [] },
  ci: { script: "ci-monitor.mjs", preset: [] },
  hooks: { script: "hooks.mjs", preset: [] },
};

const HELP =
  "Usage: npx @0xray/foundry <reconcile|stamp|gate|release|docs-check|docs-build|mint|inspect|ci|hooks> [...args]\n" +
  "\n" +
  "Mill, not exo. FOUNDRY_ROOT overrides cwd (the repo being milled).\n" +
  "release bumps/commits/pushes/publishes the milled cwd — pass --dry-run or --i-mean-it (or FOUNDRY_RELEASE=1).\n" +
  "Mint fastens mill plant then overlays their plant (mill-fill JSON). PPE stays worn.\n" +
  "inspect runs the six mill checks (diff, plant vs worn, receipt, CI, live tarball GET, isolated HOME). Not an 8th MCP.\n" +
  "gate is build+test. docs-build is Docusaurus on the 0xray exo. ci reports GitHub Actions (no auto-push). hooks installs git pre/post hooks.\n";

const cmd = process.argv[2];
const rest = process.argv.slice(3);

if (cmd === "--help" || cmd === "-h" || cmd === "help") {
  process.stdout.write(HELP);
  process.exit(0);
}

if (!cmd || !COMMANDS[cmd]) {
  process.stderr.write(HELP);
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
