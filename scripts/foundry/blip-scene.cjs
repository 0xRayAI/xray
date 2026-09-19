/**
 * blip-scene — scene mixer on the factory-blip mill. Not a foundry.
 * Sound-mixer is ears. This drawer pairs a dark bed with a vivid jewel
 * and paints destination: a road into a colored horizon.
 *
 * House void/cyan stay. Jewels are Tron oranges on night beds so the
 * stamp punches. Ship with vibe + looker at 8.
 */

const rippel = require("./blip-rippel.cjs");

const ENGINE = "scene-headless";
const LOOK = "destination-blip";
const ORGAN = "destination";

const HOUSE = rippel.THEME;

/** Tron Legacy oranges. Hex SSOT next to RGB so receipts stay honest. */
const TRON = {
  legacy: { hex: "#DF740C", rgb: [223, 116, 12] },
  guard: { hex: "#FF410D", rgb: [255, 65, 13] },
  clu: { hex: "#F79D1E", rgb: [247, 157, 30] },
  poster: { hex: "#F2A007", rgb: [242, 160, 7] },
  ember: { hex: "#ED681F", rgb: [237, 104, 31] },
};

const SCENE_PAIRS = [
  {
    id: "legacy",
    hex: TRON.legacy.hex,
    bed: [4, 8, 28],
    ground: [4, 5, 16],
    jewel: TRON.legacy.rgb,
    rim: HOUSE.cyan,
    haze: [48, 20, 8],
    motif: "gate",
  },
  {
    id: "guard",
    hex: TRON.guard.hex,
    bed: HOUSE.void,
    ground: [10, 4, 8],
    jewel: TRON.guard.rgb,
    rim: HOUSE.cyan,
    haze: [56, 14, 6],
    motif: "gate",
  },
  {
    id: "clu",
    hex: TRON.clu.hex,
    bed: [8, 7, 16],
    ground: [6, 5, 12],
    jewel: TRON.clu.rgb,
    rim: HOUSE.cyan,
    haze: [54, 28, 8],
    motif: "sparks",
  },
  {
    id: "poster",
    hex: TRON.poster.hex,
    bed: [7, 8, 14],
    ground: [5, 6, 10],
    jewel: TRON.poster.rgb,
    rim: HOUSE.cyan,
    haze: [50, 30, 4],
    motif: "gate",
  },
  {
    id: "ember",
    hex: TRON.ember.hex,
    bed: [18, 6, 6],
    ground: [10, 4, 5],
    jewel: TRON.ember.rgb,
    rim: HOUSE.cyan,
    haze: [68, 24, 8],
    motif: "sparks",
  },
];

function clamp01(n) {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

function mixRgb(a, b, amount) {
  const w = clamp01(amount);
  return [
    (a[0] + (b[0] - a[0]) * w + 0.5) | 0,
    (a[1] + (b[1] - a[1]) * w + 0.5) | 0,
    (a[2] + (b[2] - a[2]) * w + 0.5) | 0,
  ];
}

function seedInt(seedHex) {
  const hex = String(seedHex || "0").replace(/^0x/i, "");
  return Number.parseInt(hex.slice(-8), 16) || 0x9e3779b9;
}

function pickPair(seedHex) {
  return SCENE_PAIRS[seedInt(seedHex) % SCENE_PAIRS.length];
}

function destinationClock(t) {
  if (t < 0.72) return { section: "hook", u: t / 0.72 };
  if (t < 3.05) return { section: "turn", u: (t - 0.72) / 2.33 };
  return { section: "tag", u: clamp01((t - 3.05) / 1.39) };
}

function destinationMarks(phrase, t) {
  const hook = rippel.phraseWeight(phrase, "hook");
  const turn = rippel.phraseWeight(phrase, "turn");
  const tag = rippel.phraseWeight(phrase, "tag");
  const peak = rippel.rupturePeak(phrase);
  const clock = destinationClock(typeof t === "number" ? t : 0);
  let bloom;
  let approach;
  let speed;
  if (clock.section === "hook") {
    bloom = 0.04 + 0.08 * clock.u;
    approach = 0.04 + 0.07 * clock.u;
    speed = 0.14 + 0.1 * clock.u;
  } else if (clock.section === "turn") {
    bloom = 0.18 + 0.82 * clock.u;
    approach = 0.16 + 0.74 * clock.u;
    speed = 0.55 + 1.45 * clock.u;
  } else {
    bloom = 0.96;
    approach = 0.92 + 0.08 * clock.u;
    speed = 0.6;
  }
  return {
    hook,
    turn,
    tag,
    peak,
    bloom,
    hold: clock.section === "tag" ? 0.96 : clamp01(0.16 * hook + 0.58 * turn + 0.96 * tag),
    approach,
    speed,
    clock: clock.section,
  };
}

function putPixel(buf, width, height, x, y, color) {
  const xi = x | 0;
  const yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= width || yi >= height) return;
  const i = (yi * width + xi) * 3;
  buf[i] = color[0];
  buf[i + 1] = color[1];
  buf[i + 2] = color[2];
}

