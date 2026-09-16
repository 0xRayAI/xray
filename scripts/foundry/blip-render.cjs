/**
 * Factory-blip plant spine — sibling to mill + sound, not a mill bolt-on.
 * Brief → checksum seed → registry picture mode → 4.44s mp4 + audio bed → inspect gate.
 *
 * Rippel v2 (TICKET-BLIP-RENDERER-UPGRADE): VisualConfig.circles at ≥720p.
 * Look (orb): focus (solid disc) | cage (Wu mesh). Body: mill (evolved) | rippel (refined drawers).
 * Sharp focus + tempo/frequency animation on all five viz.
 * Audio syncopates to the motion grid — same seed, tempo, and phase0=0.
 * Power Plant (`still` id) is a living ident — plate dissolves, not a frozen poster.
 * Seed mesh (family + gait + shells + faces) is the NFT fingerprint on every mint.
 * ffmpeg wireframe is --engine wireframe only.
 * HARD: every Blip muxes a 4.44s stereo AAC bed — missing stream or inaudible = inspect FAIL.
 *
 * Motions live in plant/motions/registry.json (dynamic). v0 = still + Rippel five.
 * Kapow is a growth stub (renderer null → FAIL). Unknown id FAIL.
 */

const crypto = require("crypto");
const { spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const rippel = require("./blip-rippel.cjs");
const sound = require("./sound-bed.cjs");

const SPINE = 1;
const DURATION_SEC = 4.44;
const DURATION_TOL_SEC = 0.12;
/** RIPPEL-ANIM-TYPES.md Codex line (~30fps). */
const FPS = 30;
/** Logical Power Plant plate. Output ident is ≥720p (same as the Rippel five). */
const PLATE_WIDTH = 320;
const PLATE_HEIGHT = 180;
const STILL_WIDTH = PLATE_WIDTH;
const STILL_HEIGHT = PLATE_HEIGHT;
const WIDTH = PLATE_WIDTH;
const HEIGHT = PLATE_HEIGHT;
const POWER_PLANT_ENGINE = "power-plant-headless";
const POWER_PLANT_LOOK = "power-plant-blip";
const MOTION_WIDTH = rippel.MOTION_WIDTH;
const MOTION_HEIGHT = rippel.MOTION_HEIGHT;
const RECEIPT_REL = path.join(".xray", "blip", "receipt.json");
const MP4_REL = path.join(".xray", "blip", "blip.mp4");
const REGISTRY_REL = path.join("plant", "motions", "registry.json");
/** Digital silence / near-silence. Real beds peak near 0 dBFS. */
const AUDIBLE_MAX_DB_MIN = -40;

const RIPPEL_IMPORTS = ["orb", "swirl", "snap", "waves", "spark"];
const V0_IDS = ["still", ...RIPPEL_IMPORTS];
const STILL_PLATES = ["titlecard", "corridor", "rain", "endcard"];

/** Power Plant intro plate — HARD design SSOT. Dissolves between plates, flat vector. */
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

const SSOT = rippel.SSOT;
const ANIMATION_TO_VISUALIZATION = rippel.ANIMATION_TO_VISUALIZATION;

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

function stillPlate(seedHex, t) {
  return plateClock(seedHex, t).plate;
}

function plateClock(seedHex, t) {
  const start = seedU32(seedHex, 0) % STILL_PLATES.length;
  const grid = sound.motionGrid(seedHex, "ambient");
  const beats = Math.max(STILL_PLATES.length, Math.floor(DURATION_SEC / grid.beatSec + 1e-9));
  const every = Math.max(1, Math.floor(beats / STILL_PLATES.length));
  const n = t == null || t <= 0 ? 0 : t >= DURATION_SEC ? DURATION_SEC - 1e-6 : t;
  const beatIndex = Math.floor(n / grid.beatSec);
  const step = Math.min(STILL_PLATES.length - 1, Math.floor(beatIndex / every));
  const span = every * grid.beatSec;
  const cutAt = step * span;
  const into = n - cutAt;
  const xfade = Math.min(0.32, Math.max(0.22, span * 0.28));
  let prevMix = 0;
  let prev = null;
  if (step > 0 && into < xfade) {
    prev = STILL_PLATES[(start + step - 1 + STILL_PLATES.length) % STILL_PLATES.length];
    const u = into / xfade;
    prevMix = 1 - u * u * (3 - 2 * u);
  }
  return {
    plate: STILL_PLATES[(start + step) % STILL_PLATES.length],
    prev,
    prevMix,
    u: span > 0 ? (n - cutAt) / span : 0,
    start,
    step,
    xfade,
  };
}

/** Shared Power Plant chrome on every plate — gold/cyan ticks, ink label, blue node. */
function paintChrome(x, y) {
  if (y >= 6 && y < 8 && x >= 136 && x < 168) return RGB.gold;
  if (y >= 6 && y < 8 && x >= 168 && x < 184) return RGB.cyan;
  if (inBox(x, y, 24, 164, 120, 172)) return RGB.ink;
  if (inBox(x, y, 292, 164, 308, 176)) return RGB.blue;
  return null;
}

/**
 * Power Plant ident — titlecard / corridor / rain / endcard over 4.44s.
 * Seed picks the opening plate, then the other three dissolve in (~140ms).
 * Flat vector, five hexes. u=0 of the opening plate matches the old lockup.
 */
function paintPlate(plate, u) {
  const slide = Math.floor(u * 28);
  return function paint(x, y) {
    if (plate === "titlecard") {
      const cards = [
        [12 - slide, 36, 84 - slide, 132],
        [88 - slide, 36, 160 - slide, 132],
        [164 - slide, 36, 236 - slide, 132],
        [240 - slide, 36, 312 - slide, 132],
      ];
      for (let i = 0; i < cards.length; i++) {
        const [x0, y0, x1, y1] = cards[i];
        if (onEdge(x, y, x0, y0, x1, y1)) return i % 2 === 0 ? RGB.cyan : RGB.gold;
        if (inBox(x, y, x0 + 1, y0 + 1, x1 - 1, y1 - 1)) {
          if (i === 1 && inBox(x, y, 118 - slide, 64, 130 - slide, 120)) return RGB.blue;
          if (i === 2 && (x + y) % 8 === 0) return RGB.cyan;
          return RGB.void;
        }
      }
      return RGB.void;
    }

    if (plate === "corridor") {
      const slit = 156 + slide;
      if (x >= slit && x < slit + 8) return RGB.cyan;
      if (inBox(x, y, 148, 72 - Math.floor(u * 16), 172, 148 - Math.floor(u * 16))) return RGB.blue;
      return RGB.void;
    }

    if (plate === "rain") {
      const fall = Math.floor(u * 36);
      if (x > 188 && y > 28 && y < 150 && (x + 3 * (y + fall)) % 9 === 0) return RGB.cyan;
      if (inBox(x, y, 208 + Math.floor(u * 12), 52, 268 + Math.floor(u * 12), 124)) return RGB.blue;
      return RGB.void;
    }

    if (inBox(x, y, 208 - slide, 64, 300 - slide, 96)) return RGB.ink;
    if (inBox(x, y, 208 - slide, 104, 248 - slide, 116)) return RGB.gold;
    return RGB.void;
  };
}

function mixPlateRgb(a, b, amount) {
  const w = Math.max(0, Math.min(1, amount));
  return [
    (a[0] + (b[0] - a[0]) * w + 0.5) | 0,
    (a[1] + (b[1] - a[1]) * w + 0.5) | 0,
    (a[2] + (b[2] - a[2]) * w + 0.5) | 0,
  ];
}

function paintStill(seedHex, t) {
  const clock = plateClock(seedHex, t || 0);
  const current = paintPlate(clock.plate, clock.u);
  const incoming = clock.prevMix > 0.01 && clock.prev ? paintPlate(clock.prev, 1) : null;
  return function paint(x, y) {
    const chrome = paintChrome(x, y);
    if (chrome) return chrome;
    const now = current(x, y);
    if (!incoming) return now;
    return mixPlateRgb(now, incoming(x, y), clock.prevMix);
  };
}

function paintStillFrame(buf, width, height, seedHex, t, brief) {
  const paint = paintStill(seedHex, t);
  for (let y = 0; y < height; y++) {
    const ly = Math.min(PLATE_HEIGHT - 1, ((y * PLATE_HEIGHT) / height) | 0);
    for (let x = 0; x < width; x++) {
      const lx = Math.min(PLATE_WIDTH - 1, ((x * PLATE_WIDTH) / width) | 0);
      const rgb = paint(lx, ly);
      const i = (y * width + x) * 3;
      buf[i] = clampByte(rgb[0]);
      buf[i + 1] = clampByte(rgb[1]);
      buf[i + 2] = clampByte(rgb[2]);
    }
  }
  if (width >= 1280) {
    rippel.paintMeshOverlay(buf, width, height, { seedHex, brief, t });
  }
  return buf;
}

function sampleStillFrames(seedHex) {
  const a = Buffer.alloc(PLATE_WIDTH * PLATE_HEIGHT * 3);
  const b = Buffer.alloc(PLATE_WIDTH * PLATE_HEIGHT * 3);
  paintStillFrame(a, PLATE_WIDTH, PLATE_HEIGHT, seedHex, 0);
  paintStillFrame(b, PLATE_WIDTH, PLATE_HEIGHT, seedHex, DURATION_SEC * 0.5);
  return { differ: rippel.framesDiffer(a, b), width: PLATE_WIDTH, height: PLATE_HEIGHT };
}

/** Wireframe fallback — old ffmpeg geometry. Kept if Rippel headless throws. */
function paintOrb(t, width, height) {
  const w = width || WIDTH;
  const h = height || HEIGHT;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const pulse = Math.sin(2 * Math.PI * phase(t)) > 0 ? 4 : 0;
  const scale = Math.min(w, h) / HEIGHT;
  return function paint(x, y) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < 18 * scale) return RGB.gold;
    if (d < (36 + pulse) * scale) return RGB.cyan;
    if (d < (40 + pulse) * scale) return RGB.ink;
    return RGB.void;
  };
}

