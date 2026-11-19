'use strict';

const {
  USDC,
  blockTimeNs,
  readKeyFile,
  rememberRow,
  signHex,
  submit,
  viewFunction,
} = require('./near-tx.cjs');

// clearing near/escrow. The escrow account is never the foundry.
// Fund is ft_transfer_call. deliver and accept are creator and client signatures.
// refund_late pays the client after the delivery deadline.

const ESCROW_USAGE = 'grok-bot near-escrow <init|open|fund|deliver|accept|refund> --escrow <account> --creator <account>';

function take(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    const err = new Error(`${flag} needs a value\n${ESCROW_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return value;
}

function parseNearEscrowArgs(argv) {
  const out = {
    help: false,
    action: null,
    escrow: null,
    creator: null,
    arbiter: null,
    signer: null,
    keyFile: null,
    creatorPk: null,
    clientPk: null,
    price: null,
    deal: null,
    hash: null,
    payoutKey: null,
    windowNs: null,
    fundNs: null,
    deliverNs: null,
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
    const flags = ['--escrow', '--creator', '--arbiter', '--signer', '--key', '--payout-key', '--creator-pk', '--client-pk', '--price', '--deal', '--hash', '--window-ns', '--fund-ns', '--deliver-ns', '--cwd'];
    if (flags.includes(arg)) {
      const value = take(argv, i, arg);
      if (arg === '--escrow') out.escrow = value;
      else if (arg === '--creator') out.creator = value;
      else if (arg === '--arbiter') out.arbiter = value;
      else if (arg === '--signer') out.signer = value;
      else if (arg === '--key') out.keyFile = value;
      else if (arg === '--payout-key') out.payoutKey = value;
      else if (arg === '--creator-pk') out.creatorPk = value;
      else if (arg === '--client-pk') out.clientPk = value;
      else if (arg === '--price') out.price = value;
      else if (arg === '--deal') out.deal = value;
      else if (arg === '--hash') out.hash = value;
      else if (arg === '--window-ns') out.windowNs = value;
      else if (arg === '--fund-ns') out.fundNs = value;
      else if (arg === '--deliver-ns') out.deliverNs = value;
      else out.cwd = value;
      i += 1;
      continue;
    }
    const err = new Error(`unknown argument ${arg}\n${ESCROW_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return out;
}

function assertOwnAccount(escrowId, creatorId) {
  if (!escrowId || !creatorId) throw new Error('escrow account and creator are required');
  if (escrowId === creatorId) throw new Error('escrow account must not be the foundry');
}

function escrowMessage(escrowId, dealId, action, nonce, payload) {
  return `escrow-v1|testnet|${escrowId}|${dealId}|${action}|${nonce}|${payload}`;
}

function escrowCall(opts) {
  assertOwnAccount(opts.escrowId, opts.creatorId);
  const raw = opts.nonce || `${Date.now().toString(36)}${process.pid}n${Math.floor(Math.random() * 1e6).toString(36)}`;
  const nonce = raw.replace(/[^a-z0-9]/gi, '').slice(0, 32);
  if (nonce.length < 16) throw new Error('nonce must be 16 to 64 letters or digits');
  if (opts.action === 'init') {
    if (!/^[0-9a-f]{64}$/.test(opts.creatorPk || '')) throw new Error('creator_pk must be 64 hex chars');
    if (!opts.arbiterId || opts.arbiterId === opts.escrowId || opts.arbiterId === opts.creatorId) {
      throw new Error('arbiter must differ from the escrow account and the foundry');
    }
    return {
      signerId: opts.escrowId,
      receiverId: opts.escrowId,
      method: 'new',
      args: {
        token_id: USDC,
        arbiter_id: opts.arbiterId,
        creator_id: opts.creatorId,
        creator_pk: opts.creatorPk,
        chain_id: 'testnet',
        min_window_ns: 1000000000,
      },
      gas: '80 Tgas',
      deposit: '0 NEAR',
    };
  }
  if (opts.action === 'open') {
    const price = opts.price;
    if (!/^[0-9]+$/.test(price || '')) throw new Error('price is required');
    const key = readKeyFile(opts.keyFile);
    const deliverNs = opts.deliverNs ?? opts.windowNs ?? 600000000000;
    const fundNs = opts.fundNs ?? deliverNs;
    const payload = JSON.stringify({
      client_pk: opts.clientPk,
      price,
      deliver_ns: deliverNs,
      review_ns: deliverNs,
      dispute_ns: deliverNs,
      fund_ns: fundNs,
    });
    const message = escrowMessage(opts.escrowId, 0, 'open', nonce, payload);
    return {
      signerId: opts.creatorId,
      receiverId: opts.escrowId,
      method: 'open',
      args: { payload, nonce, signature: signHex(key.private_key, message) },
      gas: '80 Tgas',
      deposit: '0 NEAR',
    };
  }
  if (opts.action === 'fund') {
    if (!opts.dealId) throw new Error('deal is required');
    if (!/^[0-9]+$/.test(opts.price || '')) throw new Error('price is required');
    if (!opts.signerId) throw new Error('--signer is required');
    const key = readKeyFile(opts.keyFile);
    const message = escrowMessage(opts.escrowId, opts.dealId, 'fund', nonce, opts.signerId);
    return {
      signerId: opts.signerId,
      receiverId: USDC,
      method: 'ft_transfer_call',
      args: {
        receiver_id: opts.escrowId,
        amount: opts.price,
        memo: 'near-escrow',
        msg: JSON.stringify({
          deal_id: Number(opts.dealId),
          nonce,
          signature: signHex(key.private_key, message),
        }),
      },
      gas: '120 Tgas',
      deposit: '1 yoctoNEAR',
    };
  }
  if (opts.action === 'release') {
    if (!opts.dealId) throw new Error('deal is required');
    if (!opts.signerId) throw new Error('--signer is required');
    return {
      signerId: opts.signerId,
      receiverId: opts.escrowId,
      method: 'release_after_timeout',
      args: { deal_id: Number(opts.dealId) },
      gas: '40 Tgas',
      deposit: '0 NEAR',
    };
  }
  if (opts.action === 'deliver' || opts.action === 'accept' || opts.action === 'refund' || opts.action === 'withdraw') {
    if (opts.action !== 'withdraw' && !opts.dealId) throw new Error('deal is required');
    if ((opts.action === 'accept' || opts.action === 'refund' || opts.action === 'fund') && !opts.signerId) {
      throw new Error('--signer is required');
    }
    if (opts.action === 'withdraw') {
      if (!opts.signerId) throw new Error('--signer is required');
      return {
        signerId: opts.signerId,
        receiverId: opts.escrowId,
        method: 'withdraw',
        args: {},
        gas: '120 Tgas',
        deposit: '0 NEAR',
      };
    }
    if (opts.action === 'refund') {
      return {
        signerId: opts.signerId,
        receiverId: opts.escrowId,
        method: 'refund_late',
        args: { deal_id: Number(opts.dealId) },
        gas: '30 Tgas',
        deposit: '0 NEAR',
      };
    }
    const key = readKeyFile(opts.keyFile);
    const payload = opts.action === 'deliver' ? opts.deliverable : '';
    if (opts.action === 'deliver' && !payload) throw new Error('deliverable hash is required');
    const message = escrowMessage(opts.escrowId, opts.dealId, opts.action, nonce, payload);
    const args = opts.action === 'deliver'
      ? { deal_id: Number(opts.dealId), nonce, payload, signature: signHex(key.private_key, message) }
      : { deal_id: Number(opts.dealId), nonce, signature: signHex(key.private_key, message) };
    return {
      signerId: opts.action === 'deliver' ? opts.creatorId : opts.signerId,
      receiverId: opts.escrowId,
      method: opts.action,
      args,
      gas: '80 Tgas',
      deposit: '0 NEAR',
    };
  }
  throw new Error(ESCROW_USAGE);
}

async function assertRefundDeadline(opts) {
  const deal = await viewFunction(opts.escrowId, 'get_deal', { deal_id: Number(opts.dealId) }, opts);
  if (!deal || deal.state !== 'Funded') throw new Error('deal is not still funded');
  const deadline = deal.deliver_by_ns == null ? 0n : BigInt(deal.deliver_by_ns);
  const now = await blockTimeNs(opts);
  if (deadline === 0n || now <= deadline) throw new Error('delivery deadline has not passed');
}

async function ensureStorage(accountId, keyFile, opts) {
  const stored = await viewFunction(USDC, 'storage_balance_of', { account_id: accountId }, opts);
  if (stored && stored.total) return;
  await submit({
    signerId: accountId,
    receiverId: USDC,
    method: 'storage_deposit',
    args: { account_id: accountId },
    gas: '30 Tgas',
    deposit: '0.00125 NEAR',
  }, { ...opts, keyFile });
}

async function runNearEscrow(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  if (opts.action === 'refund') await assertRefundDeadline(opts);
  if (opts.action === 'accept' && !opts.payoutKeyFile) throw new Error('payout key is required');
  const action = escrowCall(opts);
  const sent = await submit(action, opts);
  let hash = sent.hash;
  let method = action.method;
  if (opts.action === 'accept' || opts.action === 'refund') {
    const payer = opts.action === 'accept' ? opts.creatorId : opts.signerId;
    const payoutKey = opts.action === 'accept' ? opts.payoutKeyFile : opts.keyFile;
    await ensureStorage(payer, payoutKey, opts);
    const withdrawn = await submit({
      signerId: payer,
      receiverId: opts.escrowId,
      method: 'withdraw',
      args: {},
      gas: '120 Tgas',
      deposit: '0 NEAR',
    }, { ...opts, keyFile: payoutKey });
    hash = withdrawn.hash;
    method = 'withdraw';
  }
  rememberRow(opts.dest, 'escrow', {
    account: opts.escrowId,
    contract: opts.escrowId,
    lastTx: hash,
    method,
  });
  return { hash, method, account: opts.escrowId, contract: opts.escrowId, value: sent.value, actionHash: sent.hash };
}

async function runNearEscrowCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  let parsed;
  try {
    parsed = parseNearEscrowArgs(argv);
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }
  if (parsed.help || !parsed.action) {
    stdout.write(`${ESCROW_USAGE}\n`);
    return parsed.help ? 0 : 2;
  }
  if (!parsed.escrow || !parsed.creator || !parsed.keyFile) {
    stderr.write(`${ESCROW_USAGE}\n`);
    return 2;
  }
  try {
    if (parsed.action === 'init' && !parsed.creatorPk) {
      stderr.write('creator_pk is required\n');
      return 2;
    }
    if ((parsed.action === 'accept' || parsed.action === 'refund' || parsed.action === 'fund' || parsed.action === 'withdraw') && !parsed.signer) {
      stderr.write('--signer is required\n');
      return 2;
    }
    if (parsed.action === 'accept' && !parsed.payoutKey) {
      stderr.write('--payout-key is required\n');
      return 2;
    }
    const creatorPk = parsed.creatorPk;
    const ns = (value) => (value == null || value === '' ? undefined : Number(value));
    const result = await runNearEscrow({
      dest: parsed.cwd || io.cwd || process.cwd(),
      action: parsed.action,
      escrowId: parsed.escrow,
      creatorId: parsed.creator,
      arbiterId: parsed.arbiter,
      signerId: parsed.signer,
      keyFile: parsed.keyFile,
      payoutKeyFile: parsed.payoutKey,
      creatorPk,
      clientPk: parsed.clientPk,
      price: parsed.price,
      dealId: parsed.deal,
      deliverable: parsed.hash,
      windowNs: ns(parsed.windowNs),
      fundNs: ns(parsed.fundNs),
      deliverNs: ns(parsed.deliverNs),
      rpc: io.rpc,
      spawn: io.spawn,
      bin: io.bin,
      network: 'testnet',
    });
    stdout.write(`Escrow: ${result.account} contract ${result.contract} tx ${result.hash}\n`);
    if (result.value != null) stdout.write(`value: ${result.value}\n`);
    return 0;
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}

module.exports = {
  ESCROW_USAGE,
  escrowCall,
  escrowMessage,
  parseNearEscrowArgs,
  runNearEscrow,
  runNearEscrowCli,
};
