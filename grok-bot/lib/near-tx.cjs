'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Circle USDC on NEAR testnet. clearing mcp/src/near-rail.ts CIRCLE_USDC_NEAR_TESTNET.
const USDC = '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';
const TESTNET_RPC = 'https://rpc.testnet.near.org';
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function railPath(dest) {
  return path.join(dest, '.xray', 'state', 'near-rail.json');
}

function lockPath(dest) {
  return `${railPath(dest)}.lock`;
}

function acquireRailLock(dest) {
  const file = lockPath(dest);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  try {
    const fd = fs.openSync(file, 'wx');
    return { file, fd };
  } catch (err) {
    if (err && err.code === 'EEXIST') {
      const error = new Error('rail file is locked');
      error.code = 'LOCKED';
      throw error;
    }
    throw err;
  }
}

function releaseRailLock(lock) {
  if (!lock) return;
  fs.closeSync(lock.fd);
  fs.rmSync(lock.file, { force: true });
}

function emptyRail() {
  return { pay: {}, cap: {}, escrow: {} };
}

function readRail(dest) {
  const file = railPath(dest);
  if (!fs.existsSync(file)) return emptyRail();
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!data || typeof data !== 'object' || Array.isArray(data)) return emptyRail();
    return {
      pay: data.pay && typeof data.pay === 'object' ? data.pay : {},
      cap: data.cap && typeof data.cap === 'object' ? data.cap : {},
      escrow: data.escrow && typeof data.escrow === 'object' ? data.escrow : {},
    };
  } catch {
    return emptyRail();
  }
}

function writeRail(dest, rail) {
  const file = railPath(dest);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = path.join(path.dirname(file), `.near-rail.${process.pid}.tmp`);
  fs.writeFileSync(tmp, `${JSON.stringify(rail, null, 2)}\n`, { mode: 0o644 });
  fs.renameSync(tmp, file);
  return file;
}

function rowText(label, row) {
  if (!row || typeof row.account !== 'string' || row.account.length === 0) return `${label}: pending`;
  if (typeof row.contract !== 'string' || row.contract.length === 0) return `${label}: pending`;
  if (typeof row.lastTx !== 'string' || row.lastTx.length === 0) return `${label}: pending`;
  return `${label}: ${row.account} contract ${row.contract} tx ${row.lastTx}`;
}

function railLines(rail) {
  const data = rail || emptyRail();
  return [
    rowText('Pay', data.pay),
    rowText('Cap', data.cap),
    rowText('Escrow', data.escrow),
  ].join('\n');
}

function rememberRow(dest, name, row) {
  const rail = readRail(dest);
  rail[name] = { ...rail[name], ...row };
  writeRail(dest, rail);
  return rail;
}

function redact(text) {
  return String(text == null ? '' : text)
    .replace(/ed25519:[1-9A-HJ-NP-Za-km-z]+/g, 'ed25519:[redacted]')
    .replace(/"private_key"\s*:\s*"[^"]+"/g, '"private_key":"[redacted]"');
}

function assertTestnet(opts) {
  const network = opts && opts.network ? opts.network : 'testnet';
  if (network !== 'testnet') throw new Error('NEAR testnet only');
}

function paymentIdFor(nonce) {
  return `near-pay:${nonce}`;
}

function quoteOf(input) {
  const quote = input && input.quote ? input.quote : input;
  const receiver = typeof quote.receiver === 'string' ? quote.receiver.trim() : '';
  const amount = typeof quote.amount === 'string' ? quote.amount.trim() : String(quote.amount ?? '');
  const nonce = typeof quote.nonce === 'string' ? quote.nonce.trim() : '';
  if (!receiver || !/^[a-z0-9._-]+$/.test(receiver)) throw new Error('quote receiver is required');
  if (!/^[0-9]+$/.test(amount) || amount === '0') throw new Error('quote amount is required');
  if (!nonce || /[\r\n]/.test(nonce)) throw new Error('quote nonce is required');
  if (input.receiver && input.receiver !== receiver) throw new Error('payee is bound to the quote');
  if (input.amount && input.amount !== amount) throw new Error('amount is bound to the quote');
  return {
    receiver,
    amount,
    nonce,
    paymentId: paymentIdFor(nonce),
    payload: { receiver_id: receiver, amount, memo: nonce },
  };
}

function samePayload(stored, payload) {
  if (!stored || typeof stored !== 'object') return false;
  return stored.receiver_id === payload.receiver_id
    && stored.amount === payload.amount
    && stored.memo === payload.memo;
}

