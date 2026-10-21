/**
 * BED-MAGNETIC-MOVES v4 and v5 — mill beds, one cue map.
 * 22.87 s · 123 BPM · C minor · Cm–Fm–Ab–G.
 * Original voicings. No noise layers. No 808 glides.
 *
 * v4a clean/deep: sine kick, pure sine sub, steady pad.
 * v4b rich: the same low end, plus FM plucks, a warm stab,
 * a short filtered room, a filtered echo, and light bus glue.
 *
 * v5 keeps that arrangement and shortens what rang.
 * The clap is a harmonic snap 14 dB under the kick.
 * The bass is off-beat 16ths. v5b adds a filtered mid layer.
 * The final section is scaled so it is not louder than the first drop.
 *
 * v6 is v5b with the four gaps from the v4 review closed:
 * width on the musical voices, slow pad motion, a soft pitched
 * kick tick, and hats that reach the 4–8 kHz band.
 * Sub and kick stay mono below about 120 Hz.
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

function lpCoeffs(cutoff) {
  const w0 = (2 * Math.PI * cutoff) / SR;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * 0.707);
  const a0 = 1 + alpha;
  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  };
}

function renderPad(n, motion) {
  const pad = P.silence(n);
  const filter = motion ? null : makePadFilter();
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
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
    const sample = (a * chordSines(prev, t, motion) + b * chordSines(curr, t, motion)) * padLevel(t);
    if (!motion) {
      pad[i] = filter.step(sample);
      continue;
    }
    const cutoff = 1200 + 70 * Math.sin(2 * Math.PI * 0.05 * t);
    const c = lpCoeffs(cutoff);
    const y = c.b0 * sample + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = sample;
    y2 = y1;
    y1 = y;
    pad[i] = y;
  }
  return pad;
}

function chordSines(notes, t, motion) {
  const base = [1, 0.7, 0.46, 0.28];
  let weights = base;
  if (motion) {
    const alt = [0.9, 0.42, 0.66, 0.34];
    const u = 0.35 - 0.35 * Math.cos(2 * Math.PI * 0.07 * t);
    weights = [
      base[0] * (1 - u) + alt[0] * u,
      base[1] * (1 - u) + alt[1] * u,
      base[2] * (1 - u) + alt[2] * u,
      base[3] * (1 - u) + alt[3] * u,
    ];
  }
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

function renderDrums(n, snap, wide) {
  const kick = P.silence(n);
  const clap = P.silence(n);
  const hat = P.silence(n);
  const kickHit = wide ? P.renderKickTicked(SR) : P.renderKickClean(SR);
  const clapHit = snap ? P.renderSnap(SR) : P.renderClapTonal(SR);
  const hatClosed = wide ? P.renderHatSoft(SR, false) : P.renderHatFm(SR, false);
  const hatOpen = wide ? P.renderHatSoft(SR, true) : P.renderHatFm(SR, true);
  const kicks = times(CUES.drop, BEAT, SECONDS - 0.05, inBody);
  const claps = times(CUES.clap, BEAT * 2, SECONDS - 0.05, inBody);
  const hats = times(CUES.hats, BEAT / 2, SECONDS - 0.02, inBody);
  if (snap) {
    for (let i = 0; i < kicks.length; i++) {
      const vel = 0.86 + 0.14 * ((i % 5) / 4);
      P.addAt(kick, kickHit, kicks[i] * SR, vel);
    }
  } else {
    place(kick, kickHit, kicks, 1);
  }
  place(clap, clapHit, claps, 1);
  for (let i = 0; i < hats.length; i++) {
    const open = hats[i] >= CUES.peak && hats[i] < CUES.cut && i % 4 === 2;
    const base = open ? 0.85 : 0.55;
    const vel = snap ? base * (0.75 + 0.25 * ((i % 4) / 3)) : base;
    P.addAt(hat, open ? hatOpen : hatClosed, hats[i] * SR, vel);
  }
  return { kick, clap, hat, kicks, claps, hats };
}

function renderPlucks(n, short, bright) {
  const bus = P.silence(n);
  const cache = new Map();
  const voice = (midi) => {
    const key = `${short ? "s" : "l"}${bright ? "b" : ""}${midi}`;
    if (!cache.has(key)) {
      const freq = P.midiHz(midi);
      cache.set(
        key,
        short
          ? P.renderFmPluck(SR, freq, { decay: 0.045, dur: 0.14, moving: true, bright: Boolean(bright) })
          : P.renderFmPluck(SR, freq),
      );
    }
    return cache.get(key);
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
      const vel = short ? vels[s] : 1;
      P.addAt(bus, voice(midi), t * SR, 0.9 * intro * peak * vel);
    }
  }
  return bus;
}

function renderStabs(n, short) {
  const bus = P.silence(n);
  const cache = new Map();
  const voice = (name, notes) => {
    if (!cache.has(name)) {
      cache.set(
        name,
        short ? P.renderWarmStab(SR, notes, { dur: 0.08, decay: 0.028 }) : P.renderWarmStab(SR, notes),
      );
    }
    return cache.get(name);
  };
  const claps = times(CUES.clap, BEAT * 2, SECONDS - 0.05, inBody);
  const extra = times(CUES.peak, BEAT, CUES.cut, () => true);
  const when = claps.concat(extra.filter((t) => !claps.some((c) => Math.abs(c - t) < 0.02)));
  const vels = [0.78, 1, 0.7, 0.9];
  for (let i = 0; i < when.length; i++) {
    const chord = chordAt(when[i]);
    const peak = when[i] >= CUES.peak && when[i] < CUES.cut ? 1.1 : 0.92;
    const vel = short ? vels[i % vels.length] : 1;
    P.addAt(bus, voice(chord.name, chord.pad), when[i] * SR, peak * vel);
  }
  return bus;
}

const BASS_VEL = [0.8, 1, 0.62, 0.9, 0.7, 0.95, 0.58, 0.84];

function renderBassPattern(n, withMid) {
  const sub = P.silence(n);
  const mid = P.silence(n);
  const step = BEAT / 4;
  let placed = 0;
  for (let i = 0; ; i++) {
    const t = CUES.drop + i * step;
    if (t >= SECONDS - 0.05) break;
    if (!inBody(t)) continue;
    if (i % 4 === 0) continue;
    const note = P.renderBassNote(SR, P.midiHz(chordAt(t).root), withMid);
    const vel = BASS_VEL[placed % BASS_VEL.length];
    placed += 1;
    P.addAt(sub, note.sub, t * SR, vel);
    if (withMid) P.addAt(mid, note.mid, t * SR, vel);
  }
  return { sub, mid };
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

/** If the final section is hotter than the first drop, pull only that section down. */
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

