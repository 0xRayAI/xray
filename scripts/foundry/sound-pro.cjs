/**
 * Pro voices for the factory-sound mill.
 *
 * Lineage: Rippel membrane / metal FM / mixer topology
 * (htafolla/rippel-synapse-flow, headless port in @0xray/blip).
 * Tone.Offline is blocked in Node. These voices are the mill's own.
 *
 * The Magnetic Moves wind was not a noise bed. renderPad detuned every
 * partial and ran a slow cutoff LFO, and the mix ducked the pad and sub
 * by about 13–18 dB with a release that lasted most of the beat.
 * A steady pad has one fixed lowpass and exact pitches. The sub ducks
 * 4 dB and is back within 50 ms.
 */

const SAMPLE_RATE = 44100;
const DUCK_DB = 4;
const DUCK_ATTACK_SEC = 0.004;
const DUCK_RELEASE_SEC = 0.042;

function dbLin(db) {
  return Math.pow(10, db / 20);
}

function linDb(lin) {
  return 20 * Math.log10(Math.max(lin, 1e-12));
}

function midiHz(note) {
  return 440 * Math.pow(2, (note - 69) / 12);
}

function clamp(n, samples) {
  if (n <= 0) return new Float64Array(0);
  return samples.length === n ? samples : samples.subarray(0, n);
}

function biquadCoeffs(kind, freq, q, sampleRate) {
  const w0 = (2 * Math.PI * freq) / sampleRate;
  const cos = Math.cos(w0);
  const sin = Math.sin(w0);
  const alpha = sin / (2 * q);
  let b0;
  let b1;
  let b2;
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  if (kind === "lowpass") {
    b0 = (1 - cos) / 2;
    b1 = 1 - cos;
    b2 = (1 - cos) / 2;
  } else if (kind === "highpass") {
    b0 = (1 + cos) / 2;
    b1 = -(1 + cos);
    b2 = (1 + cos) / 2;
  } else {
    throw new Error(`unknown biquad ${kind}`);
  }
  return { b0: b0 / a0, b1: b1 / a0, b2: b2 / a0, a1: a1 / a0, a2: a2 / a0 };
}

function makeBiquad(kind, freq, q, sampleRate) {
  const c = biquadCoeffs(kind, freq, q, sampleRate);
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

function applyBiquad(samples, kind, freq, q, sampleRate) {
  const filter = makeBiquad(kind, freq, q, sampleRate);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = filter.step(samples[i]);
  return out;
}

function kWeightCoeffs(sampleRate) {
  const shelfF0 = 1681.974450955533;
  const shelfG = 3.999843853973347;
  const shelfQ = 0.7071752369554196;
  let K = Math.tan((Math.PI * shelfF0) / sampleRate);
  const Vh = Math.pow(10, shelfG / 20);
  const Vb = Math.pow(Vh, 0.4996667741545416);
  let a0 = 1 + K / shelfQ + K * K;
  const shelf = {
    b0: (Vh + (Vb * K) / shelfQ + K * K) / a0,
    b1: (2 * (K * K - Vh)) / a0,
    b2: (Vh - (Vb * K) / shelfQ + K * K) / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / shelfQ + K * K) / a0,
  };
  const hpF0 = 38.13547087602444;
  const hpQ = 0.5003270373238773;
  K = Math.tan((Math.PI * hpF0) / sampleRate);
  a0 = 1 + K / hpQ + K * K;
  const highpass = {
    b0: 1 / a0,
    b1: -2 / a0,
    b2: 1 / a0,
    a1: (2 * (K * K - 1)) / a0,
    a2: (1 - K / hpQ + K * K) / a0,
  };
  return { shelf, highpass };
}

