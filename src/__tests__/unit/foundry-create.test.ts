import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const foundry = requireCjs(path.join(root, 'grok-bot', 'lib', 'foundry-create.cjs')) as {
  createFoundry: (opts: {
    dest: string;
    foundryId: string;
    seatId: string;
    accountId: string;
    credentialsHome?: string;
    log?: (line: string) => void;
    stdout?: { write: (chunk: string) => void };
    viewAccount?: () => Promise<unknown>;
    runners?: {
      createAccount: () => Promise<{ status: number; stdout: string; stderr: string; key: { account_id: string; public_key: string; private_key: string } }>;
      addFunctionCallKey: () => Promise<{ status: number; stdout: string }>;
    };
  }) => Promise<{
    foundryId: string;
    receiver: string;
    foundryPath: string;
    npmPublish: boolean;
    record: {
      id: string;
      receiver: string;
      shop: { hangar: string; steps: string[]; accepts: Array<{ network: string; asset: string; symbol: string }> };
    };
  }>;
};
const mill = requireCjs(path.join(root, 'grok-bot', 'lib', 'near-mill.cjs')) as {
  BASE_USDC: string;
  NEAR_TESTNET_USDC: string;
};
const doctor = requireCjs(path.join(root, 'grok-bot', 'lib', 'seat-doctor.cjs')) as {
  diagnoseSeat: (opts: { cwd: string; home: string }) => { foundry: { id: string | null; receiver: string | null } };
  formatDoctor: (report: { foundry?: { id: string | null } }) => string;
};

const SECRET = 'ed25519:foundry-create-secret-do-not-print';

describe('foundry-create', () => {
  it('foundry_create_fresh_project', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'foundry-create-'));
    const home = mkdtempSync(path.join(tmpdir(), 'foundry-create-home-'));
    const creds = mkdtempSync(path.join(tmpdir(), 'foundry-create-creds-'));
    const logs: string[] = [];
    const stdout: string[] = [];
    try {
      const created = await foundry.createFoundry({
        dest,
        foundryId: 'ada-foundry',
        seatId: 'mill-seat',
        accountId: 'millfc1ca97ca3.testnet',
        credentialsHome: creds,
        log: (line) => logs.push(line),
        stdout: { write: (chunk) => stdout.push(chunk) },
        viewAccount: async () => ({ amount: '1' }),
        runners: {
          createAccount: async () => ({
            status: 0,
            stdout: SECRET,
            stderr: '',
            key: {
              account_id: 'millfc1ca97ca3.testnet',
              public_key: 'ed25519:public',
              private_key: SECRET,
            },
          }),
          addFunctionCallKey: async () => ({ status: 0, stdout: '' }),
        },
      });
      expect(created.foundryId).toBe('ada-foundry');
      expect(created.receiver).toBe('millfc1ca97ca3.testnet');
      expect(created.npmPublish).toBe(false);
      expect(created.record.shop.hangar).toBe('npx groover-hangar');
      expect(created.record.shop.steps).toEqual(['register', 'mint_suit', 'pin']);
      expect(created.record.shop.accepts).toEqual([
        { network: 'eip155:8453', asset: mill.BASE_USDC, symbol: 'USDC' },
        { network: 'near:testnet', asset: mill.NEAR_TESTNET_USDC, symbol: 'USDC' },
      ]);
      const onDisk = readFileSync(created.foundryPath, 'utf8');
      expect(onDisk).not.toContain(SECRET);
      expect(JSON.parse(onDisk).receiver).toBe('millfc1ca97ca3.testnet');
      const skill = readFileSync(path.join(dest, 'skills', 'foundry-create', 'SKILL.md'), 'utf8');
      expect(skill).not.toMatch(/\bplanes\b/i);
      expect(skill).not.toMatch(/dial/i);
      const shown = `${logs.join('\n')}${stdout.join('')}`;
      expect(shown).not.toContain(SECRET);
      expect(shown).toContain('Foundry: ada-foundry — receiver millfc1ca97ca3.testnet');
      writeFileSync(
        path.join(dest, 'package.json'),
        `${JSON.stringify({ name: 'foundry-create-fresh', version: '0.0.0', private: true }, null, 2)}\n`,
      );
      const report = doctor.diagnoseSeat({ cwd: dest, home });
      const text = doctor.formatDoctor(report);
      expect(text).toContain('Foundry: ada-foundry — receiver millfc1ca97ca3.testnet');
      expect(text).toContain('NEAR: millfc1ca97ca3.testnet (testnet)');
      expect(report.foundry.id).toBe('ada-foundry');
      expect(report.foundry.receiver).toBe('millfc1ca97ca3.testnet');
      expect(text).not.toContain(SECRET);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });
});
