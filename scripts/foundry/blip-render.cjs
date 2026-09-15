/**
 * Factory-blip spine: brief → checksum seed → picture mode → 4.44s mp4 → inspect gate.
 * Still = seeded image looped. Orb = simple animated frames (named type only).
 * Headless ffmpeg. Not mill. Not a FiveDimensionalVisualizer port.
 *
 * Animation SSOT: cloud cannot clone htafolla/rippel-synapse-flow (ls-remote 404).
 * Tray only — do not invent orb/waves construction numbers or viz params.
 *   rippel-anim-ssot.tgz → animationIcons.ts, types/index.ts, SimplifiedVisualConverter.tsx
 *   RIPPEL-ANIM-TYPES.md
 * Commit not in tray — never guess.
 */

const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SPINE = 1;
const DURATION_SEC = 4.44;
const DURATION_TOL_SEC = 0.12;
/** RIPPEL-ANIM-TYPES.md Codex line: Orb Glow · Wave Flow · Geo Rise · Spark Drift (~30fps). */
const FPS = 30;
/** Factory encode size. Tray CanvasConfig has width/height/fps fields but no values — do not guess Rippel canvas. */
const WIDTH = 320;
const HEIGHT = 180;
const RECEIPT_REL = path.join(".xray", "blip", "receipt.json");
const MP4_REL = path.join(".xray", "blip", "blip.mp4");

/** animationIcons.ts + types/index.ts — do not invent names. */
const RIPPEL_ANIMATION = ["orb", "swirl", "snap", "waves", "spark"];
const ANIMATION_TO_VISUALIZATION = {
  orb: "canvas",
  swirl: "3d-sacred",
  snap: "neural",
  waves: "waveform",
  spark: "particles",
};
const ANIMATION_NAMES = {
  orb: "Orb",
  swirl: "Swirl",
  snap: "Snap",
  waves: "Waves",
  spark: "Spark",
};
const PICTURE_MODES = ["still", ...RIPPEL_ANIMATION];
const MVP_MODES = ["still", "orb"];
const DAY2_MODES = ["swirl", "snap", "waves", "spark"];

const SSOT = {
  repo: "htafolla/rippel-synapse-flow",
  commit: null,
  access: "tray",
  tray: "rippel-anim-ssot.tgz",
  paths: ["animationIcons.ts", "types/index.ts", "SimplifiedVisualConverter.tsx"],
  note: "RIPPEL-ANIM-TYPES.md",
  animation: RIPPEL_ANIMATION,
  visualization: ANIMATION_TO_VISUALIZATION,
  names: ANIMATION_NAMES,
  still: true,
  mvp: MVP_MODES,
};

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function seedFromBrief(brief, mode) {
  const payload = canonicalJson({
    brief: String(brief || "").trim(),
    mode: resolveMode(mode).id || "still",
    durationSec: DURATION_SEC,
    spine: SPINE,
  });
  const digest = crypto.createHash("sha256").update(payload, "utf8").digest("hex");
  return `0x${digest}`;
}

function seedRgb(seedHex) {
  const hex = String(seedHex || "").replace(/^0x/, "");
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return {
    r: Number.isFinite(r) ? r : 0,
    g: Number.isFinite(g) ? g : 0,
    b: Number.isFinite(b) ? b : 0,
  };
}

