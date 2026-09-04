#!/usr/bin/env node
/**
 * Mill git hooks: install pre-commit / post-commit / pre-push / post-push.
 * Wear-time installer lives at scripts/hooks/install-hooks.cjs.
 *
 *   npx @0xray/foundry hooks
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { millPackageDir, resolveMillRoot } from "./mill-root.mjs";

function main() {
  const installer = path.join(millPackageDir(), "..", "hooks", "install-hooks.cjs");
  const root = resolveMillRoot();
  const result = spawnSync(process.execPath, [installer, ...process.argv.slice(2)], {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, FOUNDRY_ROOT: root },
  });
  process.exit(result.status === null ? 1 : result.status);
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
