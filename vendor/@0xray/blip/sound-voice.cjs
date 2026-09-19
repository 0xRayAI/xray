/**
 * sound-voice — specific-sound bar for each live voice.
 * Genre taste is a mix. This organ is "is this cowbell a cowbell?"
 * Piddy + Rippel are the lineage. Ship bar is 8. Not costume.
 */

const rippel = require("./sound-rippel.cjs");

const AGENT = "sound-voice";
const SHIP_BAR = 8;
const SAMPLE_RATE = 44100;

const VOICE_SPECS = [
  { id: "membrane-kick", kind: "hit" },
  { id: "membrane-808", kind: "body" },
  { id: "membrane-sub", kind: "body" },
  { id: "reese-bass", kind: "body" },
  { id: "duo-bass", kind: "body" },
  { id: "metal-hat", kind: "air" },
  { id: "metal-cowbell", kind: "hit" },
  { id: "fm-lead", kind: "lead" },
  { id: "formant-stab", kind: "lead" },
  { id: "triangle-pad", kind: "pad" },
  { id: "rhodes-keys", kind: "lead" },
  { id: "vinyl-dust", kind: "dust" },
  { id: "static-drop", kind: "air" },
  { id: "wobble-bass", kind: "body" },
  { id: "drop-impact", kind: "hit" },
  { id: "808-slide", kind: "body" },
  { id: "chopped-vocal", kind: "lead" },
  { id: "duo-guitar", kind: "lead" },
];

function clampScore(n) {
  if (n <= 0) return 0;
  if (n >= 10) return 10;
  return n;
}

function rmsOf(samples) {
  if (!samples || !samples.length) return 0;
  let acc = 0;
  for (let i = 0; i < samples.length; i++) acc += samples[i] * samples[i];
  return Math.sqrt(acc / samples.length);
}

function peakOf(samples) {
  let p = 0;
  for (let i = 0; i < samples.length; i++) {
    const a = Math.abs(samples[i]);
    if (a > p) p = a;
  }
  return p;
}

function renderVoice(id) {
  const sr = SAMPLE_RATE;
  const p = rippel.RIPPEL;
  if (id === "membrane-kick") {
    const kick = p.technoKick;
    return rippel.renderMembrane({
      sampleRate: sr,
      freq: kick.noteHz,
      octaves: kick.octaves,
      pitchDecay: kick.pitchDecay,
      attack: kick.attack,
      decay: kick.decay,
      release: kick.release,
      velocity: 0.92,
      floorHz: rippel.CRYSTAL.kickFloorHz,
    });
  }
  if (id === "membrane-808") {
    const eight = p.phonk808;
    return rippel.renderMembrane({
      sampleRate: sr,
      freq: eight.noteHz,
      octaves: eight.octaves,
      pitchDecay: eight.pitchDecay,
      attack: eight.attack,
      decay: eight.decay,
      release: eight.release,
      velocity: 0.86,
      floorHz: rippel.CRYSTAL.eightOhEightFloorHz,
    });
  }
  if (id === "membrane-sub") {
    return rippel.renderMembrane({
      sampleRate: sr,
      freq: 36.7,
      octaves: 4.5,
      pitchDecay: 0.09,
      attack: 0.004,
      decay: 0.45,
      release: 0.6,
      velocity: 0.7,
      floorHz: rippel.CRYSTAL.kickFloorHz,
    });
  }
  if (id === "reese-bass") {
    return rippel.renderReese({ sampleRate: sr, freq: 55, velocity: 0.42, hold: 0.28 });
  }
  if (id === "duo-bass") {
    return rippel.renderDuoBass({ sampleRate: sr, freq: 65, velocity: 0.4, hold: 0.18 });
  }
  if (id === "metal-hat") {
    const hat = p.technoHat;
    return rippel.renderMetal({
      sampleRate: sr,
      freq: 380,
      harmonicity: hat.harmonicity,
      modulationIndex: hat.modulationIndex,
      resonance: hat.resonance,
      attack: hat.attack,
      decay: hat.decay,
      release: hat.release,
      velocity: 0.34,
    });
  }
  if (id === "metal-cowbell") {
    return rippel.renderCowbell({ sampleRate: sr, velocity: 0.55 });
  }
  if (id === "fm-lead") {
    return rippel.renderFmLead({ sampleRate: sr, freq: 440, velocity: 0.36, hold: 0.16 });
  }
  if (id === "formant-stab") {
    return rippel.renderFormant({ sampleRate: sr, freq: 220, velocity: 0.42, hold: 0.1 });
  }
  if (id === "triangle-pad") {
    return rippel.renderPad(
      Math.floor(1.2 * sr),
      sr,
      [220, 277, 330],
      (() => {
        let s = 0x51ad;
        return () => {
          s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
          return s / 0x100000000;
        };
      })(),
      0.12,
    );
  }
  if (id === "rhodes-keys") {
    return rippel.renderRhodes({ sampleRate: sr, freq: 330, velocity: 0.5 });
  }
  if (id === "vinyl-dust") {
    return rippel.renderVinylDust({ sampleRate: sr, seconds: 0.8, velocity: 0.2 });
  }
  if (id === "static-drop") {
    return rippel.renderStaticDrop({ sampleRate: sr, velocity: 0.5 });
  }
  if (id === "wobble-bass") {
    return rippel.renderWobble({ sampleRate: sr, freq: 55, velocity: 0.4, hold: 0.42, rate: 6.5 });
  }
  if (id === "drop-impact") {
    return rippel.renderDropImpact({ sampleRate: sr, velocity: 0.7 });
  }
  if (id === "808-slide") {
    return rippel.render808Slide({
      sampleRate: sr,
      fromHz: 55,
      toHz: p.phonk808.noteHz,
      velocity: 0.7,
      hold: 0.28,
    });
  }
  if (id === "chopped-vocal") {
    return rippel.renderChoppedVocal({
      sampleRate: sr,
      freq: 220,
      velocity: 0.3,
      chops: 3,
      grain: 0.05,
    });
  }
  if (id === "duo-guitar") {
    return rippel.renderRockGuitar({ sampleRate: sr, freq: 220, velocity: 0.4, hold: 0.16 });
  }
  return new Float64Array(0);
}