function paintSwirl(t, width, height) {
  const w = width || WIDTH;
  const h = height || HEIGHT;
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  const spin = 2 * Math.PI * phase(t);
  return function paint(x, y) {
    const dx = x - cx;
    const dy = y - cy;
    const d = Math.hypot(dx, dy);
    if (d > Math.min(w, h) / 2) return RGB.void;
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

function paintSnap(t, width, height) {
  const w = width || WIDTH;
  const h = height || HEIGHT;
  const on = Math.sin(2 * Math.PI * phase(t)) > 0;
  const gx = Math.max(8, Math.round(40 * (w / WIDTH)));
  const gy = Math.max(8, Math.round(30 * (h / HEIGHT)));
  return function paint(x, y) {
    const nearX = x % gx < 2 || x % gx > gx - 2;
    const nearY = y % gy < 2 || y % gy > gy - 2;
    const node = x % gx < 4 && y % gy < 4;
    if (node) return on ? RGB.gold : RGB.cyan;
    if (nearX || nearY) return RGB.blue;
    return RGB.void;
  };
}

function paintWaves(t, width, height) {
  const w = width || WIDTH;
  const h = height || HEIGHT;
  const mid = (h - 1) / 2;
  const shift = phase(t) * w;
  return function paint(x, y) {
    const wave = mid + Math.sin((x + shift) / 12) * (h / 5);
    const d = Math.abs(y - wave);
    if (d < 2) return RGB.gold;
    if (d < 5) return RGB.cyan;
    if (y > wave) return RGB.blue;
    return RGB.void;
  };
}

function paintSpark(t, seedHex, width, height) {
  const w = width || WIDTH;
  const h = height || HEIGHT;
  const dots = [];
  let s = seedU32(seedHex, 8);
  const colors = [RGB.cyan, RGB.gold, RGB.ink];
  for (let i = 0; i < 28; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    dots.push({
      x: s % w,
      y: (s >>> 9) % h,
      c: colors[i % 3],
    });
  }
  const drift = phase(t) * 40;
  return function paint(x, y) {
    for (const dot of dots) {
      const dx = x - ((dot.x + drift) % w);
      const dy = y - dot.y;
      if (dx * dx + dy * dy < 9) return dot.c;
    }
    return RGB.void;
  };
}

function painterFor(renderer, t, seedHex, width, height) {
  if (renderer === "still") return paintStill(seedHex, t);
  if (renderer === "orb") return paintOrb(t, width, height);
  if (renderer === "swirl") return paintSwirl(t, width, height);
  if (renderer === "snap") return paintSnap(t, width, height);
  if (renderer === "waves") return paintWaves(t, width, height);
  if (renderer === "spark") return paintSpark(t, seedHex, width, height);
  return null;
}

function paintWireframeFrame(buf, width, height, renderer, t, seedHex) {
  const paint = painterFor(renderer, t, seedHex, width, height);
  if (!paint) {
    const err = new Error(`no factory renderer for "${renderer}"`);
    err.code = "BLIP_WIREFRAME_MISS";
    throw err;
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const rgb = paint(x, y);
      const i = (y * width + x) * 3;
      buf[i] = clampByte(rgb[0]);
      buf[i + 1] = clampByte(rgb[1]);
      buf[i + 2] = clampByte(rgb[2]);
    }
  }
  return buf;
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

function encodeRaw(rawFile, width, height, frameCount, mp4) {
  runTool(
    "ffmpeg",
    [
      "-y",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "-s",
      `${width}x${height}`,
      "-r",
      String(FPS),
      "-i",
      rawFile,
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
      "23",
      "-an",
      "-movflags",
      "+faststart",
      mp4,
    ],
    "ffmpeg motion",
  );
}

function writeRawMotion(rawFile, width, height, frameCount, paintInto) {
  const frameSize = width * height * 3;
  const buf = Buffer.alloc(frameSize);
  const fd = fs.openSync(rawFile, "w");
  try {
    for (let i = 0; i < frameCount; i++) {
      paintInto(buf, i / FPS);
      fs.writeSync(fd, buf);
    }
  } finally {
    fs.closeSync(fd);
  }
  return rawFile;
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
      "-af",
      "apad,aformat=channel_layouts=stereo",
      "-ar",
      "44100",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-t",
      String(DURATION_SEC),
      "-movflags",
      "+faststart",
      mp4,
    ],
    "ffmpeg mux",
  );
}

