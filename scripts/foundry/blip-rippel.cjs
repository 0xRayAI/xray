/**
 * Factory-blip Rippel canvas — Rippel v2 headless port of SimplifiedVisualConverter.
 *
 * SSOT htafolla/rippel-synapse-flow@e5014cd46fbe5f132391333d8296f4416896dbee
 *   animationIcons.ts — Animation + ANIMATION_TO_VISUALIZATION
 *   types/index.ts — ChecksumResponse.visualConfig { circles[], canvas, tlmCommand }
 *   SimplifiedVisualConverter.tsx — routes Animation → viz id, canvas fallback 1280×720
 *   MiniAnimationViewer / FiveDimensionalVisualizer — viz backends for those ids
 *
 * This file is the converter spine, not a drawbox/geq label. Brief+seed → checksum
 * visualConfig (CircleConfig[]) → viz backend. Power Plant palette is the Blip theme.
 * v2 look: stampFocusDisc (opaque body + crisp rim + short glow) on all five viz.
 * v2 motion: genre tempo + CircleConfig.frequency LFOs (same mill the audio bed uses).
 * Wireframe ffmpeg geometry lives in blip-render.cjs and is flag-only.
 */

const soundRippel = require("./sound-rippel.cjs");

const ENGINE = "rippel-headless";
const LOOK = "rippel-v2";
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
  note: "Rippel v2 — VisualConfig.circles through SimplifiedVisualConverter viz ids. Sharp focus + fast abstract blip motion on all five. Soft tints, no photosensitive strobe. Wireframe is flag-only.",
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
 * hardness ~1.15–2.6 → every stamp is a glow, not a disc. Kept as a
 * primitive; Rippel v2 painters use stampFocusDisc / paintSharpLine.
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

function stampFocusSegment(buf, width, height, x0, y0, x1, y1, radius, color, opts) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  const steps = Math.max(2, Math.ceil(len / Math.max(1.2, radius * 0.75)));
  const focus = opts || { rim: 1, glow: 2, glowAlpha: 0.18, rimColor: THEME.ink };
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    stampFocusDisc(buf, width, height, x0 + dx * u, y0 + dy * u, radius, color, focus);
  }
}

function paintSharpRibbon(buf, width, height, yAtX, color, half, rimColor) {
  const rim = rimColor || THEME.ink;
  const thick = Math.max(1, half);
  for (let x = 0; x < width; x++) {
    const y = yAtX(x);
    for (let d = -thick; d <= thick; d++) {
      mixPixel(buf, width, x, y + d, color, 1);
    }
    mixPixel(buf, width, x, y - thick - 1, rim, 1);
    mixPixel(buf, width, x, y + thick + 1, rim, 1);
  }
}

function visualizationFor(renderer) {
  return ANIMATION_TO_VISUALIZATION[renderer] || null;
}

function circlePulse(circle, t) {
  const hz = Math.max(20, circle.frequency);
  const lfo = Math.sin(2 * Math.PI * (hz / 220) * t);
  const overtone = Math.sin(2 * Math.PI * (hz / 110) * t + 0.7);
  return circle.radius * (0.7 + 0.22 * (0.5 + 0.5 * lfo) + 0.08 * overtone);
}

function beatPhase(checksum, t) {
  const bpm = (checksum.genreConfig && checksum.genreConfig.tempo) || 90;
  return (t * bpm) / 60;
}

/** Soft kick swell — scale only, never a full-field color gate (photosensitive). */
function kickAccent(beat) {
  const frac = beat - Math.floor(beat);
  if (frac < 0.12) return 0.55 * (1 - frac / 0.12);
  if (frac < 0.28) return 0.18 * (1 - (frac - 0.12) / 0.16);
  return 0;
}

function mixRgb(a, b, amount) {
  const u = clamp(amount, 0, 1);
  return [
    (a[0] + (b[0] - a[0]) * u + 0.5) | 0,
    (a[1] + (b[1] - a[1]) * u + 0.5) | 0,
    (a[2] + (b[2] - a[2]) * u + 0.5) | 0,
  ];
}