function makeIir(c) {
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

function kWeight(samples, sampleRate) {
  const coeffs = kWeightCoeffs(sampleRate);
  const shelf = makeIir(coeffs.shelf);
  const highpass = makeIir(coeffs.highpass);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = highpass.step(shelf.step(samples[i]));
  return out;
}

function integratedLufs(left, right, sampleRate) {
  const L = kWeight(left, sampleRate);
  const R = kWeight(right, sampleRate);
  const block = Math.floor(0.4 * sampleRate);
  const hop = Math.floor(0.1 * sampleRate);
  if (L.length < block) return -Infinity;
  const powers = [];
  for (let i = 0; i + block <= L.length; i += hop) {
    let ms = 0;
    for (let j = 0; j < block; j++) ms += L[i + j] * L[i + j] + R[i + j] * R[i + j];
    powers.push(ms / block);
  }
  const absGate = Math.pow(10, (-70 + 0.691) / 10);
  const above = powers.filter((p) => p >= absGate);
  if (!above.length) return -Infinity;
  const meanAbs = above.reduce((sum, p) => sum + p, 0) / above.length;
  const relLufs = -0.691 + 10 * Math.log10(meanAbs) - 10;
  const relGate = Math.pow(10, (relLufs + 0.691) / 10);
  const gated = above.filter((p) => p >= relGate);
  const chosen = gated.length ? gated : above;
  const mean = chosen.reduce((sum, p) => sum + p, 0) / chosen.length;
  return -0.691 + 10 * Math.log10(mean);
}

function sincKernel(frac, half) {
  const weights = new Float64Array(half * 2 + 1);
  let acc = 0;
  for (let k = -half; k <= half; k++) {
    const dist = frac - k;
    const sinc = Math.abs(dist) < 1e-8 ? 1 : Math.sin(Math.PI * dist) / (Math.PI * dist);
    const i = k + half;
    const n = half * 2;
    const window =
      0.42 -
      0.5 * Math.cos((2 * Math.PI * i) / n) +
      0.08 * Math.cos((4 * Math.PI * i) / n);
    const w = sinc * window;
    weights[i] = w;
    acc += w;
  }
  if (acc !== 0) {
    for (let i = 0; i < weights.length; i++) weights[i] /= acc;
  }
  return weights;
}

const TP_HALF = 16;
const TP_KERNELS = [1, 2, 3].map((phase) => sincKernel(phase / 4, TP_HALF));

function oversamplePeak(samples) {
  const n = samples.length;
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const H = TP_HALF;
  for (let i = H; i < n - H - 1; i++) {
    for (let p = 0; p < TP_KERNELS.length; p++) {
      const kernel = TP_KERNELS[p];
      let y = 0;
      for (let k = -H; k <= H; k++) y += samples[i + k] * kernel[k + H];
      const a = Math.abs(y);
      if (a > peak) peak = a;
    }
  }
  return peak;
}

function truePeakDb(left, right) {
  return linDb(Math.max(oversamplePeak(left), oversamplePeak(right)));
}

function samplePeak(samples) {
  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  return peak;
}

function scale(samples, gain) {
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) out[i] = samples[i] * gain;
  return out;
}

function fitLoudness(left, right, sampleRate, targetLufs, ceilingDb) {
  const lufsIn = integratedLufs(left, right, sampleRate);
  const gLoud = dbLin(targetLufs - lufsIn);
  let L = scale(left, gLoud);
  let R = scale(right, gLoud);
  let gain = gLoud;
  let tp = truePeakDb(L, R);
  if (tp > ceilingDb) {
    const gCeil = dbLin(ceilingDb - tp);
    L = scale(L, gCeil);
    R = scale(R, gCeil);
    gain *= gCeil;
    tp = truePeakDb(L, R);
  }
  return { left: L, right: R, lufs: integratedLufs(L, R, sampleRate), truePeakDb: tp, gain };
}

function fftInPlace(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      const half = len >> 1;
      for (let k = 0; k < half; k++) {
        const uRe = re[i + k];
        const uIm = im[i + k];
        const vRe = re[i + k + half] * wRe - im[i + k + half] * wIm;
        const vIm = re[i + k + half] * wIm + im[i + k + half] * wRe;
        re[i + k] = uRe + vRe;
        im[i + k] = uIm + vIm;
        re[i + k + half] = uRe - vRe;
        im[i + k + half] = uIm - vIm;
        const nextRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextRe;
      }
    }
  }
}

function nextPow2(n) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function spectrumMag(samples) {
  const n = nextPow2(Math.min(samples.length, 16384));
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  const len = Math.min(n, samples.length);
  for (let i = 0; i < len; i++) {
    const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, len - 1));
    re[i] = samples[i] * w;
  }
  fftInPlace(re, im);
  const mag = new Float64Array(n / 2);
  for (let k = 0; k < mag.length; k++) mag[k] = Math.hypot(re[k], im[k]);
  return { mag, n };
}

function spectralFlatness(samples) {
  const { mag } = spectrumMag(samples);
  let logSum = 0;
  let arith = 0;
  let count = 0;
  for (let k = 1; k < mag.length; k++) {
    const p = mag[k] * mag[k] + 1e-20;
    logSum += Math.log(p);
    arith += p;
    count += 1;
  }
  if (!count || arith <= 0) return 0;
  return Math.exp(logSum / count) / (arith / count);
}

function spectralCentroid(samples, sampleRate) {
  const { mag, n } = spectrumMag(samples);
  const df = sampleRate / n;
  let num = 0;
  let den = 0;
  for (let k = 1; k < mag.length; k++) {
    const power = mag[k] * mag[k];
    num += k * df * power;
    den += power;
  }
  return den > 0 ? num / den : 0;
}

function peakHz(samples, sampleRate, loHz, hiHz) {
  const { mag, n } = spectrumMag(samples);
  const df = sampleRate / n;
  let best = 0;
  let bestK = 0;
  const k0 = Math.max(1, Math.floor(loHz / df));
  const k1 = Math.min(mag.length - 1, Math.ceil(hiHz / df));
  for (let k = k0; k <= k1; k++) {
    if (mag[k] > best) {
      best = mag[k];
      bestK = k;
    }
  }
  return bestK * df;
}