function resolveMode(name) {
  const id = String(name || "still")
    .trim()
    .toLowerCase();
  if (MVP_MODES.includes(id)) {
    return {
      id,
      ok: true,
      mvp: true,
      visualization: id === "orb" ? ANIMATION_TO_VISUALIZATION.orb : null,
    };
  }
  if (DAY2_MODES.includes(id) || RIPPEL_ANIMATION.includes(id)) {
    return {
      id,
      ok: false,
      mvp: false,
      day2: true,
      visualization: ANIMATION_TO_VISUALIZATION[id] || null,
      reason: `picture mode "${id}" is day-2 (MVP is still|orb; Animation = orb|swirl|snap|waves|spark plus still)`,
    };
  }
  return {
    id,
    ok: false,
    mvp: false,
    reason: `unknown picture mode "${id}" (Rippel: still|orb|swirl|snap|waves|spark; MVP: still|orb)`,
  };
}

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function writePpm(file, width, height, paint) {
  const header = Buffer.from(`P6\n${width} ${height}\n255\n`);
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = paint(x, y);
      const i = (y * width + x) * 3;
      pixels[i] = clampByte(rgb[0]);
      pixels[i + 1] = clampByte(rgb[1]);
      pixels[i + 2] = clampByte(rgb[2]);
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([header, pixels]));
  return file;
}

/** Seeded still image: checksum RGB fill. Not a Rippel vis construction. */
function paintStill(rgb) {
  return function paint() {
    return [rgb.r, rgb.g, rgb.b];
  };
}

/**
 * Named type orb → canvas. Factory disk on a black canvas.
 * Radius is factory layout (min/3), not InteractiveCanvas / FiveDimensionalVisualizer.
 * Phase is t / DURATION_SEC (ticket length), not a guessed orb LFO.
 */
function paintOrb(rgb, t) {
  const cx = (WIDTH - 1) / 2;
  const cy = (HEIGHT - 1) / 2;
  const radius = Math.floor(Math.min(WIDTH, HEIGHT) / 3);
  const phase = DURATION_SEC > 0 ? t / DURATION_SEC : 0;
  const lit = 0.5 + 0.5 * Math.sin(2 * Math.PI * phase);
  return function paint(x, y) {
    if (Math.hypot(x - cx, y - cy) > radius) return [0, 0, 0];
    return [rgb.r * lit, rgb.g * lit, rgb.b * lit];
  };
}

function runTool(bin, args, label) {
  const result = spawnSync(bin, args, { encoding: "utf8" });
  if (result.error) {
    const err = new Error(`${label} missing (${bin})`);
    err.code = "BLIP_FFMPEG_MISSING";
    throw err;
  }
  if (result.status !== 0) {
    const err = new Error(`${label} failed: ${(result.stderr || result.stdout || "").trim() || "exit"}`);
    err.code = "BLIP_FFMPEG_FAIL";
    throw err;
  }
  return result;
}

function encodeStill(ppm, mp4) {
  runTool(
    "ffmpeg",
    [
      "-y",
      "-loop",
      "1",
      "-i",
      ppm,
      "-t",
      String(DURATION_SEC),
      "-r",
      String(FPS),
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "28",
      "-an",
      "-movflags",
      "+faststart",
      mp4,
    ],
    "ffmpeg still",
  );
}

function encodeOrb(framesDir, frameCount, mp4) {
  runTool(
    "ffmpeg",
    [
      "-y",
      "-framerate",
      String(FPS),
      "-i",
      path.join(framesDir, "frame_%04d.ppm"),
      "-frames:v",
      String(frameCount),
      "-t",
      String(DURATION_SEC),
      "-pix_fmt",
      "yuv420p",
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-crf",
      "28",
      "-an",
      "-movflags",
      "+faststart",
      mp4,
    ],
    "ffmpeg orb",
  );
}

function muxBed(video, bed, mp4) {
  runTool(
    "ffmpeg",
    [
      "-y",
      "-i",
      video,
      "-i",
      bed,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-af",
      "apad",
      "-t",
      String(DURATION_SEC),
      "-movflags",
      "+faststart",
      mp4,
    ],
    "ffmpeg mux",
  );
}

