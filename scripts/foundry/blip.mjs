#!/usr/bin/env node
/**
 * Factory-blip CLI — sibling plant to mill + sound, not a mill bolt-on.
 *   npx @0xray/foundry blip render --brief TEXT --mode still|motion:<id> [--bed PATH] [--engine rippel|wireframe] [--out FILE]
 *   npx @0xray/foundry blip inspect
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMillRoot } from "./mill-root.mjs";

const require = createRequire(import.meta.url);
const blip = require("./blip-render.cjs");

const HELP =
  "Usage: npx @0xray/foundry blip <render|inspect> [...args]\n" +
  "\n" +
  "Factory-blip plant, sibling to mill + sound. FOUNDRY_ROOT overrides cwd.\n" +
  "render: brief → checksum seed → still|motion:<id> → 4.44s mp4 + audio bed → receipt.\n" +
  "v0 ids: still, orb, swirl, snap, waves, spark (Rippel five are imports).\n" +
  "Motions: Rippel VisualConfig.circles at ≥720p (default). --engine wireframe is emergency only.\n" +
  "Every mp4 muxes a 4.44s bed (--bed PATH or auto sound mill). Silent = inspect FAIL.\n" +
  "kapow is a growth stub (FAIL until a renderer ships). Unknown id FAIL.\n" +
  "still: Power Plant ident — hard-cut plates over 4.44s at ≥720p, not a frozen poster.\n" +
  "inspect: last .xray/blip/receipt.json PASS/FAIL (missing is FAIL). Lists live registry ids.\n";

function argValue(argv, name, fallback) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return fallback;
  return argv[i + 1];
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function inspectBlip(root) {
  const motions = blip.listMotionIds();
  const receipt = blip.readReceipt(root);
  if (!receipt) {
    return {
      ok: false,
      status: "FAIL",
      failClosed: true,
      plant: "blip",
      motions,
      detail: "missing .xray/blip/receipt.json",
      receipt: null,
    };
  }
  const evaluated = blip.evaluateReceipt(root, receipt);
  const status = evaluated.status === "PASS" ? "PASS" : "FAIL";
  return {
    ok: status === "PASS",
    status,
    failClosed: true,
    plant: "blip",
    motions,
    mode: evaluated.mode || receipt.motionId || receipt.mode || null,
    pictureMode: evaluated.pictureMode || receipt.pictureMode || null,
    durationSec: evaluated.durationSec ?? receipt.durationSec ?? null,
    receipt,
  };
}

function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  const rest = argv.slice(1);
  const root = resolveMillRoot();

  if (!cmd || cmd === "--help" || cmd === "-h" || cmd === "help") {
    process.stdout.write(HELP);
    process.exit(cmd ? 0 : 1);
  }

  if (cmd === "inspect") {
    const report = inspectBlip(root);
    writeJson(report);
    process.exit(report.ok ? 0 : 1);
  }

  if (cmd === "render") {
    const result = blip.renderBlip({
      root,
      brief: argValue(rest, "--brief", "factory-blip"),
      pictureMode: argValue(rest, "--picture-mode", argValue(rest, "--mode", "still")),
      bed: argValue(rest, "--bed", null),
      engine: argValue(rest, "--engine", "rippel"),
      out: argValue(rest, "--out", null),
    });
    writeJson(result.receipt);
    process.exit(result.receipt.status === "PASS" ? 0 : 1);
  }

  process.stderr.write(HELP);
  process.exit(1);
}

export { inspectBlip };

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
