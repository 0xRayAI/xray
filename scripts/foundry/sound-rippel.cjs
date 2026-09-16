/**
 * Sound mill renderer — Rippel prototype as lineage, crystal-clear modern mix as the bar.
 *
 * SSOT (htafolla/rippel-synapse-flow@e5014cd):
 *   professionalTechnoInstruments.ts
 *   professionalPhonkInstruments.ts
 *   professionalJazzInstruments.ts  (synthetic drums / sax fallback)
 *   professionalAmbientInstruments.ts (pad / keys envelopes)
 *   ProfessionalOrchestrator.ts (intro → body → outro)
 *   globalAudioManager.ts ProfessionalMixer
 *   getGenreConfig.ts / checksumService.ts (tempo tables)
 *
 * Tone.Offline is blocked in Node (no OfflineAudioContext). This is a lean headless
 * port of those chains, then mixed like a mill — not the Lovable volume-hack soup,
 * not the #62 three-sine bed.
 *
 * 4.44s is a Short, not a loop tile: hook → turn → tag on the motion grid.
 */

const TONE_OFFLINE_BLOCKER =
  "Tone.Offline blocked in Node: Missing the native OfflineAudioContext constructor. Lean Node port of MembraneSynth / MetalSynth / mixer topology.";

const ENGINE = "rippel-headless";
const MIX = "crystal";
const TOPOLOGY = "membrane+metal+mixer";
const SSOT = {
  repo: "htafolla/rippel-synapse-flow",
  commit: "e5014cd46fbe5f132391333d8296f4416896dbee",
};

/** Desktop (not mobile) construction numbers from the prototype. */
const RIPPEL = {
  technoKick: {
    pitchDecay: 0.08,
    octaves: 10,
    attack: 0.005,
    decay: 0.5,
    release: 0.8,
    eq: { low: 6, mid: -2, high: -8 },
    dist: 0.2,
    comp: { thresholdDb: -20, ratio: 10 },
    volDb: -6,
    noteHz: 65.406, // C2 — generate-sequence kick
  },
  technoSnare: {
    pitchDecay: 0.05,
    octaves: 10,
    attack: 0.005,
    decay: 0.1,
    release: 0.1,
    bandpass: 4000,
    dist: 0.8,
    comp: { thresholdDb: -24, ratio: 6 },
    volDb: -8,
  },
  technoHat: {
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
    attack: 0.001,
    decay: 0.05,
    release: 0.02,
    hp: 12000,
    comp: { thresholdDb: -30, ratio: 4 },
    volDb: -8,
  },
  technoBass: {
    harmonicity: 1.005,
    vibratoAmount: 0.1,
    vibratoRate: 2,
    attack: 0.01,
    decay: 0.25,
    sustain: 0.4,
    release: 1.2,
    lp: 250,
    dist: 0.4,
    eq: { low: 3, mid: -2, high: -6 },
    comp: { thresholdDb: -24, ratio: 8 },
    volDb: -8,
  },
  phonk808: {
    pitchDecay: 0.12,
    octaves: 16,
    attack: 0.001,
    decay: 1.2,
    release: 2.0,
    dist: 0.15,
    eq: { low: 2, mid: -2, high: -8 },
    hp: 30,
    lp: 8000,
    comp: { thresholdDb: -10, ratio: 4, attack: 0.003, release: 0.12 },
    volDb: -3,
    noteHz: 32.703, // C1
  },
  phonkCowbell: {
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
    attack: 0.001,
    decay: 0.15,
    release: 0.3,
    dist: 0.15,
    eq: { high: 2, mid: 2, low: -10 },
    lp: 8000,
    volDb: -12,
  },
  phonkReese: {
    attack: 0.01,
    decay: 0.6,
    sustain: 0.8,
    release: 1.2,
    dist: 0.2,
    lp: 200,
    lpQ: 1.5,
    eq: { high: -8, mid: -2, low: 2 },
    volDb: -6,
  },
  jazzKick: {
    pitchDecay: 0.03,
    octaves: 6,
    attack: 0.001,
    decay: 0.2,
    release: 0.8,
    volDb: -7,
  },
  jazzRide: {
    harmonicity: 3.1,
    modulationIndex: 16,
    resonance: 2000,
    octaves: 0.8,
    attack: 0.001,
    decay: 0.3,
    release: 0.2,
  },
  jazzBrush: { attack: 0.001, decay: 0.15, release: 0.05 },
  jazzSax: {
    attack: 0.08,
    decay: 0.2,
    sustain: 0.7,
    release: 0.6,
    bp: 800,
    bpQ: 1.2,
    eq: { high: -2, mid: 4, low: -3 },
  },
  ambientPad: {
    attack: 0.55, // 3.0s in the app; shortened so a 4s bed still has a body
    decay: 1.2,
    sustain: 0.85,
    release: 1.6,
    lp: 1200,
    eq: { high: -8, mid: 3, low: 4 },
    volDb: -5,
  },
  mixer: {
    masterVolume: 0.7,
    masterCompDb: -12,
    masterEq: { high: 1.2, mid: 0, low: 0.8 },
    limiterDb: -0.1,
  },
};

/**
 * Prototype stacked limiters + 0.8 snare grit. The mill keeps the topology and
 * tightens the mix: rumble HP, mud cut, milder saturation, sidechain, one limiter.
 */
const CRYSTAL = {
  kickFloorHz: 28,
  eightOhEightFloorHz: 24,
  mudHz: 320,
  mudDb: -3.5,
  distScale: 0.55,
  hatAirHz: 9000,
  sidechain: 0.55,
  peakTarget: 0.82,
};

const GENRE_ALIASES = {
  ambient: "ambient",
  techno: "techno",
  jazz: "jazz",
  phonk: "phonk",
  rock: "rock",
  timeless: "timeless",
  destination: "ambient",
  country: "timeless",
  game: "techno",
};

const TEMPO_TABLES = {
  ambient: [70, 80, 90],
  techno: [120, 128, 140],
  jazz: [100, 110, 120],
  phonk: [130, 140, 150],
  rock: [110, 120, 130],
  timeless: [70, 80, 90],
};

const GENRES = {
  ambient: {
    bpm: 90,
    voices: ["triangle-pad", "rhodes-keys", "membrane-sub", "metal-air", "mixer"],
  },
  techno: {
    bpm: 128,
    voices: ["membrane-kick", "metal-hat", "snare-clap", "duo-bass", "fm-lead", "mixer"],
  },
  phonk: {
    bpm: 150,
    voices: ["membrane-808", "metal-hat", "metal-cowbell", "reese-bass", "formant-stab", "mixer"],
  },
  jazz: {
    bpm: 120,
    voices: ["membrane-kick", "metal-ride", "brush-snare", "upright-bass", "sax-lead", "mixer"],
  },
  rock: {
    bpm: 140,
    voices: ["membrane-kick", "metal-hat", "metal-crash", "duo-guitar", "formant-vox", "mixer"],
  },
  timeless: {
    bpm: 90,
    voices: ["triangle-pad", "rhodes-keys", "membrane-sub", "mixer"],
  },
};

