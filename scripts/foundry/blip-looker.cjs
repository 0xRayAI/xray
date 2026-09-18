/**
 * blip-looker — the friend hitting replay.
 * Inspect = file / duration. Vibe = stamp density. Mixer = ears.
 * This organ scores the 4.44s as a Short: setup → jewel → hold.
 * Not density. Not a model. Ship bar is 8.
 */

const fs = require("node:fs");
const path = require("node:path");
const rippel = require("./blip-rippel.cjs");
const kapow = require("./blip-kapow.cjs");
const render = require("./blip-render.cjs");
const vibe = require("./blip-vibe.cjs");

const AGENT = "blip-looker";
const RECEIPT_REL = path.join(".xray", "blip-looker-receipt.json");
const SHIP_BAR = 8;
const TYPES = ["still", "orb", "swirl", "snap", "waves", "spark", "kapow"];
const SEEDS = ["0xdeadbeef", "0x9f76dd89"];

const LOOK_GATES = {
  setupMin: 0.028,
  punchMin: 1.05,
  holdMin: 0.52,
};

function clampScore(n) {
  if (n <= 0) return 0;
  if (n >= 10) return 10;
  return n;
}

function lookerTimes(seedHex, brief) {
  const checksum = rippel.cachedChecksum({
    brief,
    seedHex,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const beatSec = 60 / ((checksum.genreConfig && checksum.genreConfig.tempo) || 90);
  const phrase = rippel.phraseOf(checksum, 0);
  const cut = (phrase.hookEndBeats || 2) * beatSec;
  const tagAt = (phrase.tagStartBeats || 5) * beatSec;
  return {
    hook: Math.max(0.12, cut * 0.28),
    turn: cut,
    tag: Math.min(4.2, Math.max(cut + 0.55, tagAt + 0.06)),
  };
}

function paintTypeFrame(type, seedHex, brief, t) {
  if (type === "kapow") {
    return kapow.paintKapowFrame({
      seedHex,
      brief,
      t,
      width: rippel.MOTION_WIDTH,
      height: rippel.MOTION_HEIGHT,
    });
  }
  if (type === "still") {
    const buffer = Buffer.alloc(rippel.MOTION_WIDTH * rippel.MOTION_HEIGHT * 3);
    render.paintStillFrame(buffer, rippel.MOTION_WIDTH, rippel.MOTION_HEIGHT, seedHex, t, brief);
    return { buffer, width: rippel.MOTION_WIDTH, height: rippel.MOTION_HEIGHT, marks: {} };
  }
  return rippel.paintRippelFrame({
    renderer: type,
    t,
    seedHex,
    brief,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
}

function sampleLookerFrames(type, seedHex, brief) {
  const times = lookerTimes(seedHex, brief);
  const hook = paintTypeFrame(type, seedHex, brief, times.hook);
  const turn = paintTypeFrame(type, seedHex, brief, times.turn);
  const tag = paintTypeFrame(type, seedHex, brief, times.tag);
  return {
    times,
    hook,
    turn,
    tag,
    differHookTurn: rippel.framesDiffer(hook.buffer, turn.buffer),
    differTurnTag: rippel.framesDiffer(turn.buffer, tag.buffer),
  };
}

function peakKey(a, b, c, key) {
  return b[key] >= a[key] && b[key] >= c[key] * 0.92;
}

function scoreReplay(type, frames) {
  const a = vibe.scanFrame(frames.hook.buffer, frames.hook.width, frames.hook.height);
  const b = vibe.scanFrame(frames.turn.buffer, frames.turn.width, frames.turn.height);
  const c = vibe.scanFrame(frames.tag.buffer, frames.tag.width, frames.tag.height);
  const punch = Math.max(b.mean / Math.max(8, a.mean), b.live / Math.max(0.01, a.live));
  const hold = b.live > 1e-6 ? c.live / b.live : 0;
  const jewel =
    type === "still"
      ? frames.differHookTurn && frames.differTurnTag && punch >= LOOK_GATES.punchMin
      : peakKey(a, b, c, "mean") ||
        peakKey(a, b, c, "live") ||
        peakKey(a, b, c, "chroma") ||
        peakKey(a, b, c, "tint");
  const setup = clampScore((a.live / 0.1) * 10);
  const punchScore = clampScore(((punch - 1) / 0.22) * 6.2 + 4.2);
  const holdScore = clampScore((hold / 0.82) * 10);
  const motionScore = (frames.differHookTurn ? 5 : 0) + (frames.differTurnTag ? 5 : 0);
  const jewelScore = jewel ? 10 : punch >= LOOK_GATES.punchMin ? 6.4 : 3.2;
  const replayScore = clampScore((punchScore * 0.4 + holdScore * 0.3 + motionScore * 0.3) * 1.05);
  const parts = {
    setup,
    punch: punchScore,
    hold: holdScore,
    motion: motionScore,
    jewel: jewelScore,
    replay: replayScore,
  };
  const keys = Object.keys(parts);
  const score = keys.reduce((n, key) => n + parts[key], 0) / keys.length;
  const fails = [];
  if (a.live < LOOK_GATES.setupMin) fails.push("setup");
  if (punch < LOOK_GATES.punchMin) fails.push("punch");
  if (hold < LOOK_GATES.holdMin) fails.push("hold");
  if (!frames.differHookTurn) fails.push("hook-turn");
  if (!frames.differTurnTag) fails.push("turn-tag");
  if (!jewel && punch < LOOK_GATES.punchMin * 1.08) fails.push("jewel");
  if (type === "kapow") {
    const word = frames.turn.marks && frames.turn.marks.word;
    if (!(word > 0.7)) fails.push("word");
  }
  if (score + 1e-9 < SHIP_BAR) fails.push("bar");
  return {
    hook: a,
    turn: b,
    tag: c,
    punch,
    hold,
    jewel,
    parts,
    score,
    fails,
  };
}

function seatSpec(type, seed) {
  return {
    type,
    seed,
    brief: type === "kapow" ? "broken angel kapow" : `${type} power plant looker`,
  };
}

function evaluateSeat(spec) {
  const frames = sampleLookerFrames(spec.type, spec.seed, spec.brief);
  const judged = scoreReplay(spec.type, frames);
  return {
    type: spec.type,
    seed: spec.seed,
    brief: spec.brief,
    times: frames.times,
    score: judged.score,
    punch: judged.punch,
    hold: judged.hold,
    jewel: judged.jewel,
    parts: judged.parts,
    hook: judged.hook,
    turn: judged.turn,
    tag: judged.tag,
    differHookTurn: frames.differHookTurn,
    differTurnTag: frames.differTurnTag,
    fails: judged.fails,
    status: judged.fails.length ? "FAIL" : "PASS",
  };
}

function lookerSeats() {
  const seats = [];
  for (const type of TYPES) {
    for (const seed of SEEDS) seats.push(seatSpec(type, seed));
  }
  return seats;
}

function lookerMatrix() {
  const seats = lookerSeats().map(evaluateSeat);
  const failed = seats.filter((s) => s.status === "FAIL");
  const score = seats.reduce((n, s) => n + s.score, 0) / seats.length;
  const byType = {};
  for (const type of TYPES) {
    const group = seats.filter((s) => s.type === type);
    byType[type] = {
      score: group.reduce((n, s) => n + s.score, 0) / group.length,
      failed: group.filter((s) => s.status === "FAIL").length,
      status: group.every((s) => s.status === "PASS") ? "PASS" : "FAIL",
    };
  }
  return {
    kind: "blip-looker",
    agent: AGENT,
    status: failed.length ? "FAIL" : "PASS",
    failClosed: true,
    shipBar: SHIP_BAR,
    score,
    counted: seats.length,
    failed: failed.length,
    types: TYPES,
    byType,
    gates: LOOK_GATES,
    seats,
  };
}

function writeLookerReceipt(root, report) {
  const dest = path.join(root, RECEIPT_REL);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(report, null, 2)}\n`);
  return dest;
}

function lookerProject(root) {
  const report = lookerMatrix();
  const dest = writeLookerReceipt(root || process.cwd(), report);
  return { ...report, receipt: dest };
}

module.exports = {
  AGENT,
  RECEIPT_REL,
  SHIP_BAR,
  TYPES,
  SEEDS,
  LOOK_GATES,
  lookerTimes,
  sampleLookerFrames,
  scoreReplay,
  evaluateSeat,
  lookerMatrix,
  writeLookerReceipt,
  lookerProject,
};
