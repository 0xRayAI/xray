/**
 * Elementary base timbre for the v9 pad.
 * The oscillator is a band-limited saw (MIT @elemaudio/core).
 * The chord, the weights, and the level envelope are the v7 pad.
 * Bass, plucks, and stabs stay in sound-pro.cjs.
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { el } = require("@elemaudio/core");
const OfflineRenderer = require("@elemaudio/offline-renderer").default;
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
  cut: 15.6,
  final: 17.37,
};

const BASS_ROOTS = [36, 29, 32, 31];
const BASS_VEL = [0.8, 1, 0.62, 0.9, 0.7, 0.95, 0.58, 0.84];

const PROG = [
  [60, 63, 67, 72],
  [60, 65, 68, 72],
  [60, 63, 68, 75],
  [59, 62, 67, 74],
];

const BASE = [1, 0.52, 0.16, 0.05];
const ALT = [0.92, 0.34, 0.28, 0.08];

function chordAt(t) {
  const i = Math.floor(t / SEG);
  return PROG[((i % 4) + 4) % 4];
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

function weightsAt(t, moving) {
  if (!moving) return BASE;
  const u = 0.35 - 0.35 * Math.cos(2 * Math.PI * 0.07 * t);
  return [
    BASE[0] * (1 - u) + ALT[0] * u,
    BASE[1] * (1 - u) + ALT[1] * u,
    BASE[2] * (1 - u) + ALT[2] * u,
    BASE[3] * (1 - u) + ALT[3] * u,
  ];
}

function filled(n, value) {
  const out = new Float32Array(n);
  out.fill(value);
  return out;
}

function buildTables(n, moving, prefix) {
  const tables = {};
  const freq = [];
  const amp = [];
  const prevFreq = [];
  const prevAmp = [];
  for (let v = 0; v < 4; v++) {
    freq.push(`${prefix}f${v}`);
    amp.push(`${prefix}a${v}`);
    prevFreq.push(`${prefix}pf${v}`);
    prevAmp.push(`${prefix}pa${v}`);
    tables[freq[v]] = filled(n, 440);
    tables[amp[v]] = filled(n, 0);
    tables[prevFreq[v]] = filled(n, 440);
    tables[prevAmp[v]] = filled(n, 0);
  }
  const xfade = 0.05;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const boundary = Math.floor(t / SEG) * SEG;
    const into = t - boundary;
    const curr = chordAt(t);
    const prev = chordAt(boundary - 0.001);
    const usePrev = boundary > 0 && into < xfade;
    const a = usePrev ? Math.cos((into / xfade) * Math.PI * 0.5) : 0;
    const b = usePrev ? Math.sin((into / xfade) * Math.PI * 0.5) : 1;
    const level = padLevel(t);
    const currW = weightsAt(t, moving);
    const prevW = weightsAt(Math.max(0, boundary - 0.001), moving);
    let currNorm = 0;
    let prevNorm = 0;
    for (let v = 0; v < 4; v++) {
      currNorm += currW[v];
      prevNorm += prevW[v];
    }
    for (let v = 0; v < 4; v++) {
      tables[freq[v]][i] = P.midiHz(curr[v]);
      tables[prevFreq[v]][i] = P.midiHz(prev[v]);
      tables[amp[v]][i] = (b * currW[v] / currNorm) * level;
      tables[prevAmp[v]][i] = (a * prevW[v] / prevNorm) * level;
    }
  }
  return { tables, freq, amp, prevFreq, prevAmp };
}

function sawBank(freqNames, ampNames, phase) {
  let mix = el.mul(0, el.cycle(440));
  for (let v = 0; v < freqNames.length; v++) {
    const osc = el.blepsaw(el.table({ path: freqNames[v] }, phase));
    mix = el.add(mix, el.mul(el.table({ path: ampNames[v] }, phase), osc));
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

function toFloat64(samples) {
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    if (!Number.isFinite(x)) throw new Error("Elementary pad produced a non-finite sample");
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

export async function renderLowSawPad(n, sampleRate) {
  if (sampleRate !== SR) throw new Error(`pad sample rate ${sampleRate}`);
  const moving = buildTables(n, true, "m");
  const fixed = buildTables(n, false, "x");
  const tables = { ...moving.tables, ...fixed.tables };
  const core = new OfflineRenderer();
  await core.initialize({
    numInputChannels: 0,
    numOutputChannels: 2,
    sampleRate: SR,
    blockSize: 128,
    virtualFileSystem: tables,
  });
  const phase = el.phasor(1 / SECONDS);
  const movingRaw = el.add(
    sawBank(moving.freq, moving.amp, phase),
    sawBank(moving.prevFreq, moving.prevAmp, phase),
  );
  const fixedRaw = el.add(
    sawBank(fixed.freq, fixed.amp, phase),
    sawBank(fixed.prevFreq, fixed.prevAmp, phase),
  );
  const outs = [new Float32Array(n), new Float32Array(n)];
  await core.render(padVoice(movingRaw, true), padVoice(fixedRaw, false));
  core.process([], outs);
  const pad = toFloat64(outs[0]);
  const padFixed = toFloat64(outs[1]);
  if (P.samplePeak(pad) <= 1e-8) throw new Error("Elementary pad rendered silence");
  return {
    pad,
    padFixed,
    motionDb: motionDepth(pad, padFixed),
    synthesis: "@elemaudio/core",
    license: "MIT",
  };
}

function bassInBody(t) {
  return (t >= CUES.drop && t < CUES.cut) || t >= CUES.final;
}

function bassRootAt(t) {
  const i = Math.floor(t / SEG);
  return BASS_ROOTS[((i % 4) + 4) % 4];
}

/** v8lib bass: lowpassed sine sub, and the same sine plus its 3rd and 5th through a falling lowpass. */
export async function renderLibBass(n, sampleRate) {
  if (sampleRate !== SR) throw new Error(`bass sample rate ${sampleRate}`);
  const bassA = filled(n, 0);
  const bassF = filled(n, P.midiHz(36));
  const bassC = filled(n, 140);
  const step = BEAT / 4;
  let placed = 0;
  for (let i = 0; ; i++) {
    const t = CUES.drop + i * step;
    if (t >= SECONDS - 0.05) break;
    if (!bassInBody(t) || i % 4 === 0) continue;
    const vel = BASS_VEL[placed % BASS_VEL.length];
    placed += 1;
    const hz = P.midiHz(bassRootAt(t));
    const i0 = Math.floor(t * SR);
    const count = Math.floor(0.09 * SR);
    for (let k = 0; k < count && i0 + k < n; k++) {
      const time = k / SR;
      const attack = time < 0.006 ? time / 0.006 : 1;
      bassA[i0 + k] = Math.exp(-time / 0.04) * attack * vel;
      bassF[i0 + k] = hz * Math.pow(0.97, time / 0.09);
      bassC[i0 + k] = 90 + (220 - 90) * Math.exp(-time / 0.03);
    }
  }
  const core = new OfflineRenderer();
  await core.initialize({
    numInputChannels: 0,
    numOutputChannels: 2,
    sampleRate: SR,
    blockSize: 128,
    virtualFileSystem: { bassA, bassF, bassC },
  });
  const phase = el.phasor(1 / SECONDS);
  const amp = el.table({ path: "bassA" }, phase);
  const freq = el.table({ path: "bassF" }, phase);
  const tone = el.add(
    el.cycle(freq),
    el.mul(0.34, el.cycle(el.mul(3, freq))),
    el.mul(0.16, el.cycle(el.mul(5, freq))),
  );
  const sub = el.mul(amp, el.lowpass(140, 0.7, el.cycle(freq)));
  const mid = el.mul(amp, el.lowpass(el.table({ path: "bassC" }, phase), 0.7, tone));
  const outs = [new Float32Array(n), new Float32Array(n)];
  await core.render(sub, mid);
  core.process([], outs);
  return { sub: toFloat64(outs[0]), mid: toFloat64(outs[1]) };
}
