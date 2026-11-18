'use strict';

const fs = require('node:fs');
const os = require('node:os');
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
// rpc.testnet.near.org takes about 3.2s, so the per-call limit is not the 1s retry gap.
// NEAR_RPC_TIMEOUT_MS overrides the per-call limit.
const VIEW_ACCOUNT_ATTEMPTS = 5;
const VIEW_ACCOUNT_DELAY_MS = 1000;
const RPC_TIMEOUT_MS = 15000;
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
    'save-to-legacy-keychain',
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
    'save-to-legacy-keychain',
    'network-config',
    'testnet',
    'sign-with-legacy-keychain',
    'send',
  ];
}

// save-to-keychain uses the OS keyring (common.rs save_access_key_to_keychain).
// save-to-legacy-keychain writes
// {credentials_home}/{network}/{account}.json via File::create
// (common.rs save_access_key_to_legacy_keychain). Default home is ~/.near-credentials.
function credentialsHome(opts = {}) {
  if (opts.credentialsHome) return opts.credentialsHome;
  if (process.env.NEAR_CREDENTIALS_HOME) return process.env.NEAR_CREDENTIALS_HOME;
  return path.join(os.homedir(), '.near-credentials');
}

function legacyKeyPath(credentialsDir, network, accountId) {
  return path.join(credentialsDir, network, `${accountId}.json`);
}

function namedAccountId(accountId) {
  if (typeof accountId !== 'string') return '';
  return accountId.trim();
}

function readLegacyKey(file, accountId) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const privateKey = typeof data.private_key === 'string' ? data.private_key : data.secret_keypair_str;
  const publicKey = typeof data.public_key === 'string' ? data.public_key : data.public_key_str;
  if (typeof privateKey !== 'string' || typeof publicKey !== 'string') {
    throw new Error(`legacy keychain is missing the key: ${file}`);
  }
  // The passed --account wins. A key file often also stores the 64-hex implicit id.
  const named = namedAccountId(accountId);
  const fromFile = typeof data.account_id === 'string' && data.account_id.trim() !== ''
    ? data.account_id
    : (typeof data.implicit_account_id === 'string' ? data.implicit_account_id : '');
  const id = named || fromFile;
  if (!id) throw new Error(`legacy keychain is missing the account: ${file}`);
  return {
    account_id: id,
    public_key: publicKey,
    private_key: privateKey,
    master_seed_phrase: typeof data.master_seed_phrase === 'string' ? data.master_seed_phrase : undefined,
  };
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

function functionCallPermission(permission) {
  if (!permission || typeof permission !== 'object') return null;
  const call = permission.FunctionCall || permission.function_call;
  if (!call || typeof call !== 'object') return null;
  return call;
}

function functionCallReceiver(permission) {
  const call = functionCallPermission(permission);
  if (!call) return null;
  return typeof call.receiver_id === 'string' ? call.receiver_id : null;
}

// An empty method_names list may call every method on the contract.
// https://docs.near.org/protocol/accounts-contracts/access-keys
function functionCallMethods(permission) {
  const call = functionCallPermission(permission);
  if (!call) return null;
  const names = call.method_names || call.methodNames;
  if (!Array.isArray(names)) return null;
  return names.filter((name) => typeof name === 'string');
}

function grantedMethodList(methodNames) {
  const raw = typeof methodNames === 'string' && methodNames.trim() !== '' ? methodNames : 'ping';
  return raw.split(',').map((name) => name.trim()).filter((name) => name.length > 0);
}

function coversGrantedMethods(existing, granted) {
  if (!Array.isArray(existing)) return false;
  if (existing.length === 0) return true;
  const have = new Set(existing);
  return granted.every((name) => have.has(name));
}

function hasFunctionCallKey(list, contractId, methodNames) {
  const granted = grantedMethodList(methodNames);
  const keys = list && Array.isArray(list.keys) ? list.keys : [];
  return keys.some((entry) => {
    const access = entry && entry.access_key;
    const permission = access && access.permission;
    if (functionCallReceiver(permission) !== contractId) return false;
    return coversGrantedMethods(functionCallMethods(permission), granted);
  });
}

function rpcTimeoutMs(opts = {}) {
  if (opts.timeoutMs != null) {
    const given = Number(opts.timeoutMs);
    if (Number.isFinite(given) && given > 0) return given;
  }
  if (process.env.NEAR_RPC_TIMEOUT_MS) {
    const fromEnv = Number(process.env.NEAR_RPC_TIMEOUT_MS);
    if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  }
  return RPC_TIMEOUT_MS;
}

