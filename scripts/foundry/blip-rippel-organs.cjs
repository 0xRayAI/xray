/**
 * Headless ports of the five Rippel drawers at e5014cd.
 *   orb    InteractiveCanvas          — musical mandala + rings + motes
 *   swirl  ThreeJSVisualizer          — sacred-flow N-gons + depth circles + spirals
 *   snap   NeuralNetworkVisualizer    — Kuramoto clusters (deterministic closed form)
 *   waves  WaveformVisualizer         — aurora ripples + energy orbs (ribbons stay in parent)
 *   spark  ParticleAnimations         — cosmic particles + constellations + shooting star
 *
 * Mesh/field stay the mint id under these drawings. These functions never early-return
 * to a platonic cage. Hue is snapped to the Power Plant triad (no rainbow strobe).
 */

function createOrgans(kit) {
  const {
    THEME,
    mixPixel,
    mixRgb,
    paintSharpLine,
    paintGlowLine,
    stampFocusDisc,
    beatPhase,
    kickAccent,
    andAccent,
    phraseOf,
    iridesce,
    mulberry32,
    clamp,
  } = kit;

  const ORGAN = {
    canvas: "mandala",
    "3d-sacred": "sacred-flow",
    neural: "synapse",
    waveform: "liquid-waves",
    particles: "cosmic-dance",
  };

  function themeFromHue(h) {
    const u = ((h % 360) + 360) % 360;
    if (u < 70) return mixRgb(THEME.gold, THEME.cyan, u / 70);
    if (u < 200) return mixRgb(THEME.cyan, THEME.blue, (u - 70) / 130);
    return mixRgb(THEME.blue, THEME.gold, (u - 200) / 160);
  }

  function paintRing(buf, width, height, cx, cy, radius, color, segs, alpha) {
    const n = Math.max(16, segs | 0);
    let px = cx + radius;
    let py = cy;
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      paintGlowLine(buf, width, height, px, py, x, y, color, { glowAlpha: alpha || 0.08 });
      px = x;
      py = y;
    }
  }

  function paintPolygon(buf, width, height, cx, cy, radius, sides, rotation, color) {
    const n = Math.max(3, sides | 0);
    let px = cx + Math.cos(rotation) * radius;
    let py = cy + Math.sin(rotation) * radius;
    for (let i = 1; i <= n; i++) {
      const a = rotation + (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      paintSharpLine(buf, width, height, px, py, x, y, color, 1);
      px = x;
      py = y;
    }
  }

  /** InteractiveCanvas — musical mandala. cage orb wears this, not a Wu cage. */
  function paintMandala(buf, width, height, t, checksum) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const minSide = Math.min(width, height);
    const beat = beatPhase(checksum, t);
    const kick = kickAccent(beat);
    const and = andAccent(beat);
    const phrase = phraseOf(checksum, t);
    const hash = (checksum.gematria && checksum.gematria.checksumValue) || 1;
    const scale = minSide / 400;
    const layers = 6 + ((hash >>> 3) % 3);
    const notePulse = 1 + 0.06 * kick + 0.04 * (phrase.turnEase || 0);
    const beatPulse = 1 + 0.05 * and;

    for (let layer = 0; layer < layers; layer++) {
      const radius = (28 + layer * 18) * scale * notePulse * beatPulse;
      const petals = 6 + layer + (hash % 3);
      const rotation = t * (0.08 + layer * 0.018) + beat * 0.07;
      const color = themeFromHue(t * 28 + layer * 40 + (hash % 40));
      paintPolygon(buf, width, height, cx, cy, radius, petals, rotation, color);
      if (layer % 2 === 0) {
        const inner = color;
        for (let i = 0; i < petals; i++) {
          const a0 = rotation + (i / petals) * Math.PI * 2;
          const a1 = rotation + ((i + 1) / petals) * Math.PI * 2;
          paintGlowLine(
            buf,
            width,
            height,
            cx + Math.cos(a0) * radius * 0.7,
            cy + Math.sin(a0) * radius * 0.7,
            cx + Math.cos(a1) * radius * 0.7,
            cy + Math.sin(a1) * radius * 0.7,
            inner,
            { glowAlpha: 0.1 },
          );
        }
      }
    }

    const rings = 4;
    for (let i = 0; i < rings; i++) {
      const radius = (52 + i * 34) * scale * (1 + 0.04 * kick);
      paintRing(
        buf,
        width,
        height,
        cx,
        cy,
        radius,
        i === 0 && kick > 0.2 ? THEME.gold : themeFromHue(t * 22 + i * 55),
        40,
        0.1,
      );
    }

    const motes = 22;
    for (let i = 0; i < motes; i++) {
      const ang = (i / motes) * Math.PI * 2 + t * 0.28;
      const dist = minSide * (0.18 + 0.1 * Math.sin(t * 1.6 + i));
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist * 0.78;
      const gold = kick > 0.15 && i % 7 === 0;
      stampFocusDisc(buf, width, height, x, y, 2.4 + (i % 3) * 0.6, gold ? THEME.gold : themeFromHue(t * 30 + i * 18), {
        rim: 1,
        glow: 2,
        glowAlpha: 0.16,
        rimColor: THEME.ink,
      });
    }
  }

  /** ThreeJSVisualizer — sacred-flow N-gons + depth circles + hypnotic spirals. */
  function paintSacredFlow(buf, width, height, t, checksum) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const minSide = Math.min(width, height);
    const beat = beatPhase(checksum, t);
    const kick = kickAccent(beat);
    const hash = (checksum.gematria && checksum.gematria.checksumValue) || 1;
    const scale = minSide / 400;
    const layers = 6 + ((hash >>> 5) % 3);

    for (let layer = 0; layer < layers; layer++) {
      const sides = 6 + (layer % 4);
      const base = (22 + layer * 22) * scale;
      const wave = Math.sin(t * 2.2 + layer) * 3.2 * scale;
      const radius = (base + wave) * (1 + 0.05 * kick);
      const rotation = t * (0.09 + layer * 0.025) + beat * 0.05;
      const color = themeFromHue(t * 24 + layer * 28 + (hash % 50));
      paintPolygon(buf, width, height, cx, cy, radius, sides, rotation, color);
      if (layer % 2 === 0 && kick > 0.12) {
        for (let i = 0; i < sides; i += 2) {
          const a1 = rotation + (i / sides) * Math.PI * 2;
          const a2 = rotation + ((i + 3) / sides) * Math.PI * 2;
          paintGlowLine(
            buf,
            width,
            height,
            cx + Math.cos(a1) * radius * 0.6,
            cy + Math.sin(a1) * radius * 0.6,
            cx + Math.cos(a2) * radius * 0.6,
            cy + Math.sin(a2) * radius * 0.6,
            THEME.gold,
            { glowAlpha: 0.12 },
          );
        }
      }
    }

    const circles = 5;
    for (let i = 0; i < circles; i++) {
      const radius = (36 + i * 26) * scale * (1 + 0.03 * Math.sin(t * 1.6 + i));
      paintRing(buf, width, height, cx + i * 0.6, cy + i * 0.6, radius, themeFromHue(t * 18 + i * 40), 36, 0.08);
    }

    const spirals = 3;
    const steps = 72;
    for (let s = 0; s < spirals; s++) {
      const turns = 2.4 + s * 0.7;
      const rot = t * (0.35 + s * 0.12) + s * Math.PI * 0.5;
      const color = s === 0 && kick > 0.2 ? THEME.gold : themeFromHue(t * 32 + s * 70);
      let px = cx;
      let py = cy;
      for (let i = 1; i <= steps; i++) {
        const p = i / steps;
        const ang = p * turns * Math.PI * 2 + rot;
        const radius = (12 + p * 118) * scale + Math.sin(p * 8 + t * 3) * 3 * scale;
        const x = cx + Math.cos(ang) * radius;
        const y = cy + Math.sin(ang) * radius;
        paintGlowLine(buf, width, height, px, py, x, y, color, { glowAlpha: 0.1 });
        px = x;
        py = y;
      }
    }
  }

  function ensureSynapse(checksum, width, height) {
    if (checksum.synapse && checksum.synapse.width === width && checksum.synapse.height === height) {
      return checksum.synapse;
    }
    const hash = (checksum.gematria && checksum.gematria.checksumValue) || 1;
    const rng = mulberry32(hash ^ 0x51a95e);
    const count = 50 + (hash % 24);
    const clusters = 6;
    const per = Math.floor(count / clusters);
    const nodes = [];
    for (let c = 0; c < clusters; c++) {
      const ang = (c / clusters) * Math.PI * 2;
      for (let i = 0; i < per; i++) {
        const a = rng() * Math.PI * 2;
        const d = 24 + rng() * 56;
        nodes.push({
          clusterId: c,
          ox: Math.cos(ang) * (width * 0.28) + Math.cos(a) * d,
          oy: Math.sin(ang) * (height * 0.28) + Math.sin(a) * d,
          orbit: 6 + rng() * 14,
          theta0: rng() * Math.PI * 2,
          naturalFreq: 0.012 + rng() * 0.01,
          hue: (c * 52 + rng() * 28) % 360,
          hub: i === 0,
          size: 2.2 + rng() * 1.6,
        });
      }
    }
    while (nodes.length < count) {
      nodes.push({
        clusterId: -1,
        ox: (rng() - 0.5) * width * 0.7,
        oy: (rng() - 0.5) * height * 0.7,
        orbit: 10 + rng() * 18,
        theta0: rng() * Math.PI * 2,
        naturalFreq: 0.02 + rng() * 0.012,
        hue: rng() * 360,
        hub: false,
        size: 2 + rng() * 1.4,
      });
    }
    const links = [];
    const maxD = 170;
    const prob = 0.3 + (hash % 20) / 100;
    for (let i = 0; i < nodes.length; i++) {
      let n = 0;
      for (let j = 0; j < nodes.length && n < 5; j++) {
        if (i === j) continue;
        const dx = nodes[i].ox - nodes[j].ox;
        const dy = nodes[i].oy - nodes[j].oy;
        if (dx * dx + dy * dy > maxD * maxD) continue;
        let p = prob;
        if (nodes[i].hub || nodes[j].hub) p *= 1.5;
        if (nodes[i].clusterId === nodes[j].clusterId && nodes[i].clusterId !== -1) p *= 1.3;
        if (rng() < p) {
          links.push([i, j]);
          n += 1;
        }
      }
    }
    checksum.synapse = { width, height, nodes, links };
    return checksum.synapse;
  }

  function seatSynapse(node, width, height, t, tempo) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const time = t * (tempo / 120);
    const rot = node.clusterId === -1 ? 0 : time * 0.045 * (tempo / 120);
    const clusterAng = node.clusterId === -1 ? 0 : (node.clusterId / 6) * Math.PI * 2 + rot;
    const breath = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(time * 2.4 + (node.clusterId + 1) * 0.7));
    const spread = node.clusterId === -1 ? 1 : breath;
    const tx = cx + node.ox * spread + (node.clusterId === -1 ? 0 : Math.cos(clusterAng) * 8);
    const ty = cy + node.oy * spread + (node.clusterId === -1 ? 0 : Math.sin(clusterAng) * 8);
    const ang = node.theta0 + time * node.naturalFreq * 10;
    return {
      x: tx + Math.cos(ang) * node.orbit,
      y: ty + Math.sin(ang) * node.orbit,
    };
  }

  /** NeuralNetworkVisualizer — 50–73 Kuramoto nodes, closed-form so each frame is seed-locked. */
  function paintKuramoto(buf, width, height, t, checksum) {
    const net = ensureSynapse(checksum, width, height);
    const beat = beatPhase(checksum, t);
    const kick = kickAccent(beat);
    const tempo = (checksum.genreConfig && checksum.genreConfig.tempo) || 90;
    const seats = net.nodes.map((node) => seatSynapse(node, width, height, t, tempo));

    for (let i = 0; i < net.links.length; i++) {
      const [a, b] = net.links[i];
      const pa = seats[a];
      const pb = seats[b];
      if (!pa || !pb) continue;
      const color = themeFromHue((net.nodes[a].hue + net.nodes[b].hue) * 0.5 + t * 8);
      paintGlowLine(buf, width, height, pa.x, pa.y, pb.x, pb.y, color, { glowAlpha: 0.09 });
    }

    for (let i = 0; i < net.nodes.length; i++) {
      const node = net.nodes[i];
      const p = seats[i];
      const gold = node.hub && kick > 0.18;
      stampFocusDisc(
        buf,
        width,
        height,
        p.x,
        p.y,
        node.size + (node.hub ? 1.2 : 0) + kick * 0.6,
        gold ? THEME.gold : themeFromHue(node.hue + t * 10),
        { rim: 1, glow: 2, glowAlpha: 0.18, rimColor: THEME.ink },
      );
    }

    const minSide = Math.min(width, height);
    const waveR = ((beat % 1) * minSide * 0.32) | 0;
    if (waveR > 12) {
      paintRing(buf, width, height, (width - 1) * 0.5, (height - 1) * 0.5, waveR, THEME.cyan, 48, 0.08);
    }
  }

  /** WaveformVisualizer extras — aurora + orbs. Ribbons stay in the parent painter. */
  function paintAuroraOrbs(buf, width, height, t, checksum) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const minSide = Math.min(width, height);
    const beat = beatPhase(checksum, t);
    const kick = kickAccent(beat);
    const scale = minSide / 400;
    for (let i = 0; i < 6; i++) {
      const phase = (t * 1.6 + i * Math.PI / 3) % (Math.PI * 2);
      const radius = (22 + (phase / (Math.PI * 2)) * 120) * scale * (1 + 0.08 * kick);
      paintRing(buf, width, height, cx, cy, radius, themeFromHue(t * 36 + i * 70), 32, 0.08);
    }
    const circles = (checksum.visualConfig && checksum.visualConfig.circles) || [];
    const n = Math.min(circles.length, 8);
    for (let i = 0; i < n; i++) {
      const freq = circles[i].frequency || 440;
      const ang = (i / n) * Math.PI * 2 + t * 0.5 + freq / 2000;
      const dist = (64 + Math.sin(t * 1.5 + i) * 22) * scale;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist * 0.82;
      const gold = kick > 0.2 && i === 0;
      stampFocusDisc(buf, width, height, x, y, 4 + (i % 3), gold ? THEME.gold : themeFromHue(t * 40 + i * 48), {
        rim: 1.2,
        glow: 3,
        glowAlpha: 0.2,
        rimColor: THEME.ink,
      });
    }
  }

  function ensureCosmos(checksum, width, height) {
    if (checksum.cosmos && checksum.cosmos.width === width && checksum.cosmos.height === height) {
      return checksum.cosmos;
    }
    const hash = (checksum.gematria && checksum.gematria.promptValue) || 1;
    const rng = mulberry32(hash ^ 0xc05a05);
    const particles = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x0: rng() * width,
        y0: rng() * height,
        vx: (rng() - 0.5) * 28,
        vy: (rng() - 0.5) * 22,
        size: 1.2 + rng() * 2.4,
        hue: rng() * 360,
        phase: rng() * Math.PI * 2,
      });
    }
    checksum.cosmos = { width, height, particles };
    return checksum.cosmos;
  }

  function wrap(v, lo, hi) {
    const span = hi - lo;
    let x = v;
    while (x < lo) x += span;
    while (x > hi) x -= span;
    return x;
  }

  /** ParticleAnimations — 80 motes, trails, constellations, kick shooting star. */
  function paintCosmos(buf, width, height, t, checksum) {
    const cosmos = ensureCosmos(checksum, width, height);
    const beat = beatPhase(checksum, t);
    const kick = kickAccent(beat);
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const seats = cosmos.particles.map((p) => ({
      x: wrap(p.x0 + p.vx * t + Math.sin(t * 1.5 + p.phase) * 16, -20, width + 20),
      y: wrap(p.y0 + p.vy * t + Math.cos(t * 1.3 + p.phase) * 12, -20, height + 20),
      p,
    }));

    let links = 0;
    for (let i = 0; i < seats.length && links < 48; i++) {
      for (let j = i + 1; j < seats.length && links < 48; j++) {
        const dx = seats[i].x - seats[j].x;
        const dy = seats[i].y - seats[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 110 * 110 || d2 < 36) continue;
        paintGlowLine(
          buf,
          width,
          height,
          seats[i].x,
          seats[i].y,
          seats[j].x,
          seats[j].y,
          themeFromHue((seats[i].p.hue + seats[j].p.hue) * 0.5),
          { glowAlpha: 0.08 },
        );
        links += 1;
      }
    }

    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      for (let k = 1; k <= 4; k++) {
        const u = t - k * 0.05;
        const tx = wrap(s.p.x0 + s.p.vx * u + Math.sin(u * 1.5 + s.p.phase) * 16, -20, width + 20);
        const ty = wrap(s.p.y0 + s.p.vy * u + Math.cos(u * 1.3 + s.p.phase) * 12, -20, height + 20);
        mixPixel(buf, width, tx, ty, themeFromHue(s.p.hue), 0.18 * (1 - k / 5));
      }
      stampFocusDisc(buf, width, height, s.x, s.y, s.p.size, themeFromHue(s.p.hue + t * 12), {
        rim: 1,
        glow: 2,
        glowAlpha: 0.16,
        rimColor: THEME.ink,
      });
    }

    if (kick > 0.2) {
      const hash = (checksum.gematria && checksum.gematria.checksumValue) || 1;
      const x0 = (hash % width) * 0.8 + 40;
      const y0 = 20;
      const x1 = x0 + 160;
      const y1 = height * 0.42;
      paintSharpLine(buf, width, height, x0, y0, x1, y1, THEME.gold, 1);
    }

    for (let ring = 0; ring < 3; ring++) {
      paintRing(
        buf,
        width,
        height,
        cx,
        cy,
        16 + ring * 10 + kick * 8,
        ring === 0 && kick > 0.15 ? THEME.gold : THEME.cyan,
        28,
        0.1,
      );
    }
  }

  return {
    ORGAN,
    paintMandala,
    paintSacredFlow,
    paintKuramoto,
    paintAuroraOrbs,
    paintCosmos,
    themeFromHue,
  };
}

module.exports = { createOrgans };
