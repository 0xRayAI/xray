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
 *
 * v7 keeps that bed and puts weight back in the low end.
 * The kick body settles near 44 Hz. Bass notes stay short and
 * move a few percent in pitch. The pad and the plucks sit darker
 * so the upper-mid does not eat the 30–120 Hz share.
 *
 * v9 keeps the v7 arrangement and the mill bass, plucks, and stabs.
 * The pad oscillator is the Elementary saw. The kick keeps the 44 Hz
 * body and takes its beater from the CC0 kick. Hats and clap are the
 * CC0 one-shots in cc0/manifest.json. loadBed("v9") is the entry.
 *
 * v7b is v7 with one substitution: the bass voice is the v8lib
 * Elementary bass, level-matched to v7. loadBed("v7b") is the entry.
 *
 * v7c keeps v7, including its bass. From 7.0 s it overlays the v8lib
 * Elementary sub and harmonic mid, split and phase-aligned so they
 * fuse with that bass. loadBed("v7c") is the entry.
 *
 * v7d is v7c with two voices replaced. Hats are the CC0 closed and open
 * samples, highpassed, with a little timing and velocity movement.
 * The pluck is a short filtered harmonic tone on the same notes and rhythm.
 * loadBed("v7d") is the entry.
 */

const fs = require("node:fs");
const path = require("node:path");
const P = require("./sound-pro.cjs");
const Rules = require("./sound-rules.cjs");
const Reference = require("./sound-reference.cjs");

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
  const low = motion === "low" || motion === "low-fixed";
  const moving = motion === true || motion === "low";
  const filter = low || moving ? null : makePadFilter();
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
    if (!low && !moving) {
      pad[i] = filter.step(sample);
      continue;
    }
    const cutoff = low
      ? 980 + (moving ? 40 * Math.sin(2 * Math.PI * 0.05 * t) : 0)
      : 1200 + 70 * Math.sin(2 * Math.PI * 0.05 * t);
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
  const low = motion === "low" || motion === "low-fixed";
  const base = low ? [1, 0.52, 0.16, 0.05] : [1, 0.7, 0.46, 0.28];
  let weights = base;
  if (motion === true || motion === "low") {
    const alt = low ? [0.92, 0.34, 0.28, 0.08] : [0.9, 0.42, 0.66, 0.34];
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

function renderDrums(n, snap, wide, full, hits) {
  const kick = P.silence(n);
  const clap = P.silence(n);
  const hat = P.silence(n);
  const kickHit = hits ? hits.kick : full ? P.renderKickFull(SR) : wide ? P.renderKickTicked(SR) : P.renderKickClean(SR);
  const clapHit = hits ? hits.clap : snap ? P.renderSnap(SR) : P.renderClapTonal(SR);
  const hatClosed = hits ? hits.hatClosed : wide ? P.renderHatSoft(SR, false) : P.renderHatFm(SR, false);
  const hatOpen = hits ? hits.hatOpen : wide ? P.renderHatSoft(SR, true) : P.renderHatFm(SR, true);
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

function renderPlucks(n, short, tone) {
  const bus = P.silence(n);
  const cache = new Map();
  const bright = tone === true;
  const dark = tone === "low";
  const voice = (midi) => {
    const key = `${short ? "s" : "l"}${bright ? "b" : ""}${dark ? "d" : ""}${tone === "filter" ? "f" : ""}${midi}`;
    if (!cache.has(key)) {
      const freq = P.midiHz(midi);
      cache.set(
        key,
        tone === "filter"
          ? P.renderFilterPluck(SR, freq)
          : short
            ? P.renderFmPluck(SR, freq, { decay: 0.045, dur: 0.14, moving: true, bright, dark })
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

function renderBassPattern(n, withMid, full) {
  const sub = P.silence(n);
  const mid = P.silence(n);
  const step = BEAT / 4;
  let placed = 0;
  const shape = full
    ? { dur: 0.09, decay: 0.04, midFloor: 70, midOpen: 90, midGain: 0.4, drift: true }
    : null;
  for (let i = 0; ; i++) {
    const t = CUES.drop + i * step;
    if (t >= SECONDS - 0.05) break;
    if (!inBody(t)) continue;
    if (i % 4 === 0) continue;
    const note = P.renderBassNote(SR, P.midiHz(chordAt(t).root), withMid, shape);
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
  if (variant === "v7") {
    const kick = 0.55;
    return {
      pad: 0.16, sub: 0.48, mid: 0.14, kick, clap: kick * P.dbLin(-14),
      hat: 0.48, pluck: 0.3, stab: 0.12, room: 0.06, echo: 0.07,
    };
  }
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
  v7: "BED-MAGNETIC-MOVES-v7",
  v7b: "BED-MAGNETIC-MOVES-v7b",
  v7c: "BED-MAGNETIC-MOVES-v7c",
  v7d: "BED-MAGNETIC-MOVES-v7d",
  v9: "BED-MAGNETIC-MOVES-v9",
};

function renderBed(variant) {
  if (!BED_NAMES[variant]) {
    throw new Error(`unknown variant ${variant}`);
  }
  if (variant === "v9") {
    throw new Error("BED-MAGNETIC-MOVES-v9 renders through loadBed");
  }
  if (variant === "v7b") {
    throw new Error("BED-MAGNETIC-MOVES-v7b renders through loadBed");
  }
  if (variant === "v7c") {
    throw new Error("BED-MAGNETIC-MOVES-v7c renders through loadBed");
  }
  if (variant === "v7d") {
    throw new Error("BED-MAGNETIC-MOVES-v7d renders through loadBed");
  }
  const v7 = variant === "v7";
  const v6 = variant === "v6" || v7;
  const rich = variant === "v4b" || variant === "v5b" || v6;
  const v5 = variant === "v5a" || variant === "v5b" || v6;
  const n = Math.round(SECONDS * SR);
  const pad = renderPad(n, v7 ? "low" : v6);
  const g = mixGains(variant);
  let sub;
  let mid;
  let bassScale = 1;
  let duckDb = DUCK_DB;
  if (v5) {
    const patterned = renderBassPattern(n, rich, v7);
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
  const drums = renderDrums(n, v5, v6, v7);
  const pluck = rich ? renderPlucks(n, v5, v7 ? "low" : v6) : P.silence(n);
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
    padMode: v7 ? "low" : v6 ? true : false,
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
  const mid = bed.variant === "v4b" || bed.variant === "v5b" || bed.variant === "v6" || bed.variant === "v7" || bed.variant === "v7b" || bed.variant === "v7c" || bed.variant === "v7d" || bed.variant === "v9"
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
  const rules = Rules.evaluateSoundRules(bed, { pad, padMotionDb: gaps.padMotionDb });
  const reference = Reference.evaluateReference(bed, {
    lufs,
    crestDb: gaps.bodyCrestDb,
    sideUnderMidDb: gaps.sideUnderMidDb,
    band2to4Db: gaps.band2to4Db,
    band4to8Db: gaps.band4to8After11Db,
  });
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
    rules,
    reference,
    earReady: rules.pass && reference.pass,
    ...(bed.sources ? { sources: bed.sources } : {}),
    ...(bed.bassMatch != null ? { bassMatch: bed.bassMatch } : {}),
    ...(bed.overlay ? { overlay: bed.overlay } : {}),
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
    padMotionDb: bed.padMotionDb != null
      ? round1(bed.padMotionDb)
      : bed.wide
        ? round1(padMotionDepthDb(bed.padMode))
        : null,
    kickHfDb: round1(P.hfRmsDb(bed.stems.kick, SR, 2000)),
    sideScale: round1(bed.sideScale || 0),
  };
}

/** How far the slow pad motion moves the level, against the fixed pad. */
function padMotionDepthDb(mode) {
  const n = Math.round(8 * SR);
  const moving = renderPad(n, mode === "low" ? "low" : true);
  const fixed = renderPad(n, mode === "low" ? "low-fixed" : false);
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

function readMonoWav(file) {
  const buf = fs.readFileSync(file);
  if (buf.toString("ascii", 0, 4) !== "RIFF") throw new Error(`not a wav: ${file}`);
  const channels = buf.readUInt16LE(22);
  const rate = buf.readUInt32LE(24);
  if (channels !== 1 || rate !== SR) throw new Error(`expected mono ${SR}: ${file}`);
  const count = Math.floor((buf.length - 44) / 2);
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) out[i] = buf.readInt16LE(44 + i * 2) / 32768;
  return out;
}

function cc0Hit(name) {
  return readMonoWav(path.join(__dirname, "cc0", name));
}

function shapeHit(raw, durSec, decaySec, highpassHz, holdSec) {
  const count = Math.min(raw.length, Math.floor(durSec * SR));
  const hold = holdSec || 0.001;
  const cut = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / SR;
    const attack = t < 0.0004 ? t / 0.0004 : 1;
    const rel = Math.max(0, t - hold);
    cut[i] = raw[i] * Math.exp(-rel / decaySec) * attack;
  }
  const high = P.applyBiquad(
    P.applyBiquad(cut, "highpass", highpassHz, 0.707, SR),
    "highpass",
    highpassHz,
    0.707,
    SR,
  );
  return P.normalizePeak(high, 1);
}

function kickWithCc0Beater() {
  const body = P.renderKickBody(SR);
  const beater = shapeHit(cc0Hit("kick.wav"), 0.02, 0.004, 1400, 0.005);
  const mixed = new Float64Array(body.length);
  const peak = P.samplePeak(beater);
  const gain = peak > 0 ? P.dbLin(-8) / peak : 0;
  for (let i = 0; i < mixed.length; i++) mixed[i] = body[i] + (beater[i] || 0) * gain;
  return P.normalizePeak(mixed, 1);
}

function v9Hits() {
  return {
    kick: kickWithCc0Beater(),
    clap: shapeHit(cc0Hit("clap.wav"), 0.038, 0.016, 280, 0.003),
    hatClosed: shapeHit(cc0Hit("hat-closed.wav"), 0.018, 0.007, 3200, 0.002),
    hatOpen: shapeHit(cc0Hit("hat-open.wav"), 0.042, 0.014, 2600, 0.003),
  };
}

function unitFrac(seed) {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

/** CC0 hat with its own decay. The highpass takes off the pitched body. */
function cc0HatVoice(file, highpassHz) {
  const raw = cc0Hit(file);
  const count = raw.length;
  const fadeN = Math.max(8, Math.floor(0.004 * SR));
  const out = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const t = i / SR;
    const attack = t < 0.0005 ? t / 0.0005 : 1;
    const tail = i > count - fadeN ? (count - i) / fadeN : 1;
    out[i] = raw[i] * attack * tail;
  }
  const high = P.applyBiquad(
    P.applyBiquad(out, "highpass", highpassHz, 0.707, SR),
    "highpass",
    highpassHz,
    0.707,
    SR,
  );
  return P.normalizePeak(high, 1);
}

function placeCc0Hats(n) {
  const closedHit = cc0HatVoice("hat-closed.wav", 4000);
  const openHit = cc0HatVoice("hat-open.wav", 3200);
  const closed = P.silence(n);
  const open = P.silence(n);
  const hats = times(CUES.hats, BEAT / 2, SECONDS - 0.02, inBody);
  for (let i = 0; i < hats.length; i++) {
    const isOpen = hats[i] >= CUES.peak && hats[i] < CUES.cut && i % 4 === 2;
    const base = isOpen ? 0.85 : 0.55;
    const grid = base * (0.75 + 0.25 * ((i % 4) / 3));
    const human = 0.9 + 0.2 * unitFrac(i * 12.9898);
    const jitter = (unitFrac(i * 78.233) * 2 - 1) * 0.0022;
    const when = Math.max(CUES.hats, hats[i] + jitter);
    P.addAt(isOpen ? open : closed, isOpen ? openHit : closedHit, when * SR, grid * human);
  }
  const hat = P.silence(n);
  sum(hat, closed, 1);
  sum(hat, open, 1);
  return { hat, closed, open };
}

function scaleBuf(src, gain) {
  const out = new Float64Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] * gain;
  return out;
}

function matchStem(next, ref, t0, t1) {
  const nextRms = rangeRms(next, t0, t1);
  const refRms = rangeRms(ref, t0, t1);
  let scale = nextRms > 1e-8 && refRms > 0 ? refRms / nextRms : 1;
  const nextPeak = rangePeak(next, t0, t1);
  const refPeak = rangePeak(ref, t0, t1);
  if (nextPeak > 1e-8 && refPeak > 0 && nextPeak * scale > refPeak * P.dbLin(6)) {
    scale = (refPeak * P.dbLin(6)) / nextPeak;
  }
  return scale;
}

async function renderV9() {
  const n = Math.round(SECONDS * SR);
  const elem = await import("./sound-elementary.mjs");
  const padPack = await elem.renderLowSawPad(n, SR);
  const pad = padPack.pad;
  const g = mixGains("v7");
  const patterned = renderBassPattern(n, true, true);
  const sub = patterned.sub;
  const mid = patterned.mid;
  const bassScale = tameFinal(sub, mid, g.sub, g.mid);
  const drums = renderDrums(n, true, true, true, v9Hits());
  const pluck = renderPlucks(n, true, "low");
  const stab = renderStabs(n, true);
  const send = P.silence(n);
  sum(send, pluck, 0.55);
  sum(send, stab, 0.7);
  const room = P.shortReverb(send, SR, 0.16, 3200);
  const wide = mixWide(
    { pad, sub, bass: mid, kick: drums.kick, clap: drums.clap, hat: drums.hat, pluck, stab, room },
    g,
  );
  for (let i = 0; i < n; i++) {
    const f = masterFade(i / SR);
    wide.left[i] *= f;
    wide.right[i] *= f;
  }
  const glued = P.glueStereo(wide.left, wide.right, SR, -12, 1.5, 0.03, 0.18);
  const fitted = P.fitLoudness(glued.left, glued.right, SR, -15, -1.4);
  return {
    variant: "v9",
    name: BED_NAMES.v9,
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
    padMode: "saw",
    padMotionDb: padPack.motionDb,
    sources: {
      pad: "v8lib-elementary-blepsaw",
      kickBeater: "v8lib-cc0-kick",
      kickBody: "mill",
      hat: "v8lib-cc0",
      clap: "v8lib-cc0",
      sub: "mill",
      mid: "mill",
      pluck: "mill",
      stab: "mill",
    },
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

function matchBass(refSub, refMid, sub, mid, gs, gm) {
  const ref = windowPower(refSub, refMid, gs, gm, 5.5, 15.4);
  const neu = windowPower(sub, mid, gs, gm, 5.5, 15.4);
  if (!(ref > 0) || !(neu > 0)) return 1;
  return Math.sqrt(ref / neu);
}

const OVERLAY_ENTRY = 7;
const OVERLAY_FADE = 0.072;
const OVERLAY_SPLIT = 100;
const OVERLAY_NOTE = 0.09;
const OVERLAY_LOW_DB = -12;
const OVERLAY_HIGH_DB = -9;

function eachBassNote(visit) {
  const step = BEAT / 4;
  let placed = 0;
  for (let i = 0; ; i++) {
    const t = CUES.drop + i * step;
    if (t >= SECONDS - 0.05) break;
    if (!inBody(t) || i % 4 === 0) continue;
    const vel = BASS_VEL[placed % BASS_VEL.length];
    placed += 1;
    visit({ t, hz: P.midiHz(chordAt(t).root), vel });
  }
}

function clearBeforeEntry(sub, mid) {
  const enter = Math.floor(OVERLAY_ENTRY * SR);
  eachBassNote((note) => {
    if (note.t >= OVERLAY_ENTRY) return;
    const i0 = Math.max(0, Math.floor(note.t * SR));
    const i1 = Math.min(sub.length, i0 + Math.ceil(0.1 * SR));
    sub.fill(0, i0, i1);
    mid.fill(0, i0, i1);
  });
  sub.fill(0, 0, enter);
  mid.fill(0, 0, enter);
}

function bestDelay(ref, src, i0, count, half) {
  let bestD = 0;
  let best = -Infinity;
  const score = (d) => {
    let dot = 0;
    for (let k = 0; k < count; k++) {
      const j = i0 + k - d;
      const s = j >= 0 && j < src.length ? src[j] : 0;
      dot += ref[i0 + k] * s;
    }
    if (dot > best) {
      best = dot;
      bestD = d;
    }
  };
  for (let d = -half; d <= half; d += 4) score(d);
  const coarse = bestD;
  for (let d = coarse - 4; d <= coarse + 4; d++) {
    if (d < -half || d > half) continue;
    score(d);
  }
  return bestD;
}

function noteCorrelation(ref, src, i0, count, delay) {
  let dot = 0;
  let a = 0;
  let b = 0;
  for (let k = 0; k < count; k++) {
    const j = i0 + k - delay;
    const s = j >= 0 && j < src.length ? src[j] : 0;
    const r = ref[i0 + k];
    dot += r * s;
    a += r * r;
    b += s * s;
  }
  const den = Math.sqrt(a * b);
  return den > 0 ? dot / den : 0;
}

/** Shift each Elementary note onto v7's sub. The same delay keeps the harmonic mid with it. */
function alignOverlayNotes(refSub, lowSrc, highSrc) {
  const low = P.silence(refSub.length);
  const high = P.silence(refSub.length);
  const count = Math.floor(OVERLAY_NOTE * SR);
  const notes = [];
  eachBassNote((note) => notes.push(note));
  let corrSum = 0;
  let corrN = 0;
  for (let n = 0; n < notes.length; n++) {
    const note = notes[n];
    if (note.t < OVERLAY_ENTRY) continue;
    const i0 = Math.floor(note.t * SR);
    if (i0 < 0 || i0 + count > refSub.length) continue;
    const half = Math.max(1, Math.floor(SR / (2 * note.hz)));
    const delay = bestDelay(refSub, lowSrc, i0, count, half);
    const corr = noteCorrelation(refSub, lowSrc, i0, count, delay);
    if (corr > 0) {
      corrSum += corr;
      corrN += 1;
    }
    const next = n + 1 < notes.length ? Math.floor(notes[n + 1].t * SR) : refSub.length;
    const span = Math.min(next - i0, Math.floor(0.11 * SR));
    for (let s = i0; s < i0 + span && s < lowSrc.length; s++) {
      const dest = s + delay;
      if (dest < 0 || dest >= low.length || dest >= next) continue;
      low[dest] += lowSrc[s];
      high[dest] += highSrc[s];
    }
  }
  return { low, high, alignCorrelation: corrN > 0 ? corrSum / corrN : 0, notesAligned: corrN };
}

function fadeInAt(buf, startSec, fadeSec) {
  const i0 = Math.max(0, Math.floor(startSec * SR));
  const i1 = Math.min(buf.length, Math.floor((startSec + fadeSec) * SR));
  buf.fill(0, 0, i0);
  for (let i = i0; i < i1; i++) {
    buf[i] *= P.smoothstep((i / SR - startSec) / fadeSec);
  }
}

function rangeRms(buf, t0, t1) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(buf.length, Math.floor(t1 * SR));
  let acc = 0;
  const n = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) acc += buf[i] * buf[i];
  return Math.sqrt(acc / n);
}

function rangePeak(buf, t0, t1) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(buf.length, Math.floor(t1 * SR));
  let peak = 0;
  for (let i = i0; i < i1; i++) {
    const a = Math.abs(buf[i]);
    if (a > peak) peak = a;
  }
  return peak;
}

function heardBass(sub, mid, gs, gm, i) {
  return sub[i] * gs + mid[i] * gm;
}

function heardRms(sub, mid, gs, gm, t0, t1) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(sub.length, Math.floor(t1 * SR));
  let acc = 0;
  const n = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) {
    const s = heardBass(sub, mid, gs, gm, i);
    acc += s * s;
  }
  return Math.sqrt(acc / n);
}

function heardPeak(sub, mid, gs, gm, t0, t1) {
  const i0 = Math.max(0, Math.floor(t0 * SR));
  const i1 = Math.min(sub.length, Math.floor(t1 * SR));
  let peak = 0;
  for (let i = i0; i < i1; i++) {
    const a = Math.abs(heardBass(sub, mid, gs, gm, i));
    if (a > peak) peak = a;
  }
  return peak;
}

/** Pull the final overlay down when the combined bass would pass the first drop. */
function fitOverlayFinal(sub, mid, low, high, gs, gm, lowScale, highScale) {
  const drop0 = Math.floor(5.4 * SR);
  const drop1 = Math.floor(7.4 * SR);
  const fin0 = Math.floor(17 * SR);
  const fin1 = Math.min(sub.length, Math.floor(19 * SR));
  let dropAcc = 0;
  let dropPeak = 0;
  for (let i = drop0; i < drop1; i++) {
    const s = heardBass(sub, mid, gs, gm, i) + low[i] * lowScale * gs + high[i] * highScale * gm;
    dropAcc += s * s;
    const a = Math.abs(s);
    if (a > dropPeak) dropPeak = a;
  }
  const dropRms = Math.sqrt(dropAcc / Math.max(1, drop1 - drop0));
  const target = dropRms * P.dbLin(0.15);
  const peakLimit = dropPeak * P.dbLin(0.7);
  let vv = 0;
  let oo = 0;
  let vo = 0;
  let peakScale = 1;
  const n = Math.max(1, fin1 - fin0);
  for (let i = fin0; i < fin1; i++) {
    const v = heardBass(sub, mid, gs, gm, i);
    const o = low[i] * lowScale * gs + high[i] * highScale * gm;
    vv += v * v;
    oo += o * o;
    vo += v * o;
    if (!(Math.abs(o) > 1e-12)) continue;
    const cap = Math.abs(v) > peakLimit ? Math.abs(v) : peakLimit;
    const sHi = (cap - v) / o;
    const sLo = (-cap - v) / o;
    const hi = Math.max(sHi, sLo);
    const lo = Math.min(sHi, sLo);
    const room = lo <= 0 && hi >= 0 ? Math.min(1, hi) : 0;
    if (room < peakScale) peakScale = room;
  }
  const targetPower = target * target * n;
  const c = vv - targetPower;
  let rmsScale = 1;
  if (oo > 1e-18 && oo + 2 * vo + c > 0) {
    const disc = vo * vo - oo * c;
    if (!(disc > 0)) rmsScale = 0;
    else {
      const root = Math.sqrt(disc);
      const hi = Math.max((-vo - root) / oo, (-vo + root) / oo);
      rmsScale = Math.max(0, Math.min(1, hi));
    }
  } else if (c > 0) rmsScale = 0;
  return Math.max(0, Math.min(1, rmsScale, peakScale));
}

async function renderV7b() {
  const v7 = renderBed("v7");
  const n = v7.stems.sub.length;
  const g = v7.gains;
  const elem = await import("./sound-elementary.mjs");
  const lib = await elem.renderLibBass(n, SR);
  const sub = lib.sub;
  const mid = lib.mid;
  const bassScale = tameFinal(sub, mid, g.sub, g.mid);
  const bassMatch = matchBass(v7.stems.sub, v7.stems.mid, sub, mid, g.sub, g.mid);
  for (let i = 0; i < n; i++) {
    sub[i] *= bassMatch;
    mid[i] *= bassMatch;
  }
  const send = P.silence(n);
  sum(send, v7.stems.pluck, 0.55);
  sum(send, v7.stems.stab, 0.7);
  const room = P.shortReverb(send, SR, 0.16, 3200);
  const wide = mixWide(
    {
      pad: v7.stems.pad,
      sub,
      bass: mid,
      kick: v7.stems.kick,
      clap: v7.stems.clap,
      hat: v7.stems.hat,
      pluck: v7.stems.pluck,
      stab: v7.stems.stab,
      room,
    },
    g,
  );
  for (let i = 0; i < n; i++) {
    const fade = masterFade(i / SR);
    wide.left[i] *= fade;
    wide.right[i] *= fade;
  }
  const glued = P.glueStereo(wide.left, wide.right, SR, -12, 1.5, 0.03, 0.18);
  const fitted = P.fitLoudness(glued.left, glued.right, SR, -15, -1.4);
  return {
    variant: "v7b",
    name: BED_NAMES.v7b,
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
    bassMatch,
    sideScale: wide.sideScale,
    patterned: true,
    wide: true,
    padMode: "low",
    sources: {
      sub: "v8lib-elementary",
      mid: "v8lib-elementary",
      pad: "v7",
      kick: "v7",
      clap: "v7",
      hat: "v7",
      pluck: "v7",
      stab: "v7",
    },
    stems: {
      pad: v7.stems.pad,
      sub,
      mid,
      kick: v7.stems.kick,
      clap: v7.stems.clap,
      hat: v7.stems.hat,
      pluck: v7.stems.pluck,
      stab: v7.stems.stab,
    },
  };
}

async function renderV7c(spec) {
  const swap = spec || {};
  const v7 = renderBed("v7");
  const n = v7.stems.sub.length;
  const hat = swap.hat || v7.stems.hat;
  const pluck = swap.pluck || v7.stems.pluck;
  const variant = swap.variant || "v7c";
  const g = v7.gains;
  const elem = await import("./sound-elementary.mjs");
  const lib = await elem.renderLibBass(n, SR);
  const bassScale = tameFinal(lib.sub, lib.mid, g.sub, g.mid);
  clearBeforeEntry(lib.sub, lib.mid);
  const lowSrc = P.applyBiquad(
    P.applyBiquad(lib.sub, "lowpass", OVERLAY_SPLIT, 0.707, SR),
    "lowpass",
    OVERLAY_SPLIT,
    0.707,
    SR,
  );
  const highSrc = P.applyBiquad(
    P.applyBiquad(lib.mid, "highpass", OVERLAY_SPLIT, 0.707, SR),
    "highpass",
    OVERLAY_SPLIT,
    0.707,
    SR,
  );
  const aligned = alignOverlayNotes(v7.stems.sub, lowSrc, highSrc);
  const low = aligned.low;
  const high = aligned.high;
  fadeInAt(low, OVERLAY_ENTRY, OVERLAY_FADE);
  fadeInAt(high, OVERLAY_ENTRY, OVERLAY_FADE);
  const cut0 = Math.floor(15.75 * SR);
  const cut1 = Math.floor(CUES.final * SR);
  low.fill(0, cut0, cut1);
  high.fill(0, cut0, cut1);
  const subR = rangeRms(v7.stems.sub, 7.05, 15.4);
  const lowR = rangeRms(low, 7.05, 15.4);
  const lowScale = lowR > 1e-8 ? (subR * P.dbLin(OVERLAY_LOW_DB)) / lowR : 0;
  const bassR = heardRms(v7.stems.sub, v7.stems.mid, g.sub, g.mid, 7.05, 15.4);
  const bassP = heardPeak(v7.stems.sub, v7.stems.mid, g.sub, g.mid, 7.05, 15.4);
  const highR = rangeRms(high, 7.05, 15.4);
  const highP = rangePeak(high, 7.05, 15.4);
  let highScale = 0;
  if (highR > 1e-8 && g.mid > 0 && highR > subR * P.dbLin(-40)) {
    const byRms = (bassR * P.dbLin(OVERLAY_HIGH_DB)) / (highR * g.mid);
    const byPeak = highP > 1e-8 ? (bassP * P.dbLin(OVERLAY_HIGH_DB)) / (highP * g.mid) : byRms;
    highScale = Math.min(byRms, byPeak);
  }
  const finalScale = fitOverlayFinal(
    v7.stems.sub,
    v7.stems.mid,
    low,
    high,
    g.sub,
    g.mid,
    lowScale,
    highScale,
  );
  const fin0 = Math.floor(CUES.final * SR);
  for (let i = fin0; i < n; i++) {
    low[i] *= finalScale;
    high[i] *= finalScale;
  }
  const sub = new Float64Array(v7.stems.sub);
  const mid = new Float64Array(v7.stems.mid);
  for (let i = 0; i < n; i++) {
    sub[i] += low[i] * lowScale;
    mid[i] += high[i] * highScale;
  }
  const send = P.silence(n);
  sum(send, pluck, 0.55);
  sum(send, v7.stems.stab, 0.7);
  const room = P.shortReverb(send, SR, 0.16, 3200);
  const wide = mixWide(
    {
      pad: v7.stems.pad,
      sub,
      bass: mid,
      kick: v7.stems.kick,
      clap: v7.stems.clap,
      hat,
      pluck,
      stab: v7.stems.stab,
      room,
    },
    g,
  );
  for (let i = 0; i < n; i++) {
    const fade = masterFade(i / SR);
    wide.left[i] *= fade;
    wide.right[i] *= fade;
  }
  const glued = P.glueStereo(wide.left, wide.right, SR, -12, 1.5, 0.03, 0.18);
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
    duckDb: 0,
    gains: g,
    bassScale,
    sideScale: wide.sideScale,
    patterned: true,
    wide: true,
    padMode: "low",
    overlay: {
      entrySec: OVERLAY_ENTRY,
      fadeSec: OVERLAY_FADE,
      splitHz: OVERLAY_SPLIT,
      lowAddDb: OVERLAY_LOW_DB,
      highAddDb: OVERLAY_HIGH_DB,
      lowScale,
      highScale,
      finalScale,
      alignCorrelation: aligned.alignCorrelation,
      notesAligned: aligned.notesAligned,
      layered: ["v8lib elementary sub", "v8lib elementary mid"],
    },
    ...(swap.voiceMatch ? { voiceMatch: swap.voiceMatch } : {}),
    sources: {
      sub: "v7",
      mid: "v7",
      pad: "v7",
      kick: "v7",
      clap: "v7",
      hat: swap.hatSource || "v7",
      pluck: swap.pluckSource || "v7",
      stab: "v7",
    },
    stems: {
      pad: v7.stems.pad,
      sub,
      mid,
      kick: v7.stems.kick,
      clap: v7.stems.clap,
      hat,
      pluck,
      stab: v7.stems.stab,
      ...(swap.hatClosed ? { hatClosed: swap.hatClosed, hatOpen: swap.hatOpen } : {}),
    },
  };
}

async function renderV7d() {
  const v7 = renderBed("v7");
  const n = v7.stems.pad.length;
  const hats = placeCc0Hats(n);
  const rawPluck = renderPlucks(n, true, "filter");
  const hatScale = matchStem(hats.hat, v7.stems.hat, CUES.hats, 15.4);
  const pluckScale = matchStem(rawPluck, v7.stems.pluck, CUES.air, 15.4);
  return renderV7c({
    variant: "v7d",
    hat: scaleBuf(hats.hat, hatScale),
    hatClosed: scaleBuf(hats.closed, hatScale),
    hatOpen: scaleBuf(hats.open, hatScale),
    pluck: scaleBuf(rawPluck, pluckScale),
    hatSource: "v8lib-cc0",
    pluckSource: "mill-filter-pluck",
    voiceMatch: { hatScale, pluckScale },
  });
}

async function loadBed(variant) {
  if (variant === "v9") return renderV9();
  if (variant === "v7b") return renderV7b();
  if (variant === "v7c") return renderV7c();
  if (variant === "v7d") return renderV7d();
  return renderBed(variant);
}

function argValue(argv, name) {
  const i = argv.indexOf(name);
  if (i < 0 || i + 1 >= argv.length) return "";
  return argv[i + 1];
}

async function cli(argv) {
  const variant = argv[0];
  if (!BED_NAMES[variant]) {
    process.stderr.write("Usage: sound bed <v4a|v4b|v5a|v5b|v6|v7|v7b|v7c|v7d|v9> --out wav [--mp3 file] [--metrics file]\n");
    return 1;
  }
  const bed = await loadBed(variant);
  const metrics = measureBed(bed);
  if (bed.wide) {
    const priorVariant = variant === "v7b" || variant === "v7c" || variant === "v7d" || variant === "v9" ? "v7" : variant === "v7" ? "v6" : "v5b";
    const prior = measureBed(await loadBed(priorVariant));
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
  loadBed,
  measureBed,
  levelTable,
  padMotionDepthDb,
  cli,
};
