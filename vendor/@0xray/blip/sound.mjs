#!/usr/bin/env node
/**
 * Factory-sound CLI. Render a bed or inspect the last receipt.
 *   npx @0xray/foundry sound render [--brief TEXT] [--genre ambient|techno|jazz] [--seconds N] [--out FILE]
 *   npx @0xray/foundry sound inspect
 *   npx @0xray/foundry sound mix
 */

import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveMillRoot } from "./mill-root.mjs";

const require = createRequire(import.meta.url);
const bed = require("./sound-bed.cjs");
const mixer = require("./sound-mixer.cjs");
const taste = require("./sound-taste.cjs");
const voice = require("./sound-voice.cjs");

const HELP =
  "Usage: npx @0xray/blip sound <render|inspect|mix|taste|voice> [...args]\n" +
  "\n" +
  "Sound plant, not mill. FOUNDRY_ROOT overrides cwd.\n" +
  "render: brief → checksum seed → genre → wav → metrics receipt.\n" +
  "inspect: last .xray/sound-bed-receipt.json PASS/FAIL (missing is FAIL).\n" +
  "mix: sound-mixer levels every genre × tempo × motif (hats / plate / glue).\n" +
  "taste: friend-ear score for eight live bodies. Ship bar 8.\n" +
  "voice: specific-sound score for every live voice. Ship bar 8.\n";

function argValue(argv, name, fallback) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return fallback;
  return argv[i + 1];
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function inspectBed(root) {
  const receipt = bed.readReceipt(root);
  if (!receipt) {
    return {
      ok: false,
      status: "FAIL",
      failClosed: true,
      detail: "missing .xray/sound-bed-receipt.json",
      receipt: null,
    };
  }
  const status = receipt.status === "PASS" ? "PASS" : "FAIL";
  return {
    ok: status === "PASS",
    status,
    failClosed: true,
    plant: "sound",
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

  if (cmd === "mix" || cmd === "mixer") {
    const report = mixer.mixProject(root);
    writeJson(report);
    process.exit(report.status === "PASS" ? 0 : 1);
  }

  if (cmd === "taste") {
    const report = taste.tasteMatrix();
    writeJson(report);
    process.exit(report.status === "PASS" ? 0 : 1);
  }

  if (cmd === "voice") {
    const report = voice.voiceMatrix();
    writeJson(report);
    process.exit(report.status === "PASS" ? 0 : 1);
  }

  if (cmd === "inspect") {
    const report = inspectBed(root);
    writeJson(report);
    process.exit(report.ok ? 0 : 1);
  }

  if (cmd === "render") {
    const result = bed.renderBed({
      root,
      brief: argValue(rest, "--brief", "factory-sound bed"),
      genre: argValue(rest, "--genre", "ambient"),
      seconds: Number(argValue(rest, "--seconds", bed.DEFAULT_SECONDS)),
      out: argValue(rest, "--out", null),
    });
    writeJson(result.receipt);
    process.exit(result.receipt.status === "PASS" ? 0 : 1);
  }

  process.stderr.write(HELP);
  process.exit(1);
}

export { inspectBed };

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main();
}
