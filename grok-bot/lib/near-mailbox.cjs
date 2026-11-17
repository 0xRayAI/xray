'use strict';

const { escrowCall } = require('./near-escrow.cjs');
const { USDC, rememberRow, submit, viewFunction } = require('./near-tx.cjs');

// The USDC price is locked in the Clearing escrow. This mailbox stores the job.
// Payee for a released job is the foundry treasury on testnet.

const PAYEE = 'clearing-treasury-0xray.testnet';
const MAILBOX_USAGE = 'grok-bot near-mailbox <post|claim|submit|accept|refund|release|jobs> --mailbox <account> --escrow <account> --signer <account> --key <cold.json>';

function take(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    const err = new Error(`${flag} needs a value\n${MAILBOX_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return value;
}

function parseNearMailboxArgs(argv) {
  const out = {
    help: false,
    action: null,
    mailbox: null,
    escrow: null,
    signer: null,
    keyFile: null,
    payoutKey: null,
    creator: null,
    buyer: null,
    brief: null,
    price: null,
    deal: null,
    job: null,
    result: null,
    payee: PAYEE,
    cwd: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (!arg.startsWith('-') && !out.action) {
      out.action = arg;
      continue;
    }
    const flags = ['--mailbox', '--escrow', '--signer', '--key', '--payout-key', '--creator', '--buyer', '--brief', '--price', '--deal', '--job', '--result', '--payee', '--cwd'];
    if (flags.includes(arg)) {
      const value = take(argv, i, arg);
      if (arg === '--mailbox') out.mailbox = value;
      else if (arg === '--escrow') out.escrow = value;
      else if (arg === '--signer') out.signer = value;
      else if (arg === '--key') out.keyFile = value;
      else if (arg === '--payout-key') out.payoutKey = value;
      else if (arg === '--creator') out.creator = value;
      else if (arg === '--buyer') out.buyer = value;
      else if (arg === '--brief') out.brief = value;
      else if (arg === '--price') out.price = value;
      else if (arg === '--deal') out.deal = value;
      else if (arg === '--job') out.job = value;
      else if (arg === '--result') out.result = value;
      else if (arg === '--payee') out.payee = value;
      else out.cwd = value;
      i += 1;
      continue;
    }
    const err = new Error(`unknown argument ${arg}\n${MAILBOX_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return out;
}

function createMailbox(opts = {}) {
  return {
    nextId: 1,
    payee: opts.payee || PAYEE,
    escrowAccount: opts.escrowAccount || '',
    claimWindowNs: BigInt(opts.claimWindowNs || 600000000000),
    submitWindowNs: BigInt(opts.submitWindowNs || 600000000000),
    jobs: [],
  };
}

function jobById(state, id) {
  const job = state.jobs.find((row) => row.id === id);
  if (!job) throw new Error('unknown job');
  return job;
}

function postJob(state, input) {
  if (!input.deposit || input.deposit === '0') throw new Error('deposit is required');
  if (!input.brief || typeof input.brief !== 'string') throw new Error('brief is required');
  if (!input.escrowId) throw new Error('escrow id is required');
  if (!input.buyer) throw new Error('buyer is required');
  const job = {
    id: state.nextId,
    buyer: input.buyer,
    brief: input.brief,
    escrow_id: String(input.escrowId),
    status: 'posted',
    claimer: null,
    result: null,
    expires_at: (BigInt(input.now) + state.claimWindowNs).toString(),
  };
  state.nextId += 1;
  state.jobs.push(job);
  return job;
}

function claimJob(state, input) {
  const job = jobById(state, input.id);
  if (job.status !== 'posted') throw new Error('job is not posted');
  if (BigInt(input.now) > BigInt(job.expires_at)) throw new Error('job has expired');
  job.status = 'claimed';
  job.claimer = input.claimer;
  job.expires_at = (BigInt(input.now) + state.submitWindowNs).toString();
  return job;
}

function submitResult(state, input) {
  const job = jobById(state, input.id);
  if (job.status !== 'claimed') throw new Error('job is not claimed');
  if (job.claimer !== input.claimer) throw new Error('only the claimer submits');
  if (BigInt(input.now) > BigInt(job.expires_at)) throw new Error('submit window has passed');
  if (!input.result) throw new Error('result is required');
  job.status = 'submitted';
  job.result = input.result;
  job.expires_at = (BigInt(input.now) + state.submitWindowNs).toString();
  return job;
}

function acceptJob(state, input) {
  const job = jobById(state, input.id);
  if (job.buyer !== input.buyer) throw new Error('only the buyer accepts');
  if (job.status !== 'submitted') throw new Error('job is not submitted');
  job.status = 'accepted';
  return { job, escrowId: job.escrow_id, payee: state.payee };
}

function releaseTimeout(state, input) {
  const job = jobById(state, input.id);
  if (job.status !== 'submitted') throw new Error('job is not submitted');
  if (BigInt(input.now) <= BigInt(job.expires_at)) throw new Error('submit window has not passed');
  job.status = 'released';
  return { job, escrowId: job.escrow_id, payee: state.payee };
}

function refundExpired(state, input) {
  const job = jobById(state, input.id);
  if (job.status !== 'posted') throw new Error('job is not posted');
  if (BigInt(input.now) <= BigInt(job.expires_at)) throw new Error('job has not expired');
  job.status = 'refunded';
  return { job, buyer: job.buyer, escrowId: job.escrow_id };
}

function getJobs(state, query = {}) {
  const from = query.from == null ? 0 : Number(query.from);
  const limit = query.limit == null ? 50 : Number(query.limit);
  return state.jobs
    .filter((job) => job.id >= from)
    .filter((job) => !query.status || job.status === query.status)
    .slice(0, limit);
}

function web4Response(jobs, requestPath) {
  const path = String(requestPath || '/').split('?')[0];
  const match = path.match(/^\/jobs\/(\d+)$/);
  if (match) {
    const job = jobs.find((row) => String(row.id) === match[1]);
    const body = job || { error: 'unknown job' };
    return {
      contentType: 'application/json',
      status: job ? 200 : 404,
      body: Buffer.from(JSON.stringify(body)).toString('base64'),
    };
  }
  return {
    contentType: 'application/json',
    status: 200,
    body: Buffer.from(JSON.stringify(jobs)).toString('base64'),
  };
}

function fundEscrowAction(opts) {
  return escrowCall({
    action: 'fund',
    escrowId: opts.escrowId,
    creatorId: opts.creatorId,
    signerId: opts.buyerId,
    price: opts.price,
    dealId: opts.escrowDealId,
  });
}

function postJobAction(opts) {
  return {
    signerId: opts.buyerId,
    receiverId: opts.mailboxId,
    method: 'post_job',
    args: { brief: opts.brief, escrow_id: Number(opts.escrowDealId) },
    gas: '50 Tgas',
    deposit: '0.02 NEAR',
  };
}

function postPlan(opts) {
  if (!opts.brief) throw new Error('brief is required');
  if (opts.escrowId === opts.creatorId) throw new Error('escrow account must not be the foundry');
  return [fundEscrowAction(opts), postJobAction(opts)];
}

function mailboxMethod(action, opts) {
  if (action === 'claim') {
    return { method: 'claim_job', args: { id: Number(opts.jobId) }, deposit: '0 NEAR' };
  }
  if (action === 'submit') {
    if (!opts.result) throw new Error('result is required');
    return { method: 'submit_result', args: { id: Number(opts.jobId), result: opts.result }, deposit: '0 NEAR' };
  }
  if (action === 'accept') return { method: 'accept', args: { id: Number(opts.jobId) }, deposit: '0 NEAR' };
  if (action === 'refund') return { method: 'refund_expired', args: { id: Number(opts.jobId) }, deposit: '0 NEAR' };
  if (action === 'release') return { method: 'release_timeout', args: { id: Number(opts.jobId) }, deposit: '0 NEAR' };
  throw new Error(MAILBOX_USAGE);
}

function payoutTransfer(opts) {
  return {
    signerId: opts.creatorId,
    receiverId: opts.tokenId,
    method: 'ft_transfer',
    args: {
      receiver_id: opts.payee || PAYEE,
      amount: opts.price,
      memo: `mailbox-job-${opts.jobId}`,
    },
    gas: '40 Tgas',
    deposit: '1 yoctoNEAR',
  };
}

async function runNearMailbox(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  if (opts.action === 'jobs') {
    const jobs = await viewFunction(opts.mailboxId, 'get_jobs', {
      status: opts.status || null,
      from: 0,
      limit: 50,
    }, opts);
    return { jobs: jobs || [], account: opts.mailboxId };
  }
  if (opts.action === 'post') {
    const plan = postPlan(opts);
    let last = null;
    for (const action of plan) {
      last = await submit(action, opts);
    }
    rememberRow(opts.dest, 'mailbox', {
      account: opts.mailboxId,
      contract: opts.mailboxId,
      lastTx: last.hash,
    });
    return { hash: last.hash, account: opts.mailboxId, payee: opts.payee || PAYEE };
  }
  const call = mailboxMethod(opts.action, opts);
  const sent = await submit({
    signerId: opts.signerId,
    receiverId: opts.mailboxId,
    method: call.method,
    args: call.args,
    gas: '50 Tgas',
    deposit: call.deposit,
  }, opts);
  let hash = sent.hash;
  if (opts.action === 'accept' || opts.action === 'release' || opts.action === 'refund') {
    const escrowAction = opts.action === 'refund'
      ? escrowCall({
        action: 'refund',
        escrowId: opts.escrowId,
        creatorId: opts.creatorId,
        signerId: opts.buyerId || opts.signerId,
        dealId: opts.escrowDealId,
      })
      : opts.action === 'release'
        ? {
          signerId: opts.signerId,
          receiverId: opts.escrowId,
          method: 'release_after_timeout',
          args: { deal_id: Number(opts.escrowDealId) },
          gas: '40 Tgas',
          deposit: '0 NEAR',
        }
        : escrowCall({
          action: 'accept',
          escrowId: opts.escrowId,
          creatorId: opts.creatorId,
          signerId: opts.buyerId || opts.signerId,
          dealId: opts.escrowDealId,
          keyFile: opts.keyFile,
        });
    const released = await submit(escrowAction, opts);
    const withdrawn = await submit(escrowCall({
      action: 'withdraw',
      escrowId: opts.escrowId,
      creatorId: opts.creatorId,
      signerId: opts.action === 'refund' ? (opts.buyerId || opts.signerId) : opts.creatorId,
    }), { ...opts, keyFile: opts.payoutKeyFile || opts.keyFile });
    const paid = opts.action === 'refund'
      ? withdrawn
      : await submit(payoutTransfer({
        creatorId: opts.creatorId,
        tokenId: opts.tokenId || USDC,
        payee: opts.payee || PAYEE,
        price: opts.price,
        jobId: opts.jobId,
      }), { ...opts, keyFile: opts.payoutKeyFile || opts.keyFile });
    hash = paid.hash;
    rememberRow(opts.dest, 'mailbox', {
      account: opts.mailboxId,
      contract: opts.mailboxId,
      lastTx: hash,
      escrowTx: released.hash,
      withdrawTx: withdrawn.hash,
    });
    return {
      hash,
      account: opts.mailboxId,
      payee: opts.action === 'refund' ? (opts.buyerId || opts.signerId) : (opts.payee || PAYEE),
      escrowTx: released.hash,
    };
  }
  rememberRow(opts.dest, 'mailbox', {
    account: opts.mailboxId,
    contract: opts.mailboxId,
    lastTx: hash,
  });
  return { hash, account: opts.mailboxId };
}

async function runNearMailboxCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  let parsed;
  try {
    parsed = parseNearMailboxArgs(argv);
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }
  if (parsed.help || !parsed.action) {
    stdout.write(`${MAILBOX_USAGE}\n`);
    return parsed.help ? 0 : 2;
  }
  if (!parsed.mailbox || !parsed.keyFile) {
    stderr.write(`${MAILBOX_USAGE}\n`);
    return 2;
  }
  try {
    const result = await runNearMailbox({
      dest: parsed.cwd || io.cwd || process.cwd(),
      action: parsed.action,
      mailboxId: parsed.mailbox,
      escrowId: parsed.escrow,
      signerId: parsed.signer,
      buyerId: parsed.buyer || parsed.signer,
      creatorId: parsed.creator,
      keyFile: parsed.keyFile,
      payoutKeyFile: parsed.payoutKey,
      brief: parsed.brief,
      price: parsed.price,
      escrowDealId: parsed.deal,
      jobId: parsed.job,
      result: parsed.result,
      payee: parsed.payee,
      status: null,
      rpc: io.rpc,
      network: 'testnet',
    });
    if (parsed.action === 'jobs') {
      stdout.write(`${JSON.stringify(result.jobs)}\n`);
      return 0;
    }
    stdout.write(`Mailbox: ${result.account} contract ${result.account} tx ${result.hash}\n`);
    if (result.payee) stdout.write(`payee: ${result.payee}\n`);
    return 0;
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}

module.exports = {
  PAYEE,
  MAILBOX_USAGE,
  acceptJob,
  claimJob,
  createMailbox,
  fundEscrowAction,
  getJobs,
  mailboxMethod,
  parseNearMailboxArgs,
  payoutTransfer,
  postJob,
  postJobAction,
  postPlan,
  refundExpired,
  releaseTimeout,
  runNearMailbox,
  runNearMailboxCli,
  submitResult,
  web4Response,
};
