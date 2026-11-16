import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const mill = requireCjs(path.join(root, 'grok-bot', 'lib', 'near-mill.cjs')) as {
  BASE_USDC: string;
  NEAR_TESTNET_USDC: string;
  installNearMill: (opts: { dest: string }) => {
    dest: string;
    seatHome: string;
    npmPublish: boolean;
    manifest: {
      npmPublish: boolean;
      groover: { steps: string[]; hangar: string };
      accepts: Array<{ network: string; asset: string }>;
    };
  };
};
const seat = requireCjs(path.join(root, 'grok-bot', 'lib', 'near-seat.cjs')) as {
  prepareNearSeat: (opts: {
    accountId: string;
    seatHome: string;
    log?: (line: string) => void;
    stdout?: { write: (chunk: string) => void };
    viewAccount?: () => Promise<unknown>;
    runners: {
      createAccount: () => Promise<{ stdout: string; stderr: string; key: { account_id: string; public_key: string; private_key: string } }>;
      addFunctionCallKey: () => Promise<{ stdout: string }>;
    };
  }) => Promise<unknown>;
};
const doctor = requireCjs(path.join(root, 'grok-bot', 'lib', 'seat-doctor.cjs')) as {
  PLANT_URLS: { suitUi: string; registryMcp: string };
  diagnoseSeat: (opts: { cwd: string; home: string }) => { next: string[]; ows: { path: string }; near: { accountId: string | null } };
  formatDoctor: (report: { next: string[] }) => string;
};

const SECRET = 'ed25519:near-mill-install-secret';

describe('near-mill', () => {
  it('near_mill_install_clean', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'near-mill-'));
    const home = mkdtempSync(path.join(tmpdir(), 'near-mill-home-'));
    try {
      const installed = mill.installNearMill({ dest });
      expect(installed.npmPublish).toBe(false);
      expect(installed.manifest.npmPublish).toBe(false);
      expect(installed.manifest.groover.steps).toEqual(['register', 'mint_suit', 'pin']);
      expect(installed.manifest.groover.hangar).toBe('npx groover-hangar');
      expect(installed.manifest.accepts).toEqual([
        { network: 'eip155:8453', asset: mill.BASE_USDC, symbol: 'USDC' },
        { network: 'near:testnet', asset: mill.NEAR_TESTNET_USDC, symbol: 'USDC' },
      ]);
      const seatSkill = readFileSync(path.join(dest, 'skills', 'near-seat', 'SKILL.md'), 'utf8');
      const millSkill = readFileSync(path.join(dest, 'skills', 'near-mill', 'SKILL.md'), 'utf8');
      expect(`${seatSkill}\n${millSkill}`).not.toMatch(/\bplanes\b/i);
      expect(`${seatSkill}\n${millSkill}`).not.toMatch(/dial/i);
      const logs: string[] = [];
      const stdout: string[] = [];
      await seat.prepareNearSeat({
        accountId: 'millfc1ca97ca3.testnet',
        seatHome: installed.seatHome,
        log: (line) => logs.push(line),
        stdout: { write: (chunk) => stdout.push(chunk) },
        viewAccount: async () => ({ amount: '1' }),
        runners: {
          createAccount: async () => ({
            stdout: SECRET,
            stderr: '',
            key: {
              account_id: 'millfc1ca97ca3.testnet',
              public_key: 'ed25519:public',
              private_key: SECRET,
            },
          }),
          addFunctionCallKey: async () => ({ stdout: '' }),
        },
      });
      expect(`${logs.join('\n')}${stdout.join('')}`).not.toContain(SECRET);
      writeFileSync(
        path.join(dest, 'package.json'),
        `${JSON.stringify({ name: 'near-mill-clean', version: '0.0.0', private: true }, null, 2)}\n`,
      );
      const report = doctor.diagnoseSeat({ cwd: dest, home });
      const text = doctor.formatDoctor(report);
      const pin = `Identity (optional DID): Groover register → mint → pin. Suit UI: ${doctor.PLANT_URLS.suitUi} · registry: ${doctor.PLANT_URLS.registryMcp}`;
      expect(report.next).toContain(pin);
      expect(text).toContain(pin);
      expect(text).toContain('NEAR: millfc1ca97ca3.testnet (testnet)');
      expect(report.near.accountId).toBe('millfc1ca97ca3.testnet');
      expect(report.ows.path).toBe(path.join(home, '.ows'));
      expect(text).toContain(`OWS pay: miss — ${report.ows.path}`);
      expect(text).not.toContain(SECRET);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  });
});