function mixPixel(buf, width, height, x, y, color, alpha) {
  if (alpha <= 0) return;
  const xi = x | 0;
  const yi = y | 0;
  if (xi < 0 || yi < 0 || xi >= width || yi >= height) return;
  const i = (yi * width + xi) * 3;
  const a = alpha > 1 ? 1 : alpha;
  buf[i] = (buf[i] + (color[0] - buf[i]) * a + 0.5) | 0;
  buf[i + 1] = (buf[i + 1] + (color[1] - buf[i + 1]) * a + 0.5) | 0;
  buf[i + 2] = (buf[i + 2] + (color[2] - buf[i + 2]) * a + 0.5) | 0;
}

function strokeSeg(buf, width, height, x0, y0, x1, y1, color, alpha, half) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 0.5) {
    mixPixel(buf, width, height, x0, y0, color, alpha);
    return;
  }
  const steps = Math.max(2, (len / 0.7) | 0);
  const r = half > 0.6 ? half : 0.6;
  const nx = -dy / len;
  const ny = dx / len;
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const x = x0 + dx * u;
    const y = y0 + dy * u;
    for (let d = -r; d <= r; d += 0.75) {
      mixPixel(buf, width, height, x + nx * d, y + ny * d, color, alpha);
    }
  }
}

function paintFloor(buf, width, height, cx, horizonY, pair, marks, t) {
  const floorH = Math.max(1, height - 1 - horizonY);
  const gridN = pair.motif === "sparks" ? 3 : 12;
  const gridA = pair.motif === "sparks" ? 0.22 + 0.28 * marks.hold : 0.42 + 0.5 * marks.hold;
  const phase = t * marks.speed;
  for (let i = 0; i < gridN; i++) {
    const z = (i / gridN + phase) % 1;
    if (z < 0.05) continue;
    const gy = horizonY + 2 + Math.round(floorH * z * z);
    strokeSeg(buf, width, height, 0, gy, width - 1, gy, pair.rim, gridA * (0.45 + 0.55 * z), 1.2);
  }
  const rays = pair.motif === "sparks" ? 2 : 8;
  const start = horizonY + 14;
  for (let i = -rays; i <= rays; i++) {
    if (i === 0) continue;
    const x1 = cx + i * (width * (pair.motif === "sparks" ? 0.16 : 0.09));
    const u0 = (start - horizonY) / floorH;
    strokeSeg(buf, width, height, cx + (x1 - cx) * u0, start, x1, height - 1, pair.rim, gridA, 1.05);
  }
}

