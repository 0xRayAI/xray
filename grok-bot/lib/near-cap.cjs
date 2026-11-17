'use strict';

const { USDC, rememberRow, submit } = require('./near-tx.cjs');

// clearing near/spend-cap/src/lib.rs. Owner calls use the sealed cold key.
// add_agent_key installs a function-call key whose method list is pay,ping.

const CAP_USAGE = 'grok-bot near-cap <init|allow|deny|add-agent-key> --contract <account> --owner <account> --key <cold.json>';

function take(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    const err = new Error(`${flag} needs a value\n${CAP_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return value;
}

function parseNearCapArgs(argv) {
  const out = {
    help: false,
    action: null,
    contract: null,
    owner: null,
    keyFile: null,
    perTxCap: null,
    account: null,
    publicKey: null,
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
    if (arg === '--contract' || arg === '--owner' || arg === '--key' || arg === '--per-tx-cap' || arg === '--account' || arg === '--public-key' || arg === '--cwd') {
      const value = take(argv, i, arg);
      if (arg === '--contract') out.contract = value;
      else if (arg === '--owner') out.owner = value;
      else if (arg === '--key') out.keyFile = value;
      else if (arg === '--per-tx-cap') out.perTxCap = value;
      else if (arg === '--account') out.account = value;
      else if (arg === '--public-key') out.publicKey = value;
      else out.cwd = value;
      i += 1;
      continue;
    }
    const err = new Error(`unknown argument ${arg}\n${CAP_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return out;
}

function capAction(opts) {
  if (opts.action === 'init') {
    if (!/^[0-9]+$/.test(opts.perTxCap || '')) throw new Error('per_tx_cap is required');
    return {
      method: 'new',
      args: {
        token_id: USDC,
        owner_id: opts.ownerId,
        per_tx_cap: opts.perTxCap,
        budget_limit: null,
        budget_period_ns: null,
        cooldown_ns: 0,
        approval_threshold: null,
        max_open_approvals: 1,
      },
      gas: '80 Tgas',
      deposit: '0 NEAR',
    };
  }
  if (opts.action === 'allow') {
    if (!opts.account) throw new Error('allow account is required');
    return { method: 'set_allow', args: { allow: [opts.account] }, gas: '30 Tgas', deposit: '0 NEAR' };
  }
  if (opts.action === 'deny') {
    if (!opts.account) throw new Error('deny account is required');
    return { method: 'set_deny', args: { deny: [opts.account] }, gas: '30 Tgas', deposit: '0 NEAR' };
  }
  if (opts.action === 'add-agent-key') {
    if (!opts.publicKey || !opts.publicKey.startsWith('ed25519:')) throw new Error('agent public key is required');
    return {
      method: 'add_agent_key',
      args: { public_key: opts.publicKey },
      gas: '30 Tgas',
      deposit: '0 NEAR',
    };
  }
  throw new Error(CAP_USAGE);
}

async function runNearCap(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  if (!opts.contractId) throw new Error('contract is required');
  if (!opts.ownerId) throw new Error('owner is required');
  const action = capAction(opts);
  const sent = await submit({
    signerId: opts.ownerId,
    receiverId: opts.contractId,
    method: action.method,
    args: action.args,
    gas: action.gas,
    deposit: action.deposit,
  }, opts);
  const row = {
    account: opts.ownerId,
    contract: opts.contractId,
    lastTx: sent.hash,
    method: action.method,
  };
  if (opts.action === 'init') row.perTxCap = opts.perTxCap;
  rememberRow(opts.dest, 'cap', row);
  return { hash: sent.hash, method: action.method, account: opts.ownerId, contract: opts.contractId };
}

async function runNearCapCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  let parsed;
  try {
    parsed = parseNearCapArgs(argv);
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 2;
  }
  if (parsed.help || !parsed.action) {
    stdout.write(`${CAP_USAGE}\n`);
    return parsed.help ? 0 : 2;
  }
  if (!parsed.contract || !parsed.owner || !parsed.keyFile) {
    stderr.write(`${CAP_USAGE}\n`);
    return 2;
  }
  try {
    const result = await runNearCap({
      dest: parsed.cwd || io.cwd || process.cwd(),
      action: parsed.action,
      contractId: parsed.contract,
      ownerId: parsed.owner,
      keyFile: parsed.keyFile,
      perTxCap: parsed.perTxCap,
      account: parsed.account,
      publicKey: parsed.publicKey,
      rpc: io.rpc,
      spawn: io.spawn,
      bin: io.bin,
      network: 'testnet',
    });
    stdout.write(`Cap: ${result.account} contract ${result.contract} tx ${result.hash}\n`);
    return 0;
  } catch (err) {
    stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    return 1;
  }
}

module.exports = {
  CAP_USAGE,
  capAction,
  parseNearCapArgs,
  runNearCap,
  runNearCapCli,
};
