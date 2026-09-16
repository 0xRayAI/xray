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
 * Two axes, seed + flags. Both stay. All wear the mill stroke (Wu + Power Plant + short glow).
 *   --look focus|cage (orb). focus = cyan disc. cage = Wu hairline mesh + nucleus.
 *   --body mill|rippel. mill = evolved mesh/ribbons. rippel = refined drawers
 *     (mandala / sacred-flow / synapse / liquid-waves / cosmic-dance).
 * v2 motion: genre tempo + CircleConfig.frequency LFOs (same mill the audio bed uses).
 * 4.44s is a Short: hook → turn → tag on the same motion grid as the bed.
 * Phrase weights (hookEase/turnEase/tagEase) crossfade; binaries stay section flags.
 * Wireframe ffmpeg geometry lives in blip-render.cjs and is flag-only.
 */

const soundRippel = require("./sound-rippel.cjs");
const { createOrgans } = require("./blip-rippel-organs.cjs");

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
    "InteractiveCanvas.tsx",
    "ThreeJSVisualizer.tsx",
    "NeuralNetworkVisualizer.tsx",
    "WaveformVisualizer.tsx",
    "ParticleAnimations.tsx",
    "MiniAnimationViewer",
    "FiveDimensionalVisualizer",
  ],
  note: "Rippel v2 — look focus|cage and body mill|rippel. Mill keeps the evolved Wu/mesh. Rippel drawers are refined to that stroke. Soft tints, no photosensitive strobe. Wireframe is flag-only.",
};

const GRID_KINDS = ["floor", "none"];
const GRAD_KINDS = ["horizon", "corner", "veil"];

const MESH_FAMILIES = [
  "tetra",
  "octa",
  "cube",
  "prism",
  "star",
  "cage",
  "spire",
  "icosa",
  "helix",
  "torus",
  "lattice",
  "flower",
];
const MESH_GAITS = ["tumble", "shear", "pulse", "orbit", "snap"];
const CORE_STYLES = ["disc", "eclipse", "pulse"];
const LOOK_KINDS = ["focus", "cage"];
const BODY_KINDS = ["mill", "rippel"];
const GENRE_KINDS = ["ambient", "techno", "phonk", "jazz", "rock", "timeless"];

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
const LIGHT_CYCLE = [THEME.cyan, THEME.gold, THEME.blue];

