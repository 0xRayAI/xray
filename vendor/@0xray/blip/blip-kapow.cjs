/**
 * Factory-blip kapow — design opt, not a Rippel import and not a look.
 *
 * Two-tier stamp on the shared stanza: outer burst winds, inner burst +
 * KAPOW! slam the jewel cut, tag holds. Ink outline. One noun under the word.
 * Power Plant palette. ≥720p. Same seed camera / genre grid as the five.
 */

const rippel = require("./blip-rippel.cjs");

const ENGINE = "kapow-headless";
const LOOK = "kapow-blip";
const ORGAN = "kapow";
const WORD = "KAPOW!";
const SPIKE_POW = 4.2;
const OUTER_FAT = 0.3;
const INNER_FAT = 0.4;
const OUTER_SPIKES_MIN = 8;
const INNER_SPIKES_MIN = 6;

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

function spikeStretch(index, jag) {
  const nibble = ((jag || 0x9e3779b9) >>> ((index & 7) * 3)) & 7;
  const alt = index & 1 ? 0.74 : 1.12;
  return alt * (0.7 + (nibble / 7) * 0.64);
}

function starRadius(angle, spikes, r0, r1, rot, jag) {
  const turns = spikes > 2 ? spikes : OUTER_SPIKES_MIN;
  const u = ((angle - rot) / (Math.PI * 2)) * turns;
  const i = Math.floor(u);
  const f = u - i;
  const tri = f < 0.5 ? f * 2 : (1 - f) * 2;
  const stretch = spikeStretch(i, jag);
  return (r0 + (r1 - r0) * Math.pow(Math.max(0, tri), SPIKE_POW)) * stretch;
}

function paintStar(buf, width, height, cx, cy, spikes, r0, r1, rot, color, alpha, jag) {
  if (r1 <= 1 || alpha <= 0) return;
  const pad = r1 * 1.48;
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
      if (rim < 1.1) a *= Math.max(0, rim / 1.1);
      mixPixel(buf, width, x, y, color, a);
    }
  }
}

function paintBurst(buf, width, height, cx, cy, spikes, r0, r1, rot, fill, alpha, jag, rim) {
  if (r1 <= 1 || alpha <= 0) return;
  paintStar(buf, width, height, cx, cy, spikes, r0, r1, rot, fill, alpha, jag);
  if (rim) {
    paintRing(buf, width, height, cx, cy, r1, 2.4, rim, 0.92);
  }
}

function paintRing(buf, width, height, cx, cy, radius, thick, color, alpha) {
  if (radius < 4 || alpha <= 0) return;
  const pad = radius + thick + 1;
  const x0 = Math.max(0, Math.floor(cx - pad));
  const x1 = Math.min(width - 1, Math.ceil(cx + pad));
  const y0 = Math.max(0, Math.floor(cy - pad));
  const y1 = Math.min(height - 1, Math.ceil(cy + pad));
  const inner = radius - thick;
  const outer = radius + thick;
  for (let y = y0; y <= y1; y++) {
    const dy = y - cy;
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot(x - cx, dy);
      if (d < inner || d > outer) continue;
      const edge = Math.min(d - inner, outer - d);
      mixPixel(buf, width, x, y, color, alpha * Math.min(1, edge / Math.max(0.6, thick * 0.45)));
    }
  }
}