function mixGains(variant) {
  if (variant === "v6") {
    const kick = 0.4;
    return {
      pad: 0.22, sub: 0.22, mid: 0.22, kick, clap: kick * P.dbLin(-14),
      hat: 0.42, pluck: 0.26, stab: 0.14, room: 0.09, echo: 0.1,
    };
  }
  const rich = variant === "v4b" || variant === "v5b";
  const v5 = variant === "v5a" || variant === "v5b";
  if (v5 && rich) {
    const kick = 0.4;
    return {
      pad: 0.24, sub: 0.22, mid: 0.22, kick, clap: kick * P.dbLin(-14),
      hat: 0.045, pluck: 0.11, stab: 0.12, room: 0.07, echo: 0.045,
    };
  }
  if (v5) {
    const kick = 0.38;
    return {
      pad: 0.34, sub: 0.32, mid: 0, kick, clap: kick * P.dbLin(-14),
      hat: 0.038, pluck: 0, stab: 0, room: 0, echo: 0,
    };
  }
  if (rich) {
    return {
      pad: 0.14, sub: 0.4, mid: 0.16, kick: 0.62, clap: 0.2,
      hat: 0.055, pluck: 0.16, stab: 0.18, room: 0.11, echo: 0.08,
    };
  }
  return {
    pad: 0.2, sub: 0.46, mid: 0, kick: 0.58, clap: 0.16,
    hat: 0.045, pluck: 0, stab: 0, room: 0, echo: 0,
  };
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

function highpassed(samples, freq) {
  return P.applyBiquad(P.applyBiquad(samples, "highpass", freq, 0.707, SR), "highpass", freq, 0.707, SR);
}

/** Same pitch, two delays, opposite sign. The dry signal stays in the mid. */
function unisonSide(mono, delayA, delayB) {
  const hp = highpassed(mono, 180);
  const a = P.delaySamples(hp, SR, delayA);
  const b = P.delaySamples(hp, SR, delayB);
  const side = P.silence(mono.length);
  for (let i = 0; i < mono.length; i++) side[i] = a[i] * 0.62 - b[i] * 0.38;
  return side;
}

/** Hats alternate sides. The mid bus still carries every hit. */
function hatPingSide(hat) {
  const hp = highpassed(hat, 300);
  const side = P.silence(hat.length);
  const step = Math.max(1, Math.floor((BEAT / 2) * SR));
  for (let i = 0; i < hat.length; i++) {
    const sign = Math.floor(i / step) % 2 === 0 ? 1 : -1;
    side[i] = hp[i] * sign;
  }
  return side;
}

/** Echo bounces left then right. mid is what a mono fold keeps. */
function pingPong(mono, timeSec, feedback, dampHz) {
  const d = Math.max(8, Math.floor(timeSec * SR));
  const bufL = new Float64Array(d);
  const bufR = new Float64Array(d);
  let iL = 0;
  let iR = 0;
  let lpL = 0;
  let lpR = 0;
  const damp = Math.exp((-2 * Math.PI * dampHz) / SR);
  const left = P.silence(mono.length);
  const right = P.silence(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const dL = bufL[iL];
    const dR = bufR[iR];
    lpL = (1 - damp) * dL + damp * lpL;
    lpR = (1 - damp) * dR + damp * lpR;
    left[i] = dL;
    right[i] = dR;
    bufL[iL] = mono[i] + lpR * feedback;
    bufR[iR] = lpL * feedback;
    iL = (iL + 1) % d;
    iR = (iR + 1) % d;
  }
  const mid = P.silence(mono.length);
  const side = P.silence(mono.length);
  for (let i = 0; i < mono.length; i++) {
    mid[i] = (left[i] + right[i]) * 0.5;
    side[i] = (left[i] - right[i]) * 0.5;
  }
  return { mid, side };
}

function busRms(samples, start, end) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(samples.length, Math.floor(end * SR));
  let acc = 0;
  const n = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) acc += samples[i] * samples[i];
  return Math.sqrt(acc / n);
}