/** Local maxima, loudest first. Bin centres, so a short hit is coarse. */
function topPeaks(samples, sampleRate, count, loHz, hiHz) {
  const { mag, n } = spectrumMag(samples);
  const df = sampleRate / n;
  const k0 = Math.max(1, Math.floor(loHz / df));
  const k1 = Math.min(mag.length - 2, Math.ceil(hiHz / df));
  const peaks = [];
  for (let k = k0; k <= k1; k++) {
    if (mag[k] >= mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > 0) {
      peaks.push({ hz: k * df, mag: mag[k] });
    }
  }
  peaks.sort((a, b) => b.mag - a.mag);
  return peaks.slice(0, count);
}

function slice(samples, sampleRate, startSec, endSec) {
  const i0 = Math.max(0, Math.floor(startSec * sampleRate));
  const i1 = Math.min(samples.length, Math.floor(endSec * sampleRate));
  return samples.subarray(i0, Math.max(i0, i1));
}

function envelopeSwingDb(samples, sampleRate, startSec, endSec, winSec) {
  const win = Math.max(8, Math.floor(winSec * sampleRate));
  const hop = Math.max(1, Math.floor(win / 2));
  const i0 = Math.max(0, Math.floor(startSec * sampleRate));
  const i1 = Math.min(samples.length, Math.floor(endSec * sampleRate));
  let min = Infinity;
  let max = -Infinity;
  let windows = 0;
  for (let i = i0; i + win <= i1; i += hop) {
    let acc = 0;
    for (let j = 0; j < win; j++) acc += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(acc / win);
    if (rms < 1e-7) continue;
    const db = linDb(rms);
    if (db < min) min = db;
    if (db > max) max = db;
    windows += 1;
  }
  return {
    swingDb: windows ? max - min : 0,
    minDb: windows ? min : null,
    maxDb: windows ? max : null,
    windows,
  };
}

function hfRmsDb(samples, sampleRate, cutoffHz) {
  const hp = makeBiquad("highpass", cutoffHz, 0.707, sampleRate);
  let acc = 0;
  for (let i = 0; i < samples.length; i++) {
    const y = hp.step(samples[i]);
    acc += y * y;
  }
  return linDb(Math.sqrt(acc / Math.max(1, samples.length)));
}

function rmsOf(samples, sampleRate, startSec, endSec) {
  const part = slice(samples, sampleRate, startSec, endSec);
  if (!part.length) return 0;
  let acc = 0;
  for (let i = 0; i < part.length; i++) acc += part[i] * part[i];
  return Math.sqrt(acc / part.length);
}

/** Side energy relative to mid, in dB. Negative means the side is quieter. */
function sideUnderMidDb(left, right, sampleRate, startSec, endSec) {
  const i0 = Math.max(0, Math.floor(startSec * sampleRate));
  const i1 = Math.min(left.length, right.length, Math.floor(endSec * sampleRate));
  let mid = 0;
  let side = 0;
  const n = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) {
    const m = (left[i] + right[i]) * 0.5;
    const s = (left[i] - right[i]) * 0.5;
    mid += m * m;
    side += s * s;
  }
  return linDb(Math.sqrt(side / n)) - linDb(Math.sqrt(mid / n));
}

function frameBandMeanSquare(samples, offset, nfft, k0, k1) {
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  for (let i = 0; i < nfft; i++) re[i] = samples[offset + i];
  fftInPlace(re, im);
  let power = 0;
  const last = Math.min(k1, nfft / 2);
  for (let k = k0; k <= last; k++) {
    const mag2 = re[k] * re[k] + im[k] * im[k];
    const sides = k === 0 || k === nfft / 2 ? 1 : 2;
    power += sides * mag2;
  }
  return power / (nfft * nfft);
}

/**
 * RMS of a band, both channels, in dBFS.
 * Bins are a rectangular DFT so the number can sit next to a spectrum review.
 */
function bandRmsDb(left, right, sampleRate, startSec, endSec, loHz, hiHz) {
  const nfft = 8192;
  const hop = nfft / 2;
  const i0 = Math.max(0, Math.floor(startSec * sampleRate));
  const i1 = Math.min(left.length, right.length, Math.floor(endSec * sampleRate));
  const k0 = Math.max(0, Math.ceil(loHz / (sampleRate / nfft)));
  const k1 = Math.min(nfft / 2, Math.floor(hiHz / (sampleRate / nfft)));
  let acc = 0;
  let frames = 0;
  for (let i = i0; i + nfft <= i1; i += hop) {
    acc += frameBandMeanSquare(left, i, nfft, k0, k1);
    acc += frameBandMeanSquare(right, i, nfft, k0, k1);
    frames += 1;
  }
  if (!frames) return -240;
  return linDb(Math.sqrt(acc / (frames * 2)));
}

