/**
 * Lean headless port of Rippel instrument/mixer topology.
 * Tone.Offline is blocked in Node (no OfflineAudioContext) — see TONE_OFFLINE_BLOCKER.
 * Membrane / Metal / mixer chains follow Tone.js + Rippel professional*Instruments,
 * not the #62 three-sine bed. Not the 3k-line globalAudioManager.
 */

const TONE_OFFLINE_BLOCKER =
  "Tone.Offline blocked in Node: Missing the native OfflineAudioContext constructor. Lean Node port of MembraneSynth / MetalSynth / mixer topology.";

const ENGINE = "rippel-headless";

const GENRE_ALIASES = {
  ambient: "ambient",
  techno: "techno",
  jazz: "jazz",
  phonk: "phonk",
  destination: "ambient",
};

const GENRES = {
  ambient: {
    bpm: 72,
    voices: ["membrane-sub", "metal-air", "mixer"],
  },
  techno: {
    bpm: 128,
    voices: ["membrane-kick", "metal-hat", "mono-bass", "mixer"],
  },
  phonk: {
    bpm: 140,
    voices: ["membrane-808", "metal-hat", "cowbell", "mixer"],
  },
  jazz: {
    bpm: 96,
    voices: ["membrane-tom", "metal-ride", "brush", "mixer"],
  },
};

function resolveGenre(name) {
  const raw = String(name || "ambient")
    .trim()
    .toLowerCase();
  const id = GENRE_ALIASES[raw] || (GENRES[raw] ? raw : "ambient");
  const spec = GENRES[id];
  return { id, alias: raw !== id ? raw : null, bpm: spec.bpm, voices: [...spec.voices] };
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

function oneshotAmp(t, attack, decay) {
  return attackGain(t, attack) * expDecay(Math.max(0, t - attack), decay);
}

/** Tone MembraneSynth: sine + exponential pitch drop (octaves over pitchDecay). */
function renderMembrane({
  sampleRate,
  freq,
  octaves,
  pitchDecay,
  attack,
  decay,
  velocity,
}) {
  const dur = attack + decay + 0.08;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const endFreq = Math.max(0.5, freq * Math.pow(2, -octaves));
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f =
      t < pitchDecay ? freq * Math.pow(endFreq / freq, t / Math.max(pitchDecay, 1e-6)) : endFreq;
    out[i] = velocity * oneshotAmp(t, attack, decay) * Math.sin(phase);
    phase += (2 * Math.PI * f) / sampleRate;
  }
  return out;
}

/**
 * Tone MetalSynth: FM square/square + high resonance, short env.
 * Inharmonic clang for hats / air / ride — not a sine.
 */
function renderMetal({
  sampleRate,
  freq,
  harmonicity,
  modulationIndex,
  resonance,
  attack,
  decay,
  velocity,
}) {
  const dur = attack + decay + 0.04;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const hp = highpass(resonance, sampleRate);
  let carrierPhase = 0;
  let modPhase = 0;
  const modHz = freq * harmonicity;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const mod = square(modPhase);
    const carrier = square(carrierPhase + modulationIndex * 0.15 * mod);
    const amp = velocity * oneshotAmp(t, attack, decay);
    out[i] = hp.step(carrier * amp);
    carrierPhase += (2 * Math.PI * freq) / sampleRate;
    modPhase += (2 * Math.PI * modHz) / sampleRate;
  }
  return out;
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

/** MonoSynth-style saw + filter envelope (techno bass). */
function renderBass({ sampleRate, freq, attack, decay, velocity }) {
  const dur = attack + decay + 0.1;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const lp = lowpass(180, sampleRate);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const env = oneshotAmp(t, attack, decay);
    const saw = 2 * ((phase / (2 * Math.PI)) % 1) - 1;
    const bright = lp.step(saw) + 0.35 * env * saw;
    out[i] = velocity * env * bright;
    phase += (2 * Math.PI * freq) / sampleRate;
  }
  return out;
}

