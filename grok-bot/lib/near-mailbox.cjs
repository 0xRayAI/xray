'use strict';

const { escrowCall, escrowMessage } = require('./near-escrow.cjs');
const { USDC, readKeyFile, rememberRow, signHex, submit, viewFunction } = require('./near-tx.cjs');

// The USDC price is locked in the Clearing escrow. The payee is chosen at init.
// When no payee is set, the claimer is paid.

const MAILBOX_USAGE = 'grok-bot near-mailbox <post|claim|submit|accept|refund|release|retry|jobs> --mailbox <account> --escrow <account> --signer <account> --key <cold.json>';
const STEPS = ['escrow', 'withdraw', 'transfer'];

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
    payee: null,
    payload: null,
    nonce: null,
    signature: null,
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
    const flags = ['--mailbox', '--escrow', '--signer', '--key', '--payout-key', '--creator', '--buyer', '--brief', '--price', '--deal', '--job', '--result', '--payee', '--payload', '--nonce', '--signature', '--cwd'];
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
      else if (arg === '--payload') out.payload = value;
      else if (arg === '--nonce') out.nonce = value;
      else if (arg === '--signature') out.signature = value;
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
    payee: opts.payee || null,
    foundry: opts.foundry || null,
    escrowAccount: opts.escrowAccount || '',
    claimWindowNs: BigInt(opts.claimWindowNs || 600000000000),
    submitWindowNs: BigInt(opts.submitWindowNs || 600000000000),
    network: opts.network || 'testnet',
    jobs: [],
    deals: {},
  };
}

function dealFunded(deal, ctx) {
  if (ctx.bound) return 'deal is already bound';
  if (!deal || deal.state !== 'Funded') return 'escrow is not funded';
  if (String(deal.price) !== String(ctx.amount)) return 'escrow amount does not match';
  if (deal.client !== ctx.buyer) return 'escrow buyer does not match';
  if (deal.token !== ctx.token) return 'escrow token is not testnet USDC';
  if (deal.payee !== ctx.payee) return 'escrow payee does not match';
  return '';
}

function payoutAccount(state, job) {
  return state.payee || job.claimer;
}

function jobById(state, id) {
  const job = state.jobs.find((row) => row.id === id);
  if (!job) throw new Error('unknown job');
  return job;
}

function assertTestnet(state) {
  if (state.network !== 'testnet') throw new Error('mailbox is testnet only');
  if (state.escrowAccount && !String(state.escrowAccount).endsWith('.testnet')) {
    throw new Error('mailbox is testnet only');
  }
}

function recordFundedJob(state, input) {
  assertTestnet(state);
  if (!input.brief) throw new Error('brief is required');
  if (!input.buyer) throw new Error('buyer is required');
  if (!input.escrowId) throw new Error('escrow id is required');
  const reason = dealFunded({
    state: input.state || (input.funded === true ? 'Funded' : ''),
    price: input.price,
    client: input.client || input.buyer,
    token: input.token,
    payee: input.payee,
  }, {
    amount: input.amount,
    buyer: input.buyer,
    token: USDC,
    payee: state.foundry,
    bound: Boolean(state.deals[String(input.escrowId)]),
  });
  if (reason) throw new Error(reason);
  const job = {
    id: state.nextId,
    buyer: input.buyer,
    brief: input.brief,
    escrow_id: String(input.escrowId),
    status: 'posted',
    claimer: null,
    result: null,
    expires_at: (BigInt(input.now) + state.claimWindowNs).toString(),
    claim_deadline: null,
    settle_step: '',
    payout: null,
  };
  state.nextId += 1;
  state.deals[String(input.escrowId)] = job.id;
  state.jobs.push(job);
  return job;
}

function claimJob(state, input) {
  const job = jobById(state, input.id);
  if (job.status !== 'posted') throw new Error('job is not posted');
  if (BigInt(input.now) > BigInt(job.expires_at)) throw new Error('job has expired');
  job.status = 'claimed';
  job.claimer = input.claimer;
  job.claim_deadline = (BigInt(input.now) + state.submitWindowNs).toString();
  return job;
}

function submitResult(state, input) {
  const job = jobById(state, input.id);
  if (job.status !== 'claimed') throw new Error('job is not claimed');
  if (job.claimer !== input.claimer) throw new Error('only the claimer submits');
  if (BigInt(input.now) > BigInt(job.claim_deadline)) throw new Error('submit window has passed');
  if (!input.result) throw new Error('result is required');
  job.status = 'submitted';
  job.result = input.result;
  return job;
}

function refundExpired(state, input) {
  const job = jobById(state, input.id);
  const now = BigInt(input.now);
  if (job.status === 'posted') {
    if (now <= BigInt(job.expires_at)) throw new Error('job has not expired');
  } else if (job.status === 'claimed') {
    if (now <= BigInt(job.claim_deadline)) throw new Error('claim deadline has not passed');
  } else {
    throw new Error('job is not refundable');
  }
  job.status = 'refunded';
  return { job, buyer: job.buyer, escrowId: job.escrow_id };
}

function beginSettle(state, input) {
  const job = jobById(state, input.id);
  if (job.buyer !== input.buyer) throw new Error('only the buyer accepts');
  if (job.status !== 'submitted') throw new Error('job is not submitted');
  job.status = 'settling';
  job.settle_step = 'escrow';
  job.payout = payoutAccount(state, job);
  return { job, payee: job.payout, escrowId: job.escrow_id, step: job.settle_step };
}

function failSettle(state, id) {
  const job = jobById(state, id);
  if (job.status !== 'settling') throw new Error('job is not settling');
  if (job.settle_step === 'escrow') {
    job.status = 'submitted';
    job.settle_step = '';
  }
  return job;
}

