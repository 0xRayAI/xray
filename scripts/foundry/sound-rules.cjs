/**
 * Ear-ready bed gate. The lessons are in SOUND-RULES.md.
 * A render can still exist when this gate fails. earReady is the verdict.
 */

const fs = require("node:fs");
const path = require("node:path");
const P = require("./sound-pro.cjs");

const FOREGROUND_MAX_DB = 3;
const MAX_DUCK_DB = 5;
const MAX_RELEASE_SEC = 0.06;
const MAX_SUSTAINED_SWING_DB = 6;
const SHORT_HIT_SEC = 0.05;
const LOW_UNDER_KICK_DB = 8;
const MIN_BASS_QUIET_SHARE = 0.25;
const MAX_PAD_MOTION_DB = 1.5;
const MIN_PAD_SHIFT_HZ = 4;
const HF_PRESENT_DB = -60;
const MAX_HF_FLATNESS = 0.25;
const DENY = ["noiseLcg", "kickClick", "render808", "renderAirGlue", "Math.tanh"];

function round1(n) {
  return Math.round(n * 10) / 10;
}

function check(id, pass, detail) {
  return { id, pass: Boolean(pass), detail };
}

function sourceText() {
  const dir = __dirname;
  return (
    fs.readFileSync(path.join(dir, "sound-pro.cjs"), "utf8") +
    fs.readFileSync(path.join(dir, "sound-magnetic.cjs"), "utf8") +
    fs.readFileSync(path.join(dir, "sound-elementary.mjs"), "utf8")
  );
}

function checkSource() {
  const text = sourceText();
  const hits = DENY.filter((token) => text.includes(token));
  return check("noise", hits.length === 0, { denied: hits });
}

function hfFlatness(samples, start, end) {
  const slice = P.slice(samples, P.SAMPLE_RATE, start, end);
  const high = P.applyBiquad(slice, "highpass", 2000, 0.707, P.SAMPLE_RATE);
  const db = P.linDb(P.rmsOf(high, P.SAMPLE_RATE, 0, high.length / P.SAMPLE_RATE));
  if (db < HF_PRESENT_DB) return { db: round1(db), flatness: 0, present: false };
  return { db: round1(db), flatness: P.spectralFlatness(high), present: true };
}

function checkHiss(bed) {
  const kick = hfFlatness(bed.stems.kick, 5.2, 5.7);
  const bass = hfFlatness(bed.stems.sub, 8.0, 8.5);
  const kickOk = !kick.present || kick.flatness <= MAX_HF_FLATNESS;
  const bassOk = !bass.present || bass.flatness <= MAX_HF_FLATNESS;
  return check("hiss", kickOk && bassOk, { kick, bass, maxFlatness: MAX_HF_FLATNESS });
}

function checkPump(bed, pad) {
  const releaseOk = bed.duckDb <= 0 || P.DUCK_RELEASE_SEC <= MAX_RELEASE_SEC;
  const depthOk = bed.duckDb <= MAX_DUCK_DB;
  const swingOk = pad.swings.body.swingDb < MAX_SUSTAINED_SWING_DB
    && pad.swings.chord.swingDb < MAX_SUSTAINED_SWING_DB
    && pad.swings.final.swingDb < MAX_SUSTAINED_SWING_DB;
  return check("pump", depthOk && releaseOk && swingOk, {
    duckDb: bed.duckDb,
    releaseSec: P.DUCK_RELEASE_SEC,
    padBodySwingDb: round1(pad.swings.body.swingDb),
    padChordSwingDb: round1(pad.swings.chord.swingDb),
  });
}

function hitSpan(samples, sampleRate, startSec, endSec) {
  const i0 = Math.floor(startSec * sampleRate);
  const i1 = Math.min(samples.length, Math.floor(endSec * sampleRate));
  let peak = 0;
  for (let i = i0; i < i1; i++) {
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak <= 0) return { peak: 0, durationSec: 0, peaks: [] };
  const floor = peak * P.dbLin(-20);
  let first = -1;
  let last = -1;
  for (let i = i0; i < i1; i++) {
    if (Math.abs(samples[i]) >= floor) {
      if (first < 0) first = i;
      last = i;
    }
  }
  const span = samples.subarray(Math.max(i0, first), Math.min(samples.length, last + 1));
  const peaks = P.topPeaks(span, sampleRate, 4, 80, 4000);
  return {
    peak,
    durationSec: first < 0 ? 0 : (last - first + 1) / sampleRate,
    peaks,
  };
}

