import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function load(rel: string): Record<string, unknown> {
  return requireCjs(path.join(root, rel)) as Record<string, unknown>;
}

describe('factory-sound pro voices', () => {
  it('keeps the blip bed exports and replaces the pumping pad', () => {
    const mill = load('scripts/foundry/sound-rippel.cjs');
    const blip = requireCjs(requireCjs.resolve('@0xray/blip/sound-rippel')) as {
      renderPad: (n: number, sr: number, freqs: number[], rng: () => number, attack: number) => Float64Array;
    };
    const envelopeSwingDb = mill.envelopeSwingDb as (
      samples: Float64Array,
      sr: number,
      start: number,
      end: number,
      win: number,
    ) => { swingDb: number };
    expect(typeof mill.renderMembrane).toBe('function');
    expect(typeof mill.sectionGain).toBe('function');
    expect(mill.MIX).toBe('crystal');
    const rippel = mill.RIPPEL as { technoKick: { octaves: number } };
    expect(rippel.technoKick.octaves).toBe(10);

    const sr = 44100;
    const n = sr * 2;
    const freqs = [261.6256, 311.127, 391.9954, 523.2511];
    const rng = () => 0.5;
    const renderPad = mill.renderPad as typeof blip.renderPad;
    const steady = renderPad(n, sr, freqs, rng, 0.05);
    const legacy = blip.renderPad(n, sr, freqs, rng, 0.05);
    const steadySwing = envelopeSwingDb(steady, sr, 0.4, 1.9, 0.03).swingDb;
    const legacySwing = envelopeSwingDb(legacy, sr, 0.4, 1.9, 0.03).swingDb;
    expect(steadySwing).toBeLessThan(2.5);
    expect(legacySwing).toBeGreaterThan(8);
    expect(legacySwing).toBeGreaterThan(steadySwing * 4);
  });

  it('ducks 3–5 dB and is back inside 60 ms', () => {
    const pro = load('scripts/foundry/sound-pro.cjs');
    const duckGain = pro.duckGain as (
      n: number,
      sr: number,
      times: number[],
      depthDb: number,
      attack: number,
      release: number,
    ) => Float64Array;
    const linDb = pro.linDb as (lin: number) => number;
    const dbLin = pro.dbLin as (db: number) => number;
    const sr = 44100;
    const depth = pro.DUCK_DB as number;
    const attack = pro.DUCK_ATTACK_SEC as number;
    const release = pro.DUCK_RELEASE_SEC as number;
    expect(depth).toBeGreaterThanOrEqual(3);
    expect(depth).toBeLessThanOrEqual(5);
    const gain = duckGain(sr, sr, [0.2], depth, attack, release);
    let min = 1;
    let minAt = 0;
    for (let i = 0; i < gain.length; i++) {
      if (gain[i] < min) {
        min = gain[i];
        minAt = i;
      }
    }
    expect(linDb(min)).toBeCloseTo(-depth, 5);
    const thresh = dbLin(-0.5);
    let backAt = gain.length;
    for (let i = minAt; i < gain.length; i++) {
      if (gain[i] >= thresh) {
        backAt = i;
        break;
      }
    }
    expect((backAt - Math.floor(0.2 * sr)) / sr).toBeLessThan(0.06);
    expect(attack + release).toBeLessThan(0.06);
  });

  it('builds a kick with no click layer', () => {
    const pro = load('scripts/foundry/sound-pro.cjs');
    const renderKickClean = pro.renderKickClean as (sr: number) => Float64Array;
    const hfRmsDb = pro.hfRmsDb as (samples: Float64Array, sr: number, cutoff: number) => number;
    const kick = renderKickClean(44100);
    expect(hfRmsDb(kick, 44100, 2000)).toBeLessThan(-40);
    const text = readFileSync(path.join(root, 'scripts/foundry/sound-pro.cjs'), 'utf8');
    expect(text).not.toContain('kickClick');
    expect(text).not.toContain('render808');
    expect(text).not.toContain('noiseLcg');
  });
});