function decodeBase58(text) {
  let value = 0n;
  for (const char of text) {
    const digit = B58.indexOf(char);
    if (digit < 0) throw new Error('bad key encoding');
    value = value * 58n + BigInt(digit);
  }
  let hex = value.toString(16);
  if (hex.length % 2) hex = `0${hex}`;
  const bytes = Buffer.from(hex, 'hex');
  const zeros = text.match(/^1*/)[0].length;
  return Buffer.concat([Buffer.alloc(zeros), bytes]);
}

function encodeBase58(buffer) {
  let value = 0n;
  for (const byte of buffer) value = value * 256n + BigInt(byte);
  let out = '';
  while (value > 0n) {
    const digit = value % 58n;
    out = B58[Number(digit)] + out;
    value /= 58n;
  }
  for (const byte of buffer) {
    if (byte !== 0) break;
    out = `1${out}`;
  }
  return out || '1';
}

function ed25519Pair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pub = publicKey.export({ type: 'spki', format: 'der' }).subarray(-32);
  const seed = privateKey.export({ type: 'pkcs8', format: 'der' }).subarray(-32);
  const secret = Buffer.concat([seed, pub]);
  return {
    publicKey: `ed25519:${encodeBase58(pub)}`,
    privateKey: `ed25519:${encodeBase58(secret)}`,
    publicHex: pub.toString('hex'),
  };
}

function privateKeyObject(nearKey) {
  if (typeof nearKey !== 'string' || !nearKey.startsWith('ed25519:')) throw new Error('ed25519 key is required');
  const raw = decodeBase58(nearKey.slice('ed25519:'.length));
  if (raw.length < 32) throw new Error('ed25519 key is required');
  const seed = raw.subarray(0, 32);
  const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]);
  return crypto.createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
}

function publicHexFromKey(nearKey) {
  const raw = decodeBase58(nearKey.slice('ed25519:'.length));
  if (raw.length >= 64) return raw.subarray(32, 64).toString('hex');
  const derived = crypto.createPublicKey(privateKeyObject(nearKey));
  return derived.export({ type: 'spki', format: 'der' }).subarray(-32).toString('hex');
}

function signHex(nearKey, message) {
  const signature = crypto.sign(null, Buffer.from(message), privateKeyObject(nearKey));
  return signature.toString('hex');
}

function readKeyFile(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data || typeof data.private_key !== 'string' || typeof data.public_key !== 'string') {
    throw new Error('cold key is missing');
  }
  return data;
}

function legacyKeyFile(accountId) {
  return path.join(os.homedir(), '.near-credentials', 'testnet', `${accountId}.json`);
}

// near-cli-rs 0.31.1 reads ~/.near-credentials/testnet/<account>.json.
// The sealed cold key is copied there for the call and removed after.
function installLegacyKey(keyFile, accountId) {
  const data = readKeyFile(keyFile);
  const dest = legacyKeyFile(accountId);
  fs.mkdirSync(path.dirname(dest), { recursive: true, mode: 0o700 });
  const previous = fs.existsSync(dest) ? fs.readFileSync(dest) : null;
  fs.writeFileSync(dest, `${JSON.stringify({
    account_id: accountId,
    public_key: data.public_key,
    private_key: data.private_key,
  })}\n`, { mode: 0o600 });
  fs.chmodSync(dest, 0o600);
  return { dest, previous };
}

function removeLegacyKey(installed) {
  if (!installed) return;
  if (installed.previous == null) {
    fs.rmSync(installed.dest, { force: true });
    return;
  }
  fs.writeFileSync(installed.dest, installed.previous, { mode: 0o600 });
}

function nearCallArgv(action) {
  return [
    'contract',
    'call-function',
    'as-transaction',
    action.receiverId,
    action.method,
    'json-args',
    JSON.stringify(action.args),
    'prepaid-gas',
    action.gas,
    'attached-deposit',
    action.deposit,
    'sign-as',
    action.signerId,
    'network-config',
    'testnet',
    'sign-with-legacy-keychain',
    'send',
  ];
}

function txHashFrom(text) {
  const safe = redact(text);
  const labeled = safe.match(/transaction id:\s*([1-9A-HJ-NP-Za-km-z]{32,64})/i);
  if (labeled) return labeled[1];
  const url = safe.match(/txns\/([1-9A-HJ-NP-Za-km-z]{32,64})/);
  return url ? url[1] : null;
}

