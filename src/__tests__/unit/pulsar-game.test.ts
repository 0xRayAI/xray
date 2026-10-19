import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const bin = path.join(root, 'grok-bot', 'bin', 'grok-bot.js');
const gamePath = path.join(root, 'grok-bot', 'lib', 'pulsar-game.mjs');

const game = await import(gamePath);

function ledgerFile(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'pulsar-'));
  return path.join(dir, 'house', 'arcade', 'pulsar-hold.json');
}

describe('pulsar range', () => {
  it('keeps the charge word out of the module and the help card', () => {
    const src = readFileSync(gamePath, 'utf8');
    expect(src).not.toContain('fetch(');
    expect(src).not.toContain('LIVE_URL');
    expect(src).not.toContain('governWithSolar');
    expect(src).not.toContain('govern_with_solar');
    expect(src).not.toContain('http://');
    expect(src).not.toContain('https://');
    expect(game.CHARGE_SHA256).toMatch(/^[a-f0-9]{64}$/);
    expect(game.chargeDigest('')).not.toBe(game.CHARGE_SHA256);
    expect(game.chargeDigest('pulsar')).not.toBe(game.CHARGE_SHA256);
    const { usageText } = require(path.join(root, 'grok-bot', 'lib', 'seat-doctor.cjs')) as {
      usageText: (dir: string) => string;
    };
    expect(usageText(path.join(root, 'grok-bot'))).not.toContain('range');
  });

  it('a miss does not open a ledger', () => {
    const ledgerPath = ledgerFile();
    const result = game.claimPulsar({
      charge: 'nope',
      seat: 'forge',
      now: Date.parse('2026-10-19T18:00:00Z'),
      ledgerPath,
    });
    expect(result.ok).toBe(false);
    expect(result.say).toContain('Miss');
    expect(() => readFileSync(ledgerPath, 'utf8')).toThrow();
  });

  it('the first hit holds the board wave and writes the selected seat', () => {
    const ledgerPath = ledgerFile();
    const now = Date.parse('2026-03-07T18:00:00Z');
    const hour = String(game.chicagoParts(now).hour).padStart(2, '0');
    const seed = {
      waves: [{ id: 'alpha', rank: 1, title: 'Alpha', cards: [{ repo: '0xRayAI/xray', number: 9 }] }],
    };
    const bare = game.claimPulsar({
      charge: 'left-right',
      seat: 'new-back',
      now,
      seed,
      ledgerPath: ledgerFile(),
      hash: 'abc',
      digest: () => 'abc',
    });
    expect(bare.ok).toBe(false);
    expect(bare.say).toContain('Miss');
    const empty = game.claimPulsar({
      charge: `left-${hour}-right`,
      seat: 'new-back',
      now,
      seed: { waves: [] },
      ledgerPath: ledgerFile(),
      hash: 'abc',
      digest: (outer: string) => (outer === 'left-right' ? 'abc' : 'no'),
    });
    expect(empty.ok).toBe(false);
    expect(empty.say).toContain('no wave');
    let house = 'Initial: the find starts at the cold range.\nSelected: (none)\n';
    const hit = game.claimPulsar({
      charge: `left-${hour}-right`,
      seat: 'new-back',
      now,
      seed,
      cards: [],
      ledgerPath,
      hash: 'abc',
      digest: (outer: string) => (outer === 'left-right' ? 'abc' : 'no'),
      writeHouse: (record: { seat: string; wave: string }) => {
        house = game.writeSelected(house, record.seat, record.wave);
      },
    });
    expect(hit.ok).toBe(true);
    expect(hit.record.wave).toBe('alpha');
    expect(hit.record.until).toBeUndefined();
    expect(house).toContain('Selected: new-back alpha');
    expect(house).toContain('Initial:');
    expect(game.readHold(hit.record, seed, [])?.seat).toBe('new-back');
    const closed = [{ repo: '0xRayAI/xray', number: 9, state: 'closed' }];
    expect(game.readHold(hit.record, seed, closed)).toBeNull();
    const late = game.claimPulsar({
      charge: `left-${hour}-right`,
      seat: 'forge',
      now,
      seed,
      cards: closed,
      ledgerPath,
      hash: 'abc',
      digest: (outer: string) => (outer === 'left-right' ? 'abc' : 'no'),
    });
    expect(late.ok).toBe(false);
    expect(late.say).toContain('already took the toy');
  });

  it('uses Chicago wall time on both sides of the offset change', () => {
    const spring = game.nextMondayNineChicago(Date.parse('2026-03-07T18:00:00Z'));
    const autumn = game.nextMondayNineChicago(Date.parse('2026-10-31T18:00:00Z'));
    for (const ms of [spring, autumn]) {
      const parts = game.chicagoParts(ms);
      expect(parts.weekday).toBe(1);
      expect(parts.hour).toBe(9);
      expect(parts.minute).toBe(0);
    }
    expect(spring).not.toBe(autumn);
  });

  it('a jammed ledger does not crown a second seat', () => {
    const ledgerPath = ledgerFile();
    mkdirSync(path.dirname(ledgerPath), { recursive: true });
    writeFileSync(ledgerPath, '{');
    const result = game.claimPulsar({
      charge: 'anything',
      seat: 'forge',
      now: Date.parse('2026-10-19T18:00:00Z'),
      ledgerPath,
      hash: 'abc',
      digest: () => 'abc',
    });
    expect(result.ok).toBe(false);
    expect(result.say).toContain('jammed');
  });

  it('the cold command does not print the charge', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'pulsar-cli-'));
    const cold = spawnSync(process.execPath, [bin, 'range'], { cwd: dir, encoding: 'utf8' });
    expect(cold.status).toBe(1);
    expect(cold.stdout).toContain('The range is cold.');
    expect(cold.stdout).not.toContain(game.CHARGE_SHA256);
    const miss = spawnSync(process.execPath, [bin, 'range', 'nope', '--seat', 'forge'], {
      cwd: dir,
      encoding: 'utf8',
    });
    expect(miss.status).toBe(2);
    expect(miss.stdout).toContain('The house override is missing.');
    expect(miss.stdout).not.toContain('http');
  });
});

describe('charge pin', () => {
  it('the shipped hash is not a short guess', () => {
    const guesses = ['board', 'wave', 'toy', 'blaster', 'nerf', 'range', 'pulsar', 'first'];
    for (const guess of guesses) {
      expect(createHash('sha256').update(guess).digest('hex')).not.toBe(game.CHARGE_SHA256);
    }
  });
});

describe('pulsar law', () => {
  it('OP-PROC states what the pulsar does and what overrides it', () => {
    const text = readFileSync(path.join(root, 'grok-bot', 'OP-PROC.md'), 'utf8');
    const line = text.split('\n').find((row) => row.startsWith('- **Pulsar.**'));
    expect(line).toBeTruthy();
    expect(line).toContain('whole board');
    expect(line).toContain('the wave the board has up');
    expect(line).toContain('overrides who owns the open cards');
    expect(line).toContain('solar ban hammer');
    expect(line).toContain('one pick');
    expect(line).toContain('house/OP-PROC.md');
    expect(line).not.toContain('Monday');
    expect(line).not.toContain('range <charge>');
    expect(line).not.toContain('rhymes with');
    const house = readFileSync(path.join(root, 'house', 'OP-PROC.md'), 'utf8');
    expect(house).toMatch(/^Initial:/m);
    expect(house).toMatch(/^Selected: \(none\)$/m);
  });
});
