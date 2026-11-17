import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const box = requireCjs(path.join(root, 'grok-bot/lib/near-mailbox.cjs')) as {
  PAYEE: string;
  MAILBOX_USAGE: string;
  acceptJob: (state: Mailbox, input: { id: number; buyer: string }) => { job: Job; escrowId: string; payee: string };
  claimJob: (state: Mailbox, input: { id: number; claimer: string; now: bigint }) => Job;
  createMailbox: (opts?: { claimWindowNs?: bigint; submitWindowNs?: bigint }) => Mailbox;
  fundEscrowAction: (opts: { escrowId: string; creatorId: string; buyerId: string; price: string; escrowDealId: string }) => { receiverId: string; method: string; args: { receiver_id: string; amount: string; msg: string } };
  getJobs: (state: Mailbox, query?: { status?: string; from?: number; limit?: number }) => Job[];
  parseNearMailboxArgs: (argv: string[]) => { action: string | null; payee: string };
  postJob: (state: Mailbox, input: { buyer: string; brief: string; escrowId: string; now: bigint; deposit: string }) => Job;
  postPlan: (opts: { brief: string; escrowId: string; creatorId: string; buyerId: string; price: string; escrowDealId: string; mailboxId: string }) => Array<{ method: string; receiverId: string; args: { receiver_id?: string; brief?: string; escrow_id?: number } }>;
  refundExpired: (state: Mailbox, input: { id: number; now: bigint }) => { job: Job; buyer: string };
  releaseTimeout: (state: Mailbox, input: { id: number; now: bigint }) => { job: Job; payee: string };
  submitResult: (state: Mailbox, input: { id: number; claimer: string; result: string; now: bigint }) => Job;
  web4Response: (jobs: Job[], path: string) => { contentType: string; status: number; body: string };
  runNearMailboxCli: (argv: string[], io?: { stdout?: { write: (chunk: string) => void }; stderr?: { write: (chunk: string) => void } }) => Promise<number>;
};

type Job = {
  id: number;
  buyer: string;
  brief: string;
  escrow_id: string;
  status: string;
  claimer: string | null;
  result: string | null;
  expires_at: string;
};

type Mailbox = { jobs: Job[]; payee: string; nextId: number };

const NOW = 1_000n;
const BUYER = 'buyer.testnet';
const WORKER = 'worker.testnet';
const OTHER = 'other.testnet';

function posted() {
  const state = box.createMailbox({ claimWindowNs: 100n, submitWindowNs: 50n });
  const job = box.postJob(state, {
    buyer: BUYER,
    brief: 'write a page',
    escrowId: '7',
    now: NOW,
    deposit: '0.02 NEAR',
  });
  return { state, job };
}

