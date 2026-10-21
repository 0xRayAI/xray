import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const solo = requireCjs(path.join(root, "scripts/foundry/tick-solo.cjs")) as {
  HAS_TICK: string[];
  LACKS_TICK: string[];
  SOLO_SECONDS: number;
  BEAT: number;
  isolateSineTick: (sampleRate: number) => Float64Array;
  isolateV6Tick: (sampleRate: number) => Float64Array;
  renderTickSolo: (hit: Float64Array) => Float64Array;
};
const pro = requireCjs(path.join(root, "scripts/foundry/sound-pro.cjs")) as {
  SAMPLE_RATE: number;
  topPeaks: (samples: Float64Array, sampleRate: number, count: number, lo: number, hi: number) => { hz: number }[];
  samplePeak: (samples: Float64Array) => number;
  dbLin: (db: number) => number;
};

describe("kick tick solo", () => {
  it("is the 2.8 kHz sine on v6 through v7c and absent before that", () => {
    expect(solo.HAS_TICK).toEqual(["v6", "v7", "v7b", "v7c"]);
    expect(solo.LACKS_TICK).toEqual(["v4a", "v4b", "v5a", "v5b", "v9", "v8lib"]);
    const sr = pro.SAMPLE_RATE;
    const tick = solo.isolateSineTick(sr);
    const v6 = solo.isolateV6Tick(sr);
    const n = Math.min(tick.length, v6.length, Math.floor(0.01 * sr));
    for (let i = 0; i < n; i++) expect(v6[i]).toBeCloseTo(tick[i], 8);
    const span = tick.subarray(0, Math.floor(0.012 * sr));
    const peakHz = pro.topPeaks(span, sr, 1, 400, 8000)[0].hz;
    expect(peakHz).toBeGreaterThan(2700);
    expect(peakHz).toBeLessThan(2900);
    const peak = pro.samplePeak(tick);
    const floor = peak * pro.dbLin(-20);
    let last = 0;
    for (let i = 0; i < tick.length; i++) if (Math.abs(tick[i]) >= floor) last = i;
    expect(last / sr).toBeLessThan(0.008);
    const pattern = solo.renderTickSolo(tick);
    expect(pattern.length / sr).toBeCloseTo(solo.SOLO_SECONDS, 5);
    expect(Math.abs(pattern[0])).toBeLessThan(1e-4);
    const atBeat = Math.floor(solo.BEAT * sr);
    expect(Math.abs(pattern[atBeat + 20])).toBeGreaterThan(0.05);
    const gap = Math.floor(solo.BEAT * sr * 0.5);
    expect(Math.abs(pattern[gap])).toBeLessThan(1e-6);
  });
});