function probeMedia(file) {
  if (!file || !fs.existsSync(file)) {
    return { ok: false, reason: "mp4 missing", hasVideo: false, hasAudio: false, durationSec: null };
  }
  const durationRun = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8" },
  );
  if (durationRun.error) {
    return { ok: false, reason: "ffprobe missing", hasVideo: false, hasAudio: false, durationSec: null };
  }
  if (durationRun.status !== 0) {
    return {
      ok: false,
      reason: "mp4 unreadable",
      hasVideo: false,
      hasAudio: false,
      durationSec: null,
    };
  }
  const durationSec = Number.parseFloat(String(durationRun.stdout || "").trim());
  const streamsRun = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  const types = String(streamsRun.stdout || "")
    .split(/\s+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hasVideo = types.includes("video");
  const hasAudio = types.includes("audio");
  return {
    ok: Number.isFinite(durationSec) && hasVideo,
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
    hasVideo,
    hasAudio,
    reason: !hasVideo ? "video stream missing" : null,
  };
}

function evaluateProbe(probe, opts = {}) {
  const wantAudio = Boolean(opts.wantAudio);
  const durationSec = probe.durationSec;
  const durationOk =
    Number.isFinite(durationSec) && Math.abs(durationSec - DURATION_SEC) <= DURATION_TOL_SEC;
  const fileOk = Boolean(probe.ok && probe.hasVideo);
  const audioOk = !wantAudio || Boolean(probe.hasAudio);
  const gates = {
    file: fileOk,
    duration: durationOk,
    video: Boolean(probe.hasVideo),
    audio: audioOk,
    mode: Boolean(opts.mode),
  };
  let reason = null;
  if (!fileOk) reason = probe.reason || "mp4 missing";
  else if (!gates.mode) reason = "mode missing";
  else if (!durationOk) reason = `duration ${durationSec}s not ${DURATION_SEC}s±${DURATION_TOL_SEC}`;
  else if (!audioOk) reason = "audio stream missing";
  const status = Object.values(gates).every(Boolean) ? "PASS" : "FAIL";
  return {
    status,
    failClosed: true,
    gates,
    durationSec,
    hasVideo: Boolean(probe.hasVideo),
    hasAudio: Boolean(probe.hasAudio),
    reason,
  };
}

function evaluateMp4File(file, opts = {}) {
  return evaluateProbe(probeMedia(file), opts);
}

function receiptPath(root) {
  return path.join(root, RECEIPT_REL);
}

