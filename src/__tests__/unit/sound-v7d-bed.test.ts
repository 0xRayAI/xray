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
  sampleRate: number;
  voiceMatch: { hatScale: number; pluckScale: number };
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
  rules: { pass: boolean; fails: string[]; checks: Check[] };
  reference: { pass: boolean; audioStored: boolean; measured: { lowShare30to120: number } };
};

type Magnetic = {
  CUES: Record<string, number>;
  loadBed: (variant: string) => Promise<Bed>;
  measureBed: (bed: Bed) => Metrics;
};

type Pro = {
  renderFilterPluck: (sampleRate: number, freq: number) => Float64Array;
  spectralCentroid: (samples: Float64Array, sampleRate: number) => number;
  topPeaks: (samples: Float64Array, sampleRate: number, count: number, low: number, high: number) => { hz: number; mag: number }[];
  SAMPLE_RATE: number;
};

const magnetic = requireCjs(path.join(root, "scripts/foundry/sound-magnetic.cjs")) as Magnetic;
const pro = requireCjs(path.join(root, "scripts/foundry/sound-pro.cjs")) as Pro;

function sameStem(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function changed(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
  return false;
}

describe("BED-MAGNETIC-MOVES-v7d", () => {
  it("keeps v7c except the CC0 hats and the filtered pluck", async () => {
    const prior = await magnetic.loadBed("v7c");
    const bed = await magnetic.loadBed("v7d");
    const metrics = magnetic.measureBed(bed);
    expect(metrics.name).toBe("BED-MAGNETIC-MOVES-v7d");
    expect(metrics.cues).toEqual(magnetic.CUES);
    expect(bed.gains).toEqual(prior.gains);
    expect(bed.duckDb).toBe(0);
    expect(metrics.sources.hat).toBe("v8lib-cc0");
    expect(metrics.sources.pluck).toBe("mill-filter-pluck");
    expect(metrics.sources.kick).toBe("v7");
    expect(metrics.sources.stab).toBe("v7");
    expect(bed.voiceMatch.hatScale).toBeGreaterThan(0);
    expect(bed.voiceMatch.pluckScale).toBeGreaterThan(0);
    for (const name of ["pad", "kick", "clap", "stab", "sub", "mid"]) {
      expect(sameStem(bed.stems[name], prior.stems[name]), name).toBe(true);
    }
    expect(changed(bed.stems.hat, prior.stems.hat)).toBe(true);
    expect(changed(bed.stems.pluck, prior.stems.pluck)).toBe(true);
    expect(bed.stems.hatClosed.some((sample) => Math.abs(sample) > 0)).toBe(true);
    expect(bed.stems.hatOpen.some((sample) => Math.abs(sample) > 0)).toBe(true);
    const hit = pro.renderFilterPluck(pro.SAMPLE_RATE, 440);
    const attack = hit.subarray(0, Math.floor(0.02 * pro.SAMPLE_RATE));
    expect(pro.spectralCentroid(attack, pro.SAMPLE_RATE)).toBeLessThan(2800);
    let early = 0;
    const earlyN = Math.floor(0.002 * pro.SAMPLE_RATE);
    for (let i = 0; i < earlyN; i++) early = Math.max(early, Math.abs(hit[i]));
    let peak = 0;
    for (let i = 0; i < hit.length; i++) peak = Math.max(peak, Math.abs(hit[i]));
    expect(early).toBeLessThan(peak * 0.45);
    const closed = bed.stems.hatClosed;
    let i0 = 0;
    for (let i = 0; i < closed.length; i++) {
      if (Math.abs(closed[i]) > 0.01) {
        i0 = i;
        break;
      }
    }
    const slice = closed.subarray(i0, i0 + Math.floor(0.016 * bed.sampleRate));
    const peaks = pro.topPeaks(slice, bed.sampleRate, 4, 1000, 12000);
    expect(peaks.length).toBeGreaterThan(2);
    if (peaks.length > 1) expect(peaks[0].mag / peaks[1].mag).toBeLessThan(2.5);
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
  }, 60000);
});