/**
 * Center stays intact, so a mono sum is the mid bus.
 * Side is scaled on the drop to about 14 dB under that mid.
 */
function mixWide(parts, g) {
  const n = parts.pad.length;
  const mid = P.silence(n);
  const side = P.silence(n);
  sum(mid, parts.sub, g.sub);
  sum(mid, parts.bass, g.mid);
  sum(mid, parts.kick, g.kick);
  sum(mid, parts.clap, g.clap);
  sum(mid, parts.pad, g.pad);
  sum(side, unisonSide(parts.pad, 0.013, 0.019), g.pad * 0.95);
  sum(mid, parts.pluck, g.pluck);
  sum(side, unisonSide(parts.pluck, 0.007, 0.011), g.pluck * 0.9);
  sum(mid, parts.stab, g.stab);
  sum(side, unisonSide(parts.stab, 0.011, 0.017), g.stab * 0.85);
  sum(mid, parts.hat, g.hat);
  sum(side, hatPingSide(parts.hat), g.hat);
  sum(mid, parts.room, g.room);
  sum(side, unisonSide(parts.room, 0.023, 0.031), g.room);
  const pong = pingPong(parts.pluck, BEAT * 0.75, 0.12, 2400);
  sum(mid, pong.mid, g.echo);
  sum(side, pong.side, g.echo * 1.35);
  const sideHp = highpassed(side, 200);
  const midR = busRms(mid, 5.5, 15.4);
  const sideR = busRms(sideHp, 5.5, 15.4);
  const target = -14;
  let sideScale = sideR > 1e-8 ? (midR * P.dbLin(target)) / sideR : 0;
  if (sideScale > 6) sideScale = 6;
  if (sideScale < 0) sideScale = 0;
  const left = P.silence(n);
  const right = P.silence(n);
  for (let i = 0; i < n; i++) {
    left[i] = mid[i] + sideHp[i] * sideScale;
    right[i] = mid[i] - sideHp[i] * sideScale;
  }
  return { left, right, sideScale };
}