function probeAudio(file) {
  const chRun = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=channels",
      "-of",
      "default=nw=1:nk=1",
      file,
    ],
    { encoding: "utf8" },
  );
  const channels = Number.parseInt(String(chRun.stdout || "").trim(), 10);
  const levelRun = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" },
  );
  const text = `${levelRun.stdout || ""}\n${levelRun.stderr || ""}`;
  function db(name) {
    const matches = [...text.matchAll(new RegExp(`${name}:\\s*([-infINF+\\d.]+)`, "gi"))];
    const last = matches[matches.length - 1];
    if (!last) return null;
    const value = Number(last[1]);
    return Number.isFinite(value) || value === Number.NEGATIVE_INFINITY ? value : null;
  }
  return {
    channels: Number.isFinite(channels) ? channels : null,
    meanVolumeDb: db("mean_volume"),
    maxVolumeDb: db("max_volume"),
  };
}

function probeMedia(file) {
  if (!file || !fs.existsSync(file)) {
    return {
      ok: false,
      reason: "mp4 missing",
      hasVideo: false,
      hasAudio: false,
      durationSec: null,
      width: null,
      height: null,
    };
  }
  const durationRun = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file],
    { encoding: "utf8" },
  );
  if (durationRun.error) {
    return {
      ok: false,
      reason: "ffprobe missing",
      hasVideo: false,
      hasAudio: false,
      durationSec: null,
      width: null,
      height: null,
    };
  }
  if (durationRun.status !== 0) {
    return {
      ok: false,
      reason: "mp4 unreadable",
      hasVideo: false,
      hasAudio: false,
      durationSec: null,
      width: null,
      height: null,
    };
  }
  const durationSec = Number.parseFloat(String(durationRun.stdout || "").trim());
  const streamsRun = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "stream=codec_type,width,height", "-of", "csv=p=0", file],
    { encoding: "utf8" },
  );
  const lines = String(streamsRun.stdout || "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  let hasVideo = false;
  let hasAudio = false;
  let width = null;
  let height = null;
  for (const line of lines) {
    const parts = line.split(",").map((part) => part.trim());
    if (parts[0] === "video") {
      hasVideo = true;
      const w = Number.parseInt(parts[1], 10);
      const h = Number.parseInt(parts[2], 10);
      if (Number.isFinite(w)) width = w;
      if (Number.isFinite(h)) height = h;
    } else if (parts[0] === "audio") {
      hasAudio = true;
    } else if (parts.includes("audio")) {
      hasAudio = true;
    } else if (parts.includes("video")) {
      hasVideo = true;
    }
  }
  return {
    ok: Number.isFinite(durationSec) && hasVideo,
    durationSec: Number.isFinite(durationSec) ? durationSec : null,
    hasVideo,
    hasAudio,
    width,
    height,
    reason: !hasVideo ? "video stream missing" : null,
  };
}