function renderCowbell({ sampleRate, velocity }) {
  const attack = 0.001;
  const decay = 0.16;
  const n = Math.floor((attack + decay + 0.04) * sampleRate);
  const out = new Float64Array(n);
  const hp = highpass(600, sampleRate);
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const amp = velocity * oneshotAmp(t, attack, decay);
    const mix = 0.6 * square(p1) + 0.4 * square(p2);
    out[i] = hp.step(mix * amp);
    p1 += (2 * Math.PI * 800) / sampleRate;
    p2 += (2 * Math.PI * 540) / sampleRate;
  }
  return out;
}

function renderBrush({ sampleRate, decay, velocity, rng }) {
  const attack = 0.004;
  const n = Math.floor((attack + decay + 0.04) * sampleRate);
  const out = new Float64Array(n);
  const hp = highpass(1800, sampleRate);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const noise = rng() * 2 - 1;
    out[i] = hp.step(velocity * oneshotAmp(t, attack, decay) * noise);
  }
  return out;
}

/** Glue body so chop/levels stay a bed, not a dry drum loop. */
function renderGluePad(n, sampleRate, freqs, rng) {
  const out = new Float64Array(n);
  const phases = freqs.map(() => rng() * Math.PI * 2);
  const lfo = freqs.map(() => 0.07 + rng() * 0.12);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let mix = 0;
    for (let v = 0; v < freqs.length; v++) {
      const drift = 1 + 0.03 * Math.sin(2 * Math.PI * lfo[v] * t + phases[v]);
      mix += Math.sin(2 * Math.PI * freqs[v] * drift * t + phases[v]);
    }
    out[i] = mix / freqs.length;
  }
  return out;
}

function compress(samples, threshold, ratio, sampleRate) {
  const out = new Float64Array(samples.length);
  let env = 0;
  const atk = 1 - Math.exp(-1 / (0.004 * sampleRate));
  const rel = 1 - Math.exp(-1 / (0.12 * sampleRate));
  for (let i = 0; i < samples.length; i++) {
    const x = Math.abs(samples[i]);
    env += (x > env ? atk : rel) * (x - env);
    const gain = env > threshold ? threshold / env + (1 - threshold / env) / ratio : 1;
    out[i] = samples[i] * gain;
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
    if (t < introHold) g = 0.34;
    else if (t < introHold + introEase) {
      const u = (t - introHold) / introEase;
      g = 0.34 + 0.66 * (0.5 - 0.5 * Math.cos(Math.PI * u));
    } else if (t >= fadeStart) {
      const u = (t - fadeStart) / Math.max(seconds - fadeStart, 1e-6);
      g = 1 - (0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, u)));
    }
    out[i] = samples[i] * g;
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

function scheduleHits(seconds, bpm, everyBeats) {
  const beat = 60 / bpm;
  const step = beat * everyBeats;
  const times = [];
  for (let t = 0; t < seconds - 0.12; t += step) times.push(t);
  return times;
}

