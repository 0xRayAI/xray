'use strict';

const {
  USDC,
  acquireRailLock,
  paymentIdFor,
  quoteOf,
  readRail,
  releaseRailLock,
  rememberRow,
  samePayload,
  submit,
  viewFunction,
} = require('./near-tx.cjs');

// clearing#32: payee and amount come from the server quote, one paymentId
// is bound to one signed payload, and a replay returns the stored result.
// The memo is the quote nonce (clearing mcp/src/near-rail.ts).

const PAY_USAGE = 'grok-bot near-pay --receiver <account> --amount <u128> --nonce <nonce> --signer <account> --key <cold.json>';

function take(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    const err = new Error(`${flag} needs a value\n${PAY_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return value;
}

function parseNearPayArgs(argv) {
  const out = { help: false, receiver: null, amount: null, nonce: null, signer: null, keyFile: null, cwd: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--receiver' || arg === '--amount' || arg === '--nonce' || arg === '--signer' || arg === '--key' || arg === '--cwd') {
      const value = take(argv, i, arg);
      if (arg === '--receiver') out.receiver = value;
      else if (arg === '--amount') out.amount = value;
      else if (arg === '--nonce') out.nonce = value;
      else if (arg === '--signer') out.signer = value;
      else if (arg === '--key') out.keyFile = value;
      else out.cwd = value;
      i += 1;
      continue;
    }
    const err = new Error(`unknown argument ${arg}\n${PAY_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return out;
}

function paymentsOf(rail) {
  return rail.pay && rail.pay.payments ? { ...rail.pay.payments } : {};
}

function savePayment(dest, signerId, paymentId, record, lastTx) {
  const rail = readRail(dest);
  const payments = paymentsOf(rail);
  payments[paymentId] = record;
  rememberRow(dest, 'pay', {
    account: signerId,
    contract: USDC,
    lastTx: lastTx || (rail.pay && rail.pay.lastTx) || '',
    payments,
  });
}

function argsOf(row) {
  const actions = row && Array.isArray(row.actions) ? row.actions : [];
  for (const action of actions) {
    if (action.method && action.method !== 'ft_transfer') continue;
    if (typeof action.args !== 'string') continue;
    try {
      return JSON.parse(action.args);
    } catch {
      return null;
    }
  }
  return null;
}

function factsOf(row) {
  const args = argsOf(row);
  const token = (row.ft && row.ft.contract) || row.token || null;
  const delta = row.delta_amount == null ? null : String(row.delta_amount);
  const amount = row.amount != null
    ? String(row.amount)
    : (args && args.amount != null ? String(args.amount) : (delta == null ? null : delta.replace(/^-/, '')));
  const receiver = row.receiver || row.payTo || row.involved_account_id || (args && args.receiver_id) || null;
  const memo = row.memo || (row.ft && row.ft.memo) || (args && typeof args.memo === 'string' ? args.memo : null);
  const hash = row.hash || row.transaction_hash || null;
  return {
    token,
    receiver,
    amount,
    memo,
    hash,
    outgoing: delta == null || delta.startsWith('-'),
  };
}

function rowsOf(found) {
  if (!found) return [];
  if (Array.isArray(found)) return found;
  if (Array.isArray(found.txns)) return found.txns;
  return [found];
}

function judgeRows(rows, quote) {
  const payTo = quote.payTo || quote.receiver;
  let mismatch = null;
  for (const row of rows) {
    const facts = factsOf(row);
    if (facts.memo !== quote.nonce) continue;
    const problems = [];
    if (!facts.outgoing) problems.push('the signer received the tokens');
    if (facts.token !== USDC) problems.push(`token ${facts.token || 'missing'}`);
    if (facts.receiver !== payTo) problems.push(`receiver ${facts.receiver || 'missing'}`);
    if (facts.amount !== quote.amount) problems.push(`amount ${facts.amount || 'missing'}`);
    if (problems.length === 0 && facts.hash) return { hash: facts.hash };
    if (problems.length > 0) mismatch = problems.join(', ');
  }
  return { mismatch };
}

async function nearblocksRows(opts) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const timeout = opts.timeoutMs || 20000;
  const listUrl = `https://api-testnet.nearblocks.io/v1/account/${encodeURIComponent(opts.signerId)}/ft-txns?per_page=25`;
  const listed = await fetchImpl(listUrl, { signal: AbortSignal.timeout(timeout) });
  const body = await listed.json();
  const rows = Array.isArray(body.txns) ? body.txns.slice(0, 25) : [];
  const detailed = [];
  for (const row of rows) {
    if (row.memo || (row.ft && row.ft.memo) || (Array.isArray(row.actions) && row.actions.length > 0)) {
      detailed.push(row);
      continue;
    }
    if (!row.transaction_hash) continue;
    const detailUrl = `https://api-testnet.nearblocks.io/v1/txns/${row.transaction_hash}`;
    const detail = await fetchImpl(detailUrl, { signal: AbortSignal.timeout(timeout) });
    const detailBody = await detail.json();
    const txn = detailBody.txns && detailBody.txns[0];
    detailed.push({
      ...row,
      actions: txn && txn.actions,
      receiver_account_id: txn && txn.receiver_account_id,
    });
  }
  return detailed;
}

async function findPaidMemo(opts, quote) {
  const rows = typeof opts.rpc === 'function'
    ? rowsOf(await opts.rpc('ft_transfers', {
      signerId: opts.signerId,
      token: USDC,
      receiver: quote.payTo,
      amount: quote.amount,
      memo: quote.nonce,
    }))
    : await nearblocksRows(opts);
  const judged = judgeRows(rows, quote);
  if (judged.hash) return judged.hash;
  if (judged.mismatch) {
    throw pendingError(quote, opts.signerId, judged.mismatch);
  }
  return null;
}

function pendingError(quote, signerId, why) {
  const payTo = quote.payTo || quote.receiver;
  const detail = why
    ? `A transfer with memo ${quote.nonce} was found but it does not match the quote (${why}).`
    : `No ft_transfer of ${quote.amount} testnet USDC to ${payTo} with memo ${quote.nonce} was found for ${signerId} in the latest 25 token rows.`;
  return new Error(
    `payment ${quote.paymentId} is pending, unconfirmed. ${detail} Do not send again. Confirm on the explorer, then delete that pending payment from .xray/state/near-rail.json before paying again.`,
  );
}

async function ensureReceiverStorage(opts, receiver) {
  const stored = await viewFunction(USDC, 'storage_balance_of', { account_id: receiver }, opts);
  if (stored && stored.total) return;
  await submit({
    signerId: opts.signerId,
    receiverId: USDC,
    method: 'storage_deposit',
    args: { account_id: receiver },
    gas: '30 Tgas',
    deposit: '0.00125 NEAR',
  }, opts);
}

async function payNear(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  if (!opts.signerId) throw new Error('signer is required');
  const lock = acquireRailLock(opts.dest);
  try {
    const server = opts.quote || { receiver: opts.receiver, amount: opts.amount, nonce: opts.nonce };
    const quote = quoteOf({ receiver: opts.receiver, amount: opts.amount, quote: server });
    const rail = readRail(opts.dest);
    if (rail.cap && rail.cap.perTxCap && BigInt(quote.amount) > BigInt(rail.cap.perTxCap)) {
      throw new Error('amount is over the spend cap');
    }
    const payments = paymentsOf(rail);
    const prior = payments[quote.paymentId];
    if (prior && prior.status !== 'pending' && prior.hash) {
      if (!samePayload(prior.payload, quote.payload)) throw new Error('paymentId is bound to a different payload');
      return { paymentId: quote.paymentId, hash: prior.hash, replayed: true, receiver: quote.receiver, amount: quote.amount };
    }
    if (prior && prior.status === 'pending') {
      if (!samePayload(prior.payload, quote.payload)) throw new Error('paymentId is bound to a different payload');
      const found = await findPaidMemo(opts, quote);
      if (!found) throw pendingError(quote, opts.signerId);
      savePayment(opts.dest, opts.signerId, quote.paymentId, {
        status: 'settled',
        hash: found,
        payload: quote.payload,
        nonce: quote.nonce,
      }, found);
      return { paymentId: quote.paymentId, hash: found, replayed: false, recovered: true, receiver: quote.receiver, amount: quote.amount };
    }
    savePayment(opts.dest, opts.signerId, quote.paymentId, {
      status: 'pending',
      payload: quote.payload,
      nonce: quote.nonce,
    }, rail.pay && rail.pay.lastTx);
    await ensureReceiverStorage(opts, quote.receiver);
    const sent = await submit({
      signerId: opts.signerId,
      receiverId: USDC,
      method: 'ft_transfer',
      args: quote.payload,
      gas: '30 Tgas',
      deposit: '1 yoctoNEAR',
    }, opts);
    savePayment(opts.dest, opts.signerId, quote.paymentId, {
      status: 'settled',
      hash: sent.hash,
      payload: quote.payload,
      nonce: quote.nonce,
    }, sent.hash);
    return { paymentId: quote.paymentId, hash: sent.hash, replayed: false, receiver: quote.receiver, amount: quote.amount };
  } finally {
    releaseRailLock(lock);
  }
}

function emitPay(stdout, result) {
  const replay = result.replayed ? ' replayed' : '';
  stdout.write(`Pay: ${result.receiver} ${result.amount} tx ${result.hash}${replay}\n`);
  stdout.write(`paymentId: ${result.paymentId}\n`);
}

async function runNearPayCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  let parsed;
  try {
    parsed = parseNearPayArgs(argv);
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }
  if (parsed.help) {
    stdout.write(`${PAY_USAGE}\n`);
    return 0;
  }
  if (!parsed.receiver || !parsed.amount || !parsed.nonce || !parsed.signer || !parsed.keyFile) {
    stderr.write(`${PAY_USAGE}\n`);
    return 2;
  }
  try {
    const result = await payNear({
      dest: parsed.cwd || io.cwd || process.cwd(),
      receiver: parsed.receiver,
      amount: parsed.amount,
      nonce: parsed.nonce,
      signerId: parsed.signer,
      keyFile: parsed.keyFile,
      rpc: io.rpc,
      spawn: io.spawn,
      bin: io.bin,
      network: 'testnet',
    });
    emitPay(stdout, result);
    return 0;
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}

module.exports = {
  PAY_USAGE,
  parseNearPayArgs,
  payNear,
  paymentIdFor,
  runNearPayCli,
};