describe('foundry job mailbox', () => {
  it('posts a job and serves it on the read-only page', () => {
    const { state, job } = posted();
    expect(job).toMatchObject({
      id: 1,
      buyer: BUYER,
      brief: 'write a page',
      escrow_id: '7',
      status: 'posted',
      claimer: null,
      result: null,
    });
    expect(job.expires_at).toBe('1100');
    expect(box.getJobs(state, { status: 'posted', from: 1, limit: 10 })).toEqual([job]);
    expect(box.getJobs(state, { status: 'claimed' })).toEqual([]);
    const page = box.web4Response(state.jobs, '/jobs/1');
    expect(page.contentType).toBe('application/json');
    expect(page.status).toBe(200);
    expect(JSON.parse(Buffer.from(page.body, 'base64').toString('utf8')).id).toBe(1);
    expect(box.web4Response(state.jobs, '/jobs/9').status).toBe(404);
  });

  it('rejects a second claim and a submit from someone else', () => {
    const { state } = posted();
    box.claimJob(state, { id: 1, claimer: WORKER, now: NOW + 10n });
    expect(() => box.claimJob(state, { id: 1, claimer: OTHER, now: NOW + 11n })).toThrow('job is not posted');
    expect(() => box.submitResult(state, { id: 1, claimer: OTHER, result: 'done', now: NOW + 12n })).toThrow('only the claimer submits');
  });

  it('refunds the buyer when a posted job expires unclaimed', () => {
    const { state } = posted();
    expect(() => box.refundExpired(state, { id: 1, now: NOW + 50n })).toThrow('job has not expired');
    const refunded = box.refundExpired(state, { id: 1, now: NOW + 101n });
    expect(refunded.job.status).toBe('refunded');
    expect(refunded.buyer).toBe(BUYER);
    expect(refunded.job.escrow_id).toBe('7');
  });

  it('releases the escrow to the treasury when the buyer accepts', () => {
    const { state } = posted();
    box.claimJob(state, { id: 1, claimer: WORKER, now: NOW + 5n });
    box.submitResult(state, { id: 1, claimer: WORKER, result: 'page is up', now: NOW + 20n });
    const accepted = box.acceptJob(state, { id: 1, buyer: BUYER });
    expect(accepted.job.status).toBe('accepted');
    expect(accepted.escrowId).toBe('7');
    expect(accepted.payee).toBe(box.PAYEE);
    expect(accepted.payee).toBe('clearing-treasury-0xray.testnet');
    expect(() => box.acceptJob(state, { id: 1, buyer: OTHER })).toThrow('only the buyer accepts');
  });

  it('pays the treasury after the submit window when the buyer does not accept', () => {
    const { state } = posted();
    box.claimJob(state, { id: 1, claimer: WORKER, now: NOW + 5n });
    const submitted = box.submitResult(state, { id: 1, claimer: WORKER, result: 'page is up', now: NOW + 20n });
    const deadline = BigInt(submitted.expires_at);
    expect(() => box.releaseTimeout(state, { id: 1, now: deadline })).toThrow('submit window has not passed');
    const released = box.releaseTimeout(state, { id: 1, now: deadline + 1n });
    expect(released.job.status).toBe('released');
    expect(released.payee).toBe('clearing-treasury-0xray.testnet');
  });

  it('locks the USDC deposit in the Clearing escrow when a job is posted', () => {
    const plan = box.postPlan({
      brief: 'write a page',
      escrowId: 'escrow.testnet',
      creatorId: 'foundry.testnet',
      buyerId: BUYER,
      price: '1000000',
      escrowDealId: '7',
      mailboxId: 'box.foundry.testnet',
    });
    expect(plan[0].receiverId).not.toBe('box.foundry.testnet');
    expect(plan[0].method).toBe('ft_transfer_call');
    expect(plan[0].args.receiver_id).toBe('escrow.testnet');
    expect(plan[0].args.amount).toBe('1000000');
    expect(JSON.parse(plan[0].args.msg || '{}')).toEqual({ deal_id: 7 });
    expect(plan[1].method).toBe('post_job');
    expect(plan[1].receiverId).toBe('box.foundry.testnet');
    expect(plan[1].args).toEqual({ brief: 'write a page', escrow_id: 7 });
    expect(box.fundEscrowAction({
      escrowId: 'escrow.testnet',
      creatorId: 'foundry.testnet',
      buyerId: BUYER,
      price: '1000000',
      escrowDealId: '7',
    }).args.receiver_id).toBe('escrow.testnet');
  });

  it('is wired as a grok-bot command and the contract exposes the mailbox methods', async () => {
    const bin = readFileSync(path.join(root, 'grok-bot/bin/grok-bot.js'), 'utf8');
    const source = readFileSync(path.join(root, 'grok-bot/near/mailbox/src/lib.rs'), 'utf8');
    const skill = readFileSync(path.join(root, 'grok-bot/skills/near-mill/SKILL.md'), 'utf8');
    expect(bin).toContain("args[0] === 'near-mailbox'");
    expect(source).toContain('fn post_job');
    expect(source).toContain('fn claim_job');
    expect(source).toContain('fn submit_result');
    expect(source).toContain('fn accept');
    expect(source).toContain('fn get_jobs');
    expect(source).toContain('fn web4_get');
    expect(source).toContain('fn refund_expired');
    expect(source).toContain('fn release_timeout');
    expect(skill).toContain('clearing-treasury-0xray.testnet');
    expect(skill).not.toMatch(/\bplanes\b/i);
    const stdout: string[] = [];
    const code = await box.runNearMailboxCli(['--help'], { stdout: { write: (chunk) => stdout.push(chunk) } });
    expect(code).toBe(0);
    expect(stdout.join('')).toContain(box.MAILBOX_USAGE);
    expect(box.parseNearMailboxArgs(['post']).payee).toBe('clearing-treasury-0xray.testnet');
  });
});
