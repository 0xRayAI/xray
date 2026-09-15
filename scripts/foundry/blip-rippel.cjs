/**
 * Factory-blip Rippel canvas — Phase 1 headless port of SimplifiedVisualConverter.
 *
 * SSOT htafolla/rippel-synapse-flow@e5014cd46fbe5f132391333d8296f4416896dbee
 *   animationIcons.ts — Animation + ANIMATION_TO_VISUALIZATION
 *   types/index.ts — ChecksumResponse.visualConfig { circles[], canvas, tlmCommand }
 *   SimplifiedVisualConverter.tsx — routes Animation → viz id, canvas fallback 1280×720
 *   MiniAnimationViewer / FiveDimensionalVisualizer — viz backends for those ids
 *
 * This file is the converter spine, not a drawbox/geq label. Brief+seed → checksum
 * visualConfig (CircleConfig[]) → viz backend. Power Plant palette is the Blip theme.
 * Wireframe ffmpeg geometry lives in blip-render.cjs and is flag-only.
 */

const soundRippel = require("./sound-rippel.cjs");

const ENGINE = "rippel-headless";
const MOTION_WIDTH = 1280;
const MOTION_HEIGHT = 720;
const FPS = 30;
const TLM = "checksum";

const SSOT = {
  repo: "htafolla/rippel-synapse-flow",
  commit: "e5014cd46fbe5f132391333d8296f4416896dbee",
  access: "headless-port",
  paths: [
    "animationIcons.ts",
    "types/index.ts",
    "SimplifiedVisualConverter.tsx",
    "MiniAnimationViewer",
    "FiveDimensionalVisualizer",
  ],
  note: "Phase 1 — VisualConfig.circles through SimplifiedVisualConverter viz ids. Wireframe is flag-only.",
};

/** animationIcons.ts — names are imports into the plant registry. */
const ANIMATION_TO_VISUALIZATION = {
  orb: "canvas",
  swirl: "3d-sacred",
  snap: "neural",
  waves: "waveform",
  spark: "particles",
};

const THEME = {
  void: [8, 9, 11],
  ink: [245, 247, 250],
  cyan: [61, 224, 232],
  gold: [245, 197, 24],
  blue: [74, 127, 212],
};

const THEME_CYCLE = [THEME.cyan, THEME.gold, THEME.blue, THEME.ink];

/** getGenreConfig.ts scale tables — same SSOT the sound mill already ported. */
const SCALES = {
  ambient: [261.63, 311.13, 349.23, 392.0, 466.16],
  techno: [65.41, 87.31, 130.81, 174.61, 196.0],
  phonk: [32.7, 43.65, 55.0, 65.41, 82.41],
  jazz: [130.81, 164.81, 196.0, 220.0, 261.63],
};

const NOTE_NAMES = ["C", "D#", "F", "G", "A#"];

const visualCache = new Map();

function clamp(n, lo, hi) {
  return n < lo ? lo : n > hi ? hi : n;
}

