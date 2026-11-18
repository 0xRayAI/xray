import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const millRoot = path.join(root, 'scripts/foundry');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const plant = requireCjs(path.join(millRoot, 'mill-plant.cjs')) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const herald = requireCjs(path.join(millRoot, 'herald-write.cjs')) as any;
const HERALD = ['herald', 'herald-inspect', 'herald-write'];
const sorted = (a: string[] = []) => [...a].sort();

describe('foundry herald plant — resolve', () => {
  it('herald/write/brand land on the same @0xray/foundry plant; sound/blip/scout unchanged', () => {
    for (const token of ['herald', 'write', 'brand']) {
      const ref = plant.parsePlantRef(token);
      expect(ref.packageName).toBe('@0xray/foundry');
      expect(ref.plantId).toBe('herald');
    }
    expect(plant.parsePlantRef('scout').plantId).toBe('scout');
    expect(plant.parsePlantRef('sound').packageName).toBe('@0xray/blip');
    expect(plant.parsePlantRef('blip').plantId).toBe('blip');
    const files = plant.selectPlantFiles(millRoot, 'herald');
    expect(files.millOff).toBe(true);
    expect(sorted(files.skills)).toEqual(HERALD);
    expect(files.skills).not.toContain('scout');
    expect(files.skills).not.toContain('mill');
    expect(sorted(plant.selectPlantFiles(millRoot, 'scout').skills)).toEqual(['scout', 'scout-inspect', 'scout-look']);
    const body = readFileSync(path.join(millRoot, 'plant/skills/herald/SKILL.md'), 'utf8');
    expect(body).toMatch(/H-lane write\/brand/);
    expect(body).toMatch(/not the eng mill/i);
    expect(body).toMatch(/"plant": "herald", "costume": false/);
  });

  it('mints a herald seat with only herald skills', () => {
    const { mintConsumerSuit } = requireCjs(path.join(millRoot, 'mint-suit.cjs'));
    const seat = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-herald-seat-'));
    try {
      writeFileSync(path.join(seat, 'package.json'), '{"name":"herald-suit","version":"0.0.1"}\n');
      writeFileSync(path.join(seat, 'foundry.json'), '{"plant":"brand","costume":false}\n');
      const inv = mintConsumerSuit(root, seat, () => undefined);
      expect(inv.plant).toEqual(['herald']);
      expect(sorted(inv.plants?.herald?.skills)).toEqual(HERALD);
      expect(existsSync(path.join(seat, '.opencode/skills/mill/SKILL.md'))).toBe(false);
      expect(existsSync(path.join(seat, '.opencode/skills/herald-write/SKILL.md'))).toBe(true);
    } finally {
      rmSync(seat, { recursive: true, force: true });
    }
  });
});

describe('foundry herald plant — draft receipt', () => {
  it('fails closed on each gate and never sends', () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-herald-'));
    try {
      expect(herald.inspectWrite(tmp).reason).toBe('missing-receipt');
      const base = { root: tmp, brief: 'b', lane: 'H', friendHear: 'f', body: 'post' };
      expect(herald.draft({ ...base, brief: '' }).receipt.reason).toBe('missing-brief');
      expect(herald.draft({ ...base, lane: 'B' }).receipt.reason).toBe('lane');
      expect(herald.draft({ ...base, friendHear: '' }).receipt.reason).toBe('missing-friend-hear');
      const empty = herald.draft({ ...base, body: '' });
      expect(empty.receipt.reason).toBe('empty-body');
      expect(herald.inspectWrite(tmp).ok).toBe(false);
      const good = herald.draft(base);
      expect(good.receipt.status).toBe('PASS');
      expect(good.receipt.dist).toBe('HOLD');
      expect(good.receipt.sent).toBe(false);
      expect(herald.inspectWrite(tmp).ok).toBe(true);
      rmSync(path.join(tmp, '.xray/herald/draft.md'));
      expect(herald.inspectWrite(tmp).reason).toBe('missing-draft');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('herald CLI draft + inspect, and scout parseLook keeps the next flag (#871)', async () => {
    const tmp = mkdtempSync(path.join(os.tmpdir(), 'xray-foundry-herald-cli-'));
    try {
      const env = { ...process.env, FOUNDRY_ROOT: tmp };
      const cli = path.join(millRoot, 'cli.js');
      const d = spawnSync(process.execPath, [cli, 'herald', 'draft', '--brief', 'x', '--lane', 'H', '--friend-hear', 'y', '--body', 'z'], { cwd: tmp, encoding: 'utf8', env });
      expect(d.status, d.stdout + d.stderr).toBe(0);
      const i = spawnSync(process.execPath, [cli, 'herald', 'inspect'], { cwd: tmp, encoding: 'utf8', env });
      expect(i.status).toBe(0);
      expect(i.stdout).toMatch(/"HOLD"/);
      const { parseLook } = await import('../../../scripts/foundry/scout.mjs');
      const parsed = parseLook(['--topic', '--plane', 'dev', '--body', 'b']);
      expect(parsed.topic).toBe('');
      expect(parsed.plane).toBe('dev');
      expect(parsed.body).toBe('b');
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
