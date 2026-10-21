/**
 * BED-MAGNETIC-MOVES v4 — two mill beds, one cue map.
 * 22.87 s · 123 BPM · C minor · Cm–Fm–Ab–G.
 * Original voicings. No noise layers. No 808 glides.
 *
 * v4a clean/deep: sine kick, pure sine sub, steady pad.
 * v4b rich: the same low end, plus FM plucks, a warm stab,
 * a short filtered room, a filtered echo, and light bus glue.
 */

const fs = require("node:fs");
const path = require("node:path");
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

const DUCK_DB = P.DUCK_DB;

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

function bodyEnv(t) {
  const edge = 0.012;
  const first = sectionEnv(t, edge, CUES.drop, CUES.cut);
  const second = sectionEnv(t, edge, CUES.final, SECONDS);
  return Math.max(first, second);
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

function renderPad(n) {
  const pad = P.silence(n);
  const filter = makePadFilter();
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
    const sample = (a * chordSines(prev, t) + b * chordSines(curr, t)) * padLevel(t);
    pad[i] = filter.step(sample);
  }
  return pad;
}

function chordSines(notes, t) {
  const weights = [1, 0.7, 0.46, 0.28];
  let mix = 0;
  let norm = 0;
  for (let v = 0; v < notes.length; v++) {
    const w = weights[v] || 0.2;
    mix += w * Math.sin(2 * Math.PI * P.midiHz(notes[v]) * t);
    norm += w;
  }
  return mix / norm;
}

function makePadFilter() {
  const w0 = (2 * Math.PI * 1200) / SR;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * 0.707);
  const a0 = 1 + alpha;
  const c = {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  return {
    step(x) {
      const y = c.b0 * x + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
      x2 = x1;
      x1 = x;
      y2 = y1;
      y1 = y;
      return y;
    },
  };
}

function renderTone(n, levelFn, transpose) {
  const out = P.silence(n);
  const xfade = 0.03;
  const shift = transpose || 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const level = levelFn(t);
    if (level <= 0) continue;
    const boundary = Math.floor(t / SEG) * SEG;
    const into = t - boundary;
    const curr = P.midiHz(chordAt(t).root + shift);
    const prev = P.midiHz(chordAt(boundary - 0.001).root + shift);
    const usePrev = boundary > 0 && into < xfade;
    const a = usePrev ? Math.cos((into / xfade) * Math.PI * 0.5) : 0;
    const b = usePrev ? Math.sin((into / xfade) * Math.PI * 0.5) : 1;
    out[i] = (a * Math.sin(2 * Math.PI * prev * t) + b * Math.sin(2 * Math.PI * curr * t)) * level;
  }
  return out;
}

function place(dest, hit, when, gain) {
  for (let i = 0; i < when.length; i++) P.addAt(dest, hit, when[i] * SR, gain);
}

function renderDrums(n) {
  const kick = P.silence(n);
  const clap = P.silence(n);
  const hat = P.silence(n);
  const kickHit = P.renderKickClean(SR);
  const clapHit = P.renderClapTonal(SR);
  const hatClosed = P.renderHatFm(SR, false);
  const hatOpen = P.renderHatFm(SR, true);
  const kicks = times(CUES.drop, BEAT, SECONDS - 0.05, inBody);
  const claps = times(CUES.clap, BEAT * 2, SECONDS - 0.05, inBody);
  const hats = times(CUES.hats, BEAT / 2, SECONDS - 0.02, inBody);
  place(kick, kickHit, kicks, 1);
  place(clap, clapHit, claps, 1);
  for (let i = 0; i < hats.length; i++) {
    const open = hats[i] >= CUES.peak && hats[i] < CUES.cut && i % 4 === 2;
    P.addAt(hat, open ? hatOpen : hatClosed, hats[i] * SR, open ? 0.85 : 0.55);
  }
  return { kick, clap, hat, kicks, claps, hats };
}

