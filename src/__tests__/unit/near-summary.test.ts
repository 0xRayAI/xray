import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const summary = requireCjs(path.join(root, 'grok-bot', 'lib', 'near-summary.cjs')) as {
  yoctoToNear: (amount: string) => string | null;
  parseTransactions: (text: string) => Array<{ id: string; explorer: string; explorerSource: string }>;
  buildNearSummary: (input: Record<string, unknown>) => { allowance: string | null; transactions: unknown[] };
  formatNearSummary: (value: unknown) => string;
  writeNearSummary: (seatHome: string, value: unknown, secrets: string[]) => string;
  NEARBLOCKS_TX: string;
};

const SECRET = 'ed25519:summary-secret-do-not-print';
const TX = 'CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K';

describe('near summary', () => {
  it('formats yoctoNEAR and keeps a CLI explorer URL', () => {
    expect(summary.yoctoToNear('1000000000000000000000000')).toBe('1');
    expect(summary.yoctoToNear('1')).toBe(`0.${'0'.repeat(23)}1`);
    const parsed = summary.parseTransactions(
      `Transaction ID: ${TX}\nhttps://explorer.testnet.near.org/transactions/${TX}\nGas burnt: 0.001 TGas\n`,
    );
    expect(parsed).toHaveLength(1);
    expect(parsed[0].id).toBe(TX);
    expect(parsed[0].explorer).toBe(`https://explorer.testnet.near.org/transactions/${TX}`);
    expect(parsed[0].explorerSource).toBe('cli');
  });

  it('builds an owner summary and refuses to store a private key', () => {
    const built = summary.buildNearSummary({
      secrets: [SECRET],
      accountId: 'mill.testnet',
      seat: 'implementer',
      foundryId: 'core-foundry',
      createText: `Transaction ID: ${TX}\n${SECRET}\n`,
      grantText: 'no id here',
      balanceYocto: '1000000000000000000000000',
      createdThisRun: true,
      addedKey: true,
      allowance: '1 NEAR',
      contractId: 'mill.testnet',
      methodNames: 'ping',
      verified: ['view_account returned a balance'],
      credentials: { files: 2, dirs: 2 },
    });
    const text = summary.formatNearSummary(built);
    expect(text).toContain('Account: mill.testnet');
    expect(text).toContain('Foundry: core-foundry');
    expect(text).toContain('Seat: implementer');
    expect(text).toContain(TX);
    expect(text).toContain(`${summary.NEARBLOCKS_TX}${TX}`);
    expect(text).toContain('Function-call key allowance: 1 NEAR');
    expect(text).toContain('Gas used: not reported by the CLI');
    expect(text).toContain('Listing: pending');
    expect(text).toContain('Pay: pending');
    expect(text).toContain('No key material printed');
    expect(text).not.toContain(SECRET);
    expect(text).not.toContain('private_key');
    const home = mkdtempSync(path.join(tmpdir(), 'near-summary-'));
    try {
      const file = summary.writeNearSummary(path.join(home, 'seat'), built, [SECRET]);
      expect(statSync(file).mode & 0o777).toBe(0o600);
      expect(readFileSync(file, 'utf8')).not.toContain(SECRET);
      expect(() => summary.writeNearSummary(path.join(home, 'seat'), { ...built, private_key: SECRET }, [])).toThrow(/secret/i);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
