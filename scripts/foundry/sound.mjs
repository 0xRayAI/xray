#!/usr/bin/env node
/**
 * Shim: sound mill lives in @0xray/blip.
 *   npx @0xray/foundry sound render|inspect|mix [...]
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

function runCli(args) {
  let cli;
  try {
    cli = require.resolve("@0xray/blip/cli");
  } catch {
    process.stderr.write("Install @0xray/blip — the sound mill moved off the OS foundry.\n");
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [cli, "sound", ...args], {
    stdio: "inherit",
    cwd: process.env.FOUNDRY_ROOT || process.cwd(),
    env: process.env,
  });
  process.exit(result.status === null ? 1 : result.status);
}

const invoked =
  process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  runCli(process.argv.slice(2));
}