function paintSun(buf, width, height, cx, sunY, sunR, pair, marks) {
  rippel.stampFocusDisc(buf, width, height, cx, sunY, sunR, pair.jewel, {
    rim: 2,
    glow: 28 + 52 * marks.bloom,
    glowAlpha: 0.42 + 0.52 * marks.bloom,
    rimColor: pair.rim,
  });
  const core = mixRgb(pair.jewel, HOUSE.ink, 0.28);
  const shade = mixRgb(pair.jewel, pair.bed, 0.38);
  const discR = Math.max(4, sunR - 1);
  const x0 = Math.max(0, (cx - discR) | 0);
  const x1 = Math.min(width - 1, (cx + discR) | 0);
  const y0 = Math.max(0, (sunY - discR) | 0);
  const y1 = Math.min(height - 1, (sunY + discR) | 0);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const dy = y - sunY;
      const d = Math.hypot(dx, dy);
      if (d > discR) continue;
      const u = d / discR;
      const lit = clamp01(0.62 - 0.55 * u + 0.24 * (-dx / discR - dy / discR));
      mixPixel(buf, width, height, x, y, mixRgb(shade, core, lit), 0.9);
    }
  }
  const ringR = sunR * (1.18 + 0.42 * marks.bloom);
  const ringW = 3 + 7 * marks.bloom;
  const rx0 = Math.max(0, (cx - ringR - ringW) | 0);
  const rx1 = Math.min(width - 1, (cx + ringR + ringW) | 0);
  const ry0 = Math.max(0, (sunY - ringR - ringW) | 0);
  const ry1 = Math.min(height - 1, (sunY + ringR + ringW) | 0);
  for (let y = ry0; y <= ry1; y++) {
    for (let x = rx0; x <= rx1; x++) {
      const d = Math.hypot(x - cx, y - sunY);
      const gap = Math.abs(d - ringR);
      if (gap > ringW) continue;
      mixPixel(buf, width, height, x, y, pair.jewel, (1 - gap / ringW) * (0.18 + 0.55 * marks.bloom));
    }
  }
}

function paintGate(buf, width, height, cx, sunY, pair, marks) {
  const z = 0.12 + 0.88 * marks.approach;
  const rx = 22 + width * 0.4 * z;
  const ry = 20 + height * 0.36 * z;
  const thick = Math.max(10, rx * 0.1 + 8 * marks.bloom);
  const inner = 1 - thick / Math.max(rx, ry);
  const y0 = Math.max(0, (sunY - ry - thick) | 0);
  const y1 = Math.min(height - 1, (sunY + ry + thick) | 0);
  const x0 = Math.max(0, (cx - rx - thick) | 0);
  const x1 = Math.min(width - 1, (cx + rx + thick) | 0);
  const veil = mixRgb(pair.jewel, pair.rim, 0.22);
  const mid = (inner + 1) * 0.5;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot((x - cx) / rx, (y - sunY) / ry);
      if (d > 1.06) continue;
      if (d < inner) {
        mixPixel(buf, width, height, x, y, veil, 0.1 + 0.22 * marks.bloom);
        continue;
      }
      putPixel(buf, width, height, x, y, pair.rim);
      if (Math.abs(d - inner) < 0.035) mixPixel(buf, width, height, x, y, pair.jewel, 0.55);
      if (Math.abs(d - mid) < 0.02) mixPixel(buf, width, height, x, y, pair.jewel, 0.28 * marks.bloom);
    }
  }
  const groundY = Math.min(height - 1, sunY + ry + 18 + 40 * z);
  const postW = Math.max(6, thick * 0.55);
  for (const side of [-1, 1]) {
    const fx = cx + side * rx * 0.62;
    const top = sunY + ry * 0.15;
    for (let y = Math.round(top); y <= Math.round(groundY); y++) {
      for (let x = Math.round(fx - postW); x <= Math.round(fx + postW); x++) {
        putPixel(buf, width, height, x, y, pair.rim);
      }
    }
  }
  rippel.stampFocusDisc(buf, width, height, cx, sunY - ry, 5 + 10 * z, pair.jewel, {
    rim: 2,
    glow: 12 + 18 * marks.bloom,
    glowAlpha: 0.58,
    rimColor: pair.rim,
  });
}

