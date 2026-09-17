/**
 * Factory-blip kapow — design opt, not a Rippel import and not a look.
 *
 * Two-tier stamp on the shared stanza: outer burst winds, inner burst +
 * KAPOW! land on the jewel cut, tag holds. One noun in the hole.
 * Power Plant palette. ≥720p. Same seed camera / genre grid as the five.
 */

const rippel = require("./blip-rippel.cjs");

const ENGINE = "kapow-headless";
const LOOK = "kapow-blip";
const ORGAN = "kapow";
const WORD = "KAPOW!";

/** 5×7 caps — KAPOW! only. */
const GLYPHS = {
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0x00, 0x04],
};

function clamp01(n) {
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
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

function starRadius(angle, spikes, r0, r1, rot, jag) {
  const turns = spikes > 2 ? spikes : 12;
  const u = ((angle - rot) / (Math.PI * 2)) * turns;
  const i = Math.floor(u);
  const f = u - i;
  const tri = f < 0.5 ? f * 2 : (1 - f) * 2;
  const bite = 1 + (((jag || 0) >> (i & 7)) & 1) * 0.1;
  return (r0 + (r1 - r0) * Math.pow(Math.max(0, tri), 2.2)) * bite;
}

function paintStar(buf, width, height, cx, cy, spikes, r0, r1, rot, color, alpha, jag) {
  if (r1 <= 1 || alpha <= 0) return;
  const pad = r1 * 1.12;
  const x0 = Math.max(0, Math.floor(cx - pad - 1));
  const x1 = Math.min(width - 1, Math.ceil(cx + pad + 1));
  const y0 = Math.max(0, Math.floor(cy - pad - 1));
  const y1 = Math.min(height - 1, Math.ceil(cy + pad + 1));
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx;
      const d = Math.hypot(dx, dy);
      if (d > pad + 1.2) continue;
      const ang = Math.atan2(dy, dx);
      const edge = starRadius(ang, spikes, r0, r1, rot, jag);
      if (d > edge + 0.6) continue;
      let a = alpha;
      const rim = edge - d;
      if (rim < 1.4) a *= Math.max(0, rim / 1.4);
      mixPixel(buf, width, x, y, color, a);
    }
  }
}

function paintGlyph(buf, width, height, ch, x0, y0, cell, color, alpha) {
  const rows = GLYPHS[ch];
  if (!rows) return;
  for (let row = 0; row < 7; row++) {
    const bits = rows[row];
    for (let col = 0; col < 5; col++) {
      if (((bits >> (4 - col)) & 1) === 0) continue;
      const px = x0 + col * cell;
      const py = y0 + row * cell;
      for (let oy = 0; oy < cell; oy++) {
        for (let ox = 0; ox < cell; ox++) {
          mixPixel(buf, width, px + ox, py + oy, color, alpha);
        }
      }
    }
  }
}

function paintWord(buf, width, height, cx, cy, cell, color, alpha) {
  if (alpha <= 0.02 || cell < 2) return;
  const gap = Math.max(1, Math.round(cell * 0.35));
  const letterW = 5 * cell;
  const letterH = 7 * cell;
  const total = WORD.length * letterW + (WORD.length - 1) * gap;
  let x = Math.round(cx - total / 2);
  const y = Math.round(cy - letterH / 2);
  const ink = rippel.THEME.ink;
  for (let i = 0; i < WORD.length; i++) {
    paintGlyph(buf, width, height, WORD[i], x + 1, y + 1, cell, ink, alpha * 0.55);
    paintGlyph(buf, width, height, WORD[i], x, y, cell, color, alpha);
    x += letterW + gap;
  }
}

function kapowMarks(phrase, checksum) {
  const hook = rippel.phraseWeight(phrase, "hook");
  const turn = rippel.phraseWeight(phrase, "turn");
  const tag = rippel.phraseWeight(phrase, "tag");
  const hit = rippel.ruptureHit(phrase);
  const peak = rippel.rupturePeak(phrase);
  const recoil = rippel.ruptureRecoil(phrase);
  const pose = rippel.cameraPose(rippel.resolveCamera(checksum.mesh), phrase);
  return {
    hook,
    turn,
    tag,
    hit,
    peak,
    recoil,
    pose,
    outer: (0.84 * hook + 1.12 * turn + 0.92 * tag) * pose.dolly * (1 - 0.16 * recoil),
    inner: (0.22 * hook + 1.04 * turn + 0.72 * tag + 0.32 * hit) * pose.dolly,
    word: clamp01(turn * 1.15 + peak * 0.85 + tag * 0.42 - hook * 0.35),
  };
}