function normalizePeak(samples, peak) {
  const current = samplePeak(samples);
  if (current <= 0) return samples;
  return scale(samples, peak / current);
}

/** Sine membrane. Pitch drop is the beater. No click sample and no distortion. */
function renderKickClean(sampleRate) {
  const dur = 0.2;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const f0 = 128;
  const f1 = 49;
  const drop = 0.05;
  const lp = makeBiquad("lowpass", 240, 0.707, sampleRate);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f = t < drop ? f0 * Math.pow(f1 / f0, t / drop) : f1;
    let env = Math.exp(-t / 0.05);
    if (t < 0.002) env *= t / 0.002;
    const tail = dur - t;
    if (tail < 0.01) env *= tail / 0.01;
    out[i] = lp.step(Math.sin(phase)) * env;
    phase += (2 * Math.PI * f) / sampleRate;
  }
  return normalizePeak(out, 1);
}

/**
 * Clean kick plus a pitched tick. The tick is a 2.8 kHz sine, 4 ms,
 * band-limited to 2–4 kHz, and peaked well under the body.
 * No noise burst and no distortion.
 */
function renderKickTicked(sampleRate) {
  return addKickTick(renderKickClean(sampleRate), sampleRate);
}

/**
 * Fuller sine body. The pitch settles near 44 Hz and the decay holds
 * the fundamental. Still one sine through a lowpass. No click, no distortion.
 */
function renderKickBody(sampleRate) {
  const dur = 0.32;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const f0 = 78;
  const f1 = 44;
  const drop = 0.035;
  const lp = makeBiquad("lowpass", 160, 0.707, sampleRate);
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const f = t < drop ? f0 * Math.pow(f1 / f0, t / drop) : f1;
    let env = Math.exp(-t / 0.12);
    if (t < 0.012) env *= t / 0.012;
    const tail = dur - t;
    if (tail < 0.02) env *= tail / 0.02;
    out[i] = lp.step(Math.sin(phase)) * env;
    phase += (2 * Math.PI * f) / sampleRate;
  }
  return normalizePeak(out, 1);
}

function renderKickFull(sampleRate) {
  return addKickTick(renderKickBody(sampleRate), sampleRate);
}

function addKickTick(body, sampleRate) {
  const dur = 0.004;
  const n = Math.floor(dur * sampleRate);
  const raw = new Float64Array(body.length);
  const freq = 2800;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const fade = t < 0.00035 ? t / 0.00035 : 1;
    raw[i] = Math.sin(phase) * Math.exp(-t / 0.0011) * fade;
    phase += (2 * Math.PI * freq) / sampleRate;
  }
  const limited = applyBiquad(
    applyBiquad(raw, "highpass", 2000, 0.707, sampleRate),
    "lowpass",
    4000,
    0.707,
    sampleRate,
  );
  const peak = samplePeak(limited);
  const gain = peak > 0 ? dbLin(-20) / peak : 0;
  const out = new Float64Array(body.length);
  for (let i = 0; i < out.length; i++) out[i] = body[i] + limited[i] * gain;
  return out;
}

/**
 * v4 clap. Partials at 327, 690, 1240 and 410 Hz are not a harmonic series
 * (about 2.11×, 3.79× and 1.25×), and the longest one rings for 110 ms.
 * In a dark mix that stack reads as a cowbell. v5 uses renderSnap.
 */
function renderClapTonal(sampleRate) {
  const dur = 0.11;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const partials = [
    { f: 327, decay: 0.016, at: 0 },
    { f: 690, decay: 0.026, at: 0.006 },
    { f: 1240, decay: 0.018, at: 0.012 },
    { f: 410, decay: 0.038, at: 0.009 },
  ];
  for (let p = 0; p < partials.length; p++) {
    const part = partials[p];
    const i0 = Math.floor(part.at * sampleRate);
    let phase = 0;
    for (let i = i0; i < n; i++) {
      const t = (i - i0) / sampleRate;
      const fade = t < 0.0012 ? t / 0.0012 : 1;
      out[i] += Math.sin(phase) * Math.exp(-t / part.decay) * fade;
      phase += (2 * Math.PI * part.f) / sampleRate;
    }
  }
  return normalizePeak(out, 1);
}

/**
 * Short filtered snap. One fundamental and its first two harmonics,
 * a 4 ms flam, and a 12 ms decay. No inharmonic bell partials.
 */
