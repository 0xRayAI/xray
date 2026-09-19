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
  },
  {
    id: "guard",
    hex: TRON.guard.hex,
    bed: HOUSE.void,
    ground: [10, 4, 8],
    jewel: TRON.guard.rgb,
    rim: HOUSE.cyan,
    haze: [56, 14, 6],
  },
  {
    id: "clu",
    hex: TRON.clu.hex,
    bed: [8, 7, 16],
    ground: [6, 5, 12],
    jewel: TRON.clu.rgb,
    rim: HOUSE.cyan,
    haze: [54, 28, 8],
  },
  {
    id: "poster",
    hex: TRON.poster.hex,
    bed: [7, 8, 14],
    ground: [5, 6, 10],
    jewel: TRON.poster.rgb,
    rim: HOUSE.cyan,
    haze: [50, 30, 4],
  },
  {
    id: "ember",
    hex: TRON.ember.hex,
    bed: [18, 6, 6],
    ground: [10, 4, 5],
    jewel: TRON.ember.rgb,
    rim: HOUSE.cyan,
    haze: [68, 24, 8],
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

function destinationMarks(phrase) {
  const hook = rippel.phraseWeight(phrase, "hook");
  const turn = rippel.phraseWeight(phrase, "turn");
  const tag = rippel.phraseWeight(phrase, "tag");
  const peak = rippel.rupturePeak(phrase);
  const section = phrase && phrase.section;
  let bloom = clamp01(0.08 * hook + 1.22 * turn + 0.88 * tag + 0.24 * peak);
  if (section === "hook") bloom = 0.1;
  else if (section === "turn") bloom = clamp01(0.62 + 0.38 * Math.max(turn, peak));
  else if (section === "tag" || tag > 0.45) bloom = 0.92;
  return {
    hook,
    turn,
    tag,
    peak,
    bloom,
    hold: clamp01(0.16 * hook + 0.58 * turn + 0.96 * tag),
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
  const steps = Math.max(2, (len / 0.65) | 0);
  const r = half > 0.6 ? half : 0.6;
  const nx = -dy / len;
  const ny = dx / len;
  for (let s = 0; s <= steps; s++) {
    const u = s / steps;
    const x = x0 + dx * u;
    const y = y0 + dy * u;
    for (let d = -r; d <= r; d += 0.7) {
      mixPixel(buf, width, height, x + nx * d, y + ny * d, color, alpha);
    }
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
  const marks = destinationMarks(phrase);
  const horizonY = Math.round(height * (0.4 - 0.03 * marks.bloom));
  const cx = (width - 1) * 0.5;
  const roadHalf = width * 0.42;
  const sunR = 38 + 52 * marks.bloom;
  const bandH = 88 + 120 * marks.bloom;
  const scroll = t * 72;

  for (let y = 0; y < height; y++) {
    const skyU = y < horizonY ? 1 - y / Math.max(1, horizonY) : 0;
    const groundU = y > horizonY ? (y - horizonY) / Math.max(1, height - 1 - horizonY) : 0;
    for (let x = 0; x < width; x++) {
      let color;
      if (y <= horizonY) {
        const lift = (1 - skyU) * (0.38 + 0.58 * marks.bloom);
        const wash = mixRgb(pair.bed, pair.haze, 0.12 + skyU * 0.2 + lift);
        const band = clamp01(1 - (horizonY - y) / bandH);
        color = mixRgb(wash, pair.jewel, band * (0.44 + 0.52 * marks.bloom));
        if (Math.abs(y - horizonY) < 3 + 7 * marks.bloom) {
          color = mixRgb(color, pair.jewel, 0.82);
        }
      } else {
        const reflect = clamp01(1 - groundU * 3.2) * (0.16 + 0.38 * marks.bloom);
        color = mixRgb(mixRgb(pair.ground, pair.haze, 0.1 + 0.16 * groundU), pair.jewel, reflect);
        const roadStart = horizonY + Math.max(10, sunR * 0.55);
        const half = 8 + groundU * roadHalf;
        const dx = Math.abs(x - cx);
        if (y > roadStart && dx <= half) {
          color = mixRgb([34, 26, 30], pair.jewel, 0.1 + 0.16 * marks.hold);
          const edge = Math.abs(dx - half);
          if (edge < 5.4 + 6 * groundU) color = pair.rim;
          const dash = ((y * 0.085 + scroll) | 0) % 7 < 3;
          if (dx < 4.2 && dash) color = mixRgb(color, pair.jewel, 0.78 + 0.22 * marks.bloom);
        }
      }
      putPixel(buf, width, height, x, y, color);
    }
  }

  const gridA = 0.48 + 0.42 * marks.hold;
  const floorH = Math.max(1, height - 1 - horizonY);
  for (let i = 1; i <= 12; i++) {
    const u = (i / 12) * (i / 12);
    const gy = horizonY + 2 + Math.round(floorH * u + (scroll % 36));
    strokeSeg(buf, width, height, 0, gy, width - 1, gy, pair.rim, gridA, 1.15);
  }
  const sunY = horizonY - Math.max(12, sunR * 0.22);
  const gridStart = horizonY + Math.max(10, sunR * 0.55);
  for (let i = -7; i <= 7; i++) {
    if (i === 0) continue;
    const x1 = cx + i * (width * 0.092);
    const u0 = (gridStart - horizonY) / Math.max(1, height - 1 - horizonY);
    strokeSeg(
      buf,
      width,
      height,
      cx + (x1 - cx) * u0,
      gridStart,
      x1,
      height - 1,
      pair.rim,
      gridA,
      1.05,
    );
  }

  rippel.stampFocusDisc(buf, width, height, cx, sunY, sunR, pair.jewel, {
    rim: 2,
    glow: 26 + 44 * marks.bloom,
    glowAlpha: 0.4 + 0.55 * marks.bloom,
    rimColor: pair.rim,
  });
  const core = mixRgb(pair.jewel, HOUSE.ink, 0.2);
  const shade = mixRgb(pair.jewel, pair.bed, 0.32);
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
      const lit = clamp01(0.58 - 0.5 * u + 0.2 * (-dx / discR - dy / discR));
      mixPixel(buf, width, height, x, y, mixRgb(shade, core, lit), 0.88);
    }
  }
  const rayN = 9;
  for (let i = 0; i < rayN; i++) {
    const ang = -Math.PI + (i / (rayN - 1)) * Math.PI;
    const reach = 36 + 150 * marks.bloom;
    strokeSeg(
      buf,
      width,
      height,
      cx,
      sunY,
      cx + Math.cos(ang) * reach,
      sunY + Math.sin(ang) * reach * 0.38,
      pair.jewel,
      0.22 + 0.55 * marks.bloom,
      1.1 + 1.6 * marks.bloom,
    );
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
    t: Math.max(0.12, cut * 0.28),
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const turn = paintDestinationFrame({
    seedHex,
    brief,
    t: cut,
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
