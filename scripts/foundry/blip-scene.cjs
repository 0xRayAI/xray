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
    bed: [6, 8, 22],
    ground: [4, 5, 14],
    jewel: TRON.legacy.rgb,
    rim: HOUSE.cyan,
    haze: [52, 22, 6],
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
    rim: HOUSE.gold,
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
    bed: [8, 6, 12],
    ground: [6, 4, 9],
    jewel: TRON.ember.rgb,
    rim: HOUSE.ink,
    haze: [48, 18, 8],
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
  const bloom = clamp01(0.18 * hook + 1.12 * turn + 0.72 * tag + 0.38 * peak);
  return {
    hook,
    turn,
    tag,
    peak,
    bloom,
    hold: clamp01(0.22 * hook + 0.64 * turn + 0.92 * tag),
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
  const horizonY = Math.round(height * (0.42 - 0.02 * marks.bloom));
  const cx = (width - 1) * 0.5;
  const roadHalf = width * 0.4;
  const sunR = 28 + 26 * marks.bloom;

  for (let y = 0; y < height; y++) {
    const skyU = y < horizonY ? 1 - y / Math.max(1, horizonY) : 0;
    const groundU = y > horizonY ? (y - horizonY) / Math.max(1, height - 1 - horizonY) : 0;
    for (let x = 0; x < width; x++) {
      let color;
      if (y <= horizonY) {
        const wash = mixRgb(pair.bed, pair.haze, 0.18 + skyU * (0.42 + 0.5 * marks.bloom));
        const band = clamp01(1 - Math.abs(y - horizonY) / (28 + 48 * marks.bloom));
        color = mixRgb(wash, pair.jewel, band * (0.42 + 0.58 * marks.bloom));
      } else {
        color = mixRgb(pair.ground, pair.haze, 0.12 + 0.18 * groundU);
        const half = 3.2 + groundU * roadHalf;
        const dx = Math.abs(x - cx);
        if (dx <= half) {
          const asphalt = mixRgb([18, 18, 24], pair.haze, 0.16 + 0.2 * marks.hold);
          color = asphalt;
          const edge = Math.abs(dx - half);
          if (edge < 4.6) color = pair.rim;
          const dash = ((y * 0.07 + t * 22) | 0) % 6 < 3;
          if (dx < 3.4 && dash) color = mixRgb(color, pair.jewel, 0.72 + 0.28 * marks.bloom);
        }
      }
      putPixel(buf, width, height, x, y, color);
    }
  }

  const gridA = 0.22 + 0.38 * marks.hold;
  for (let i = 1; i <= 10; i++) {
    const u = (i / 10) * (i / 10);
    const gy = horizonY + 2 + Math.round((height - 1 - horizonY) * u);
    for (let x = 0; x < width; x++) mixPixel(buf, width, height, x, gy, pair.rim, gridA);
  }
  for (let i = -8; i <= 8; i++) {
    if (i === 0) continue;
    const x1 = cx + i * (width * 0.085);
    const steps = 48;
    for (let s = 0; s <= steps; s++) {
      const u = s / steps;
      mixPixel(buf, width, height, cx + (x1 - cx) * u, horizonY + (height - 1 - horizonY) * u, pair.rim, gridA);
    }
  }

  const sunY = horizonY - 6;
  rippel.stampFocusDisc(buf, width, height, cx, sunY, sunR, pair.jewel, {
    rim: 2,
    glow: 10 + 14 * marks.bloom,
    glowAlpha: 0.28 + 0.48 * marks.bloom,
    rimColor: pair.rim,
  });
  for (let i = 0; i < 7; i++) {
    const ang = -Math.PI + (i / 6) * Math.PI;
    const reach = 28 + 70 * marks.bloom;
    const steps = Math.max(8, (reach / 3) | 0);
    for (let s = 1; s <= steps; s++) {
      const u = s / steps;
      mixPixel(
        buf,
        width,
        height,
        cx + Math.cos(ang) * reach * u,
        sunY + Math.sin(ang) * reach * 0.42 * u,
        pair.jewel,
        0.28 + 0.42 * marks.bloom * (1 - u),
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
