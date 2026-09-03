#!/usr/bin/env node
/**
 * Foundry mill wrapper. Version SSOT is package.json (reconcile-version).
 * Prose is verified by validate-release-docs — not rewritten here.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const result = spawnSync(
  process.execPath,
  [path.join(root, "scripts/foundry/validate-release-docs.mjs"), ...process.argv.slice(2)],
  { cwd: root, stdio: "inherit" },
);
process.exit(result.status === null ? 1 : result.status);
