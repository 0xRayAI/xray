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
  stems: Record<string, Float64Array>;
};

type Metrics = {
  name: string;
  pass: boolean;
  fails: string[];
  earReady: boolean;
  lufs: number;
  truePeakDb: number;
  sources: Record<string, string>;
  rules: { pass: boolean; fails: string[]; checks: Check[] };
  reference: { pass: boolean; audioStored: boolean; measured: { lowShare30to120: number } };
};

type Magnetic = {
  loadBed: (variant: string) => Promise<Bed>;
  measureBed: (bed: Bed) => Metrics;
};

type Pro = {
  renderFilterPluckAttack: (sampleRate: number, freq: number) => Float64Array;
  applyBiquad: (samples: Float64Array, type: string, freq: number, q: number, sampleRate: number) => Float64Array;
  SAMPLE_RATE: number;
};

const magnetic = requireCjs(path.join(root, "scripts/foundry/sound-magnetic.cjs")) as Magnetic;
const pro = requireCjs(path.join(root, "scripts/foundry/sound-pro.cjs")) as Pro;

function sameStem(a: Float64Array, b: Float64Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function rms(samples: Float64Array, sampleRate: number, start: number, end: number): number {
  const i0 = Math.floor(start * sampleRate);
  const i1 = Math.min(samples.length, Math.floor(end * sampleRate));
  let acc = 0;
  const n = Math.max(1, i1 - i0);
  for (let i = i0; i < i1; i++) acc += samples[i] * samples[i];
  return Math.sqrt(acc / n);
}

function sineShare(samples: Float64Array, sampleRate: number, freq: number): number {
  let acc = 0;
  let sin = 0;
  let cos = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const w = samples[i];
    acc += w * w;
    sin += w * Math.sin(2 * Math.PI * freq * t);
    cos += w * Math.cos(2 * Math.PI * freq * t);
  }
  if (!(acc > 0)) return 0;
  return (2 * (sin * sin + cos * cos) / samples.length) / acc;
}

function bandShare(samples: Float64Array, sampleRate: number): number {
  const high = pro.applyBiquad(samples, "highpass", 2000, 0.707, sampleRate);
  const band = pro.applyBiquad(high, "lowpass", 8000, 0.707, sampleRate);
  let all = 0;
  let top = 0;
  for (let i = 0; i < samples.length; i++) {
    all += samples[i] * samples[i];
    top += band[i] * band[i];
  }
  return all > 0 ? top / all : 0;
}

describe("BED-MAGNETIC-MOVES-v7e", () => {
  it("keeps v7d and lengthens the open hat and the pluck attack", async () => {
    const prior = await magnetic.loadBed("v7d");
    const bed = await magnetic.loadBed("v7e");
    const metrics = magnetic.measureBed(bed);
    expect(metrics.name).toBe("BED-MAGNETIC-MOVES-v7e");
    expect(bed.gains).toEqual(prior.gains);
    expect(bed.duckDb).toBe(0);
    expect(metrics.sources.hat).toBe("v8lib-cc0");
    expect(metrics.sources.pluck).toBe("mill-filter-pluck-attack");
    for (const name of ["pad", "kick", "clap", "stab", "sub", "mid", "hatClosed"]) {
      expect(sameStem(bed.stems[name], prior.stems[name]), name).toBe(true);
    }
    expect(sameStem(bed.stems.hatOpen, prior.stems.hatOpen)).toBe(false);
    expect(sameStem(bed.stems.pluck, prior.stems.pluck)).toBe(false);
    const late = rms(bed.stems.hatOpen, bed.sampleRate, 14.55, 14.75);
    const priorLate = rms(prior.stems.hatOpen, prior.sampleRate, 14.55, 14.75);
    expect(late).toBeGreaterThan(priorLate * 4);
    const pluckRms = rms(bed.stems.pluck, bed.sampleRate, 2.6, 15.4);
    const priorRms = rms(prior.stems.pluck, prior.sampleRate, 2.6, 15.4);
    const ratio = pluckRms / priorRms;
    expect(ratio).toBeGreaterThan(0.89);
    expect(ratio).toBeLessThan(1.12);
    const hit = pro.renderFilterPluckAttack(pro.SAMPLE_RATE, 196);
    const attack = hit.subarray(0, Math.floor(0.04 * pro.SAMPLE_RATE));
    expect(sineShare(attack, pro.SAMPLE_RATE, 196)).toBeLessThan(0.3);
    expect(bandShare(attack, pro.SAMPLE_RATE)).toBeGreaterThan(0.4);
    const body = hit.subarray(Math.floor(0.08 * pro.SAMPLE_RATE), Math.floor(0.15 * pro.SAMPLE_RATE));
    expect(sineShare(body, pro.SAMPLE_RATE, 196)).toBeGreaterThan(0.4);
    expect(bandShare(body, pro.SAMPLE_RATE)).toBeLessThan(0.1);
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
  }, 90000);
});
