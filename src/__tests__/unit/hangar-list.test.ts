import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const hangar = requireCjs(path.join(root, 'grok-bot', 'lib', 'hangar-list.cjs')) as {
  CLEARING_ORIGIN: string;
  listFoundry: (opts: {
    dest: string;
    shopUrl: string;
    agentId: number;
    fetch?: (url: string, init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }) => Promise<{
      status: number;
      ok?: boolean;
      json: () => Promise<unknown>;
    }>;
    pay?: (quote: unknown) => Promise<string | null>;
  }) => Promise<{
    listingId: string;
    kept: boolean;
    payload: { shopUrl: string; receiver: string; accepts: Array<{ network: string; asset: string; symbol: string }> } | null;
    foundryPath: string;
  }>;
};
const mill = requireCjs(path.join(root, 'grok-bot', 'lib', 'near-mill.cjs')) as {
  BASE_USDC: string;
  NEAR_TESTNET_USDC: string;
};
const doctor = requireCjs(path.join(root, 'grok-bot', 'lib', 'seat-doctor.cjs')) as {
  diagnoseSeat: (opts: { cwd: string; home: string }) => { foundry: { listingId: string | null } };
  formatDoctor: (report: unknown) => string;
};

const shopUrl = 'https://shop.example/v1/ada';
const receiver = 'millfc1ca97ca3.testnet';

