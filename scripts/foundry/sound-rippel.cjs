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
  destination: "ambient",
};

const TEMPO_TABLES = {
  ambient: [70, 80, 90],
  techno: [120, 128, 140],
  jazz: [100, 110, 120],
  phonk: [130, 140, 150],
};

const GENRES = {
  ambient: {
    bpm: 90,
    voices: ["triangle-pad", "rhodes-keys", "membrane-sub", "metal-air", "mixer"],
  },
  techno: {
    bpm: 128,
    voices: ["membrane-kick", "metal-hat", "snare-clap", "duo-bass", "mixer"],
  },
  phonk: {
    bpm: 150,
    voices: ["membrane-808", "metal-hat", "metal-cowbell", "reese-bass", "mixer"],
  },
  jazz: {
    bpm: 120,
    voices: ["membrane-kick", "metal-ride", "brush-snare", "upright-bass", "sax-lead", "mixer"],
  },
};

const SCALES = {
  ambient: [261.63, 311.13, 349.23, 392.0, 466.16],
  techno: [65.41, 87.31, 130.81, 174.61, 196.0],
  phonk: [32.7, 43.65, 55.0, 65.41, 82.41],
  jazz: [130.81, 164.81, 196.0, 220.0, 261.63],
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
    const osc = shape === "square" ? square(phase) : Math.sin(phase);
    out[i] = velocity * oneshotAmp(t, attack, decay + rel * 0.45) * osc;
    phase += (2 * Math.PI * f) / sampleRate;
  }
  return out;
}

function kickClick(sampleRate, velocity) {
  const n = Math.floor(0.006 * sampleRate);
  const out = new Float64Array(n);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    out[i] = velocity * Math.exp(-t / 0.0018) * Math.sin(phase);
    phase += (2 * Math.PI * 2100) / sampleRate;
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
  const hp = highpass(Math.max(600, resonance * 0.6), sampleRate);
  let carrierPhase = 0;
  let modPhase = 0;
  const modHz = freq * harmonicity;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const mod = square(modPhase);
    const carrier = square(carrierPhase + modulationIndex * 0.12 * mod);
    const amp = velocity * oneshotAmp(t, attack, decay + rel);
    out[i] = hp.step(carrier * amp);
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
  const lp0 = lowpass(400, sampleRate);
  const lp1 = lowpass(120, sampleRate);
  const lpMix = lowpass(p.lp, sampleRate);
  let ph0 = 0;
  let ph1 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, p.attack, p.decay, p.sustain, p.release, hold || 0.12);
    const vib = 1 + p.vibratoAmount * 0.15 * Math.sin(2 * Math.PI * p.vibratoRate * t);
    const v0 = lp0.step(saw(ph0));
    const v1 = lp1.step(triangle(ph1));
    out[i] = velocity * env * lpMix.step(0.62 * v0 + 0.38 * v1);
    ph0 += (2 * Math.PI * freq * vib) / sampleRate;
    ph1 += (2 * Math.PI * freq * p.harmonicity * vib) / sampleRate;
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

function renderRhodes({ sampleRate, freq, velocity }) {
  const attack = 0.01;
  const decay = 0.6;
  const n = Math.floor(2.4 * sampleRate);
  const out = new Float64Array(n);
  const lp = lowpass(2400, sampleRate);
  const eq = makeEq3(sampleRate);
  let phase = 0;
  let mod = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, attack, decay, 0.4, 2.0, 0.05);
    const fm = Math.sin(mod) * 2;
    out[i] = eq.step(lp.step(velocity * env * triangle(phase + fm)), 2, 4, -6);
    phase += (2 * Math.PI * freq) / sampleRate;
    mod += (2 * Math.PI * freq * 1.01) / sampleRate;
  }
  return out;
}

