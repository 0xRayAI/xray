#!/usr/bin/env node
/**
 * Copy src/opencode into an existing .opencode.
 * GNU cp -r src/opencode/ .opencode/ nests a second opencode/ directory
 * when .opencode already exists, so agents and codex.codex never land
 * where the build-artifact tests look.
 */
const fs = require("fs");
const path = require("path");

function materializeOpencode(root) {
  const src = path.join(root, "src", "opencode");
  const agents = path.join(src, "agents");
  const codex = path.join(src, "codex.codex");
  if (!fs.existsSync(agents) || !fs.existsSync(codex)) {
    throw new Error("materialize-opencode: src/opencode is missing agents or codex.codex");
  }
  const dest = path.join(root, ".opencode");
  fs.mkdirSync(dest, { recursive: true });
  fs.cpSync(src, dest, { recursive: true });
  if (!fs.existsSync(path.join(dest, "agents")) || !fs.existsSync(path.join(dest, "codex.codex"))) {
    throw new Error("materialize-opencode: .opencode is missing agents or codex.codex after copy");
  }
}

function repoRoot() {
  return path.resolve(__dirname, "..", "..");
}

module.exports = { materializeOpencode };

if (require.main === module) {
  try {
    materializeOpencode(repoRoot());
  } catch (err) {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  }
}
