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
 * Mesh: seed-unique polyhedron (family + gait + shells + faces + warp).
 * NFT fingerprint — 4.44s of unique blip art, not a tiny diagram in void.
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
  note: "Rippel v2 — VisualConfig.circles + seed mesh. Sharp focus, fast abstract blip, unique silhouette per brief/seed. Family + gait + shells fill the frame. Soft tints, no photosensitive strobe. Wireframe is flag-only.",
};

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
  const edges = base.edges.map((e) => [e[0], e[1]]);
  const extra = 2 + ((rng() * 7) | 0);
  for (let i = 0; i < extra; i++) {
    const a = (rng() * verts.length) | 0;
    const b = (rng() * verts.length) | 0;
    if (a === b) continue;
    const lo = a < b ? a : b;
    const hi = a < b ? b : a;
    if (!edges.some((e) => e[0] === lo && e[1] === hi)) edges.push([lo, hi]);
  }
  let faces = (base.faces && base.faces.length ? base.faces : trianglesFromEdges(verts, edges)).map((f) => [
    f[0],
    f[1],
    f[2],
  ]);
  if (faces.length > 36) faces = faces.slice(0, 36);
  const accentIndex = (rng() * THEME_CYCLE.length) | 0;
  const shells = 1 + ((rng() * 3) | 0);
  return {
    family,
    gait,
    id: `${family}-${gait}-${verts.length}v${edges.length}e${faces.length}f-${((rng() * 0xfffffff) | 0).toString(16)}`,
    verts,
    edges,
    faces,
    twist: rng() * Math.PI * 2,
    spin: 1.7 + rng() * 2.4,
    scale: 0.86 + rng() * 0.28,
    warp: 0.06 + rng() * 0.14,
    shells,
    cuts: 3 + ((rng() * 3) | 0),
    dual: rng() > 0.38,
    ghost: rng() > 0.28,
    fill: rng() > 0.22,
    accentIndex,
    accent: THEME_CYCLE[accentIndex],
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
  let yaw = t * mesh.spin + mesh.twist;
  let pitch = Math.sin(t * mesh.spin * 0.42 + mesh.twist) * 0.52;
  let roll = t * 0.38 + mesh.twist * 0.25;
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const and = andAccent(beat);
  let breathe = (scaleMul || 1) * mesh.scale * (1 + 0.07 * kick + 0.045 * and);
  let ox = 0;
  let oy = 0;
  if (gait === "snap") {
    const q = Math.floor(beat);
    yaw = q * 1.15 + mesh.twist;
    pitch = Math.sin(q * 1.7 + mesh.twist) * 0.46;
    roll = q * 0.55 + mesh.twist * 0.3;
  } else if (gait === "pulse") {
    breathe *= 1 + mesh.warp * (kick + and * 0.65);
  } else if (gait === "orbit") {
    ox = Math.cos(beat * Math.PI * 2 + mesh.twist) * mesh.warp * 0.42;
    oy = Math.sin(beat * Math.PI + mesh.twist) * mesh.warp * 0.26;
  } else if (gait === "tumble") {
    yaw = beat * mesh.spin + mesh.twist;
    pitch = beat * mesh.spin * 0.38 + Math.sin(mesh.twist) * 0.2;
    roll = beat * mesh.spin * 0.22 + mesh.twist;
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
    mesh: buildMesh(seedHex, text),
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
  const cut = Math.floor((t / 4.44) * (mesh.cuts || 3));
  return THEME_CYCLE[((mesh.accentIndex || 0) + cut) % THEME_CYCLE.length];
}

function paintMeshFaces(buf, width, height, mesh, pts, color, alpha) {
  if (!mesh.faces || !mesh.faces.length || alpha <= 0) return;
  const ranked = mesh.faces
    .map((f) => {
      const a = pts[f[0]];
      const b = pts[f[1]];
      const c = pts[f[2]];
      return { a, b, c, z: (a.z + b.z + c.z) / 3 };
    })
    .sort((p, q) => p.z - q.z);
  for (let i = 0; i < ranked.length; i++) {
    fillTri(buf, width, height, ranked[i].a, ranked[i].b, ranked[i].c, color, alpha);
  }
}

function paintMesh(buf, width, height, mesh, pts, color, half, opts) {
  const node = { rim: 1, glow: 2, glowAlpha: 0.14, rimColor: THEME.ink };
  const fillA = opts && opts.fill != null ? opts.fill : 0;
  if (fillA > 0) paintMeshFaces(buf, width, height, mesh, pts, color, fillA);
  const ranked = mesh.edges
    .map((e, i) => ({ e, i, z: (pts[e[0]].z + pts[e[1]].z) * 0.5 }))
    .sort((a, b) => a.z - b.z);
  for (let i = 0; i < ranked.length; i++) {
    const [a, b] = ranked[i].e;
    const near = ranked[i].z > 0 ? 1 : 0;
    paintSharpLine(buf, width, height, pts[a].x, pts[a].y, pts[b].x, pts[b].y, color, half + near);
  }
  const nodeR = opts && opts.nodeR != null ? opts.nodeR : 4.6;
  for (let i = 0; i < pts.length; i++) {
    stampFocusDisc(buf, width, height, pts[i].x, pts[i].y, nodeR, color, node);
  }
}

function paintChecksumMesh(buf, width, height, t, checksum, opts) {
  const mesh = checksum.mesh;
  if (!mesh) return null;
  const scale = (opts && opts.scale) || 1;
  const half = (opts && opts.half) || 1;
  const color = (opts && opts.color) || meshAccent(mesh, t);
  if (mesh.ghost) {
    const ghostA = projectMesh(mesh, width, height, t - 0.1, checksum, scale * 0.97);
    paintMesh(buf, width, height, mesh, ghostA, mixRgb(THEME.void, color, 0.42), 1, { fill: 0, nodeR: 2.4 });
    const ghostB = projectMesh(mesh, width, height, t - 0.2, checksum, scale * 0.94);
    paintMesh(buf, width, height, mesh, ghostB, mixRgb(THEME.void, color, 0.22), 1, { fill: 0, nodeR: 2 });
  }
  const allowFill = mesh.fill && !(opts && opts.noFill);
  const shells = Math.max(1, mesh.shells || 1);
  for (let s = shells; s > 1; s--) {
    const shellScale = scale * (0.55 + s * 0.28);
    const shellT = s % 2 === 0 ? -t * 0.64 : t * 0.84;
    const ptsS = projectMesh(mesh, width, height, shellT, checksum, shellScale);
    paintMesh(buf, width, height, mesh, ptsS, s % 2 === 0 ? THEME.ink : mixRgb(color, THEME.blue, 0.35), 1, {
      fill: allowFill ? 0.05 : 0,
      nodeR: 3.2,
    });
  }
  const pts = projectMesh(mesh, width, height, t, checksum, scale);
  paintMesh(buf, width, height, mesh, pts, color, half, {
    fill: allowFill ? 0.11 : 0,
    nodeR: 5.2,
  });
  let dual = null;
  if (mesh.dual) {
    dual = projectMesh(mesh, width, height, -t * 0.72, checksum, scale * 0.58);
    paintMesh(buf, width, height, mesh, dual, THEME.ink, 1, { fill: allowFill ? 0.06 : 0, nodeR: 3.4 });
  }
  return { mesh, pts, dual };
}

function paintMeshOverlay(buf, width, height, opts) {
  const checksum = cachedChecksum({
    brief: opts.brief,
    seedHex: opts.seedHex,
    genre: opts.genre,
    width,
    height,
  });
  return paintChecksumMesh(buf, width, height, opts.t || 0, checksum, {
    scale: 0.92,
    half: 1,
    color: THEME.cyan,
  });
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

/** orb → canvas / Orb Glow v2. Seed mesh cage + sharp core + seated motes. */
function paintCanvas(buf, width, height, t, checksum) {
  fillVoid(buf);
  const worn = paintChecksumMesh(buf, width, height, t, checksum, {
    scale: 1.05,
    half: 1,
    color: THEME.blue,
    noFill: true,
  });
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  const swell = 0.5 + 0.35 * kickAccent(beat) + 0.22 * andAccent(beat);
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
  const circles = checksum.visualConfig.circles;
  const seats = worn && worn.pts && worn.pts.length ? worn.pts : layoutRings(circles, width, height, t, checksum);
  for (let i = 0; i < circles.length; i++) {
    const seat = seats[i % seats.length];
    const x = seat.x;
    const y = seat.y;
    const color = mixRgb(parseHex(circles[i].color), THEME.gold, freqTint(circles[i], t));
    stampFocusDisc(buf, width, height, x, y, circlePulse(circles[i], t) * 0.28, color, {
      rim: 1.6,
      glow: 4,
      glowAlpha: 0.2,
      rimColor: THEME.ink,
    });
  }
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

/** swirl → 3d-sacred v2. Seed mesh + dual as the sacred body. */
function paintSacred(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const kick = kickAccent(beatPhase(checksum, t));
  const worn = paintChecksumMesh(buf, width, height, t, checksum, {
    scale: 1.12,
    half: 2,
    color: THEME.cyan,
  });
  const seats = worn && worn.pts ? worn.pts : [];
  const circles = checksum.visualConfig.circles;
  for (let i = 0; i < circles.length; i++) {
    const seat = seats[i % Math.max(1, seats.length)];
    const x = seat ? seat.x : cx;
    const y = seat ? seat.y : cy;
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
  stampFocusDisc(buf, width, height, cx, cy, minSide * (0.03 + kick * 0.006), mixRgb(THEME.gold, THEME.cyan, 0.4), {
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
  const worn = paintChecksumMesh(buf, width, height, t, checksum, {
    scale: 1.08,
    half: 1,
    color: THEME.blue,
  });
  const pts = (worn && worn.pts) || [];
  const mesh = checksum.mesh;
  const node = { rim: 1.4, glow: 3, glowAlpha: 0.18, rimColor: THEME.ink };
  if (mesh && pts.length) {
    for (let i = 0; i < mesh.edges.length; i++) {
      const [ai, bi] = mesh.edges[i];
      const a = pts[ai];
      const b = pts[bi];
      const speed = 1.6 + ((checksum.visualConfig.circles[i % checksum.visualConfig.circles.length] || {}).frequency || 180) / 160;
      const travel = (t * speed + i * 0.19) % 1;
      stampFocusDisc(
        buf,
        width,
        height,
        a.x + (b.x - a.x) * travel,
        a.y + (b.y - a.y) * travel,
        5,
        i % 2 === 0 ? THEME.gold : THEME.cyan,
        node,
      );
    }
    const circles = checksum.visualConfig.circles;
    for (let i = 0; i < circles.length; i++) {
      const seat = pts[i % pts.length];
      stampFocusDisc(
        buf,
        width,
        height,
        seat.x,
        seat.y,
        8 + kick,
        mixRgb(parseHex(circles[i].color), THEME.gold, freqTint(circles[i], t)),
        node,
      );
    }
    stampFocusDisc(buf, width, height, cx, cy, 10 + kick * 3, mixRgb(THEME.cyan, THEME.gold, 0.3 + kick * 0.3), {
      rim: 1.6,
      glow: 4,
      glowAlpha: 0.22,
      rimColor: THEME.ink,
    });
    return;
  }
  const placed = layoutRings(checksum.visualConfig.circles, width, height, t * 1.55, checksum);
  for (let i = 0; i < placed.length; i++) {
    const wander = Math.sin(t * 3.4 + i * 2.1) * 16;
    const a = {
      ...placed[i],
      x: placed[i].x + wander,
      y: placed[i].y + Math.cos(t * 2.7 + i) * 10,
    };
    const rawB = placed[(i + 1) % placed.length];
    const rawSkip = placed[(i + 2) % placed.length];
    const b = { x: rawB.x - wander * 0.3, y: rawB.y };
    const skip = { x: rawSkip.x, y: rawSkip.y + wander * 0.2 };
    paintSharpLine(buf, width, height, a.x, a.y, b.x, b.y, THEME.blue, 1);
    paintSharpLine(buf, width, height, a.x, a.y, skip.x, skip.y, THEME.blue, 1);
    paintSharpLine(buf, width, height, cx, cy, a.x, a.y, THEME.blue, 1);
    const speed = 1.8 + a.circle.frequency / 140;
    const travel = (t * speed + i * 0.17) % 1;
    const inbound = (t * speed * 1.35 + beat * 0.08 + i * 0.41) % 1;
    const third = (t * speed * 0.55 + i * 0.63) % 1;
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
    stampFocusDisc(
      buf,
      width,
      height,
      a.x + (skip.x - a.x) * third,
      a.y + (skip.y - a.y) * third,
      3,
      THEME.ink,
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
  paintChecksumMesh(buf, width, height, t, checksum, { scale: 1.02, half: 1, color: THEME.blue });
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
  const tickX = ((beat % 1) * width) | 0;
  const tickH = height * 0.22 * (0.45 + kick);
  for (let y = mid - tickH; y <= mid + tickH; y++) {
    mixPixel(buf, width, tickX, y, THEME.gold, 1);
    mixPixel(buf, width, tickX - 1, y, THEME.ink, 1);
    mixPixel(buf, width, tickX + 1, y, THEME.ink, 1);
  }
}

/** spark → particles v2. Motes ride the seed mesh edges. */
function paintParticles(buf, width, height, t, checksum) {
  fillVoid(buf);
  const cx = (width - 1) * 0.5;
  const cy = (height - 1) * 0.5;
  const minSide = Math.min(width, height);
  const beat = beatPhase(checksum, t);
  const kick = kickAccent(beat);
  const worn = paintChecksumMesh(buf, width, height, t, checksum, {
    scale: 1.1,
    half: 1,
    color: THEME.blue,
  });
  const mote = { rim: 1, glow: 2, glowAlpha: 0.16, rimColor: THEME.ink };
  stampFocusDisc(buf, width, height, cx, cy, 8 + kick * 2, mixRgb(THEME.cyan, THEME.gold, 0.35 + kick * 0.25), mote);
  const mesh = checksum.mesh;
  const pts = worn && worn.pts;
  const circles = checksum.visualConfig.circles;
  if (mesh && pts) {
    for (let i = 0; i < mesh.edges.length; i++) {
      const [ai, bi] = mesh.edges[i];
      const a = pts[ai];
      const b = pts[bi];
      const circle = circles[i % circles.length];
      for (let k = 0; k < 3; k++) {
        const life = (t * (1.4 + circle.frequency / 400) + i * 0.13 + k * 0.31) % 1;
        const x = a.x + (b.x - a.x) * life;
        const y = a.y + (b.y - a.y) * life;
        stampFocusDisc(
          buf,
          width,
          height,
          x,
          y,
          2.8 + (1 - life) * 2,
          mixRgb(parseHex(circle.color), THEME.gold, freqTint(circle, t)),
          mote,
        );
      }
    }
    return;
  }
  const placed = layoutRings(circles, width, height, t * 1.15, checksum);
  for (let i = 0; i < placed.length; i++) {
    const src = placed[i];
    const tint = freqTint(src.circle, t);
    const orbitR = 22 + (i % 3) * 11 + Math.sin(t * 1.7 + i) * 5;
    const segs = 11;
    for (let s = 0; s < segs; s++) {
      if ((s + i * 3) % 4 === 0) continue;
      const a0 = (s / segs) * Math.PI * 2 + t * 3.4 + i * 0.7;
      const a1 = a0 + (Math.PI * 2 * 0.32) / segs;
      paintSharpLine(
        buf,
        width,
        height,
        src.x + Math.cos(a0) * orbitR,
        src.y + Math.sin(a0) * orbitR * 0.72,
        src.x + Math.cos(a1) * orbitR,
        src.y + Math.sin(a1) * orbitR * 0.72,
        THEME.blue,
        1,
      );
    }
    const moteCount = 18;
    for (let k = 0; k < moteCount; k++) {
      const life = (t * (1.25 + src.circle.frequency / 420) + k * 0.11 + i * 0.07) % 1;
      const orbital = k % 3 === 0;
      const dart = Math.sin(t * 5.1 + k * 1.3 + i) * 0.35;
      const ang = orbital ? t * (3.2 + (k % 5) * 0.28) + i + k + dart : t * 4.2 + i * 1.3 + k * 0.62 + dart;
      const dist = orbital
        ? 18 + (k % 4) * 10 + Math.sin(beat * Math.PI * 2 + k) * 4
        : life * minSide * 0.38 * (0.7 + kick * 0.12);
      const x = src.x + Math.cos(ang) * dist;
      const y = src.y + Math.sin(ang) * dist * (orbital ? 0.72 : 1);
      const size = Math.max(2.2, (1 - life) * (3.2 + (k % 3)) + kick * 0.6);
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
    mesh: fingerprintMesh(checksum.mesh),
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
    mesh: a.mesh,
    fill: frameFill(a.buffer),
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
    mesh: fingerprintMesh(checksum.mesh),
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
  motionGrid: soundRippel.motionGrid,
  fillVoid,
  buildMesh,
  paintMeshOverlay,
  fingerprintMesh,
  frameFill,
  MESH_FAMILIES,
  MESH_GAITS,
};
