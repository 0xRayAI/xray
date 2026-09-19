/**
 * sound-taste — friend-ear score for each live body.
 * Mixer = levels. Inspect = file. This organ is "would I play this Short again?"
 * Ship bar is 8. Not costume.
 */

const bed = require("./sound-bed.cjs");
const rippel = require("./sound-rippel.cjs");

const AGENT = "sound-taste";
const SHIP_BAR = 8;
const TASTE_GENRES = [
  "ambient",
  "techno",
  "phonk",
  "jazz",
  "rock",
  "timeless",
  "destination",
  "dubstep",
];

function clampScore(n) {
  if (n <= 0) return 0;
  if (n >= 10) return 10;
  return n;
}

function renderLock(genre) {
  return bed.renderSamples({
    brief: `${genre} night drive lock`,
    genre,
    seconds: 4.44,
    seed: `0x${genre
      .split("")
      .map((c) => (/[0-9a-f]/i.test(c) ? c : "a"))
      .join("")
      .padEnd(8, "0")
      .slice(0, 8)}f00d`,
    syncopate: true,
  });
}

function scoreSeat(genre) {
  const rendered = renderLock(genre);
  const samples = rendered.samples;
  const sr = rendered.sampleRate || 44100;
  const marks = rendered.phraseMarks || rippel.phraseMarks(4.44, rendered.grid);
  const hook = rippel.windowRms(samples, sr, Math.max(0.12, marks.turnAt * 0.28), 0.2);
  const turn = rippel.windowRms(samples, sr, marks.turnAt, 0.2);
  const tag = rippel.windowRms(samples, sr, Math.min(4.1, marks.tagAt + 0.05), 0.2);
  const punch = hook > 1e-6 ? turn / hook : 0;
  const hold = hook > 1e-6 ? tag / hook : 0;
  const sub = rippel.bandEnergy(samples, sr, 20, 90);
  const air = rippel.bandEnergy(samples, sr, 2500, 9000);
  const mid = rippel.bandEnergy(samples, sr, 200, 1200);
  const crest = rippel.crestFactor(samples);
  const fails = [];
  if (punch < 1.05) fails.push("punch");
  if (hold < 0.62) fails.push("hold");
  if ((genre === "phonk" || genre === "destination" || genre === "dubstep") && sub < mid * 0.55) {
    fails.push("sub");
  }
  if ((genre === "ambient" || genre === "timeless" || genre === "destination") && air < 1e-5) {
    fails.push("dust");
  }
  if (genre === "dubstep" && crest < 3.2) fails.push("wobble");
  if (genre === "rock" && mid < sub * 0.8) fails.push("stack");
  let score = 6.2 + Math.min(2.1, (punch - 1) * 3.4) + Math.min(1.2, hold * 0.9);
  if (genre === "phonk" || genre === "destination") score += Math.min(0.8, sub * 40);
  if (genre === "dubstep") score += Math.min(0.7, (crest - 3) * 0.35);
  if (genre === "ambient" || genre === "timeless") score += air > 1e-5 ? 0.5 : 0;
  score = clampScore(score);
  if (score + 1e-9 < SHIP_BAR) fails.push("bar");
  return {
    genre,
    score,
    punch,
    hold,
    sub,
    air,
    mid,
    crest,
    fails,
    status: fails.length ? "FAIL" : "PASS",
  };
}

function tasteMatrix() {
  const seats = TASTE_GENRES.map(scoreSeat);
  const failed = seats.filter((s) => s.status === "FAIL");
  const score = seats.reduce((n, s) => n + s.score, 0) / seats.length;
  return {
    kind: "sound-taste",
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
  TASTE_GENRES,
  scoreSeat,
  tasteMatrix,
};