function paintSpeedLines(buf, width, height, cx, cy, count, reach, color, alpha, rot) {
  if (alpha <= 0.04 || reach < 8) return;
  for (let i = 0; i < count; i++) {
    const ang = rot + (i * Math.PI * 2) / count + ((i * 17) % 7) * 0.04;
    const cos = Math.cos(ang);
    const sin = Math.sin(ang);
    const inner = reach * 0.42;
    const steps = Math.max(12, Math.round(reach * 0.55));
    for (let s = 0; s < steps; s++) {
      const u = s / steps;
      const d = inner + (reach - inner) * u;
      const fade = alpha * (1 - u) * (1 - u);
      const x = cx + cos * d;
      const y = cy + sin * d;
      mixPixel(buf, width, x, y, color, fade);
      mixPixel(buf, width, x + cos, y + sin, color, fade * 0.7);
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

function paintWord(buf, width, height, cx, cy, cell, fill, alpha) {
  if (alpha <= 0.02 || cell < 2) return;
  const gap = Math.max(2, Math.round(cell * 0.28));
  const letterW = 5 * cell;
  const letterH = 7 * cell;
  const total = WORD.length * letterW + (WORD.length - 1) * gap;
  let x = Math.round(cx - total / 2);
  const y = Math.round(cy - letterH / 2);
  const stroke = rippel.THEME.void;
  const outline = Math.max(2, Math.round(cell * 0.28));
  for (let i = 0; i < WORD.length; i++) {
    const gx = x;
    for (let oy = -outline; oy <= outline; oy++) {
      for (let ox = -outline; ox <= outline; ox++) {
        if (ox === 0 && oy === 0) continue;
        paintGlyph(buf, width, height, WORD[i], gx + ox, y + oy, cell, stroke, alpha);
      }
    }
    paintGlyph(buf, width, height, WORD[i], gx, y, cell, fill, alpha);
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
    outer: (0.72 * hook + 1.32 * turn + 1.04 * tag) * pose.dolly * (1 - 0.08 * recoil),
    inner: (0.2 * hook + 1.34 * turn + 0.86 * tag + 0.46 * hit) * pose.dolly,
    word: clamp01(turn * 1.55 + peak * 1.12 + tag * 0.58 - hook * 0.78),
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
  const outerSpikes = OUTER_SPIKES_MIN + (gem % 3);
  const innerSpikes = INNER_SPIKES_MIN + ((gem >>> 8) % 3);
  const rot0 = ((gem >>> 16) % 360) * (Math.PI / 180);
  const rot = rot0 + phrase.beats * 0.11 + marks.pose.roll * 0.35;
  const minSide = Math.min(width, height);
  const cx = width * 0.5 + marks.pose.yaw * minSide * 0.03;
  const cy = height * 0.5 - marks.pose.pitch * minSide * 0.028;
  const outerR = minSide * 0.56 * Math.max(0.62, marks.outer);
  const innerR = minSide * 0.44 * Math.max(0.16, marks.inner);

  rippel.fillVoid(buf);
  paintSpeedLines(
    buf,
    width,
    height,
    cx,
    cy,
    10,
    outerR * 1.18,
    rippel.THEME.ink,
    0.18 + 0.48 * clamp01(marks.turn + marks.peak),
    rot,
  );
  paintSpeedLines(
    buf,
    width,
    height,
    cx,
    cy,
    6,
    outerR * 1.08,
    rippel.THEME.gold,
    0.08 + 0.42 * clamp01(marks.turn + marks.peak),
    rot + 0.11,
  );
  paintBurst(
    buf,
    width,
    height,
    cx,
    cy,
    outerSpikes,
    outerR * OUTER_FAT,
    outerR,
    rot,
    rippel.THEME.cyan,
    0.98,
    gem,
    rippel.THEME.ink,
  );
  paintBurst(
    buf,
    width,
    height,
    cx,
    cy,
    outerSpikes,
    outerR * 0.34,
    outerR * 1.04,
    rot + 0.08,
    rippel.THEME.blue,
    0.28 + 0.22 * clamp01(marks.turn),
    gem >>> 3,
    null,
  );
  if (marks.turn > 0.22 || marks.peak > 0.16) {
    const ringA = 0.42 + 0.58 * clamp01(marks.peak + marks.turn);
    paintRing(buf, width, height, cx, cy, outerR * 0.52, 3.6, rippel.THEME.ink, ringA * 0.78);
    paintRing(buf, width, height, cx, cy, outerR * 0.74, 3.1, rippel.THEME.gold, ringA);
    paintRing(buf, width, height, cx, cy, outerR * 0.94, 2.4, rippel.THEME.ink, ringA);
  }
  paintBurst(
    buf,
    width,
    height,
    cx,
    cy,
    innerSpikes,
    innerR * INNER_FAT,
    innerR,
    -rot * 1.18,
    rippel.THEME.gold,
    0.22 + 0.78 * clamp01(marks.inner),
    gem >>> 8,
    rippel.THEME.void,
  );
  const nounR = Math.max(8, innerR * 0.14 + minSide * 0.01);
  rippel.stampFocusDisc(buf, width, height, cx, cy, nounR, rippel.THEME.cyan, {
    rim: 2,
    glow: 3,
    glowAlpha: 0.16 + 0.2 * marks.hit,
    rimColor: rippel.THEME.ink,
  });
  rippel.stampFocusDisc(buf, width, height, cx, cy, nounR * 0.32, rippel.THEME.gold, {
    rim: 1,
    glow: 1,
    glowAlpha: 0.14,
    rimColor: rippel.THEME.void,
  });
  const cell = Math.max(18, Math.round(minSide * 0.028 + marks.word * 8.2));
  paintWord(buf, width, height, cx, cy, cell, rippel.THEME.ink, marks.word);

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
  SPIKE_POW,
  OUTER_FAT,
  INNER_FAT,
  OUTER_SPIKES_MIN,
  INNER_SPIKES_MIN,
  spikeStretch,
  starRadius,
  paintStar,
  paintWord,
  kapowMarks,
  paintKapowFrame,
  sampleKapowFrames,
};
