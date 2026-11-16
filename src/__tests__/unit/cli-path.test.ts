import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const doctor = requireCjs(path.join(root, 'grok-bot', 'lib', 'seat-doctor.cjs')) as {
  diagnoseSeat: (opts: { cwd: string; home: string }) => unknown;
  formatDoctor: (report: unknown) => string;
  nearStatusBlock: (cwd: string) => string;
};

const filled = `NEAR account: millfc1ca97ca3.testnet
Foundry: ada-foundry
Listing: ada
`;

function project(): string {
  const dest = mkdtempSync(path.join(tmpdir(), 'cli-path-'));
  const accountDir = path.join(dest, '.xray', 'state', 'seats', 'mill-seat', 'near');
  mkdirSync(accountDir, { recursive: true });
  writeFileSync(
    path.join(accountDir, 'account.json'),
    `${JSON.stringify({ account_id: 'millfc1ca97ca3.testnet', public_key: 'ed25519:public', network: 'testnet' })}\n`,
  );
  mkdirSync(path.join(dest, '.xray', 'state'), { recursive: true });
  writeFileSync(
    path.join(dest, '.xray', 'state', 'foundry.json'),
    `${JSON.stringify({ id: 'ada-foundry', receiver: 'millfc1ca97ca3.testnet', listingId: 'ada' })}\n`,
  );
  writeFileSync(path.join(dest, 'package.json'), `${JSON.stringify({ name: 'cli-path', version: '0.0.0', private: true })}\n`);
  return dest;
}

describe('cli path', () => {
  it('cli_path_same_block', () => {
    const dest = project();
    const homeA = mkdtempSync(path.join(tmpdir(), 'cli-path-home-a-'));
    const homeB = mkdtempSync(path.join(tmpdir(), 'cli-path-home-b-'));
    const saved = {
      HOME: process.env.HOME,
      USER: process.env.USER,
      NEAR_CREDENTIALS_HOME: process.env.NEAR_CREDENTIALS_HOME,
    };
    try {
      process.env.HOME = homeA;
      process.env.USER = 'ada';
      process.env.NEAR_CREDENTIALS_HOME = path.join(homeA, 'creds');
      const first = doctor.nearStatusBlock(dest);
      process.env.HOME = homeB;
      process.env.USER = 'beau';
      process.env.NEAR_CREDENTIALS_HOME = path.join(homeB, 'creds');
      const second = doctor.nearStatusBlock(dest);
      expect(first).toBe(second);
      expect(first).toBe(filled);
      expect(first).toMatchInlineSnapshot(`
        "NEAR account: millfc1ca97ca3.testnet
        Foundry: ada-foundry
        Listing: ada
        "
      `);
      const bin = path.join(root, 'grok-bot', 'bin', 'grok-bot.js');
      const fromA = spawnSync(process.execPath, [bin, 'near-status', '--cwd', dest], {
        encoding: 'utf8',
        env: { ...process.env, HOME: homeA, USER: 'ada' },
      });
      const fromB = spawnSync(process.execPath, [bin, 'near-status', '--cwd', dest], {
        encoding: 'utf8',
        env: { ...process.env, HOME: homeB, USER: 'beau' },
      });
      expect(fromA.status).toBe(0);
      expect(fromB.status).toBe(0);
      expect(fromA.stdout).toBe(first);
      expect(fromB.stdout).toBe(first);
      expect(fromA.stdout).not.toContain('private_key');
      const text = doctor.formatDoctor(doctor.diagnoseSeat({ cwd: dest, home: homeA }));
      expect(text).toContain(first.trimEnd());
      const empty = mkdtempSync(path.join(tmpdir(), 'cli-path-empty-'));
      expect(doctor.nearStatusBlock(empty)).toBe(`NEAR account: pending
Foundry: pending
Listing: pending
`);
      const skill = readFileSync(path.join(root, 'grok-bot', 'skills', 'near-mill', 'SKILL.md'), 'utf8');
      expect(skill).toContain('grok-bot foundry-create --id <id> --seat <seat> --account <account>');
      expect(skill).toContain('grok-bot hangar-list --agent-id <id> --url <https-shop>');
      expect(skill).toContain('grok-bot near-status');
      expect(skill).toContain('Pay');
      expect(skill).toContain('Cap');
      expect(skill).toContain('Escrow');
      expect(skill).not.toMatch(/\bplanes\b/i);
      rmSync(empty, { recursive: true, force: true });
    } finally {
      if (saved.HOME == null) delete process.env.HOME;
      else process.env.HOME = saved.HOME;
      if (saved.USER == null) delete process.env.USER;
      else process.env.USER = saved.USER;
      if (saved.NEAR_CREDENTIALS_HOME == null) delete process.env.NEAR_CREDENTIALS_HOME;
      else process.env.NEAR_CREDENTIALS_HOME = saved.NEAR_CREDENTIALS_HOME;
      rmSync(dest, { recursive: true, force: true });
      rmSync(homeA, { recursive: true, force: true });
      rmSync(homeB, { recursive: true, force: true });
    }
  });
});