function paintFireBed(buf, width, height, cx, horizonY, pair, marks) {
  const h = 52 + 150 * marks.bloom;
  const w = 90 + 260 * marks.bloom;
  const y0 = Math.max(0, (horizonY - h) | 0);
  const y1 = Math.min(height - 1, (horizonY + 36) | 0);
  const x0 = Math.max(0, (cx - w) | 0);
  const x1 = Math.min(width - 1, (cx + w) | 0);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / w;
      const dy = (horizonY - y) / h;
      const d = dx * dx + dy * dy * 0.48;
      if (d > 1) continue;
      mixPixel(buf, width, height, x, y, pair.jewel, (1 - d) * (0.22 + 0.58 * marks.bloom));
    }
  }
}

function paintSparks(buf, width, height, cx, horizonY, pair, marks, t, seed) {
  const n = 16 + ((20 * marks.bloom) | 0);
  const floorH = Math.max(1, height - 1 - horizonY);
  const jag = seedInt(seed);
  for (let i = 0; i < n; i++) {
    const z = (0.12 + ((jag >>> (i % 24)) & 15) / 22 + t * marks.speed * 0.65 + i * 0.07) % 1;
    const gy = horizonY + 10 + Math.round(floorH * z * z);
    const side = i % 2 ? 1 : -1;
    const spread = (12 + z * width * 0.4) * side;
    const gx = cx + spread * (0.22 + ((jag >>> ((i + 3) % 20)) & 7) / 10);
    const r = 4.2 + 8.4 * z + 5.2 * marks.bloom;
    rippel.stampFocusDisc(buf, width, height, gx, gy, r, pair.jewel, {
      rim: 1,
      glow: 8 + 14 * marks.bloom,
      glowAlpha: 0.55,
      rimColor: pair.rim,
    });
    rippel.stampFocusDisc(buf, width, height, gx, gy - r * 0.7, r * 0.45, mixRgb(pair.jewel, HOUSE.ink, 0.15), {
      rim: 0,
      glow: 4 + 6 * marks.bloom,
      glowAlpha: 0.4,
      rimColor: pair.rim,
    });
  }
}