function renderPlucks(n) {
  const bus = P.silence(n);
  const cache = new Map();
  const voice = (midi) => {
    if (!cache.has(midi)) cache.set(midi, P.renderFmPluck(SR, P.midiHz(midi)));
    return cache.get(midi);
  };
  const pattern = [0, 2, 1, 3];
  const steps = [0.5, 1.25, 2.5, 3.25];
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
      P.addAt(bus, voice(midi), t * SR, 0.9 * intro * peak);
    }
  }
  return bus;
}

function renderStabs(n) {
  const bus = P.silence(n);
  const cache = new Map();
  const voice = (name, notes) => {
    if (!cache.has(name)) cache.set(name, P.renderWarmStab(SR, notes));
    return cache.get(name);
  };
  const claps = times(CUES.clap, BEAT * 2, SECONDS - 0.05, inBody);
  const extra = times(CUES.peak, BEAT, CUES.cut, () => true);
  const when = claps.concat(extra.filter((t) => !claps.some((c) => Math.abs(c - t) < 0.02)));
  for (let i = 0; i < when.length; i++) {
    const chord = chordAt(when[i]);
    const peak = when[i] >= CUES.peak && when[i] < CUES.cut ? 1.1 : 0.92;
    P.addAt(bus, voice(chord.name, chord.pad), when[i] * SR, peak);
  }
  return bus;
}

function panHats(hat) {
  const left = P.silence(hat.length);
  const right = P.silence(hat.length);
  const step = Math.floor((BEAT / 2) * SR);
  for (let i = 0; i < hat.length; i++) {
    const which = Math.floor(i / step) % 2 === 0 ? -0.55 : 0.55;
    const l = Math.cos(((which + 1) * Math.PI) / 4);
    const r = Math.sin(((which + 1) * Math.PI) / 4);
    left[i] = hat[i] * l;
    right[i] = hat[i] * r;
  }
  return { left, right };
}

function widen(mono, amount) {
  const delayed = P.delaySamples(mono, SR, 0.008);
  const left = P.silence(mono.length);
  const right = P.silence(mono.length);
  for (let i = 0; i < mono.length; i++) {
    left[i] = mono[i];
    right[i] = mono[i] * (1 - amount) + delayed[i] * amount;
  }
  return { left, right };
}

function sum(into, src, gain) {
  for (let i = 0; i < into.length; i++) into[i] += src[i] * gain;
}

