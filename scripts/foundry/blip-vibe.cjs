/**
 * blip-vibe — aesthetic / cool-factor organ for factory-blip.
 * Scores appeal 0–10. Ship bar is 8. Inspect still checks duration / mode / file.
 */

const fs = require("node:fs");
const path = require("node:path");
const kapow = require("./blip-kapow.cjs");

const AGENT = "blip-vibe";
const RECEIPT_REL = path.join(".xray", "blip-vibe-receipt.json");
const SHIP_BAR = 8;
const SEATS = [
  { seed: "0xdeadbeef", brief: "broken angel kapow" },
  { seed: "0x9f76dd89", brief: "KAPOW stamp" },
];

function luma(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function scanFrame(buf, width, height) {
  const step = 2;
  let n = 0;
  let ink = 0;
  let gold = 0;
  let cyan = 0;
  let live = 0;
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
    live: live / n,
    mean: sum / n,
    rim: rim / n,
  };
}

function clampScore(n) {
  if (n <= 0) return 0;
  if (n >= 10) return 10;
  return n;
}

function scorePair(hook, turn) {
  const a = scanFrame(hook.buffer, hook.width, hook.height);
  const b = scanFrame(turn.buffer, turn.width, turn.height);
  const flash = b.mean / Math.max(8, a.mean);
  const wordPunch = clampScore((b.ink / 0.018) * 10);
  const twoTier = clampScore(
    Math.min(10, (b.gold / Math.max(0.004, a.gold)) * 3.2) * 0.55 +
      (hook.marks.outer > hook.marks.inner ? 4.5 : 0),
  );
  const fill = clampScore((b.live / 0.42) * 10);
  const jag = clampScore(((0.4 - kapow.OUTER_FAT) / 0.12) * 10);
  const outline = clampScore((b.rim / 0.012) * 10);
  const flashScore = clampScore(((flash - 1) / 0.45) * 10);
  const contrast = clampScore((b.ink / Math.max(0.004, a.ink)) * 4.2);
  const parts = {
    wordPunch,
    twoTier,
    fill,
    jag,
    outline,
    flash: flashScore,
    contrast,
  };
  const score =
    (parts.wordPunch +
      parts.twoTier +
      parts.fill +
      parts.jag +
      parts.outline +
      parts.flash +
      parts.contrast) /
    7;
  const fails = [];
  if (b.ink < 0.01) fails.push("word");
  if (b.ink <= a.ink * 1.35) fails.push("word-cut");
  if (b.gold <= a.gold * 1.15) fails.push("inner");
  if (b.live < 0.22) fails.push("fill");
  if (flash < 1.18) fails.push("flash");
  if (kapow.SPIKE_POW < 3.2) fails.push("jag");
  if (kapow.OUTER_FAT > 0.38) fails.push("fat");
  if (turn.marks.word < 0.7) fails.push("word-mark");
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

function evaluateSeat(spec) {
  const frames = kapow.sampleKapowFrames(spec.seed, spec.brief);
  const judged = scorePair(frames.hook, frames.turn);
  return {
    seed: spec.seed,
    brief: spec.brief,
    score: judged.score,
    flash: judged.flash,
    parts: judged.parts,
    hook: judged.hook,
    turn: judged.turn,
    marks: {
      hook: frames.hook.marks,
      turn: frames.turn.marks,
    },
    differ: frames.differ,
    fails: judged.fails,
    status: judged.fails.length ? "FAIL" : "PASS",
  };
}

function vibeMatrix() {
  const seats = SEATS.map(evaluateSeat);
  const failed = seats.filter((s) => s.status === "FAIL");
  const score = seats.reduce((n, s) => n + s.score, 0) / seats.length;
  return {
    kind: "blip-vibe",
    agent: AGENT,
    status: failed.length ? "FAIL" : "PASS",
    failClosed: true,
    shipBar: SHIP_BAR,
    score,
    counted: seats.length,
    failed: failed.length,
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
  SEATS,
  scanFrame,
  scorePair,
  evaluateSeat,
  vibeMatrix,
  writeVibeReceipt,
  vibeProject,
};