function paintDestinationFrame(opts) {
  const width = opts.width || rippel.MOTION_WIDTH;
  const height = opts.height || rippel.MOTION_HEIGHT;
  if (width < 1280 || height < 720) {
    const err = new Error("destination paints ≥720p");
    err.code = "BLIP_DESTINATION_SIZE";
    throw err;
  }
  const buf = opts.buffer || Buffer.alloc(width * height * 3);
  const seedHex = opts.seedHex || "0xdeadbeef";
  const brief = opts.brief || "destination";
  const t = typeof opts.t === "number" ? opts.t : 0;
  const pair = pickPair(seedHex);
  const checksum = rippel.cachedChecksum({
    brief,
    seedHex,
    width,
    height,
    lookKind: opts.lookKind,
    bodyKind: opts.bodyKind,
    genre: opts.genre,
    camera: opts.camera,
  });
  const phrase = rippel.phraseOf(checksum, t);
  const marks = destinationMarks(phrase, t);
  const horizonY = Math.round(height * (0.41 - 0.05 * marks.bloom - 0.04 * marks.approach));
  const cx = (width - 1) * 0.5;
  const roadHalf = width * 0.42;
  const sunR = 10 + 98 * marks.bloom;
  const bandH = 54 + 170 * marks.bloom;
  const scroll = t * (48 + 90 * marks.speed);

  for (let y = 0; y < height; y++) {
    const skyU = y < horizonY ? 1 - y / Math.max(1, horizonY) : 0;
    const groundU = y > horizonY ? (y - horizonY) / Math.max(1, height - 1 - horizonY) : 0;
    for (let x = 0; x < width; x++) {
      let color;
      if (y <= horizonY) {
        const fire = pair.motif === "sparks" ? 0.55 : 0;
        const lift = (1 - skyU) * (0.16 + 0.78 * marks.bloom) + fire * (1 - skyU) * marks.bloom;
        const wash = mixRgb(pair.bed, pair.haze, 0.08 + skyU * 0.16 + lift);
        const band = clamp01(1 - (horizonY - y) / bandH);
        color = mixRgb(wash, pair.jewel, band * (0.14 + 0.82 * marks.bloom) + fire * 0.22 * marks.bloom);
        if (Math.abs(y - horizonY) < 3 + 8 * marks.bloom) {
          color = mixRgb(color, pair.jewel, 0.84);
        }
      } else {
        const reflect = clamp01(1 - groundU * 3.1) * (0.14 + 0.4 * marks.bloom);
        color = mixRgb(mixRgb(pair.ground, pair.haze, 0.1 + 0.16 * groundU), pair.jewel, reflect);
        const roadStart = horizonY + Math.max(12, sunR * 0.5);
        const half = 10 + groundU * roadHalf;
        const dx = Math.abs(x - cx);
        if (y > roadStart && dx <= half) {
          color = mixRgb([36, 28, 32], pair.jewel, 0.12 + 0.18 * marks.hold);
          const edge = Math.abs(dx - half);
          if (edge < 6 + 7 * groundU) color = pair.rim;
          const dash = ((y * 0.05 + scroll) | 0) % 9 < 4;
          if (dx < 5.2 && dash) color = mixRgb(color, pair.jewel, 0.8 + 0.2 * marks.bloom);
        }
      }
      putPixel(buf, width, height, x, y, color);
    }
  }

  paintFloor(buf, width, height, cx, horizonY, pair, marks, t);
  const sunY = horizonY - Math.max(14, sunR * 0.24);
  if (pair.motif === "sparks") paintFireBed(buf, width, height, cx, horizonY, pair, marks);
  paintSun(buf, width, height, cx, sunY, sunR, pair, marks);
  if (pair.motif === "gate") paintGate(buf, width, height, cx, sunY, pair, marks);
  if (pair.motif === "sparks") paintSparks(buf, width, height, cx, horizonY, pair, marks, t, seedHex);
  if (marks.bloom > 0.45) {
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      strokeSeg(
        buf,
        width,
        height,
        cx,
        sunY,
        cx + i * width * 0.16,
        height - 1,
        pair.jewel,
        0.08 + 0.22 * marks.bloom,
        0.9,
      );
    }
  }

  return {
    buffer: buf,
    width,
    height,
    engine: ENGINE,
    look: LOOK,
    lookKind: checksum.lookKind,
    bodyKind: checksum.bodyKind,
    camera: rippel.resolveCamera(checksum.mesh),
    genre: checksum.genre,
    organ: ORGAN,
    pair: pair.id,
    hex: pair.hex,
    motif: pair.motif,
    visualConfig: checksum.visualConfig,
    phrase,
    marks,
  };
}

function sampleDestinationFrames(seedHex, brief) {
  const checksum = rippel.cachedChecksum({
    brief: brief || "destination",
    seedHex,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const beatSec = 60 / ((checksum.genreConfig && checksum.genreConfig.tempo) || 90);
  const cut = rippel.phraseOf(checksum, 0).hookEndBeats * beatSec;
  const hook = paintDestinationFrame({
    seedHex,
    brief,
    t: Math.max(0.1, Math.min(0.55, cut * 0.22)),
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const turn = paintDestinationFrame({
    seedHex,
    brief,
    t: Math.max(cut + 0.4, 1.8),
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  return { hook, turn, cut, pair: hook.pair, differ: rippel.framesDiffer(hook.buffer, turn.buffer) };
}

module.exports = {
  ENGINE,
  LOOK,
  ORGAN,
  TRON,
  SCENE_PAIRS,
  pickPair,
  destinationMarks,
  paintDestinationFrame,
  sampleDestinationFrames,
  mixPixel,
};
