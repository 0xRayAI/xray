/**
 * Factory-sound spine: brief → checksum seed → genre → headless wav → metrics gate.
 * Lean Node. No browser. No Tone. Not mill inspect.
 */

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const SPINE = 1;
const SAMPLE_RATE = 44100;
const DEFAULT_SECONDS = 4;
const WINDOW_SEC = 0.25;
const INTRO_SEC = 0.75;
const FADE_SEC = 1;
const PEAK_LIMIT = 0.95;
const CHOP_MAX = 0.1;
const CHOP_STRONG = 0.05;
const LEVELS_RATIO_MIN = 1.5;
const LEVELS_RATIO_MAX = 3;
const BODY_MIN_RMS = 0.05;
const RECEIPT_REL = path.join(".xray", "sound-bed-receipt.json");
const WAV_REL = path.join(".xray", "sound", "bed.wav");

const GENRE_ALIASES = {
  ambient: "ambient",
  techno: "techno",
  jazz: "jazz",
  phonk: "techno",
  destination: "ambient",
};

const GENRES = {
  ambient: { bpm: 72, voices: ["pad", "air"] },
  techno: { bpm: 128, voices: ["pulse", "sub"] },
  jazz: { bpm: 96, voices: ["warm", "brush"] },
};

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function seedFromBrief(brief, genre) {
  const payload = canonicalJson({
    brief: String(brief || "").trim(),
    genre: resolveGenre(genre).id,
    spine: SPINE,
  });
  const digest = crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  return `0x${digest}`;
}

function mulberry32(seedU32) {
  let t = seedU32 >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seedU32(seedHex) {
  const hex = String(seedHex || "").replace(/^0x/, "").slice(0, 8);
  const n = Number.parseInt(hex, 16);
  return Number.isFinite(n) ? n >>> 0 : 1;
}

function resolveGenre(name) {
  const raw = String(name || "ambient")
    .trim()
    .toLowerCase();
  const id = GENRE_ALIASES[raw] || (GENRES[raw] ? raw : "ambient");
  const spec = GENRES[id];
  return { id, alias: raw !== id ? raw : null, bpm: spec.bpm, voices: [...spec.voices] };
}

function easeInOut(t) {
  const x = Math.min(1, Math.max(0, t));
  return 0.5 - 0.5 * Math.cos(Math.PI * x);
}

function envelope(t, seconds) {
  const introHold = 0.5;
  const introEase = 0.35;
  const fadeStart = Math.max(seconds - FADE_SEC, INTRO_SEC + 0.5);
  if (t < introHold) return 0.34;
  if (t < introHold + introEase) return 0.34 + 0.66 * easeInOut((t - introHold) / introEase);
  if (t >= fadeStart) return 1 - easeInOut((t - fadeStart) / Math.max(seconds - fadeStart, 1e-6));
  return 1;
}

function voicePartial(t, hz, phase, kind) {
  const w = 2 * Math.PI * hz * t + phase;
  if (kind === "pulse") return Math.tanh(2.2 * Math.sin(w));
  if (kind === "warm") return Math.sin(w) + 0.22 * Math.sin(2 * w);
  return Math.sin(w);
}

function renderSamples({ brief, genre, seconds, seed }) {
  const dur = Number(seconds) > 0 ? Number(seconds) : DEFAULT_SECONDS;
  const n = Math.floor(SAMPLE_RATE * dur);
  const g = resolveGenre(genre);
  const seedHex = seed || seedFromBrief(brief, g.id);
  const rng = mulberry32(seedU32(seedHex));
  const samples = new Float64Array(n);

  const fundamentals = g.id === "techno" ? [55, 82.5, 110] : g.id === "jazz" ? [196, 247, 294] : [98, 147, 196];
  const kinds = g.voices;
  const phases = fundamentals.map(() => rng() * Math.PI * 2);
  const lfoRates = fundamentals.map(() => 0.08 + rng() * 0.28);
  const lfoDepth = fundamentals.map(() => 0.035 + rng() * 0.045);
  const amps = [0.5, 0.46, 0.4];

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const env = envelope(t, dur);
    let mix = 0;
    for (let v = 0; v < fundamentals.length; v++) {
      const drift = 1 + lfoDepth[v] * Math.sin(2 * Math.PI * lfoRates[v] * t + phases[v]);
      const trem = 0.78 + 0.22 * Math.sin(2 * Math.PI * (lfoRates[v] * 0.65) * t + phases[(v + 1) % phases.length]);
      const kind = kinds[v % kinds.length] === "pulse" ? "pulse" : kinds[v % kinds.length] === "warm" ? "warm" : "sine";
      mix += amps[v] * trem * voicePartial(t, fundamentals[v] * drift, phases[v], kind);
    }
    samples[i] = mix * env;
  }

  let peak = 0;
  for (let i = 0; i < n; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const scale = peak > 0 ? 0.62 / peak : 0;
  for (let i = 0; i < n; i++) samples[i] *= scale;
  return { samples, sampleRate: SAMPLE_RATE, seconds: dur, seed: seedHex, genre: g };
}

function writeWav16Mono(file, samples, sampleRate = SAMPLE_RATE) {
  const n = samples.length;
  const dataSize = n * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < n; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(x * 32767), 44 + i * 2);
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, buf);
  return file;
}

