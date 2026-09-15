/**
 * Factory-blip plant spine — sibling to mill + sound, not a mill bolt-on.
 * Brief → checksum seed → registry picture mode → 4.44s mp4 → inspect gate.
 * Headless ffmpeg. Plant-first. Pair seat is later (not this plant PR).
 *
 * Motions live in plant/motions/registry.json (dynamic). v0 = still + Rippel five.
 * Kapow is a growth stub (renderer null → FAIL). Unknown id FAIL.
 * Still + motions wear the Power Plant intro plate — not seed-RGB stock.
 *
 * Rippel imports: cloud ls-remote of htafolla/rippel-synapse-flow is 404 here.
 * Tray: animationIcons.ts Animation + ANIMATION_TO_VISUALIZATION. Commit not in tray.
 */

const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const SPINE = 1;
const DURATION_SEC = 4.44;
const DURATION_TOL_SEC = 0.12;
/** RIPPEL-ANIM-TYPES.md Codex line (~30fps). Factory encode, not a guessed Rippel canvas. */
const FPS = 30;
const WIDTH = 320;
const HEIGHT = 180;
const RECEIPT_REL = path.join(".xray", "blip", "receipt.json");
const MP4_REL = path.join(".xray", "blip", "blip.mp4");
const REGISTRY_REL = path.join("plant", "motions", "registry.json");

const RIPPEL_IMPORTS = ["orb", "swirl", "snap", "waves", "spark"];
const V0_IDS = ["still", ...RIPPEL_IMPORTS];
const STILL_PLATES = ["titlecard", "corridor", "rain", "endcard"];

/** Power Plant intro plate — HARD design SSOT. Hard cuts, flat vector. */
const PALETTE = {
  void: "#08090B",
  ink: "#F5F7FA",
  cyan: "#3DE0E8",
  gold: "#F5C518",
  blue: "#4A7FD4",
};
const PLATE = "power-plant-intro";

