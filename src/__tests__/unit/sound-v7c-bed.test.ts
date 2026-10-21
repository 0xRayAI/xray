import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type Check = { id: string; pass: boolean; detail: { worstExcessDb?: number } };

type Overlay = {
  entrySec: number;
  fadeSec: number;
  splitHz: number;
  lowScale: number;
  highScale: number;
  finalScale: number;
  alignCorrelation: number;
  notesAligned: number;
  layered: string[];
};

type Bed = {
  gains: Record<string, number>;
  duckDb: number;
  sampleRate: number;
  overlay: Overlay;
  stems: Record<string, Float64Array>;
};

type Metrics = {
  name: string;
  pass: boolean;
  fails: string[];
  earReady: boolean;
  lufs: number;
  truePeakDb: number;
  cues: Record<string, number>;
  sources: Record<string, string>;
  overlay: Overlay;
  rules: { pass: boolean; fails: string[]; checks: Check[] };
  reference: { pass: boolean; audioStored: boolean; measured: { lowShare30to120: number } };
};

type Magnetic = {
  CUES: Record<string, number>;
  loadBed: (variant: string) => Promise<Bed>;
  renderBed: (variant: string) => Bed;
  measureBed: (bed: Bed) => Metrics;
};

const magnetic = requireCjs(path.join(root, "scripts/foundry/sound-magnetic.cjs")) as Magnetic;

function sameStem(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function sameUntil(a: Float64Array, b: Float64Array, end: number): boolean {
  for (let i = 0; i < end; i++) if (a[i] !== b[i]) return false;
  return true;
}

describe("BED-MAGNETIC-MOVES-v7c", () => {
  it("keeps v7 and overlays the v8lib bass from 7 seconds", async () => {
    const v7bed = magnetic.renderBed("v7");
    const bed = await magnetic.loadBed("v7c");
    const metrics = magnetic.measureBed(bed);
    const entry = Math.floor(bed.overlay.entrySec * bed.sampleRate);
    expect(metrics.name).toBe("BED-MAGNETIC-MOVES-v7c");
    expect(metrics.cues).toEqual(magnetic.CUES);
    expect(bed.gains).toEqual(v7bed.gains);
    expect(bed.duckDb).toBe(0);
    expect(metrics.sources).toEqual({
      sub: "v7",
      mid: "v7",
      pad: "v7",
      kick: "v7",
      clap: "v7",
      hat: "v7",
      pluck: "v7",
      stab: "v7",
    });
    expect(metrics.overlay.layered).toEqual(["v8lib elementary sub", "v8lib elementary mid"]);
    expect(metrics.overlay.entrySec).toBe(7);
    expect(metrics.overlay.fadeSec).toBeGreaterThan(0);
    expect(metrics.overlay.fadeSec).toBeLessThan(0.2);
    expect(metrics.overlay.lowScale).toBeGreaterThan(0);
    expect(metrics.overlay.highScale).toBeGreaterThan(0);
    expect(metrics.overlay.finalScale).toBeGreaterThan(0);
    expect(metrics.overlay.finalScale).toBeLessThanOrEqual(1);
    expect(metrics.overlay.alignCorrelation).toBeGreaterThan(0.5);
    expect(metrics.overlay.notesAligned).toBeGreaterThan(10);
    for (const name of ["pad", "kick", "clap", "hat", "pluck", "stab"]) {
      expect(sameStem(bed.stems[name], v7bed.stems[name]), name).toBe(true);
    }
    expect(sameUntil(bed.stems.sub, v7bed.stems.sub, entry)).toBe(true);
    expect(sameUntil(bed.stems.mid, v7bed.stems.mid, entry)).toBe(true);
    let moved = false;
    const late = Math.floor(8 * bed.sampleRate);
    for (let i = entry; i < late; i++) {
      if (bed.stems.sub[i] !== v7bed.stems.sub[i]) moved = true;
    }
    expect(moved).toBe(true);
    expect(metrics.pass, metrics.fails.join(", ")).toBe(true);
    expect(metrics.rules.pass, metrics.rules.fails.join(", ")).toBe(true);
    expect(metrics.reference.pass).toBe(true);
    expect(metrics.reference.audioStored).toBe(false);
    expect(metrics.earReady).toBe(true);
    expect(metrics.lufs).toBeGreaterThanOrEqual(-16);
    expect(metrics.lufs).toBeLessThanOrEqual(-14);
    expect(metrics.truePeakDb).toBeLessThanOrEqual(-1);
    expect(metrics.reference.measured.lowShare30to120).toBeGreaterThanOrEqual(0.6);
    expect(metrics.reference.measured.lowShare30to120).toBeLessThanOrEqual(0.9);
    const foreground = metrics.rules.checks.find((row) => row.id === "foreground");
    expect(foreground?.pass).toBe(true);
    expect(foreground?.detail.worstExcessDb ?? 99).toBeLessThanOrEqual(3);
    expect(metrics.rules.checks.find((row) => row.id === "hiss")?.pass).toBe(true);
    expect(metrics.rules.checks.find((row) => row.id === "pump")?.pass).toBe(true);
  }, 90000);
});
