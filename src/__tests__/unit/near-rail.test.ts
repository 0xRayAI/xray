import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const tx = requireCjs(path.join(root, 'grok-bot/lib/near-tx.cjs'));
const pay = requireCjs(path.join(root, 'grok-bot/lib/near-pay.cjs'));
const cap = requireCjs(path.join(root, 'grok-bot/lib/near-cap.cjs'));
const escrow = requireCjs(path.join(root, 'grok-bot/lib/near-escrow.cjs'));
const doctor = requireCjs(path.join(root, 'grok-bot/lib/seat-doctor.cjs'));

const SECRET = 'ed25519:near-rail-test-secret-do-not-print';

function scratch(): string {
  return mkdtempSync(path.join(tmpdir(), 'near-rail-'));
}

function rpcOk(hash: string, calls: Array<{ method: string; params: { method?: string; args?: { per_tx_cap?: string } } }>) {
  return async (method: string, params: { method_name?: string; method?: string; args?: { per_tx_cap?: string } }) => {
    if (method === 'query') {
      if (params.method_name === 'get_deal') return { parsed: { state: 'Funded', deliver_by_ns: '1' } };
      return { parsed: { total: '1' } };
    }
    if (method === 'block') return { header: { timestamp_nanosec: '5' } };
    if (method === 'ft_transfers') return null;
    calls.push({ method, params });
    return {
      transaction: { hash },
      status: { SuccessValue: Buffer.from('1').toString('base64') },
    };
  };
}

