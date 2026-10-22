/**
 * Score a bed against stored reference metrics. No reference audio.
 * Session Recall is the only pass reference. The other rows are context.
 */

const fs = require("node:fs");
const path = require("node:path");
const P = require("./sound-pro.cjs");

function round1(n) {
  return Math.round(n * 10) / 10;
}

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

function isRatio(id) {
  return id === "correlation" || id === "lowShare";
}

function loadBook() {
  const file = path.join(__dirname, "sound-reference.json");
  const book = JSON.parse(fs.readFileSync(file, "utf8"));
  if (book.audioStored !== false) {
    throw new Error("sound-reference.json must keep audioStored false");
  }
  return book;
}

function correlation(left, right, sampleRate, startSec, endSec) {
  const i0 = Math.max(0, Math.floor(startSec * sampleRate));
  const i1 = Math.min(left.length, right.length, Math.floor(endSec * sampleRate));
  let sumL = 0;
  let sumR = 0;
  let sumLL = 0;
  let sumRR = 0;
  let sumLR = 0;
  const n = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) {
    const l = left[i];
    const r = right[i];
    sumL += l;
    sumR += r;
    sumLL += l * l;
    sumRR += r * r;
    sumLR += l * r;
  }
  const meanL = sumL / n;
  const meanR = sumR / n;
  const num = sumLR - n * meanL * meanR;
  const den = Math.sqrt((sumLL - n * meanL * meanL) * (sumRR - n * meanR * meanR));
  if (!(den > 0)) return 1;
  return num / den;
}

function lowShare(left, right, sampleRate) {
  const low = P.bandRmsDb(left, right, sampleRate, 5.5, 15.4, 30, 120);
  const wide = P.bandRmsDb(left, right, sampleRate, 5.5, 15.4, 30, 8000);
  return Math.pow(10, (low - wide) / 10);
}

function gap(id, pass, bed, ref, extra) {
  const round = isRatio(id) ? round3 : round1;
  return {
    id,
    pass: Boolean(pass),
    bed: typeof bed === "number" ? round(bed) : bed,
    ref: typeof ref === "number" ? round(ref) : ref,
    delta: typeof bed === "number" && typeof ref === "number" ? round(bed - ref) : null,
    ...extra,
  };
}

function scorePrimary(measured, book) {
  const ref = book.references.find((row) => row.id === book.primary);
  const tol = book.tolerances;
  const gaps = [
    gap("lufs", Math.abs(measured.lufs - ref.lufs) <= tol.lufsDb, measured.lufs, ref.lufs),
    gap("crest", Math.abs(measured.crestDb - ref.crestDb) <= tol.crestDb, measured.crestDb, ref.crestDb),
    gap(
      "correlation",
      Math.abs(measured.correlation - ref.correlation) <= tol.correlation,
      measured.correlation,
      ref.correlation,
    ),
    gap(
      "sideUnderMid",
      measured.sideUnderMidDb <= tol.sideUnderMidHi && measured.sideUnderMidDb >= tol.sideUnderMidLo,
      measured.sideUnderMidDb,
      ref.sideUnderMidDb,
    ),
    gap(
      "lowShare",
      tol.lowShareLo != null && tol.lowShareHi != null
        ? measured.lowShare30to120 >= tol.lowShareLo && measured.lowShare30to120 <= tol.lowShareHi
        : Math.abs(measured.lowShare30to120 - ref.lowShare30to120) <= tol.lowShare,
      measured.lowShare30to120,
      ref.lowShare30to120,
      tol.lowShareLo != null ? { window: [tol.lowShareLo, tol.lowShareHi] } : undefined,
    ),
    gap(
      "band2to4",
      Math.abs(measured.band2to4Db - ref.band2to4Db) <= tol.bandDb,
      measured.band2to4Db,
      ref.band2to4Db,
    ),
    gap(
      "band4to8",
      Math.abs(measured.band4to8Db - ref.band4to8Db) <= tol.bandDb,
      measured.band4to8Db,
      ref.band4to8Db,
    ),
  ];
  return {
    id: ref.id,
    freesound: ref.freesound,
    pass: gaps.every((row) => row.pass),
    gaps,
  };
}

function evaluateReference(bed, measured) {
  const book = loadBook();
  const sr = bed.sampleRate;
  const stats = {
    lufs: measured.lufs,
    crestDb: measured.crestDb,
    correlation: correlation(bed.left, bed.right, sr, 5.5, 15.4),
    sideUnderMidDb: measured.sideUnderMidDb,
    lowShare30to120: lowShare(bed.left, bed.right, sr),
    band2to4Db: measured.band2to4Db,
    band4to8Db: measured.band4to8Db,
  };
  const primary = scorePrimary(stats, book);
  const context = book.references
    .filter((row) => row.id !== book.primary)
    .map((row) => ({
      id: row.id,
      role: row.role,
      freesound: row.freesound,
      sideUnderMidDb: row.sideUnderMidDb,
      lowShare30to120: row.lowShare30to120,
      lufs: row.lufs,
      gated: false,
    }));
  return {
    audioStored: false,
    primary: book.primary,
    pass: primary.pass,
    measured: {
      lufs: round1(stats.lufs),
      crestDb: round1(stats.crestDb),
      correlation: round3(stats.correlation),
      sideUnderMidDb: round1(stats.sideUnderMidDb),
      lowShare30to120: round3(stats.lowShare30to120),
      band2to4Db: round1(stats.band2to4Db),
      band4to8Db: round1(stats.band4to8Db),
    },
    gaps: primary.gaps,
    fails: primary.gaps.filter((row) => !row.pass).map((row) => row.id),
    context,
  };
}

async function cli(argv) {
  const variant = argv[0];
  if (!variant) {
    process.stderr.write("Usage: sound reference <variant>\n");
    return 1;
  }
  const magnetic = require("./sound-magnetic.cjs");
  const bed = await magnetic.loadBed(variant);
  const metrics = magnetic.measureBed(bed);
  const report = {
    name: bed.name,
    rules: {
      pass: metrics.rules.pass,
      checks: metrics.rules.checks.map((row) => ({ id: row.id, pass: row.pass })),
    },
    reference: {
      pass: metrics.reference.pass,
      audioStored: false,
      gaps: metrics.reference.gaps.map((row) => ({
        id: row.id,
        pass: row.pass,
        bed: row.bed,
        ref: row.ref,
        delta: row.delta,
        ...(row.window ? { window: row.window } : {}),
      })),
    },
    earReady: metrics.earReady,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  return metrics.earReady ? 0 : 1;
}

module.exports = {
  loadBook,
  evaluateReference,
  correlation,
  cli,
};