function renderRippelBed({ brief, genre, seconds, seedHex, rng, sampleRate }) {
  void brief;
  const g = resolveGenre(genre);
  const n = Math.floor(sampleRate * seconds);
  const kickBus = new Float64Array(n);
  const hatBus = new Float64Array(n);
  const colorBus = new Float64Array(n);
  const glue = renderGluePad(
    n,
    sampleRate,
    g.id === "jazz" ? [196, 247, 294] : g.id === "phonk" ? [49, 73.5, 98] : [55, 82.5, 110],
    rng,
  );

  const kickSpec =
    g.id === "phonk"
      ? { freq: 36.7, octaves: 7.5, pitchDecay: 0.16, attack: 0.001, decay: 0.55, velocity: 0.92 }
      : g.id === "jazz"
        ? { freq: 73.4, octaves: 3.2, pitchDecay: 0.04, attack: 0.002, decay: 0.28, velocity: 0.55 }
        : g.id === "ambient"
          ? { freq: 36.7, octaves: 4.5, pitchDecay: 0.09, attack: 0.004, decay: 0.45, velocity: 0.5 }
          : { freq: 32.7, octaves: 6, pitchDecay: 0.05, attack: 0.001, decay: 0.42, velocity: 0.9 };

  const metalSpec =
    g.id === "phonk"
      ? { freq: 420, harmonicity: 5.4, modulationIndex: 36, resonance: 4500, attack: 0.001, decay: 0.07, velocity: 0.38 }
      : g.id === "jazz"
        ? { freq: 280, harmonicity: 4.2, modulationIndex: 18, resonance: 3200, attack: 0.002, decay: 0.22, velocity: 0.2 }
        : g.id === "ambient"
          ? { freq: 240, harmonicity: 4.8, modulationIndex: 22, resonance: 2800, attack: 0.004, decay: 0.22, velocity: 0.2 }
          : { freq: 380, harmonicity: 5.1, modulationIndex: 32, resonance: 4000, attack: 0.001, decay: 0.09, velocity: 0.22 };

  const kickEvery = g.id === "ambient" ? 2 : g.id === "jazz" ? 2 : 2;
  const hatEvery = g.id === "ambient" ? 0.5 : 0.5;

  for (const t of scheduleHits(seconds, g.bpm, kickEvery)) {
    const hit = renderMembrane({ sampleRate, ...kickSpec });
    mixInto(kickBus, hit, Math.floor(t * sampleRate), 1);
  }
  for (const t of scheduleHits(seconds, g.bpm, hatEvery)) {
    const jitter = (rng() - 0.5) * 0.004;
    const hit = renderMetal({ sampleRate, ...metalSpec });
    mixInto(hatBus, hit, Math.floor((t + jitter) * sampleRate), 1);
  }

  if (g.id === "techno") {
    for (const t of scheduleHits(seconds, g.bpm, 1)) {
      const bass = renderBass({
        sampleRate,
        freq: 55,
        attack: 0.01,
        decay: 0.28,
        velocity: 0.28,
      });
      mixInto(colorBus, bass, Math.floor(t * sampleRate), 1);
    }
  }
  if (g.id === "phonk") {
    for (const t of scheduleHits(seconds, g.bpm, 1)) {
      mixInto(colorBus, renderCowbell({ sampleRate, velocity: 0.28 }), Math.floor((t + 60 / g.bpm / 2) * sampleRate), 1);
    }
  }
  if (g.id === "jazz") {
    for (const t of scheduleHits(seconds, g.bpm, 1)) {
      mixInto(
        colorBus,
        renderBrush({ sampleRate, decay: 0.14, velocity: 0.18, rng }),
        Math.floor((t + 60 / g.bpm / 2) * sampleRate),
        1,
      );
    }
  }

  const mix = new Float64Array(n);
  const kickGain = g.id === "ambient" ? 0.55 : 0.8;
  const hatGain = g.id === "techno" || g.id === "phonk" ? 0.7 : g.id === "ambient" ? 0.55 : 0.4;
  const glueGain = g.id === "phonk" ? 0.14 : 0.2;
  for (let i = 0; i < n; i++) {
    mix[i] = kickBus[i] * kickGain + hatBus[i] * hatGain + colorBus[i] * 0.7 + glue[i] * glueGain;
  }

  const glued = compress(mix, 0.22, 5.5, sampleRate);
  const shaped = masterEnvelope(glued, sampleRate, seconds);
  const samples = normalize(shaped, 0.78);
  return {
    samples,
    sampleRate,
    seconds,
    seed: seedHex,
    genre: g,
    engine: ENGINE,
    toneOffline: TONE_OFFLINE_BLOCKER,
    topology: "membrane+metal+mixer",
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
  GENRE_ALIASES,
  GENRES,
  resolveGenre,
  renderRippelBed,
  renderMembrane,
  renderMetal,
  renderBass,
  renderCowbell,
  bandEnergy,
  highpassEnergy,
  zeroCrossRate,
  crestFactor,
};