describe('BED-MAGNETIC-MOVES v4', () => {
  const magnetic = load('scripts/foundry/sound-magnetic.cjs');
  const renderBed = magnetic.renderBed as (variant: string) => {
    seconds: number;
    sampleRate: number;
    duckDb: number;
    stems: { sub: Float64Array; kick: Float64Array; hat: Float64Array; pluck: Float64Array; stab: Float64Array };
  };
  const measureBed = magnetic.measureBed as (bed: ReturnType<typeof renderBed>) => {
    pass: boolean;
    fails: string[];
    lufs: number;
    truePeakDb: number;
    seconds: number;
    duckDb: number;
    pad: { swings: { chord: { swingDb: number }; body: { swingDb: number } }; flatness: number };
    sub: { swings: { body: { swingDb: number }; across: { swingDb: number } }; flatness: number; subPeakHz: number };
    mid: { swings: { body: { swingDb: number } } } | null;
  };

  function expectGates(variant: 'v4a' | 'v4b') {
    const bed = renderBed(variant);
    const metrics = measureBed(bed);
    expect(metrics.fails, metrics.fails.join(', ')).toEqual([]);
    expect(metrics.pass).toBe(true);
    expect(metrics.seconds).toBeCloseTo(22.87, 5);
    expect(metrics.lufs).toBeGreaterThanOrEqual(-16);
    expect(metrics.lufs).toBeLessThanOrEqual(-14);
    expect(metrics.truePeakDb).toBeLessThanOrEqual(-1);
    expect(metrics.duckDb).toBeGreaterThanOrEqual(3);
    expect(metrics.duckDb).toBeLessThanOrEqual(5);
    expect(metrics.pad.swings.chord.swingDb).toBeLessThan(6);
    expect(metrics.pad.swings.body.swingDb).toBeLessThan(6);
    expect(metrics.sub.swings.body.swingDb).toBeLessThan(6);
    expect(metrics.sub.swings.across.swingDb).toBeLessThan(6);
    expect(metrics.pad.flatness).toBeLessThan(0.05);
    expect(metrics.sub.flatness).toBeLessThan(0.02);
    expect(metrics.sub.subPeakHz).toBeGreaterThan(40);
    expect(metrics.sub.subPeakHz).toBeLessThan(48);
    const rms = (samples: Float64Array) => {
      let acc = 0;
      for (let i = 0; i < samples.length; i++) acc += samples[i] * samples[i];
      return Math.sqrt(acc / samples.length);
    };
    if (variant === 'v4b') {
      expect(metrics.mid).not.toBeNull();
      expect(metrics.mid?.swings.body.swingDb).toBeLessThan(6);
      expect(rms(bed.stems.pluck)).toBeGreaterThan(0.05);
      expect(rms(bed.stems.stab)).toBeGreaterThan(0.02);
    } else {
      expect(rms(bed.stems.pluck)).toBe(0);
      expect(rms(bed.stems.stab)).toBe(0);
    }
  }

  it('renders the clean bed inside the loudness gates', () => {
    expectGates('v4a');
  }, 30000);

  it('renders the rich bed inside the loudness gates', () => {
    expectGates('v4b');
  }, 30000);

  it('does not schedule noise, a click, or an 808 glide', () => {
    const text = readFileSync(path.join(root, 'scripts/foundry/sound-magnetic.cjs'), 'utf8');
    expect(text).not.toContain('render808');
    expect(text).not.toContain('noiseLcg');
    expect(text).not.toContain('renderAirGlue');
    expect(text).not.toContain('kickClick');
    expect(text).toContain('renderFmPluck');
    expect(text).toContain('renderWarmStab');
  });

  it('renders v4a through the mill CLI', () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'magnetic-v4-'));
    const wav = path.join(dir, 'bed.wav');
    const metricsPath = path.join(dir, 'bed.json');
    try {
      const result = spawnSync(
        process.execPath,
        [path.join(root, 'scripts/foundry/sound.mjs'), 'bed', 'v4a', '--out', wav, '--metrics', metricsPath],
        { encoding: 'utf8' },
      );
      expect(result.status).toBe(0);
      const metrics = JSON.parse(readFileSync(metricsPath, 'utf8')) as { pass: boolean; lufs: number; truePeakDb: number };
      expect(metrics.pass).toBe(true);
      expect(metrics.lufs).toBeGreaterThanOrEqual(-16);
      expect(metrics.lufs).toBeLessThanOrEqual(-14);
      expect(metrics.truePeakDb).toBeLessThanOrEqual(-1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, 30000);
});