function mixNarrow(parts, g) {
  const n = parts.pad.length;
  const padW = widen(parts.pad, 0.16);
  const hatW = panHats(parts.hat);
  const pluckW = widen(parts.pluck, 0.22);
  const left = P.silence(n);
  const right = P.silence(n);
  sum(left, padW.left, g.pad);
  sum(right, padW.right, g.pad);
  sum(left, parts.sub, g.sub);
  sum(right, parts.sub, g.sub);
  sum(left, parts.mid, g.mid);
  sum(right, parts.mid, g.mid);
  sum(left, parts.kick, g.kick);
  sum(right, parts.kick, g.kick);
  sum(left, parts.clap, g.clap);
  sum(right, parts.clap, g.clap * 0.94);
  sum(left, hatW.left, g.hat);
  sum(right, hatW.right, g.hat);
  sum(left, pluckW.left, g.pluck);
  sum(right, pluckW.right, g.pluck);
  sum(left, parts.stab, g.stab);
  sum(right, parts.stab, g.stab * 0.96);
  const roomW = widen(parts.room, 0.4);
  sum(left, roomW.left, g.room);
  sum(right, roomW.right, g.room);
  const echoW = widen(parts.echo, 0.35);
  sum(left, echoW.left, g.echo);
  sum(right, echoW.right, g.echo);
  return { left, right };
}

function sum(into, src, gain) {
  for (let i = 0; i < into.length; i++) into[i] += src[i] * gain;
}

const BED_NAMES = {
  v4a: "BED-MAGNETIC-MOVES-v4a",
  v4b: "BED-MAGNETIC-MOVES-v4b",
  v5a: "BED-MAGNETIC-MOVES-v5a",
  v5b: "BED-MAGNETIC-MOVES-v5b",
  v6: "BED-MAGNETIC-MOVES-v6",
};

function renderBed(variant) {
  if (!BED_NAMES[variant]) {
    throw new Error(`unknown variant ${variant}`);
  }
  const v6 = variant === "v6";
  const rich = variant === "v4b" || variant === "v5b" || v6;
  const v5 = variant === "v5a" || variant === "v5b" || v6;
  const n = Math.round(SECONDS * SR);
  const pad = renderPad(n, v6);
  const g = mixGains(variant);
  let sub;
  let mid;
  let bassScale = 1;
  let duckDb = DUCK_DB;
  if (v5) {
    const patterned = renderBassPattern(n, rich);
    sub = patterned.sub;
    mid = patterned.mid;
    bassScale = tameFinal(sub, mid, g.sub, g.mid);
    duckDb = 0;
  } else {
    const duckTimes = times(CUES.drop, BEAT, SECONDS - 0.02, inBody);
    const duck = P.duckGain(n, SR, duckTimes, DUCK_DB, P.DUCK_ATTACK_SEC, P.DUCK_RELEASE_SEC);
    sub = P.applyGain(renderTone(n, bodyEnv, 0), duck);
    mid = rich ? P.applyGain(renderTone(n, bodyEnv, 12), duck) : P.silence(n);
  }
  const drums = renderDrums(n, v5, v6);
  const pluck = rich ? renderPlucks(n, v5, v6) : P.silence(n);
  const stab = rich ? renderStabs(n, v5) : P.silence(n);
  const send = P.silence(n);
  if (rich) {
    sum(send, pluck, 0.55);
    sum(send, stab, 0.7);
  }
  const room = rich ? P.shortReverb(send, SR, v5 ? 0.16 : 0.28, 3200) : P.silence(n);
  const echo = rich && !v6 ? P.filteredDelay(pluck, SR, BEAT * 0.75, v5 ? 0.12 : 0.22, 2400) : P.silence(n);

  let sideScale = 0;
  let left;
  let right;
  if (v6) {
    const wide = mixWide(
      { pad, sub, bass: mid, kick: drums.kick, clap: drums.clap, hat: drums.hat, pluck, stab, room },
      g,
    );
    left = wide.left;
    right = wide.right;
    sideScale = wide.sideScale;
  } else {
    const narrow = mixNarrow({ pad, sub, mid, kick: drums.kick, clap: drums.clap, hat: drums.hat, pluck, stab, room, echo }, g);
    left = narrow.left;
    right = narrow.right;
  }

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
    name: BED_NAMES[variant],
    sampleRate: SR,
    seconds: n / SR,
    left: fitted.left,
    right: fitted.right,
    lufsFit: fitted.lufs,
    truePeakFit: fitted.truePeakDb,
    fitGain: fitted.gain,
    glueReductionDb: glued.reductionDb,
    duckDb,
    gains: g,
    bassScale,
    sideScale,
    patterned: v5,
    wide: v6,
    stems: {
      pad,
      sub,
      mid,
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

function gainedRms(bed, names, start, end) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(bed.stems.pad.length, Math.floor(end * SR));
  let acc = 0;
  const count = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) {
    let s = 0;
    for (let k = 0; k < names.length; k++) s += bed.stems[names[k]][i] * bed.gains[names[k]];
    acc += s * s;
  }
  return Math.sqrt(acc / count) * bed.fitGain;
}