/** Slow frequency wander (~0.3–0.8 Hz). Not a hard gold flash. */
function freqTint(circle, t) {
  const hz = Math.max(20, circle.frequency);
  return 0.22 + 0.28 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (hz / 1100) * t));
}

function paintSharpLine(buf, width, height, x0, y0, x1, y1, color, half, rimColor) {
  const rim = rimColor || THEME.ink;
  const thick = Math.max(1, half);
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) {
    stampFocusDisc(buf, width, height, x0, y0, thick + 1, color, {
      rim: 1,
      glow: 2,
      glowAlpha: 0.16,
      rimColor: rim,
    });
    return;
  }
  const steps = Math.ceil(len);
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = x0 + dx * u;
    const y = y0 + dy * u;
    for (let d = -thick; d <= thick; d++) {
      mixPixel(buf, width, x + nx * d, y + ny * d, color, 1);
    }
    mixPixel(buf, width, x + nx * (thick + 1), y + ny * (thick + 1), rim, 1);
    mixPixel(buf, width, x - nx * (thick + 1), y - ny * (thick + 1), rim, 1);
  }
}

function layoutRings(circles, width, height, t, checksum) {
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  const scramble = mulberry32(
    ((checksum.gematria && checksum.gematria.promptValue) || 1) ^
      ((checksum.gematria && checksum.gematria.checksumValue) || 1) ^
      0x9e3779b9,
  );
  return circles.map((circle, i) => {
    const inner = i % 2 === 0;
    const phase = scramble() * Math.PI * 2;
    const ecc = 0.62 + scramble() * 0.22;
    const drift = 0.85 + scramble() * 0.7;
    const spin = inner ? -t * 2.25 * drift - beat * 0.2 : t * 1.4 * drift + beat * 0.12;
    const ang = (i / circles.length) * Math.PI * 2 + spin + phase;
    const wobble = Math.sin(beat * Math.PI * 2 + phase) * minSide * 0.007;
    const orbit = minSide * (inner ? 0.18 + scramble() * 0.05 : 0.29 + scramble() * 0.05) + wobble + (circle.frequency / 2000) * minSide * 0.04;
    return {
      circle,
      inner,
      x: cx + Math.cos(ang) * orbit,
      y: cy + Math.sin(ang) * orbit * ecc,
      r: circlePulse(circle, t + phase * 0.2),
      color: parseHex(circle.color),
    };
  });
}

function layoutRing(circles, width, height, t, checksum) {
  return layoutRings(circles, width, height, t, checksum || { genreConfig: { tempo: 90 } });
}