async function queryRpc(accountId, requestType, opts) {
  const timeoutMs = rpcTimeoutMs(opts);
  const fetchImpl = opts.fetch || globalThis.fetch;
  const rpc = opts.rpcUrl || TESTNET_RPC;
  const response = await fetchImpl(rpc, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'near-seat',
      method: 'query',
      params: { request_type: requestType, finality: 'final', account_id: accountId },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  return response.json();
}

function rememberSecrets(secrets, key) {
  if (key && typeof key.private_key === 'string') secrets.push(key.private_key);
  if (key && typeof key.master_seed_phrase === 'string') secrets.push(key.master_seed_phrase);
}

async function viewAccount(accountId, opts = {}) {
  const attempts = opts.attempts == null ? VIEW_ACCOUNT_ATTEMPTS : opts.attempts;
  const delayMs = opts.delayMs == null ? VIEW_ACCOUNT_DELAY_MS : opts.delayMs;
  const sleep = opts.sleep || ((ms) => new Promise((resolve) => { setTimeout(resolve, ms); }));
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const body = await queryRpc(accountId, 'view_account', opts);
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

async function listAccessKeys(accountId, opts) {
  if (typeof opts.viewAccessKeys === 'function') return opts.viewAccessKeys(accountId, opts);
  // A CLI double replaces add-key. It does not answer the chain. Production
  // (no runners) queries view_access_key_list before granting.
  if (opts.runners && !opts.fetch) return { keys: [] };
  return viewAccessKeyList(accountId, opts);
}

async function viewAccessKeyList(accountId, opts = {}) {
  const body = await queryRpc(accountId, 'view_access_key_list', opts);
  if (body && body.result && Array.isArray(body.result.keys)) return body.result;
  const error = new Error('view_access_key_list failed');
  error.detail = body && body.error ? body.error : body;
  throw error;
}

function assertCliOk(result, what) {
  if (!result || result.status !== 0) {
    const status = result ? result.status : 'missing';
    throw new Error(`${what} failed with status ${status}`);
  }
}

function loadCreatedKey(result, opts, accountId) {
  if (result && result.key && result.key.private_key && result.key.public_key) return result.key;
  const file = legacyKeyPath(credentialsHome(opts), 'testnet', accountId);
  if (!fs.existsSync(file)) throw new Error(`full-access key missing: ${file}`);
  const key = readLegacyKey(file, accountId);
  fs.chmodSync(file, SEALED_MODE);
  return key;
}

function cliText(result) {
  return `${result && result.stdout ? result.stdout : ''}\n${result && result.stderr ? result.stderr : ''}`;
}

function isNearCliRs(text) {
  return text.includes('near-cli-rs');
}

// A version probe that never exits must not block the PATH walk.
const PROBE_TIMEOUT_MS = 15000;
// Account create and the function-call key wait on the faucet and RPC.
const CLI_TIMEOUT_MS = 180000;

function boundedTimeout(value, fallback) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 0) return n;
  return fallback;
}

