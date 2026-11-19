import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const box = requireCjs(path.join(root, 'grok-bot/lib/near-mailbox.cjs')) as {
  USDC: string;
  MAILBOX_USAGE: string;
  beginSettle: (state: Mailbox, input: { id: number; buyer: string }) => { job: Job; payee: string };
  dealFunded: (deal: { state?: string; price?: string; client?: string; token?: string; payee?: string }, ctx: { bound?: boolean; amount: string; buyer: string; token: string; payee: string }) => string;
  observeSettle: (state: Mailbox, id: number, escrowView: { state: string; balance: string }) => Job;
  claimJob: (state: Mailbox, input: { id: number; claimer: string; now: bigint }) => Job;
  createMailbox: (opts?: { payee?: string; escrowAccount?: string; claimWindowNs?: bigint; submitWindowNs?: bigint; network?: string }) => Mailbox;
  failSettle: (state: Mailbox, id: number) => Job;
  advanceSettle: (state: Mailbox, id: number) => Job;
  retrySettle: (state: Mailbox, id: number) => { step: string; payee: string };
  getJobs: (state: Mailbox, query?: { status?: string }) => Job[];
  payoutAccount: (state: Mailbox, job: Job) => string | null;
  postPlan: (opts: { brief: string; price: string; mailboxId: string; escrowId: string; escrowDealId: string; buyerId: string; fundNonce: string; fundSignature: string }) => Array<{ method: string; receiverId: string; args: { receiver_id?: string; amount?: string; msg?: string; deal_id?: number; brief?: string } }>;
  recordFundedJob: (state: Mailbox, input: Record<string, unknown>) => Job;
  rejectPlainTransfer: (state: Mailbox, amount: string) => { refund: string; jobs: number; deals: number };
  refundExpired: (state: Mailbox, input: { id: number; now: bigint; escrowState?: string }) => { job: Job; buyer: string };
  releaseCall: (opts: { escrowId: string; creatorId: string; signerId: string; escrowDealId: string }) => { method: string; args: { deal_id: number } };
  releaseTimeout: (state: Mailbox, input: { id: number; now: bigint }) => { payee: string; method: string };
  submitResult: (state: Mailbox, input: { id: number; claimer: string; result: string; now: bigint }) => Job;
  web4Response: (jobs: Job[], path: string) => { status: number; body: string };
  runNearMailboxCli: (argv: string[], io?: { stdout?: { write: (chunk: string) => void } }) => Promise<number>;
};
const escrow = requireCjs(path.join(root, 'grok-bot/lib/near-escrow.cjs')) as {
  escrowCall: (opts: { action: string; escrowId: string; creatorId: string; signerId: string; dealId: string }) => { method: string; args: { deal_id: number } };
};

type Job = {
  id: number;
  buyer: string;
  status: string;
  claimer: string | null;
  escrow_id: string;
  expires_at: string;
  claim_deadline: string | null;
  settle_step: string;
  payout: string | null;
  result: string | null;
};

type Mailbox = {
  jobs: Job[];
  deals: Record<string, number>;
  nextId: number;
  payee: string | null;
  escrowAccount: string;
  network: string;
};

const NOW = 1_000n;
const BUYER = 'buyer.testnet';
const WORKER = 'worker.testnet';
const OTHER = 'other.testnet';
const ESCROW = 'escrow.testnet';
const TREASURY = 'clearing-treasury-0xray.testnet';

const FOUNDRY = 'foundry.testnet';

function funded(payee?: string) {
  const state = box.createMailbox({
    payee,
    foundry: FOUNDRY,
    escrowAccount: ESCROW,
    claimWindowNs: 100n,
    submitWindowNs: 50n,
  });
  const job = box.recordFundedJob(state, {
    buyer: BUYER,
    brief: 'write a page',
    price: '1000000',
    amount: '1000000',
    client: BUYER,
    token: box.USDC,
    payee: FOUNDRY,
    state: 'Funded',
    escrowId: '7',
    now: NOW,
  });
  return { state, job };
}

