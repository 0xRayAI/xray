#!/usr/bin/env node
/**
 * Mill git hooks: install pre-commit / post-commit / pre-push / post-push.
 * Wear-time installer lives at scripts/hooks/install-hooks.cjs (dogfood)
 * or node_modules/0xray/scripts/hooks/install-hooks.cjs (published mill).
 *
 *   npx @0xray/foundry hooks
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveHookInstaller, resolveMillRoot } from "./mill-root.mjs";

function main() {
  const root = resolveMillRoot();
  const installer = resolveHookInstaller(root);
  if (!installer) {
    process.stderr.write(
      "mill hooks: no install-hooks.cjs (dogfood scripts/hooks or node_modules/0xray/scripts/hooks)\n",
    );
    process.exit(1);
  }
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