function seedU32(seedHex, offset) {
  const hex = String(seedHex || "").replace(/^0x/, "");
  const n = Number.parseInt(hex.slice(offset, offset + 8), 16);
  return Number.isFinite(n) ? n >>> 0 : 1;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function rgbHex(rgb) {
  return `#${rgb.map((c) => clamp(c, 0, 255).toString(16).padStart(2, "0")).join("")}`;
}

function parseHex(hex) {
  const h = String(hex || "").replace(/^#/, "");
  return [
    Number.parseInt(h.slice(0, 2), 16) || 0,
    Number.parseInt(h.slice(2, 4), 16) || 0,
    Number.parseInt(h.slice(4, 6), 16) || 0,
  ];
}

/**
 * Checksum TLM → VisualConfig. Mirrors types/index.ts ChecksumResponse.visualConfig.
 * Sequence notes + genre frequencies become CircleConfig[] (note, frequency, radius, color).
 */
function buildVisualConfig({ brief, seedHex, genre, width, height }) {
  const g = soundRippel.resolveGenre(genre || "ambient");
  const scale = SCALES[g.id] || SCALES.ambient;
  const rng = mulberry32(seedU32(seedHex, 0) ^ seedU32(seedHex, 8));
  const text = String(brief || "factory-blip");
  const count = 6 + (seedU32(seedHex, 16) % 4);
  const circles = [];
  const notes = [];
  const durations = [];
  const velocities = [];
  const frequencies = [];
  for (let i = 0; i < count; i++) {
    const ch = text.charCodeAt(i % text.length) || 32;
    const idx = (ch + Math.floor(rng() * scale.length) + i) % scale.length;
    const frequency = scale[idx];
    const velocity = 0.45 + rng() * 0.5;
    const note = `${NOTE_NAMES[idx % NOTE_NAMES.length]}${3 + (i % 3)}`;
    const radius = 28 + (220 / Math.max(frequency, 40)) * 36 + velocity * 18;
    const color = rgbHex(THEME_CYCLE[i % THEME_CYCLE.length]);
    circles.push({ note, frequency, radius, color });
    notes.push(note);
    durations.push("8n");
    velocities.push(velocity);
    frequencies.push(frequency);
  }
  return {
    tlmCommand: TLM,
    sequence: { notes, durations, velocities },
    genreConfig: {
      tempo: soundRippel.tempoFromSeed(g.id, seedHex),
      instrument: g.voices[0],
      frequencies,
      scale: g.id,
    },
    visualConfig: {
      circles,
      canvas: { width: width || MOTION_WIDTH, height: height || MOTION_HEIGHT, fps: FPS },
      tlmCommand: TLM,
    },
    gematria: {
      promptValue: seedU32(seedHex, 0),
      checksumValue: seedU32(seedHex, 8),
      parity: (seedU32(seedHex, 0) & 1) === 0,
    },
  };
}

function cachedChecksum(opts) {
  const key = `${opts.seedHex || ""}::${opts.brief || ""}::${opts.genre || "ambient"}::${opts.width || MOTION_WIDTH}x${opts.height || MOTION_HEIGHT}`;
  let hit = visualCache.get(key);
  if (!hit) {
    hit = buildVisualConfig(opts);
    visualCache.set(key, hit);
  }
  return hit;
}

function fillVoid(buf) {
  const v = THEME.void;
  for (let i = 0; i < buf.length; i += 3) {
    buf[i] = v[0];
    buf[i + 1] = v[1];
    buf[i + 2] = v[2];
  }
}

function mixPixel(buf, width, x, y, color, alpha) {
  if (alpha <= 0) return;
  const xi = x | 0;
  const yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= width) return;
  const height = (buf.length / 3 / width) | 0;
  if (yi >= height) return;
  const i = (yi * width + xi) * 3;
  const a = alpha > 1 ? 1 : alpha;
  buf[i] = (buf[i] + (color[0] - buf[i]) * a + 0.5) | 0;
  buf[i + 1] = (buf[i + 1] + (color[1] - buf[i + 1]) * a + 0.5) | 0;
  buf[i + 2] = (buf[i + 2] + (color[2] - buf[i + 2]) * a + 0.5) | 0;
}

/**
 * Soft falloff over the FULL radius. Confirmed CoS #67 look:
 * hardness ~1.15–2.6 → every stamp is a glow, not a disc. Keep for thin
 * strokes (sacred/neural/waves). Orb Glow uses stampFocusDisc instead.
 */
function stampDisc(buf, width, height, cx, cy, radius, color, hardness) {
  if (radius <= 0) return;
  const hard = hardness > 0 ? hardness : 2;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const x1 = Math.min(width - 1, Math.ceil(cx + radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const y1 = Math.min(height - 1, Math.ceil(cy + radius));
  const r2 = radius * radius;
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const d2 = dx * dx + dy2;
      if (d2 > r2) continue;
      const u = 1 - Math.sqrt(d2) / radius;
      const a = u <= 0 ? 0 : u >= 1 ? 1 : Math.pow(u, hard);
      mixPixel(buf, width, x, y, color, a);
    }
  }
}

/**
 * In-focus disc: opaque body + thin crisp rim + short glow tail.
 * Not pow(u, ~1.2) across the whole radius (that is the Phase 1 bokeh).
 */
function stampFocusDisc(buf, width, height, cx, cy, radius, color, opts) {
  if (radius <= 0) return;
  const rimW = opts && opts.rim != null ? opts.rim : 2;
  const glowW = opts && opts.glow != null ? opts.glow : 5;
  const glowA = opts && opts.glowAlpha != null ? opts.glowAlpha : 0.3;
  const rimColor = (opts && opts.rimColor) || THEME.ink;
  const outer = radius + glowW;
  const x0 = Math.max(0, Math.floor(cx - outer));
  const x1 = Math.min(width - 1, Math.ceil(cx + outer));
  const y0 = Math.max(0, Math.floor(cy - outer));
  const y1 = Math.min(height - 1, Math.ceil(cy + outer));
  const bodyR = Math.max(0.5, radius - rimW);
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    const dy2 = dy * dy;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const d = Math.sqrt(dx * dx + dy2);
      if (d <= bodyR) {
        mixPixel(buf, width, x, y, color, 1);
        continue;
      }
      if (d <= radius) {
        const u = (radius - d) / Math.max(rimW, 1e-6);
        mixPixel(buf, width, x, y, rimColor, 1);
        mixPixel(buf, width, x, y, color, clamp(u, 0, 1));
        continue;
      }
      if (d <= outer) {
        const u = 1 - (d - radius) / glowW;
        const a = glowA * Math.pow(clamp(u, 0, 1), 3.6);
        mixPixel(buf, width, x, y, color, a);
      }
    }
  }
}