/** orb → canvas / Orb Glow v2. Fast dual rings, gold tick, no hard flash. */
function paintCanvas(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  const swell = 0.5 + 0.5 * Math.sin(beat * Math.PI * 2);
  const core = minSide * (0.1 + 0.012 * swell);
  stampFocusDisc(buf, width, height, cx, cy, core * 1.08, THEME.cyan, {
    rim: 2.2,
    glow: 6,
    glowAlpha: 0.26,
    rimColor: THEME.ink,
  });
  stampFocusDisc(buf, width, height, cx, cy, core * 0.4, THEME.gold, {
    rim: 1.6,
    glow: 3,
    glowAlpha: 0.2,
    rimColor: THEME.ink,
  });
  const tickR = core * 1.08;
  const tickA = beat * Math.PI * 2;
  stampFocusDisc(
    buf,
    width,
    height,
    cx + Math.cos(tickA) * tickR,
    cy + Math.sin(tickA) * tickR,
    5,
    THEME.gold,
    { rim: 1.2, glow: 3, glowAlpha: 0.2, rimColor: THEME.ink },
  );
  const ghostA = tickA - 0.55;
  stampFocusDisc(
    buf,
    width,
    height,
    cx + Math.cos(ghostA) * tickR,
    cy + Math.sin(ghostA) * tickR,
    3,
    THEME.ink,
    { rim: 1, glow: 2, glowAlpha: 0.12, rimColor: THEME.ink },
  );
  for (const placed of layoutRings(checksum.visualConfig.circles, width, height, t, checksum)) {
    stampFocusDisc(
      buf,
      width,
      height,
      placed.x,
      placed.y,
      placed.r * 0.38,
      mixRgb(placed.color, THEME.gold, freqTint(placed.circle, t)),
      { rim: 1.6, glow: 4, glowAlpha: 0.2, rimColor: THEME.ink },
    );
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

/** swirl → 3d-sacred v2. Merkaba + hex plate, counter-spin, beat vertices. */
function paintSacred(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const spin = t * 1.25 + beat * 0.2;
  const r = minSide * (0.28 + kick * 0.01);
  const circles = checksum.visualConfig.circles;
  const node = { rim: 1.3, glow: 3, glowAlpha: 0.18, rimColor: THEME.ink };
  const hex = [];
  for (let i = 0; i < 6; i++) {
    const a = -spin * 0.35 + (i * Math.PI) / 3;
    hex.push([cx + Math.cos(a) * r * 1.12, cy + Math.sin(a) * r * 1.12]);
  }
  for (let i = 0; i < 6; i++) {
    paintSharpLine(buf, width, height, hex[i][0], hex[i][1], hex[(i + 1) % 6][0], hex[(i + 1) % 6][1], THEME.blue, 1);
    paintSharpLine(buf, width, height, cx, cy, hex[i][0], hex[i][1], THEME.blue, 1);
    stampFocusDisc(buf, width, height, hex[i][0], hex[i][1], 4 + kick, THEME.ink, node);
  }
  function triangle(offset, color, scale, half) {
    const pts = [];
    for (let i = 0; i < 3; i++) {
      const a = offset + (i * Math.PI * 2) / 3;
      pts.push([cx + Math.cos(a) * r * scale, cy + Math.sin(a) * r * scale]);
    }
    for (let i = 0; i < 3; i++) {
      paintSharpLine(
        buf,
        width,
        height,
        pts[i][0],
        pts[i][1],
        pts[(i + 1) % 3][0],
        pts[(i + 1) % 3][1],
        color,
        half,
      );
      stampFocusDisc(
        buf,
        width,
        height,
        pts[i][0],
        pts[i][1],
        5 + kick,
        mixRgb(color, THEME.gold, 0.2 + kick * 0.35),
        node,
      );
    }
  }
  triangle(spin, THEME.cyan, 1, 2);
  triangle(-spin + Math.PI / 3, THEME.gold, 0.88, 2);
  triangle(spin * 1.7 + Math.PI / 6, THEME.ink, 0.52, 1);
  for (let i = 0; i < circles.length; i++) {
    const inner = i % 2 === 0;
    const gem = (checksum.gematria && checksum.gematria.promptValue) || 1;
    const phase = ((gem >>> ((i * 7) % 24)) & 255) / 40;
    const ang = (i / circles.length) * Math.PI * 2 + (inner ? -spin * 1.1 : spin * 0.7) + phase;
    const rad = r * (inner ? 0.42 : 0.78);
    const wobble = Math.sin(beat * Math.PI * 2 + i) * r * 0.02;
    const x = cx + Math.cos(ang) * (rad + wobble);
    const y = cy + Math.sin(ang) * (rad + wobble) * 0.86;
    stampFocusDisc(
      buf,
      width,
      height,
      x,
      y,
      circlePulse(circles[i], t) * 0.2,
      mixRgb(parseHex(circles[i].color), THEME.gold, freqTint(circles[i], t)),
      { rim: 1.4, glow: 3, glowAlpha: 0.2, rimColor: THEME.ink },
    );
  }
  stampFocusDisc(buf, width, height, cx, cy, minSide * (0.028 + kick * 0.006), mixRgb(THEME.cyan, THEME.gold, 0.35 + kick * 0.25), {
    rim: 1.5,
    glow: 3,
    glowAlpha: 0.2,
    rimColor: THEME.ink,
  });
}

/** snap → neural v2. Dual-ring lattice, hub, skip-links, frequency + beat pulses. */
function paintNeural(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const placed = layoutRings(checksum.visualConfig.circles, width, height, t * 0.85, checksum);
  const node = { rim: 1.4, glow: 3, glowAlpha: 0.18, rimColor: THEME.ink };
  for (let i = 0; i < placed.length; i++) {
    const a = placed[i];
    const b = placed[(i + 1) % placed.length];
    const skip = placed[(i + 2) % placed.length];
    paintSharpLine(buf, width, height, a.x, a.y, b.x, b.y, THEME.blue, 1);
    paintSharpLine(buf, width, height, a.x, a.y, skip.x, skip.y, THEME.blue, 1);
    paintSharpLine(buf, width, height, cx, cy, a.x, a.y, THEME.blue, 1);
    const speed = 0.85 + a.circle.frequency / 220;
    const travel = (t * speed + i * 0.17) % 1;
    const inbound = (t * speed * 1.15 + beat * 0.08 + i * 0.41) % 1;
    stampFocusDisc(
      buf,
      width,
      height,
      a.x + (b.x - a.x) * travel,
      a.y + (b.y - a.y) * travel,
      5,
      THEME.gold,
      node,
    );
    stampFocusDisc(
      buf,
      width,
      height,
      a.x + (cx - a.x) * inbound,
      a.y + (cy - a.y) * inbound,
      4,
      THEME.cyan,
      node,
    );
  }
  for (const seat of placed) {
    stampFocusDisc(
      buf,
      width,
      height,
      seat.x,
      seat.y,
      7 + kick * 1.5,
      mixRgb(seat.color, THEME.gold, freqTint(seat.circle, t)),
      node,
    );
  }
  stampFocusDisc(buf, width, height, cx, cy, 10 + kick * 3, mixRgb(THEME.cyan, THEME.gold, 0.3 + kick * 0.3), {
    rim: 1.6,
    glow: 4,
    glowAlpha: 0.22,
    rimColor: THEME.ink,
  });
}

/** waves → waveform v2. Harmonic ribbons + beat envelope + traveling gold needle. */
function paintWaveform(buf, width, height, t, checksum) {
  fillVoid(buf);
  const mid = (height - 1) * 0.5;
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const env = 0.88 + 0.12 * Math.max(0, Math.sin(beat * Math.PI * 2));
  const circles = checksum.visualConfig.circles;
  paintSharpRibbon(buf, width, height, () => mid, THEME.ink, 1, THEME.void);
  circles.forEach((circle, i) => {
    const color = parseHex(circle.color);
    const amp0 = height * (0.05 + (circle.radius / 420) * 0.11) * env;
    const f0 = 0.0065 + circle.frequency / 22000;
    const shift = t * (circle.frequency / 3.1);
    const gem = (checksum.gematria && checksum.gematria.checksumValue) || 1;
    const phase = i * 0.85 + ((gem >>> ((i * 5) % 24)) & 255) / 70;
    paintSharpRibbon(
      buf,
      width,
      height,
      (x) =>
        mid +
        Math.sin((x + shift) * f0 + phase) * amp0 +
        Math.sin((x + shift) * f0 * 2 + phase * 1.3) * amp0 * 0.28,
      i === 0 ? THEME.cyan : color,
      i === 0 ? 3 : 2,
    );
    paintSharpRibbon(
      buf,
      width,
      height,
      (x) => mid + Math.sin((x - shift * 0.7) * f0 * 3 + phase) * amp0 * 0.18,
      i % 2 === 0 ? THEME.gold : THEME.blue,
      1,
    );
  });
  const tickX = ((beat % 1) * width) | 0;
  const tickH = height * 0.22 * (0.45 + kick);
  for (let y = mid - tickH; y <= mid + tickH; y++) {
    mixPixel(buf, width, tickX, y, THEME.gold, 1);
    mixPixel(buf, width, tickX - 1, y, THEME.ink, 1);
    mixPixel(buf, width, tickX + 1, y, THEME.ink, 1);
  }
}

/** spark → particles v2. Beat bursts, orbital + radial motes, short trails. */
function paintParticles(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const placed = layoutRings(checksum.visualConfig.circles, width, height, t * 0.7, checksum);
  const mote = { rim: 1, glow: 2, glowAlpha: 0.16, rimColor: THEME.ink };
  stampFocusDisc(buf, width, height, cx, cy, 8 + kick * 2, mixRgb(THEME.cyan, THEME.gold, 0.35 + kick * 0.25), mote);
  for (let i = 0; i < placed.length; i++) {
    const src = placed[i];
    const tint = freqTint(src.circle, t);
    const moteCount = 14;
    for (let k = 0; k < moteCount; k++) {
      const life = (t * (0.85 + src.circle.frequency / 500) + k * 0.11 + i * 0.07) % 1;
      const orbital = k % 3 === 0;
      const ang = orbital ? t * (2.4 + (k % 5) * 0.2) + i + k : t * 3.1 + i * 1.3 + k * 0.62;
      const dist = orbital
        ? 18 + (k % 4) * 10 + Math.sin(beat * Math.PI * 2 + k) * 4
        : life * minSide * 0.38 * (0.7 + kick * 0.12);
      const x = src.x + Math.cos(ang) * dist;
      const y = src.y + Math.sin(ang) * dist * (orbital ? 0.72 : 1);
      const size = Math.max(1.5, (1 - life) * (2.2 + (k % 3)) + kick * 0.6);
      const color = mixRgb(src.color, THEME.gold, k % 2 === 0 ? tint : tint * 0.4);
      stampFocusDisc(buf, width, height, x, y, size, color, mote);
      if (life > 0.12 && !orbital) {
        const prev = life - 0.1;
        const pd = prev * minSide * 0.36;
        stampFocusDisc(buf, width, height, src.x + Math.cos(ang) * pd, src.y + Math.sin(ang) * pd, size * 0.55, color, {
          rim: 1,
          glow: 1,
          glowAlpha: 0.1,
          rimColor: THEME.ink,
        });
      }
    }
    stampFocusDisc(buf, width, height, src.x, src.y, 6 + kick, mixRgb(THEME.ink, THEME.gold, tint), mote);
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
    look: LOOK,
    visualConfig: checksum.visualConfig,
    tlmCommand: checksum.tlmCommand,
    tempo: checksum.genreConfig && checksum.genreConfig.tempo,
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

function edgeSharpness(buf, width) {
  const height = (buf.length / 3 / width) | 0;
  let edges = 0;
  let lit = 0;
  function luma(x, y) {
    const i = (y * width + x) * 3;
    return buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11;
  }
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const v = luma(x, y);
      if (v < 18) continue;
      lit += 1;
      if (Math.abs(v - luma(x + 1, y)) > 36 || Math.abs(v - luma(x, y + 1)) > 36) edges += 1;
    }
  }
  return { edges, lit, ratio: lit ? edges / lit : 0 };
}

function goldPixelCount(buf) {
  let n = 0;
  for (let i = 0; i < buf.length; i += 3) {
    if (buf[i] > 200 && buf[i + 1] > 150 && buf[i + 1] < 230 && buf[i + 2] < 70) n += 1;
  }
  return n;
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
  const c = paintRippelFrame({
    renderer,
    t: (durationSec || 4.44) * 0.25,
    seedHex,
    brief,
    durationSec,
  });
  const d = paintRippelFrame({
    renderer,
    t: (durationSec || 4.44) * 0.75,
    seedHex,
    brief,
    durationSec,
  });
  return {
    visualization: a.visualization,
    look: a.look,
    width: a.width,
    height: a.height,
    differ: framesDiffer(a.buffer, b.buffer),
    living:
      framesDiffer(a.buffer, b.buffer) &&
      framesDiffer(a.buffer, c.buffer) &&
      framesDiffer(b.buffer, d.buffer) &&
      framesDiffer(c.buffer, d.buffer),
    sharpness: edgeSharpness(a.buffer, a.width),
    circleCount: a.visualConfig.circles.length,
    tempo: a.tempo,
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
  LOOK,
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
  edgeSharpness,
  goldPixelCount,
  kickAccent,
  beatPhase,
  fillVoid,
};
