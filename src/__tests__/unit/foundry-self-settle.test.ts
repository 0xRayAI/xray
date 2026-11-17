import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const templatePath = path.join(root, 'grok-bot/templates/foundry/self-settle.mjs');
const source = readFileSync(templatePath, 'utf8');
const template = await import(pathToFile(templatePath));

function pathToFile(file: string): string {
  return new URL(`file://${file}`).href;
}

const PAYTO = '0xc9cd4e19e8ffabfc479352680295ba12e454462d';
const FROM = '0x234a4b961908b20114980af00c0974123763b48c';
const NONCE = '0xabababababababababababababababababababababababababababababababab';
const TX = `0x${'ab'.repeat(32)}`;

describe('foundry self-settle template', () => {
  it('imports the clearing embed and takes allowPayTo from the foundry', () => {
    expect(source).toContain('createBaseSettler');
    expect(source).toContain('dist/mcp/src/base-settle.js');
    expect(source).not.toContain('HOSTED_NEAR_PAYEES');
    expect(() => template.foundrySettleDeps({ allowPayTo: [] })).toThrow('the foundry must supply allowPayTo');
    const deps = template.foundrySettleDeps({
      allowPayTo: [PAYTO],
      advertised: {
        scheme: 'exact',
        network: 'eip155:84532',
        asset: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
        amount: '10000',
        payTo: PAYTO,
      },
      signer: { kind: 'self', submit: async () => TX },
      chain: { receipt: async () => ({ status: 'missing' }) },
      nowSec: () => 1_700_000_000n,
    });
    expect(deps.allowPayTo).toEqual([PAYTO]);
  });

  it('does not report success unless the chain confirms', () => {
    const clearingRoot = process.env.CLEARING_ROOT;
    if (!clearingRoot) return;
    const script = `
      const mod = await import(${JSON.stringify(pathToFile(templatePath))});
      const raw = {
        x402Version: 2,
        payload: {
          signature: ${JSON.stringify(`0x${'cc'.repeat(65)}`)},
          authorization: {
            from: ${JSON.stringify(FROM)},
            to: ${JSON.stringify(PAYTO)},
            value: '10000',
            validAfter: '1699999990',
            validBefore: '1700000010',
            nonce: ${JSON.stringify(NONCE)},
          },
        },
        accepted: {
          scheme: 'exact',
          network: 'eip155:84532',
          amount: '10000',
          asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          payTo: ${JSON.stringify(PAYTO)},
          maxTimeoutSeconds: 60,
        },
      };
      const shared = {
        clearingRoot: ${JSON.stringify(clearingRoot)},
        allowPayTo: [${JSON.stringify(PAYTO)}],
        advertised: raw.accepted,
        raw,
        signer: { kind: 'self', submit: async () => ${JSON.stringify(TX)} },
        nowSec: () => 1700000000n,
      };
      const missing = await mod.settleOwnPayment({ ...shared, chain: { receipt: async () => ({ status: 'missing' }) } });
      const confirmed = await mod.settleOwnPayment({
        ...shared,
        chain: { receipt: async () => ({
          status: 'success',
          token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          from: ${JSON.stringify(FROM)},
          to: ${JSON.stringify(PAYTO)},
          value: '10000',
        }) },
      });
      process.stdout.write(JSON.stringify({ missing, confirmed }));
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      missing: { success: false, errorReason: 'chain has not confirmed the transfer' },
      confirmed: { success: true, transaction: TX },
    });
  });
});