function hexRgb(hex) {
  const h = String(hex || "").replace(/^#/, "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

const RGB = {
  void: hexRgb(PALETTE.void),
  ink: hexRgb(PALETTE.ink),
  cyan: hexRgb(PALETTE.cyan),
  gold: hexRgb(PALETTE.gold),
  blue: hexRgb(PALETTE.blue),
};

const SSOT = {
  repo: "htafolla/rippel-synapse-flow",
  commit: null,
  access: "tray",
  tray: "rippel-anim-ssot.tgz",
  paths: ["animationIcons.ts", "types/index.ts", "SimplifiedVisualConverter.tsx"],
  note: "RIPPEL-ANIM-TYPES.md + MOTION-REGISTRY.md",
};

function defaultRegistryPath() {
  return path.join(__dirname, REGISTRY_REL);
}

function loadRegistry(registryPath) {
  const file = registryPath || defaultRegistryPath();
  if (!fs.existsSync(file)) {
    const err = new Error(`motion registry missing: ${file}`);
    err.code = "BLIP_REGISTRY_MISSING";
    throw err;
  }
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  const motions = Array.isArray(parsed?.motions) ? parsed.motions : [];
  const byId = new Map();
  for (const entry of motions) {
    if (entry && typeof entry.id === "string" && entry.id.trim()) {
      byId.set(entry.id.trim(), entry);
    }
  }
  return { file, raw: parsed, motions, byId };
}

function listMotionIds(registryPath) {
  return loadRegistry(registryPath).motions.map((entry) => entry.id).filter(Boolean);
}

function listV0Ids(registryPath) {
  const loaded = loadRegistry(registryPath);
  const v0 = Array.isArray(loaded.raw?.v0) ? loaded.raw.v0 : V0_IDS;
  return v0.filter((id) => typeof id === "string");
}

function canonicalJson(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function parsePictureMode(raw) {
  const text = String(raw || "still")
    .trim()
    .toLowerCase();
  if (!text) return { pictureMode: "still", motionId: "still" };
  if (text === "still" || text === "motion:still") {
    return { pictureMode: "still", motionId: "still" };
  }
  if (text.startsWith("motion:")) {
    const motionId = text.slice("motion:".length).trim();
    return { pictureMode: motionId === "still" ? "still" : `motion:${motionId}`, motionId };
  }
  return {
    pictureMode: `motion:${text}`,
    motionId: text,
  };
}

function resolveMode(name, registryPath) {
  const parsed = parsePictureMode(name);
  const motionId = parsed.motionId;
  if (!motionId) {
    return {
      ok: false,
      id: "",
      pictureMode: parsed.pictureMode,
      motionId: "",
      reason: "unknown motion id",
    };
  }
  let loaded;
  try {
    loaded = loadRegistry(registryPath);
  } catch (err) {
    return {
      ok: false,
      id: motionId,
      pictureMode: parsed.pictureMode,
      motionId,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
  const entry = loaded.byId.get(motionId);
  if (!entry) {
    return {
      ok: false,
      id: motionId,
      pictureMode: parsed.pictureMode,
      motionId,
      reason: `unknown motion id "${motionId}"`,
    };
  }
  if (!entry.renderer) {
    return {
      ok: false,
      id: motionId,
      pictureMode: parsed.pictureMode,
      motionId,
      entry,
      visualization: entry.visualization || null,
      reason: `motion "${motionId}" is registered but has no renderer (growth/stub)`,
    };
  }
  return {
    ok: true,
    id: motionId,
    pictureMode: parsed.pictureMode,
    motionId,
    renderer: entry.renderer,
    visualization: entry.visualization || null,
    source: entry.source || null,
    entry,
  };
}

function seedFromBrief(brief, mode) {
  const parsed = parsePictureMode(mode);
  const payload = canonicalJson({
    brief: String(brief || "").trim(),
    motionId: parsed.motionId,
    durationSec: DURATION_SEC,
    spine: SPINE,
  });
  return `0x${crypto.createHash("sha256").update(payload, "utf8").digest("hex")}`;
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

function seedU32(seedHex, offset) {
  const hex = String(seedHex || "").replace(/^0x/, "");
  const n = Number.parseInt(hex.slice(offset, offset + 8), 16);
  return Number.isFinite(n) ? n >>> 0 : 1;
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

function phase(t) {
  return DURATION_SEC > 0 ? t / DURATION_SEC : 0;
}

function inBox(x, y, x0, y0, x1, y1) {
  return x >= x0 && x < x1 && y >= y0 && y < y1;
}

function onEdge(x, y, x0, y0, x1, y1) {
  return inBox(x, y, x0, y0, x1, y1) && (x === x0 || x === x1 - 1 || y === y0 || y === y1 - 1);
}

function stillPlate(seedHex) {
  return STILL_PLATES[seedU32(seedHex, 0) % STILL_PLATES.length];
}

/** Shared Power Plant chrome on every still — gold/cyan ticks, ink label, blue node. */
function paintChrome(x, y) {
  if (y >= 6 && y < 8 && x >= 136 && x < 168) return RGB.gold;
  if (y >= 6 && y < 8 && x >= 168 && x < 184) return RGB.cyan;
  if (inBox(x, y, 24, 164, 120, 172)) return RGB.ink;
  if (inBox(x, y, 292, 164, 308, 176)) return RGB.blue;
  return null;
}

/**
 * Still generator: Power Plant plate (titlecard / corridor / rain / endcard).
 * Seed picks the plate. Colors stay the five hexes — not seed-RGB stock.
 */
function paintStill(seedHex) {
  const plate = stillPlate(seedHex);
  return function paint(x, y) {
    const chrome = paintChrome(x, y);
    if (chrome) return chrome;

    if (plate === "titlecard") {
      const cards = [
        [12, 36, 84, 132],
        [88, 36, 160, 132],
        [164, 36, 236, 132],
        [240, 36, 312, 132],
      ];
      for (let i = 0; i < cards.length; i++) {
        const [x0, y0, x1, y1] = cards[i];
        if (onEdge(x, y, x0, y0, x1, y1)) return i % 2 === 0 ? RGB.cyan : RGB.gold;
        if (inBox(x, y, x0 + 1, y0 + 1, x1 - 1, y1 - 1)) {
          if (i === 1 && inBox(x, y, 118, 64, 130, 120)) return RGB.blue;
          if (i === 2 && (x + y) % 8 === 0) return RGB.cyan;
          return RGB.void;
        }
      }
      return RGB.void;
    }

    if (plate === "corridor") {
      if (x >= 156 && x < 164) return RGB.cyan;
      if (inBox(x, y, 148, 72, 172, 148)) return RGB.blue;
      return RGB.void;
    }

    if (plate === "rain") {
      if (x > 188 && y > 28 && y < 150 && (x + 3 * y) % 9 === 0) return RGB.cyan;
      if (inBox(x, y, 208, 52, 268, 124)) return RGB.blue;
      return RGB.void;
    }

    if (inBox(x, y, 208, 64, 300, 96)) return RGB.ink;
    if (inBox(x, y, 208, 104, 248, 116)) return RGB.gold;
    return RGB.void;
  };
}

/** orb → canvas. Hard rings on void. Phase is ticket duration, not a guessed Rippel LFO. */
function paintOrb(t) {
  const cx = (WIDTH - 1) / 2;
  const cy = (HEIGHT - 1) / 2;
  const pulse = Math.sin(2 * Math.PI * phase(t)) > 0 ? 4 : 0;
  return function paint(x, y) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < 18) return RGB.gold;
    if (d < 36 + pulse) return RGB.cyan;
    if (d < 40 + pulse) return RGB.ink;
    return RGB.void;
  };
}

/** swirl → 3d-sacred. Flat cyan / gold / blue arms. */
function paintSwirl(t) {
  const cx = (WIDTH - 1) / 2;
  const cy = (HEIGHT - 1) / 2;
  const spin = 2 * Math.PI * phase(t);
  return function paint(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    if (d > Math.min(WIDTH, HEIGHT) / 2) return RGB.void;
    const ang = Math.atan2(dy, dx) + spin + d / 18;
    const arm = Math.abs(Math.sin(ang * 3));
    if (arm < 0.55) return RGB.void;
    const turned = ((ang % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const sector = Math.floor(turned / ((Math.PI * 2) / 3)) % 3;
    if (sector === 0) return RGB.cyan;
    if (sector === 1) return RGB.gold;
    return RGB.blue;
  };
}

/** snap → neural. Agent-blue grid, cyan nodes, gold flash. */
function paintSnap(t) {
  const on = Math.sin(2 * Math.PI * phase(t)) > 0;
  return function paint(x, y) {
    const nearX = x % 40 < 2 || x % 40 > 38;
    const nearY = y % 30 < 2 || y % 30 > 28;
    const node = x % 40 < 4 && y % 30 < 4;
    if (node) return on ? RGB.gold : RGB.cyan;
    if (nearX || nearY) return RGB.blue;
    return RGB.void;
  };
}

/** waves → waveform. Cyan band, gold cut, blue field. */
function paintWaves(t) {
  const mid = (HEIGHT - 1) / 2;
  const shift = phase(t) * WIDTH;
  return function paint(x, y) {
    const wave = mid + Math.sin((x + shift) / 12) * (HEIGHT / 5);
    const d = Math.abs(y - wave);
    if (d < 2) return RGB.gold;
    if (d < 5) return RGB.cyan;
    if (y > wave) return RGB.blue;
    return RGB.void;
  };
}

/** spark → particles. Cyan / gold / ink dots on void. */
function paintSpark(t, seedHex) {
  const dots = [];
  let s = seedU32(seedHex, 8);
  const colors = [RGB.cyan, RGB.gold, RGB.ink];
  for (let i = 0; i < 28; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    dots.push({
      x: s % WIDTH,
      y: (s >>> 9) % HEIGHT,
      c: colors[i % 3],
    });
  }
  const drift = phase(t) * 40;
  return function paint(x, y) {
    for (const dot of dots) {
      const dx = x - ((dot.x + drift) % WIDTH);
      const dy = y - dot.y;
      if (dx * dx + dy * dy < 9) return dot.c;
    }
    return RGB.void;
  };
}

function painterFor(renderer, t, seedHex) {
  if (renderer === "still") return paintStill(seedHex);
  if (renderer === "orb") return paintOrb(t);
  if (renderer === "swirl") return paintSwirl(t);
  if (renderer === "snap") return paintSnap(t);
  if (renderer === "waves") return paintWaves(t);
  if (renderer === "spark") return paintSpark(t, seedHex);
  return null;
}

function hasFfmpeg() {
  const result = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
  return !result.error && result.status === 0;
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

function encodeFrames(framesDir, frameCount, mp4) {
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
    "ffmpeg motion",
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
    return { ok: false, reason: "mp4 unreadable", hasVideo: false, hasAudio: false, durationSec: null };
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

function buildReceipt(input, evaled) {
  const status = evaled.status === "PASS" ? "PASS" : "FAIL";
  return {
    kind: "blip",
    plant: "blip",
    status,
    failClosed: true,
    brief: input.brief,
    seed: input.seed,
    pictureMode: input.pictureMode,
    motionId: input.motionId,
    mode: input.motionId,
    visualization: input.visualization || null,
    palette: PALETTE,
    plate: PLATE,
    stillPlate: input.stillPlate || null,
    durationSec: DURATION_SEC,
    measuredDurationSec: evaled.durationSec ?? null,
    engine: "ffmpeg-headless",
    ssot: SSOT,
    registry: input.registryIds || listMotionIds(),
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
  const modeRaw = receipt.pictureMode || receipt.mode;
  const mode = resolveMode(modeRaw);
  if (receipt.status !== "PASS") {
    return {
      status: "FAIL",
      failClosed: true,
      mode: receipt.motionId || receipt.mode || null,
      pictureMode: receipt.pictureMode || null,
      durationSec: receipt.durationSec ?? DURATION_SEC,
      mp4: receipt.mp4 || null,
      hasVideo: receipt.hasVideo ?? null,
      hasAudio: receipt.hasAudio ?? null,
      reason: receipt.reason || "blip receipt FAIL",
    };
  }
  if (!mode.ok) {
    return {
      status: "FAIL",
      failClosed: true,
      mode: mode.motionId || null,
      pictureMode: mode.pictureMode || null,
      reason: mode.reason || "unknown motion id",
    };
  }
  const mp4Rel = typeof receipt.mp4 === "string" ? receipt.mp4 : MP4_REL;
  const mp4 = path.isAbsolute(mp4Rel) ? mp4Rel : path.join(root, mp4Rel);
  const evaled = evaluateMp4File(mp4, {
    mode: mode.motionId,
    wantAudio: Boolean(receipt.bed),
  });
  return {
    ...evaled,
    mode: mode.motionId,
    pictureMode: mode.pictureMode,
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
      mode: Boolean(input.motionId),
    },
    reason,
  });
  writeReceipt(root, receipt);
  return { receipt, mp4: input.mp4, seed: input.seed };
}

function renderBlip(opts = {}) {
  const root = opts.root || process.cwd();
  const brief = String(opts.brief || "factory-blip");
  const modeInfo = resolveMode(opts.pictureMode || opts.mode, opts.registryPath);
  const seed = opts.seed || seedFromBrief(brief, modeInfo.motionId || modeInfo.id);
  const mp4 = opts.out ? path.resolve(root, opts.out) : defaultMp4Path(root);
  const bed = opts.bed ? path.resolve(root, opts.bed) : null;
  const input = {
    brief,
    seed,
    pictureMode: modeInfo.pictureMode,
    motionId: modeInfo.motionId || modeInfo.id,
    visualization: modeInfo.visualization || null,
    stillPlate: modeInfo.renderer === "still" ? stillPlate(seed) : null,
    registryIds: listMotionIds(opts.registryPath),
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
    const picture = path.join(work, "picture.mp4");
    if (modeInfo.renderer === "still") {
      const ppm = path.join(work, "still.ppm");
      writePpm(ppm, WIDTH, HEIGHT, paintStill(seed));
      encodeStill(ppm, picture);
    } else {
      const paint = (t) => painterFor(modeInfo.renderer, t, seed);
      if (!paint(0)) {
        return failReceipt(root, input, `no factory renderer for "${modeInfo.renderer}"`);
      }
      const frames = Math.max(1, Math.round(DURATION_SEC * FPS));
      for (let i = 0; i < frames; i++) {
        writePpm(
          path.join(work, `frame_${String(i + 1).padStart(4, "0")}.ppm`),
          WIDTH,
          HEIGHT,
          paint(i / FPS),
        );
      }
      encodeFrames(work, frames, picture);
    }
    if (bed) muxBed(picture, bed, mp4);
    else fs.copyFileSync(picture, mp4);
    const evaled = evaluateMp4File(mp4, { mode: modeInfo.motionId, wantAudio: Boolean(bed) });
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
  V0_IDS,
  RIPPEL_IMPORTS,
  STILL_PLATES,
  PALETTE,
  PLATE,
  RGB,
  SSOT,
  stillPlate,
  paintStill,
  defaultRegistryPath,
  loadRegistry,
  listMotionIds,
  listV0Ids,
  parsePictureMode,
  seedFromBrief,
  resolveMode,
  seedRgb,
  writePpm,
  hasFfmpeg,
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
