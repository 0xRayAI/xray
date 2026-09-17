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

describe('foundry blip-vibe — plant seat', () => {
  it('fastens blip-vibe next to blip + blip-inspect (not costume)', () => {
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/blip-vibe/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/blip-vibe.yml'))).toBe(true);
    expect(read('scripts/foundry/plant/skills/blip-vibe/SKILL.md')).toMatch(/Ship bar is 8/);
    expect(read('scripts/foundry/plant/skills/blip-vibe/SKILL.md')).toMatch(/cool factor/i);
    expect(read('scripts/foundry/plant/skills/blip-vibe/SKILL.md')).not.toMatch(/\bhangar\b/i);
    expect(read('scripts/foundry/plant/agents/blip-vibe.yml')).toMatch(/mode: subagent/);
    expect(read('scripts/foundry/blip.mjs')).toMatch(/vibe/);
    expect(read('scripts/foundry/cli.mjs')).toMatch(/blip render\|inspect\|vibe/);

    const { FACTORY_PLANT_CATALOG } = requireCjs(
      path.join(root, 'scripts/foundry/mint-suit.cjs'),
    ) as { FACTORY_PLANT_CATALOG: { blip: { skills: string[]; agents: string[] } } };
    expect(FACTORY_PLANT_CATALOG.blip.skills).toEqual(['blip', 'blip-inspect', 'blip-vibe']);
    expect(FACTORY_PLANT_CATALOG.blip.agents).toEqual(['blip.yml', 'blip-inspect.yml', 'blip-vibe.yml']);
  });

  it('mints the vibe agent on a blip seat', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => { blipPlant?: { skills: string[] } };
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-vibe-seat-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'tiny-video', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'blip' }, null, 2)}\n`);
      const inv = mintConsumerSuit(root, tmp, () => undefined);
      expect(inv.blipPlant?.skills).toEqual(['blip', 'blip-inspect', 'blip-vibe']);
      expect(existsSync(path.join(tmp, '.opencode/skills/blip-vibe/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(tmp, '.opencode/agents/blip-vibe.yml'))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry blip-vibe — still + five + kapow must hit 8', () => {
  it('scores every type at or above the ship bar', { timeout: 180000 }, () => {
    const { SPIKE_POW, OUTER_FAT, WORD, OUTER_SPIKES_MIN, INNER_SPIKES_MIN } = requireCjs(
      path.join(root, 'scripts/foundry/blip-kapow.cjs'),
    ) as {
      SPIKE_POW: number;
      OUTER_FAT: number;
      WORD: string;
      OUTER_SPIKES_MIN: number;
      INNER_SPIKES_MIN: number;
    };
    expect(WORD).toBe('KAPOW!');
    expect(SPIKE_POW).toBeGreaterThanOrEqual(3.2);
    expect(OUTER_FAT).toBeLessThanOrEqual(0.38);
    expect(OUTER_SPIKES_MIN).toBeLessThanOrEqual(10);
    expect(INNER_SPIKES_MIN).toBeLessThanOrEqual(8);
    expect(OUTER_SPIKES_MIN).toBeGreaterThanOrEqual(6);

    const { vibeMatrix, SHIP_BAR, TYPES } = requireCjs(
      path.join(root, 'scripts/foundry/blip-vibe.cjs'),
    ) as {
      vibeMatrix: () => {
        status: string;
        score: number;
        failed: number;
        types: string[];
        byType: Record<string, { status: string; score: number }>;
        seats: Array<{ type: string; status: string; score: number; fails: string[] }>;
      };
      SHIP_BAR: number;
      TYPES: string[];
    };
    expect(SHIP_BAR).toBe(8);
    expect(TYPES).toEqual(['still', 'orb', 'swirl', 'snap', 'waves', 'spark', 'kapow']);
    const report = vibeMatrix();
    expect(report.types).toEqual(TYPES);
    expect(report.failed, JSON.stringify(report.seats)).toBe(0);
    expect(report.status).toBe('PASS');
    expect(report.score).toBeGreaterThanOrEqual(8);
    expect(report.seats.every((s) => s.status === 'PASS' && s.score >= 8)).toBe(true);
    expect(TYPES.every((type) => report.byType[type]?.status === 'PASS' && report.byType[type].score >= 8)).toBe(
      true,
    );
  });

  it('writes a vibe receipt and the CLI advertises vibe', () => {
    const { writeVibeReceipt } = requireCjs(path.join(root, 'scripts/foundry/blip-vibe.cjs')) as {
      writeVibeReceipt: (dir: string, report: Record<string, unknown>) => string;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-vibe-'));
    try {
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      const dest = writeVibeReceipt(tmp, { kind: 'blip-vibe', agent: 'blip-vibe', status: 'PASS', score: 8.4 });
      expect(existsSync(dest)).toBe(true);
      expect(readFileSync(dest, 'utf8')).toMatch(/blip-vibe/);
      const cli = spawnSync(
        process.execPath,
        [path.join(root, 'scripts/foundry/cli.js'), 'blip', '--help'],
        { cwd: tmp, encoding: 'utf8', env: { ...process.env, FOUNDRY_ROOT: tmp } },
      );
      expect(cli.status, `${cli.stdout}${cli.stderr}`).toBe(0);
      expect(cli.stdout).toMatch(/vibe/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry blip-vibe — docs', () => {
  it('names the vibe seat in plant docs and mill CI', () => {
    expect(read('AGENTS.md')).toMatch(/blip-vibe/);
    expect(read('AGENTS-consumer.md')).toMatch(/blip-vibe/);
    expect(read('scripts/foundry/README.md')).toMatch(/blip vibe/);
    expect(read('.github/workflows/mill-ci.yml')).toContain('foundry-blip-vibe.test.ts');
    expect(read('.github/workflows/enforce-version-compliance.yml')).toContain(
      'foundry-blip-vibe.test.ts',
    );
  });
});
