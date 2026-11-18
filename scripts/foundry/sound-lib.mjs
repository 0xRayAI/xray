/**
 * BED-MAGNETIC-MOVES-v8lib — the v7 cue map, voiced by Elementary Audio.
 * Pad, plucks, stab, and bass are @elemaudio/core graphs rendered by
 * @elemaudio/offline-renderer (both MIT). Tone.Offline needs a Web Audio
 * context; this WASM renderer runs in Node.
 * Drums are the CC0 one-shots in ./cc0, listed in cc0/manifest.json.
 * Filters, chorus, reverb, delay, and the stereo image are Elementary nodes.
 */

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { el } from "@elemaudio/core";
import OfflineRenderer from "@elemaudio/offline-renderer";

const require = createRequire(import.meta.url);
const P = require("./sound-pro.cjs");

const SECONDS = 22.87;
const BPM = 123;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
const SEG = 2 * BAR;
const SR = P.SAMPLE_RATE;

const CUES = {
  air: 2.6,
  drop: 5.2,
  clap: 7.7,
  hats: 11.03,
  peak: 14.03,
  cut: 15.6,
  final: 17.37,
  fade: 21.8,
};

const PROG = [
  { name: "Cm", root: 36, pad: [60, 63, 67, 72] },
  { name: "Fm", root: 29, pad: [60, 65, 68, 72] },
  { name: "Ab", root: 32, pad: [60, 63, 68, 75] },
  { name: "G", root: 31, pad: [59, 62, 67, 74] },
];

const BASS_VEL = [0.8, 1, 0.62, 0.9, 0.7, 0.95, 0.58, 0.84];
const PAD_WEIGHTS = [1, 0.46, 0.14, 0.05];
const DIR = path.dirname(fileURLToPath(import.meta.url));

const GAINS = {
  pad: 0.22,
  sub: 0.76,
  mid: 0.18,
  kick: 0.64,
  hat: 0.5,
  pluck: 0.34,
  stab: 0.16,
  room: 0.05,
  echo: 0.04,
};

function chordIndex(t) {
  const i = Math.floor(t / SEG);
  return ((i % 4) + 4) % 4;
}

function chordAt(t) {
  return PROG[chordIndex(t)];
}

function inBody(t) {
  return (t >= CUES.drop && t < CUES.cut) || t >= CUES.final;
}

function times(start, step, end, allow) {
  const out = [];
  for (let t = start; t < end; t += step) {
    if (allow(t)) out.push(t);
  }
  return out;
}

function sectionEnv(t, edge, from, to) {
  if (t < from - edge || t >= to + edge) return t >= from && t < to ? 1 : 0;
  if (t < from) return 0;
  if (t < from + edge) return P.smoothstep((t - from) / edge);
  if (t < to - edge) return 1;
  if (t < to) return 1 - P.smoothstep((t - (to - edge)) / edge);
  return 0;
}

function padLevel(t) {
  let g = 1;
  if (t < CUES.air) g = P.smoothstep(t / CUES.air);
  const cut = sectionEnv(t, 0.02, CUES.cut, CUES.final);
  g *= 1 - 0.62 * cut;
  return g;
}

function masterFade(t) {
  if (t < CUES.fade) return 1;
  if (t >= SECONDS) return 0;
  return 1 - P.smoothstep((t - CUES.fade) / (SECONDS - CUES.fade));
}

function filled(n, value) {
  const out = new Float32Array(n);
  out.fill(value);
  return out;
}

function readMonoWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error(`not a wav: ${file}`);
  const channels = buf.readUInt16LE(22);
  const rate = buf.readUInt32LE(24);
  if (channels !== 1 || rate !== SR) throw new Error(`expected mono ${SR}: ${file}`);
  const n = Math.floor((buf.length - 44) / 2);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = buf.readInt16LE(44 + i * 2) / 32768;
  return out;
}