function renderSnap(sampleRate) {
  const dur = 0.04;
  const n = Math.floor(dur * sampleRate);
  const raw = new Float64Array(n);
  const f0 = 210;
  const harms = [1, 0.45, 0.18];
  const flam = Math.floor(0.004 * sampleRate);
  let weight = 0;
  for (let h = 0; h < harms.length; h++) weight += harms[h];
  for (let pass = 0; pass < 2; pass++) {
    const i0 = pass === 0 ? 0 : flam;
    const amp = pass === 0 ? 1 : 0.45;
    let phase = 0;
    for (let i = i0; i < n; i++) {
      const t = (i - i0) / sampleRate;
      const fade = t < 0.001 ? t / 0.001 : 1;
      const env = Math.exp(-t / 0.012) * fade * amp;
      let mix = 0;
      for (let h = 0; h < harms.length; h++) mix += harms[h] * Math.sin(phase * (h + 1));
      raw[i] += (mix / weight) * env;
      phase += (2 * Math.PI * f0) / sampleRate;
    }
  }
  return normalizePeak(applyBiquad(raw, "lowpass", 700, 0.7, sampleRate), 1);
}

/**
 * One bass note. Sine sub, optional odd-harmonic mid through a one-pole
 * that opens near 600 Hz and falls toward 180 Hz. The envelope is the note.
 */
function renderBassNote(sampleRate, freq, withMid, opts) {
  const dur = opts && opts.dur != null ? opts.dur : 0.06;
  const decay = opts && opts.decay != null ? opts.decay : 0.022;
  const n = Math.floor(dur * sampleRate);
  const sub = new Float64Array(n);
  const mid = new Float64Array(n);
  let phase = 0;
  let lp = 0;
  const floor = opts && opts.midFloor != null ? opts.midFloor : 180;
  const open = opts && opts.midOpen != null ? opts.midOpen : 420;
  const midGain = opts && opts.midGain != null ? opts.midGain : 0.55;
  const drift = Boolean(opts && opts.drift);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const attack = t < 0.003 ? t / 0.003 : 1;
    const env = Math.exp(-t / decay) * attack;
    const f = drift ? freq * Math.pow(0.97, t / dur) : freq;
    const s = Math.sin(phase);
    sub[i] = s * env;
    if (withMid) {
      const sq = s + 0.34 * Math.sin(phase * 3) + 0.16 * Math.sin(phase * 5);
      const cutoff = floor + open * Math.exp(-t / 0.03);
      const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
      lp += alpha * (sq - lp);
      mid[i] = lp * env * midGain;
    }
    phase += (2 * Math.PI * f) / sampleRate;
  }
  return { sub, mid };
}

/** Metal hat: 2-op sine FM, no noise oscillator. */
function renderHatFm(sampleRate, open) {
  const dur = open ? 0.055 : 0.02;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const carrierHz = open ? 3400 : 4100;
  const modHz = open ? 5900 : 7100;
  const hp = makeBiquad("highpass", 4500, 0.707, sampleRate);
  let carrier = 0;
  let mod = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const fade = t < 0.0007 ? t / 0.0007 : 1;
    const env = Math.exp(-t / (open ? 0.016 : 0.005)) * fade;
    const index = (open ? 1.8 : 1.15) * Math.exp(-t / 0.008);
    out[i] = hp.step(Math.sin(carrier + Math.sin(mod) * index)) * env;
    carrier += (2 * Math.PI * carrierHz) / sampleRate;
    mod += (2 * Math.PI * modHz) / sampleRate;
  }
  return normalizePeak(out, 1);
}

/**
 * Soft hat. Low FM index, short decay, band-limited.
 * A tone, not a noise hash.
 */
function renderHatSoft(sampleRate, open) {
  const dur = open ? 0.028 : 0.011;
  const n = Math.floor(dur * sampleRate);
  const raw = new Float64Array(n);
  const carrierHz = open ? 4600 : 5800;
  const modHz = open ? 6400 : 8100;
  let carrier = 0;
  let mod = 0;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const fade = t < 0.00045 ? t / 0.00045 : 1;
    const env = Math.exp(-t / (open ? 0.009 : 0.0035)) * fade;
    const index = (open ? 0.65 : 0.4) * Math.exp(-t / 0.003);
    raw[i] = Math.sin(carrier + Math.sin(mod) * index) * env;
    carrier += (2 * Math.PI * carrierHz) / sampleRate;
    mod += (2 * Math.PI * modHz) / sampleRate;
  }
  const shaped = applyBiquad(
    applyBiquad(raw, "highpass", 3800, 0.707, sampleRate),
    "lowpass",
    7800,
    0.707,
    sampleRate,
  );
  return normalizePeak(shaped, 1);
}

