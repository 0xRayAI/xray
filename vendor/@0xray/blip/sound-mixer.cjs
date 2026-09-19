/**
 * sound-mixer — tuner for hats, plate, glue, phrase, and full-track layers.
 * Listens to the whole 4.44s. Every voice is a stack, not a queue.
 * Inspect is the last-bed gate. Not costume. Not mill.
 */

const fs = require("fs");
const path = require("path");
const bed = require("./sound-bed.cjs");
const rippel = require("./sound-rippel.cjs");

const AGENT = "sound-mixer";
const LOCK_SECONDS = 4.44;
const UNLOCK_SECONDS = 4;
const GENRE_IDS = ["ambient", "techno", "jazz", "phonk", "rock", "timeless"];
const ROOTS = [0, 2, 4];
const RECEIPT_REL = path.join(".xray", "sound-mix-receipt.json");
const AIR_HZ = 6000;
const TURN_WIN = 0.2;
const AIR_AT_WIN = 0.08;
const AIR_AFTER_OFF = 0.12;
const AIR_AFTER_WIN = 0.12;

const MIX_GATES = {
  peakMax: 0.88,
  hangMax: {
    ambient: 0.66,
    timeless: 0.66,
    jazz: 0.58,
    techno: 0.45,
    phonk: 0.45,
    rock: 0.48,
  },
  turnBodyMax: 2.05,
  hatAirMax: 0.012,
  crestMinLock: 4.2,
  crestMinUnlock: 2.4,
  lowFloor: 0.012,
  midFloor: 0.008,
  airFloor: 0.0018,
  stanzaMin: 1.06,
  tagFloor: 0.68,
  pocketMax: 1.2,
  maskMin: 0.16,
};

function seedFor(root, tempoIdx) {
  const r = Math.max(0, root | 0);
  const t = Math.max(0, tempoIdx | 0);
  return `0x${r.toString(16).padStart(8, "0")}${t.toString(16).padStart(8, "0")}`;
}

function enumerateSeats() {
  const seats = [];
  for (const genre of GENRE_IDS) {
    const table = rippel.TEMPO_TABLES[genre] || [];
    for (let tempoIdx = 0; tempoIdx < table.length; tempoIdx += 1) {
      for (const root of ROOTS) {
        seats.push({
          genre,
          lock: true,
          seconds: LOCK_SECONDS,
          syncopate: true,
          tempoIdx,
          root,
          seed: seedFor(root, tempoIdx),
        });
      }
    }
    seats.push({
      genre,
      lock: false,
      seconds: UNLOCK_SECONDS,
      syncopate: false,
      tempoIdx: 0,
      root: 0,
      seed: seedFor(0, 0),
    });
  }
  return seats;
}

function sliceRms(samples, start, end) {
  const a = Math.max(0, start | 0);
  const b = Math.min(samples.length, end | 0);
  if (b <= a) return 0;
  let acc = 0;
  for (let i = a; i < b; i += 1) acc += samples[i] * samples[i];
  return Math.sqrt(acc / (b - a));
}

function slicePeak(samples, start, end) {
  const a = Math.max(0, start | 0);
  const b = Math.min(samples.length, end | 0);
  let peak = 0;
  for (let i = a; i < b; i += 1) {
    const v = Math.abs(samples[i]);
    if (v > peak) peak = v;
  }
  return peak;
}

function bandRms(samples, sampleRate, loHz, hiHz, start, end) {
  const hp = Math.exp((-2 * Math.PI * loHz) / sampleRate);
  const lp = Math.exp((-2 * Math.PI * hiHz) / sampleRate);
  let yhp = 0;
  let ylp = 0;
  let acc = 0;
  let n = 0;
  const a = Math.max(0, start | 0);
  const b = Math.min(samples.length, end | 0);
  for (let i = 0; i < b; i += 1) {
    yhp = hp * yhp + (1 - hp) * samples[i];
    const high = samples[i] - yhp;
    ylp = lp * ylp + (1 - lp) * high;
    if (i >= a) {
      acc += ylp * ylp;
      n += 1;
    }
  }
  return n > 0 ? Math.sqrt(acc / n) : 0;
}