const SCALES = {
  ambient: [261.63, 311.13, 349.23, 392.0, 466.16, 196.0, 220.0, 246.94, 293.66, 329.63, 415.3, 207.65, 196.0, 155.56],
  techno: [65.41, 87.31, 130.81, 174.61, 196.0],
  phonk: [32.7, 43.65, 55.0, 65.41, 82.41],
  jazz: [130.81, 164.81, 196.0, 220.0, 261.63],
  rock: [329.63, 392.0, 440.0, 493.88, 587.33],
  timeless: [261.63, 311.13, 349.23, 392.0, 466.16, 65.41],
};

function dbLin(db) {
  return Math.pow(10, db / 20);
}

function resolveGenre(name) {
  const raw = String(name || "ambient")
    .trim()
    .toLowerCase();
  const id = GENRE_ALIASES[raw] || (GENRES[raw] ? raw : "ambient");
  const spec = GENRES[id];
  return { id, alias: raw !== id ? raw : null, bpm: spec.bpm, voices: [...spec.voices] };
}

function tempoFromSeed(genreId, seedHex) {
  const table = TEMPO_TABLES[genreId] || TEMPO_TABLES.ambient;
  const hex = String(seedHex || "").replace(/^0x/, "");
  const n = Number.parseInt(hex.slice(8, 16) || hex.slice(0, 8) || "1", 16);
  const idx = Number.isFinite(n) ? n % table.length : 0;
  return table[idx];
}

/** Shared motion/audio grid. phase0=0 so t=0 is downbeat for both LFOs and the bed. */
function motionGrid(seedHex, genre) {
  const g = resolveGenre(genre);
  const bpm = tempoFromSeed(g.id, seedHex);
  return {
    genre: g.id,
    bpm,
    beatSec: 60 / bpm,
    phase0: 0,
    downbeat: 0,
    e: 0.25,
    and: 0.5,
    a: 0.75,
    syncopate: true,
  };
}

function ease01(a, b, x) {
  if (b <= a) return x >= b ? 1 : 0;
  const t = x < a ? 0 : x > b ? 1 : (x - a) / (b - a);
  return t * t * (3 - 2 * t);
}

/**
 * 4.44s entertainment spine — YouTube-short form, not a pasted bar.
 * hook (beats 0–2) → turn (2 → last ~1.1) → tag. Hits are one-shots, not strobe.
 * hookEase/turnEase/tagEase are continuous weights (crossfade). Binary hook/turn/tag stay section flags.
 */
function shortformPhrase(t, seconds, grid) {
  const dur = seconds > 0 ? seconds : 4.44;
  const beatSec = (grid && grid.beatSec) || 60 / 90;
  const beats = t / beatSec;
  const total = dur / beatSec;
  const hookEnd = 2;
  const tagLen = Math.min(1.25, Math.max(0.85, total * 0.2));
  const tagStart = Math.max(hookEnd + 1.6, total - tagLen);
  let section = "tag";
  if (beats < hookEnd) section = "hook";
  else if (beats < tagStart) section = "turn";
  function near(at) {
    const d = Math.abs(beats - at);
    return d < 0.14 ? 1 - d / 0.14 : 0;
  }
  const fade = 0.28;
  const hookEase = 1 - ease01(hookEnd - fade, hookEnd + fade, beats);
  const tagEase = ease01(tagStart - fade, tagStart + fade, beats);
  const turnEase = Math.max(0, 1 - hookEase - tagEase);
  return {
    section,
    beats,
    total,
    hook: section === "hook" ? 1 : 0,
    turn: section === "turn" ? 1 : 0,
    tag: section === "tag" ? 1 : 0,
    hookEase,
    turnEase,
    tagEase,
    turnHit: near(hookEnd),
    tagHit: near(tagStart),
    hookEndBeats: hookEnd,
    tagStartBeats: tagStart,
  };
}

function padTones(genreId, scale) {
  const s = scale || SCALES[genreId] || SCALES.ambient;
  if (genreId === "ambient" || genreId === "timeless") return [s[0] * 0.75, s[0], s[1], s[3]];
  if (genreId === "jazz") return [s[0], s[2], s[3], s[0] * 2];
  if (genreId === "phonk") return [s[0], s[0] * 1.5, s[3]];
  if (genreId === "rock") return [s[0] * 0.5, s[0], s[2]];
  return [s[0], s[2], s[3]];
}

function degreeLine(kind, count) {
  if (kind === "bass") {
    const cell = [0, 0, 3, 4];
    return Array.from({ length: count }, (_, i) => cell[i % cell.length]);
  }
  if (kind === "rhodes") {
    const cell = [0, 2, 4, 4, 2, 0];
    return Array.from({ length: count }, (_, i) => cell[i % cell.length]);
  }
  const cell = [0, 0, 2, 3];
  return Array.from({ length: count }, (_, i) => cell[i % cell.length]);
}

function walkDegree(last, len, rng) {
  const dir = rng() < 0.5 ? -1 : 1;
  const next = last + dir;
  if (next < 0) return 0;
  if (next >= len) return len - 1;
  return next;
}

function gridTime(grid, beats) {
  return (grid.phase0 || 0) + beats * grid.beatSec;
}

function mixInto(dest, src, start, gain) {
  const offset = Math.max(0, start | 0);
  const g = gain || 1;
  for (let i = 0; i < src.length; i++) {
    const j = offset + i;
    if (j >= dest.length) break;
    dest[j] += src[i] * g;
  }
}

function expDecay(t, decay) {
  if (decay <= 0) return t <= 0 ? 1 : 0;
  if (t < 0) return 0;
  return Math.exp((-5 * t) / decay);
}

function attackGain(t, attack) {
  if (attack <= 0) return 1;
  if (t >= attack) return 1;
  if (t <= 0) return 0;
  const x = t / attack;
  return x * x;
}

function adsr(t, attack, decay, sustain, release, hold) {
  const held = hold == null ? 0 : hold;
  if (t < 0) return 0;
  if (t < attack) return attackGain(t, attack);
  if (t < attack + decay) {
    const u = (t - attack) / Math.max(decay, 1e-6);
    return 1 - (1 - sustain) * u;
  }
  if (t < attack + decay + held) return sustain;
  const relT = t - attack - decay - held;
  if (relT >= release) return 0;
  return sustain * expDecay(relT, release);
}

function oneshotAmp(t, attack, decay) {
  return attackGain(t, attack) * expDecay(Math.max(0, t - attack), decay);
}

function saw(phase) {
  return 2 * ((phase / (2 * Math.PI)) % 1) - 1;
}

function triangle(phase) {
  const p = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
  return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
}

function square(phase) {
  return Math.sin(phase) >= 0 ? 1 : -1;
}

