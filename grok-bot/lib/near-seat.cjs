'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Rust `File::create` opens with mode 0o666 and the process umask.
// near-cli-rs saves the key that way (`File::create` in
// `create_implicit_account/use_auto_generation.rs`). umask 022 yields 0644.
// https://github.com/near/near-cli-rs/issues/713
// https://doc.rust-lang.org/std/fs/struct.File.html#method.create
const KEY_CREATE_MODE = 0o666;
const SEAT_UMASK = 0o077;
const SEALED_MODE = 0o600;

// query view_account: https://docs.near.org/api/rpc/contracts#view-account
const VIEW_ACCOUNT_ATTEMPTS = 5;
const VIEW_ACCOUNT_DELAY_MS = 1000;
const TESTNET_RPC = 'https://rpc.testnet.near.org';

// Faucet create, measured as CnCbvTDM3Xt5N2Bq6FtwwA79o23iebuZnsHFuuVH1x7K.
// https://docs.near.org/protocol/tutorials/creating-implicit-and-named-accounts
function createAccountArgv(accountId) {
  return [
    'account',
    'create-account',
    'sponsor-by-faucet-service',
    accountId,
    'autogenerate-new-keypair',
    'save-to-keychain',
    'network-config',
    'testnet',
    'create',
  ];
}

// Allowance on a function-call key is gas, not tokens.
// https://docs.near.org/protocol/accounts-contracts/access-keys
// Flags: near-cli-rs `FunctionCallType` (`--allowance`, `--contract-account-id`, `--function-names`).
function functionCallKeyArgv(accountId, contractId, methodNames) {
  return [
    'account',
    'add-key',
    accountId,
    'grant-function-call-access',
    '--allowance',
    '1 NEAR',
    '--contract-account-id',
    contractId,
    '--function-names',
    methodNames,
    'autogenerate-new-keypair',
    'save-to-keychain',
    'network-config',
    'testnet',
    'sign-with-keychain',
    'send',
  ];
}

function fileCreateMode(umask) {
  return KEY_CREATE_MODE & ~umask;
}

function redact(text, secrets) {
  let out = String(text == null ? '' : text);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 0) out = out.split(secret).join('[redacted]');
  }
  return out;
}

function emit(opts, secrets, line) {
  const safe = redact(line, secrets);
  if (typeof opts.log === 'function') opts.log(safe);
  if (opts.stdout && typeof opts.stdout.write === 'function') opts.stdout.write(`${safe}\n`);
}

function writeCreatedFile(dest, body) {
  const prev = process.umask(SEAT_UMASK);
  try {
    fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
    const fd = fs.openSync(
      dest,
      fs.constants.O_CREAT | fs.constants.O_TRUNC | fs.constants.O_WRONLY,
      KEY_CREATE_MODE,
    );
    try {
      fs.writeFileSync(fd, body);
    } finally {
      fs.closeSync(fd);
    }
  } finally {
    process.umask(prev);
  }
  return fs.statSync(dest).mode & 0o777;
}

function publicRecord(key) {
  return {
    account_id: key.account_id,
    public_key: key.public_key,
    network: 'testnet',
  };
}

function rememberSecrets(secrets, key) {
  if (key && typeof key.private_key === 'string') secrets.push(key.private_key);
  if (key && typeof key.master_seed_phrase === 'string') secrets.push(key.master_seed_phrase);
}

async function viewAccount(accountId, opts = {}) {
  const attempts = opts.attempts == null ? VIEW_ACCOUNT_ATTEMPTS : opts.attempts;
  const delayMs = opts.delayMs == null ? VIEW_ACCOUNT_DELAY_MS : opts.delayMs;
  const sleep = opts.sleep || ((ms) => new Promise((resolve) => { setTimeout(resolve, ms); }));
  const rpc = opts.rpcUrl || TESTNET_RPC;
  const fetchImpl = opts.fetch || globalThis.fetch;
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(rpc, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'near-seat',
          method: 'query',
          params: { request_type: 'view_account', finality: 'final', account_id: accountId },
        }),
      });
      const body = await response.json();
      if (body && body.result && body.result.amount != null) return body.result;
      lastError = body && body.error ? body.error : body;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  const error = new Error(`view_account failed after ${attempts} attempts`);
  error.attempts = attempts;
  error.detail = lastError;
  throw error;
}

function runNearCli(args, opts = {}) {
  const spawn = opts.spawn || spawnSync;
  const result = spawn(opts.bin || 'near', args, {
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

async function prepareNearSeat(opts) {
  if (!opts || !opts.accountId) throw new Error('accountId is required');
  if (!opts.seatHome) throw new Error('seatHome is required');
  const secrets = [];
  const runners = opts.runners || {};
  const prev = process.umask(SEAT_UMASK);
  try {
    const created = typeof runners.createAccount === 'function'
      ? await runners.createAccount(createAccountArgv(opts.accountId))
      : runNearCli(createAccountArgv(opts.accountId), opts);
    rememberSecrets(secrets, created && created.key);
    if (created && created.stdout) emit(opts, secrets, created.stdout);
    if (created && created.stderr) emit(opts, secrets, created.stderr);
    if (typeof opts.viewAccount === 'function') await opts.viewAccount(opts.accountId, opts);
    else await viewAccount(opts.accountId, opts);
    const key = created && created.key ? created.key : null;
    if (!key || !key.private_key || !key.public_key) throw new Error('full-access key missing');
    rememberSecrets(secrets, key);
    const coldPath = path.join(opts.seatHome, 'near-cold', `${opts.accountId}.json`);
    const mode = writeCreatedFile(coldPath, `${JSON.stringify(key, null, 2)}\n`);
    const publicPath = path.join(opts.seatHome, 'near', 'account.json');
    writeCreatedFile(publicPath, `${JSON.stringify({
      ...publicRecord(key),
      cold: path.relative(opts.seatHome, coldPath),
    }, null, 2)}\n`);
    const grantArgv = functionCallKeyArgv(
      opts.accountId,
      opts.contractId || opts.accountId,
      opts.methodNames || 'ping',
    );
    const granted = typeof runners.addFunctionCallKey === 'function'
      ? await runners.addFunctionCallKey(grantArgv)
      : runNearCli(grantArgv, opts);
    rememberSecrets(secrets, granted && granted.key);
    if (granted && granted.stdout) emit(opts, secrets, granted.stdout);
    if (granted && granted.stderr) emit(opts, secrets, granted.stderr);
    emit(opts, secrets, `near-seat: account ${opts.accountId}`);
    emit(opts, secrets, `near-seat: full-access key sealed ${coldPath}`);
    emit(opts, secrets, 'near-seat: function-call key granted');
    return { accountId: opts.accountId, coldPath, publicPath, mode, grantArgv };
  } finally {
    process.umask(prev);
  }
}

module.exports = {
  KEY_CREATE_MODE,
  SEAT_UMASK,
  SEALED_MODE,
  VIEW_ACCOUNT_ATTEMPTS,
  VIEW_ACCOUNT_DELAY_MS,
  TESTNET_RPC,
  createAccountArgv,
  fileCreateMode,
  functionCallKeyArgv,
  prepareNearSeat,
  redact,
  viewAccount,
  writeCreatedFile,
};