function gainedPeak(bed, names, start, end) {
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(bed.stems.pad.length, Math.floor(end * SR));
  let peak = 0;
  for (let i = i0; i < i1; i++) {
    let s = 0;
    for (let k = 0; k < names.length; k++) s += bed.stems[names[k]][i] * bed.gains[names[k]];
    const a = Math.abs(s);
    if (a > peak) peak = a;
  }
  return peak * bed.fitGain;
}

function quietShare(samples, startSec, endSec, winSec, belowDb) {
  const win = Math.max(8, Math.floor(winSec * SR));
  const hop = Math.max(1, Math.floor(win / 2));
  const i0 = Math.max(0, Math.floor(startSec * SR));
  const i1 = Math.min(samples.length, Math.floor(endSec * SR));
  let max = 0;
  const values = [];
  for (let i = i0; i + win <= i1; i += hop) {
    let acc = 0;
    for (let j = 0; j < win; j++) acc += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(acc / win);
    values.push(rms);
    if (rms > max) max = rms;
  }
  if (!values.length || max <= 0) return 1;
  const floor = max * P.dbLin(belowDb);
  let quiet = 0;
  for (let i = 0; i < values.length; i++) if (values[i] < floor) quiet += 1;
  return quiet / values.length;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function levelTable(bed) {
  const spans = [
    ["7-9", 7, 9],
    ["17-19", 17, 19],
    ["5.4-7.4", 5.4, 7.4],
  ];
  const voices = ["pad", "sub", "mid", "kick", "clap", "hat", "pluck", "stab"];
  const table = {};
  for (let s = 0; s < spans.length; s++) {
    const row = {};
    for (let v = 0; v < voices.length; v++) {
      row[voices[v]] = round1(P.linDb(gainedRms(bed, [voices[v]], spans[s][1], spans[s][2])));
    }
    row.bass = round1(P.linDb(gainedRms(bed, ["sub", "mid"], spans[s][1], spans[s][2])));
    row.bassPeak = round1(P.linDb(gainedPeak(bed, ["sub", "mid"], spans[s][1], spans[s][2])));
    table[spans[s][0]] = row;
  }
  const kickPeak = P.samplePeak(bed.stems.kick) * bed.gains.kick;
  const clapPeak = P.samplePeak(bed.stems.clap) * bed.gains.clap;
  table.clapUnderKickDb = round1(P.linDb(kickPeak) - P.linDb(clapPeak));
  return table;
}

function deltaLevels(next, prev) {
  const out = {};
  const spans = ["7-9", "17-19", "5.4-7.4"];
  for (let s = 0; s < spans.length; s++) {
    const span = spans[s];
    out[span] = {};
    const keys = Object.keys(next[span]);
    for (let k = 0; k < keys.length; k++) {
      out[span][keys[k]] = round1(next[span][keys[k]] - prev[span][keys[k]]);
    }
  }
  out.clapUnderKickDb = round1(next.clapUnderKickDb - prev.clapUnderKickDb);
  return out;
}

function measureBed(bed) {
  const padWindows = { body: [5.45, 15.4], chord: [8.1, 11.5], final: [17.55, 21.55] };
  const lowWindows = { body: [5.5, 7.65], across: [5.5, 15.4], final: [17.55, 19.4] };
  const pad = stemReport(bed.stems.pad, padWindows);
  const sub = stemReport(bed.stems.sub, lowWindows);
  const mid = bed.variant === "v4b" || bed.variant === "v5b" || bed.variant === "v6"
    ? stemReport(bed.stems.mid, lowWindows)
    : null;
  const lufs = P.integratedLufs(bed.left, bed.right, bed.sampleRate);
  const truePeak = P.truePeakDb(bed.left, bed.right);
  const levels = levelTable(bed);
  const bassQuietShare = bed.patterned ? quietShare(bed.stems.sub, 17.5, 20.5, 0.02, -12) : null;
  const fails = [];
  if (Math.abs(bed.seconds - SECONDS) > 1e-6) fails.push("seconds");
  if (!(lufs <= -14 && lufs >= -16)) fails.push(`lufs ${lufs.toFixed(2)}`);
  if (!(truePeak <= -1)) fails.push(`truePeak ${truePeak.toFixed(2)}`);
  const swingOf = (report, key) => report.swings[key].swingDb;
  if (swingOf(pad, "chord") >= 6) fails.push("pad chord swing");
  if (swingOf(pad, "body") >= 6) fails.push("pad body swing");
  if (swingOf(pad, "final") >= 6) fails.push("pad final swing");
  if (!bed.patterned) {
    if (swingOf(sub, "body") >= 6) fails.push("sub body swing");
    if (swingOf(sub, "across") >= 6) fails.push("sub across swing");
    if (swingOf(sub, "final") >= 6) fails.push("sub final swing");
    if (mid && swingOf(mid, "body") >= 6) fails.push("mid swing");
    if (sub.flatness >= 0.02) fails.push("sub flatness");
  }
  if (pad.flatness >= 0.05) fails.push("pad flatness");
  if (P.rmsOf(bed.stems.sub, SR, 0, 5.05) > 1e-5) fails.push("sub before drop");
  if (P.rmsOf(bed.stems.sub, SR, 15.75, 17.2) > 1e-4) fails.push("sub during cut");
  if (P.rmsOf(bed.stems.kick, SR, 0, 5.05) > 1e-6) fails.push("kick before drop");
  if (P.rmsOf(bed.stems.hat, SR, 0, 11.0) > 1e-6) fails.push("hats early");
  if (bed.patterned) {
    const dropBass = levels["5.4-7.4"].bass;
    const finalBass = levels["17-19"].bass;
    const dropPeak = levels["5.4-7.4"].bassPeak;
    const finalPeak = levels["17-19"].bassPeak;
    if (finalBass > dropBass + 0.4) fails.push(`bass final louder ${finalBass} > ${dropBass}`);
    if (finalPeak > dropPeak + 1) fails.push(`bass final peak ${finalPeak} > ${dropPeak}`);
    if (bassQuietShare < 0.3) fails.push(`bass drone ${bassQuietShare.toFixed(2)}`);
    if (levels.clapUnderKickDb < 8) fails.push(`clap under kick ${levels.clapUnderKickDb}`);
  }
  const gaps = gapReport(bed, pad);
  if (bed.wide) {
    if (!(gaps.sideUnderMidDb <= -8 && gaps.sideUnderMidDb >= -20)) {
      fails.push(`width ${gaps.sideUnderMidDb}`);
    }
    if (gaps.lowSideUnderMidDb > -24) fails.push(`low side ${gaps.lowSideUnderMidDb}`);
    if (gaps.band4to8After11Db < -47 || gaps.band4to8After11Db > -27) {
      fails.push(`hats ${gaps.band4to8After11Db}`);
    }
    if (gaps.band2to4Db < -38 || gaps.band2to4Db > -24) fails.push(`presence ${gaps.band2to4Db}`);
    if (gaps.padMotionDb > 1.5) fails.push(`pad motion ${gaps.padMotionDb}`);
    if (gaps.kickHfDb < -55) fails.push(`kick tick ${gaps.kickHfDb}`);
    if (levels.clapUnderKickDb < 12) fails.push(`clap under kick ${levels.clapUnderKickDb}`);
  }
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
    bassScale: bed.bassScale,
    bassQuietShare,
    levels,
    pad,
    sub,
    mid,
    kickHfDb: P.hfRmsDb(bed.stems.kick, SR, 2000),
    gaps,
    pass: reasons.length === 0,
    fails: reasons,
    wind: {
      cause: "v3 ducked the pad about 9 dB and the sub about 13 dB (measured near 18 dB) with a release across most of the beat, and the pad detuned plus a slow LFO, so the level kept swelling.",
      fix: "Pad pitches are exact and the lowpass is fixed. Sub duck is 4 dB and finished inside 50 ms. No noise layer and no 808 glide.",
    },
    v5: bed.patterned
      ? {
          cowbell:
            "The voice at 7.7 s is the v4 clap. Partials at 327, 690, 1240 and 410 Hz are not a harmonic series, and the hit lasts 110 ms, so it reads as a cowbell in front of the kick.",
          hum:
            "At 17.37 s the v4 bass is a continuous sine. v4b also brings back a continuous octave sine. Both return at full level on C2 after the cut, so the pure tone reads as a hum.",
          fix:
            "v5 uses a 40 ms harmonic snap, lowpassed at 700 Hz, peaked 14 dB under the kick. The bass is off-beat 16ths with a 22 ms decay. v5b adds an odd-harmonic mid through a filter falling from about 600 Hz to 180 Hz. The final section is scaled to sit about 1.2 dB under the first drop when it would be louder.",
        }
      : null,
  };
}