function polyBlep(t, dt) {
  if (dt <= 0) return 0;
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

function sawBlep(phase, inc) {
  const t = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
  const dt = Math.abs(inc) / (2 * Math.PI);
  return 2 * t - 1 - polyBlep(t, dt);
}

function squareBlep(phase, inc) {
  const t = ((phase / (2 * Math.PI)) % 1 + 1) % 1;
  const dt = Math.abs(inc) / (2 * Math.PI);
  const s = t < 0.5 ? 1 : -1;
  return s + polyBlep(t, dt) - polyBlep((t + 0.5) % 1, dt);
}

function noiseLcg(seed) {
  let s = (seed >>> 0) || 1;
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function biquadCoeffs(kind, freq, q, sampleRate, gainDb) {
  const f = Math.max(20, Math.min((sampleRate || 44100) * 0.45, freq || 1000));
  const sr = sampleRate || 44100;
  const w0 = (2 * Math.PI * f) / sr;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const qq = Math.max(0.2, q || 0.707);
  const alpha = sin / (2 * qq);
  const a = Math.pow(10, (gainDb || 0) / 40);
  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;
  if (kind === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  } else if (kind === "bandpass") {
    b0 = alpha;
    b1 = 0;
    b2 = -alpha;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  } else if (kind === "peaking") {
    b0 = 1 + alpha * a;
    b1 = -2 * cos;
    b2 = 1 - alpha * a;
    a0 = 1 + alpha / a;
    a1 = -2 * cos;
    a2 = 1 - alpha / a;
  } else {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cos;
    a2 = 1 - alpha;
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function biquad(kind, freq, q, sampleRate, gainDb) {
  const c = biquadCoeffs(kind, freq, q, sampleRate, gainDb);
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

function highpass(cutoff, sampleRate) {
  const rc = 1 / (2 * Math.PI * Math.max(40, cutoff));
  const dt = 1 / sampleRate;
  const a = rc / (rc + dt);
  let prevX = 0;
  let prevY = 0;
  return {
    step(x) {
      const y = a * (prevY + x - prevX);
      prevX = x;
      prevY = y;
      return y;
    },
  };
}

function lowpass(cutoff, sampleRate) {
  const rc = 1 / (2 * Math.PI * Math.max(20, cutoff));
  const dt = 1 / sampleRate;
  const a = dt / (rc + dt);
  let y = 0;
  return {
    step(x) {
      y += a * (x - y);
      return y;
    },
  };
}

function bandpass(cutoff, sampleRate) {
  const hp = highpass(cutoff * 0.7, sampleRate);
  const lp = lowpass(cutoff * 1.4, sampleRate);
  return {
    step(x) {
      return lp.step(hp.step(x));
    },
  };
}

function makeEq3(sampleRate) {
  const lp = lowpass(250, sampleRate);
  const hp = highpass(2500, sampleRate);
  return {
    step(x, lowDb, midDb, highDb) {
      const l = lp.step(x);
      const h = hp.step(x);
      const m = x - l - h;
      return l * dbLin(lowDb) + m * dbLin(midDb) + h * dbLin(highDb);
    },
  };
}

function distort(x, amount) {
  const a = Math.max(0, amount) * CRYSTAL.distScale;
  if (a <= 0.001) return x;
  const k = 1 + a * 12;
  return Math.tanh(x * k) / Math.tanh(k);
}

function compress(samples, threshold, ratio, sampleRate, attackSec, releaseSec) {
  const out = new Float64Array(samples.length);
  let env = 0;
  const atk = 1 - Math.exp(-1 / (Math.max(0.0008, attackSec || 0.004) * sampleRate));
  const rel = 1 - Math.exp(-1 / (Math.max(0.02, releaseSec || 0.12) * sampleRate));
  for (let i = 0; i < samples.length; i++) {
    const x = Math.abs(samples[i]);
    env += (x > env ? atk : rel) * (x - env);
    const gain = env > threshold ? threshold / env + (1 - threshold / env) / ratio : 1;
    out[i] = samples[i] * gain;
  }
  return out;
}

function limiter(samples, ceiling) {
  const out = new Float64Array(samples.length);
  const cap = Math.max(0.2, ceiling);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    const a = Math.abs(x);
    out[i] = a > cap ? Math.sign(x) * (cap + (a - cap) / (1 + (a - cap) * 8)) : x;
  }
  return out;
}

function normalize(samples, peakTarget) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const scale = peak > 0 ? peakTarget / peak : 0;
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * scale;
  return out;
}

function envelopeFollow(samples, sampleRate, attack, release) {
  const out = new Float64Array(samples.length);
  let env = 0;
  const atk = 1 - Math.exp(-1 / (attack * sampleRate));
  const rel = 1 - Math.exp(-1 / (release * sampleRate));
  for (let i = 0; i < samples.length; i++) {
    const x = Math.abs(samples[i]);
    env += (x > env ? atk : rel) * (x - env);
    out[i] = env;
  }
  return out;
}

function applyBus(samples, sampleRate, { hp, lp, eq, dist, comp, volDb }) {
  const hpF = hp ? highpass(hp, sampleRate) : null;
  const lpF = lp ? lowpass(lp, sampleRate) : null;
  const mud = highpass(CRYSTAL.mudHz, sampleRate);
  const eq3 = eq ? makeEq3(sampleRate) : null;
  const out = new Float64Array(samples.length);
  const mudKeep = dbLin(CRYSTAL.mudDb);
  for (let i = 0; i < samples.length; i++) {
    let x = samples[i];
    if (hpF) x = hpF.step(x);
    if (lpF) x = lpF.step(x);
    const air = mud.step(x);
    x = x * (1 - 0.28) + air * (0.28 + (1 - mudKeep) * 0.15);
    if (eq3 && eq) x = eq3.step(x, eq.low || 0, eq.mid || 0, eq.high || 0);
    if (dist) x = distort(x, dist);
    out[i] = x * dbLin(volDb || 0);
  }
  if (comp) {
    return compress(
      out,
      dbLin(comp.thresholdDb),
      comp.ratio,
      sampleRate,
      comp.attack,
      comp.release,
    );
  }
  return out;
}

/** Tone MembraneSynth: sine + exponential pitch drop, floored so it does not become DC. */
function renderMembrane({
  sampleRate,
  freq,
  octaves,
  pitchDecay,
  attack,
  decay,
  release,
  velocity,
  floorHz,
  shape,
}) {
  const rel = release || 0.12;
  const dur = attack + decay + rel;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const floor = floorHz || CRYSTAL.kickFloorHz;
  const endFreq = Math.max(floor, freq * Math.pow(2, -octaves));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f =
      t < pitchDecay ? freq * Math.pow(endFreq / freq, t / Math.max(pitchDecay, 1e-6)) : endFreq;
    const inc = (2 * Math.PI * f) / sampleRate;
    const osc = shape === "square" ? squareBlep(phase, inc) : Math.sin(phase);
    const harm =
      shape === "square" ? 0 : Math.sin(phase * 2) * Math.max(0, 1 - t / Math.max(pitchDecay, 1e-6)) * 0.32;
    out[i] = velocity * oneshotAmp(t, attack, decay + rel * 0.45) * (osc + harm);
    phase += inc;
  }
  return out;
}

function kickClick(sampleRate, velocity) {
  const n = Math.floor(0.007 * sampleRate);
  const out = new Float64Array(n);
  const hp = biquad("highpass", 1400, 0.7, sampleRate);
  const noise = noiseLcg(0x51ed);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-t / 0.0022);
    const click = 0.5 * Math.sin(phase) + 0.5 * (noise() * 2 - 1);
    out[i] = velocity * env * hp.step(click);
    phase += (2 * Math.PI * 2400) / sampleRate;
  }
  return out;
}

