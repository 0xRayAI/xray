import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const foundry = requireCjs(path.join(root, 'grok-bot', 'lib', 'foundry-create.cjs')) as {
  CREATE_USAGE: string;
  createFoundry: (opts: {
    dest: string;
    foundryId: string;
    seatId: string;
    accountId: string;
    force?: boolean;
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
    kept: boolean;
    record: {
      id: string;
      receiver: string;
      shop: { hangar: string; steps: string[]; accepts: Array<{ network: string; asset: string; symbol: string }> };
    };
  }>;
  runFoundryCreateCli: (argv: string[], io?: {
    stdout?: { write: (chunk: string) => void };
    stderr?: { write: (chunk: string) => void };
    createFoundry?: (opts: {
      foundryId: string;
      seatId: string;
      accountId: string;
      dest: string;
      force: boolean;
      stdout?: { write: (chunk: string) => void };
    }) => Promise<{ foundryId: string; receiver: string }>;
  }) => Promise<number>;
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
      expect(skill).toContain(foundry.CREATE_USAGE);
      expect(skill).not.toMatch(/\bplanes\b/i);
      expect(skill).not.toMatch(/dial/i);
      expect(readdirSync(path.dirname(created.foundryPath)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
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

  it('a second foundry-create keeps the matching record', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'foundry-create-'));
    const creds = mkdtempSync(path.join(tmpdir(), 'foundry-create-creds-'));
    let creates = 0;
    const runners = {
      createAccount: async () => {
        creates += 1;
        return {
          status: 0,
          stdout: '',
          stderr: '',
          key: {
            account_id: 'millfc1ca97ca3.testnet',
            public_key: 'ed25519:public',
            private_key: SECRET,
          },
        };
      },
      addFunctionCallKey: async () => ({ status: 0, stdout: '' }),
    };
    const opts = {
      dest,
      foundryId: 'ada-foundry',
      seatId: 'mill-seat',
      accountId: 'millfc1ca97ca3.testnet',
      credentialsHome: creds,
      viewAccount: async () => ({ amount: '1' }),
      runners,
    };
    try {
      const first = await foundry.createFoundry(opts);
      const bytes = readFileSync(first.foundryPath, 'utf8');
      expect(bytes).not.toContain(SECRET);
      const second = await foundry.createFoundry(opts);
      expect(creates).toBe(1);
      expect(second.kept).toBe(true);
      expect(readFileSync(second.foundryPath, 'utf8')).toBe(bytes);
      expect(second.foundryId).toBe('ada-foundry');
      expect(second.receiver).toBe('millfc1ca97ca3.testnet');
      await expect(foundry.createFoundry({ ...opts, foundryId: 'other-foundry' })).rejects.toThrow('--force');
      expect(readFileSync(first.foundryPath, 'utf8')).toBe(bytes);
      expect(creates).toBe(1);
      const replaced = await foundry.createFoundry({ ...opts, foundryId: 'other-foundry', force: true });
      expect(replaced.kept).toBe(false);
      expect(replaced.record.id).toBe('other-foundry');
      expect(readFileSync(replaced.foundryPath, 'utf8')).not.toContain(SECRET);
      expect(readFileSync(replaced.foundryPath, 'utf8')).toContain('"id": "other-foundry"');
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('a rerun continues when the account already exists and the key is on disk', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'foundry-create-'));
    const creds = mkdtempSync(path.join(tmpdir(), 'foundry-create-creds-'));
    const accountId = 'millfc1ca97ca3.testnet';
    const implicit = 'c'.repeat(64);
    let creates = 0;
    const runners = {
      createAccount: async () => {
        creates += 1;
        const file = path.join(creds, 'testnet', `${accountId}.json`);
        mkdirSync(path.dirname(file), { recursive: true });
        writeFileSync(file, `${JSON.stringify({
          account_id: implicit,
          implicit_account_id: implicit,
          public_key: 'ed25519:public',
          private_key: SECRET,
        })}\n`);
        return {
          status: 1,
          stdout: '',
          stderr: `Error: The account ${accountId} already exists`,
          key: {
            account_id: implicit,
            public_key: 'ed25519:public',
            private_key: SECRET,
          },
        };
      },
      addFunctionCallKey: async () => ({ status: 0, stdout: '' }),
    };
    const opts = {
      dest,
      foundryId: 'ada-foundry',
      seatId: 'mill-seat',
      accountId,
      credentialsHome: creds,
      viewAccount: async () => ({ amount: '1' }),
      runners,
    };
    try {
      const created = await foundry.createFoundry(opts);
      expect(creates).toBe(1);
      expect(created.receiver).toBe(accountId);
      expect(created.kept).toBe(false);
      const coldPath = path.join(dest, '.xray', 'state', 'seats', 'mill-seat', 'near-cold', `${accountId}.json`);
      const cold = JSON.parse(readFileSync(coldPath, 'utf8')) as { account_id: string };
      expect(cold.account_id).toBe(accountId);
      expect(readFileSync(coldPath, 'utf8')).not.toContain(implicit);
      rmSync(created.foundryPath);
      const again = await foundry.createFoundry(opts);
      expect(creates).toBe(1);
      expect(again.receiver).toBe(accountId);
      expect(JSON.parse(readFileSync(again.foundryPath, 'utf8')).receiver).toBe(accountId);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(creds, { recursive: true, force: true });
    }
  });

  it('grok-bot foundry-create runs createFoundry', async () => {
    const bin = readFileSync(path.join(root, 'grok-bot', 'bin', 'grok-bot.js'), 'utf8');
    const skill = readFileSync(path.join(root, 'grok-bot', 'skills', 'foundry-create', 'SKILL.md'), 'utf8');
    expect(bin).toContain("args[0] === 'foundry-create'");
    expect(bin).toContain('runFoundryCreateCli');
    expect(skill).toContain(foundry.CREATE_USAGE);
    const dest = mkdtempSync(path.join(tmpdir(), 'foundry-create-cli-'));
    const stdout: string[] = [];
    const stderr: string[] = [];
    const seen: Array<{ foundryId: string; seatId: string; accountId: string; dest: string; force: boolean }> = [];
    try {
      const code = await foundry.runFoundryCreateCli(
        ['--id', 'ada-foundry', '--seat', 'mill-seat', '--account', 'millfc1ca97ca3.testnet', '--cwd', dest],
        {
          stdout: { write: (chunk) => stdout.push(chunk) },
          stderr: { write: (chunk) => stderr.push(chunk) },
          createFoundry: async (opts) => {
            seen.push({
              foundryId: opts.foundryId,
              seatId: opts.seatId,
              accountId: opts.accountId,
              dest: opts.dest,
              force: opts.force,
            });
            opts.stdout?.write(`Foundry: ${opts.foundryId} — receiver ${opts.accountId}\n`);
            return { foundryId: opts.foundryId, receiver: opts.accountId };
          },
        },
      );
      expect(code).toBe(0);
      expect(seen).toEqual([{
        foundryId: 'ada-foundry',
        seatId: 'mill-seat',
        accountId: 'millfc1ca97ca3.testnet',
        dest,
        force: false,
      }]);
      expect(stdout.join('')).toContain('Foundry: ada-foundry — receiver millfc1ca97ca3.testnet');
      expect(`${stdout.join('')}${stderr.join('')}`).not.toContain(SECRET);
      const missing = await foundry.runFoundryCreateCli([], {
        stdout: { write: (chunk) => stdout.push(chunk) },
        stderr: { write: (chunk) => stderr.push(chunk) },
      });
      expect(missing).toBe(2);
      expect(stderr.join('')).toContain(foundry.CREATE_USAGE);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