function stampSegment(buf, width, height, x0, y0, x1, y1, radius, color, hardness) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(len / Math.max(1, radius * 0.55)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    stampDisc(buf, width, height, x0 + dx * t, y0 + dy * t, radius, color, hardness);
  }
}

function visualizationFor(renderer) {
  return ANIMATION_TO_VISUALIZATION[renderer] || null;
}

function circlePulse(circle, t) {
  const hz = Math.max(20, circle.frequency);
  const lfo = Math.sin(2 * Math.PI * (hz / 220) * t);
  return circle.radius * (0.72 + 0.28 * (0.5 + 0.5 * lfo));
}

function layoutRing(circles, width, height, t) {
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  return circles.map((circle, i) => {
    const ang = (i / circles.length) * Math.PI * 2 + t * 0.35;
    const orbit = minSide * (0.16 + (i % 3) * 0.07);
    return {
      circle,
      x: cx + Math.cos(ang) * orbit,
      y: cy + Math.sin(ang) * orbit * 0.72,
      r: circlePulse(circle, t + i * 0.11),
      color: parseHex(circle.color),
    };
  });
}

/** orb → canvas / Orb Glow. Sharp disc body + rim + short tail — not stacked soft blobs. */
function paintCanvas(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const core = minSide * (0.11 + 0.018 * Math.sin(t * 1.7));
  stampFocusDisc(buf, width, height, cx, cy, core * 1.08, THEME.cyan, {
    rim: 2.2,
    glow: 7,
    glowAlpha: 0.28,
    rimColor: THEME.ink,
  });
  stampFocusDisc(buf, width, height, cx, cy, core * 0.4, THEME.gold, {
    rim: 1.6,
    glow: 3,
    glowAlpha: 0.22,
    rimColor: THEME.ink,
  });
  for (const placed of layoutRing(checksum.visualConfig.circles, width, height, t)) {
    stampFocusDisc(buf, width, height, placed.x, placed.y, placed.r * 0.42, placed.color, {
      rim: 1.6,
      glow: 4,
      glowAlpha: 0.24,
      rimColor: THEME.ink,
    });
  }
}

/** Radial brightness drop from center. Soft Phase-1 soup was 80–200px; focus is a short rim. */
function orbFocusWidth(buf, width, height) {
  const cx = (width - 1) * 0.5;
  const cy = ((buf.length / 3 / width) | 0) * 0.5;
  const y = cy | 0;
  function luma(x) {
    const i = (y * width + (x | 0)) * 3;
    return (buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11) / 255;
  }
  let peak = 0;
  let peakX = cx;
  for (let x = cx; x < width; x++) {
    const v = luma(x);
    if (v > peak) {
      peak = v;
      peakX = x;
    }
  }
  let hi = peakX;
  let lo = peakX;
  for (let x = peakX; x < width; x++) {
    if (luma(x) >= peak * 0.72) hi = x;
    else break;
  }
  for (let x = hi; x < width; x++) {
    if (luma(x) <= peak * 0.22) {
      lo = x;
      break;
    }
  }
  return { peak, inner: hi - peakX, drop: lo - hi };
}