/**
 * Tone MetalSynth: FM square/square + high resonance, short env.
 */
function renderMetal({
  sampleRate,
  freq,
  harmonicity,
  modulationIndex,
  resonance,
  attack,
  decay,
  release,
  velocity,
}) {
  const rel = release || 0.02;
  const dur = attack + decay + rel;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const hp = biquad("highpass", Math.max(800, resonance * 0.55), 0.7, sampleRate);
  const bp = biquad("bandpass", Math.max(900, resonance), 5.2, sampleRate);
  const noise = noiseLcg((freq * 100) | 0);
  let carrierPhase = 0;
  let modPhase = 0;
  const modHz = freq * harmonicity;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const mod = Math.sin(modPhase);
    const carrier = Math.sin(carrierPhase + modulationIndex * 0.08 * mod);
    const grit = noise() * 2 - 1;
    const amp = velocity * oneshotAmp(t, attack, decay + rel);
    out[i] = hp.step(bp.step(carrier * 0.74 + grit * 0.26) * amp);
    carrierPhase += (2 * Math.PI * freq) / sampleRate;
    modPhase += (2 * Math.PI * modHz) / sampleRate;
  }
  return out;
}

function renderDuoBass({ sampleRate, freq, velocity, hold }) {
  const p = RIPPEL.technoBass;
  const dur = p.attack + p.decay + (hold || 0.18) + p.release * 0.5;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const lp0 = biquad("lowpass", 420, 0.85, sampleRate);
  const lp1 = biquad("lowpass", 140, 0.8, sampleRate);
  const lpA = biquad("lowpass", p.lp, 1.1, sampleRate);
  const lpB = biquad("lowpass", p.lp, 0.9, sampleRate);
  let ph0 = 0;
  let ph1 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, p.attack, p.decay, p.sustain, p.release, hold || 0.12);
    const vib = 1 + p.vibratoAmount * 0.15 * Math.sin(2 * Math.PI * p.vibratoRate * t);
    const inc0 = (2 * Math.PI * freq * vib) / sampleRate;
    const inc1 = (2 * Math.PI * freq * p.harmonicity * vib) / sampleRate;
    const v0 = lp0.step(sawBlep(ph0, inc0));
    const v1 = lp1.step(triangle(ph1));
    out[i] = velocity * env * lpB.step(lpA.step(0.62 * v0 + 0.38 * v1));
    ph0 += inc0;
    ph1 += inc1;
  }
  return out;
}

function renderReese({ sampleRate, freq, velocity, hold }) {
  const p = RIPPEL.phonkReese;
  const dur = p.attack + p.decay + (hold || 0.25) + p.release * 0.4;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const lp = lowpass(p.lp, sampleRate);
  let ph0 = 0;
  let ph1 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, p.attack, p.decay, p.sustain, p.release, hold || 0.2);
    const mix = 0.5 * saw(ph0) + 0.5 * saw(ph1);
    out[i] = velocity * env * lp.step(mix);
    ph0 += (2 * Math.PI * freq) / sampleRate;
    ph1 += (2 * Math.PI * freq * 1.01) / sampleRate;
  }
  return out;
}

function renderCowbell({ sampleRate, velocity }) {
  const p = RIPPEL.phonkCowbell;
  return renderMetal({
    sampleRate,
    freq: 845,
    harmonicity: p.harmonicity,
    modulationIndex: p.modulationIndex,
    resonance: p.resonance,
    attack: p.attack,
    decay: p.decay,
    release: p.release,
    velocity,
  });
}

function renderBrush({ sampleRate, velocity, rng }) {
  const p = RIPPEL.jazzBrush;
  const n = Math.floor((p.attack + p.decay + p.release + 0.04) * sampleRate);
  const out = new Float64Array(n);
  const hp = highpass(1800, sampleRate);
  const lp = lowpass(6500, sampleRate);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const noise = rng() * 2 - 1;
    out[i] = lp.step(hp.step(velocity * oneshotAmp(t, p.attack, p.decay) * noise));
  }
  return out;
}

function renderSax({ sampleRate, freq, velocity, hold }) {
  const p = RIPPEL.jazzSax;
  const dur = p.attack + p.decay + (hold || 0.22) + p.release;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const bp = bandpass(p.bp, sampleRate);
  const eq = makeEq3(sampleRate);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, p.attack, p.decay, p.sustain, p.release, hold || 0.18);
    const breath = (Math.sin(phase * 0.17) * 0.04 + 0.02) * (Math.sin(phase * 11.3) > 0 ? 1 : -1);
    const tone = 0.82 * saw(phase) + 0.18 * triangle(phase * 2);
    out[i] = eq.step(bp.step(velocity * env * (tone + breath)), p.eq.low, p.eq.mid, p.eq.high);
    phase += (2 * Math.PI * freq) / sampleRate;
  }
  return out;
}

/** Tone.FMSynth — techno lead (harmonicity 3, modulationIndex 10). */
function renderFmLead({ sampleRate, freq, velocity, hold }) {
  const attack = 0.01;
  const decay = 0.2;
  const sustain = 0.7;
  const release = 0.8;
  const dur = attack + decay + (hold || 0.16) + release * 0.45;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const lp = biquad("lowpass", 2200, 0.9, sampleRate);
  const hp = biquad("highpass", 180, 0.7, sampleRate);
  let carrier = 0;
  let mod = 0;
  const harmonicity = 3;
  const index = 10;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, attack, decay, sustain, release, hold || 0.12);
    const m = Math.sin(mod);
    const inc = (2 * Math.PI * freq) / sampleRate;
    const body = sawBlep(carrier + index * 0.1 * m, inc);
    out[i] = hp.step(lp.step(velocity * env * body));
    carrier += inc;
    mod += (2 * Math.PI * freq * harmonicity) / sampleRate;
  }
  return out;
}

/** Phonk/rock vocal stab — square through 300/800/1500 formants. */
function renderFormant({ sampleRate, freq, velocity, hold }) {
  const attack = 0.001;
  const decay = 0.22;
  const release = 0.28;
  const dur = attack + decay + (hold || 0.08) + release;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const f1 = bandpass(300, sampleRate);
  const f2 = bandpass(800, sampleRate);
  const f3 = bandpass(1500, sampleRate);
  const lp = lowpass(2400, sampleRate);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = oneshotAmp(t, attack, decay + release * 0.4) * velocity;
    const raw = squareBlep(phase, (2 * Math.PI * freq) / sampleRate);
    const voice = f1.step(raw) * 0.45 + f2.step(raw) * 0.35 + f3.step(raw) * 0.2;
    out[i] = lp.step(voice * env);
    phase += (2 * Math.PI * freq) / sampleRate;
  }
  return out;
}

