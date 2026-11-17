'use strict';

const {
  USDC,
  paymentIdFor,
  quoteOf,
  readRail,
  rememberRow,
  samePayload,
  submit,
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

async function payNear(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  if (!opts.signerId) throw new Error('signer is required');
  const server = opts.quote || { receiver: opts.receiver, amount: opts.amount, nonce: opts.nonce };
  const quote = quoteOf({ receiver: opts.receiver, amount: opts.amount, quote: server });
  const rail = readRail(opts.dest);
  const prior = rail.pay && rail.pay.payments && rail.pay.payments[quote.paymentId];
  if (prior) {
    if (!samePayload(prior.payload, quote.payload)) throw new Error('paymentId is bound to a different payload');
    return { paymentId: quote.paymentId, hash: prior.hash, replayed: true, receiver: quote.receiver, amount: quote.amount };
  }
  const sent = await submit({
    signerId: opts.signerId,
    receiverId: USDC,
    method: 'ft_transfer',
    args: quote.payload,
    gas: '30 Tgas',
    deposit: '1 yoctoNEAR',
  }, opts);
  const payments = { ...(rail.pay && rail.pay.payments ? rail.pay.payments : {}) };
  payments[quote.paymentId] = { hash: sent.hash, payload: quote.payload };
  rememberRow(opts.dest, 'pay', {
    account: opts.signerId,
    contract: USDC,
    lastTx: sent.hash,
    payments,
  });
  return { paymentId: quote.paymentId, hash: sent.hash, replayed: false, receiver: quote.receiver, amount: quote.amount };
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