function decodeSuccess(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const text = Buffer.from(value, 'base64').toString('utf8');
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function defaultRpc(method, params, opts) {
  if (method === 'broadcast_tx_commit') return broadcastWithNear(params, opts);
  const fetchImpl = opts.fetch || globalThis.fetch;
  const response = await fetchImpl(opts.rpcUrl || TESTNET_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'near-mill', method, params }),
    signal: AbortSignal.timeout(opts.timeoutMs || 20000),
  });
  const body = await response.json();
  if (body.error) throw new Error(redact(body.error.message || 'rpc failed'));
  return body.result;
}

async function rpc(method, params, opts = {}) {
  assertTestnet(opts);
  if (typeof opts.rpc === 'function') return opts.rpc(method, params);
  return defaultRpc(method, params, opts);
}

function broadcastWithNear(action, opts) {
  const spawn = opts.spawn || spawnSync;
  const installed = installLegacyKey(opts.keyFile, action.signerId);
  try {
    const result = spawn(opts.bin || 'near', nearCallArgv(action), {
      encoding: 'utf8',
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const shown = redact(`${result.stdout || ''}\n${result.stderr || ''}`);
    if (result.status !== 0) throw new Error(shown.trim() || 'near call failed');
    const hash = txHashFrom(shown);
    if (!hash) throw new Error('transaction hash missing');
    return { transaction: { hash }, status: {}, stdout: shown };
  } finally {
    removeLegacyKey(installed);
  }
}

async function readReturnValue(hash, signerId, opts) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const response = await fetchImpl(opts.rpcUrl || TESTNET_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'near-mill',
      method: 'tx_status',
      params: { tx_hash: hash, sender_account_id: signerId, wait_until: 'EXECUTED' },
    }),
    signal: AbortSignal.timeout(opts.timeoutMs || 20000),
  });
  const body = await response.json();
  const value = body.result && body.result.status && body.result.status.SuccessValue;
  return decodeSuccess(value);
}

async function submit(action, opts) {
  assertTestnet(opts);
  if (!opts.keyFile && !(typeof opts.rpc === 'function')) throw new Error('cold key is required');
  const result = await rpc('broadcast_tx_commit', action, opts);
  const hash = result && result.transaction && result.transaction.hash;
  if (typeof hash !== 'string' || hash.length === 0) throw new Error('transaction hash missing');
  const status = result.status || {};
  let value = decodeSuccess(status.SuccessValue);
  if (value == null && typeof opts.rpc !== 'function') {
    try {
      value = await readReturnValue(hash, action.signerId, opts);
    } catch {
      value = null;
    }
  }
  return { hash, value };
}

async function viewFunction(contract, method, args, opts = {}) {
  if (typeof opts.rpc === 'function') {
    const body = await opts.rpc('query', {
      request_type: 'call_function',
      account_id: contract,
      method_name: method,
      args,
    });
    if (body && Object.prototype.hasOwnProperty.call(body, 'parsed')) return body.parsed;
    return null;
  }
  const result = await rpc('query', {
    request_type: 'call_function',
    finality: 'final',
    account_id: contract,
    method_name: method,
    args_base64: Buffer.from(JSON.stringify(args)).toString('base64'),
  }, opts);
  const bytes = result && result.result;
  if (!Array.isArray(bytes) || bytes.length === 0) return null;
  const text = Buffer.from(bytes).toString('utf8');
  if (!text || text === 'null') return null;
  return JSON.parse(text);
}

async function blockTimeNs(opts = {}) {
  if (typeof opts.rpc === 'function') {
    const body = await opts.rpc('block', { finality: 'final' });
    const stamp = body && body.header && body.header.timestamp_nanosec;
    return BigInt(stamp || 0);
  }
  const result = await rpc('block', { finality: 'final' }, opts);
  return BigInt(result && result.header && result.header.timestamp_nanosec ? result.header.timestamp_nanosec : 0);
}

module.exports = {
  USDC,
  TESTNET_RPC,
  decodeBase58,
  ed25519Pair,
  nearCallArgv,
  paymentIdFor,
  publicHexFromKey,
  quoteOf,
  railLines,
  acquireRailLock,
  lockPath,
  railPath,
  releaseRailLock,
  readKeyFile,
  readRail,
  redact,
  rememberRow,
  samePayload,
  signHex,
  installLegacyKey,
  legacyKeyFile,
  removeLegacyKey,
  blockTimeNs,
  submit,
  txHashFrom,
  viewFunction,
};