function renderRhodes({ sampleRate, freq, velocity }) {
  const attack = 0.008;
  const decay = 0.55;
  const n = Math.floor(2.2 * sampleRate);
  const out = new Float64Array(n);
  const lp = biquad("lowpass", 2600, 0.8, sampleRate);
  const hp = biquad("highpass", 220, 0.7, sampleRate);
  const hammer = noiseLcg((freq * 17) | 0);
  const tine = biquad("highpass", 1800, 0.8, sampleRate);
  let phase = 0;
  let mod = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, attack, decay, 0.38, 1.8, 0.04);
    const index = 6.5 * Math.exp(-t / 0.22) + 0.35;
    const fm = Math.sin(mod) * index;
    const body = Math.sin(phase + fm);
    const tick = tine.step((hammer() * 2 - 1) * Math.exp(-t / 0.012) * 0.22);
    out[i] = hp.step(lp.step(velocity * env * (body + tick)));
    phase += (2 * Math.PI * freq) / sampleRate;
    mod += (2 * Math.PI * freq) / sampleRate;
  }
  return out;
}

function renderPad(n, sampleRate, freqs, rng, attack) {
  const p = RIPPEL.ambientPad;
  const out = new Float64Array(n);
  const hp = biquad("highpass", 180, 0.7, sampleRate);
  const eq = makeEq3(sampleRate);
  const phases = freqs.map(() => rng() * Math.PI * 2);
  const detune = freqs.map(() => 0.996 + rng() * 0.008);
  const lfo = freqs.map(() => 0.09 + rng() * 0.16);
  const tap = new Float64Array(Math.max(8, Math.floor(0.018 * sampleRate)));
  let tapI = 0;
  let cutoff = p.lp;
  let lp = biquad("lowpass", cutoff, 0.9, sampleRate);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    if (i % 64 === 0) {
      cutoff = p.lp * (0.82 + 0.18 * Math.sin(2 * Math.PI * 0.21 * t));
      lp = biquad("lowpass", cutoff, 0.95, sampleRate);
    }
    const env = adsr(t, attack || p.attack, p.decay, p.sustain, p.release, Math.max(0, n / sampleRate - 2));
    let mix = 0;
    for (let v = 0; v < freqs.length; v++) {
      const f = freqs[v] * detune[v];
      const inc = (2 * Math.PI * f) / sampleRate;
      const ph = phases[v] + 2 * Math.PI * f * t + 0.01 * Math.sin(2 * Math.PI * lfo[v] * t);
      mix += 0.62 * sawBlep(ph, inc) + 0.38 * triangle(ph);
    }
    const dry = hp.step(lp.step((mix / freqs.length) * env));
    const delayed = tap[tapI];
    tap[tapI] = dry;
    tapI = (tapI + 1) % tap.length;
    out[i] = eq.step(dry * 0.82 + delayed * 0.18, p.eq.low, p.eq.mid, p.eq.high);
  }
  return out;
}

/** Moving air bed — not a sine drone. Pink-ish noise through a wandering bandpass. */
function renderAirGlue(n, sampleRate, rng, amount) {
  const out = new Float64Array(n);
  const hp = highpass(180, sampleRate);
  const lp = lowpass(1400, sampleRate);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  const lfoHz = 0.17 + rng() * 0.11;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const white = rng() * 2 - 1;
    b0 = 0.997 * b0 + white * 0.04;
    b1 = 0.985 * b1 + white * 0.05;
    b2 = 0.95 * b2 + white * 0.1;
    const pink = (b0 + b1 + b2) / 3;
    const wobble = 0.7 + 0.3 * Math.sin(2 * Math.PI * lfoHz * t);
    out[i] = lp.step(hp.step(pink)) * amount * wobble;
  }
  return out;
}

function masterEnvelope(samples, sampleRate, seconds, lock) {
  const blip = Boolean(lock) && seconds <= 5;
  const introHold = blip ? 0 : 0.5;
  const introEase = blip ? 0.03 : 0.35;
  const fadeSec = blip ? 0.35 : 1;
  const fadeStart = Math.max(seconds - fadeSec, blip ? seconds * 0.88 : 1.25);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    let g = 1;
    if (blip && t < introEase) {
      g = t / introEase;
    } else if (!blip && t < introHold) g = 0.46;
    else if (!blip && t < introHold + introEase) {
      const u = (t - introHold) / introEase;
      g = 0.46 + 0.54 * (0.5 - 0.5 * Math.cos(Math.PI * u));
    } else if (t >= fadeStart) {
      const u = (t - fadeStart) / Math.max(seconds - fadeStart, 1e-6);
      g = 1 - (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, u)));
    }
    out[i] = samples[i] * g;
  }
  return out;
}

function renderPlate(samples, sampleRate) {
  const delays = [0.0297, 0.0371, 0.0411, 0.0437].map((s) => Math.max(2, Math.floor(s * sampleRate)));
  const bufs = delays.map((d) => new Float64Array(d));
  const idx = delays.map(() => 0);
  const pre = Math.floor(0.012 * sampleRate);
  const hp = biquad("highpass", 1500, 0.7, sampleRate);
  const lp = biquad("lowpass", 7800, 0.8, sampleRate);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const x = i >= pre ? samples[i - pre] : 0;
    let acc = 0;
    for (let c = 0; c < bufs.length; c++) {
      const d = bufs[c][idx[c]];
      bufs[c][idx[c]] = x + d * 0.52;
      idx[c] = (idx[c] + 1) % bufs[c].length;
      acc += d;
    }
    out[i] = lp.step(hp.step(acc * 0.25));
  }
  return out;
}