/** swirl → 3d-sacred. Same CircleConfig[] seated on a merkaba / hex plate. */
function paintSacred(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const r = minSide * 0.3;
  stampDisc(buf, width, height, cx, cy, r * 1.5, THEME.blue, 2.5);
  const spin = t * 0.7;
  const circles = checksum.visualConfig.circles;
  function triangle(offset, color, scale) {
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = offset + (i * Math.PI * 2) / 3;
      pts.push([cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale]);
    }
    for (let i = 0; i < 3; i++) {
      stampSegment(buf, width, height, pts[i][0], pts[i][1], pts[(i + 1) % 3][0], pts[(i + 1) % 3][1], 8, color, 1.5);
    }
  }
  triangle(spin, THEME.cyan, 1);
  triangle(-spin + Math.PI / 3, THEME.gold, 0.9);
  for (let i = 0; i < circles.length; i++) {
    const a = spin * 0.5 + (i / circles.length) * Math.PI * 2;
    const rad = r * (0.55 + (i % 2) * 0.18);
    stampDisc(
      buf,
      width,
      height,
      cx + Math.cos(a) * rad,
      cy + Math.sin(a) * rad,
      circlePulse(circles[i], t) * 0.35,
      parseHex(circles[i].color),
      1.35,
    );
  }
  stampDisc(buf, width, height, cx, cy, minSide * 0.03, THEME.gold, 1.2);
}

/** snap → neural. Circles as nodes; frequency pulses travel the lattice. */
function paintNeural(buf, width, height, t, checksum) {
  fillVoid(buf);
  const placed = layoutRing(checksum.visualConfig.circles, width, height, t * 0.15);
  for (let i = 0; i < placed.length; i++) {
    const n = placed[(i + 1) % placed.length];
    stampSegment(buf, width, height, placed[i].x, placed[i].y, n.x, n.y, 3.4, THEME.blue, 1.8);
    const travel = (t * (placed[i].circle.frequency / 180) + i * 0.2) % 1;
    stampDisc(
      buf,
      width,
      height,
      placed[i].x + (n.x - placed[i].x) * travel,
      placed[i].y + (n.y - placed[i].y) * travel,
      7,
      THEME.gold,
      1.2,
    );
  }
  for (const node of placed) {
    const on = Math.sin(2 * Math.PI * node.circle.frequency * 0.01 * t) > 0;
    stampDisc(buf, width, height, node.x, node.y, on ? 12 : 7, on ? THEME.gold : node.color, 1.25);
  }
}

/** waves → waveform / Wave Flow. Each CircleConfig.frequency is a ribbon. */
function paintWaveform(buf, width, height, t, checksum) {
  fillVoid(buf);
  const mid = (height - 1) * 0.5;
  const circles = checksum.visualConfig.circles;
  circles.forEach((circle, i) => {
    const amp = height * (0.06 + (circle.radius / 400) * 0.12);
    const freq = 0.008 + circle.frequency / 18000;
    const color = parseHex(circle.color);
    const thick = 6 + (i === 0 ? 8 : 0);
    let prevY = mid;
    const shift = t * (circle.frequency / 8);
    for (let x = 0; x < width; x += 3) {
      const y = mid + Math.sin((x + shift) * freq + i) * amp;
      stampSegment(buf, width, height, x - 3, prevY, x, y, thick, color, 1.7);
      prevY = y;
    }
  });
}