/** DX-style pluck. Index falls fast so the tone settles to a sine. No noise. */
function renderFmPluck(sampleRate, freq, opts) {
  const decay = opts && opts.decay != null ? opts.decay : 0.085;
  const dur = opts && opts.dur != null ? opts.dur : 0.26;
  const moving = Boolean(opts && opts.moving);
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const lp = makeBiquad("lowpass", 2600, 0.707, sampleRate);
  let carrier = 0;
  let mod = 0;
  let one = 0;
  const harmonicity = 2;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const fade = t < 0.003 ? t / 0.003 : 1;
    const env = Math.exp(-t / decay) * fade;
    const index = 4.2 * Math.exp(-t / 0.03);
    const raw = Math.sin(carrier + Math.sin(mod) * index);
    let y;
    if (moving) {
      const bright = Boolean(opts && opts.bright);
      const cutoff = opts && opts.dark
        ? 1100 + 900 * Math.exp(-t / 0.03)
        : bright
          ? 1700 + 2300 * Math.exp(-t / 0.03)
          : 900 + 1500 * Math.exp(-t / 0.04);
      const alpha = 1 - Math.exp((-2 * Math.PI * cutoff) / sampleRate);
      one += alpha * (raw - one);
      y = one;
    } else {
      y = lp.step(raw);
    }
    out[i] = y * env;
    carrier += (2 * Math.PI * freq) / sampleRate;
    mod += (2 * Math.PI * freq * harmonicity) / sampleRate;
  }
  return normalizePeak(out, 1);
}

/**
 * Short filtered pluck. A soft body plus a broad 1.7–4.3 kHz formant
 * that dies in about 50 ms. Three slight detunes. No FM ping, no held tone.
 */
function renderFilterPluck(sampleRate, freq, opts) {
  const decay = opts && opts.decay != null ? opts.decay : 0.055;
  const dur = opts && opts.dur != null ? opts.dur : 0.15;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const ratios = [-5, 0, 5].map((cents) => Math.pow(2, cents / 1200));
  const upper = [];
  for (let k = 2; k <= 18; k++) {
    const partial = freq * k;
    if (partial >= 1700 && partial <= 4300) upper.push(k);
  }
  const phases = [0, 0, 0];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const attack = t < 0.0055 ? t / 0.0055 : 1;
    const bodyEnv = Math.exp(-t / decay) * attack;
    const presEnv = Math.exp(-t / 0.05) * attack;
    let body = 0;
    let pres = 0;
    let presW = 0;
    for (let v = 0; v < ratios.length; v++) {
      const phase = phases[v];
      body += Math.sin(phase) + 0.48 * Math.sin(phase * 2 + 0.8) + 0.22 * Math.sin(phase * 3 + 1.7);
      for (let p = 0; p < upper.length; p++) {
        const partial = freq * upper[p] * ratios[v];
        const x = (partial - 2800) / 1200;
        const amp = Math.exp(-0.5 * x * x);
        pres += amp * Math.sin(phase * upper[p] + upper[p] * 0.9);
        presW += amp;
      }
      phases[v] += (2 * Math.PI * freq * ratios[v]) / sampleRate;
    }
    body /= ratios.length * 1.7;
    if (presW > 0) pres /= presW;
    out[i] = body * bodyEnv + pres * presEnv * 1.05;
  }
  return normalizePeak(applyBiquad(out, "highpass", 140, 0.707, sampleRate), 1);
}

/**
 * Same pluck. The 1.7–4.3 kHz formant is the attack.
 * After 40 ms the 196 Hz body is louder than that formant, so the note arrives.
 */
function renderFilterPluckAttack(sampleRate, freq) {
  const decay = 0.055;
  const dur = 0.15;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const ratios = [-5, 0, 5].map((cents) => Math.pow(2, cents / 1200));
  const count = 18;
  const partials = [];
  let weight = 0;
  for (let p = 0; p < count; p++) {
    const u = (p + 0.5) / count;
    const partial = 1700 * Math.pow(4300 / 1700, u);
    const x = (partial - 2800) / 900;
    const amp = Math.exp(-0.5 * x * x);
    partials.push({
      freq: partial,
      amp,
      phase: (p * 2.399963) % (2 * Math.PI),
    });
    weight += amp * amp;
  }
  const presNorm = Math.sqrt(weight * 0.5);
  const phases = [0.2, 1.1, 2.4];
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let presEnv = t < 0.0025 ? t / 0.0025 : 1;
    if (t > 0.02) presEnv *= Math.exp(-(t - 0.02) / 0.04);
    if (t > 0.04) presEnv *= Math.exp(-(t - 0.04) / 0.008);
    const bodyIn = t < 0.04 ? 0 : Math.min(1, (t - 0.04) / 0.008);
    const bodyEnv = Math.exp(-Math.max(0, t - 0.04) / decay) * bodyIn;
    let body = 0;
    for (let v = 0; v < ratios.length; v++) {
      const phase = phases[v];
      body += Math.sin(phase) + 0.48 * Math.sin(phase * 2 + 0.8) + 0.22 * Math.sin(phase * 3 + 1.7);
      phases[v] += (2 * Math.PI * freq * ratios[v]) / sampleRate;
    }
    body /= ratios.length * 1.7;
    let pres = 0;
    for (let p = 0; p < partials.length; p++) {
      const part = partials[p];
      pres += part.amp * Math.sin(2 * Math.PI * part.freq * t + part.phase);
    }
    out[i] = body * bodyEnv + (pres / presNorm) * presEnv;
  }
  return normalizePeak(applyBiquad(out, "highpass", 140, 0.707, sampleRate), 1);
}

