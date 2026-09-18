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

const BLIP_SKILLS = ['blip', 'blip-inspect', 'blip-vibe', 'blip-looker'];
const BLIP_AGENTS = ['blip.yml', 'blip-inspect.yml', 'blip-vibe.yml', 'blip-looker.yml'];

describe('foundry blip-looker — plant seat', () => {
  it('fastens blip-looker next to blip + inspect + vibe (not costume)', () => {
    expect(existsSync(path.join(root, 'scripts/foundry/plant/skills/blip-looker/SKILL.md'))).toBe(true);
    expect(existsSync(path.join(root, 'scripts/foundry/plant/agents/blip-looker.yml'))).toBe(true);
    expect(read('scripts/foundry/plant/skills/blip-looker/SKILL.md')).toMatch(/Ship bar is 8/);
    expect(read('scripts/foundry/plant/skills/blip-looker/SKILL.md')).toMatch(/replay/i);
    expect(read('scripts/foundry/plant/skills/blip-looker/SKILL.md')).not.toMatch(/\bhangar\b/i);
    expect(read('scripts/foundry/plant/agents/blip-looker.yml')).toMatch(/mode: subagent/);
    expect(read('scripts/foundry/blip.mjs')).toMatch(/look/);
    expect(read('scripts/foundry/cli.mjs')).toMatch(/blip render\|inspect\|vibe\|look/);

    const { FACTORY_PLANT_CATALOG } = requireCjs(
      path.join(root, 'scripts/foundry/mint-suit.cjs'),
    ) as { FACTORY_PLANT_CATALOG: { blip: { skills: string[]; agents: string[] } } };
    expect(FACTORY_PLANT_CATALOG.blip.skills).toEqual(BLIP_SKILLS);
    expect(FACTORY_PLANT_CATALOG.blip.agents).toEqual(BLIP_AGENTS);
  });

  it('mints the looker agent on a blip seat', () => {
    const { mintConsumerSuit } = requireCjs(path.join(root, 'scripts/foundry/mint-suit.cjs')) as {
      mintConsumerSuit: (
        pkg: string,
        target: string,
        log: (...a: unknown[]) => void,
      ) => { blipPlant?: { skills: string[] } };
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-looker-seat-'));
    try {
      writeFileSync(
        path.join(tmp, 'package.json'),
        `${JSON.stringify({ name: 'tiny-video', version: '0.0.1' }, null, 2)}\n`,
      );
      writeFileSync(path.join(tmp, 'foundry.json'), `${JSON.stringify({ plant: 'blip' }, null, 2)}\n`);
      const inv = mintConsumerSuit(root, tmp, () => undefined);
      expect(inv.blipPlant?.skills).toEqual(BLIP_SKILLS);
      expect(existsSync(path.join(tmp, '.opencode/skills/blip-looker/SKILL.md'))).toBe(true);
      expect(existsSync(path.join(tmp, '.opencode/agents/blip-looker.yml'))).toBe(true);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry blip-looker — friend hitting replay must hit 8', () => {
  it('scores hook → jewel → hold on every type at or above the ship bar', { timeout: 180000 }, () => {
    const { lookerMatrix, SHIP_BAR, TYPES, LOOK_GATES } = requireCjs(
      path.join(root, 'scripts/foundry/blip-looker.cjs'),
    ) as {
      lookerMatrix: () => {
        status: string;
        score: number;
        failed: number;
        types: string[];
        byType: Record<string, { status: string; score: number }>;
        seats: Array<{ type: string; status: string; score: number; fails: string[] }>;
      };
      SHIP_BAR: number;
      TYPES: string[];
      LOOK_GATES: { punchMin: number; holdMin: number };
    };
    expect(SHIP_BAR).toBe(8);
    expect(LOOK_GATES.punchMin).toBeGreaterThan(1);
    expect(LOOK_GATES.holdMin).toBeGreaterThan(0.4);
    expect(TYPES).toEqual(['still', 'orb', 'swirl', 'snap', 'waves', 'spark', 'kapow']);
    const report = lookerMatrix();
    expect(report.types).toEqual(TYPES);
    expect(report.failed, JSON.stringify(report.seats.filter((s) => s.status === 'FAIL'))).toBe(0);
    expect(report.status).toBe('PASS');
    expect(report.score).toBeGreaterThanOrEqual(8);
    expect(report.seats.every((s) => s.status === 'PASS' && s.score >= 8)).toBe(true);
    expect(TYPES.every((type) => report.byType[type]?.status === 'PASS' && report.byType[type].score >= 8)).toBe(
      true,
    );
  });

  it('writes a looker receipt and the CLI advertises look', () => {
    const { writeLookerReceipt } = requireCjs(path.join(root, 'scripts/foundry/blip-looker.cjs')) as {
      writeLookerReceipt: (dir: string, report: Record<string, unknown>) => string;
    };
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-blip-looker-'));
    try {
      mkdirSync(path.join(tmp, '.xray'), { recursive: true });
      const dest = writeLookerReceipt(tmp, { kind: 'blip-looker', agent: 'blip-looker', status: 'PASS', score: 8.6 });
      expect(existsSync(dest)).toBe(true);
      expect(readFileSync(dest, 'utf8')).toMatch(/blip-looker/);
      const cli = spawnSync(
        process.execPath,
        [path.join(root, 'scripts/foundry/cli.js'), 'blip', '--help'],
        { cwd: tmp, encoding: 'utf8', env: { ...process.env, FOUNDRY_ROOT: tmp } },
      );
      expect(cli.status, `${cli.stdout}${cli.stderr}`).toBe(0);
      expect(cli.stdout).toMatch(/look/);
      expect(cli.stdout).toMatch(/replay/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe('foundry blip-looker — docs', () => {
  it('names the looker seat in plant docs and mill CI', () => {
    expect(read('AGENTS.md')).toMatch(/blip-looker/);
    expect(read('AGENTS-consumer.md')).toMatch(/blip-looker/);
    expect(read('scripts/foundry/README.md')).toMatch(/blip look/);
    expect(read('.github/workflows/mill-ci.yml')).toContain('foundry-blip-looker.test.ts');
    expect(read('.github/workflows/enforce-version-compliance.yml')).toContain(
      'foundry-blip-looker.test.ts',
    );
  });
});