function loadHits() {
  const dir = path.join(DIR, "cc0");
  return {
    kick: readMonoWav(path.join(dir, "kick.wav")),
    clap: readMonoWav(path.join(dir, "clap.wav")),
    hatClosed: readMonoWav(path.join(dir, "hat-closed.wav")),
    hatOpen: readMonoWav(path.join(dir, "hat-open.wav")),
  };
}

function placeDrums(n, hits) {
  const kick = P.silence(n);
  const clap = P.silence(n);
  const hat = P.silence(n);
  const kicks = times(CUES.drop, BEAT, SECONDS - 0.05, inBody);
  const claps = times(CUES.clap, BEAT * 2, SECONDS - 0.05, inBody);
  const hats = times(CUES.hats, BEAT / 2, SECONDS - 0.02, inBody);
  for (let i = 0; i < kicks.length; i++) {
    const vel = 0.86 + 0.14 * ((i % 5) / 4);
    P.addAt(kick, hits.kick, kicks[i] * SR, vel);
  }
  for (let i = 0; i < claps.length; i++) P.addAt(clap, hits.clap, claps[i] * SR, 1);
  for (let i = 0; i < hats.length; i++) {
    const open = hats[i] >= CUES.peak && hats[i] < CUES.cut && i % 4 === 2;
    const base = open ? 0.85 : 0.55;
    const vel = base * (0.75 + 0.25 * ((i % 4) / 3));
    P.addAt(hat, open ? hits.hatOpen : hits.hatClosed, hats[i] * SR, vel);
  }
  return { kick, clap, hat };
}

function padTables(n) {
  const names = { freq: [], amp: [], prevFreq: [], prevAmp: [] };
  const tables = {};
  const weightSum = PAD_WEIGHTS.reduce((sum, w) => sum + w, 0);
  for (let v = 0; v < 4; v++) {
    names.freq.push(`padF${v}`);
    names.amp.push(`padA${v}`);
    names.prevFreq.push(`padPF${v}`);
    names.prevAmp.push(`padPA${v}`);
    tables[`padF${v}`] = filled(n, 440);
    tables[`padA${v}`] = filled(n, 0);
    tables[`padPF${v}`] = filled(n, 440);
    tables[`padPA${v}`] = filled(n, 0);
  }
  const xfade = 0.05;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const boundary = Math.floor(t / SEG) * SEG;
    const into = t - boundary;
    const curr = chordAt(t).pad;
    const prev = chordAt(boundary - 0.001).pad;
    const usePrev = boundary > 0 && into < xfade;
    const a = usePrev ? Math.cos((into / xfade) * Math.PI * 0.5) : 0;
    const b = usePrev ? Math.sin((into / xfade) * Math.PI * 0.5) : 1;
    const level = padLevel(t);
    for (let v = 0; v < 4; v++) {
      tables[`padF${v}`][i] = P.midiHz(curr[v]);
      tables[`padPF${v}`][i] = P.midiHz(prev[v]);
      tables[`padA${v}`][i] = (b * PAD_WEIGHTS[v] / weightSum) * level;
      tables[`padPA${v}`][i] = (a * PAD_WEIGHTS[v] / weightSum) * level;
    }
  }
  return { tables, names };
}

function writeNote(tables, ampKey, freqKey, cutKey, t, hz, vel, decay, dur, cutOpen, cutFloor) {
  const amp = tables[ampKey];
  const freq = tables[freqKey];
  const cut = cutKey ? tables[cutKey] : null;
  const i0 = Math.floor(t * SR);
  const count = Math.floor(dur * SR);
  for (let i = 0; i < count && i0 + i < amp.length; i++) {
    const time = i / SR;
    const attack = time < 0.006 ? time / 0.006 : 1;
    amp[i0 + i] = Math.exp(-time / decay) * attack * vel;
    freq[i0 + i] = hz * Math.pow(0.97, time / dur);
    if (cut) cut[i0 + i] = cutFloor + (cutOpen - cutFloor) * Math.exp(-time / 0.03);
  }
}