/** spark → particles / Spark Drift. Emit motes from each CircleConfig seat. */
function paintParticles(buf, width, height, t, checksum) {
  fillVoid(buf);
  const placed = layoutRing(checksum.visualConfig.circles, width, height, t * 0.2);
  for (let i = 0; i < placed.length; i++) {
    const src = placed[i];
    const color = src.color;
    for (let k = 0; k < 8; k++) {
      const ang = t * 1.4 + i + k * 0.7;
      const dist = (t * 40 + k * 18 + src.circle.frequency * 0.08) % (Math.min(width, height) * 0.4);
      stampDisc(
        buf,
        width,
        height,
        src.x + Math.cos(ang) * dist,
        src.y + Math.sin(ang) * dist,
        3 + (k % 3),
        color,
        1.4,
      );
    }
    stampDisc(buf, width, height, src.x, src.y, 8, THEME.ink, 1.2);
  }
}

function paintVisualization(visualization, buf, width, height, t, checksum) {
  if (visualization === "canvas") return paintCanvas(buf, width, height, t, checksum);
  if (visualization === "3d-sacred") return paintSacred(buf, width, height, t, checksum);
  if (visualization === "neural") return paintNeural(buf, width, height, t, checksum);
  if (visualization === "waveform") return paintWaveform(buf, width, height, t, checksum);
  if (visualization === "particles") return paintParticles(buf, width, height, t, checksum);
  const err = new Error(`no Rippel visualization for "${visualization}"`);
  err.code = "BLIP_RIPPEL_VIZ";
  throw err;
}

function paintRippelFrame(opts) {
  const renderer = String(opts.renderer || "");
  const visualization = visualizationFor(renderer);
  if (!visualization) {
    const err = new Error(`no Rippel headless path for "${renderer}"`);
    err.code = "BLIP_RIPPEL_MISS";
    throw err;
  }
  const width = opts.width || MOTION_WIDTH;
  const height = opts.height || MOTION_HEIGHT;
  if (width < 1280 || height < 720) {
    const err = new Error(`Rippel motions must be ≥720p (got ${width}×${height})`);
    err.code = "BLIP_RIPPEL_RES";
    throw err;
  }
  const buf = opts.buffer || Buffer.alloc(width * height * 3);
  if (buf.length < width * height * 3) {
    const err = new Error("Rippel frame buffer too small");
    err.code = "BLIP_RIPPEL_BUF";
    throw err;
  }
  const checksum = cachedChecksum({
    brief: opts.brief,
    seedHex: opts.seedHex,
    genre: opts.genre,
    width,
    height,
  });
  paintVisualization(visualization, buf, width, height, opts.t || 0, checksum);
  return {
    buffer: buf,
    width,
    height,
    visualization,
    engine: ENGINE,
    visualConfig: checksum.visualConfig,
    tlmCommand: checksum.tlmCommand,
  };
}

function framesDiffer(a, b) {
  if (!a || !b || a.length !== b.length) return true;
  const step = a.length > 12_000 ? 3 : 1;
  for (let i = 0; i < a.length; i += step) {
    if (a[i] !== b[i]) return true;
  }
  return false;
}

function sampleMotionFrames(renderer, seedHex, durationSec, brief) {
  const a = paintRippelFrame({ renderer, t: 0, seedHex, brief, durationSec });
  const b = paintRippelFrame({
    renderer,
    t: (durationSec || 4.44) * 0.5,
    seedHex,
    brief,
    durationSec,
  });
  return {
    visualization: a.visualization,
    width: a.width,
    height: a.height,
    differ: framesDiffer(a.buffer, b.buffer),
    circleCount: a.visualConfig.circles.length,
  };
}

function summarizeVisual(checksum) {
  if (!checksum || !checksum.visualConfig) return null;
  return {
    tlmCommand: checksum.tlmCommand,
    canvas: checksum.visualConfig.canvas,
    circleCount: checksum.visualConfig.circles.length,
    notes: checksum.visualConfig.circles.map((c) => c.note),
    frequencies: checksum.visualConfig.circles.map((c) => c.frequency),
  };
}

module.exports = {
  ENGINE,
  MOTION_WIDTH,
  MOTION_HEIGHT,
  FPS,
  SSOT,
  ANIMATION_TO_VISUALIZATION,
  THEME,
  SCALES,
  visualizationFor,
  buildVisualConfig,
  cachedChecksum,
  paintRippelFrame,
  framesDiffer,
  sampleMotionFrames,
  summarizeVisual,
  stampDisc,
  stampFocusDisc,
  orbFocusWidth,
  fillVoid,
};
