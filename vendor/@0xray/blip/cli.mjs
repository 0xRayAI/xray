#!/usr/bin/env node
/**
 * @0xray/blip — product mill for 4.44s shorties (+ sound beds).
 *   npx @0xray/blip <render|inspect|vibe|look|replay> [...]
 *   npx @0xray/blip sound <render|inspect|mix|taste> [...]
 */
import { spawnSync } from "node:child_process";
import { millScript } from "./mill-root.mjs";

const HELP =
  "Usage: npx @0xray/blip <render|inspect|vibe|look|replay> [...]\n" +
  "       npx @0xray/blip sound <render|inspect|mix|taste> [...]\n" +
  "4.44s shorties that blip. FOUNDRY_ROOT overrides cwd.\n" +
  "look / replay: friend hitting replay (bar 8). vibe: stamp density. inspect: file/duration.\n";

const argv = process.argv.slice(2);
const cmd = argv[0];
if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
  process.stdout.write(HELP);
  process.exit(cmd ? 0 : 1);
}

const script = cmd === "sound" ? "sound.mjs" : "blip.mjs";
const rest = cmd === "sound" ? argv.slice(1) : argv;
const result = spawnSync(process.execPath, [millScript(script), ...rest], {
  stdio: "inherit",
  cwd: process.env.FOUNDRY_ROOT || process.cwd(),
  env: { ...process.env, FOUNDRY_ROOT: process.env.FOUNDRY_ROOT || process.cwd() },
});
process.exit(result.status === null ? 1 : result.status);
