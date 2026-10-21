import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function load(rel: string): Record<string, unknown> {
  return requireCjs(path.join(root, rel)) as Record<string, unknown>;
}

type Peak = { hz: number; mag: number };
type Check = { id: string; pass: boolean; detail: Record<string, unknown> };
type Gap = { id: string; pass: boolean; bed: number; ref: number; delta: number };
type Measured = {
  rules: { pass: boolean; fails: string[]; checks: Check[]; foregroundMaxDb: number };
  reference: {
    pass: boolean;
    audioStored: boolean;
    fails: string[];
    gaps: Gap[];
    measured: { lowShare30to120: number; correlation: number };
    context: Array<{ id: string; gated: boolean }>;
  };
  earReady: boolean;
  pass: boolean;
};

describe('sound rules and reference metrics', () => {
  const rules = load('scripts/foundry/sound-rules.cjs');
  const reference = load('scripts/foundry/sound-reference.cjs');
  const magnetic = load('scripts/foundry/sound-magnetic.cjs');
  const harmonicEnough = rules.harmonicEnough as (peaks: Peak[]) => boolean;
  const renderBed = magnetic.renderBed as (variant: string) => unknown;
  const measureBed = magnetic.measureBed as (bed: unknown) => Measured;

  it('stores reference numbers and never an audio payload', () => {
    const file = path.join(root, 'scripts/foundry/sound-reference.json');
    const book = JSON.parse(readFileSync(file, 'utf8')) as {
      audioStored: boolean;
      primary: string;
      references: Array<{ id: string; freesound: string; band2to4Db: number | null }>;
    };
    expect(book.audioStored).toBe(false);
    expect(book.primary).toBe('session-recall');
    expect(book.references.map((row) => row.id)).toEqual([
      'session-recall',
      'bass-melodic-techno-122',
      'dub-techno-loop',
      'generic-edm-loop',
    ]);
    expect(book.references.map((row) => row.freesound)).toContain('thehorsevalse/693897');
    const raw = readFileSync(file, 'utf8');
    expect(raw).not.toContain('data:audio');
    expect(raw).not.toMatch(/\.wav|\.mp3|\.flac/);
    const loaded = (reference.loadBook as () => { audioStored: boolean })();
    expect(loaded.audioStored).toBe(false);
  });

  it('rejects an inharmonic bell and accepts a harmonic stack', () => {
    expect(harmonicEnough([
      { hz: 409, mag: 1 },
      { hz: 689, mag: 0.8 },
      { hz: 1238, mag: 0.6 },
      { hz: 323, mag: 0.5 },
    ])).toBe(false);
    expect(harmonicEnough([
      { hz: 210, mag: 1 },
      { hz: 420, mag: 0.45 },
      { hz: 630, mag: 0.18 },
    ])).toBe(true);
    expect(harmonicEnough([
      { hz: 210, mag: 1 },
      { hz: 333, mag: 0.02 },
    ])).toBe(true);
  });

  it('passes every sound rule on v6 and fails the v4b lessons', () => {
    const v6 = measureBed(renderBed('v6'));
    const v4 = measureBed(renderBed('v4b'));
    expect(v6.rules.pass, v6.rules.fails.join(', ')).toBe(true);
    expect(v6.rules.fails).toEqual([]);
    expect(v6.rules.foregroundMaxDb).toBe(3);
    expect(v6.rules.checks.map((row) => row.id)).toEqual([
      'noise', 'hiss', 'pump', 'percussion', 'bass', 'pad', 'width', 'top', 'foreground',
    ]);
    expect(v6.pass).toBe(true);
    expect(v4.pass).toBe(true);
    expect(v4.rules.pass).toBe(false);
    expect(v4.rules.fails).toEqual(['percussion', 'bass', 'pad', 'width', 'top']);
    const pump = v4.rules.checks.find((row) => row.id === 'pump');
    expect(pump?.pass).toBe(true);
    expect(v4.earReady).toBe(false);
  }, 60000);

  it('scores v6 against Session Recall and reports each gap', () => {
    const v6 = measureBed(renderBed('v6'));
    const v4 = measureBed(renderBed('v4b'));
    expect(v6.reference.audioStored).toBe(false);
    expect(v6.reference.context.every((row) => row.gated === false)).toBe(true);
    expect(v6.reference.context).toHaveLength(3);
    expect(v6.reference.fails).toEqual(['lowShare']);
    expect(v6.reference.pass).toBe(false);
    expect(v6.earReady).toBe(false);
    const low = v6.reference.gaps.find((row) => row.id === 'lowShare');
    expect(low?.pass).toBe(false);
    expect(low?.ref).toBeCloseTo(0.85, 2);
    expect(v6.reference.measured.lowShare30to120).toBeLessThan(0.65);
    expect(v4.reference.measured.lowShare30to120).toBeGreaterThan(0.9);
    const v4Low = v4.reference.gaps.find((row) => row.id === 'lowShare');
    expect(v4Low?.pass).toBe(true);
    expect(v4.reference.fails).toEqual(['sideUnderMid', 'band2to4', 'band4to8']);
    for (const id of ['lufs', 'crest', 'correlation', 'sideUnderMid', 'band2to4', 'band4to8']) {
      expect(v6.reference.gaps.find((row) => row.id === id)?.pass, id).toBe(true);
    }
  }, 60000);

  it('prints pass or fail for every rule and every reference gap', () => {
    const result = spawnSync(process.execPath, ['scripts/foundry/sound.mjs', 'gate', 'v6'], {
      cwd: root,
      encoding: 'utf8',
    });
    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout) as {
      name: string;
      earReady: boolean;
      rules: { pass: boolean; checks: Array<{ id: string; pass: boolean }> };
      reference: { pass: boolean; gaps: Gap[] };
    };
    expect(report.name).toBe('BED-MAGNETIC-MOVES-v6');
    expect(report.rules.pass).toBe(true);
    expect(report.rules.checks.every((row) => row.pass)).toBe(true);
    expect(report.reference.pass).toBe(false);
    expect(report.reference.gaps.find((row) => row.id === 'lowShare')?.pass).toBe(false);
    expect(report.earReady).toBe(false);
  }, 60000);
});
