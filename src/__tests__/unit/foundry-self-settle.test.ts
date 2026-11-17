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
const TX = `0x${'ab'.repeat(32)}`;

describe('foundry self-settle template', () => {
  it('pins the clearing settler to a commit and takes allowPayTo from the foundry', () => {
    expect(source).toContain('createBaseSettler');
    expect(source).toContain(template.CLEARING_SETTLE_SHA);
    expect(source).toContain('Re-pin CLEARING_SETTLE_SHA to the merge SHA of clearing#40');
    expect(source).not.toContain('HOSTED_NEAR_PAYEES');
    expect(template.CLEARING_SETTLE_SHA).toMatch(/^[0-9a-f]{40}$/);
    expect(() => template.pinnedSettleFile('')).toThrow(/not present/);
    expect(() => template.pinnedSettleFile('/tmp/clearing-pin-absent')).toThrow(/not present/);
    expect(() => template.pinnedSettleFile(root)).toThrow(new RegExp(`is not ${template.CLEARING_SETTLE_SHA}`));
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
    expect(deps.allowMainnet).toBe(false);
  });

  it('fails closed unless the pinned clearing build confirms the transfer', () => {
    const clearingRoot = process.env.CLEARING_ROOT;
    expect(clearingRoot, 'CLEARING_ROOT must be the pinned clearing checkout').toBeTruthy();
    expect(template.pinnedSettleFile(clearingRoot)).toContain('base-settle.js');
    const script = `
      import { pad, toHex } from 'viem';
      import { privateKeyToAccount } from 'viem/accounts';
      const mod = await import(${JSON.stringify(pathToFile(templatePath))});
      const payer = privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80');
      const nonce = '0x${'ab'.repeat(32)}';
      const asset = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
      const payTo = ${JSON.stringify(PAYTO)};
      const now = 1700000000n;
      const signature = await payer.signTypedData({
        domain: { name: 'USDC', version: '2', chainId: 84532, verifyingContract: asset },
        types: { TransferWithAuthorization: [
          { name: 'from', type: 'address' },
          { name: 'to', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'validAfter', type: 'uint256' },
          { name: 'validBefore', type: 'uint256' },
          { name: 'nonce', type: 'bytes32' },
        ] },
        primaryType: 'TransferWithAuthorization',
        message: {
          from: payer.address,
          to: payTo,
          value: 10000n,
          validAfter: now - 10n,
          validBefore: now + 10n,
          nonce,
        },
      });
      const authorization = {
        from: payer.address,
        to: payTo,
        value: '10000',
        validAfter: String(now - 10n),
        validBefore: String(now + 10n),
        nonce,
        signature,
      };
      const raw = {
        x402Version: 2,
        payload: { signature, authorization },
        accepted: {
          scheme: 'exact',
          network: 'eip155:84532',
          amount: '10000',
          asset,
          payTo,
          maxTimeoutSeconds: 60,
        },
      };
      const log = {
        address: asset,
        topics: [
          '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
          pad(payer.address, { size: 32 }),
          pad(payTo, { size: 32 }),
        ],
        data: pad(toHex(10000n), { size: 32 }),
      };
      const shared = {
        clearingRoot: ${JSON.stringify(clearingRoot)},
        allowPayTo: [payTo],
        advertised: raw.accepted,
        raw,
        signer: { kind: 'self', submit: async () => ${JSON.stringify(TX)} },
        nowSec: () => now,
        chain: {
          authorizationState: async () => false,
          receipt: async () => ({ status: 'missing', logs: [] }),
        },
      };
      const missing = await mod.settleOwnPayment(shared);
      const confirmed = await mod.settleOwnPayment({
        ...shared,
        chain: {
          authorizationState: async () => false,
          receipt: async () => ({ status: 'success', logs: [log] }),
        },
      });
      process.stdout.write(JSON.stringify({ missing, confirmed }));
    `;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8',
      cwd: clearingRoot,
    });
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      missing: { success: false, errorReason: 'chain has not confirmed the transfer' },
      confirmed: { success: true, transaction: TX },
    });
  });
});