function listenWindow(samples, sampleRate, start, end) {
  return {
    rms: sliceRms(samples, start, end),
    low: bandRms(samples, sampleRate, 20, 180, start, end),
    mid: bandRms(samples, sampleRate, 250, 2500, start, end),
    air: bandRms(samples, sampleRate, 6000, 14000, start, end),
  };
}

function highpassRms(samples, sampleRate, hz, start, end) {
  const hp = Math.exp((-2 * Math.PI * hz) / sampleRate);
  let y = 0;
  let acc = 0;
  let n = 0;
  const a = Math.max(0, start | 0);
  const b = Math.min(samples.length, end | 0);
  for (let i = 0; i < b; i += 1) {
    y = hp * y + (1 - hp) * samples[i];
    if (i >= a) {
      const air = samples[i] - y;
      acc += air * air;
      n += 1;
    }
  }
  return n > 0 ? Math.sqrt(acc / n) : 0;
}

function measureSeat(spec) {
  const rendered = bed.renderSamples({
    brief: "sound-mixer seat",
    genre: spec.genre,
    seconds: spec.seconds,
    seed: spec.seed,
    syncopate: spec.syncopate,
  });
  const samples = rendered.samples;
  const sampleRate = rendered.sampleRate || bed.SAMPLE_RATE;
  const grid = rendered.grid || rippel.motionGrid(spec.seed, spec.genre);
  const marks = rendered.phraseMarks || rippel.phraseMarks(spec.seconds, grid);
  const inspect = bed.evaluateMetrics(samples, sampleRate);
  const turnAt = marks.turnAt || grid.beatSec * 2;
  const turn0 = Math.floor(turnAt * sampleRate);
  const introN = Math.floor(0.75 * sampleRate);
  const fadeN = Math.floor(sampleRate);
  const bodyEnd = Math.max(introN, samples.length - fadeN);
  const peak = slicePeak(samples, 0, samples.length);
  const rms = sliceRms(samples, 0, samples.length);
  const turnRms = sliceRms(samples, turn0, turn0 + Math.floor(TURN_WIN * sampleRate));
  const turnPeak = slicePeak(samples, turn0, turn0 + Math.floor(TURN_WIN * sampleRate));
  const bodyRms = sliceRms(samples, introN, bodyEnd);
  const airAtTurn = highpassRms(samples, sampleRate, AIR_HZ, turn0, turn0 + Math.floor(AIR_AT_WIN * sampleRate));
  const after0 = turn0 + Math.floor(AIR_AFTER_OFF * sampleRate);
  const airAfterTurn = highpassRms(
    samples,
    sampleRate,
    AIR_HZ,
    after0,
    after0 + Math.floor(AIR_AFTER_WIN * sampleRate),
  );
  const hang = airAtTurn > 1e-9 ? airAfterTurn / airAtTurn : 0;
  const hatAir = rippel.highpassEnergy(samples, sampleRate, AIR_HZ);
  const crest = rms > 0 ? peak / rms : 0;
  const tagAt = marks.tagAt || turnAt + grid.beatSec * 2;
  const tag0 = Math.floor(tagAt * sampleRate);
  const win = Math.floor(0.28 * sampleRate);
  const hookListen = listenWindow(samples, sampleRate, Math.floor(0.48 * sampleRate), Math.floor(0.48 * sampleRate) + win);
  const turnListen = listenWindow(samples, sampleRate, turn0, turn0 + win);
  const tagListen = listenWindow(samples, sampleRate, tag0, tag0 + win);
  return {
    genre: spec.genre,
    lock: spec.lock,
    seconds: spec.seconds,
    seed: spec.seed,
    tempoIdx: spec.tempoIdx,
    bpm: grid.bpm,
    root: spec.root,
    inspect: inspect.status,
    inspectGates: inspect.gates || null,
    peak,
    rms,
    crest,
    turnAt,
    turnRms,
    bodyRms,
    turnBody: bodyRms > 1e-9 ? turnRms / bodyRms : 0,
    turnPeak,
    airAtTurn,
    airAfterTurn,
    hang,
    hatAir,
    listen: {
      hook: hookListen,
      turn: turnListen,
      tag: tagListen,
      stanza: hookListen.rms > 1e-9 ? turnListen.rms / hookListen.rms : 0,
      tagHold: hookListen.rms > 1e-9 ? tagListen.rms / hookListen.rms : 0,
      pocket: turnListen.low > 1e-9 ? turnListen.air / turnListen.low : 0,
      mask: turnListen.low > 1e-9 ? turnListen.mid / turnListen.low : 0,
      stacked:
        hookListen.low >= MIX_GATES.lowFloor * 0.7 &&
        hookListen.mid >= MIX_GATES.midFloor * 0.55 &&
        turnListen.low >= MIX_GATES.lowFloor &&
        turnListen.mid >= MIX_GATES.midFloor &&
        turnListen.air >= MIX_GATES.airFloor &&
        tagListen.low >= MIX_GATES.lowFloor * 0.75 &&
        tagListen.mid >= MIX_GATES.midFloor * 0.7 &&
        tagListen.air >= MIX_GATES.airFloor * 0.35,
    },
  };
}