describe('BED-MAGNETIC-MOVES v5', () => {
  const pro = load('scripts/foundry/sound-pro.cjs');
  const magnetic = load('scripts/foundry/sound-magnetic.cjs');

  type Levels = {
    clapUnderKickDb: number;
    '7-9': { clap: number; kick: number; bass: number; sub: number; mid: number };
    '17-19': { bass: number; bassPeak: number; sub: number; mid: number };
    '5.4-7.4': { bass: number; bassPeak: number };
  };

  type Metrics = {
    pass: boolean;
    fails: string[];
    lufs: number;
    truePeakDb: number;
    seconds: number;
    bassQuietShare: number | null;
    levels: Levels;
    pad: { swings: { chord: { swingDb: number }; body: { swingDb: number }; final: { swingDb: number } } };
  };

  const renderBed = magnetic.renderBed as (variant: string) => {
    stems: { pluck: Float64Array; stab: Float64Array; sub: Float64Array };
  };
  const measureBed = magnetic.measureBed as (bed: ReturnType<typeof renderBed>) => Metrics;

  it('keeps the snap harmonic, short, and free of the bell partial', () => {
    const renderSnap = pro.renderSnap as (sr: number) => Float64Array;
    const topPeaks = pro.topPeaks as (
      samples: Float64Array,
      sr: number,
      count: number,
      lo: number,
      hi: number,
    ) => { hz: number; mag: number }[];
    const linDb = pro.linDb as (lin: number) => number;
    const samplePeak = pro.samplePeak as (samples: Float64Array) => number;
    const snap = renderSnap(44100);
    const peaks = topPeaks(snap, 44100, 4, 80, 2000);
    expect(peaks[0].hz).toBeGreaterThan(180);
    expect(peaks[0].hz).toBeLessThan(250);
    expect(peaks.some((peak) => peak.hz > 380 && peak.hz < 700)).toBe(true);
    expect(peaks.some((peak) => peak.hz > 250 && peak.hz < 320)).toBe(false);
    const peak = samplePeak(snap);
    const tailStart = Math.floor(0.035 * 44100);
    let tail = 0;
    for (let i = tailStart; i < snap.length; i++) tail = Math.max(tail, Math.abs(snap[i]));
    expect(linDb(tail / Math.max(peak, 1e-12))).toBeLessThan(-18);
    expect(snap.length / 44100).toBeLessThan(0.05);
  });

  it('puts the clean snap under the kick and shortens the 7–9 s clap', () => {
    const v5 = measureBed(renderBed('v5a'));
    const v4 = measureBed(renderBed('v4a'));
    expect(v5.fails, v5.fails.join(', ')).toEqual([]);
    expect(v5.pass).toBe(true);
    expect(v5.lufs).toBeGreaterThanOrEqual(-16);
    expect(v5.lufs).toBeLessThanOrEqual(-14);
    expect(v5.truePeakDb).toBeLessThanOrEqual(-1);
    expect(v5.seconds).toBeCloseTo(22.87, 5);
    expect(v5.pad.swings.body.swingDb).toBeLessThan(6);
    expect(v5.pad.swings.chord.swingDb).toBeLessThan(6);
    expect(v5.pad.swings.final.swingDb).toBeLessThan(6);
    expect(v5.levels.clapUnderKickDb).toBeGreaterThanOrEqual(10);
    expect(v5.levels['7-9'].clap).toBeLessThan(v4.levels['7-9'].clap);
    expect(v5.levels['7-9'].clap).toBeLessThan(v5.levels['7-9'].kick - 8);
    expect(v5.bassQuietShare).not.toBeNull();
    expect(v5.bassQuietShare ?? 0).toBeGreaterThan(0.3);
    expect(v5.levels['17-19'].bass).toBeLessThanOrEqual(v5.levels['5.4-7.4'].bass + 0.4);
    expect(v5.levels['17-19'].bass).toBeLessThan(v4.levels['17-19'].bass);
  }, 60000);

  it('rebuilds the rich final bass as notes instead of a hum', () => {
    const v5 = measureBed(renderBed('v5b'));
    const v4 = measureBed(renderBed('v4b'));
    expect(v5.fails, v5.fails.join(', ')).toEqual([]);
    expect(v5.pass).toBe(true);
    expect(v5.lufs).toBeGreaterThanOrEqual(-16);
    expect(v5.lufs).toBeLessThanOrEqual(-14);
    expect(v5.truePeakDb).toBeLessThanOrEqual(-1);
    expect(v5.levels.clapUnderKickDb).toBeGreaterThanOrEqual(10);
    expect(v5.levels['17-19'].bass).toBeLessThanOrEqual(v5.levels['5.4-7.4'].bass + 0.4);
    expect(v5.levels['17-19'].bassPeak).toBeLessThanOrEqual(v5.levels['5.4-7.4'].bassPeak + 1);
    expect(v5.levels['17-19'].bass).toBeLessThan(v4.levels['17-19'].bass);
    expect(v5.levels['17-19'].mid).toBeGreaterThan(-80);
    expect(v4.levels['17-19'].sub - v5.levels['17-19'].sub).toBeGreaterThan(3);
    expect(v5.bassQuietShare ?? 0).toBeGreaterThan(0.3);
    const rms = (samples: Float64Array) => {
      let acc = 0;
      for (let i = 0; i < samples.length; i++) acc += samples[i] * samples[i];
      return Math.sqrt(acc / samples.length);
    };
    expect(rms(renderBed('v5b').stems.pluck)).toBeGreaterThan(0);
    expect(rms(renderBed('v5a').stems.pluck)).toBe(0);
  }, 90000);

  it('does not add a noise layer to the v5 voices', () => {
    const text = readFileSync(path.join(root, 'scripts/foundry/sound-pro.cjs'), 'utf8');
    expect(text).toContain('function renderSnap');
    expect(text).toContain('function renderBassNote');
    expect(text).not.toContain('noiseLcg');
    expect(text).not.toContain('kickClick');
    expect(text).not.toContain('render808');
  });
});