function bassTables(n) {
  const tables = {
    bassA: filled(n, 0),
    bassF: filled(n, P.midiHz(36)),
    bassC: filled(n, 140),
  };
  const step = BEAT / 4;
  let placed = 0;
  for (let i = 0; ; i++) {
    const t = CUES.drop + i * step;
    if (t >= SECONDS - 0.05) break;
    if (!inBody(t) || i % 4 === 0) continue;
    const vel = BASS_VEL[placed % BASS_VEL.length];
    placed += 1;
    writeNote(tables, "bassA", "bassF", "bassC", t, P.midiHz(chordAt(t).root), vel, 0.04, 0.09, 220, 90);
  }
  return tables;
}

function pluckTables(n) {
  const tables = {
    pluckA: filled(n, 0),
    pluckF: filled(n, 440),
    pluckC: filled(n, 900),
  };
  const pattern = [0, 2, 1, 3];
  const steps = [0.5, 1.25, 2.5, 3.25];
  const vels = [0.72, 1, 0.64, 0.88];
  const startBar = Math.floor(CUES.air / BAR);
  const endBar = Math.ceil(SECONDS / BAR);
  for (let bar = startBar; bar < endBar; bar++) {
    const barT = bar * BAR;
    for (let s = 0; s < steps.length; s++) {
      const t = barT + steps[s] * BEAT;
      if (t < CUES.air || t >= SECONDS - 0.05) continue;
      if (t >= CUES.cut && t < CUES.final) continue;
      if (t >= CUES.drop && !inBody(t)) continue;
      const notes = chordAt(t).pad;
      const midi = notes[pattern[s] % notes.length];
      const intro = t < CUES.drop ? 0.28 : 1;
      const peak = t >= CUES.peak && t < CUES.cut ? 1.15 : 1;
      writeNote(tables, "pluckA", "pluckF", "pluckC", t, P.midiHz(midi), 0.9 * intro * peak * vels[s], 0.045, 0.14, 4200, 2400);
    }
  }
  return tables;
}

function stabTimes() {
  const claps = times(CUES.clap, BEAT * 2, SECONDS - 0.05, inBody);
  const extra = times(CUES.peak, BEAT, CUES.cut, () => true);
  return claps.concat(extra.filter((t) => !claps.some((c) => Math.abs(c - t) < 0.02)));
}

function stabTables(n) {
  const tables = { stabA: filled(n, 0) };
  for (let v = 0; v < 4; v++) tables[`stabF${v}`] = filled(n, 440);
  const vels = [0.78, 1, 0.7, 0.9];
  const when = stabTimes();
  for (let i = 0; i < when.length; i++) {
    const chord = chordAt(when[i]);
    const peak = when[i] >= CUES.peak && when[i] < CUES.cut ? 1.1 : 0.92;
    const vel = vels[i % vels.length] * peak;
    writeNote(tables, "stabA", "stabF0", null, when[i], P.midiHz(chord.pad[0]), vel, 0.028, 0.08, 0, 0);
    const i0 = Math.floor(when[i] * SR);
    const count = Math.floor(0.08 * SR);
    for (let v = 0; v < 4; v++) {
      for (let k = 0; k < count && i0 + k < n; k++) tables[`stabF${v}`][i0 + k] = P.midiHz(chord.pad[v]);
    }
  }
  return tables;
}

function tableAt(name, phase) {
  return el.table({ path: name }, phase);
}

function sawBank(freqNames, ampNames, phase) {
  let mix = el.mul(0, el.cycle(440));
  for (let v = 0; v < freqNames.length; v++) {
    const osc = el.blepsaw(tableAt(freqNames[v], phase));
    mix = el.add(mix, el.mul(tableAt(ampNames[v], phase), osc));
  }
  return el.dcblock(mix);
}