function harmonicEnough(peaks) {
  if (!peaks.length) return false;
  const f0 = peaks[0].hz;
  if (!(f0 > 40)) return false;
  for (let i = 1; i < peaks.length; i++) {
    const ratio = peaks[i].hz / f0;
    const n = Math.max(1, Math.round(ratio));
    const near = Math.abs(ratio - n) / n <= 0.08;
    const quiet = peaks[i].mag < peaks[0].mag * P.dbLin(-12);
    if (!near && !quiet) return false;
  }
  return true;
}

function checkPercussion(bed) {
  const sr = bed.sampleRate;
  const hit = hitSpan(bed.stems.clap, sr, 7.65, 7.95);
  const kick = hitSpan(bed.stems.kick, sr, 7.6, 8.2);
  const under = kick.peak > 0 && hit.peak > 0
    ? P.linDb(kick.peak * bed.gains.kick) - P.linDb(hit.peak * bed.gains.clap)
    : 0;
  const harmonic = harmonicEnough(hit.peaks);
  const shortAndLow = hit.durationSec <= SHORT_HIT_SEC && under >= LOW_UNDER_KICK_DB;
  const absent = hit.peak <= 0;
  return check("percussion", absent || harmonic || shortAndLow, {
    durationSec: round1(hit.durationSec),
    underKickDb: round1(under),
    harmonic,
    peaksHz: hit.peaks.map((peak) => Math.round(peak.hz)),
  });
}

function quietShare(samples, startSec, endSec) {
  const sr = P.SAMPLE_RATE;
  const win = Math.floor(0.02 * sr);
  const hop = Math.floor(win / 2);
  const i0 = Math.floor(startSec * sr);
  const i1 = Math.min(samples.length, Math.floor(endSec * sr));
  let max = 0;
  const values = [];
  for (let i = i0; i + win <= i1; i += hop) {
    let acc = 0;
    for (let j = 0; j < win; j++) acc += samples[i + j] * samples[i + j];
    const rms = Math.sqrt(acc / win);
    values.push(rms);
    if (rms > max) max = rms;
  }
  if (!values.length || max <= 0) return 1;
  const floor = max * P.dbLin(-12);
  let quiet = 0;
  for (let i = 0; i < values.length; i++) if (values[i] < floor) quiet += 1;
  return quiet / values.length;
}

function checkBass(bed) {
  const share = quietShare(bed.stems.sub, 5.5, 15.4);
  return check("bass", share >= MIN_BASS_QUIET_SHARE, {
    quietShare: round1(share),
    minQuietShare: MIN_BASS_QUIET_SHARE,
  });
}

function checkPad(bed, padMotionDb) {
  const sr = bed.sampleRate;
  const early = P.spectralCentroid(P.slice(bed.stems.pad, sr, 8.2, 9.4), sr);
  const late = P.spectralCentroid(P.slice(bed.stems.pad, sr, 10.0, 11.2), sr);
  const shift = Math.abs(late - early);
  const slow = P.envelopeSwingDb(bed.stems.pad, sr, 8.1, 11.5, 0.25).swingDb;
  const moved = (padMotionDb != null && padMotionDb >= 0.05) || shift >= MIN_PAD_SHIFT_HZ;
  const gentle = slow <= MAX_PAD_MOTION_DB && (padMotionDb == null || padMotionDb <= MAX_PAD_MOTION_DB);
  return check("pad", moved && gentle, {
    centroidShiftHz: round1(shift),
    slowSwingDb: round1(slow),
    padMotionDb: padMotionDb == null ? null : round1(padMotionDb),
  });
}

