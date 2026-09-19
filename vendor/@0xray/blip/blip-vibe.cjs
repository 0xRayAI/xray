/**
 * blip-vibe — aesthetic / cool-factor organ for factory-blip.
 * Scores still + Rippel five + kapow + destination. Appeal 0–10. Ship bar is 8.
 * Shared appeal for every type. Kapow extras stay kapow-only.
 * Inspect still checks duration / mode / file.
 */

const fs = require("node:fs");
const path = require("node:path");
const rippel = require("./blip-rippel.cjs");
const kapow = require("./blip-kapow.cjs");
const scene = require("./blip-scene.cjs");
const render = require("./blip-render.cjs");

const AGENT = "blip-vibe";
const RECEIPT_REL = path.join(".xray", "blip-vibe-receipt.json");
const SHIP_BAR = 8;
const TYPES = ["still", "orb", "swirl", "snap", "waves", "spark", "kapow", "destination"];
const SEEDS = ["0xdeadbeef", "0x9f76dd89"];

/** Excellent-fill marks. Sparse organs are not scored against a kapow disc. */
const FILL_MARK = {
  still: 0.2,
  orb: 0.16,
  swirl: 0.16,
  snap: 0.28,
  waves: 0.2,
  spark: 0.18,
  kapow: 0.32,
  destination: 0.12,
};

const TINT_MARK = {
  still: 0.08,
  orb: 0.08,
  swirl: 0.08,
  snap: 0.08,
  waves: 0.08,
  spark: 0.08,
  kapow: 0.18,
  destination: 0.12,
};

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function scanFrame(buf, width, height) {
  const step = 2;
  let n = 0;
  let ink = 0;
  let gold = 0;
  let cyan = 0;
  let blue = 0;
  let live = 0;
  let tint = 0;
  let sum = 0;
  let rim = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 3;
      const r = buf[i];
      const g = buf[i + 1];
      const b = buf[i + 2];
      n += 1;
      const yv = luma(r, g, b);
      sum += yv;
      if (yv > 28) live += 1;
      if (r > 200 && g > 200 && b > 200) ink += 1;
      if (r > 180 && g > 130 && b < 90) gold += 1;
      if (b > 150 && g > 140 && r < 130) cyan += 1;
      if (b > 150 && r < 110 && g < 160) blue += 1;
      const maxc = r > g ? (r > b ? r : b) : g > b ? g : b;
      const minc = r < g ? (r < b ? r : b) : g < b ? g : b;
      if (yv > 28 && maxc - minc > 36 && !(r > 200 && g > 200 && b > 200)) tint += 1;
      if (yv > 40 && x > 1 && y > 1) {
        const left = luma(buf[i - 3], buf[i - 2], buf[i - 1]);
        if (left < 22) rim += 1;
      }
    }
  }
  return {
    ink: ink / n,
    gold: gold / n,
    cyan: cyan / n,
    blue: blue / n,
    tint: tint / n,
    live: live / n,
    mean: sum / n,
    rim: rim / n,
    chroma: (gold + cyan + blue) / n,
  };
}

function clampScore(n) {
  if (n <= 0) return 0;
  if (n >= 10) return 10;
  return n;
}