describe('near rail commands', () => {
  it('signs an ed25519 message the contract can verify', () => {
    const pair = tx.ed25519Pair();
    const message = 'escrow-v1|testnet|escrow.testnet|0|open|n1|{}';
    const signature = Buffer.from(tx.signHex(pair.privateKey, message), 'hex');
    const pub = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'),
        Buffer.from(pair.publicHex, 'hex'),
      ]),
      format: 'der',
      type: 'spki',
    });
    expect(tx.publicHexFromKey(pair.privateKey)).toBe(pair.publicHex);
    expect(crypto.verify(null, Buffer.from(message), pub, signature)).toBe(true);
    expect(tx.signHex(pair.privateKey, message)).not.toContain(pair.privateKey);
  });

  it('binds payee and amount to the quote and replays the stored result', async () => {
    const dest = scratch();
    const calls: Array<{ method: string }> = [];
    const quote = { receiver: 'shop.testnet', amount: '10000', nonce: 'quote-1' };
    try {
      expect(() => tx.quoteOf({ receiver: 'other.testnet', amount: '10000', quote })).toThrow('payee is bound to the quote');
      expect(() => tx.quoteOf({ receiver: 'shop.testnet', amount: '1', quote })).toThrow('amount is bound to the quote');
      const first = await pay.payNear({
        dest,
        signerId: 'payer.testnet',
        receiver: quote.receiver,
        amount: quote.amount,
        nonce: quote.nonce,
        quote,
        rpc: rpcOk('PayHash11111111111111111111111111111111', calls),
      });
      expect(first.replayed).toBe(false);
      expect(first.paymentId).toBe('near-pay:quote-1');
      expect(first.hash).toBe('PayHash11111111111111111111111111111111');
      expect(calls).toHaveLength(1);
      expect(calls[0].method).toBe('broadcast_tx_commit');
      const second = await pay.payNear({
        dest,
        signerId: 'payer.testnet',
        receiver: quote.receiver,
        amount: quote.amount,
        nonce: quote.nonce,
        quote,
        rpc: rpcOk('OtherHash', calls),
      });
      expect(second.replayed).toBe(true);
      expect(second.hash).toBe(first.hash);
      expect(calls).toHaveLength(1);
      const rail = tx.readRail(dest);
      rail.pay.payments[first.paymentId].payload.amount = '1';
      tx.rememberRow(dest, 'pay', rail.pay);
      await expect(pay.payNear({
        dest,
        signerId: 'payer.testnet',
        receiver: quote.receiver,
        amount: quote.amount,
        nonce: quote.nonce,
        quote,
        rpc: rpcOk('ThirdHash', calls),
      })).rejects.toThrow('different payload');
      expect(calls).toHaveLength(1);
      const shown = JSON.stringify(tx.readRail(dest));
      expect(shown).not.toContain(SECRET);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('drives the spend vault with the cold key and a mocked RPC', async () => {
    const dest = scratch();
    const calls: Array<{ method: string; params: { method: string; args: Record<string, unknown>; signerId: string } }> = [];
    const keyFile = path.join(dest, 'cold.json');
    const pair = tx.ed25519Pair();
    writeFileSync(keyFile, `${JSON.stringify({
      account_id: 'owner.testnet',
      public_key: pair.publicKey,
      private_key: pair.privateKey,
    })}\n`, { mode: 0o600 });
    try {
      const init = await cap.runNearCap({
        dest,
        action: 'init',
        contractId: 'vault.testnet',
        ownerId: 'owner.testnet',
        perTxCap: '1000000',
        keyFile,
        rpc: rpcOk('CapInitHash11111111111111111111111111111', calls),
      });
      expect(init.method).toBe('new');
      expect(calls[0].params.args.per_tx_cap).toBe('1000000');
      expect(calls[0].params.args.token_id).toBe(tx.USDC);
      expect(calls[0].params.signerId).toBe('owner.testnet');
      await cap.runNearCap({
        dest,
        action: 'allow',
        contractId: 'vault.testnet',
        ownerId: 'owner.testnet',
        account: 'shop.testnet',
        keyFile,
        rpc: rpcOk('CapAllowHash1111111111111111111111111111', calls),
      });
      expect(calls[1].params.method).toBe('set_allow');
      expect(calls[1].params.args.allow).toEqual(['shop.testnet']);
      await cap.runNearCap({
        dest,
        action: 'deny',
        contractId: 'vault.testnet',
        ownerId: 'owner.testnet',
        account: 'blocked.testnet',
        keyFile,
        rpc: rpcOk('CapDenyHash11111111111111111111111111111', calls),
      });
      expect(calls[2].params.method).toBe('set_deny');
      await cap.runNearCap({
        dest,
        action: 'add-agent-key',
        contractId: 'vault.testnet',
        ownerId: 'owner.testnet',
        publicKey: pair.publicKey,
        keyFile,
        rpc: rpcOk('CapKeyHash111111111111111111111111111111', calls),
      });
      expect(calls[3].params.method).toBe('add_agent_key');
      expect(calls[3].params.args.public_key).toBe(pair.publicKey);
      const spawned: Array<{ argv: string[]; env: NodeJS.ProcessEnv }> = [];
      await cap.runNearCap({
        dest,
        action: 'allow',
        contractId: 'vault.testnet',
        ownerId: 'owner.testnet',
        account: 'shop.testnet',
        keyFile,
        spawn: (_bin: string, argv: string[]) => {
          spawned.push({ argv, env: process.env });
          const staged = readFileSync(tx.legacyKeyFile('owner.testnet'), 'utf8');
          expect(staged).toContain(pair.privateKey);
          expect(argv.join(' ')).not.toContain(pair.privateKey);
          return { status: 0, stdout: 'Transaction ID: CapSpawnHash11111111111111111111111111\n', stderr: '' };
        },
      });
      expect(spawned[0].argv).toContain('network-config');
      expect(spawned[0].argv).toContain('testnet');
      expect(spawned[0].argv).toContain('sign-with-legacy-keychain');
      const status = doctor.nearStatusBlock(dest);
      expect(status).toContain('Cap: owner.testnet contract vault.testnet tx CapSpawnHash11111111111111111111111111');
      expect(status).toContain('Pay: pending');
      expect(status).toContain('Escrow: pending');
      expect(status).not.toContain(pair.privateKey);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('keeps escrow off the foundry and calls fund, deliver, accept, and refund', async () => {
    const dest = scratch();
    const calls: Array<{ params: { method: string; receiverId: string; args: Record<string, unknown> } }> = [];
    const pair = tx.ed25519Pair();
    const keyFile = path.join(dest, 'creator.json');
    writeFileSync(keyFile, `${JSON.stringify({
      account_id: 'foundry.testnet',
      public_key: pair.publicKey,
      private_key: pair.privateKey,
    })}\n`, { mode: 0o600 });
    const client = tx.ed25519Pair();
    const clientFile = path.join(dest, 'client.json');
    writeFileSync(clientFile, `${JSON.stringify({
      account_id: 'buyer.testnet',
      public_key: client.publicKey,
      private_key: client.privateKey,
    })}\n`, { mode: 0o600 });
    try {
      await expect(escrow.runNearEscrow({
        dest,
        action: 'init',
        escrowId: 'foundry.testnet',
        creatorId: 'foundry.testnet',
        arbiterId: 'arbiter.testnet',
        creatorPk: pair.publicHex,
        keyFile,
        rpc: rpcOk('nope', calls),
      })).rejects.toThrow('must not be the foundry');
      expect(calls).toHaveLength(0);
      const opened = await escrow.runNearEscrow({
        dest,
        action: 'open',
        escrowId: 'escrow.testnet',
        creatorId: 'foundry.testnet',
        clientPk: client.publicHex,
        price: '1000000',
        keyFile,
        rpc: rpcOk('EscrowOpenHash111111111111111111111111111', calls),
      });
      expect(String(calls[0].params.args.nonce).length).toBeGreaterThanOrEqual(16);
      expect(opened.method).toBe('open');
      expect(calls[0].params.receiverId).toBe('escrow.testnet');
      expect(String(calls[0].params.args.signature)).toHaveLength(128);
      const funded = await escrow.runNearEscrow({
        dest,
        action: 'fund',
        escrowId: 'escrow.testnet',
        creatorId: 'foundry.testnet',
        signerId: 'buyer.testnet',
        price: '1000000',
        dealId: '1',
        keyFile: clientFile,
        rpc: rpcOk('EscrowFundHash111111111111111111111111111', calls),
      });
      expect(funded.method).toBe('ft_transfer_call');
      expect(calls[1].params.receiverId).toBe(tx.USDC);
      expect(calls[1].params.args.msg).toBe('{"deal_id":1}');
      await escrow.runNearEscrow({
        dest,
        action: 'deliver',
        escrowId: 'escrow.testnet',
        creatorId: 'foundry.testnet',
        dealId: '1',
        deliverable: 'abc123',
        keyFile,
        rpc: rpcOk('EscrowDeliverHash111111111111111111111111', calls),
      });
      expect(calls[2].params.method).toBe('deliver');
      await expect(escrow.runNearEscrow({
        dest,
        action: 'accept',
        escrowId: 'escrow.testnet',
        creatorId: 'foundry.testnet',
        dealId: '1',
        keyFile: clientFile,
        payoutKeyFile: keyFile,
        rpc: rpcOk('no-signer', calls),
      })).rejects.toThrow('--signer is required');
      const accepted = await escrow.runNearEscrow({
        dest,
        action: 'accept',
        escrowId: 'escrow.testnet',
        creatorId: 'foundry.testnet',
        signerId: 'buyer.testnet',
        dealId: '1',
        keyFile: clientFile,
        payoutKeyFile: keyFile,
        rpc: rpcOk('EscrowAcceptHash1111111111111111111111111', calls),
      });
      expect(calls[3].params.method).toBe('accept');
      expect(calls[4].params.method).toBe('withdraw');
      expect(calls[4].params.signerId).toBe('foundry.testnet');
      expect(accepted.method).toBe('withdraw');
      const zero = escrow.escrowCall({
        action: 'open',
        escrowId: 'escrow.testnet',
        creatorId: 'foundry.testnet',
        clientPk: client.publicHex,
        price: '1000000',
        keyFile,
        deliverNs: 0,
      });
      expect(JSON.parse(String(zero.args.payload)).deliver_ns).toBe(0);
      await escrow.runNearEscrow({
        dest,
        action: 'refund',
        escrowId: 'escrow.testnet',
        creatorId: 'foundry.testnet',
        signerId: 'buyer.testnet',
        dealId: '2',
        keyFile: clientFile,
        rpc: rpcOk('EscrowRefundHash1111111111111111111111111', calls),
      });
      expect(calls[5].params.method).toBe('refund_late');
      expect(calls[6].params.method).toBe('withdraw');
      expect(calls[6].params.signerId).toBe('buyer.testnet');
      const status = doctor.nearStatusBlock(dest);
      expect(status).toContain('Escrow: escrow.testnet contract escrow.testnet tx EscrowRefundHash1111111111111111111111111');
      expect(status).not.toContain(pair.privateKey);
      expect(status).not.toContain(client.privateKey);
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });

  it('does not resend a pending payment, refuses a lock, and adopts a chain hash', async () => {
    const dest = scratch();
    const quote = { receiver: 'shop.testnet', amount: '10000', nonce: 'quote-lock' };
    const base = {
      dest,
      signerId: 'payer.testnet',
      receiver: quote.receiver,
      amount: quote.amount,
      nonce: quote.nonce,
      quote,
    };
    let broadcasts = 0;
    const rpc = async (method: string) => {
      if (method === 'query') return { parsed: { total: '1' } };
      if (method === 'ft_transfers') return null;
      broadcasts += 1;
      throw new Error('lost response');
    };
    try {
      await expect(pay.payNear({ ...base, rpc })).rejects.toThrow('lost response');
      expect(broadcasts).toBe(1);
      const pending = tx.readRail(dest).pay.payments['near-pay:quote-lock'];
      expect(pending.status).toBe('pending');
      await expect(pay.payNear({ ...base, rpc })).rejects.toThrow('pending, unconfirmed');
      expect(broadcasts).toBe(1);
      const recovered = await pay.payNear({
        ...base,
        rpc: async (method: string) => {
          if (method === 'query') return { parsed: { total: '1' } };
          if (method === 'ft_transfers') return { hash: 'ChainHash1111111111111111111111111111' };
          broadcasts += 1;
          throw new Error('must not resend');
        },
      });
      expect(recovered.recovered).toBe(true);
      expect(recovered.hash).toBe('ChainHash1111111111111111111111111111');
      expect(broadcasts).toBe(1);
      mkdirSync(path.dirname(tx.railPath(dest)), { recursive: true });
      writeFileSync(tx.lockPath(dest), '');
      await expect(pay.payNear({ ...base, rpc })).rejects.toThrow('rail file is locked');
      expect(broadcasts).toBe(1);
      tx.rememberRow(dest, 'cap', { account: 'owner.testnet', contract: 'vault.testnet', lastTx: 'h', perTxCap: '100' });
      rmSync(tx.lockPath(dest), { force: true });
      await expect(pay.payNear({
        ...base,
        amount: '1000',
        quote: { ...quote, amount: '1000', nonce: 'over-cap' },
        nonce: 'over-cap',
        rpc,
      })).rejects.toThrow('spend cap');
    } finally {
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