function padVoice(raw, moving) {
  const lfo = moving ? el.cycle(0.05) : 0;
  const tiltLfo = moving ? el.cycle(0.07) : 0;
  const tilt = el.add(0.4, el.mul(0.08, tiltLfo));
  const dark = el.lowpass(el.add(900, el.mul(40, lfo)), 0.7, raw);
  const bright = el.lowpass(el.add(2800, el.mul(50, lfo)), 0.6, raw);
  return el.add(el.mul(el.sub(1, tilt), dark), el.mul(tilt, bright));
}

function chorusSide(input) {
  const lfo = el.cycle(0.22);
  const leftTime = el.ms2samps(el.add(7.5, el.mul(2.2, lfo)));
  const rightTime = el.ms2samps(el.add(7.5, el.mul(2.2, el.mul(-1, lfo))));
  const left = el.delay({ size: 4000 }, leftTime, 0.18, input);
  const right = el.delay({ size: 4000 }, rightTime, 0.18, input);
  const side = el.mul(0.5, el.sub(left, right));
  return el.highpass(200, 0.707, side);
}

function reverb(input) {
  const leftLens = [1553, 1867, 2111, 2371];
  const rightLens = [1601, 1931, 2203, 2441];
  const fb = [0.62, 0.6, 0.58, 0.56];
  let left = el.mul(0, input);
  let right = el.mul(0, input);
  for (let i = 0; i < 4; i++) {
    left = el.add(left, el.delay({ size: 8000 }, leftLens[i], fb[i], input));
    right = el.add(right, el.delay({ size: 8000 }, rightLens[i], fb[i], input));
  }
  left = el.highpass(200, 0.707, el.lowpass(2800, 0.7, el.mul(0.22, left)));
  right = el.highpass(200, 0.707, el.lowpass(2800, 0.7, el.mul(0.22, right)));
  return {
    mid: el.mul(0.5, el.add(left, right)),
    side: el.mul(0.5, el.sub(left, right)),
  };
}

function pingPong(input) {
  const delay = Math.round(BEAT * 0.75 * SR);
  const left = el.delay({ size: delay + 64 }, delay, 0, input);
  const right = el.delay({ size: delay + 64 }, delay, 0.12, left);
  const mid = el.highpass(500, 0.707, el.mul(0.5, el.add(left, right)));
  const side = el.highpass(500, 0.707, el.mul(0.5, el.sub(left, right)));
  return { mid, side };
}

async function renderVoices(n, vfs) {
  const core = new OfflineRenderer();
  await core.initialize({
    numInputChannels: 0,
    numOutputChannels: 12,
    sampleRate: SR,
    blockSize: 128,
    virtualFileSystem: vfs,
  });
  const phase = el.phasor(1 / SECONDS);
  const padRaw = el.add(
    sawBank(["padF0", "padF1", "padF2", "padF3"], ["padA0", "padA1", "padA2", "padA3"], phase),
    sawBank(["padPF0", "padPF1", "padPF2", "padPF3"], ["padPA0", "padPA1", "padPA2", "padPA3"], phase),
  );
  const pad = padVoice(padRaw, true);
  const padFixed = padVoice(padRaw, false);
  const bassAmp = tableAt("bassA", phase);
  const bassHz = tableAt("bassF", phase);
  const sub = el.mul(bassAmp, el.lowpass(140, 0.7, el.cycle(bassHz)));
  const mid = el.mul(
    bassAmp,
    el.lowpass(
      tableAt("bassC", phase),
      0.7,
      el.add(el.cycle(bassHz), el.mul(0.34, el.cycle(el.mul(3, bassHz))), el.mul(0.16, el.cycle(el.mul(5, bassHz)))),
    ),
  );
  const pluckAmp = tableAt("pluckA", phase);
  const pluckSaw = el.blepsaw(tableAt("pluckF", phase));
  const presence = el.bandpass(3100, 1.15, padRaw);
  const pluck = el.add(
    el.mul(pluckAmp, el.lowpass(tableAt("pluckC", phase), 0.7, pluckSaw)),
    el.mul(0.85, presence),
  );
  const stabAmp = tableAt("stabA", phase);
  let stabSum = el.mul(0, el.cycle(440));
  for (let v = 0; v < 4; v++) stabSum = el.add(stabSum, el.blepsaw(tableAt(`stabF${v}`, phase)));
  const stab = el.mul(stabAmp, el.lowpass(3400, 0.7, el.mul(0.25, stabSum)));
  const hat = el.highpass(2200, 0.707, tableAt("hat", phase));
  const room = reverb(el.add(el.mul(0.55, pluck), el.mul(0.7, stab)));
  const echo = pingPong(pluck);
  const outs = Array.from({ length: 12 }, () => new Float32Array(n));
  await core.render(
    pad,
    padFixed,
    sub,
    mid,
    pluck,
    stab,
    hat,
    chorusSide(pad),
    room.mid,
    room.side,
    echo.mid,
    echo.side,
  );
  core.process([], outs);
  return outs.map(toFloat64);
}