function evaluateProbe(probe, opts = {}) {
  const wantAudio = opts.wantAudio !== false;
  const motion = Boolean(opts.motion);
  const durationSec = probe.durationSec;
  const durationOk =
    Number.isFinite(durationSec) && Math.abs(durationSec - DURATION_SEC) <= DURATION_TOL_SEC;
  const fileOk = Boolean(probe.ok && probe.hasVideo);
  const audio = opts.audio || {};
  const maxVolumeDb = audio.maxVolumeDb;
  const channels = audio.channels;
  const audibleOk = Number.isFinite(maxVolumeDb) && maxVolumeDb > AUDIBLE_MAX_DB_MIN;
  const stereoOk = channels === 2;
  const audioOk = !wantAudio || (Boolean(probe.hasAudio) && audibleOk && stereoOk);
  const width = probe.width;
  const height = probe.height;
  const resolutionOk =
    !motion || (Number.isFinite(width) && Number.isFinite(height) && width >= 1280 && height >= 720);
  const gates = {
    file: fileOk,
    duration: durationOk,
    video: Boolean(probe.hasVideo),
    audio: audioOk,
    mode: Boolean(opts.mode),
    resolution: resolutionOk,
  };
  let reason = null;
  if (!fileOk) reason = probe.reason || "mp4 missing";
  else if (!gates.mode) reason = "mode missing";
  else if (!durationOk) reason = `duration ${durationSec}s not ${DURATION_SEC}s±${DURATION_TOL_SEC}`;
  else if (wantAudio && !probe.hasAudio) reason = "audio stream missing";
  else if (wantAudio && !audibleOk) reason = "inaudible bed";
  else if (wantAudio && !stereoOk) reason = "audio not stereo";
  else if (!resolutionOk) reason = `motion ${width}×${height} below 720p`;
  const status = Object.values(gates).every(Boolean) ? "PASS" : "FAIL";
  return {
    status,
    failClosed: true,
    gates,
    durationSec,
    hasVideo: Boolean(probe.hasVideo),
    hasAudio: Boolean(probe.hasAudio),
    audioChannels: channels ?? null,
    meanVolumeDb: audio.meanVolumeDb ?? null,
    maxVolumeDb: maxVolumeDb ?? null,
    width: width ?? null,
    height: height ?? null,
    reason,
  };
}