function observeSettle(state, id, escrowView) {
  const job = jobById(state, id);
  if (job.status !== 'settling') throw new Error('job is not settling');
  const released = Boolean(escrowView) && escrowView.state === 'Released';
  const balance = BigInt(escrowView && escrowView.balance != null ? escrowView.balance : '1');
  if (job.settle_step === 'withdraw' && released) {
    job.settle_step = 'transfer';
  } else if (job.settle_step === 'transfer' && released && balance === 0n) {
    job.settle_step = 'done';
    job.status = 'accepted';
  }
  return job;
}

function releaseTimeout(state, input) {
  const job = jobById(state, input.id);
  if (job.status !== 'submitted') throw new Error('job is not submitted');
  if (BigInt(input.now) <= BigInt(job.expires_at)) throw new Error('submit window has not passed');
  const payee = payoutAccount(state, job);
  job.status = 'released';
  job.payout = payee;
  return { job, escrowId: job.escrow_id, payee, method: 'release_after_timeout' };
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

function openMaterial(opts) {
  if (opts.payload && opts.nonce && opts.signature) {
    return { payload: opts.payload, nonce: opts.nonce, signature: opts.signature };
  }
  if (!opts.creatorKeyFile) throw new Error('escrow open signature is required');
  const raw = `${Date.now().toString(36)}${process.pid}n${Math.floor(Math.random() * 1e6).toString(36)}`;
  const nonce = raw.replace(/[^a-z0-9]/gi, '').slice(0, 32);
  const windowNs = opts.windowNs || 600000000000;
  const payload = JSON.stringify({
    client_pk: opts.clientPk,
    price: opts.price,
    deliver_ns: windowNs,
    review_ns: windowNs,
    dispute_ns: windowNs,
    fund_ns: windowNs,
  });
  const key = readKeyFile(opts.creatorKeyFile);
  const message = escrowMessage(opts.escrowId, 0, 'open', nonce, payload);
  return { payload, nonce, signature: signHex(key.private_key, message) };
}

function postPlan(opts) {
  if (!opts.brief) throw new Error('brief is required');
  if (!opts.price || opts.price === '0') throw new Error('price is required');
  if (!opts.mailboxId || !String(opts.mailboxId).endsWith('.testnet')) throw new Error('mailbox is testnet only');
  if (!opts.escrowId || !opts.escrowDealId) throw new Error('escrow id is required');
  return [{
    signerId: opts.buyerId,
    receiverId: USDC,
    method: 'ft_transfer_call',
    args: {
      receiver_id: opts.escrowId,
      amount: opts.price,
      memo: 'near-mailbox',
      msg: JSON.stringify({ deal_id: Number(opts.escrowDealId) }),
    },
    gas: '120 Tgas',
    deposit: '1 yoctoNEAR',
  }, {
    signerId: opts.buyerId,
    receiverId: opts.mailboxId,
    method: 'bind_job',
    args: { deal_id: Number(opts.escrowDealId), brief: opts.brief },
    gas: '150 Tgas',
    deposit: '0 NEAR',
  }];
}

function releaseCall(opts) {
  return escrowCall({
    action: 'release',
    escrowId: opts.escrowId,
    creatorId: opts.creatorId,
    signerId: opts.signerId,
    dealId: opts.escrowDealId,
  });
}

async function runNearMailbox(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  if (opts.network && opts.network !== 'testnet') throw new Error('mailbox is testnet only');
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
    return { hash: last.hash, account: opts.mailboxId, payee: opts.payee || null };
  }
  const methods = {
    claim: { method: 'claim_job', args: { id: Number(opts.jobId) } },
    submit: { method: 'submit_result', args: { id: Number(opts.jobId), result: opts.result } },
    accept: { method: 'accept', args: { id: Number(opts.jobId), nonce: opts.nonce, signature: opts.signature } },
    refund: { method: 'refund_expired', args: { id: Number(opts.jobId) } },
    release: { method: 'release_timeout', args: { id: Number(opts.jobId) } },
    retry: { method: 'retry_settle', args: { id: Number(opts.jobId) } },
  };
  const call = methods[opts.action];
  if (!call) throw new Error(MAILBOX_USAGE);
  if (opts.action === 'submit' && !opts.result) throw new Error('result is required');
  const sent = await submit({
    signerId: opts.signerId,
    receiverId: opts.mailboxId,
    method: call.method,
    args: call.args,
    gas: opts.action === 'accept' || opts.action === 'release' || opts.action === 'retry' ? '250 Tgas' : '50 Tgas',
    deposit: '0 NEAR',
  }, opts);
  rememberRow(opts.dest, 'mailbox', {
    account: opts.mailboxId,
    contract: opts.mailboxId,
    lastTx: sent.hash,
  });
  return { hash: sent.hash, account: opts.mailboxId, payee: opts.payee || null };
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
      creatorKeyFile: parsed.payoutKey,
      keyFile: parsed.keyFile,
      brief: parsed.brief,
      price: parsed.price,
      escrowDealId: parsed.deal,
      jobId: parsed.job,
      result: parsed.result,
      payee: parsed.payee,
      payload: parsed.payload,
      nonce: parsed.nonce,
      signature: parsed.signature,
      network: 'testnet',
      rpc: io.rpc,
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
  USDC,
  MAILBOX_USAGE,
  STEPS,
  beginSettle,
  dealFunded,
  claimJob,
  createMailbox,
  failSettle,
  getJobs,
  openMaterial,
  parseNearMailboxArgs,
  payoutAccount,
  postPlan,
  recordFundedJob,
  observeSettle,
  refundExpired,
  releaseCall,
  releaseTimeout,
  runNearMailbox,
  runNearMailboxCli,
  submitResult,
  web4Response,
};