function writeFoundry(dest: string): string {
  const file = path.join(dest, '.xray', 'state', 'foundry.json');
  mkdirSync(path.dirname(file), { recursive: true });
  const record = {
    id: 'ada-foundry',
    receiver,
    network: 'near:testnet',
    shop: {
      hangar: 'npx groover-hangar',
      steps: ['register', 'mint_suit', 'pin'],
      accepts: [
        { network: 'eip155:8453', asset: mill.BASE_USDC, symbol: 'USDC' },
        { network: 'near:testnet', asset: mill.NEAR_TESTNET_USDC, symbol: 'USDC' },
      ],
    },
  };
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`);
  return file;
}

describe('hangar-list', () => {
  it('hangar_list_foundry', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'hangar-list-'));
    const home = mkdtempSync(path.join(tmpdir(), 'hangar-list-home-'));
    const calls: Array<{ url: string; method?: string; headers?: Record<string, string> }> = [];
    try {
      writeFoundry(dest);
      const fetch = async (url: string, init?: { method?: string; headers?: Record<string, string>; signal?: AbortSignal }) => {
        calls.push({ url, method: init?.method, headers: init?.headers, signal: init?.signal });
        return {
          status: 200,
          ok: true,
          json: async () => ({
            agentId: 7,
            directories: 4,
            yellowPages: 'cdp-bazaar',
            catalog: { ok: true, shops: [{ id: 'ada', url: shopUrl }] },
          }),
        };
      };
      const listed = await hangar.listFoundry({
        dest,
        shopUrl,
        agentId: 7,
        fetch,
        pay: async () => { throw new Error('pay must not run'); },
      });
      expect(calls).toHaveLength(1);
      expect(calls[0]?.url).toBe(`${hangar.CLEARING_ORIGIN}/v1/listings?agentId=7`);
      expect(calls[0]?.method).toBe('GET');
      expect(calls[0]?.signal).toBeInstanceOf(AbortSignal);
      expect(listed.payload).toEqual({
        shopUrl,
        receiver,
        accepts: [
          { network: 'eip155:8453', asset: mill.BASE_USDC, symbol: 'USDC' },
          { network: 'near:testnet', asset: mill.NEAR_TESTNET_USDC, symbol: 'USDC' },
        ],
      });
      expect(listed.listingId).toBe('ada');
      expect(listed.kept).toBe(false);
      const onDisk = readFileSync(listed.foundryPath, 'utf8');
      expect(JSON.parse(onDisk).listingId).toBe('ada');
      expect(onDisk).not.toContain('private_key');
      expect(readdirSync(path.dirname(listed.foundryPath)).filter((name) => name.endsWith('.tmp'))).toEqual([]);
      writeFileSync(
        path.join(dest, 'package.json'),
        `${JSON.stringify({ name: 'hangar-list-fresh', version: '0.0.0', private: true })}\n`,
      );
      const report = doctor.diagnoseSeat({ cwd: dest, home });
      const text = doctor.formatDoctor(report);
      expect(text).toContain('Hangar: ada');
      expect(report.foundry.listingId).toBe('ada');
      expect(text).not.toContain('private_key');
      const again = await hangar.listFoundry({
        dest,
        shopUrl,
        agentId: 7,
        fetch: async () => { throw new Error('listings must not run again'); },
      });
      expect(again.kept).toBe(true);
      expect(again.listingId).toBe('ada');
      expect(calls).toHaveLength(1);
    } finally {
      rmSync(dest, { recursive: true, force: true });
      rmSync(home, { recursive: true, force: true });
    }
  });

  it('does not store a listing id when the listings response is not ok', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'hangar-list-bad-'));
    try {
      const file = writeFoundry(dest);
      await expect(hangar.listFoundry({
        dest,
        shopUrl,
        agentId: 7,
        fetch: async () => ({
          status: 500,
          ok: false,
          json: async () => ({ catalog: { ok: true, shops: [{ id: 'ada', url: shopUrl }] } }),
        }),
        pay: async () => null,
      })).rejects.toThrow('hangar listing id missing');
      expect(readFileSync(file, 'utf8')).not.toContain('listingId');
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('injects a pin payment header and does not sign one', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'hangar-list-pin-'));
    const calls: Array<{ url: string; headers?: Record<string, string> }> = [];
    const quote = { x402Version: 2, error: 'X-PAYMENT header is required', accepts: [{ scheme: 'exact' }] };
    let paid = 0;
    try {
      writeFoundry(dest);
      const fetch = async (url: string, init?: { headers?: Record<string, string> }) => {
        calls.push({ url, headers: init?.headers });
        if (url.includes('/v1/listings') && calls.filter((call) => call.url.includes('/v1/listings')).length === 1) {
          return { status: 200, ok: true, json: async () => ({ agentId: 7, catalog: { ok: false, catalog: `${hangar.CLEARING_ORIGIN}/v1/catalog` } }) };
        }
        if (url.includes('/v1/pin') && !init?.headers?.['PAYMENT-SIGNATURE']) {
          return { status: 402, ok: false, json: async () => quote };
        }
        if (url.includes('/v1/pin')) {
          return { status: 200, ok: true, json: async () => ({ paid: true, listed: true, agentId: 7, chainId: 8453 }) };
        }
        return { status: 200, ok: true, json: async () => ({ agentId: 7, catalog: { ok: true, shops: [{ id: 'ada', url: shopUrl }] } }) };
      };
      const listed = await hangar.listFoundry({
        dest,
        shopUrl,
        agentId: 7,
        fetch,
        pay: async (body) => {
          paid += 1;
          expect(body).toEqual(quote);
          return 'injected-payment-header';
        },
      });
      expect(paid).toBe(1);
      expect(calls[1]?.url).toBe(`${hangar.CLEARING_ORIGIN}/v1/pin?agentId=7`);
      expect(calls[2]?.headers?.['PAYMENT-SIGNATURE']).toBe('injected-payment-header');
      expect(listed.listingId).toBe('ada');
      expect(JSON.parse(readFileSync(listed.foundryPath, 'utf8')).listingId).toBe('ada');
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('foundry-create --help exits 0', () => {
    const bin = path.join(root, 'grok-bot', 'bin', 'grok-bot.js');
    const result = spawnSync(process.execPath, [bin, 'foundry-create', '--help'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('grok-bot foundry-create --id <id> --seat <seat> --account <account>');
  });
});