function phraseTimes(seedHex, brief) {
  const checksum = rippel.cachedChecksum({
    brief,
    seedHex,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const beatSec = 60 / ((checksum.genreConfig && checksum.genreConfig.tempo) || 90);
  const cut = (rippel.phraseOf(checksum, 0).hookEndBeats || 2) * beatSec;
  return {
    hook: Math.max(0.12, cut * 0.28),
    turn: cut,
  };
}

function sampleTypeFrames(type, seedHex, brief) {
  if (type === "destination") return scene.sampleDestinationFrames(seedHex, brief);
  if (type === "kapow") return kapow.sampleKapowFrames(seedHex, brief);
  const times = phraseTimes(seedHex, brief);
  if (type === "still") {
    const hook = Buffer.alloc(rippel.MOTION_WIDTH * rippel.MOTION_HEIGHT * 3);
    const turn = Buffer.alloc(rippel.MOTION_WIDTH * rippel.MOTION_HEIGHT * 3);
    render.paintStillFrame(hook, rippel.MOTION_WIDTH, rippel.MOTION_HEIGHT, seedHex, times.hook, brief);
    render.paintStillFrame(turn, rippel.MOTION_WIDTH, rippel.MOTION_HEIGHT, seedHex, times.turn, brief);
    return {
      hook: { buffer: hook, width: rippel.MOTION_WIDTH, height: rippel.MOTION_HEIGHT, marks: {} },
      turn: { buffer: turn, width: rippel.MOTION_WIDTH, height: rippel.MOTION_HEIGHT, marks: {} },
      differ: rippel.framesDiffer(hook, turn),
    };
  }
  const hook = rippel.paintRippelFrame({
    renderer: type,
    t: times.hook,
    seedHex,
    brief,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const turn = rippel.paintRippelFrame({
    renderer: type,
    t: times.turn,
    seedHex,
    brief,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  return {
    hook,
    turn,
    differ: rippel.framesDiffer(hook.buffer, turn.buffer),
  };
}

function scoreAppeal(type, hook, turn, differ) {
  const a = scanFrame(hook.buffer, hook.width, hook.height);
  const b = scanFrame(turn.buffer, turn.width, turn.height);
  const flash = b.mean / Math.max(8, a.mean);
  const livePop = b.live / Math.max(0.01, a.live);
  const tintPop = (b.tint || b.chroma) / Math.max(0.004, a.tint || a.chroma);
  const fillMark = FILL_MARK[type] || 0.16;
  const tintMark = TINT_MARK[type] || 0.08;
  const tint = Math.max(b.tint || 0, b.chroma);
  const fill = clampScore((b.live / fillMark) * 10);
  const chroma = clampScore((tint / tintMark) * 10);
  const contrast = clampScore((b.ink / 0.008) * 3.2 + (tint / tintMark) * 3.4 + (b.rim / 0.003) * 3.4);
  const outline = clampScore((b.rim / 0.003) * 10);
  const slam = Math.max(flash, livePop, tintPop);
  const flashScore =
    type === "kapow"
      ? clampScore(((slam - 0.92) / 0.5) * 10)
      : clampScore((differ ? 7.2 : 0) + ((slam - 1) / 0.28) * 2.8);
  const differScore = differ ? 10 : 0;
  const parts = {
    fill,
    chroma,
    contrast,
    outline,
    flash: flashScore,
    differ: differScore,
  };
  if (type === "kapow") {
    parts.wordPunch = clampScore((b.ink / 0.018) * 10);
    parts.twoTier = clampScore(
      Math.min(10, (b.gold / Math.max(0.004, a.gold)) * 3.2) * 0.55 +
        (hook.marks && hook.marks.outer > hook.marks.inner ? 4.5 : 0),
    );
    parts.jag = clampScore(((0.4 - kapow.OUTER_FAT) / 0.12) * 10);
  }
  const keys = Object.keys(parts);
  const score = keys.reduce((n, key) => n + parts[key], 0) / keys.length;
  const fails = [];
  if (b.live < fillMark * 0.45) fails.push("fill");
  if (tint < tintMark * 0.35) fails.push("chroma");
  if (!differ) fails.push("differ");
  if (type === "kapow") {
    if (b.ink < 0.01) fails.push("word");
    if (b.ink <= a.ink * 1.35) fails.push("word-cut");
    if (b.gold <= a.gold * 1.15) fails.push("inner");
    if (flash < 1.12) fails.push("flash");
    if (kapow.SPIKE_POW < 3.2) fails.push("jag");
    if (kapow.OUTER_FAT > 0.38) fails.push("fat");
    if (!turn.marks || turn.marks.word < 0.7) fails.push("word-mark");
  } else if (b.rim < 0.002 && b.live < fillMark * 0.7) {
    fails.push("mush");
  }
  if (score + 1e-9 < SHIP_BAR) fails.push("bar");
  return {
    hook: a,
    turn: b,
    flash,
    parts,
    score,
    fails,
  };
}

function scorePair(hook, turn) {
  return scoreAppeal("kapow", hook, turn, true);
}

function seatSpec(type, seed) {
  return {
    type,
    seed,
    brief:
      type === "kapow"
        ? "broken angel kapow"
        : type === "destination"
          ? "road to the grid destination"
          : `${type} power plant vibe`,
  };
}

function evaluateSeat(spec) {
  const frames = sampleTypeFrames(spec.type, spec.seed, spec.brief);
  const judged = scoreAppeal(spec.type, frames.hook, frames.turn, frames.differ);
  return {
    type: spec.type,
    seed: spec.seed,
    brief: spec.brief,
    score: judged.score,
    flash: judged.flash,
    parts: judged.parts,
    hook: judged.hook,
    turn: judged.turn,
    marks: {
      hook: frames.hook.marks || null,
      turn: frames.turn.marks || null,
    },
    differ: frames.differ,
    fails: judged.fails,
    status: judged.fails.length ? "FAIL" : "PASS",
  };
}

function vibeSeats() {
  const seats = [];
  for (const type of TYPES) {
    for (const seed of SEEDS) seats.push(seatSpec(type, seed));
  }
  return seats;
}

function vibeMatrix() {
  const seats = vibeSeats().map(evaluateSeat);
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
    kind: "blip-vibe",
    agent: AGENT,
    status: failed.length ? "FAIL" : "PASS",
    failClosed: true,
    shipBar: SHIP_BAR,
    score,
    counted: seats.length,
    failed: failed.length,
    types: TYPES,
    byType,
    constants: {
      spikePow: kapow.SPIKE_POW,
      outerFat: kapow.OUTER_FAT,
      innerFat: kapow.INNER_FAT,
      word: kapow.WORD,
    },
    seats,
  };
}

function writeVibeReceipt(root, report) {
  const dest = path.join(root, RECEIPT_REL);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, `${JSON.stringify(report, null, 2)}\n`);
  return dest;
}

function vibeProject(root) {
  const report = vibeMatrix();
  const dest = writeVibeReceipt(root || process.cwd(), report);
  return { ...report, receipt: dest };
}

module.exports = {
  AGENT,
  RECEIPT_REL,
  SHIP_BAR,
  TYPES,
  SEEDS,
  SEATS: vibeSeats(),
  scanFrame,
  scorePair,
  scoreAppeal,
  evaluateSeat,
  vibeMatrix,
  writeVibeReceipt,
  vibeProject,
};