function renderPad(n, sampleRate, freqs, rng, attack) {
  const p = RIPPEL.ambientPad;
  const out = new Float64Array(n);
  const lp = lowpass(p.lp, sampleRate);
  const eq = makeEq3(sampleRate);
  const phases = freqs.map(() => rng() * Math.PI * 2);
  const detune = freqs.map(() => 0.997 + rng() * 0.006);
  const lfo = freqs.map(() => 0.11 + rng() * 0.19);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = adsr(t, attack || p.attack, p.decay, p.sustain, p.release, Math.max(0, n / sampleRate - 2));
    let mix = 0;
    for (let v = 0; v < freqs.length; v++) {
      const f = freqs[v] * detune[v] * (1 + 0.012 * Math.sin(2 * Math.PI * lfo[v] * t + phases[v]));
      mix += triangle(2 * Math.PI * f * t + phases[v]);
    }
    const cutoffWobble = 0.85 + 0.15 * Math.sin(2 * Math.PI * 0.23 * t);
    out[i] = eq.step(lp.step((mix / freqs.length) * env * cutoffWobble), p.eq.low, p.eq.mid, p.eq.high);
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

function masterEnvelope(samples, sampleRate, seconds) {
  const introHold = 0.5;
  const introEase = 0.35;
  const fadeSec = 1;
  const fadeStart = Math.max(seconds - fadeSec, 1.25);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    let g = 1;
    if (t < introHold) g = 0.46;
    else if (t < introHold + introEase) {
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

function schedule(seconds, step, endPad) {
  const times = [];
  const end = seconds - (endPad || 0.1);
  for (let t = 0; t < end; t += step) times.push(t);
  return times;
}

function pick(arr, rng) {
  return arr[Math.floor(rng() * arr.length) % arr.length];
}

function sectionGain(t, seconds) {
  const p = t / seconds;
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
        velocity: 0.92 * sectionGain(t, seconds),
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
        velocity: (off ? 0.34 : 0.2) * sectionGain(t, seconds),
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
    for (const t of schedule(seconds, beat, 0.12)) {
      const bass = renderDuoBass({
        sampleRate,
        freq: pick(scale, rng),
        velocity: 0.42,
        hold: beat * 0.45,
      });
      mixInto(colorBus, bass, Math.floor(t * sampleRate), 1);
    }
  } else if (g.id === "phonk") {
    mixInto(padBus, renderPad(n, sampleRate, [49, 73.4, 98], rng, 0.35), 0, 0.22);
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
        velocity: 0.78 * sectionGain(t, seconds),
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
        velocity: 0.18 * sectionGain(t, seconds),
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
    for (const t of schedule(seconds, beat * 2, 0.2)) {
      const bass = renderReese({
        sampleRate,
        freq: pick(scale, rng) * 2,
        velocity: 0.38,
        hold: beat * 0.9,
      });
      mixInto(colorBus, bass, Math.floor((t + beat * 0.5) * sampleRate), 1);
    }
  } else if (g.id === "jazz") {
    mixInto(padBus, renderPad(n, sampleRate, [196, 247, 311], rng, 0.4), 0, 0.28);
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
        velocity: 0.55 * sectionGain(t, seconds),
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
        velocity: 0.18 * sectionGain(t, seconds),
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
    for (const t of schedule(seconds, beat, 0.12)) {
      const bass = renderDuoBass({
        sampleRate,
        freq: pick(scale, rng),
        velocity: 0.34,
        hold: beat * 0.55,
      });
      mixInto(colorBus, bass, Math.floor(t * sampleRate), 0.85);
    }
    for (const t of schedule(seconds, beat * 2, 0.25)) {
      mixInto(
        colorBus,
        renderSax({ sampleRate, freq: pick(SCALES.jazz, rng) * 2, velocity: 0.22, hold: beat * 0.8 }),
        Math.floor((t + beat * 0.25) * sampleRate),
        1,
      );
    }
  } else {
    const padFreqs = g.id === "jazz" ? [196, 247, 311] : [196, 247, 311.13, 392];
    mixInto(padBus, renderPad(n, sampleRate, padFreqs, rng, RIPPEL.ambientPad.attack), 0, dbLin(RIPPEL.ambientPad.volDb));
    for (const t of schedule(seconds, lock ? beat : beat * 2, 0.2)) {
      const hit = renderMembrane({
        sampleRate,
        freq: 36.7,
        octaves: 4.5,
        pitchDecay: 0.09,
        attack: 0.004,
        decay: 0.45,
        release: 0.6,
        velocity: 0.42 * sectionGain(t, seconds),
        floorHz: CRYSTAL.kickFloorHz,
      });
      mixInto(kickBus, hit, Math.floor(t * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat, 0.08)) {
      const at = lock ? t + beat * grid.and : t;
      if (at >= seconds - 0.08) continue;
      const hit = renderMetal({
        sampleRate,
        freq: 240,
        harmonicity: 4.8,
        modulationIndex: 22,
        resonance: 2800,
        attack: 0.004,
        decay: 0.18,
        release: 0.08,
        velocity: (lock ? 0.2 : 0.12) * sectionGain(t, seconds),
      });
      mixInto(hatBus, hit, Math.floor(at * sampleRate), 1);
    }
    for (const t of schedule(seconds, beat * 2, 0.2)) {
      mixInto(
        colorBus,
        renderRhodes({ sampleRate, freq: pick(SCALES.ambient, rng), velocity: 0.28 }),
        Math.floor((t + beat * (lock ? grid.a : 0.5)) * sampleRate),
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
    volDb: g.id === "ambient" ? -4 : g.id === "jazz" ? RIPPEL.jazzKick.volDb : g.id === "phonk" ? RIPPEL.phonk808.volDb : RIPPEL.technoKick.volDb,
  });
  const hatCh = applyBus(hatBus, sampleRate, {
    hp: g.id === "techno" || g.id === "phonk" ? CRYSTAL.hatAirHz : 2500,
    lp: 16000,
    eq: { low: -10, mid: -2, high: 3 },
    dist: 0.04,
    comp: RIPPEL.technoHat.comp,
    volDb: RIPPEL.technoHat.volDb,
  });
  const colorCh = applyBus(colorBus, sampleRate, {
    hp: 40,
    lp: g.id === "phonk" ? 7000 : 9000,
    eq: g.id === "techno" ? RIPPEL.technoBass.eq : g.id === "phonk" ? RIPPEL.phonkReese.eq : { low: 1, mid: 2, high: -3 },
    dist: g.id === "techno" ? RIPPEL.technoBass.dist : g.id === "phonk" ? RIPPEL.phonkReese.dist : 0.08,
    comp: RIPPEL.technoBass.comp,
    volDb: g.id === "techno" ? RIPPEL.technoBass.volDb : g.id === "phonk" ? RIPPEL.phonkReese.volDb : -8,
  });

  const kickEnv = envelopeFollow(kickCh, sampleRate, 0.003, 0.12);
  const glue = renderAirGlue(n, sampleRate, rng, g.id === "ambient" ? 0.045 : g.id === "phonk" ? 0.04 : 0.028);
  const mix = new Float64Array(n);
  const kickGain = g.id === "ambient" ? 0.62 : 0.9;
  const hatGain = g.id === "techno" || g.id === "phonk" ? 0.72 : 0.48;
  const padGain = g.id === "ambient" ? 0.55 : g.id === "jazz" ? 0.42 : g.id === "phonk" ? 0.48 : 0.12;
  for (let i = 0; i < n; i++) {
    const duck = 1 / (1 + CRYSTAL.sidechain * kickEnv[i] * 6);
    mix[i] =
      kickCh[i] * kickGain +
      hatCh[i] * hatGain +
      colorCh[i] * 0.7 * duck +
      padBus[i] * padGain * duck +
      glue[i];
  }

  const masterEq = makeEq3(sampleRate);
  const mEq = RIPPEL.mixer.masterEq;
  for (let i = 0; i < n; i++) {
    mix[i] = masterEq.step(mix[i], mEq.low, mEq.mid, mEq.high) * RIPPEL.mixer.masterVolume;
  }
  let glued = compress(mix, dbLin(RIPPEL.mixer.masterCompDb), g.id === "phonk" ? 6.5 : 4, sampleRate, 0.006, 0.14);
  const shaped = masterEnvelope(glued, sampleRate, seconds);
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
  resolveGenre,
  tempoFromSeed,
  motionGrid,
  gridTime,
  renderRippelBed,
  renderMembrane,
  renderMetal,
  renderDuoBass,
  renderCowbell,
  bandEnergy,
  highpassEnergy,
  zeroCrossRate,
  crestFactor,
};