function renderBed(variant) {
  if (variant !== "v4a" && variant !== "v4b") {
    throw new Error(`unknown variant ${variant}`);
  }
  const rich = variant === "v4b";
  const n = Math.round(SECONDS * SR);
  const pad = renderPad(n);
  const duckTimes = times(CUES.drop, BEAT, SECONDS - 0.02, inBody);
  const duck = P.duckGain(n, SR, duckTimes, DUCK_DB, P.DUCK_ATTACK_SEC, P.DUCK_RELEASE_SEC);
  const sub = renderTone(n, bodyEnv, 0);
  const ducked = P.applyGain(sub, duck);
  const mid = rich ? renderTone(n, bodyEnv, 12) : P.silence(n);
  const midDucked = rich ? P.applyGain(mid, duck) : mid;
  const drums = renderDrums(n);
  const pluck = rich ? renderPlucks(n) : P.silence(n);
  const stab = rich ? renderStabs(n) : P.silence(n);
  const send = P.silence(n);
  if (rich) {
    sum(send, pluck, 0.55);
    sum(send, stab, 0.7);
  }
  const room = rich ? P.shortReverb(send, SR, 0.28, 3200) : P.silence(n);
  const echo = rich ? P.filteredDelay(pluck, SR, BEAT * 0.75, 0.22, 2400) : P.silence(n);

  const g = rich
    ? { pad: 0.14, sub: 0.4, mid: 0.16, kick: 0.62, clap: 0.2, hat: 0.055, pluck: 0.16, stab: 0.18, room: 0.11, echo: 0.08 }
    : { pad: 0.2, sub: 0.46, mid: 0, kick: 0.58, clap: 0.16, hat: 0.045, pluck: 0, stab: 0, room: 0, echo: 0 };

  const padW = widen(pad, 0.16);
  const hatW = panHats(drums.hat);
  const pluckW = widen(pluck, 0.22);
  const left = P.silence(n);
  const right = P.silence(n);
  sum(left, padW.left, g.pad);
  sum(right, padW.right, g.pad);
  sum(left, ducked, g.sub);
  sum(right, ducked, g.sub);
  sum(left, midDucked, g.mid);
  sum(right, midDucked, g.mid);
  sum(left, drums.kick, g.kick);
  sum(right, drums.kick, g.kick);
  sum(left, drums.clap, g.clap);
  sum(right, drums.clap, g.clap * 0.94);
  sum(left, hatW.left, g.hat);
  sum(right, hatW.right, g.hat);
  sum(left, pluckW.left, g.pluck);
  sum(right, pluckW.right, g.pluck);
  sum(left, stab, g.stab);
  sum(right, stab, g.stab * 0.96);
  const roomW = widen(room, 0.4);
  sum(left, roomW.left, g.room);
  sum(right, roomW.right, g.room);
  const echoW = widen(echo, 0.35);
  sum(left, echoW.left, g.echo);
  sum(right, echoW.right, g.echo);

  for (let i = 0; i < n; i++) {
    const f = masterFade(i / SR);
    left[i] *= f;
    right[i] *= f;
  }

  let glued = { left, right, reductionDb: 0 };
  if (rich) {
    glued = P.glueStereo(left, right, SR, -12, 1.5, 0.03, 0.18);
  }
  const fitted = P.fitLoudness(glued.left, glued.right, SR, -15, -1.4);

  return {
    variant,
    name: variant === "v4a" ? "BED-MAGNETIC-MOVES-v4a" : "BED-MAGNETIC-MOVES-v4b",
    sampleRate: SR,
    seconds: n / SR,
    left: fitted.left,
    right: fitted.right,
    lufsFit: fitted.lufs,
    truePeakFit: fitted.truePeakDb,
    glueReductionDb: glued.reductionDb,
    duckDb: DUCK_DB,
    stems: {
      pad,
      sub: ducked,
      mid: midDucked,
      kick: drums.kick,
      clap: drums.clap,
      hat: drums.hat,
      pluck,
      stab,
    },
  };
}

function stemReport(samples, windows) {
  const swings = {};
  for (const [name, span] of Object.entries(windows)) {
    swings[name] = P.envelopeSwingDb(samples, SR, span[0], span[1], 0.03);
  }
  const body = P.slice(samples, SR, 8.2, 8.2 + 16384 / SR);
  return {
    swings,
    flatness: P.spectralFlatness(body),
    hfDb: P.hfRmsDb(P.slice(samples, SR, 5.45, 15.4), SR, 2000),
    subPeakHz: P.peakHz(P.slice(samples, SR, 5.55, 7.55), SR, 30, 90),
  };
}

