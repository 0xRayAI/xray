/**
 * Headless ports of the five Rippel drawers at e5014cd.
 *   orb    InteractiveCanvas          — musical mandala + rings + motes
 *   swirl  ThreeJSVisualizer          — sacred-flow N-gons + depth circles + spirals
 *   snap   NeuralNetworkVisualizer    — Kuramoto clusters (deterministic closed form)
 *   waves  WaveformVisualizer         — aurora ripples + energy orbs (ribbons stay in parent)
 *   spark  ParticleAnimations         — cosmic particles + constellations + shooting star
 *
 * Wear the mill suit: Wu + paintSharpLine + stampFocusDisc + Power Plant triad +
 * hook→turn→tag phrase. Geo stays (petals / N-gons / synapse / cosmos / aurora).
 * Look follows the evolved mill bodies — not raw CAD. Mill mesh/cage lives in
 * blip-rippel.cjs (--body mill). These are --body rippel.
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
    phraseMix,
    iridesce,
    mulberry32,
    clamp,
  } = kit;

  const mix =
    typeof phraseMix === "function"
      ? phraseMix
      : (p, hookV, turnV, tagV) =>
          hookV * ((p && p.hookEase) || 0) +
          turnV * ((p && p.turnEase) || 0) +
          tagV * ((p && p.tagEase) || 0);

  function suitOf(checksum, t) {
    const beat = beatPhase(checksum, t);
    const phrase = phraseOf(checksum, t);
    return {
      beat,
      phrase,
      kick: kickAccent(beat),
      and: andAccent(beat),
      scale: mix(phrase, 0.86, 1.06 + 0.08 * (phrase.turnHit || 0), 0.72),
    };
  }

  /** Cyan disc + gold pupil — same nucleus the mill orb evolved. */
  function stampMillCore(buf, width, height, cx, cy, radius, kick) {
    stampFocusDisc(buf, width, height, cx, cy, radius * 1.08, THEME.cyan, {
      rim: 2.2,
      glow: 6,
      glowAlpha: 0.24,
      rimColor: THEME.ink,
    });
    stampFocusDisc(
      buf,
      width,
      height,
      cx,
      cy,
      radius * 0.4,
      kick > 0.15 ? THEME.gold : mixRgb(THEME.gold, THEME.cyan, 0.28),
      {
        rim: 1.6,
        glow: 3,
        glowAlpha: 0.22,
        rimColor: THEME.gold,
      },
    );
  }

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
    const n = Math.max(20, segs | 0);
    let px = cx + radius;
    let py = cy;
    for (let i = 1; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const x = cx + Math.cos(a) * radius;
      const y = cy + Math.sin(a) * radius;
      paintSharpLine(buf, width, height, px, py, x, y, color, 1);
      paintGlowLine(buf, width, height, px, py, x, y, color, { glowAlpha: alpha || 0.12 });
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
      paintGlowLine(buf, width, height, px, py, x, y, color, { glowAlpha: 0.12 });
      px = x;
      py = y;
    }
  }

  /** InteractiveCanvas — musical mandala, mill suit. Petals / rings / motes stay. */
  function paintMandala(buf, width, height, t, checksum) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const minSide = Math.min(width, height);
    const suit = suitOf(checksum, t);
    const { beat, kick, and, phrase, scale: phraseScale } = suit;
    const hash = (checksum.gematria && checksum.gematria.checksumValue) || 1;
    const spin = t * mix(phrase, 0.06, 0.14, 0.04) + beat * 0.07;

    stampMillCore(buf, width, height, cx, cy, minSide * 0.1 * phraseScale, kick);

    const layers = 3;
    for (let layer = 0; layer < layers; layer++) {
      const radius = (minSide * (0.16 + layer * 0.07)) * phraseScale;
      const petals = 6 + layer + (hash % 3);
      const rotation = spin + layer * 0.18;
      const color = iridesce(layer / Math.max(1, layers), t, beat, themeFromHue(t * 28 + layer * 40));
      paintPolygon(buf, width, height, cx, cy, radius, petals, rotation, color);
      if (layer === 1) {
        for (let i = 0; i < petals; i++) {
          const a0 = rotation + (i / petals) * Math.PI * 2;
          paintSharpLine(
            buf,
            width,
            height,
            cx + Math.cos(a0) * radius * 0.42,
            cy + Math.sin(a0) * radius * 0.42,
            cx + Math.cos(a0) * radius,
            cy + Math.sin(a0) * radius,
            color,
            1,
          );
          paintGlowLine(
            buf,
            width,
            height,
            cx + Math.cos(a0) * radius * 0.42,
            cy + Math.sin(a0) * radius * 0.42,
            cx + Math.cos(a0) * radius,
            cy + Math.sin(a0) * radius,
            color,
            { glowAlpha: 0.1 },
          );
        }
      }
    }

    paintRing(
      buf,
      width,
      height,
      cx,
      cy,
      minSide * 0.34 * phraseScale * (1 + 0.04 * kick),
      kick > 0.2 ? THEME.gold : THEME.cyan,
      40,
      0.1,
    );

    const motes = 8;
    const orbitMul = mix(phrase, 0.88, 1.08, 0.7);
    for (let i = 0; i < motes; i++) {
      const ang = (i / motes) * Math.PI * 2 + t * 0.22 + beat * 0.1;
      const dist = minSide * (0.22 + (i % 3) * 0.05) * orbitMul;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist * 0.72;
      const gold = kick > 0.15 && i % 4 === 0;
      stampFocusDisc(
        buf,
        width,
        height,
        x,
        y,
        9.5 + (i % 3) * 2.2,
        gold ? THEME.gold : iridesce(i / motes, t, beat, THEME.cyan),
        {
          rim: 1.6,
          glow: 4,
          glowAlpha: 0.22,
          rimColor: THEME.ink,
        },
      );
    }
  }

  /** ThreeJSVisualizer — sacred-flow N-gons + skip-links + mill-stroked spirals. */
  function paintSacredFlow(buf, width, height, t, checksum) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const minSide = Math.min(width, height);
    const suit = suitOf(checksum, t);
    const { beat, kick, phrase, scale: phraseScale } = suit;
    const hash = (checksum.gematria && checksum.gematria.checksumValue) || 1;

    const sides = 6 + ((hash >>> 2) % 3);
    const rotation = t * mix(phrase, 0.06, 0.13, 0.04) + beat * 0.05;
    const outer = minSide * 0.28 * phraseScale * (1 + 0.05 * kick);
    const inner = outer * 0.52;
    const outerColor = iridesce(0.2, t, beat, THEME.cyan);
    const innerColor = iridesce(0.7, t, beat, THEME.gold);
    paintPolygon(buf, width, height, cx, cy, outer, sides, rotation, outerColor);
    paintPolygon(buf, width, height, cx, cy, inner, sides + 1, -rotation * 0.8, innerColor);
    for (let i = 0; i < sides; i++) {
      const a = rotation + (i / sides) * Math.PI * 2;
      stampFocusDisc(
        buf,
        width,
        height,
        cx + Math.cos(a) * outer,
        cy + Math.sin(a) * outer,
        7.2 + (i % 2) + kick * 1.4,
        i === 0 && kick > 0.15 ? THEME.gold : outerColor,
        { rim: 1.4, glow: 3.2, glowAlpha: 0.2, rimColor: THEME.ink },
      );
    }
    for (let i = 0; i < sides; i += 2) {
      const a1 = rotation + (i / sides) * Math.PI * 2;
      const a2 = rotation + ((i + 3) / sides) * Math.PI * 2;
      const link = kick > 0.12 ? THEME.gold : outerColor;
      paintSharpLine(
        buf,
        width,
        height,
        cx + Math.cos(a1) * outer * 0.62,
        cy + Math.sin(a1) * outer * 0.62,
        cx + Math.cos(a2) * outer * 0.62,
        cy + Math.sin(a2) * outer * 0.62,
        link,
        1,
      );
      paintGlowLine(
        buf,
        width,
        height,
        cx + Math.cos(a1) * outer * 0.62,
        cy + Math.sin(a1) * outer * 0.62,
        cx + Math.cos(a2) * outer * 0.62,
        cy + Math.sin(a2) * outer * 0.62,
        link,
        { glowAlpha: 0.1 },
      );
    }

    const steps = 48;
    const turns = 2.1;
    const rot = t * mix(phrase, 0.22, 0.42, 0.12);
    const color = kick > 0.2 ? THEME.gold : themeFromHue(t * 32);
    let px = cx + Math.cos(rot) * (minSide * 0.04);
    let py = cy + Math.sin(rot) * (minSide * 0.04);
    for (let i = 1; i <= steps; i++) {
      const p = i / steps;
      const ang = p * turns * Math.PI * 2 + rot;
      const radius = (minSide * (0.05 + p * 0.26)) * phraseScale;
      const x = cx + Math.cos(ang) * radius;
      const y = cy + Math.sin(ang) * radius;
      paintSharpLine(buf, width, height, px, py, x, y, color, 1);
      paintGlowLine(buf, width, height, px, py, x, y, color, { glowAlpha: 0.1 });
      px = x;
      py = y;
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
        const d = 16 + rng() * 34;
        nodes.push({
          clusterId: c,
          ox: Math.cos(ang) * (width * 0.2) + Math.cos(a) * d,
          oy: Math.sin(ang) * (height * 0.2) + Math.sin(a) * d,
          orbit: 5 + rng() * 10,
          theta0: rng() * Math.PI * 2,
          naturalFreq: 0.012 + rng() * 0.01,
          hue: (c * 52 + rng() * 28) % 360,
          hub: i === 0,
          size: 6.8 + rng() * 3.2,
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
        size: 5.2 + rng() * 2.2,
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

  function seatSynapse(node, width, height, t, tempo, phrase) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const time = t * (tempo / 120);
    const rot = node.clusterId === -1 ? 0 : time * 0.045 * (tempo / 120);
    const clusterAng = node.clusterId === -1 ? 0 : (node.clusterId / 6) * Math.PI * 2 + rot;
    const breath =
      mix(phrase, 0.78, 1.08 + 0.06 * (phrase.turnHit || 0), 0.68) *
      (0.7 + 0.3 * (0.5 + 0.5 * Math.sin(time * 2.4 + (node.clusterId + 1) * 0.7)));
    const spread = node.clusterId === -1 ? mix(phrase, 0.86, 1.02, 0.74) : breath;
    const tx = cx + node.ox * spread + (node.clusterId === -1 ? 0 : Math.cos(clusterAng) * 8);
    const ty = cy + node.oy * spread + (node.clusterId === -1 ? 0 : Math.sin(clusterAng) * 8);
    const ang = node.theta0 + time * node.naturalFreq * 10;
    return {
      x: tx + Math.cos(ang) * node.orbit,
      y: ty + Math.sin(ang) * node.orbit,
    };
  }

  /** NeuralNetworkVisualizer — 50–73 Kuramoto nodes, mill discs, phrase breath. */
  function paintKuramoto(buf, width, height, t, checksum) {
    const net = ensureSynapse(checksum, width, height);
    const suit = suitOf(checksum, t);
    const { beat, kick, phrase } = suit;
    const tempo = (checksum.genreConfig && checksum.genreConfig.tempo) || 90;
    const seats = net.nodes.map((node) => seatSynapse(node, width, height, t, tempo, phrase));

    for (let i = 0; i < net.links.length; i++) {
      const [a, b] = net.links[i];
      const pa = seats[a];
      const pb = seats[b];
      if (!pa || !pb) continue;
      const hub = net.nodes[a].hub || net.nodes[b].hub;
      const color = iridesce((net.nodes[a].hue + net.nodes[b].hue) / 720, t, beat, THEME.cyan);
      if (hub) {
        paintSharpLine(buf, width, height, pa.x, pa.y, pb.x, pb.y, kick > 0.18 ? THEME.gold : color, 1);
      }
      paintGlowLine(buf, width, height, pa.x, pa.y, pb.x, pb.y, color, { glowAlpha: hub ? 0.14 : 0.1 });
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
        node.size + (node.hub ? 4.2 : 0) + kick * 1.1,
        gold ? THEME.gold : iridesce(node.hue / 360, t, beat, THEME.cyan),
        { rim: 1.5, glow: 3.4, glowAlpha: 0.22, rimColor: THEME.ink },
      );
    }

    const minSide = Math.min(width, height);
    const waveR = ((beat % 1) * minSide * 0.22 * mix(phrase, 0.9, 1.08, 0.7)) | 0;
    if (waveR > 28 && kick > 0.08) {
      paintRing(buf, width, height, (width - 1) * 0.5, (height - 1) * 0.5, waveR, THEME.cyan, 36, 0.08);
    }
  }

  /** WaveformVisualizer extras — aurora + mill orbs. Ribbons stay in the parent painter. */
  function paintAuroraOrbs(buf, width, height, t, checksum) {
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const minSide = Math.min(width, height);
    const suit = suitOf(checksum, t);
    const { beat, kick, phrase, scale: phraseScale } = suit;
    paintRing(
      buf,
      width,
      height,
      cx,
      cy,
      minSide * 0.18 * phraseScale * (1 + 0.08 * kick),
      kick > 0.18 ? THEME.gold : THEME.cyan,
      36,
      0.1,
    );
    const circles = (checksum.visualConfig && checksum.visualConfig.circles) || [];
    const n = Math.max(6, Math.min(circles.length, 8));
    const orbitMul = mix(phrase, 0.86, 1.08, 0.7);
    for (let i = 0; i < n; i++) {
      const freq = (circles[i] && circles[i].frequency) || 440 + i * 40;
      const ang = (i / n) * Math.PI * 2 + t * 0.5 + freq / 2000;
      const dist = minSide * (0.14 + (i % 3) * 0.04) * orbitMul;
      const x = cx + Math.cos(ang) * dist;
      const y = cy + Math.sin(ang) * dist * 0.72;
      const gold = kick > 0.2 && i % 4 === 0;
      stampFocusDisc(buf, width, height, x, y, 10.5 + (i % 3) * 2.4, gold ? THEME.gold : themeFromHue(t * 40 + i * 48), {
        rim: 1.6,
        glow: 4,
        glowAlpha: 0.22,
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
        size: 5.6 + rng() * 4.2,
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

  /** ParticleAnimations — 80 mill motes, sparse constellations, kick shooting star. */
  function paintCosmos(buf, width, height, t, checksum) {
    const cosmos = ensureCosmos(checksum, width, height);
    const suit = suitOf(checksum, t);
    const { beat, kick, phrase } = suit;
    const cx = (width - 1) * 0.5;
    const cy = (height - 1) * 0.5;
    const minSide = Math.min(width, height);
    const drift = mix(phrase, 0.78, 1.08, 0.64);
    const seats = cosmos.particles.map((p) => ({
      x: wrap(p.x0 + p.vx * t * drift + Math.sin(t * 1.5 + p.phase) * 16, -20, width + 20),
      y: wrap(p.y0 + p.vy * t * drift + Math.cos(t * 1.3 + p.phase) * 12, -20, height + 20),
      p,
    }));

    let links = 0;
    for (let i = 0; i < seats.length && links < 28; i++) {
      for (let j = i + 1; j < seats.length && links < 28; j++) {
        const dx = seats[i].x - seats[j].x;
        const dy = seats[i].y - seats[j].y;
        const d2 = dx * dx + dy * dy;
        if (d2 > 110 * 110 || d2 < 36) continue;
        const color = iridesce((seats[i].p.hue + seats[j].p.hue) / 720, t, beat, THEME.cyan);
        paintSharpLine(buf, width, height, seats[i].x, seats[i].y, seats[j].x, seats[j].y, color, 1);
        paintGlowLine(buf, width, height, seats[i].x, seats[i].y, seats[j].x, seats[j].y, color, { glowAlpha: 0.1 });
        links += 1;
      }
    }

    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      for (let k = 1; k <= 3; k++) {
        const u = t - k * 0.05;
        const tx = wrap(s.p.x0 + s.p.vx * u * drift + Math.sin(u * 1.5 + s.p.phase) * 16, -20, width + 20);
        const ty = wrap(s.p.y0 + s.p.vy * u * drift + Math.cos(u * 1.3 + s.p.phase) * 12, -20, height + 20);
        mixPixel(buf, width, tx, ty, themeFromHue(s.p.hue), 0.16 * (1 - k / 4));
      }
      const gold = kick > 0.18 && i % 11 === 0;
      stampFocusDisc(
        buf,
        width,
        height,
        s.x,
        s.y,
        s.p.size + kick * 0.6,
        gold ? THEME.gold : iridesce(s.p.hue / 360, t, beat, THEME.cyan),
        {
          rim: 1.4,
          glow: 3.4,
          glowAlpha: 0.22,
          rimColor: THEME.ink,
        },
      );
    }

    if (kick > 0.2) {
      const hash = (checksum.gematria && checksum.gematria.checksumValue) || 1;
      const x0 = (hash % width) * 0.8 + 40;
      const y0 = 20;
      const x1 = x0 + 160;
      const y1 = height * 0.42;
      paintSharpLine(buf, width, height, x0, y0, x1, y1, THEME.gold, 1);
      paintGlowLine(buf, width, height, x0, y0, x1, y1, THEME.gold, { glowAlpha: 0.14 });
    }

    stampMillCore(buf, width, height, cx, cy, minSide * 0.034 * mix(phrase, 0.9, 1.08, 0.72), kick);
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