function evaluateMp4File(file, opts = {}) {
  const probe = probeMedia(file);
  const audio = probe.hasAudio
    ? probeAudio(file)
    : { channels: null, meanVolumeDb: null, maxVolumeDb: null };
  return evaluateProbe(probe, { ...opts, audio });
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
    width: evaled.width ?? input.width ?? null,
    height: evaled.height ?? input.height ?? null,
    engine: input.engine || rippel.ENGINE,
    look: input.look || (input.engine === rippel.ENGINE ? rippel.LOOK : null),
    lookKind: input.lookKind || (input.visualConfig && input.visualConfig.lookKind) || null,
    bodyKind: input.bodyKind || (input.visualConfig && input.visualConfig.bodyKind) || null,
    genre: input.genre || (input.visualConfig && input.visualConfig.genre) || null,
    organ: input.organ || (input.visualConfig && input.visualConfig.organ) || null,
    fallback: input.fallback || false,
    bedSource: input.bedSource || null,
    visualConfig: input.visualConfig || null,
    grid: input.grid || null,
    ssot: SSOT,
    registry: input.registryIds || listMotionIds(),
    mp4: input.mp4Rel || input.mp4,
    bed: input.bedRel || input.bed || null,
    hasVideo: Boolean(evaled.hasVideo),
    hasAudio: Boolean(evaled.hasAudio),
    audioChannels: evaled.audioChannels ?? null,
    meanVolumeDb: evaled.meanVolumeDb ?? null,
    maxVolumeDb: evaled.maxVolumeDb ?? null,
    gates: evaled.gates || {
      file: false,
      duration: false,
      video: false,
      audio: false,
      mode: false,
      resolution: false,
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
    wantAudio: true,
    motion: true,
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
      resolution: false,
    },
    reason,
  });
  writeReceipt(root, receipt);
  return { receipt, mp4: input.mp4, seed: input.seed };
}