// Homebrew and old tutorials still put the archived JavaScript `near` first.
// That binary answers `near --version` with `4.0.13` and rejects
// `account create-account`. Walk PATH until a near-cli-rs binary answers.
function resolveNearBin(opts = {}) {
  if (opts.bin) return opts.bin;
  const spawn = opts.spawn || spawnSync;
  const env = { ...process.env, ...(opts.env || {}) };
  const dirs = String(env.PATH || '').split(path.delimiter).filter(Boolean);
  const seen = new Set();
  for (const dir of dirs) {
    const bin = path.join(dir, process.platform === 'win32' ? 'near.cmd' : 'near');
    if (seen.has(bin)) continue;
    seen.add(bin);
    if (!fs.existsSync(bin)) continue;
    let probed;
    try {
      probed = spawn(bin, ['--version'], {
        encoding: 'utf8',
        env,
        timeout: boundedTimeout(opts.probeTimeoutMs, PROBE_TIMEOUT_MS),
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch {
      continue;
    }
    if (!probed || probed.status !== 0) continue;
    if (isNearCliRs(cliText(probed))) return bin;
  }
  const err = new Error(
    'near-cli-rs is required. Install near-cli-rs 0.31.1 and put that bin ahead of the archived JavaScript near CLI.',
  );
  err.code = 'NEAR_CLI';
  throw err;
}

function runNearCli(args, opts = {}) {
  const spawn = opts.spawn || spawnSync;
  const bin = resolveNearBin({ ...opts, spawn });
  const result = spawn(bin, args, {
    encoding: 'utf8',
    env: { ...process.env, ...(opts.env || {}) },
    timeout: boundedTimeout(opts.timeoutMs, CLI_TIMEOUT_MS),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function readKeyFile(file, accountId) {
  try {
    const key = readLegacyKey(file, accountId);
    fs.chmodSync(file, SEALED_MODE);
    return key;
  } catch {
    return null;
  }
}

function keyOnDisk(opts) {
  const coldPath = path.join(opts.seatHome, 'near-cold', `${opts.accountId}.json`);
  const legacy = legacyKeyPath(credentialsHome(opts), 'testnet', opts.accountId);
  if (fs.existsSync(coldPath)) {
    const cold = readKeyFile(coldPath, opts.accountId);
    if (cold) return cold;
  }
  if (fs.existsSync(legacy)) return readKeyFile(legacy, opts.accountId);
  return null;
}

function accountExistsMessage(result) {
  const text = [result && result.stdout, result && result.stderr, result && result.error]
    .filter((part) => typeof part === 'string')
    .join('\n');
  return /already exists/i.test(text);
}

async function viewExistingAccount(opts) {
  try {
    const account = typeof opts.viewAccount === 'function'
      ? await opts.viewAccount(opts.accountId, opts)
      : await viewAccount(opts.accountId, opts);
    if (!account || account.amount == null) return null;
    return account;
  } catch {
    return null;
  }
}

async function accountAlreadyThere(opts) {
  const key = keyOnDisk(opts);
  if (!key) return null;
  const account = await viewExistingAccount(opts);
  if (!account) return null;
  return key;
}

async function prepareNearSeat(opts) {
  if (!opts || !opts.accountId) throw new Error('accountId is required');
  if (!opts.seatHome) throw new Error('seatHome is required');
  const secrets = [];
  const runners = opts.runners || {};
  const prev = process.umask(SEAT_UMASK);
  try {
    let kept = await accountAlreadyThere(opts);
    let key = kept;
    if (!key) {
      let created;
      try {
        created = typeof runners.createAccount === 'function'
          ? await runners.createAccount(createAccountArgv(opts.accountId))
          : runNearCli(createAccountArgv(opts.accountId), opts);
      } catch (err) {
        created = { status: 1, stdout: '', stderr: err instanceof Error ? err.message : String(err) };
      }
      if (created && created.status === 0) {
        key = loadCreatedKey(created, opts, opts.accountId);
        rememberSecrets(secrets, key);
      } else if (accountExistsMessage(created)) {
        const onDisk = keyOnDisk(opts);
        if (onDisk) {
          key = onDisk;
          kept = key;
          rememberSecrets(secrets, key);
        }
      }
      if (created && created.stdout) emit(opts, secrets, created.stdout);
      if (created && created.stderr) emit(opts, secrets, created.stderr);
      if (created && created.status === 0) {
        if (typeof opts.viewAccount === 'function') await opts.viewAccount(opts.accountId, opts);
        else await viewAccount(opts.accountId, opts);
      } else if (!key) {
        if (accountExistsMessage(created)) {
          const seen = await viewExistingAccount(opts);
          if (seen) throw new Error(`account ${opts.accountId} already exists and the full-access key is not on disk`);
        }
        assertCliOk(created, 'account create');
      }
    }
    rememberSecrets(secrets, key);
    if (kept) {
      emit(opts, secrets, `near-seat: account ${opts.accountId} already exists`);
      const legacy = legacyKeyPath(credentialsHome(opts), 'testnet', opts.accountId);
      if (!fs.existsSync(legacy)) {
        writeCreatedFile(legacy, `${JSON.stringify(key, null, 2)}\n`);
        emit(opts, secrets, `near-seat: restored legacy keychain ${legacy}`);
      }
    }
    const coldPath = path.join(opts.seatHome, 'near-cold', `${opts.accountId}.json`);
    const mode = writeCreatedFile(coldPath, `${JSON.stringify(key, null, 2)}\n`);
    const publicPath = path.join(opts.seatHome, 'near', 'account.json');
    writeCreatedFile(publicPath, `${JSON.stringify({
      ...publicRecord(key),
      cold: path.relative(opts.seatHome, coldPath),
    }, null, 2)}\n`);
    const contractId = opts.contractId || opts.accountId;
    const methods = opts.methodNames || 'ping';
    const grantArgv = functionCallKeyArgv(opts.accountId, contractId, methods);
    const listed = await listAccessKeys(opts.accountId, opts);
    if (hasFunctionCallKey(listed, contractId, methods)) {
      emit(opts, secrets, 'near-seat: function-call key already present');
      emit(opts, secrets, `near-seat: account ${opts.accountId}`);
      emit(opts, secrets, `near-seat: full-access key sealed ${coldPath}`);
      return { accountId: opts.accountId, coldPath, publicPath, mode, grantArgv: null, addedKey: false };
    }
    const granted = typeof runners.addFunctionCallKey === 'function'
      ? await runners.addFunctionCallKey(grantArgv)
      : runNearCli(grantArgv, opts);
    rememberSecrets(secrets, granted && granted.key);
    if (granted && granted.stdout) emit(opts, secrets, granted.stdout);
    if (granted && granted.stderr) emit(opts, secrets, granted.stderr);
    assertCliOk(granted, 'function-call key');
    emit(opts, secrets, `near-seat: account ${opts.accountId}`);
    emit(opts, secrets, `near-seat: full-access key sealed ${coldPath}`);
    emit(opts, secrets, 'near-seat: function-call key granted');
    return { accountId: opts.accountId, coldPath, publicPath, mode, grantArgv, addedKey: true };
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
  RPC_TIMEOUT_MS,
  TESTNET_RPC,
  createAccountArgv,
  resolveNearBin,
  runNearCli,
  credentialsHome,
  fileCreateMode,
  functionCallKeyArgv,
  legacyKeyPath,
  readLegacyKey,
  rpcTimeoutMs,
  hasFunctionCallKey,
  prepareNearSeat,
  viewAccessKeyList,
  redact,
  viewAccount,
  writeCreatedFile,
};