/** getGenreConfig.ts scale tables — same SSOT the sound mill already ported. */
const SCALES = {
  ambient: [261.63, 311.13, 349.23, 392.0, 466.16, 196.0, 220.0, 246.94, 293.66, 329.63, 415.3, 207.65, 196.0, 155.56],
  techno: [65.41, 87.31, 130.81, 174.61, 196.0],
  phonk: [32.7, 43.65, 55.0, 65.41, 82.41],
  jazz: [130.81, 164.81, 196.0, 220.0, 261.63],
  rock: [329.63, 392.0, 440.0, 493.88, 587.33],
  timeless: [261.63, 311.13, 349.23, 392.0, 466.16, 65.41],
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

function norm3(x, y, z) {
  const len = Math.hypot(x, y, z) || 1;
  return [x / len, y / len, z / len];
}

function kNearestEdges(verts, k) {
  const edges = [];
  const seen = new Set();
  for (let i = 0; i < verts.length; i++) {
    const dist = [];
    for (let j = 0; j < verts.length; j++) {
      if (j === i) continue;
      const dx = verts[i][0] - verts[j][0];
      const dy = verts[i][1] - verts[j][1];
      const dz = verts[i][2] - verts[j][2];
      dist.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dist.sort((p, q) => p.d - q.d);
    for (let n = 0; n < k && n < dist.length; n++) {
      const a = i < dist[n].j ? i : dist[n].j;
      const b = i < dist[n].j ? dist[n].j : i;
      const key = `${a}-${b}`;
      if (!seen.has(key)) {
        seen.add(key);
        edges.push([a, b]);
      }
    }
  }
  return edges;
}

function trianglesFromEdges(verts, edges) {
  const adj = verts.map(() => []);
  for (let i = 0; i < edges.length; i++) {
    const a = edges[i][0];
    const b = edges[i][1];
    adj[a].push(b);
    adj[b].push(a);
  }
  const faces = [];
  const seen = new Set();
  for (let a = 0; a < verts.length; a++) {
    for (let bi = 0; bi < adj[a].length; bi++) {
      const b = adj[a][bi];
      if (b <= a) continue;
      for (let ci = 0; ci < adj[a].length; ci++) {
        const c = adj[a][ci];
        if (c <= b) continue;
        if (!adj[b].includes(c)) continue;
        const key = `${a}-${b}-${c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        faces.push([a, b, c]);
      }
    }
  }
  return faces;
}

function platonic(family) {
  if (family === "tetra") {
    return {
      verts: [
        [1, 1, 1],
        [1, -1, -1],
        [-1, 1, -1],
        [-1, -1, 1],
      ].map((v) => norm3(v[0], v[1], v[2])),
      edges: [
        [0, 1],
        [0, 2],
        [0, 3],
        [1, 2],
        [1, 3],
        [2, 3],
      ],
      faces: [
        [0, 1, 2],
        [0, 1, 3],
        [0, 2, 3],
        [1, 2, 3],
      ],
    };
  }
  if (family === "octa") {
    return {
      verts: [
        [1, 0, 0],
        [-1, 0, 0],
        [0, 1, 0],
        [0, -1, 0],
        [0, 0, 1],
        [0, 0, -1],
      ],
      edges: [
        [0, 2],
        [0, 3],
        [0, 4],
        [0, 5],
        [1, 2],
        [1, 3],
        [1, 4],
        [1, 5],
        [2, 4],
        [2, 5],
        [3, 4],
        [3, 5],
      ],
      faces: [
        [0, 2, 4],
        [0, 4, 3],
        [0, 3, 5],
        [0, 5, 2],
        [1, 2, 5],
        [1, 5, 3],
        [1, 3, 4],
        [1, 4, 2],
      ],
    };
  }
  if (family === "cube") {
    const verts = [];
    for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) verts.push(norm3(x, y, z));
    const edges = [];
    for (let i = 0; i < 8; i++) {
      for (let j = i + 1; j < 8; j++) {
        let d = 0;
        for (let k = 0; k < 3; k++) if (verts[i][k] !== verts[j][k]) d += 1;
        if (d === 1) edges.push([i, j]);
      }
    }
    return { verts, edges, faces: trianglesFromEdges(verts, edges) };
  }
  if (family === "prism") {
    const verts = [];
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      verts.push(norm3(Math.cos(a), Math.sin(a), 0.7));
      verts.push(norm3(Math.cos(a), Math.sin(a), -0.7));
    }
    return {
      verts,
      edges: [
        [0, 2],
        [2, 4],
        [4, 0],
        [1, 3],
        [3, 5],
        [5, 1],
        [0, 1],
        [2, 3],
        [4, 5],
      ],
      faces: [
        [0, 2, 4],
        [1, 3, 5],
        [0, 1, 2],
        [2, 1, 3],
        [2, 3, 4],
        [4, 3, 5],
        [4, 5, 0],
        [0, 5, 1],
      ],
    };
  }
  if (family === "star") {
    const a = platonic("tetra");
    const verts = a.verts.concat(a.verts.map((v) => [-v[0], -v[1], -v[2]]));
    const edges = a.edges.concat(a.edges.map((e) => [e[0] + 4, e[1] + 4]));
    const faces = (a.faces || []).concat((a.faces || []).map((f) => [f[0] + 4, f[1] + 4, f[2] + 4]));
    return { verts, edges, faces };
  }
  if (family === "spire") {
    const verts = [[0, 0, 1], [0, 0, -0.35]];
    const edges = [[0, 1]];
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5;
      verts.push(norm3(Math.cos(a) * 0.95, Math.sin(a) * 0.95, -0.2));
      edges.push([0, i + 2], [1, i + 2], [i + 2, 2 + ((i + 1) % 5)]);
    }
    return { verts, edges };
  }
  if (family === "icosa") {
    const phi = (1 + Math.sqrt(5)) / 2;
    const raw = [
      [0, 1, phi],
      [0, 1, -phi],
      [0, -1, phi],
      [0, -1, -phi],
      [1, phi, 0],
      [1, -phi, 0],
      [-1, phi, 0],
      [-1, -phi, 0],
      [phi, 0, 1],
      [phi, 0, -1],
      [-phi, 0, 1],
      [-phi, 0, -1],
    ].map((v) => norm3(v[0], v[1], v[2]));
    const edges = kNearestEdges(raw, 5);
    return { verts: raw, edges, faces: trianglesFromEdges(raw, edges) };
  }
  if (family === "helix") {
    const verts = [];
    const edges = [];
    const n = 10;
    for (let i = 0; i < n; i++) {
      const a = i * 0.82;
      const y = (i / (n - 1)) * 2 - 1;
      verts.push(norm3(Math.cos(a) * 0.92, y, Math.sin(a) * 0.92));
      if (i > 0) edges.push([i - 1, i]);
      if (i > 1) edges.push([i - 2, i]);
    }
    edges.push([0, n - 1], [0, n - 2]);
    return { verts, edges, faces: trianglesFromEdges(verts, edges) };
  }
  if (family === "torus") {
    const verts = [];
    const rings = 7;
    const tube = 4;
    const R = 0.78;
    const r = 0.34;
    for (let i = 0; i < rings; i++) {
      const u = (i * Math.PI * 2) / rings;
      for (let j = 0; j < tube; j++) {
        const v = (j * Math.PI * 2) / tube;
        verts.push(
          norm3(
            (R + r * Math.cos(v)) * Math.cos(u),
            r * Math.sin(v),
            (R + r * Math.cos(v)) * Math.sin(u),
          ),
        );
      }
    }
    const edges = [];
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < tube; j++) {
        const a = i * tube + j;
        edges.push([a, i * tube + ((j + 1) % tube)]);
        edges.push([a, ((i + 1) % rings) * tube + j]);
      }
    }
    return { verts, edges, faces: trianglesFromEdges(verts, edges).slice(0, 36) };
  }
  if (family === "lattice") {
    const verts = [];
    const idx = new Map();
    const vals = [-0.72, 0, 0.72];
    for (let i = 0; i < vals.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        for (let k = 0; k < vals.length; k++) {
          idx.set(`${i},${j},${k}`, verts.length);
          verts.push(norm3(vals[i], vals[j], vals[k]));
        }
      }
    }
    const edges = [];
    for (let i = 0; i < vals.length; i++) {
      for (let j = 0; j < vals.length; j++) {
        for (let k = 0; k < vals.length; k++) {
          const a = idx.get(`${i},${j},${k}`);
          if (i + 1 < vals.length) edges.push([a, idx.get(`${i + 1},${j},${k}`)]);
          if (j + 1 < vals.length) edges.push([a, idx.get(`${i},${j + 1},${k}`)]);
          if (k + 1 < vals.length) edges.push([a, idx.get(`${i},${j},${k + 1}`)]);
        }
      }
    }
    return { verts, edges, faces: trianglesFromEdges(verts, edges).slice(0, 36) };
  }
  if (family === "flower") {
    const verts = [[0, 0, 0.15]];
    const edges = [];
    for (let ring = 0; ring < 2; ring++) {
      const z = ring === 0 ? 0.2 : -0.28;
      const rad = ring === 0 ? 0.62 : 1;
      for (let i = 0; i < 7; i++) {
        const a = (i * Math.PI * 2) / 7 + ring * 0.22;
        verts.push(norm3(Math.cos(a) * rad, Math.sin(a) * rad, z));
        const vi = verts.length - 1;
        edges.push([0, vi]);
        if (i > 0) edges.push([vi - 1, vi]);
        if (i === 6) edges.push([vi, 1 + ring * 7]);
      }
    }
    for (let i = 0; i < 7; i++) edges.push([1 + i, 8 + i]);
    return { verts, edges, faces: trianglesFromEdges(verts, edges) };
  }
  const verts = [];
  const n = 8;
  const phi = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const a = phi * i;
    verts.push(norm3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  const edges = [];
  for (let i = 0; i < n; i++) {
    const dist = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = verts[i][0] - verts[j][0];
      const dy = verts[i][1] - verts[j][1];
      const dz = verts[i][2] - verts[j][2];
      dist.push({ j, d: dx * dx + dy * dy + dz * dz });
    }
    dist.sort((p, q) => p.d - q.d);
    for (let k = 0; k < 3; k++) {
      const j = dist[k].j;
      const a = i < j ? i : j;
      const b = i < j ? j : i;
      if (!edges.some((e) => e[0] === a && e[1] === b)) edges.push([a, b]);
    }
  }
  return { verts, edges, faces: trianglesFromEdges(verts, edges) };
}

function thinConnectedEdges(edges, vertCount, keep, rng) {
  if (edges.length <= keep) return edges.map((e) => [e[0], e[1]]);
  const adj = Array.from({ length: vertCount }, () => []);
  for (let i = 0; i < edges.length; i++) {
    adj[edges[i][0]].push(edges[i][1]);
    adj[edges[i][1]].push(edges[i][0]);
  }
  const start = (rng() * vertCount) | 0;
  const seen = new Set([start]);
  const kept = [];
  const q = [start];
  while (q.length && kept.length < keep) {
    const v = q.shift();
    const nbrs = adj[v];
    for (let i = 0; i < nbrs.length && kept.length < keep; i++) {
      const w = nbrs[i];
      if (seen.has(w)) continue;
      seen.add(w);
      q.push(w);
      kept.push(v < w ? [v, w] : [w, v]);
    }
  }
  for (let i = 0; i < edges.length && kept.length < keep; i++) {
    const a = edges[i][0];
    const b = edges[i][1];
    if (!kept.some((e) => e[0] === a && e[1] === b)) kept.push([a, b]);
  }
  return kept;
}

function buildMesh(seedHex, brief) {
  const text = String(brief || "factory-blip");
  let mix = 0;
  for (let i = 0; i < text.length; i++) mix = (Math.imul(mix, 33) + text.charCodeAt(i)) >>> 0;
  const rng = mulberry32(seedU32(seedHex, 0) ^ seedU32(seedHex, 8) ^ seedU32(seedHex, 16) ^ mix);
  const family = MESH_FAMILIES[(rng() * MESH_FAMILIES.length) | 0];
  const gait = MESH_GAITS[(rng() * MESH_GAITS.length) | 0];
  const base = platonic(family);
  const jitter = 0.05 + rng() * 0.16;
  const verts = base.verts.map((v) =>
    norm3(v[0] + (rng() - 0.5) * jitter, v[1] + (rng() - 0.5) * jitter, v[2] + (rng() - 0.5) * jitter),
  );
  let edges = base.edges.map((e) => [e[0], e[1]]);
  const extra = (rng() * 3) | 0;
  for (let i = 0; i < extra; i++) {
    const a = (rng() * verts.length) | 0;
    const b = (rng() * verts.length) | 0;
    if (a === b) continue;
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    if (!edges.some((e) => e[0] === lo && e[1] === hi)) edges.push([lo, hi]);
  }
  if (edges.length > 16) {
    edges = thinConnectedEdges(edges, verts.length, 10 + ((rng() * 6) | 0), rng);
  }
  let faces = (base.faces && base.faces.length ? base.faces : trianglesFromEdges(verts, edges)).map((f) => [
    f[0],
    f[1],
    f[2],
  ]);
  if (faces.length > 16) faces = faces.slice(0, 16);
  const accentIndex = (rng() * THEME_CYCLE.length) | 0;
  const coreStyle = CORE_STYLES[(rng() * CORE_STYLES.length) | 0];
  return {
    family,
    gait,
    coreStyle,
    id: `${family}-${gait}-${verts.length}v${edges.length}e${faces.length}f-${((rng() * 0xfffffff) | 0).toString(16)}`,
    verts,
    edges,
    faces,
    twist: rng() * Math.PI * 2,
    spin: 1.7 + rng() * 2.4,
    scale: 0.58 + rng() * 0.2,
    warp: 0.06 + rng() * 0.14,
    shells: 1,
    cuts: 3 + ((rng() * 3) | 0),
    dual: false,
    ghost: false,
    fill: false,
    accentIndex,
    accent: THEME_CYCLE[accentIndex],
  };
}

function buildField(seedHex, brief) {
  const text = String(brief || "factory-blip");
  let mix = 1;
  for (let i = 0; i < text.length; i++) mix = (Math.imul(mix, 31) + text.charCodeAt(i)) >>> 0;
  const rng = mulberry32(seedU32(seedHex, 4) ^ seedU32(seedHex, 12) ^ mix ^ 0x51ed);
  const stars = [];
  const want = 16 + ((rng() * 14) | 0);
  for (let i = 0; i < want * 3 && stars.length < want; i++) {
    const x = rng();
    const y = rng();
    if (Math.hypot(x - 0.5, (y - 0.5) * 0.72) < 0.2) continue;
    stars.push({
      x,
      y,
      r: 1.4 + rng() * 1.8,
      color: THEME_CYCLE[(rng() * THEME_CYCLE.length) | 0],
      phase: rng() * Math.PI * 2,
      sparkle: rng() > 0.55,
    });
  }
  const blinkers = [];
  const blinkWant = 3 + ((rng() * 5) | 0);
  for (let i = 0; i < blinkWant; i++) {
    blinkers.push({
      x: rng() < 0.5 ? 0.06 + rng() * 0.16 : 0.78 + rng() * 0.16,
      y: rng() < 0.5 ? 0.07 + rng() * 0.18 : 0.72 + rng() * 0.2,
      color: THEME_CYCLE[(rng() * 3) | 0],
      onAnd: rng() > 0.42,
    });
  }
  return {
    id: `field-${stars.length}s${blinkers.length}b-${((rng() * 0xfffff) | 0).toString(16)}`,
    stars,
    blinkers,
    grid: GRID_KINDS[(rng() * GRID_KINDS.length) | 0],
    gradient: GRAD_KINDS[(rng() * GRAD_KINDS.length) | 0],
    gridColor: THEME_CYCLE[(rng() * 3) | 0],
    gradColor: THEME_CYCLE[(rng() * 3) | 0],
    gradStrength: 0.22 + rng() * 0.16,
  };
}

function rotate3(v, yaw, pitch, roll) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = v[0] * cy + v[2] * sy;
  const z1 = -v[0] * sy + v[2] * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const y2 = v[1] * cp - z1 * sp;
  const z2 = v[1] * sp + z1 * cp;
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  return [x1 * cr - y2 * sr, x1 * sr + y2 * cr, z2];
}

function projectMesh(mesh, width, height, t, checksum, scaleMul) {
  const gait = mesh.gait || "tumble";
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const and = andAccent(beat);
  const phrase = phraseOf(checksum, t);
  const spinMul = phraseMix(phrase, 0.28, 1.32 + 0.7 * (phrase.turnHit || 0), 0.16);
  let yaw = t * mesh.spin * spinMul + mesh.twist;
  let pitch = Math.sin(t * mesh.spin * 0.42 * spinMul + mesh.twist) * 0.52;
  let roll = t * 0.38 * spinMul + mesh.twist * 0.25;
  let breathe =
    (scaleMul || 1) *
    mesh.scale *
    (1 + 0.07 * kick + 0.045 * and) *
    phraseMix(phrase, 0.88, 1.16 + 0.12 * phrase.turnHit, 0.96);
  yaw += phrase.turnHit * 0.55;
  let ox = 0;
  let oy = 0;
  if (gait === "snap") {
    const q = Math.floor(beat + (phrase.turnHit || 0) * 0.8);
    yaw = q * 1.15 + mesh.twist + (phrase.turnHit || 0) * 0.7;
    pitch = Math.sin(q * 1.7 + mesh.twist) * 0.46;
    roll = q * 0.55 + mesh.twist * 0.3;
  } else if (gait === "pulse") {
    breathe *= 1 + mesh.warp * (kick + and * 0.65);
  } else if (gait === "orbit") {
    ox = Math.cos(beat * Math.PI * 2 + mesh.twist) * mesh.warp * 0.42;
    oy = Math.sin(beat * Math.PI + mesh.twist) * mesh.warp * 0.26;
  } else if (gait === "tumble") {
    yaw = beat * mesh.spin * spinMul + mesh.twist;
    pitch = beat * mesh.spin * 0.38 * spinMul + Math.sin(mesh.twist) * 0.2;
    roll = beat * mesh.spin * 0.22 * spinMul + mesh.twist;
  }
  const minSide = Math.min(width, height);
  const cx = (width - 1) * 0.5 + ox * minSide;
  const cy = (height - 1) * 0.5 + oy * minSide;
  const shear = gait === "shear";
  return mesh.verts.map((v) => {
    let r = rotate3(v, yaw, pitch, roll);
    if (shear) {
      r = [
        r[0] + r[1] * Math.sin(beat * Math.PI * 2 + mesh.twist) * mesh.warp * 1.55,
        r[1] + r[2] * Math.cos(beat * Math.PI * 1.4) * mesh.warp,
        r[2],
      ];
    }
    const z = r[2] + 2.35;
    const p = (breathe * minSide) / z;
    return { x: cx + r[0] * p, y: cy + r[1] * p * 0.84, z: r[2] };
  });
}

/**
 * Checksum TLM → VisualConfig. Mirrors types/index.ts ChecksumResponse.visualConfig.
 * Sequence notes + genre frequencies become CircleConfig[] (note, frequency, radius, color).
 */
function resolveLookKind(opts) {
  const raw = opts && opts.lookKind;
  if (raw) {
    if (!LOOK_KINDS.includes(raw)) {
      const err = new Error(`unknown look "${raw}" (want ${LOOK_KINDS.join("|")})`);
      err.code = "BLIP_LOOK";
      throw err;
    }
    return raw;
  }
  return LOOK_KINDS[seedU32(opts && opts.seedHex, 0) % LOOK_KINDS.length];
}

function resolveGenreKind(opts) {
  const raw = opts && opts.genre;
  if (raw != null && String(raw).trim()) {
    const trimmed = String(raw).trim().toLowerCase();
    const aliased = soundRippel.GENRE_ALIASES[trimmed];
    if (aliased) return aliased;
    if (GENRE_KINDS.includes(trimmed)) return trimmed;
    const err = new Error(`unknown genre "${raw}" (want ${GENRE_KINDS.join("|")})`);
    err.code = "BLIP_GENRE";
    throw err;
  }
  return GENRE_KINDS[seedU32(opts && opts.seedHex, 24) % GENRE_KINDS.length];
}

function resolveBodyKind(opts) {
  const raw = opts && opts.bodyKind;
  if (raw) {
    if (!BODY_KINDS.includes(raw)) {
      const err = new Error(`unknown body "${raw}" (want ${BODY_KINDS.join("|")})`);
      err.code = "BLIP_BODY";
      throw err;
    }
    return raw;
  }
  return BODY_KINDS[seedU32(opts && opts.seedHex, 16) % BODY_KINDS.length];
}

function organOf(visualization, lookKind, bodyKind) {
  if (visualization === "canvas") {
    if (lookKind === "focus") return "focus";
    return bodyKind === "rippel" ? "mandala" : "cage";
  }
  if (visualization === "3d-sacred") return bodyKind === "rippel" ? "sacred-flow" : "mesh";
  if (visualization === "neural") return bodyKind === "rippel" ? "synapse" : "strike";
  if (visualization === "waveform") return bodyKind === "rippel" ? "liquid-waves" : "ribbons";
  if (visualization === "particles") return bodyKind === "rippel" ? "cosmic-dance" : "embers";
  return visualization;
}

function buildVisualConfig({ brief, seedHex, genre, width, height, lookKind, bodyKind }) {
  const g = soundRippel.resolveGenre(resolveGenreKind({ seedHex, genre }));
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
      phase0: 0,
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
    lookKind: resolveLookKind({ seedHex, lookKind }),
    bodyKind: resolveBodyKind({ seedHex, bodyKind }),
    genre: g.id,
    mesh: buildMesh(seedHex, text),
    field: buildField(seedHex, text),
  };
}

function cachedChecksum(opts) {
  const lookKind = resolveLookKind(opts);
  const bodyKind = resolveBodyKind(opts);
  const genre = resolveGenreKind(opts);
  const key = `${opts.seedHex || ""}::${opts.brief || ""}::${genre}::${opts.width || MOTION_WIDTH}x${opts.height || MOTION_HEIGHT}::${lookKind}::${bodyKind}`;
  let hit = visualCache.get(key);
  if (!hit) {
    hit = buildVisualConfig({ ...opts, lookKind, bodyKind, genre });
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
  const phase0 = (checksum.genreConfig && checksum.genreConfig.phase0) || 0;
  return (t * bpm) / 60 + phase0;
}

/** Soft kick swell — scale only, never a full-field color gate (photosensitive). */
function kickAccent(beat) {
  const frac = beat - Math.floor(beat);
  if (frac < 0.12) return 0.55 * (1 - frac / 0.12);
  if (frac < 0.28) return 0.18 * (1 - (frac - 0.12) / 0.16);
  return 0;
}

/** Off-beat (the AND) — same grid as the bed hat/cowbell. Scale only. */
function andAccent(beat) {
  const frac = beat - Math.floor(beat);
  const d = Math.abs(frac - 0.5);
  if (d < 0.1) return 0.45 * (1 - d / 0.1);
  return 0;
}

function phraseOf(checksum, t) {
  const tempo = (checksum && checksum.genreConfig && checksum.genreConfig.tempo) || 90;
  const seconds =
    (checksum &&
      checksum.visualConfig &&
      checksum.visualConfig.canvas &&
      checksum.visualConfig.canvas.duration) ||
    4.44;
  return soundRippel.shortformPhrase(t, seconds, { beatSec: 60 / tempo });
}

function phraseWeight(phrase, key) {
  const ease = phrase && phrase[`${key}Ease`];
  if (typeof ease === "number") return ease;
  return (phrase && phrase[key]) || 0;
}

function phraseMix(phrase, hookV, turnV, tagV) {
  return (
    hookV * phraseWeight(phrase, "hook") +
    turnV * phraseWeight(phrase, "turn") +
    tagV * phraseWeight(phrase, "tag")
  );
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

function fillTri(buf, width, height, a, b, c, color, alpha) {
  if (alpha <= 0) return;
  const minX = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x)));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
  const minY = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y)));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
  if (maxX - minX > 420 || maxY - minY > 320) return;
  const area = (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y);
  if (Math.abs(area) < 8) return;
  const a0 = alpha * (area > 0 ? 1 : 0.38);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const w0 = (b.x - x) * (c.y - y) - (c.x - x) * (b.y - y);
      const w1 = (c.x - x) * (a.y - y) - (a.x - x) * (c.y - y);
      const w2 = (a.x - x) * (b.y - y) - (b.x - x) * (a.y - y);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) {
        mixPixel(buf, width, x, y, color, a0);
      }
    }
  }
}

function meshAccent(mesh, t) {
  const cuts = mesh.cuts || 3;
  const phase = ((t / 4.44) * cuts + (mesh.accentIndex || 0)) % LIGHT_CYCLE.length;
  const i = phase | 0;
  return mixRgb(LIGHT_CYCLE[i], LIGHT_CYCLE[(i + 1) % LIGHT_CYCLE.length], phase - i);
}

function iridesce(u, t, beat, accent) {
  const cycle = [THEME.cyan, accent || THEME.gold, THEME.gold, THEME.blue];
  const phase = ((u * 0.94 + beat * 0.06 + t * 0.035) % 1 + 1) % 1;
  const p = phase * (cycle.length - 1);
  const i = p | 0;
  const f = p - i;
  return mixRgb(cycle[i], cycle[i + 1] || cycle[cycle.length - 1], f);
}

function livingShade(mesh, t, u, beat, bias) {
  const c = iridesce(u, t, beat, meshAccent(mesh, t));
  return bias ? mixRgb(c, bias, 0.08) : c;
}

/** Hairline Wu stroke: 1px core, coverage AA as the only glow. Gradient via shader(u). */
function paintGlowLine(buf, width, height, x0, y0, x1, y1, color, opts) {
  const shader = opts && opts.shader;
  const glowA = opts && opts.glowAlpha != null ? opts.glowAlpha : 0.08;
  let ax = x0;
  let ay = y0;
  let bx = x1;
  let by = y1;
  const steep = Math.abs(by - ay) > Math.abs(bx - ax);
  if (steep) {
    const sx = ax;
    ax = ay;
    ay = sx;
    const ex = bx;
    bx = by;
    by = ex;
  }
  if (ax > bx) {
    const sx = ax;
    ax = bx;
    bx = sx;
    const sy = ay;
    ay = by;
    by = sy;
  }
  const wdx = bx - ax;
  const wdy = by - ay;
  const grad = wdx === 0 ? 0 : wdy / wdx;
  function plot(px, py, a, u) {
    if (a <= 0.03) return;
    const c = shader ? shader(u) : color;
    if (steep) mixPixel(buf, width, py, px, c, a);
    else mixPixel(buf, width, px, py, c, a);
  }
  let y = ay;
  const x0i = Math.round(ax);
  const x1i = Math.round(bx);
  const span = x1i - x0i || 1;
  for (let x = x0i; x <= x1i; x++) {
    const u = (x - x0i) / span;
    const yi = Math.floor(y);
    const f = y - yi;
    plot(x, yi, 1, u);
    plot(x, yi + 1, f * 0.35 + glowA, u);
    y += grad;
  }
}

function paintMeshFaces(buf, width, height, mesh, pts, color, alpha, t, checksum) {
  if (!mesh.faces || !mesh.faces.length || alpha <= 0) return;
  const wash = color || THEME.cyan;
  const ranked = mesh.faces
    .map((f) => {
      const a = pts[f[0]];
      const b = pts[f[1]];
      const c = pts[f[2]];
      if (!a || !b || !c) return null;
      return { a, b, c, z: (a.z + b.z + c.z) / 3 };
    })
    .filter(Boolean)
    .sort((p, q) => p.z - q.z);
  const beat = beatPhase(checksum || { genreConfig: { tempo: 90 } }, t || 0);
  for (let i = 0; i < ranked.length; i++) {
    const jewel = iridesce(i / Math.max(1, ranked.length), t || 0, beat, THEME.gold);
    fillTri(buf, width, height, ranked[i].a, ranked[i].b, ranked[i].c, mixRgb(jewel, wash, 0.28), alpha);
  }
}

function paintMesh(buf, width, height, mesh, pts, color, half, opts) {
  const t = (opts && opts.t) || 0;
  const checksum = (opts && opts.checksum) || { genreConfig: { tempo: 90 } };
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const and = andAccent(beat);
  const fillA = opts && opts.fill != null ? opts.fill : 0;
  if (fillA > 0) paintMeshFaces(buf, width, height, mesh, pts, color, fillA, t, checksum);
  const ranked = mesh.edges
    .map((e, i) => ({ e, i, z: (pts[e[0]].z + pts[e[1]].z) * 0.5 }))
    .sort((a, b) => a.z - b.z);
  for (let i = 0; i < ranked.length; i++) {
    const [a, b] = ranked[i].e;
    const bias = color || null;
    paintGlowLine(buf, width, height, pts[a].x, pts[a].y, pts[b].x, pts[b].y, THEME.cyan, {
      glowAlpha: 0.07 + 0.03 * kick,
      shader: (u) => livingShade(mesh, t, u, beat, bias),
    });
  }
  if (ranked.length) {
    const hot = ranked[0];
    const [a, b] = hot.e;
    const life = (beat * 0.7 + mesh.twist) % 1;
    mixPixel(
      buf,
      width,
      pts[a].x + (pts[b].x - pts[a].x) * life,
      pts[a].y + (pts[b].y - pts[a].y) * life,
      livingShade(mesh, t, life, beat, THEME.gold),
      0.85 + 0.15 * and,
    );
  }
}

function paintChecksumMesh(buf, width, height, t, checksum, opts) {
  const mesh = checksum.mesh;
  if (!mesh) return null;
  const scale = (opts && opts.scale) || 1;
  const half = (opts && opts.half) || 1;
  const pts = projectMesh(mesh, width, height, t, checksum, scale);
  paintMesh(buf, width, height, mesh, pts, opts && opts.color, half, {
    fill: opts && opts.fill != null ? opts.fill : 0,
    t,
    checksum,
  });
  return { mesh, pts, dual: null };
}

function paintMeshOverlay(buf, width, height, opts) {
  const checksum = cachedChecksum({
    brief: opts.brief,
    seedHex: opts.seedHex,
    genre: opts.genre,
    width,
    height,
    lookKind: opts.lookKind,
    bodyKind: opts.bodyKind,
  });
  paintField(buf, width, height, opts.t || 0, checksum);
  return paintChecksumMesh(buf, width, height, opts.t || 0, checksum, {
    scale: 0.72,
    half: 1,
  });
}

function paintGradient(buf, width, height, field, t) {
  const aCol = field.gradColor || THEME.blue;
  const bCol = mixRgb(THEME.gold, THEME.cyan, 0.45 + 0.2 * Math.sin((t || 0) * 0.7));
  const s = field.gradStrength || 0.2;
  if (field.gradient === "horizon") {
    const y0 = (height * 0.58) | 0;
    for (let y = y0; y < height; y++) {
      const u = (y - y0) / Math.max(1, height - y0);
      const c = mixRgb(aCol, bCol, u);
      const a = s * (0.35 + 0.65 * u);
      for (let x = 0; x < width; x += 1) mixPixel(buf, width, x, y, c, a);
    }
    return;
  }
  if (field.gradient === "corner") {
    const cx = field.stars[0] ? field.stars[0].x * width : width * 0.12;
    const cy = field.stars[0] ? field.stars[0].y * height : height * 0.18;
    const reach = Math.min(width, height) * 0.72;
    const x0 = Math.max(0, (cx - reach) | 0);
    const x1 = Math.min(width - 1, (cx + reach) | 0);
    const y0 = Math.max(0, (cy - reach) | 0);
    const y1 = Math.min(height - 1, (cy + reach) | 0);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / reach;
        if (d >= 1) continue;
        const fade = (1 - d) * (1 - d);
        mixPixel(buf, width, x, y, mixRgb(aCol, bCol, fade), s * fade);
      }
    }
    return;
  }
  const y1 = (height * 0.28) | 0;
  for (let y = 0; y < y1; y++) {
    const u = 1 - y / y1;
    const c = mixRgb(THEME.cyan, aCol, 0.35 + 0.4 * u);
    for (let x = 0; x < width; x += 1) mixPixel(buf, width, x, y, c, s * u);
  }
}

function paintGrid(buf, width, height, field, t, checksum) {
  if (!field.grid || field.grid === "none" || field.grid === "ticks" || field.grid === "meridian") {
    return;
  }
  const beat = beatPhase(checksum || { genreConfig: { tempo: 90 } }, t || 0);
  const accent = field.gridColor || THEME.cyan;
  const line = (x0, y0, x1, y1) =>
    paintGlowLine(buf, width, height, x0, y0, x1, y1, accent, {
      glowAlpha: 0.07,
      shader: (u) => iridesce(u, t || 0, beat, accent),
    });
  const cx = (width - 1) * 0.5;
  const vanishY = height * 0.64;
  const floorY = height * 0.76;
  line(0, floorY, width, floorY);
  for (let i = -4; i <= 4; i++) {
    if (i === 0) continue;
    line(cx + i * width * 0.05, vanishY, cx + i * width * 0.26, height - 6);
  }
  for (let k = 1; k <= 3; k++) {
    const y = floorY + (height - 8 - floorY) * (k / 4);
    const span = width * (0.24 + k * 0.14);
    line(cx - span, y, cx + span, y);
  }
}

function paintField(buf, width, height, t, checksum) {
  const field = checksum.field;
  if (!field) return;
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const and = andAccent(beat);
  paintGradient(buf, width, height, field, t);
  paintGrid(buf, width, height, field, t, checksum);
  const stars = field.stars || [];
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const twinkle = 0.42 + 0.5 * (0.5 + 0.5 * Math.sin(beat * Math.PI * 2 + star.phase));
    const sx = star.x * width;
    const sy = star.y * height;
    const color = iridesce(star.phase, t, beat, star.color);
    mixPixel(buf, width, sx, sy, color, twinkle);
    mixPixel(buf, width, sx + 1, sy, color, twinkle * 0.35);
    mixPixel(buf, width, sx, sy + 1, color, twinkle * 0.35);
  }
  const blinkers = field.blinkers || [];
  for (let i = 0; i < blinkers.length; i++) {
    const b = blinkers[i];
    const on = kick;
    if (on < 0.08) continue;
    stampFocusDisc(buf, width, height, b.x * width, b.y * height, 1.8 + on * 1.4, b.color, {
      rim: 1,
      glow: 2,
      glowAlpha: 0.16,
      rimColor: THEME.ink,
    });
  }
}

function startFrame(buf, width, height, t, checksum) {
  fillVoid(buf);
  paintField(buf, width, height, t, checksum);
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
    const spin = inner ? -t * 3.6 * drift - beat * 0.22 : t * 2.3 * drift + beat * 0.14;
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

/** Lost sharp-dogfood ring: two orbital bands, stampFocusDisc satellites, beat-locked spin. */
function layoutFocusRing(circles, width, height, t, checksum) {
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  const phrase = phraseOf(checksum, t);
  const spin = t * phraseMix(phrase, 0.22, 0.52, 0.16) + beat * Math.PI * 0.12;
  const orbitMul = phraseMix(phrase, 0.8, 1.08 + phrase.turnHit * 0.1, 0.64);
  const rMul = phraseMix(phrase, 0.42, 0.42, 0.3);
  return circles.map((circle, i) => {
    const ang = (i / circles.length) * Math.PI * 2 + spin;
    const orbit = minSide * (0.16 + (i % 3) * 0.07) * orbitMul;
    const depth = Math.sin(ang);
    return {
      circle,
      x: cx + Math.cos(ang) * orbit,
      y: cy + Math.sin(ang) * orbit * 0.72,
      r: circlePulse(circle, t + i * 0.11) * (rMul / 0.42) * (0.68 + 0.32 * (0.5 + 0.5 * depth)),
      color: parseHex(circle.color),
      depth,
    };
  });
}

/** Power Plant satellites — same discs on every body. Phrase orbit. */
function paintSuitSatellites(buf, width, height, t, checksum) {
  if (!checksum) return;
  const circles = checksum.visualConfig && checksum.visualConfig.circles;
  if (!circles || !circles.length) return;
  const placed = layoutFocusRing(circles, width, height, t, checksum)
    .slice()
    .sort((a, b) => a.depth - b.depth);
  for (let i = 0; i < placed.length; i++) {
    const sat = placed[i];
    const color = mixRgb(sat.color, THEME.void, Math.max(0, -sat.depth) * 0.42);
    stampFocusDisc(buf, width, height, sat.x, sat.y, sat.r * 0.42, color, {
      rim: 1.6,
      glow: 4,
      glowAlpha: 0.2 + 0.08 * Math.max(0, sat.depth),
      rimColor: THEME.ink,
    });
  }
}

function paintFocusSatellites(buf, width, height, t, checksum) {
  if (!checksum || checksum.lookKind !== "focus") return;
  paintSuitSatellites(buf, width, height, t, checksum);
}

/** Mill mesh verts as stamp discs — same presence language as synapse / cosmos. */
function paintMeshBeads(buf, width, height, t, checksum, scale) {
  const mesh = checksum && checksum.mesh;
  if (!mesh || !mesh.verts || !mesh.verts.length) return;
  const pts = projectMesh(mesh, width, height, t, checksum, scale || 0.92);
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const gold = kick > 0.18 && i === 0;
    stampFocusDisc(
      buf,
      width,
      height,
      p.x,
      p.y,
      6.8 + (i % 3) * 1.6 + kick * 1.2,
      gold ? THEME.gold : THEME_CYCLE[((mesh.accentIndex || 0) + i) % THEME_CYCLE.length],
      { rim: 1.4, glow: 3.2, glowAlpha: 0.2, rimColor: THEME.ink },
    );
  }
}

/** Field under focus: gradient + stars + blinkers. No grid through the disc. */
function paintFocusField(buf, width, height, t, checksum) {
  const field = checksum && checksum.field;
  if (!field) return;
  paintGradient(buf, width, height, field, t);
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const and = andAccent(beat);
  const stars = field.stars || [];
  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const twinkle = 0.42 + 0.5 * (0.5 + 0.5 * Math.sin(beat * Math.PI * 2 + star.phase));
    const sx = star.x * width;
    const sy = star.y * height;
    const color = iridesce(star.phase, t, beat, star.color);
    mixPixel(buf, width, sx, sy, color, twinkle);
    mixPixel(buf, width, sx + 1, sy, color, twinkle * 0.35);
    mixPixel(buf, width, sx, sy + 1, color, twinkle * 0.35);
  }
  const blinkers = field.blinkers || [];
  for (let i = 0; i < blinkers.length; i++) {
    const b = blinkers[i];
    const on = kick;
    if (on < 0.08) continue;
    stampFocusDisc(buf, width, height, b.x * width, b.y * height, 1.8 + on * 1.4, b.color, {
      rim: 1,
      glow: 2,
      glowAlpha: 0.16,
      rimColor: THEME.ink,
    });
  }
}

/** Mesh fingerprint as solid mass — verts only, off the equator so orbFocusWidth stays honest. */
function paintFocusMeshMass(buf, width, height, t, checksum) {
  const mesh = checksum && checksum.mesh;
  if (!mesh || !mesh.verts || !mesh.verts.length) return;
  const pts = projectMesh(mesh, width, height, t, checksum, 0.78);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const keep = Math.min(width, height) * 0.16;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (Math.abs(p.y - cy) < keep * 0.38 && Math.abs(p.x - cx) < keep * 1.15) continue;
    const color = THEME_CYCLE[((mesh.accentIndex || 0) + i) % THEME_CYCLE.length];
    stampFocusDisc(buf, width, height, p.x, p.y, 3.6 + (i % 3) * 0.8, color, {
      rim: 1.1,
      glow: 2.6,
      glowAlpha: 0.18,
      rimColor: THEME.ink,
    });
  }
}

const organs = createOrgans({
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
});

/** orb focus — cyan disc + gold pupil + satellites. Field + mesh verts carry the mint id. */
function paintFocusOrb(buf, width, height, t, checksum) {
  fillVoid(buf);
  paintFocusField(buf, width, height, t, checksum);
  paintFocusMeshMass(buf, width, height, t, checksum);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const phrase = phraseOf(checksum, t);
  const mesh = checksum && checksum.mesh;
  const style = (mesh && mesh.coreStyle) || "disc";
  const pulse = style === "pulse" ? 0.012 : 0;
  const core =
    minSide *
    (0.11 +
      0.018 * Math.sin(t * 1.7) +
      0.018 * phrase.turnHit +
      0.01 * phraseWeight(phrase, "tag") +
      pulse);
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
    rimColor: THEME.gold,
  });
  paintFocusSatellites(buf, width, height, t, checksum);
}

/** orb mill cage — Wu lantern + nucleus. No orbiting HUD ticks. */
function paintMillCage(buf, width, height, t, checksum) {
  startFrame(buf, width, height, t, checksum);
  paintChecksumMesh(buf, width, height, t, checksum, {
    scale: 0.95,
    half: 1,
  });
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  paintOrbNucleus(buf, width, height, cx, cy, minSide, beat, checksum.mesh, checksum);
}

/** mill swirl — platonic mass. Faces wash + Wu hairline. No nucleus. */
function paintMillMesh(buf, width, height, t, checksum, scale) {
  startFrame(buf, width, height, t, checksum);
  const phrase = phraseOf(checksum, t);
  paintChecksumMesh(buf, width, height, t, checksum, {
    scale: scale || 0.92,
    half: 1,
    fill: phraseMix(phrase, 0.18, 0.42, 0.24),
  });
  paintMeshBeads(buf, width, height, t, checksum, scale || 0.92);
}

/** mill snap — ghost hull + 2–3 held strikes. Never the full swirl mass. */
function paintMillStrike(buf, width, height, t, checksum) {
  startFrame(buf, width, height, t, checksum);
  const mesh = checksum && checksum.mesh;
  if (!mesh) return;
  const snapped = Object.assign({}, mesh, { gait: "snap" });
  const pts = projectMesh(snapped, width, height, t, checksum, 0.9);
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const phrase = phraseOf(checksum, t);
  paintMeshFaces(buf, width, height, snapped, pts, THEME.cyan, phraseMix(phrase, 0.04, 0.08, 0.05), t, checksum);
  for (let i = 0; i < (mesh.edges || []).length; i++) {
    const [a, b] = mesh.edges[i];
    const pa = pts[a];
    const pb = pts[b];
    if (!pa || !pb) continue;
    paintGlowLine(buf, width, height, pa.x, pa.y, pb.x, pb.y, THEME.cyan, {
      glowAlpha: 0.045,
      shader: (u) => livingShade(snapped, t, u, beat, THEME.ink),
    });
  }
  const keep = Math.min(3, Math.max(2, Math.ceil((mesh.edges.length || 0) * phraseMix(phrase, 0.22, 0.36, 0.18))));
  const ranked = (mesh.edges || [])
    .map((e, i) => ({ e, i, z: pts[e[0]] && pts[e[1]] ? pts[e[0]].z + pts[e[1]].z : 0 }))
    .sort((a, b) => a.z - b.z)
    .slice(0, keep);
  for (let i = 0; i < ranked.length; i++) {
    const [a, b] = ranked[i].e;
    const pa = pts[a];
    const pb = pts[b];
    if (!pa || !pb) continue;
    const live = i === 0;
    const color = kick > 0.16 && live ? THEME.gold : livingShade(snapped, t, i / Math.max(1, ranked.length), beat, null);
    paintSharpLine(buf, width, height, pa.x, pa.y, pb.x, pb.y, color, live ? 3 : 2);
    paintGlowLine(buf, width, height, pa.x, pa.y, pb.x, pb.y, color, { glowAlpha: live ? 0.2 : 0.1 });
    stampFocusDisc(buf, width, height, pa.x, pa.y, (live ? 9.4 : 6.8) + kick * 2.4, color, {
      rim: 1.3,
      glow: 4,
      glowAlpha: 0.22,
      rimColor: THEME.ink,
    });
    stampFocusDisc(buf, width, height, pb.x, pb.y, (live ? 8.2 : 5.8) + kick * 1.8, color, {
      rim: 1.2,
      glow: 3.4,
      glowAlpha: 0.2,
      rimColor: THEME.ink,
    });
  }
}

/** mill spark — coals at verts + edge midpoints, longer heat wakes. Not a cosmos web. */
function paintMillEmbers(buf, width, height, t, checksum) {
  startFrame(buf, width, height, t, checksum);
  const mesh = checksum && checksum.mesh;
  if (!mesh) return;
  const pts = projectMesh(mesh, width, height, t, checksum, 0.85);
  const prev = projectMesh(mesh, width, height, Math.max(0, t - 0.16), checksum, 0.85);
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const phrase = phraseOf(checksum, t);
  const size = phraseMix(phrase, 8.6, 15.4, 10.2);
  const coals = [];
  for (let i = 0; i < pts.length; i++) {
    coals.push({ p: pts[i], q: prev[i] || pts[i], i, mid: false });
  }
  for (let i = 0; i < (mesh.edges || []).length; i++) {
    const [a, b] = mesh.edges[i];
    if (!pts[a] || !pts[b] || !prev[a] || !prev[b]) continue;
    coals.push({
      p: { x: (pts[a].x + pts[b].x) * 0.5, y: (pts[a].y + pts[b].y) * 0.5 },
      q: { x: (prev[a].x + prev[b].x) * 0.5, y: (prev[a].y + prev[b].y) * 0.5 },
      i: pts.length + i,
      mid: true,
    });
  }
  for (let i = 0; i < coals.length; i++) {
    const coal = coals[i];
    const heat = coal.mid ? mixRgb(THEME.gold, THEME.cyan, 0.35) : THEME_CYCLE[((mesh.accentIndex || 0) + coal.i) % THEME_CYCLE.length];
    const color = kick > 0.2 && coal.i === 0 ? THEME.gold : heat;
    const dx = coal.p.x - coal.q.x;
    const dy = coal.p.y - coal.q.y;
    const body = (coal.mid ? size * 0.62 : size) + (coal.i % 3) * 1.4 + kick * 2.2;
    for (let k = 1; k <= 7; k++) {
      const u = k / 8;
      stampDisc(buf, width, height, coal.p.x - dx * u * 1.35, coal.p.y - dy * u * 1.35, body * 0.38 * (1 - u * 0.6), color, 1.5);
    }
    stampFocusDisc(buf, width, height, coal.p.x, coal.p.y, body, color, {
      rim: 1.4,
      glow: 6,
      glowAlpha: 0.3,
      rimColor: THEME.ink,
    });
  }
}

/** orb → canvas. focus = cyan disc. cage+mill = Wu mesh. cage+rippel = refined mandala. */
function paintCanvas(buf, width, height, t, checksum) {
  if (checksum.lookKind === "focus") {
    return paintFocusOrb(buf, width, height, t, checksum);
  }
  if (checksum.bodyKind === "rippel") {
    startFrame(buf, width, height, t, checksum);
    organs.paintMandala(buf, width, height, t, checksum);
    return;
  }
  paintMillCage(buf, width, height, t, checksum);
}

/** Orb-only nucleus. Other viz do not wear this bullseye. Color cuts + size on the grid; seed picks disc/eclipse/pulse. */
function paintOrbNucleus(buf, width, height, cx, cy, minSide, beat, mesh, checksum) {
  const kick = kickAccent(beat);
  const and = andAccent(beat);
  const style = (mesh && mesh.coreStyle) || "disc";
  const swell = style === "pulse" ? 0.55 + 0.55 * kick + 0.35 * and : 0.5 + 0.35 * kick + 0.22 * and;
  const core = minSide * (style === "pulse" ? 0.092 + 0.028 * swell : 0.1 + 0.014 * swell);
  const t = checksum && checksum.genreConfig ? (beat * 60) / (checksum.genreConfig.tempo || 90) : beat;
  const outer = mixRgb(THEME.cyan, (mesh && meshAccent(mesh, t)) || THEME.gold, 0.28 + 0.45 * and);
  const inner = mixRgb(THEME.gold, THEME.cyan, 0.18 + 0.62 * and);
  stampFocusDisc(buf, width, height, cx, cy, core * 1.08, outer, {
    rim: 2.2,
    glow: 5,
    glowAlpha: 0.18,
    rimColor: THEME.ink,
  });
  const ix = style === "eclipse" ? cx + Math.cos(beat * Math.PI * 2) * core * 0.22 : cx;
  const iy = style === "eclipse" ? cy + Math.sin(beat * Math.PI) * core * 0.12 : cy;
  stampFocusDisc(buf, width, height, ix, iy, core * (style === "eclipse" ? 0.48 : 0.4), inner, {
    rim: 1.6,
    glow: 5,
    glowAlpha: 0.28,
    rimColor: THEME.ink,
  });
  return { radius: core * 1.08, style };
}

/** Solid cyan/gold disc from center, then short rim. Mesh edges past the disc are not the body. */
function orbFocusWidth(buf, width, height) {
  const cx = (width - 1) * 0.5;
  const cy = ((buf.length / 3 / width) | 0) * 0.5;
  const y = cy | 0;
  function sample(x) {
    const i = (y * width + (x | 0)) * 3;
    return [buf[i], buf[i + 1], buf[i + 2]];
  }
  function luma(x) {
    const [r, g, b] = sample(x);
    return (r * 0.3 + g * 0.59 + b * 0.11) / 255;
  }
  function isBody(x) {
    const [r, g, b] = sample(x);
    const cyan = g > 160 && b > 160 && r < 160;
    const gold = r > 180 && g > 140 && b < 110;
    const ink = r > 200 && g > 200 && b > 200;
    return cyan || gold || ink;
  }
  const peak = luma(cx);
  let hi = cx;
  for (let x = cx; x < width; x++) {
    if (isBody(x)) hi = x;
    else break;
  }
  let lo = hi;
  for (let x = hi; x < width; x++) {
    if (luma(x) <= 0.12) {
      lo = x;
      break;
    }
    if (!isBody(x)) {
      lo = x;
      break;
    }
    lo = x;
  }
  return { peak, inner: hi - cx, drop: lo - hi };
}

/** swirl → mill platonic mesh or refined sacred-flow. */
function paintSacred(buf, width, height, t, checksum) {
  if (checksum.bodyKind !== "rippel") {
    return paintMillMesh(buf, width, height, t, checksum, 0.92);
  }
  startFrame(buf, width, height, t, checksum);
  organs.paintSacredFlow(buf, width, height, t, checksum);
}

/** snap → mill mesh or refined Kuramoto synapse. */
function paintNeural(buf, width, height, t, checksum) {
  if (checksum.bodyKind !== "rippel") {
    return paintMillStrike(buf, width, height, t, checksum);
  }
  startFrame(buf, width, height, t, checksum);
  organs.paintKuramoto(buf, width, height, t, checksum);
}

/** waves → WaveformVisualizer liquid ocean + mill ribbons. No gold playhead. */
function paintWaveform(buf, width, height, t, checksum) {
  startFrame(buf, width, height, t, checksum);
  const mid = (height - 1) * 0.5;
  const beat = beatPhase(checksum, t);
  const phrase = phraseOf(checksum, t);
  const env =
    phraseMix(phrase, 0.74, 1.42 + 0.16 * phrase.turnHit, 0.82) *
    (0.88 + 0.12 * Math.max(0, Math.sin(beat * Math.PI * 2)));
  const circles = checksum.visualConfig.circles;
  paintSharpRibbon(buf, width, height, () => mid, THEME.ink, 1, THEME.void);
  circles.forEach((circle, i) => {
    const color = iridesce(i / Math.max(1, circles.length), t, beat, parseHex(circle.color));
    const amp0 = height * (0.11 + (circle.radius / 420) * 0.22) * env;
    const f0 = 0.0065 + circle.frequency / 22000;
    const shift = t * (circle.frequency / 1.85);
    const gem = (checksum.gematria && checksum.gematria.checksumValue) || 1;
    const phase = i * 0.85 + ((gem >>> ((i * 5) % 24)) & 255) / 70;
    const jitter = 0.08 + ((gem >>> ((i * 3) % 16)) & 7) / 90;
    paintSharpRibbon(
      buf,
      width,
      height,
      (x) =>
        mid +
        Math.sin((x + shift) * f0 + phase) * amp0 +
        Math.sin((x + shift) * f0 * 2 + phase * 1.3) * amp0 * 0.28 +
        Math.sin((x + shift) * f0 * 5.3 + phase * 2.1) * amp0 * jitter,
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
  if (checksum.bodyKind === "rippel") {
    organs.paintAuroraOrbs(buf, width, height, t, checksum);
  }
}

/** spark → mill mesh or refined cosmic dance. */
function paintParticles(buf, width, height, t, checksum) {
  if (checksum.bodyKind !== "rippel") {
    return paintMillEmbers(buf, width, height, t, checksum);
  }
  startFrame(buf, width, height, t, checksum);
  organs.paintCosmos(buf, width, height, t, checksum);
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
    lookKind: opts.lookKind,
    bodyKind: opts.bodyKind,
  });
  paintVisualization(visualization, buf, width, height, opts.t || 0, checksum);
  return {
    buffer: buf,
    width,
    height,
    visualization,
    engine: ENGINE,
    look: LOOK,
    lookKind: checksum.lookKind,
    bodyKind: checksum.bodyKind,
    genre: checksum.genre,
    organ: organOf(visualization, checksum.lookKind, checksum.bodyKind),
    visualConfig: checksum.visualConfig,
    tlmCommand: checksum.tlmCommand,
    tempo: checksum.genreConfig && checksum.genreConfig.tempo,
    mesh: fingerprintMesh(checksum.mesh),
    field: fingerprintField(checksum.field),
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

function sampleMotionFrames(renderer, seedHex, durationSec, brief, extra) {
  const more = extra || {};
  const a = paintRippelFrame({ renderer, t: 0, seedHex, brief, durationSec, ...more });
  const b = paintRippelFrame({
    renderer,
    t: (durationSec || 4.44) * 0.5,
    seedHex,
    brief,
    durationSec,
    ...more,
  });
  const c = paintRippelFrame({
    renderer,
    t: (durationSec || 4.44) * 0.25,
    seedHex,
    brief,
    durationSec,
    ...more,
  });
  const d = paintRippelFrame({
    renderer,
    t: (durationSec || 4.44) * 0.75,
    seedHex,
    brief,
    durationSec,
    ...more,
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
    mesh: a.mesh,
    field: a.field,
    lookKind: a.lookKind,
    bodyKind: a.bodyKind,
    organ: a.organ,
    fill: frameFill(a.buffer),
  };
}

function fingerprintField(field) {
  if (!field) return null;
  return {
    id: field.id,
    grid: field.grid,
    gradient: field.gradient,
    starCount: (field.stars && field.stars.length) || 0,
    blinkerCount: (field.blinkers && field.blinkers.length) || 0,
  };
}

function fingerprintMesh(mesh) {
  if (!mesh) return null;
  return {
    id: mesh.id,
    family: mesh.family,
    gait: mesh.gait,
    vertexCount: mesh.verts.length,
    edgeCount: mesh.edges.length,
    faceCount: (mesh.faces && mesh.faces.length) || 0,
    shells: mesh.shells || 1,
    dual: Boolean(mesh.dual),
    fill: Boolean(mesh.fill),
    ghost: Boolean(mesh.ghost),
    coreStyle: mesh.coreStyle || "disc",
  };
}

function frameFill(buf) {
  const v = THEME.void;
  let lit = 0;
  const pixels = buf.length / 3;
  for (let i = 0; i < buf.length; i += 3) {
    if (Math.abs(buf[i] - v[0]) > 2 || Math.abs(buf[i + 1] - v[1]) > 2 || Math.abs(buf[i + 2] - v[2]) > 2) {
      lit += 1;
    }
  }
  return lit / pixels;
}

function summarizeVisual(checksum) {
  if (!checksum || !checksum.visualConfig) return null;
  return {
    tlmCommand: checksum.tlmCommand,
    canvas: checksum.visualConfig.canvas,
    circleCount: checksum.visualConfig.circles.length,
    notes: checksum.visualConfig.circles.map((c) => c.note),
    frequencies: checksum.visualConfig.circles.map((c) => c.frequency),
    lookKind: checksum.lookKind || null,
    bodyKind: checksum.bodyKind || null,
    genre: checksum.genre || (checksum.genreConfig && checksum.genreConfig.scale) || null,
    mesh: fingerprintMesh(checksum.mesh),
    field: fingerprintField(checksum.field),
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
  andAccent,
  beatPhase,
  phraseOf,
  phraseMix,
  phraseWeight,
  motionGrid: soundRippel.motionGrid,
  fillVoid,
  buildMesh,
  buildField,
  paintMeshOverlay,
  paintField,
  fingerprintMesh,
  fingerprintField,
  frameFill,
  MESH_FAMILIES,
  MESH_GAITS,
  CORE_STYLES,
  LOOK_KINDS,
  BODY_KINDS,
  GRID_KINDS,
  GRAD_KINDS,
  resolveLookKind,
  resolveBodyKind,
  resolveGenreKind,
  GENRE_KINDS,
  organOf,
  ORGAN: organs.ORGAN,
};