function schedule(seconds, step, endPad) {
  const times = [];
  const end = seconds - (endPad || 0.1);
  for (let t = 0; t < end; t += step) times.push(t);
  return times;
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function sectionGain(t, seconds, lock, grid) {
  const p = t / seconds;
  if (lock && seconds <= 5) {
    const phrase = shortformPhrase(t, seconds, grid || { beatSec: 60 / 90 });
    return Math.max(
      0.58,
      0.84 * phrase.hookEase + 1 * phrase.turnEase + 0.68 * phrase.tagEase,
    );
  }
  if (p < 0.15) return 0.62;
  if (p < 0.4) return 0.88;
  if (p < 0.75) return 1;
  if (p < 0.9) return 0.82;
  return 0.55;
}

function renderRippelBed({ brief, genre, seconds, seedHex, rng, sampleRate, syncopate }) {
  void brief;
  const g = resolveGenre(genre);
  const grid = motionGrid(seedHex, g.id);
  g.bpm = grid.bpm;
  const lock = Boolean(syncopate);
  const n = Math.floor(sampleRate * seconds);
  const kickBus = new Float64Array(n);
  const hatBus = new Float64Array(n);
  const colorBus = new Float64Array(n);
  const padBus = new Float64Array(n);
  const beat = grid.beatSec;
  const scale = SCALES[g.id] || SCALES.ambient;
  const hatSlip = (t) => (lock ? t : t + (rng() - 0.5) * 0.003);

  if (g.id === "techno") {
    const kick = RIPPEL.technoKick;
    const hat = RIPPEL.technoHat;
    const snare = RIPPEL.technoSnare;
    for (const t of schedule(seconds, beat, 0.08)) {
      const hit = renderMembrane({
        sampleRate,
        freq: kick.noteHz,
        octaves: kick.octaves,
        pitchDecay: kick.pitchDecay,
        attack: kick.attack,
        decay: kick.decay,
        release: kick.release,
        velocity: 0.92 * sectionGain(t, seconds, lock, grid),
        floorHz: CRYSTAL.kickFloorHz,
      });
      mixInto(kickBus, hit, Math.floor(t * sampleRate), 1);
      mixInto(kickBus, kickClick(sampleRate, 0.22), Math.floor(t * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat / 2, 0.04)) {
      const off = Math.round(t / (beat / 2)) % 2 === 1;
      const hit = renderMetal({
        sampleRate,
        freq: 380,
        harmonicity: hat.harmonicity,
        modulationIndex: hat.modulationIndex,
        resonance: hat.resonance,
        attack: hat.attack,
        decay: hat.decay,
        release: hat.release,
        velocity: (off ? 0.34 : 0.2) * sectionGain(t, seconds, lock, grid),
      });
      mixInto(hatBus, hit, Math.floor(hatSlip(t) * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat * 2, 0.08)) {
      const at = t + beat;
      if (at >= seconds - 0.1) continue;
      const hit = renderMembrane({
        sampleRate,
        freq: 196,
        octaves: snare.octaves,
        pitchDecay: snare.pitchDecay,
        attack: snare.attack,
        decay: snare.decay,
        release: snare.release,
        velocity: 0.42,
        floorHz: 120,
        shape: "square",
      });
      const bp = bandpass(snare.bandpass, sampleRate);
      for (let i = 0; i < hit.length; i++) hit[i] = bp.step(hit[i]);
      mixInto(colorBus, hit, Math.floor(at * sampleRate), 0.85);
    }
    const technoLine = degreeLine("bass", 8);
    for (const t of schedule(seconds, beat, 0.12)) {
      const beatIdx = Math.round(t / beat);
      const bass = renderDuoBass({
        sampleRate,
        freq: scale[technoLine[beatIdx % technoLine.length] % scale.length],
        velocity: 0.42,
        hold: beat * 0.45,
      });
      mixInto(colorBus, bass, Math.floor(t * sampleRate), 1);
    }
    const leadLine = degreeLine("rhodes", 6);
    let leadI = 0;
    for (const t of schedule(seconds, beat * 2, 0.18)) {
      const phrase = shortformPhrase(t, seconds, grid);
      if (lock && phrase.hookEase > 0.7) continue;
      const deg = leadLine[leadI % leadLine.length];
      leadI += 1;
      mixInto(
        colorBus,
        renderFmLead({
          sampleRate,
          freq: scale[deg % scale.length] * 2,
          velocity: 0.22 + 0.08 * phrase.turnEase,
          hold: beat * 0.35,
        }),
        Math.floor((t + beat * 0.25) * sampleRate),
        1,
      );
    }
  } else if (g.id === "phonk") {
    mixInto(padBus, renderPad(n, sampleRate, padTones("phonk", scale), rng, 0.35), 0, 0.22);
    const kick = RIPPEL.phonk808;
    const hat = RIPPEL.technoHat;
    for (const t of schedule(seconds, beat, 0.12)) {
      const hit = renderMembrane({
        sampleRate,
        freq: kick.noteHz,
        octaves: kick.octaves,
        pitchDecay: kick.pitchDecay,
        attack: kick.attack,
        decay: kick.decay,
        release: kick.release,
        velocity: 0.78 * sectionGain(t, seconds, lock, grid),
        floorHz: CRYSTAL.eightOhEightFloorHz,
      });
      mixInto(kickBus, hit, Math.floor(t * sampleRate), 1);
      mixInto(kickBus, kickClick(sampleRate, 0.1), Math.floor(t * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat / 2, 0.04)) {
      const hit = renderMetal({
        sampleRate,
        freq: 420,
        harmonicity: hat.harmonicity,
        modulationIndex: 36,
        resonance: 4500,
        attack: 0.001,
        decay: 0.055,
        release: 0.02,
        velocity: 0.18 * sectionGain(t, seconds, lock, grid),
      });
      mixInto(hatBus, hit, Math.floor(hatSlip(t) * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat, 0.08)) {
      mixInto(
        colorBus,
        renderCowbell({ sampleRate, velocity: 0.2 }),
        Math.floor((t + beat / 2) * sampleRate),
        1,
      );
    }
    const phonkLine = [0, 3];
    for (const t of schedule(seconds, beat * 2, 0.2)) {
      const beatIdx = Math.round(t / beat);
      const bass = renderReese({
        sampleRate,
        freq: scale[phonkLine[beatIdx % phonkLine.length] % scale.length],
        velocity: 0.38,
        hold: beat * 0.9,
      });
      mixInto(colorBus, bass, Math.floor((t + beat * 0.5) * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat, 0.1)) {
      const phrase = shortformPhrase(t, seconds, grid);
      if (lock && phrase.tagEase > 0.6) continue;
      mixInto(
        colorBus,
        renderFormant({
          sampleRate,
          freq: scale[2 % scale.length] * 4,
          velocity: 0.16 + 0.1 * phrase.turnEase,
          hold: beat * 0.18,
        }),
        Math.floor((t + beat * grid.and) * sampleRate),
        1,
      );
    }
  } else if (g.id === "jazz") {
    mixInto(padBus, renderPad(n, sampleRate, padTones("jazz", scale), rng, 0.4), 0, 0.28);
    const kick = RIPPEL.jazzKick;
    const ride = RIPPEL.jazzRide;
    const swing = beat / 2 * 0.32;
    for (const t of schedule(seconds, beat, 0.1)) {
      const hit = renderMembrane({
        sampleRate,
        freq: 73.4,
        octaves: kick.octaves,
        pitchDecay: kick.pitchDecay,
        attack: kick.attack,
        decay: kick.decay,
        release: kick.release,
        velocity: 0.55 * sectionGain(t, seconds, lock, grid),
        floorHz: 40,
      });
      mixInto(kickBus, hit, Math.floor(t * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat / 2, 0.05)) {
      const eighth = Math.round(t / (beat / 2));
      const at = eighth % 2 === 1 ? t + swing : t;
      const hit = renderMetal({
        sampleRate,
        freq: 280,
        harmonicity: ride.harmonicity,
        modulationIndex: ride.modulationIndex,
        resonance: ride.resonance,
        attack: ride.attack,
        decay: ride.decay,
        release: ride.release,
        velocity: 0.18 * sectionGain(t, seconds, lock, grid),
      });
      mixInto(hatBus, hit, Math.floor(at * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat * 2, 0.1)) {
      mixInto(
        colorBus,
        renderBrush({ sampleRate, velocity: 0.28, rng }),
        Math.floor((t + beat) * sampleRate),
        1,
      );
    }
    let walk = 0;
    for (const t of schedule(seconds, beat, 0.12)) {
      walk = walkDegree(walk, scale.length, rng);
      const bass = renderDuoBass({
        sampleRate,
        freq: scale[walk] / 2,
        velocity: 0.34,
        hold: beat * 0.55,
      });
      mixInto(colorBus, bass, Math.floor(t * sampleRate), 0.85);
    }
    const saxCell = degreeLine("rhodes", 6);
    let saxI = 0;
    for (const t of schedule(seconds, beat * 2, 0.25)) {
      const deg = saxCell[saxI % saxCell.length];
      saxI += 1;
      mixInto(
        colorBus,
        renderSax({ sampleRate, freq: scale[deg % scale.length] * 2, velocity: 0.22, hold: beat * 0.8 }),
        Math.floor((t + beat * 0.25) * sampleRate),
        1,
      );
    }
  } else if (g.id !== "rock") {
    const padFreqs = padTones(g.id === "timeless" ? "timeless" : "ambient", scale);
    mixInto(padBus, renderPad(n, sampleRate, padFreqs, rng, RIPPEL.ambientPad.attack), 0, dbLin(-8));
    const bassLine = degreeLine("bass", 8);
    const rhodesLine = degreeLine("rhodes", 8);
    let rhodesI = 0;
    let bassWalk = bassLine[0] % scale.length;
    const phrase0 = shortformPhrase(0, seconds, grid);
    const turnAt = phrase0.hookEndBeats * beat;
    const tagAt = phrase0.tagStartBeats * beat;
    for (const t of schedule(seconds, beat, 0.2)) {
      const phrase = shortformPhrase(t, seconds, grid);
      const lastKick = phrase.tagEase > 0.55 && phrase.beats + 1 >= phrase.total;
      const vel =
        (lastKick ? 0.92 : 0.7 + 0.16 * phrase.hookEase + 0.06 * phrase.turnEase) *
        sectionGain(t, seconds, lock, grid);
      const hit = renderMembrane({
        sampleRate,
        freq: 36.7,
        octaves: 4.5,
        pitchDecay: 0.09,
        attack: 0.004,
        decay: 0.45,
        release: 0.6,
        velocity: vel,
        floorHz: CRYSTAL.kickFloorHz,
      });
      mixInto(kickBus, hit, Math.floor(t * sampleRate), 1);
      mixInto(kickBus, kickClick(sampleRate, lastKick ? 0.22 : 0.16), Math.floor(t * sampleRate), 1);
    }
    if (lock && turnAt < seconds - 0.05) {
      mixInto(
        hatBus,
        renderMetal({
          sampleRate,
          freq: 320,
          harmonicity: 5.1,
          modulationIndex: 28,
          resonance: 3200,
          attack: 0.003,
          decay: 0.22,
          release: 0.1,
          velocity: 0.48,
        }),
        Math.floor(turnAt * sampleRate),
        1,
      );
      mixInto(kickBus, kickClick(sampleRate, 0.2), Math.floor(turnAt * sampleRate), 1);
    }
    if (lock && tagAt < seconds - 0.05) {
      mixInto(
        colorBus,
        renderRhodes({ sampleRate, freq: scale[4 % scale.length] * 2, velocity: 0.46 }),
        Math.floor(tagAt * sampleRate),
        1,
      );
      mixInto(
        kickBus,
        renderMembrane({
          sampleRate,
          freq: 41.2,
          octaves: 4.2,
          pitchDecay: 0.08,
          attack: 0.003,
          decay: 0.38,
          release: 0.5,
          velocity: 0.8,
          floorHz: CRYSTAL.kickFloorHz,
        }),
        Math.floor(tagAt * sampleRate),
        1,
      );
    }
    for (const t of schedule(seconds, beat, 0.08)) {
      const at = lock ? t + beat * grid.and : t;
      if (at >= seconds - 0.08) continue;
      const phrase = shortformPhrase(at, seconds, grid);
      const hatW = 1 - 0.45 * phrase.tagEase;
      const hit = renderMetal({
        sampleRate,
        freq: 240,
        harmonicity: 4.8,
        modulationIndex: 22,
        resonance: 2800,
        attack: 0.004,
        decay: 0.18,
        release: 0.08,
        velocity: (lock ? 0.38 : 0.16) * hatW * sectionGain(t, seconds, lock, grid),
      });
      mixInto(hatBus, hit, Math.floor(at * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat, 0.12)) {
      const beatIdx = Math.round(t / beat);
      const phrase = shortformPhrase(t, seconds, grid);
      if (lock && phrase.hookEase > 0.55 && beatIdx % 4 === 1) continue;
      if (lock && phrase.tagEase > 0.55 && beatIdx % 2 === 1) continue;
      if (phrase.turnEase > 0.35) bassWalk = walkDegree(bassWalk, scale.length, rng);
      else bassWalk = bassLine[beatIdx % bassLine.length] % scale.length;
      const register = phrase.turnEase > 0.5 ? 1 : 2;
      mixInto(
        colorBus,
        renderDuoBass({
          sampleRate,
          freq: scale[bassWalk] / register,
          velocity: 0.36,
          hold: beat * 0.42,
        }),
        Math.floor(t * sampleRate),
        1,
      );
    }
    for (const t of schedule(seconds, beat * 2, 0.2)) {
      const beatIdx = Math.round(t / beat);
      const phrase = shortformPhrase(t + beat * (lock ? grid.a : 0.5), seconds, grid);
      if (lock && phrase.hookEase > 0.6) continue;
      if (phrase.tagEase > 0.6) continue;
      const deg = rhodesLine[rhodesI % rhodesLine.length];
      rhodesI += 1;
      mixInto(
        colorBus,
        renderRhodes({ sampleRate, freq: scale[deg % scale.length], velocity: 0.4 }),
        Math.floor((t + beat * (lock ? grid.a : 0.5)) * sampleRate),
        1,
      );
      void beatIdx;
    }
  }

  if (g.id === "rock") {
    const kick = RIPPEL.technoKick;
    const hat = RIPPEL.technoHat;
    for (const t of schedule(seconds, beat, 0.08)) {
      const hit = renderMembrane({
        sampleRate,
        freq: 73.4,
        octaves: 8,
        pitchDecay: 0.06,
        attack: kick.attack,
        decay: 0.36,
        release: 0.5,
        velocity: 0.88 * sectionGain(t, seconds, lock, grid),
        floorHz: CRYSTAL.kickFloorHz,
      });
      mixInto(kickBus, hit, Math.floor(t * sampleRate), 1);
      mixInto(kickBus, kickClick(sampleRate, 0.2), Math.floor(t * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat / 2, 0.04)) {
      const off = Math.round(t / (beat / 2)) % 2 === 1;
      mixInto(
        hatBus,
        renderMetal({
          sampleRate,
          freq: 360,
          harmonicity: hat.harmonicity,
          modulationIndex: 28,
          resonance: 3800,
          attack: 0.001,
          decay: 0.06,
          release: 0.03,
          velocity: (off ? 0.3 : 0.18) * sectionGain(t, seconds, lock, grid),
        }),
        Math.floor(hatSlip(t) * sampleRate),
        1,
      );
    }
    const phrase0 = shortformPhrase(0, seconds, grid);
    const turnAt = phrase0.hookEndBeats * beat;
    if (lock && turnAt < seconds - 0.05) {
      mixInto(
        hatBus,
        renderMetal({
          sampleRate,
          freq: 280,
          harmonicity: 5.1,
          modulationIndex: 30,
          resonance: 3000,
          attack: 0.002,
          decay: 0.28,
          release: 0.12,
          velocity: 0.5,
        }),
        Math.floor(turnAt * sampleRate),
        1,
      );
    }
    const rockLine = degreeLine("bass", 8);
    for (const t of schedule(seconds, beat, 0.12)) {
      const beatIdx = Math.round(t / beat);
      mixInto(
        colorBus,
        renderDuoBass({
          sampleRate,
          freq: scale[rockLine[beatIdx % rockLine.length] % scale.length],
          velocity: 0.4,
          hold: beat * 0.4,
        }),
        Math.floor(t * sampleRate),
        1,
      );
    }
    for (const t of schedule(seconds, beat * 2, 0.2)) {
      const phrase = shortformPhrase(t, seconds, grid);
      mixInto(
        colorBus,
        renderFormant({
          sampleRate,
          freq: scale[1 % scale.length] * 2,
          velocity: 0.18 + 0.1 * phrase.turnEase,
          hold: beat * 0.22,
        }),
        Math.floor((t + beat * 0.5) * sampleRate),
        1,
      );
    }
  }

  const kickCh = applyBus(kickBus, sampleRate, {
    hp: g.id === "phonk" ? RIPPEL.phonk808.hp : 30,
    lp: g.id === "phonk" ? RIPPEL.phonk808.lp : 9000,
    eq: g.id === "phonk" ? RIPPEL.phonk808.eq : RIPPEL.technoKick.eq,
    dist: g.id === "phonk" ? RIPPEL.phonk808.dist : RIPPEL.technoKick.dist,
    comp: g.id === "phonk" ? RIPPEL.phonk808.comp : RIPPEL.technoKick.comp,
    volDb: g.id === "ambient" || g.id === "timeless" ? -4 : g.id === "jazz" ? RIPPEL.jazzKick.volDb : g.id === "phonk" ? RIPPEL.phonk808.volDb : RIPPEL.technoKick.volDb,
  });
  const hatCh = applyBus(hatBus, sampleRate, {
    hp: g.id === "techno" || g.id === "phonk" || g.id === "rock" ? CRYSTAL.hatAirHz : 7200,
    lp: 16000,
    eq: { low: -10, mid: -2, high: 3 },
    dist: 0.04,
    comp: RIPPEL.technoHat.comp,
    volDb: RIPPEL.technoHat.volDb,
  });
  const colorCh = applyBus(colorBus, sampleRate, {
    hp: g.id === "ambient" || g.id === "timeless" ? 90 : 40,
    lp: g.id === "phonk" ? 7000 : 9000,
    eq: g.id === "techno" || g.id === "rock" ? RIPPEL.technoBass.eq : g.id === "phonk" ? RIPPEL.phonkReese.eq : { low: -2, mid: 2, high: -3 },
    dist: g.id === "techno" || g.id === "rock" ? RIPPEL.technoBass.dist : g.id === "phonk" ? RIPPEL.phonkReese.dist : 0.08,
    comp: RIPPEL.technoBass.comp,
    volDb: g.id === "techno" ? RIPPEL.technoBass.volDb : g.id === "phonk" ? RIPPEL.phonkReese.volDb : -8,
  });
  const padCh = applyBus(padBus, sampleRate, {
    hp: lock && (g.id === "ambient" || g.id === "timeless") ? 180 : 90,
    lp: 6200,
    eq: { low: lock ? -5 : -2, mid: 2, high: -2 },
    dist: 0,
    volDb: -2,
  });

  const kickEnv = envelopeFollow(kickCh, sampleRate, 0.003, 0.2);
  const glue = renderAirGlue(n, sampleRate, rng, g.id === "ambient" || g.id === "timeless" ? (lock ? 0.03 : 0.07) : g.id === "phonk" ? 0.04 : 0.028);
  const wetSrc = new Float64Array(n);
  for (let i = 0; i < n; i++) wetSrc[i] = hatCh[i] * 0.62 + colorCh[i] * 0.38;
  const plate = renderPlate(wetSrc, sampleRate);
  const mix = new Float64Array(n);
  const kickGain = g.id === "ambient" || g.id === "timeless" ? (lock ? 1 : 0.7) : 0.9;
  const hatGain = g.id === "techno" || g.id === "phonk" || g.id === "rock" ? 0.72 : g.id === "ambient" || g.id === "timeless" ? 0.58 : 0.48;
  const padGain = g.id === "ambient" || g.id === "timeless" ? (lock ? 0.17 : 0.48) : g.id === "jazz" ? 0.36 : g.id === "phonk" ? 0.42 : 0.12;
  for (let i = 0; i < n; i++) {
    const duck = 1 / (1 + CRYSTAL.sidechain * kickEnv[i] * 7);
    mix[i] =
      kickCh[i] * kickGain +
      hatCh[i] * hatGain +
      colorCh[i] * 0.52 * duck +
      padCh[i] * padGain * duck +
      plate[i] * 0.1 +
      glue[i];
  }

  const masterEq = makeEq3(sampleRate);
  const mEq = RIPPEL.mixer.masterEq;
  for (let i = 0; i < n; i++) {
    mix[i] = masterEq.step(mix[i], mEq.low, mEq.mid, mEq.high) * RIPPEL.mixer.masterVolume;
  }
  let glued = compress(mix, dbLin(-16), g.id === "phonk" ? 5 : 2.6, sampleRate, 0.008, 0.16);
  const shaped = masterEnvelope(glued, sampleRate, seconds, lock);
  const peaked = normalize(shaped, CRYSTAL.peakTarget);
  const samples = limiter(peaked, dbLin(RIPPEL.mixer.limiterDb));

  return {
    samples,
    sampleRate,
    seconds,
    seed: seedHex,
    genre: g,
    grid: { ...grid, syncopate: lock },
    engine: ENGINE,
    mix: MIX,
    ssot: SSOT,
    toneOffline: TONE_OFFLINE_BLOCKER,
    topology: TOPOLOGY,
  };
}

function bandEnergy(samples, sampleRate, loHz, hiHz) {
  const hp = highpass(loHz, sampleRate);
  const lp = lowpass(hiHz, sampleRate);
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = lp.step(hp.step(samples[i]));
    acc += x * x;
  }
  return Math.sqrt(acc / samples.length);
}

function highpassEnergy(samples, sampleRate, cutoffHz) {
  const hp = highpass(cutoffHz, sampleRate);
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const x = hp.step(samples[i]);
    acc += x * x;
  }
  return Math.sqrt(acc / samples.length);
}

function zeroCrossRate(samples) {
  let crosses = 0;
  for (let i = 1; i < samples.length; i++) {
    if (samples[i] === 0 || samples[i] * samples[i - 1] < 0) crosses += 1;
  }
  return crosses / samples.length;
}

function crestFactor(samples) {
  let peak = 0;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
    acc += samples[i] * samples[i];
  }
  const rms = Math.sqrt(acc / samples.length);
  return rms > 0 ? peak / rms : 0;
}

module.exports = {
  TONE_OFFLINE_BLOCKER,
  ENGINE,
  MIX,
  TOPOLOGY,
  SSOT,
  RIPPEL,
  CRYSTAL,
  GENRE_ALIASES,
  GENRES,
  SCALES,
  resolveGenre,
  tempoFromSeed,
  motionGrid,
  shortformPhrase,
  padTones,
  degreeLine,
  gridTime,
  renderRippelBed,
  renderMembrane,
  renderMetal,
  renderDuoBass,
  renderFmLead,
  renderFormant,
  renderCowbell,
  bandEnergy,
  highpassEnergy,
  zeroCrossRate,
  crestFactor,
};
