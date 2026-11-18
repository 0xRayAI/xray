import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");

type Check = { id: string; pass: boolean; detail: { worstExcessDb?: number } };

type Bed = {
  gains: Record<string, number>;
  duckDb: number;
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
  bassMatch: number;
  sources: Record<string, string>;
  rules: { pass: boolean; fails: string[]; checks: Check[] };
  reference: { pass: boolean; audioStored: boolean; measured: { lowShare30to120: number } };
  levels: { "5.4-7.4": { bass: number }; "7-9": { bass: number }; "17-19": { bass: number } };
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

describe("BED-MAGNETIC-MOVES-v7b", () => {
  it("copies v7 and swaps only the level-matched v8lib bass", async () => {
    const v7bed = magnetic.renderBed("v7");
    const bed = await magnetic.loadBed("v7b");
    const v7 = magnetic.measureBed(v7bed);
    const metrics = magnetic.measureBed(bed);
    expect(metrics.name).toBe("BED-MAGNETIC-MOVES-v7b");
    expect(metrics.cues).toEqual(magnetic.CUES);
    expect(bed.gains).toEqual(v7bed.gains);
    expect(bed.duckDb).toBe(0);
    expect(metrics.sources).toEqual({
      sub: "v8lib-elementary",
      mid: "v8lib-elementary",
      pad: "v7",
      kick: "v7",
      clap: "v7",
      hat: "v7",
      pluck: "v7",
      stab: "v7",
    });
    for (const name of ["pad", "kick", "clap", "hat", "pluck", "stab"]) {
      expect(sameStem(bed.stems[name], v7bed.stems[name]), name).toBe(true);
    }
    expect(sameStem(bed.stems.sub, v7bed.stems.sub)).toBe(false);
    expect(metrics.bassMatch).toBeGreaterThan(0.5);
    expect(metrics.bassMatch).toBeLessThan(1.5);
    for (const span of ["5.4-7.4", "7-9", "17-19"] as const) {
      expect(Math.abs(metrics.levels[span].bass - v7.levels[span].bass)).toBeLessThanOrEqual(0.2);
    }
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
  }, 60000);
});