function evaluateSeat(seat) {
  const fails = [];
  if (seat.inspect !== "PASS") fails.push("inspect");
  if (seat.peak > MIX_GATES.peakMax) fails.push("peak");
  const hangMax = MIX_GATES.hangMax[seat.genre] || 0.5;
  if (seat.lock && seat.hang > hangMax) fails.push("plate");
  if (seat.turnBody > MIX_GATES.turnBodyMax) fails.push("turn");
  if (seat.hatAir > MIX_GATES.hatAirMax) fails.push("hats");
  const crestMin = seat.lock ? MIX_GATES.crestMinLock : MIX_GATES.crestMinUnlock;
  if (seat.crest < crestMin) fails.push("glue");
  if (seat.lock && seat.listen) {
    if (!seat.listen.stacked) fails.push("layers");
    if (seat.listen.stanza < MIX_GATES.stanzaMin) fails.push("stanza");
    if (seat.listen.tagHold < MIX_GATES.tagFloor) fails.push("tag");
    if (seat.listen.pocket > MIX_GATES.pocketMax) fails.push("pocket");
    if (seat.listen.mask < MIX_GATES.maskMin) fails.push("mask");
  }
  return {
    ...seat,
    status: fails.length ? "FAIL" : "PASS",
    fails,
  };
}

function mixMatrix() {
  const seats = enumerateSeats().map((spec) => evaluateSeat(measureSeat(spec)));
  const failed = seats.filter((s) => s.status === "FAIL");
  return {
    kind: "sound-mix",
    agent: AGENT,
    status: failed.length ? "FAIL" : "PASS",
    failClosed: true,
    gates: MIX_GATES,
    mixer: rippel.MIXER,
    counted: seats.length,
    failed: failed.length,
    seats,
  };
}

function writeMixReceipt(root, report) {
  const dest = path.join(root, RECEIPT_REL);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(report, null, 2)}\n`);
  return dest;
}

function mixProject(root) {
  const report = mixMatrix();
  const dest = writeMixReceipt(root || process.cwd(), report);
  return { ...report, receipt: dest };
}

module.exports = {
  AGENT,
  LOCK_SECONDS,
  UNLOCK_SECONDS,
  GENRE_IDS,
  ROOTS,
  MIX_GATES,
  RECEIPT_REL,
  seedFor,
  enumerateSeats,
  measureSeat,
  evaluateSeat,
  mixMatrix,
  writeMixReceipt,
  mixProject,
};