/** Warm stab: a few harmonics, one fixed lowpass, short decay. */
function renderWarmStab(sampleRate, freqs, opts) {
  const dur = opts && opts.dur != null ? opts.dur : 0.2;
  const decay = opts && opts.decay != null ? opts.decay : 0.065;
  const n = Math.floor(dur * sampleRate);
  const out = new Float64Array(n);
  const lp = makeBiquad("lowpass", 980, 0.75, sampleRate);
  const harms = [1, 0.5, 0.22, 0.09];
  const weight = freqs.length * harms.reduce((sum, h) => sum + h, 0);
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    const fade = t < 0.004 ? t / 0.004 : 1;
    const env = Math.exp(-t / decay) * fade;
    let mix = 0;
    for (let v = 0; v < freqs.length; v++) {
      const f = midiHz(freqs[v]);
      for (let h = 0; h < harms.length; h++) {
        mix += harms[h] * Math.sin(2 * Math.PI * f * (h + 1) * t);
      }
    }
    out[i] = lp.step(mix / weight) * env;
  }
  return normalizePeak(out, 1);
}

/**
 * One chord, exact pitches, fixed lowpass. rng is ignored so a caller that
 * used to pass a detune seed cannot put the beating back.
 */
function renderPadSteady(n, sampleRate, freqs, _rng, attack) {
  const out = new Float64Array(n);
  const lp = makeBiquad("lowpass", 1200, 0.707, sampleRate);
  const atk = attack == null ? 0.03 : attack;
  const weights = [1, 0.7, 0.46, 0.28];
  let norm = 0;
  for (let v = 0; v < freqs.length; v++) norm += weights[v] || 0.2;
  for (let i = 0; i < n; i++) {
    const t = i / sampleRate;
    let env = 1;
    if (atk > 0 && t < atk) {
      const u = t / atk;
      env = u * u * (3 - 2 * u);
    }
    let mix = 0;
    for (let v = 0; v < freqs.length; v++) {
      mix += (weights[v] || 0.2) * Math.sin((2 * Math.PI * freqs[v] * t));
    }
    out[i] = lp.step(mix / norm) * env;
  }
  return out;
}

function smoothstep(u) {
  const x = Math.min(1, Math.max(0, u));
  return x * x * (3 - 2 * x);
}

/** Gain curve. Minimum is -depthDb. Unity returns inside attack + release. */
function duckGain(n, sampleRate, times, depthDb, attackSec, releaseSec) {
  const gain = new Float64Array(n);
  gain.fill(1);
  const floor = dbLin(-depthDb);
  const aN = Math.max(1, Math.floor(attackSec * sampleRate));
  const rN = Math.max(1, Math.floor(releaseSec * sampleRate));
  for (let k = 0; k < times.length; k++) {
    const i0 = Math.floor(times[k] * sampleRate);
    for (let i = 0; i < aN; i++) {
      const idx = i0 + i;
      if (idx < 0 || idx >= n) continue;
      const target = 1 - (1 - floor) * ((i + 1) / aN);
      if (target < gain[idx]) gain[idx] = target;
    }
    for (let i = 0; i < rN; i++) {
      const idx = i0 + aN + i;
      if (idx < 0 || idx >= n) continue;
      const target = floor + (1 - floor) * smoothstep((i + 1) / rN);
      if (target < gain[idx]) gain[idx] = target;
    }
  }
  return gain;
}

function applyGain(samples, gain) {
  const out = new Float64Array(samples.length);
  const n = Math.min(samples.length, gain.length);
  for (let i = 0; i < n; i++) out[i] = samples[i] * gain[i];
  return out;
}

function addAt(dest, src, at, gain) {
  const i0 = Math.floor(at);
  for (let i = 0; i < src.length; i++) {
    const j = i0 + i;
    if (j >= 0 && j < dest.length) dest[j] += src[i] * gain;
  }
}

function delaySamples(samples, sampleRate, seconds) {
  const d = Math.floor(seconds * sampleRate);
  const out = new Float64Array(samples.length);
  for (let i = d; i < samples.length; i++) out[i] = samples[i - d];
  return out;
}