function measureBed(bed) {
  const padWindows = { body: [5.45, 15.4], chord: [8.1, 11.5], final: [17.55, 21.55] };
  const lowWindows = { body: [5.5, 7.65], across: [5.5, 15.4], final: [17.55, 19.4] };
  const pad = stemReport(bed.stems.pad, padWindows);
  const sub = stemReport(bed.stems.sub, lowWindows);
  const mid = bed.variant === "v4b" ? stemReport(bed.stems.mid, lowWindows) : null;
  const lufs = P.integratedLufs(bed.left, bed.right, bed.sampleRate);
  const truePeak = P.truePeakDb(bed.left, bed.right);
  const fails = [];
  if (Math.abs(bed.seconds - SECONDS) > 1e-6) fails.push("seconds");
  if (!(lufs <= -14 && lufs >= -16)) fails.push(`lufs ${lufs.toFixed(2)}`);
  if (!(truePeak <= -1)) fails.push(`truePeak ${truePeak.toFixed(2)}`);
  const swingOf = (report, key) => report.swings[key].swingDb;
  if (swingOf(pad, "chord") >= 6) fails.push("pad chord swing");
  if (swingOf(pad, "body") >= 6) fails.push("pad body swing");
  if (swingOf(pad, "final") >= 6) fails.push("pad final swing");
  if (swingOf(sub, "body") >= 6) fails.push("sub body swing");
  if (swingOf(sub, "across") >= 6) fails.push("sub across swing");
  if (swingOf(sub, "final") >= 6) fails.push("sub final swing");
  if (mid && swingOf(mid, "body") >= 6) fails.push("mid swing");
  if (pad.flatness >= 0.05) fails.push("pad flatness");
  if (sub.flatness >= 0.02) fails.push("sub flatness");
  if (P.rmsOf(bed.stems.sub, SR, 0, 5.05) > 1e-5) fails.push("sub before drop");
  if (P.rmsOf(bed.stems.sub, SR, 15.75, 17.2) > 1e-4) fails.push("sub during cut");
  if (P.rmsOf(bed.stems.kick, SR, 0, 5.05) > 1e-6) fails.push("kick before drop");
  if (P.rmsOf(bed.stems.hat, SR, 0, 11.0) > 1e-6) fails.push("hats early");
  const reasons = fails;
  return {
    name: bed.name,
    variant: bed.variant,
    seconds: bed.seconds,
    sampleRate: bed.sampleRate,
    bpm: BPM,
    key: "C minor",
    progression: "Cm-Fm-Ab-G",
    cues: CUES,
    duckDb: bed.duckDb,
    duckAttackSec: P.DUCK_ATTACK_SEC,
    duckReleaseSec: P.DUCK_RELEASE_SEC,
    lufs,
    truePeakDb: truePeak,
    glueReductionDb: bed.glueReductionDb,
    pad,
    sub,
    mid,
    kickHfDb: P.hfRmsDb(bed.stems.kick, SR, 2000),
    pass: reasons.length === 0,
    fails: reasons,
    wind: {
      cause: "v3 ducked the pad about 9 dB and the sub about 13 dB (measured near 18 dB) with a release across most of the beat, and the pad detuned plus a slow LFO, so the level kept swelling.",
      fix: "Pad pitches are exact and the lowpass is fixed. Sub duck is 4 dB and finished inside 50 ms. No noise layer and no 808 glide.",
    },
  };
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return "";
  return argv[i + 1];
}

function cli(argv) {
  const variant = argv[0];
  if (variant !== "v4a" && variant !== "v4b") {
    process.stderr.write("Usage: sound bed <v4a|v4b> --out wav [--mp3 file] [--metrics file]\n");
    return 1;
  }
  const bed = renderBed(variant);
  const metrics = measureBed(bed);
  const out = argValue(argv, "--out");
  const mp3 = argValue(argv, "--mp3");
  const metricsPath = argValue(argv, "--metrics");
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    P.writeWav(out, bed.left, bed.right, bed.sampleRate, fs);
  }
  if (mp3) {
    if (!out) {
      process.stderr.write("--mp3 needs --out wav\n");
      return 1;
    }
    const { spawnSync } = require("node:child_process");
    fs.mkdirSync(path.dirname(path.resolve(mp3)), { recursive: true });
    const encoded = spawnSync(
      "ffmpeg",
      ["-y", "-i", out, "-codec:a", "libmp3lame", "-b:a", "320k", mp3],
      { stdio: "pipe" },
    );
    if (encoded.status !== 0) {
      process.stderr.write(encoded.stderr ? encoded.stderr.toString() : "ffmpeg mp3 failed\n");
      return 1;
    }
  }
  if (metricsPath) {
    fs.mkdirSync(path.dirname(path.resolve(metricsPath)), { recursive: true });
    fs.writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`);
  }
  process.stdout.write(`${JSON.stringify({ name: metrics.name, pass: metrics.pass, lufs: metrics.lufs, truePeakDb: metrics.truePeakDb, fails: metrics.fails })}\n`);
  return metrics.pass ? 0 : 1;
}

module.exports = {
  SECONDS,
  BPM,
  BEAT,
  CUES,
  PROG,
  DUCK_DB,
  renderBed,
  measureBed,
  cli,
};