function checkWidth(bed) {
  const sr = bed.sampleRate;
  const side = P.sideUnderMidDb(bed.left, bed.right, sr, 5.5, 15.4);
  const lowL = P.applyBiquad(P.slice(bed.left, sr, 5.5, 15.4), "lowpass", 120, 0.707, sr);
  const lowR = P.applyBiquad(P.slice(bed.right, sr, 5.5, 15.4), "lowpass", 120, 0.707, sr);
  const low = P.sideUnderMidDb(lowL, lowR, sr, 0, lowL.length / sr);
  const wideOk = side <= -8 && side >= -20;
  const monoOk = low <= -24;
  return check("width", wideOk && monoOk, {
    sideUnderMidDb: round1(side),
    lowSideUnderMidDb: round1(low),
  });
}

function loadReference() {
  return JSON.parse(fs.readFileSync(path.join(__dirname, "sound-reference.json"), "utf8"));
}

function checkTop(bed) {
  const book = loadReference();
  const ref = book.references.find((row) => row.id === book.primary);
  const sr = bed.sampleRate;
  const presence = P.bandRmsDb(bed.left, bed.right, sr, 5.5, 15.4, 2000, 4000);
  const air = P.bandRmsDb(bed.left, bed.right, sr, 11.05, 15.4, 4000, 8000);
  const tol = book.tolerances.bandDb;
  const presenceOk = Math.abs(presence - ref.band2to4Db) <= tol;
  const airOk = Math.abs(air - ref.band4to8Db) <= tol;
  return check("top", presenceOk && airOk, {
    band2to4Db: round1(presence),
    band4to8Db: round1(air),
    ref2to4Db: ref.band2to4Db,
    ref4to8Db: ref.band4to8Db,
    toleranceDb: tol,
  });
}

function checkForeground(bed) {
  const sr = bed.sampleRate;
  const names = ["pad", "sub", "mid", "clap", "hat", "pluck", "stab"];
  const hop = sr;
  let worst = { excessDb: -240, voice: "", atSec: 0 };
  for (let i0 = 0; i0 + hop <= bed.left.length; i0 += hop) {
    let mix = 0;
    for (let i = i0; i < i0 + hop; i++) {
      mix += bed.left[i] * bed.left[i] + bed.right[i] * bed.right[i];
    }
    const mixRms = Math.sqrt(mix / (hop * 2));
    if (mixRms < 1e-5) continue;
    for (let n = 0; n < names.length; n++) {
      const name = names[n];
      const stem = bed.stems[name];
      const gain = (bed.gains[name] || 0) * bed.fitGain;
      if (!(gain > 0)) continue;
      let acc = 0;
      for (let i = i0; i < i0 + hop; i++) acc += stem[i] * stem[i];
      const heard = Math.sqrt(acc / hop) * gain;
      if (heard < 1e-6) continue;
      const excess = P.linDb(heard) - P.linDb(mixRms);
      if (excess > worst.excessDb) worst = { excessDb: excess, voice: name, atSec: i0 / sr };
    }
  }
  return check("foreground", worst.excessDb <= FOREGROUND_MAX_DB, {
    maxDb: FOREGROUND_MAX_DB,
    worstExcessDb: round1(worst.excessDb),
    voice: worst.voice,
    atSec: round1(worst.atSec),
  });
}

function evaluateSoundRules(bed, extras) {
  const pad = extras && extras.pad;
  const padMotionDb = extras ? extras.padMotionDb : null;
  const checks = [
    checkSource(),
    checkHiss(bed),
    checkPump(bed, pad),
    checkPercussion(bed),
    checkBass(bed),
    checkPad(bed, padMotionDb),
    checkWidth(bed),
    checkTop(bed),
    checkForeground(bed),
  ];
  const fails = checks.filter((row) => !row.pass).map((row) => row.id);
  return {
    pass: fails.length === 0,
    fails,
    foregroundMaxDb: FOREGROUND_MAX_DB,
    checks,
  };
}

module.exports = {
  FOREGROUND_MAX_DB,
  MAX_DUCK_DB,
  evaluateSoundRules,
  harmonicEnough,
  hitSpan,
};