function gapReport(bed, pad) {
  const bodyL = P.slice(bed.left, SR, 5.45, 15.4);
  const bodyR = P.slice(bed.right, SR, 5.45, 15.4);
  let peak = 0;
  let acc = 0;
  for (let i = 0; i < bodyL.length; i++) {
    const a = Math.abs(bodyL[i]);
    const b = Math.abs(bodyR[i]);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
    acc += bodyL[i] * bodyL[i] + bodyR[i] * bodyR[i];
  }
  const rms = Math.sqrt(acc / Math.max(1, bodyL.length * 2));
  const lowL = P.applyBiquad(P.slice(bed.left, SR, 5.5, 15.4), "lowpass", 120, 0.707, SR);
  const lowR = P.applyBiquad(P.slice(bed.right, SR, 5.5, 15.4), "lowpass", 120, 0.707, SR);
  return {
    sideUnderMidDb: round1(P.sideUnderMidDb(bed.left, bed.right, SR, 5.5, 15.4)),
    lowSideUnderMidDb: round1(P.sideUnderMidDb(lowL, lowR, SR, 0, lowL.length / SR)),
    band2to4Db: round1(P.bandRmsDb(bed.left, bed.right, SR, 5.5, 15.4, 2000, 4000)),
    band4to8After11Db: round1(P.bandRmsDb(bed.left, bed.right, SR, 11.05, 15.4, 4000, 8000)),
    band4to8From11Db: round1(P.bandRmsDb(bed.left, bed.right, SR, 11.05, 21.6, 4000, 8000)),
    bodyLufs: round1(P.integratedLufs(bodyL, bodyR, SR)),
    bodyCrestDb: round1(P.linDb(peak) - P.linDb(rms)),
    padChordSwingDb: round1(pad.swings.chord.swingDb),
    padBodySwingDb: round1(pad.swings.body.swingDb),
    padMotionDb: bed.wide ? round1(padMotionDepthDb()) : null,
    kickHfDb: round1(P.hfRmsDb(bed.stems.kick, SR, 2000)),
    sideScale: round1(bed.sideScale || 0),
  };
}