function readWav16(file) {
  if (!file || !fs.existsSync(file)) {
    const err = new Error("wav missing");
    err.code = "SOUND_WAV_MISSING";
    throw err;
  }
  const buf = fs.readFileSync(file);
  if (buf.length < 44 || buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    const err = new Error("wav not riff/wave");
    err.code = "SOUND_WAV_BAD";
    throw err;
  }
  let offset = 12;
  let audioFormat = 0;
  let channels = 0;
  let sampleRate = 0;
  let bits = 0;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buf.length) {
    const id = buf.toString("ascii", offset, offset + 4);
    const size = buf.readUInt32LE(offset + 4);
    const start = offset + 8;
    if (id === "fmt ") {
      audioFormat = buf.readUInt16LE(start);
      channels = buf.readUInt16LE(start + 2);
      sampleRate = buf.readUInt32LE(start + 4);
      bits = buf.readUInt16LE(start + 14);
    } else if (id === "data") {
      dataOffset = start;
      dataSize = size;
      break;
    }
    offset = start + size + (size % 2);
  }
  if (audioFormat !== 1 || bits !== 16 || channels < 1 || dataOffset < 0) {
    const err = new Error("wav must be 16-bit PCM");
    err.code = "SOUND_WAV_BAD";
    throw err;
  }
  const frames = Math.floor(dataSize / (2 * channels));
  const samples = new Float64Array(frames);
  for (let i = 0; i < frames; i++) {
    samples[i] = buf.readInt16LE(dataOffset + i * 2 * channels) / 32768;
  }
  return { samples, sampleRate };
}

function rmsOf(samples, start = 0, end = samples.length) {
  const a = Math.max(0, start);
  const b = Math.min(samples.length, end);
  if (b <= a) return 0;
  let acc = 0;
  for (let i = a; i < b; i++) acc += samples[i] * samples[i];
  return Math.sqrt(acc / (b - a));
}

function windowRms(samples, sampleRate, windowSec = WINDOW_SEC) {
  const win = Math.max(1, Math.floor(sampleRate * windowSec));
  const out = [];
  for (let i = 0; i + win <= samples.length; i += win) {
    out.push(rmsOf(samples, i, i + win));
  }
  return out;
}