function scoreSeat(spec) {
  const samples = renderVoice(spec.id);
  const sr = SAMPLE_RATE;
  const rms = rmsOf(samples);
  const peak = peakOf(samples);
  const crest = rippel.crestFactor(samples);
  const low = rippel.bandEnergy(samples, sr, 20, 180);
  const mid = rippel.bandEnergy(samples, sr, 180, 1800);
  const high = rippel.bandEnergy(samples, sr, 1800, 9000);
  const head = rippel.windowRms(samples, sr, 0.03, 0.04);
  const body = rippel.windowRms(samples, sr, Math.min(0.18, samples.length / sr / 3), 0.08);
  const punch = body > 1e-6 ? head / body : head > 1e-6 ? 2 : 0;
  const fails = [];
  if (rms < 0.006) fails.push("presence");
  if (peak > 0.98) fails.push("clip");
  if (spec.kind === "hit" && punch < 1.02) fails.push("beater");
  if (spec.kind === "body" && low < mid * 0.35) fails.push("sub");
  if (spec.kind === "lead" && mid < 1e-5) fails.push("mid");
  if (spec.kind === "air" && high < 1e-5) fails.push("air");
  if (spec.kind === "dust") {
    const pops = countPops(samples, sr);
    if (pops < 4) fails.push("crackle");
    if (high < 1e-6) fails.push("dust");
  }
  if (spec.kind !== "dust" && spec.kind !== "pad" && crest < 1.45) fails.push("sine");
  if (spec.id === "metal-cowbell" && mid < high * 0.35) fails.push("clang");
  if (spec.id === "chopped-vocal") {
    const onsets = countOnsets(samples);
    if (onsets < 3) fails.push("chops");
  }
  if (spec.id === "wobble-bass" && crest < 2.4) fails.push("wobble");
  let score = 6.3 + Math.min(1.6, rms * 18) + Math.min(1.1, Math.max(0, crest - 1.4) * 0.45);
  if (spec.kind === "hit") score += Math.min(0.8, Math.max(0, punch - 1) * 1.4);
  if (spec.kind === "body") score += Math.min(0.7, low * 28);
  if (spec.kind === "lead") score += mid > 1e-5 ? 0.6 : 0;
  if (spec.kind === "air") score += high > 1e-5 ? 0.7 : 0;
  if (spec.kind === "dust") score += high > 1e-6 ? 0.8 : 0;
  if (spec.kind === "pad") score += mid > 1e-5 && low > 1e-6 ? 0.7 : 0;
  score = clampScore(score);
  if (score + 1e-9 < SHIP_BAR) fails.push("bar");
  return {
    id: spec.id,
    kind: spec.kind,
    score,
    rms,
    peak,
    crest,
    punch,
    fails,
    status: fails.length ? "FAIL" : "PASS",
  };
}

function countPops(samples, sr) {
  const hop = Math.max(32, Math.floor(sr / 400));
  let pops = 0;
  let armed = true;
  for (let i = 0; i < samples.length; i += hop) {
    let acc = 0;
    for (let j = i; j < i + hop && j < samples.length; j++) acc += samples[j] * samples[j];
    const local = Math.sqrt(acc / hop);
    if (armed && local > 0.012) {
      pops += 1;
      armed = false;
    } else if (local < 0.003) {
      armed = true;
    }
  }
  return pops;
}

function countOnsets(samples) {
  const hop = 64;
  let n = 0;
  let armed = true;
  for (let i = 0; i < samples.length; i += hop) {
    let acc = 0;
    for (let j = i; j < i + hop && j < samples.length; j++) acc += samples[j] * samples[j];
    const local = Math.sqrt(acc / hop);
    if (armed && local > 0.01) {
      n += 1;
      armed = false;
    } else if (local < 0.002) {
      armed = true;
    }
  }
  return n;
}

function voiceMatrix() {
  const seats = VOICE_SPECS.map(scoreSeat);
  const failed = seats.filter((s) => s.status === "FAIL");
  const score = seats.reduce((n, s) => n + s.score, 0) / seats.length;
  return {
    kind: "sound-voice",
    agent: AGENT,
    status: failed.length ? "FAIL" : "PASS",
    failClosed: true,
    shipBar: SHIP_BAR,
    score,
    counted: seats.length,
    failed: failed.length,
    seats,
  };
}

module.exports = {
  AGENT,
  SHIP_BAR,
  VOICE_SPECS,
  renderVoice,
  scoreSeat,
  voiceMatrix,
};