describe('foundry job mailbox', () => {
  it('pays the claimer when no payee is set, and the configured payee when one is', () => {
    const open = funded();
    expect(open.state.payee).toBeNull();
    box.claimJob(open.state, { id: 1, claimer: FOUNDRY, now: NOW + 5n });
    box.submitResult(open.state, { id: 1, claimer: FOUNDRY, result: 'page is up', now: NOW + 10n });
    const settled = box.beginSettle(open.state, { id: 1, buyer: BUYER });
    expect(settled.payee).toBe(FOUNDRY);
    expect(box.payoutAccount(open.state, settled.job)).toBe(FOUNDRY);

    const named = funded(TREASURY);
    box.claimJob(named.state, { id: 1, claimer: FOUNDRY, now: NOW + 5n });
    box.submitResult(named.state, { id: 1, claimer: FOUNDRY, result: 'page is up', now: NOW + 10n });
    expect(box.beginSettle(named.state, { id: 1, buyer: BUYER }).payee).toBe(TREASURY);
  });

  it('refunds a plain transfer and stores no job', () => {
    const state = box.createMailbox({ foundry: FOUNDRY, escrowAccount: ESCROW });
    const refund = box.rejectPlainTransfer(state, '1000');
    expect(refund.refund).toBe('1000');
    expect(refund.jobs).toBe(0);
    expect(refund.deals).toBe(0);
    expect(state.jobs).toEqual([]);
    expect(state.deals).toEqual({});
    expect(state.nextId).toBe(1);
    const rust = readFileSync(path.join(root, 'grok-bot/near/mailbox/src/lib.rs'), 'utf8');
    expect(rust).toContain('PromiseOrValue::Value(amount)');
    expect(rust).not.toContain('on_deal_checked');
    expect(rust).not.toContain('on_escrow_funded');
    expect(rust).not.toContain('ft_transfer_call');
  });

  it('stores a job only after the escrow funding is verified', () => {
    const state = box.createMailbox({ escrowAccount: ESCROW });
    expect(() => box.recordFundedJob(state, {
      buyer: BUYER,
      brief: 'write a page',
      price: '1000000',
      amount: '1000000',
      token: box.USDC,
      receiver: ESCROW,
      escrowId: '7',
      now: NOW,
    })).toThrow('escrow is not funded');
    expect(() => box.recordFundedJob(state, {
      buyer: BUYER,
      brief: 'write a page',
      price: '1000000',
      amount: '1',
      token: box.USDC,
      receiver: ESCROW,
      funded: true,
      escrowId: '7',
      now: NOW,
    })).toThrow('escrow amount does not match');
    const plan = box.postPlan({
      brief: 'write a page',
      price: '1000000',
      mailboxId: 'box.foundry.testnet',
      escrowId: ESCROW,
      escrowDealId: '7',
      buyerId: BUYER,
      fundNonce: 'nonce1234567890ab',
      fundSignature: 'aa',
    });
    const msg = JSON.parse(String(plan[0].args.msg));
    expect(msg.deal_id).toBe(7);
    expect(msg.nonce).toBe('nonce1234567890ab');
    expect(msg.signature).toBe('aa');
    expect(plan[0].method).toBe('ft_transfer_call');
    expect(plan[0].args.receiver_id).toBe(ESCROW);
    expect(plan[1].method).toBe('bind_job');
    expect(plan[1].receiverId).toBe('box.foundry.testnet');
    expect(plan.some((row) => row.method === 'post_job')).toBe(false);
  });

  it('rejects the wrong buyer, token, payee, and a reused deal', () => {
    const ctx = { amount: '1000000', buyer: BUYER, token: box.USDC, payee: FOUNDRY, bound: false };
    const good = { state: 'Funded', price: '1000000', client: BUYER, token: box.USDC, payee: FOUNDRY };
    expect(box.dealFunded(good, ctx)).toBe('');
    expect(box.dealFunded({ ...good, client: OTHER }, ctx)).toBe('escrow buyer does not match');
    expect(box.dealFunded({ ...good, token: 'other.token' }, ctx)).toBe('escrow token is not testnet USDC');
    expect(box.dealFunded({ ...good, payee: 'other.testnet' }, ctx)).toBe('escrow payee does not match');
    expect(box.dealFunded(good, { ...ctx, bound: true })).toBe('deal is already bound');
    const { state } = funded();
    expect(() => box.recordFundedJob(state, {
      buyer: BUYER,
      brief: 'again',
      price: '1000000',
      amount: '1000000',
      client: BUYER,
      token: box.USDC,
      payee: FOUNDRY,
      state: 'Funded',
      escrowId: '7',
      now: NOW,
    })).toThrow('deal is already bound');
  });

  it('rejects a second claim and a submit from someone else', () => {
    const { state } = funded();
    expect(() => box.claimJob(state, { id: 1, claimer: OTHER, now: NOW + 10n })).toThrow('only the foundry claims');
    box.claimJob(state, { id: 1, claimer: FOUNDRY, now: NOW + 10n });
    expect(() => box.claimJob(state, { id: 1, claimer: OTHER, now: NOW + 11n })).toThrow('only the foundry claims');
    expect(() => box.submitResult(state, { id: 1, claimer: OTHER, result: 'done', now: NOW + 12n })).toThrow('only the claimer submits');
  });

  it('records a refund only after the escrow has refunded the deal', () => {
    const posted = funded();
    expect(() => box.refundExpired(posted.state, { id: 1, now: NOW + 101n, escrowState: 'Funded' })).toThrow('escrow has not refunded this deal');
    const refunded = box.refundExpired(posted.state, { id: 1, now: NOW + 101n, escrowState: 'Refunded' });
    expect(refunded.job.status).toBe('refunded');
    expect(refunded.buyer).toBe(BUYER);

    const claimed = funded();
    box.claimJob(claimed.state, { id: 1, claimer: FOUNDRY, now: NOW + 5n });
    const late = box.refundExpired(claimed.state, { id: 1, now: NOW + 1n, escrowState: 'Refunded' });
    expect(late.job.status).toBe('refunded');
    expect(late.buyer).toBe(BUYER);
  });

  it('uses the escrow release_after_timeout method', () => {
    const { state } = funded(TREASURY);
    box.claimJob(state, { id: 1, claimer: FOUNDRY, now: NOW + 5n });
    box.submitResult(state, { id: 1, claimer: FOUNDRY, result: 'page is up', now: NOW + 20n });
    const released = box.releaseTimeout(state, { id: 1, now: NOW + 101n });
    expect(released.method).toBe('release_after_timeout');
    expect(released.payee).toBe(TREASURY);
    const call = escrow.escrowCall({
      action: 'release',
      escrowId: ESCROW,
      creatorId: 'foundry.testnet',
      signerId: WORKER,
      dealId: '7',
    });
    expect(call.method).toBe('release_after_timeout');
    expect(call.args.deal_id).toBe(7);
    expect(box.releaseCall({
      escrowId: ESCROW,
      creatorId: 'foundry.testnet',
      signerId: WORKER,
      escrowDealId: '7',
    }).method).toBe('release_after_timeout');
  });

  it('rolls an escrow failure back and resumes withdraw or transfer', () => {
    const { state } = funded();
    box.claimJob(state, { id: 1, claimer: FOUNDRY, now: NOW + 5n });
    box.submitResult(state, { id: 1, claimer: FOUNDRY, result: 'page is up', now: NOW + 10n });
    box.beginSettle(state, { id: 1, buyer: BUYER });
    expect(box.failSettle(state, 1).status).toBe('submitted');
    box.beginSettle(state, { id: 1, buyer: BUYER });
    expect(box.observeSettle(state, 1, { state: 'Funded', balance: '1000000' }).settle_step).toBe('escrow');
    state.jobs[0].settle_step = 'withdraw';
    expect(box.observeSettle(state, 1, { state: 'Funded', balance: '0' }).settle_step).toBe('withdraw');
    expect(box.observeSettle(state, 1, { state: 'Released', balance: '1000000' }).settle_step).toBe('transfer');
    expect(box.observeSettle(state, 1, { state: 'Released', balance: '1000000' }).status).toBe('settling');
    expect(box.observeSettle(state, 1, { state: 'Released', balance: '0' }).status).toBe('accepted');
  });

  it('keeps the contract on testnet and off a hardcoded treasury', async () => {
    const source = readFileSync(path.join(root, 'grok-bot/lib/near-mailbox.cjs'), 'utf8');
    const rust = readFileSync(path.join(root, 'grok-bot/near/mailbox/src/lib.rs'), 'utf8');
    const bin = readFileSync(path.join(root, 'grok-bot/bin/grok-bot.js'), 'utf8');
    expect(source).not.toContain('clearing-treasury-0xray.testnet');
    expect(rust).toContain('network must be testnet');
    expect(rust).toContain('mailbox is testnet only');
    expect(rust).toContain('fn ft_on_transfer');
    expect(rust).toContain('fn bind_job');
    expect(rust).toContain('fn retry_settle');
    expect(rust).toContain('deal is already bound');
    expect(rust).toContain('get_creator_pk');
    expect(rust).toContain('on_retry_checked');
    expect(rust).toContain('release_after_timeout');
    expect(rust).toContain('only the foundry claims');
    expect(rust).toContain('escrow has not refunded this deal');
    expect(rust).toContain('only the token');
    expect(rust).not.toContain('.refund_late(');
    expect(rust).not.toContain('fn post_job');
    expect(bin).toContain("args[0] === 'near-mailbox'");
    const mainnet = box.createMailbox({ escrowAccount: 'escrow.near', network: 'mainnet' });
    expect(() => box.recordFundedJob(mainnet, {
      buyer: BUYER,
      brief: 'write a page',
      price: '1000000',
      amount: '1000000',
      token: box.USDC,
      receiver: 'escrow.near',
      funded: true,
      escrowId: '7',
      now: NOW,
    })).toThrow('mailbox is testnet only');
    const stdout: string[] = [];
    const code = await box.runNearMailboxCli(['--help'], { stdout: { write: (chunk) => stdout.push(chunk) } });
    expect(code).toBe(0);
    expect(stdout.join('')).toContain(box.MAILBOX_USAGE);
    expect(box.getJobs(funded().state, { status: 'posted' })).toHaveLength(1);
  });
});
