import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function read(rel: string): string {
  return readFileSync(path.join(root, rel), 'utf8');
}

describe('foundry sound-mixer — plant seat', () => {
  it('fastens sound-mixer next to sound + sound-inspect (not costume)', () => {
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/sound-mixer/SKILL.md'))).toBe(
      true,
    );
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/sound-mixer.yml'))).toBe(true);
    expect(read('scripts/foundry/plant/skills/sound-mixer/SKILL.md')).toMatch(/every genre/i);
    expect(read('scripts/foundry/plant/skills/sound-mixer/SKILL.md')).toMatch(/plate/);
    expect(read('scripts/foundry/plant/skills/sound-mixer/SKILL.md')).not.toMatch(/\bhangar\b/i);
    expect(read('scripts/foundry/plant/agents/sound-mixer.yml')).toMatch(/mode: subagent/);
    expect(read('scripts/foundry/sound.mjs')).toMatch(/mix/);
    expect(read('scripts/foundry/cli.mjs')).toMatch(/sound render\|inspect\|mix/);

    const { FACTORY_PLANT_CATALOG } = requireCjs(
      path.join(root, 'scripts/foundry/mint-suit.cjs'),
    ) as { FACTORY_PLANT_CATALOG: { sound: { skills: string[]; agents: string[] } } };
    expect(FACTORY_PLANT_CATALOG.sound.skills).toEqual([
      'sound',
      'sound-inspect',
      'sound-mixer',
    ]);
    expect(FACTORY_PLANT_CATALOG.sound.agents).toEqual([
      'sound.yml',
      'sound-inspect.yml',
      'sound-mixer.yml',
    ]);
  });

  it('mints the mixer agent on a sound seat', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => { soundPlant?: { skills: string[] } };
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-sound-mixer-seat-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'dist-beds', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(
        path.join(tmp, 'foundry.json'),
        `${JSON.stringify({ plant: 'sound' }, null, 2)}\n`,
      );
      const inv = mintConsumerSuit(root, tmp, () => undefined);
      expect(inv.soundPlant?.skills).toEqual(['sound', 'sound-inspect', 'sound-mixer']);
      expect(existsSync(path.join(tmp, '.opencode/skills/sound-mixer/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(tmp, '.opencode/agents/sound-mixer.yml'))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry sound-mixer — levels every variation', () => {
  it('enumerates six bodies × tempos × motif roots plus unlock, and the matrix PASSes', { timeout: 120000 }, () => {
    const { MIXER } = requireCjs(path.join(root, 'scripts/foundry/sound-rippel.cjs')) as {
      MIXER: {
        plateFeedback: number;
        plateSend: number;
        hatGainHot: number;
        glueThresholdDb: number;
      };
    };
    expect(MIXER.plateSend).toBeLessThan(0.08);
    expect(MIXER.plateFeedback).toBeLessThan(0.4);
    expect(MIXER.hatGainHot).toBeLessThan(0.7);
    expect(MIXER.glueThresholdDb).toBeLessThan(-16);

    const {
      enumerateSeats,
      mixMatrix,
      GENRE_IDS,
      ROOTS,
      MIX_GATES,
    } = requireCjs(path.join(root, 'scripts/foundry/sound-mixer.cjs')) as {
      enumerateSeats: () => Array<{ genre: string; lock: boolean; tempoIdx: number; root: number }>;
      mixMatrix: () => {
        status: string;
        counted: number;
        failed: number;
        seats: Array<{ status: string; genre: string; lock: boolean; fails: string[] }>;
      };
      GENRE_IDS: string[];
      ROOTS: number[];
      MIX_GATES: { peakMax: number; hatAirMax: number; stanzaMin: number; maskMin: number };
    };
    expect(GENRE_IDS).toEqual(['ambient', 'techno', 'jazz', 'phonk', 'rock', 'timeless']);
    expect(ROOTS).toEqual([0, 2, 4]);
    const seats = enumerateSeats();
    expect(seats).toHaveLength(6 * 3 * 3 + 6);
    expect(seats.filter((s) => s.lock)).toHaveLength(54);
    expect(MIX_GATES.peakMax).toBeLessThan(0.95);
    expect(MIX_GATES.hatAirMax).toBeLessThan(0.02);
    expect(MIX_GATES.stanzaMin).toBeGreaterThan(1);
    expect(MIX_GATES.maskMin).toBeGreaterThan(0.1);

    const report = mixMatrix();
    expect(report.counted).toBe(60);
    expect(report.failed, JSON.stringify(report.seats.filter((s) => s.status === 'FAIL'))).toBe(0);
    expect(report.status).toBe('PASS');
    expect(report.seats.every((s) => s.status === 'PASS')).toBe(true);
  });

  it('writes a mix receipt and the CLI advertises mix', () => {
    const { writeMixReceipt } = requireCjs(path.join(root, 'scripts/foundry/sound-mixer.cjs')) as {
      writeMixReceipt: (dir: string, report: Record<string, unknown>) => string;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-sound-mix-'));
    try {
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      const dest = writeMixReceipt(tmp, { kind: 'sound-mix', agent: 'sound-mixer', status: 'PASS' });
      expect(existsSync(dest)).toBe(true);
      expect(readFileSync(dest, 'utf8')).toMatch(/sound-mixer/);
      const cli = spawnSync(
        process.execPath,
        [path.join(root, 'scripts/foundry/cli.js'), 'sound', '--help'],
        { cwd: tmp, encoding: 'utf8', env: { ...process.env, FOUNDRY_ROOT: tmp } },
      );
      expect(cli.status, `${cli.stdout}${cli.stderr}`).toBe(0);
      expect(cli.stdout).toMatch(/mix/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry sound-mixer — docs', () => {
  it('names the mixer seat in plant docs and mill CI', () => {
    expect(read('AGENTS.md')).toMatch(/sound-mixer/);
    expect(read('AGENTS-consumer.md')).toMatch(/sound-mixer/);
    expect(read('scripts/foundry/README.md')).toMatch(/sound mix/);
    expect(read('.github/workflows/mill-ci.yml')).toContain('foundry-sound-mixer.test.ts');
    expect(read('.github/workflows/enforce-version-compliance.yml')).toContain(
      'foundry-sound-mixer.test.ts',
    );
  });
});