function toFloat64(samples) {
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    if (!Number.isFinite(x)) throw new Error("Elementary render produced a non-finite sample");
    out[i] = x;
  }
  return out;
}

function motionDepth(moving, fixed) {
  const win = Math.floor(0.25 * SR);
  let maxDiff = 0;
  const end = Math.min(moving.length, fixed.length, Math.floor(8 * SR));
  for (let i = SR; i + win < end; i += win) {
    let movingPower = 0;
    let fixedPower = 0;
    for (let j = 0; j < win; j++) {
      movingPower += moving[i + j] * moving[i + j];
      fixedPower += fixed[i + j] * fixed[i + j];
    }
    const diff = Math.abs(P.linDb(Math.sqrt(movingPower / win)) - P.linDb(Math.sqrt(fixedPower / win)));
    if (diff > maxDiff) maxDiff = diff;
  }
  return maxDiff;
}

function muteSpan(buffer, start, end) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(buffer.length, Math.floor(end * SR));
  buffer.fill(0, i0, i1);
}

function windowPower(sub, mid, gs, gm, start, end) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(sub.length, Math.floor(end * SR));
  let acc = 0;
  const count = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) {
    const s = sub[i] * gs + mid[i] * gm;
    acc += s * s;
  }
  return acc / count;
}

function tameFinal(sub, mid, gs, gm) {
  const dropPower = windowPower(sub, mid, gs, gm, CUES.drop + 0.15, CUES.drop + 2.2);
  const finalPower = windowPower(sub, mid, gs, gm, CUES.final + 0.05, CUES.final + 1.9);
  const target = dropPower * P.dbLin(-1.2) * P.dbLin(-1.2);
  if (!(finalPower > target) || !(dropPower > 0)) return 1;
  const scale = Math.sqrt(target / finalPower);
  const i0 = Math.floor(CUES.final * SR);
  for (let i = i0; i < sub.length; i++) {
    sub[i] *= scale;
    mid[i] *= scale;
  }
  return scale;
}

function hatPingSide(hat) {
  const side = P.silence(hat.length);
  const step = Math.max(1, Math.floor((BEAT / 2) * SR));
  for (let i = 0; i < hat.length; i++) {
    const sign = Math.floor(i / step) % 2 === 0 ? 1 : -1;
    side[i] = hat[i] * sign;
  }
  return side;
}

function sum(into, src, gain) {
  if (!src || !(gain > 0)) return;
  for (let i = 0; i < into.length; i++) into[i] += src[i] * gain;
}

function busRms(samples, start, end) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(samples.length, Math.floor(end * SR));
  let acc = 0;
  const count = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) acc += samples[i] * samples[i];
  return Math.sqrt(acc / count);
}