/** How far the slow pad motion moves the level, against the fixed pad. */
function padMotionDepthDb() {
  const n = Math.round(8 * SR);
  const moving = renderPad(n, true);
  const fixed = renderPad(n, false);
  const win = Math.floor(0.25 * SR);
  let maxDiff = 0;
  for (let i = SR; i + win < n; i += win) {
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

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return "";
  return argv[i + 1];
}

function cli(argv) {
  const variant = argv[0];
  if (!BED_NAMES[variant]) {
    process.stderr.write("Usage: sound bed <v4a|v4b|v5a|v5b|v6> --out wav [--mp3 file] [--metrics file]\n");
    return 1;
  }
  const bed = renderBed(variant);
  const metrics = measureBed(bed);
  if (bed.wide) {
    const prior = measureBed(renderBed("v5b"));
    metrics.compare = {
      against: prior.name,
      before: prior.gaps,
      after: metrics.gaps,
      levelsBefore: prior.levels,
      levelsAfter: metrics.levels,
    };
  } else if (bed.patterned) {
    const priorVariant = variant === "v5a" ? "v4a" : "v4b";
    const prior = measureBed(renderBed(priorVariant));
    metrics.compare = {
      against: prior.name,
      v4: prior.levels,
      v5: metrics.levels,
      deltaDb: deltaLevels(metrics.levels, prior.levels),
    };
  }
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
  levelTable,
  padMotionDepthDb,
  cli,
};
