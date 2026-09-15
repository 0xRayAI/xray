import { createRequire } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const repoRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const {
  inspectSeat,
  formatReport,
  parseArgs,
  FACTORY_SHOPS,
} = requireCjs(path.join(repoRoot, 'grok-bot/lib/seat-ready.cjs')) as {
  inspectSeat: (
    root: string,
    opts?: { skipLive?: boolean; home?: string; fetch?: typeof fetch },
  ) => Promise<{
    ready: boolean;
    mill: { ok: boolean };
    hangar: { ok: boolean; planted: string[] };
    ows: { ok: boolean };
    clearing: { ok?: boolean; skipped?: boolean };
    next: string[];
  }>;
  formatReport: (report: { ready: boolean; mill: { ok: boolean }; hangar: { ok: boolean; planted: string[] }; ows: { ok: boolean }; clearing: { skipped?: boolean; ok?: boolean }; next: string[] }) => string;
  parseArgs: (argv: string[]) => { skipLive: boolean; json: boolean; cwd: string | null };
  FACTORY_SHOPS: string[];
};

function plantSkill(root: string, floorRel: string, name: string) {
  const dir = path.join(root, floorRel, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), `${name}\n`);
}

describe('grok-bot seat ready', () => {
  it('parseArgs reads skip-live json cwd', () => {
    expect(parseArgs(['--skip-live', '--json', '--cwd', '/tmp/seat'])).toEqual({
      skipLive: true,
      json: true,
      cwd: '/tmp/seat',
      home: null,
    });
  });

  it('empty project is not ready and names mill next', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'grok-bot-ready-empty-'));
    try {
      writeFileSync(path.join(tmp, 'package.json'), `${JSON.stringify({ name: 'seat' }, null, 2)}\n`);
      const report = await inspectSeat(tmp, {
        skipLive: true,
        home: path.join(tmp, 'no-ows-home'),
      });
      expect(report.ready).toBe(false);
      expect(report.mill.ok).toBe(false);
      expect(report.next.join('\n')).toMatch(/mint --skip-live/);
      expect(formatReport(report)).toMatch(/A friend would hear:/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('mill+inspect on disk is ready; hangar and OWS stay next', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'grok-bot-ready-mill-'));
    try {
      writeFileSync(path.join(tmp, 'package.json'), `${JSON.stringify({ name: 'forge-suit' }, null, 2)}\n`);
      plantSkill(tmp, '.opencode/skills', 'mill');
      plantSkill(tmp, '.opencode/skills', 'inspect');
      const home = path.join(tmp, 'home');
      mkdirSync(path.join(home, '.ows'), { recursive: true });
      const report = await inspectSeat(tmp, { skipLive: true, home });
      expect(report.ready).toBe(true);
      expect(report.mill.ok).toBe(true);
      expect(report.hangar.ok).toBe(false);
      expect(report.ows.ok).toBe(true);
      expect(report.next.join('\n')).toMatch(/npx groover-hangar/);
      expect(report.next.join('\n')).toMatch(/402/);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('factory shops planted counts hangar ok', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'grok-bot-ready-hangar-'));
    try {
      writeFileSync(path.join(tmp, 'package.json'), `${JSON.stringify({ name: 'magnet-suit' }, null, 2)}\n`);
      plantSkill(tmp, '.opencode/skills', 'mill');
      plantSkill(tmp, '.opencode/skills', 'inspect');
      for (const name of FACTORY_SHOPS) {
        plantSkill(tmp, '.opencode/skills', name);
      }
      const report = await inspectSeat(tmp, {
        skipLive: true,
        home: path.join(tmp, 'no-ows'),
      });
      expect(report.hangar.ok).toBe(true);
      expect(report.hangar.planted).toEqual(FACTORY_SHOPS);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('CLI ready --skip-live --json exits 1 on empty cwd', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'grok-bot-ready-cli-'));
    try {
      writeFileSync(path.join(tmp, 'package.json'), `${JSON.stringify({ name: 'empty-seat' }, null, 2)}\n`);
      const r = spawnSync(process.execPath, ['grok-bot/bin/grok-bot.js', 'ready', '--skip-live', '--json', '--cwd', tmp], {
        cwd: repoRoot,
        encoding: 'utf8',
      });
      expect(r.status).toBe(1);
      const parsed = JSON.parse(r.stdout) as { kind: string; ready: boolean };
      expect(parsed.kind).toBe('grok-bot-ready');
      expect(parsed.ready).toBe(false);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('doctor is an alias of ready', () => {
    const bin = path.join(repoRoot, 'grok-bot/bin/grok-bot.js');
    expect(existsSync(bin)).toBe(true);
    const help = spawnSync(process.execPath, [bin, '--help'], { encoding: 'utf8' });
    expect(help.status).toBe(0);
    expect(help.stdout).toMatch(/ready \| doctor/);
    expect(help.stdout).toMatch(/A friend would hear:/);
  });
});
