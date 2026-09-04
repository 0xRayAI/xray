#!/usr/bin/env node
/**
 * Mill Docusaurus build. Full corpus only on the 0xray exo (docs-site/).
 * Stranger mills skip. Not PPE. Not an 8th MCP.
 *
 *   npx @0xray/foundry docs-build
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isXrayExoRepo, resolveMillRoot } from "./mill-root.mjs";

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", env: process.env });
  return result.status === null ? 1 : result.status;
}

function main() {
  const root = resolveMillRoot();
  if (!isXrayExoRepo(root)) {
    process.stdout.write("docs-build: skipped (not 0xray exo with docs-site)\n");
    process.exit(0);
  }
  const docs = path.join(root, "docs-site");
  if (!fs.existsSync(path.join(docs, "node_modules"))) {
    const install = run("npm", ["ci"], docs);
    if (install !== 0) process.exit(install);
  }
  process.exit(run("npm", ["run", "build"], docs));
}

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