function mixWide(parts, g) {
  const n = parts.pad.length;
  const mid = P.silence(n);
  const side = P.silence(n);
  sum(mid, parts.sub, g.sub);
  sum(mid, parts.bass, g.mid);
  sum(mid, parts.kick, g.kick);
  sum(mid, parts.clap, g.clap);
  sum(mid, parts.pad, g.pad);
  sum(side, parts.chorusSide, g.pad * 1.4);
  sum(mid, parts.pluck, g.pluck);
  sum(mid, parts.stab, g.stab);
  sum(mid, parts.hat, g.hat);
  sum(side, parts.hatSide, g.hat);
  sum(mid, parts.reverbMid, g.room);
  sum(side, parts.reverbSide, g.room * 1.4);
  sum(mid, parts.echoMid, g.echo);
  sum(side, parts.echoSide, g.echo * 1.35);
  const midR = busRms(mid, 5.5, 15.4);
  const sideR = busRms(side, 5.5, 15.4);
  const target = -14;
  let sideScale = sideR > 1e-8 ? (midR * P.dbLin(target)) / sideR : 0;
  if (sideScale > 8) sideScale = 8;
  if (sideScale < 0) sideScale = 0;
  const left = P.silence(n);
  const right = P.silence(n);
  for (let i = 0; i < n; i++) {
    const fade = masterFade(i / SR);
    left[i] = (mid[i] + side[i] * sideScale) * fade;
    right[i] = (mid[i] - side[i] * sideScale) * fade;
  }
  return { left, right, sideScale };
}

export async function renderLibBed() {
  const n = Math.round(SECONDS * SR);
  const hits = loadHits();
  const drums = placeDrums(n, hits);
  const tables = {
    ...padTables(n).tables,
    ...bassTables(n),
    ...pluckTables(n),
    ...stabTables(n),
    hat: Float32Array.from(drums.hat),
  };
  const [pad, padFixed, sub, mid, pluck, stab, hat, chorus, roomMid, roomSide, echoMid, echoSide] = await renderVoices(n, tables);
  const padMotionDb = motionDepth(pad, padFixed);
  muteSpan(sub, 0, 5.05);
  muteSpan(mid, 0, 5.05);
  muteSpan(sub, 15.75, 17.25);
  muteSpan(mid, 15.75, 17.25);
  muteSpan(drums.kick, 0, 5.05);
  muteSpan(hat, 0, 11.0);
  const g = { ...GAINS, clap: 0 };
  const bassScale = tameFinal(sub, mid, g.sub, g.mid);
  const kickPeak = P.samplePeak(drums.kick);
  const clapPeak = P.samplePeak(drums.clap);
  g.clap = kickPeak > 0 && clapPeak > 0 ? g.kick * (kickPeak / clapPeak) * P.dbLin(-14) : 0;
  const wide = mixWide(
    {
      pad,
      sub,
      bass: mid,
      kick: drums.kick,
      clap: drums.clap,
      hat,
      hatSide: hatPingSide(hat),
      pluck,
      stab,
      chorusSide: chorus,
      reverbMid: roomMid,
      reverbSide: roomSide,
      echoMid,
      echoSide,
    },
    g,
  );
  const glued = P.glueStereo(wide.left, wide.right, SR, -18, 2.4, 0.003, 0.045);
  const fitted = P.fitLoudness(glued.left, glued.right, SR, -15, -1.4);
  return {
    variant: "v8lib",
    name: "BED-MAGNETIC-MOVES-v8lib",
    sampleRate: SR,
    seconds: n / SR,
    left: fitted.left,
    right: fitted.right,
    lufsFit: fitted.lufs,
    truePeakFit: fitted.truePeakDb,
    fitGain: fitted.gain,
    glueReductionDb: glued.reductionDb,
    duckDb: 0,
    gains: g,
    bassScale,
    sideScale: wide.sideScale,
    patterned: true,
    wide: true,
    padMode: "lib",
    padMotionDb,
    library: {
      synthesis: "@elemaudio/core",
      renderer: "@elemaudio/offline-renderer",
      license: "MIT",
      samples: "scripts/foundry/cc0/manifest.json",
    },
    stems: {
      pad,
      sub,
      mid,
      kick: drums.kick,
      clap: drums.clap,
      hat,
      pluck,
      stab,
    },
  };
}

export { CUES, SECONDS, BPM };