/** Short damped room. Comb lengths are fixed. Input should already be send-only. */
function shortReverb(samples, sampleRate, decaySec, dampHz) {
  const combSec = [0.031, 0.037, 0.041, 0.047];
  const combs = combSec.map((sec) => ({
    buf: new Float64Array(Math.max(8, Math.floor(sec * sampleRate))),
    i: 0,
    fb: Math.pow(0.001, sec / decaySec),
    lp: 0,
  }));
  const allpassSec = [0.0051, 0.0017];
  const allpass = allpassSec.map((sec) => ({
    buf: new Float64Array(Math.max(4, Math.floor(sec * sampleRate))),
    i: 0,
  }));
  const damp = Math.exp((-2 * Math.PI * dampHz) / sampleRate);
  const hp = makeBiquad("highpass", 220, 0.707, sampleRate);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const x = samples[i];
    let sum = 0;
    for (let c = 0; c < combs.length; c++) {
      const comb = combs[c];
      const delayed = comb.buf[comb.i];
      comb.lp = (1 - damp) * delayed + damp * comb.lp;
      comb.buf[comb.i] = x + comb.lp * comb.fb;
      comb.i = (comb.i + 1) % comb.buf.length;
      sum += delayed;
    }
    let y = sum / combs.length;
    for (let a = 0; a < allpass.length; a++) {
      const ap = allpass[a];
      const delayed = ap.buf[ap.i];
      const v = y + delayed * 0.5;
      ap.buf[ap.i] = v;
      ap.i = (ap.i + 1) % ap.buf.length;
      y = delayed - 0.5 * v;
    }
    out[i] = hp.step(y);
  }
  return out;
}

/** Filtered echo. Feedback stays low so the tail does not pump. */
function filteredDelay(samples, sampleRate, timeSec, feedback, dampHz) {
  const d = Math.max(8, Math.floor(timeSec * sampleRate));
  const buf = new Float64Array(d);
  let idx = 0;
  let lp = 0;
  const damp = Math.exp((-2 * Math.PI * dampHz) / sampleRate);
  const out = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const delayed = buf[idx];
    lp = (1 - damp) * delayed + damp * lp;
    out[i] = delayed;
    buf[idx] = samples[i] + lp * feedback;
    idx = (idx + 1) % d;
  }
  return out;
}

/** Linked gentle bus glue. A ratio near 1.5:1, not a sidechain pump. */
function glueStereo(left, right, sampleRate, thresholdDb, ratio, attackSec, releaseSec) {
  const threshold = dbLin(thresholdDb);
  const a = Math.exp(-1 / (attackSec * sampleRate));
  const r = Math.exp(-1 / (releaseSec * sampleRate));
  const L = new Float64Array(left.length);
  const R = new Float64Array(right.length);
  let env = 0;
  let minGain = 1;
  for (let i = 0; i < left.length; i++) {
    const x = Math.max(Math.abs(left[i]), Math.abs(right[i]));
    env = x > env ? a * env + (1 - a) * x : r * env + (1 - r) * x;
    let gain = 1;
    if (env > threshold) gain = Math.pow(env / threshold, 1 / ratio - 1);
    if (gain < minGain) minGain = gain;
    L[i] = left[i] * gain;
    R[i] = right[i] * gain;
  }
  return { left: L, right: R, reductionDb: linDb(minGain) };
}

function silence(n) {
  return new Float64Array(n);
}

function writeWav(file, left, right, sampleRate, fs) {
  const n = left.length;
  const channels = 2;
  const buf = Buffer.alloc(44 + n * channels * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * channels * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * channels * 2, 28);
  buf.writeUInt16LE(channels * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * channels * 2, 40);
  for (let i = 0; i < n; i++) {
    const l = Math.max(-1, Math.min(1, left[i]));
    const r = Math.max(-1, Math.min(1, right[i]));
    buf.writeInt16LE(Math.round(l * 32767), 44 + (i * 2) * 2);
    buf.writeInt16LE(Math.round(r * 32767), 44 + (i * 2 + 1) * 2);
  }
  fs.writeFileSync(file, buf);
}

function readWavStereo(file, fs) {
  const buf = fs.readFileSync(file);
  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const data = 44;
  const n = Math.floor((buf.length - data) / (channels * 2));
  const left = new Float64Array(n);
  const right = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    left[i] = buf.readInt16LE(data + (i * channels) * 2) / 32768;
    right[i] = channels > 1 ? buf.readInt16LE(data + (i * channels + 1) * 2) / 32768 : left[i];
  }
  return { left, right, sampleRate };
}

module.exports = {
  SAMPLE_RATE,
  DUCK_DB,
  DUCK_ATTACK_SEC,
  DUCK_RELEASE_SEC,
  dbLin,
  linDb,
  midiHz,
  clamp,
  renderKickClean,
  renderKickTicked,
  renderKickBody,
  renderKickFull,
  renderClapTonal,
  renderSnap,
  renderBassNote,
  renderHatFm,
  renderHatSoft,
  renderFmPluck,
  renderFilterPluck,
  renderFilterPluckAttack,
  renderWarmStab,
  renderPadSteady,
  duckGain,
  applyGain,
  addAt,
  delaySamples,
  shortReverb,
  filteredDelay,
  glueStereo,
  silence,
  scale,
  fitLoudness,
  integratedLufs,
  truePeakDb,
  samplePeak,
  spectralFlatness,
  spectralCentroid,
  peakHz,
  topPeaks,
  slice,
  envelopeSwingDb,
  hfRmsDb,
  rmsOf,
  sideUnderMidDb,
  bandRmsDb,
  normalizePeak,
  applyBiquad,
  writeWav,
  readWavStereo,
  smoothstep,
};