function defaultMp4Path(root) {
  return path.join(root, MP4_REL);
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

function visualizationFor(mode) {
  if (mode === "still") return null;
  return ANIMATION_TO_VISUALIZATION[mode] || null;
}

function buildReceipt(input, evaled) {
  const status = evaled.status === "PASS" ? "PASS" : "FAIL";
  return {
    kind: "blip",
    status,
    failClosed: true,
    brief: input.brief,
    seed: input.seed,
    mode: input.mode,
    visualization: visualizationFor(input.mode),
    durationSec: DURATION_SEC,
    measuredDurationSec: evaled.durationSec ?? null,
    engine: "ffmpeg-headless",
    ssot: SSOT,
    mp4: input.mp4Rel || input.mp4,
    bed: input.bedRel || input.bed || null,
    hasVideo: Boolean(evaled.hasVideo),
    hasAudio: Boolean(evaled.hasAudio),
    gates: evaled.gates || {
      file: false,
      duration: false,
      video: false,
      audio: false,
      mode: false,
    },
    reason: evaled.reason || null,
    spine: SPINE,
    writtenAt: new Date().toISOString(),
  };
}

function evaluateReceipt(root, receipt) {
  if (!receipt || typeof receipt !== "object") {
    return { status: "FAIL", failClosed: true, reason: "receipt-unreadable" };
  }
  if (receipt.reason === "receipt-unreadable") {
    return { status: "FAIL", failClosed: true, reason: "receipt-unreadable" };
  }
  const mode = resolveMode(receipt.mode);
  if (receipt.status !== "PASS") {
    return {
      status: "FAIL",
      failClosed: true,
      mode: receipt.mode || null,
      durationSec: receipt.durationSec ?? DURATION_SEC,
      mp4: receipt.mp4 || null,
      hasVideo: receipt.hasVideo ?? null,
      hasAudio: receipt.hasAudio ?? null,
      reason: receipt.reason || "blip receipt FAIL",
    };
  }
  const mp4Rel = typeof receipt.mp4 === "string" ? receipt.mp4 : MP4_REL;
  const mp4 = path.isAbsolute(mp4Rel) ? mp4Rel : path.join(root, mp4Rel);
  const evaled = evaluateMp4File(mp4, { mode: mode.ok ? mode.id : receipt.mode, wantAudio: Boolean(receipt.bed) });
  return {
    ...evaled,
    mode: receipt.mode || null,
    mp4: mp4Rel,
  };
}

function failReceipt(root, input, reason, extra = {}) {
  const receipt = buildReceipt(input, {
    status: "FAIL",
    failClosed: true,
    durationSec: extra.durationSec ?? null,
    hasVideo: extra.hasVideo ?? false,
    hasAudio: extra.hasAudio ?? false,
    gates: extra.gates || {
      file: false,
      duration: false,
      video: false,
      audio: false,
      mode: Boolean(input.mode),
    },
    reason,
  });
  writeReceipt(root, receipt);
  return { receipt, mp4: input.mp4, seed: input.seed };
}

function renderBlip(opts = {}) {
  const root = opts.root || process.cwd();
  const brief = String(opts.brief || "factory-blip");
  const modeInfo = resolveMode(opts.mode);
  const seed = opts.seed || seedFromBrief(brief, modeInfo.id);
  const mp4 = opts.out ? path.resolve(root, opts.out) : defaultMp4Path(root);
  const bed = opts.bed ? path.resolve(root, opts.bed) : null;
  const input = {
    brief,
    seed,
    mode: modeInfo.id,
    mp4,
    mp4Rel: path.relative(root, mp4) || mp4,
    bed: bed || null,
    bedRel: bed ? path.relative(root, bed) || bed : null,
  };

  if (!modeInfo.ok) {
    return failReceipt(root, input, modeInfo.reason);
  }
  if (bed && !fs.existsSync(bed)) {
    return failReceipt(root, input, `bed missing: ${opts.bed}`);
  }

  fs.mkdirSync(path.dirname(mp4), { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "xray-foundry-blip-"));
  try {
    const rgb = seedRgb(seed);
    const picture = path.join(work, "picture.mp4");
    if (modeInfo.id === "still") {
      const ppm = path.join(work, "still.ppm");
      writePpm(ppm, WIDTH, HEIGHT, paintStill(rgb));
      encodeStill(ppm, picture);
    } else {
      const frames = Math.max(1, Math.round(DURATION_SEC * FPS));
      for (let i = 0; i < frames; i++) {
        const t = i / FPS;
        writePpm(
          path.join(work, `frame_${String(i + 1).padStart(4, "0")}.ppm`),
          WIDTH,
          HEIGHT,
          paintOrb(rgb, t),
        );
      }
      encodeOrb(work, frames, picture);
    }
    if (bed) muxBed(picture, bed, mp4);
    else fs.copyFileSync(picture, mp4);
    const evaled = evaluateMp4File(mp4, { mode: modeInfo.id, wantAudio: Boolean(bed) });
    const receipt = buildReceipt(input, evaled);
    writeReceipt(root, receipt);
    return { receipt, mp4, seed };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return failReceipt(root, input, reason);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

module.exports = {
  SPINE,
  DURATION_SEC,
  DURATION_TOL_SEC,
  FPS,
  WIDTH,
  HEIGHT,
  RECEIPT_REL,
  MP4_REL,
  RIPPEL_ANIMATION,
  ANIMATION_TO_VISUALIZATION,
  ANIMATION_NAMES,
  PICTURE_MODES,
  MVP_MODES,
  DAY2_MODES,
  SSOT,
  seedFromBrief,
  resolveMode,
  seedRgb,
  writePpm,
  renderBlip,
  probeMedia,
  evaluateMp4File,
  evaluateReceipt,
  receiptPath,
  defaultMp4Path,
  writeReceipt,
  readReceipt,
  buildReceipt,
};