function paintKapowFrame(opts) {
  const width = opts.width || rippel.MOTION_WIDTH;
  const height = opts.height || rippel.MOTION_HEIGHT;
  if (width < 1280 || height < 720) {
    const err = new Error(`kapow must be ≥720p (got ${width}×${height})`);
    err.code = "BLIP_KAPOW_RES";
    throw err;
  }
  const buf = opts.buffer || Buffer.alloc(width * height * 3);
  const checksum = rippel.cachedChecksum({
    brief: opts.brief,
    seedHex: opts.seedHex,
    genre: opts.genre,
    width,
    height,
    lookKind: opts.lookKind,
    bodyKind: opts.bodyKind,
    camera: opts.camera,
  });
  const t = opts.t || 0;
  const phrase = rippel.phraseOf(checksum, t);
  const marks = kapowMarks(phrase, checksum);
  const gem = Number.parseInt(String(opts.seedHex || "1").replace(/^0x/, "").slice(0, 8), 16) || 1;
  const outerSpikes = 14 + (gem % 5);
  const innerSpikes = 10 + ((gem >>> 8) % 4);
  const rot0 = ((gem >>> 16) % 360) * (Math.PI / 180);
  const rot = rot0 + phrase.beats * 0.08 + marks.pose.roll * 0.35;
  const minSide = Math.min(width, height);
  const cx = width * 0.5 + marks.pose.yaw * minSide * 0.04;
  const cy = height * 0.5 - marks.pose.pitch * minSide * 0.035;
  const outerR = minSide * 0.46 * Math.max(0.42, marks.outer);
  const innerR = minSide * 0.3 * Math.max(0.16, marks.inner);

  rippel.fillVoid(buf);
  paintStar(
    buf,
    width,
    height,
    cx,
    cy,
    outerSpikes,
    outerR * 0.64,
    outerR,
    rot,
    rippel.THEME.cyan,
    0.96,
    gem,
  );
  paintStar(
    buf,
    width,
    height,
    cx,
    cy,
    outerSpikes,
    outerR * 0.7,
    outerR * 1.06,
    rot,
    rippel.THEME.blue,
    0.34,
    gem >>> 3,
  );
  paintStar(
    buf,
    width,
    height,
    cx,
    cy,
    innerSpikes,
    innerR * 0.6,
    innerR,
    -rot * 1.12,
    rippel.THEME.gold,
    0.4 + 0.6 * clamp01(marks.inner),
    gem >>> 8,
  );
  const nounR = Math.max(10, innerR * 0.22 + minSide * 0.018);
  rippel.stampFocusDisc(buf, width, height, cx, cy, nounR, rippel.THEME.cyan, {
    rim: 2,
    glow: 4,
    glowAlpha: 0.22 + 0.28 * marks.hit,
    rimColor: rippel.THEME.ink,
  });
  rippel.stampFocusDisc(buf, width, height, cx, cy, nounR * 0.34, rippel.THEME.gold, {
    rim: 1,
    glow: 2,
    glowAlpha: 0.18,
    rimColor: rippel.THEME.ink,
  });
  const cell = Math.max(3, Math.round(innerR * 0.048 + marks.word * 3.2));
  paintWord(buf, width, height, cx, cy - innerR * 0.02, cell, rippel.THEME.void, marks.word);

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
    visualConfig: checksum.visualConfig,
    phrase,
    marks,
    word: WORD,
  };
}

function sampleKapowFrames(seedHex, brief) {
  const checksum = rippel.cachedChecksum({
    brief: brief || "kapow",
    seedHex,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const beatSec = 60 / ((checksum.genreConfig && checksum.genreConfig.tempo) || 90);
  const cut = rippel.phraseOf(checksum, 0).hookEndBeats * beatSec;
  const hook = paintKapowFrame({
    seedHex,
    brief,
    t: Math.max(0.12, cut * 0.28),
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  const turn = paintKapowFrame({
    seedHex,
    brief,
    t: cut,
    width: rippel.MOTION_WIDTH,
    height: rippel.MOTION_HEIGHT,
  });
  return { hook, turn, cut, differ: rippel.framesDiffer(hook.buffer, turn.buffer) };
}

module.exports = {
  ENGINE,
  LOOK,
  ORGAN,
  WORD,
  GLYPHS,
  starRadius,
  paintStar,
  paintWord,
  kapowMarks,
  paintKapowFrame,
  sampleKapowFrames,
};