function goertzelPower(samples, start, end, sampleRate, freq) {
  const n = end - start;
  if (n < 8) return 0;
  const w = (2 * Math.PI * freq) / sampleRate;
  const coeff = 2 * Math.cos(w);
  let s0 = 0;
  let s1 = 0;
  let s2 = 0;
  for (let i = start; i < end; i++) {
    s0 = samples[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  const power = s1 * s1 + s2 * s2 - coeff * s1 * s2;
  return power > 0 ? power : 0;
}

function humBins() {
  const bins = [];
  const lo = Math.log(60);
  const hi = Math.log(1800);
  for (let i = 0; i < 20; i++) {
    bins.push(Math.exp(lo + ((hi - lo) * i) / 19));
  }
  return bins;
}

function failClosed(reason, extra) {
  return {
    status: "FAIL",
    failClosed: true,
    reason,
    ...extra,
  };
}

function evaluateMetrics(samples, sampleRate) {
  if (!samples || samples.length < Math.floor(sampleRate * 2)) {
    return failClosed("too-short", {
      metrics: { chop: { ok: false }, levels: { ok: false }, peak: { ok: false }, hum: { ok: false } },
    });
  }

  const rms = windowRms(samples, sampleRate);
  let chopMean = null;
  if (rms.length >= 2) {
    let acc = 0;
    for (let i = 1; i < rms.length; i++) acc += Math.abs(rms[i] - rms[i - 1]);
    chopMean = acc / (rms.length - 1);
  }
  const chop = {
    meanAbsDeltaRms: chopMean,
    max: CHOP_MAX,
    strong: CHOP_STRONG,
    ok: chopMean !== null && chopMean <= CHOP_MAX,
  };

  const introN = Math.floor(INTRO_SEC * sampleRate);
  const fadeN = Math.floor(FADE_SEC * sampleRate);
  const bodyEnd = samples.length - fadeN;
  const introRms = rmsOf(samples, 0, introN);
  const bodyMean = rmsOf(samples, introN, bodyEnd);
  const bodyWindows = windowRms(samples.subarray(introN, Math.max(introN, bodyEnd)), sampleRate);
  const bodyMin = bodyWindows.length ? Math.min(...bodyWindows) : 0;
  const ratio = introRms > 1e-9 ? bodyMean / introRms : Number.POSITIVE_INFINITY;
  const levels = {
    bodyIntroRatio: Number.isFinite(ratio) ? ratio : null,
    bodyMinRms: bodyMin,
    bodyMeanRms: bodyMean,
    introMeanRms: introRms,
    ratioMin: LEVELS_RATIO_MIN,
    ratioMax: LEVELS_RATIO_MAX,
    bodyMinRequired: BODY_MIN_RMS,
    ok:
      Number.isFinite(ratio) &&
      ratio >= LEVELS_RATIO_MIN &&
      ratio <= LEVELS_RATIO_MAX &&
      bodyMin >= BODY_MIN_RMS,
  };

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  const peakGate = { maxAbs: peak, max: PEAK_LIMIT, ok: peak < PEAK_LIMIT };

  const bins = humBins();
  const win = Math.max(1, Math.floor(sampleRate * WINDOW_SEC));
  const dominant = [];
  const centroids = [];
  let same = 0;
  let shareAcc = 0;
  let lastBin = -1;
  for (let i = 0; i + win <= samples.length; i += win) {
    let total = 0;
    let best = 0;
    let bestIdx = -1;
    let weighted = 0;
    for (let b = 0; b < bins.length; b++) {
      const p = goertzelPower(samples, i, i + win, sampleRate, bins[b]);
      total += p;
      weighted += p * bins[b];
      if (p > best) {
        best = p;
        bestIdx = b;
      }
    }
    const share = total > 0 ? best / total : 0;
    if (total > 0) centroids.push(weighted / total);
    dominant.push({ bin: bestIdx, share });
    if (lastBin === bestIdx) same += 1;
    lastBin = bestIdx;
    shareAcc += share;
  }
  const windows = dominant.length;
  const sameRatio = windows > 1 ? same / (windows - 1) : 1;
  const meanShare = windows ? shareAcc / windows : 1;
  let centroidMean = 0;
  for (const c of centroids) centroidMean += c;
  centroidMean = centroids.length ? centroidMean / centroids.length : 0;
  let centroidVar = 0;
  for (const c of centroids) centroidVar += (c - centroidMean) * (c - centroidMean);
  const centroidCv =
    centroids.length > 1 && centroidMean > 0
      ? Math.sqrt(centroidVar / centroids.length) / centroidMean
      : 0;
  const drone = sameRatio >= 0.75 && (meanShare >= 0.42 || centroidCv <= 0.03);
  const hum = {
    sameDominantRatio: sameRatio,
    meanDominantShare: meanShare,
    centroidCv,
    ok: !drone,
  };

  const gates = { chop: chop.ok, levels: levels.ok, peak: peakGate.ok, hum: hum.ok };
  const ok = gates.chop && gates.levels && gates.peak && gates.hum;
  return {
    status: ok ? "PASS" : "FAIL",
    failClosed: true,
    metrics: { chop, levels, peak: peakGate, hum },
    gates,
  };
}

function evaluateWavFile(file) {
  try {
    const wav = readWav16(file);
    return { ...evaluateMetrics(wav.samples, wav.sampleRate), wav: file, sampleRate: wav.sampleRate };
  } catch (err) {
    return failClosed(err instanceof Error ? err.message : String(err), {
      wav: file || null,
      metrics: { chop: { ok: false }, levels: { ok: false }, peak: { ok: false }, hum: { ok: false } },
    });
  }
}

function buildReceipt(input, evaled) {
  const genre = input.genre || { id: "ambient", bpm: 72, voices: ["pad", "air"] };
  return {
    kind: "sound-bed",
    status: evaled.status,
    failClosed: true,
    brief: String(input.brief || ""),
    seed: input.seed,
    genre: genre.id,
    alias: genre.alias || null,
    tempo: genre.bpm,
    voices: genre.voices,
    wav: input.wavRel || input.wav,
    durationSec: input.seconds,
    sampleRate: input.sampleRate || SAMPLE_RATE,
    metrics: evaled.metrics,
    gates: evaled.gates || {
      chop: false,
      levels: false,
      peak: false,
      hum: false,
    },
    reason: evaled.reason || null,
    spine: SPINE,
    writtenAt: new Date().toISOString(),
  };
}

function receiptPath(root) {
  return path.join(root, RECEIPT_REL);
}

function defaultWavPath(root) {
  return path.join(root, WAV_REL);
}

function writeReceipt(root, receipt) {
  const file = receiptPath(root);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(receipt, null, 2)}\n`);
  return file;
}

function readReceipt(root) {
  const file = receiptPath(root);
  if (!fs.existsSync(file)) return null;
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return { status: "FAIL", failClosed: true, reason: "receipt-unreadable" };
  }
}

function renderBed(opts = {}) {
  const root = opts.root || process.cwd();
  const brief = String(opts.brief || "factory-sound bed");
  const seconds = Number(opts.seconds) > 0 ? Number(opts.seconds) : DEFAULT_SECONDS;
  const wav = opts.out ? path.resolve(root, opts.out) : defaultWavPath(root);
  const rendered = renderSamples({ brief, genre: opts.genre, seconds, seed: opts.seed });
  writeWav16Mono(wav, rendered.samples, rendered.sampleRate);
  const evaled = evaluateMetrics(rendered.samples, rendered.sampleRate);
  const receipt = buildReceipt(
    {
      brief,
      seed: rendered.seed,
      genre: rendered.genre,
      wav,
      wavRel: path.relative(root, wav) || wav,
      seconds: rendered.seconds,
      sampleRate: rendered.sampleRate,
    },
    evaled,
  );
  writeReceipt(root, receipt);
  return { receipt, wav, seed: rendered.seed };
}

module.exports = {
  SPINE,
  SAMPLE_RATE,
  DEFAULT_SECONDS,
  RECEIPT_REL,
  WAV_REL,
  GENRE_ALIASES,
  GENRES,
  seedFromBrief,
  resolveGenre,
  renderSamples,
  writeWav16Mono,
  readWav16,
  evaluateMetrics,
  evaluateWavFile,
  renderBed,
  receiptPath,
  defaultWavPath,
  writeReceipt,
  readReceipt,
  buildReceipt,
};