function resolveBed(opts, root, brief, work, seed) {
  if (opts.bed) {
    const bed = path.resolve(root, opts.bed);
    if (!fs.existsSync(bed)) {
      return { ok: false, reason: `bed missing: ${opts.bed}` };
    }
    return { ok: true, bed, source: "flag", grid: null };
  }
  try {
    const out = opts.autoBedOut
      ? path.resolve(root, opts.autoBedOut)
      : path.join(root, ".xray", "blip", "bed.wav");
    const rendered = sound.renderSamples({
      brief,
      genre: rippel.resolveGenreKind({ seedHex: seed, genre: opts.genre }),
      seconds: DURATION_SEC,
      seed,
      syncopate: true,
    });
    sound.writeWav16Mono(out, rendered.samples, rendered.sampleRate);
    if (!fs.existsSync(out)) {
      return { ok: false, reason: "auto bed missing" };
    }
    return { ok: true, bed: out, source: "auto-sound", grid: rendered.grid || null };
  } catch (err) {
    return {
      ok: false,
      reason: `auto bed failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

function renderMotionPicture(work, modeInfo, seed, brief, opts) {
  const frames = Math.max(1, Math.round(DURATION_SEC * FPS));
  const picture = path.join(work, "picture.mp4");
  const forceFallback = Boolean(opts.forceFallback) || opts.engine === "wireframe";
  const width = MOTION_WIDTH;
  const height = MOTION_HEIGHT;
  const raw = path.join(work, "motion.rgb");

  if (forceFallback) {
    if (!painterFor(modeInfo.renderer, 0, seed, width, height)) {
      const err = new Error(`no factory renderer for "${modeInfo.renderer}"`);
      err.code = "BLIP_WIREFRAME_MISS";
      throw err;
    }
    writeRawMotion(raw, width, height, frames, (buf, t) => {
      paintWireframeFrame(buf, width, height, modeInfo.renderer, t, seed);
    });
    encodeRaw(raw, width, height, frames, picture);
    return {
      picture,
      width,
      height,
      engine: "ffmpeg-wireframe-fallback",
      fallback: true,
      visualConfig: null,
      look: null,
    };
  }

  let visualConfig = null;
  let look = rippel.LOOK;
  let lookKind = null;
  let bodyKind = null;
  let organ = null;
  writeRawMotion(raw, width, height, frames, (buf, t) => {
    const painted = rippel.paintRippelFrame({
      renderer: modeInfo.renderer,
      t,
      seedHex: seed,
      brief,
      durationSec: DURATION_SEC,
      width,
      height,
      buffer: buf,
      lookKind: opts.lookKind,
      bodyKind: opts.bodyKind,
      genre: opts.genre,
    });
    visualConfig = painted.visualConfig;
    look = painted.look;
    lookKind = painted.lookKind;
    bodyKind = painted.bodyKind;
    organ = painted.organ;
  });
  encodeRaw(raw, width, height, frames, picture);
  return { picture, width, height, engine: rippel.ENGINE, look, lookKind, bodyKind, organ, fallback: false, visualConfig };
}

function renderBlip(opts = {}) {
  const root = opts.root || process.cwd();
  const brief = String(opts.brief || "factory-blip");
  const modeInfo = resolveMode(opts.pictureMode || opts.mode, opts.registryPath);
  const seed = opts.seed || seedFromBrief(brief, modeInfo.motionId || modeInfo.id);
  const mp4 = opts.out ? path.resolve(root, opts.out) : defaultMp4Path(root);
  const input = {
    brief,
    seed,
    pictureMode: modeInfo.pictureMode,
    motionId: modeInfo.motionId || modeInfo.id,
    visualization: modeInfo.visualization || rippel.visualizationFor(modeInfo.renderer) || null,
    stillPlate: modeInfo.renderer === "still" ? stillPlate(seed, 0) : null,
    registryIds: listMotionIds(opts.registryPath),
    mp4,
    mp4Rel: path.relative(root, mp4) || mp4,
    bed: null,
    bedRel: null,
    bedSource: null,
    engine: modeInfo.renderer === "still" ? POWER_PLANT_ENGINE : rippel.ENGINE,
    look: modeInfo.renderer === "still" ? POWER_PLANT_LOOK : rippel.LOOK,
    fallback: false,
    visualConfig: null,
    lookKind: opts.lookKind || null,
    bodyKind: opts.bodyKind || null,
    genre: rippel.resolveGenreKind({ seedHex: seed, genre: opts.genre }),
    organ: null,
    width: MOTION_WIDTH,
    height: MOTION_HEIGHT,
  };

  if (!modeInfo.ok) {
    return failReceipt(root, input, modeInfo.reason);
  }

  fs.mkdirSync(path.dirname(mp4), { recursive: true });
  const work = fs.mkdtempSync(path.join(os.tmpdir(), "xray-foundry-blip-"));
  try {
    const bedInfo = resolveBed(opts, root, brief, work, seed);
    if (!bedInfo.ok) {
      return failReceipt(root, input, bedInfo.reason);
    }
    input.bed = bedInfo.bed;
    input.bedRel = path.relative(root, bedInfo.bed) || bedInfo.bed;
    input.bedSource = bedInfo.source;
    input.grid = bedInfo.grid || null;

    const picture = path.join(work, "picture.mp4");
    if (modeInfo.renderer === "still") {
      const frames = Math.max(1, Math.round(DURATION_SEC * FPS));
      const raw = path.join(work, "power-plant.rgb");
      writeRawMotion(raw, MOTION_WIDTH, MOTION_HEIGHT, frames, (buf, t) => {
        paintStillFrame(buf, MOTION_WIDTH, MOTION_HEIGHT, seed, t, brief);
      });
      encodeRaw(raw, MOTION_WIDTH, MOTION_HEIGHT, frames, picture);
      input.engine = POWER_PLANT_ENGINE;
      input.look = POWER_PLANT_LOOK;
      input.width = MOTION_WIDTH;
      input.height = MOTION_HEIGHT;
      input.visualConfig = rippel.summarizeVisual(
        rippel.cachedChecksum({
          brief,
          seedHex: seed,
          width: MOTION_WIDTH,
          height: MOTION_HEIGHT,
          lookKind: opts.lookKind,
          bodyKind: opts.bodyKind,
          genre: input.genre,
        }),
      );
      input.lookKind = input.visualConfig && input.visualConfig.lookKind;
      input.bodyKind = input.visualConfig && input.visualConfig.bodyKind;
    } else {
      const motion = renderMotionPicture(work, modeInfo, seed, brief, opts);
      if (motion.picture !== picture) fs.copyFileSync(motion.picture, picture);
      input.engine = motion.engine;
      input.look = motion.look || (motion.fallback ? null : rippel.LOOK);
      input.fallback = motion.fallback;
      input.width = motion.width;
      input.height = motion.height;
      input.visualConfig = rippel.summarizeVisual(
        rippel.cachedChecksum({
          brief,
          seedHex: seed,
          width: motion.width,
          height: motion.height,
          lookKind: opts.lookKind,
          bodyKind: opts.bodyKind,
          genre: input.genre,
        }),
      );
      input.lookKind = motion.lookKind || (input.visualConfig && input.visualConfig.lookKind);
      input.bodyKind = motion.bodyKind || (input.visualConfig && input.visualConfig.bodyKind);
      input.organ = motion.organ || null;
    }
    muxBed(picture, bedInfo.bed, mp4);
    const evaled = evaluateMp4File(mp4, {
      mode: modeInfo.motionId,
      wantAudio: true,
      motion: true,
    });
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
  STILL_WIDTH,
  STILL_HEIGHT,
  MOTION_WIDTH,
  MOTION_HEIGHT,
  RECEIPT_REL,
  MP4_REL,
  V0_IDS,
  RIPPEL_IMPORTS,
  STILL_PLATES,
  PALETTE,
  PLATE,
  RGB,
  SSOT,
  ANIMATION_TO_VISUALIZATION,
  stillPlate,
  plateClock,
  paintStill,
  paintStillFrame,
  sampleStillFrames,
  POWER_PLANT_ENGINE,
  POWER_PLANT_LOOK,
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
  probeAudio,
  AUDIBLE_MAX_DB_MIN,
  evaluateMp4File,
  evaluateReceipt,
  receiptPath,
  defaultMp4Path,
  writeReceipt,
  readReceipt,
  buildReceipt,
  resolveBed,
  paintWireframeFrame,
  encodeRaw,
};
