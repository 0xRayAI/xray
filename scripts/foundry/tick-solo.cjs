#!/usr/bin/env node
/**
 * Solo the small tick in the Magnetic Moves kicks.
 *
 * The voice is addKickTick in sound-pro.cjs: a 2.8 kHz sine, about 4 ms,
 * highpassed at 2 kHz and lowpassed at 4 kHz, peaked 20 dB under the kick
 * body. renderDrums places it on every kick from the drop.
 *
 * v6, v7, v7b, and v7c use that sine. v4a, v4b, v5a, and v5b have no
 * separate tick. v9 and v8lib use the CC0 kick beater instead.
 * This file only renders the solo. It does not change a bed.
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const P = require("./sound-pro.cjs");

const HAS_TICK = ["v6", "v7", "v7b", "v7c"];
const LACKS_TICK = ["v4a", "v4b", "v5a", "v5b", "v9", "v8lib"];
const SOLO_SECONDS = 10;
const SR = P.SAMPLE_RATE;
const BPM = 123;
const BEAT = 60 / BPM;

function isolateSineTick(sampleRate) {
  const full = P.renderKickFull(sampleRate);
  const body = P.renderKickBody(sampleRate);
  const n = Math.max(full.length, body.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = (full[i] || 0) - (body[i] || 0);
  return out;
}

function isolateV6Tick(sampleRate) {
  const full = P.renderKickTicked(sampleRate);
  const body = P.renderKickClean(sampleRate);
  const n = Math.max(full.length, body.length);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = (full[i] || 0) - (body[i] || 0);
  return out;
}

/** Kick grid from the drop, ten seconds, same velocities as renderDrums. */
function renderTickSolo(hit) {
  const n = Math.round(SOLO_SECONDS * SR);
  const out = P.silence(n);
  let placed = 0;
  for (let t = 0; t < SOLO_SECONDS - 0.02; t += BEAT) {
    const vel = 0.86 + 0.14 * ((placed % 5) / 4);
    placed += 1;
    P.addAt(out, hit, t * SR, vel);
  }
  const peak = P.samplePeak(out);
  if (peak > 0) {
    const gain = 0.45 / peak;
    for (let i = 0; i < n; i++) out[i] *= gain;
  }
  return out;
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return "";
  return argv[i + 1];
}

function writeSolo(outDir, version, samples) {
  fs.mkdirSync(outDir, { recursive: true });
  const wav = path.join(outDir, `TICK-${version}.wav`);
  const mp3 = path.join(outDir, `TICK-${version}.mp3`);
  P.writeWav(wav, samples, samples, SR, fs);
  const encoded = spawnSync(
    "ffmpeg",
    ["-y", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "320k", mp3],
    { stdio: "pipe" },
  );
  fs.unlinkSync(wav);
  if (encoded.status !== 0) {
    process.stderr.write(encoded.stderr ? encoded.stderr.toString() : "ffmpeg mp3 failed\n");
    return 1;
  }
  return 0;
}

function cli(argv) {
  const outDir = argValue(argv, "--out");
  if (!outDir) {
    process.stderr.write("Usage: node scripts/foundry/tick-solo.cjs --out dir\n");
    process.stderr.write(`has tick: ${HAS_TICK.join(" ")}\n`);
    process.stderr.write(`lacks this sine tick: ${LACKS_TICK.join(" ")}\n`);
    return 1;
  }
  const hit = isolateSineTick(SR);
  for (let i = 0; i < HAS_TICK.length; i++) {
    const version = HAS_TICK[i];
    const status = writeSolo(outDir, version, renderTickSolo(hit));
    if (status !== 0) return status;
    process.stdout.write(`TICK-${version}.mp3\n`);
  }
  process.stdout.write(`no sine tick: ${LACKS_TICK.join(" ")}\n`);
  return 0;
}

module.exports = {
  HAS_TICK,
  LACKS_TICK,
  SOLO_SECONDS,
  BPM,
  BEAT,
  isolateSineTick,
  isolateV6Tick,
  renderTickSolo,
  cli,
};

if (require.main === module) {
  process.exit(cli(process.argv.slice(2)));
}
