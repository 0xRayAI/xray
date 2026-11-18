'use strict';

const fs = require('fs');
const path = require('path');

// Dry quotes stay read-only. A live quote needs ONECLICK_LIVE=1, the addresses
// in ONECLICK_RECIPIENT and ONECLICK_REFUND_TO, and a ledger file at
// ONECLICK_LEDGER. The ledger is the 1 USDC total, not a per-call cap.
// INTENTS_CHECKOUT_JWT is sent as a header when set and is never logged.
// redact() is for error text only. Success bodies are returned to the caller
// and are not logged.

const QUOTE_URL = 'https://1click.chaindefuser.com/v0/quote';
const STATUS_URL = 'https://1click.chaindefuser.com/v0/status';
const CAP = 1000000n;
const MIN_DEADLINE_MS = 2 * 60 * 1000;
const MAX_DEADLINE_MS = 24 * 60 * 60 * 1000;
const BASE_USDC = 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';
const NEAR_USDC = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';
const SAMPLE_REFUND = '0x2527d02599ba641c19fea793cd0f167589a0f10d';
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const KECCAK_RC = [
  0x0000000000000001n, 0x0000000000008082n, 0x800000000000808an, 0x8000000080008000n,
  0x000000000000808bn, 0x0000000080000001n, 0x8000000080008081n, 0x8000000000008009n,
  0x000000000000008an, 0x0000000000000088n, 0x0000000080008009n, 0x000000008000000an,
  0x000000008000808bn, 0x800000000000008bn, 0x8000000000008089n, 0x8000000000008003n,
  0x8000000000008002n, 0x8000000000000080n, 0x000000000000800an, 0x800000008000000an,
  0x8000000080008081n, 0x8000000000008080n, 0x0000000080000001n, 0x8000000080008008n,
];
const KECCAK_ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];

function redact(text) {
  const secret = process.env.INTENTS_CHECKOUT_JWT;
  let out = String(text || '');
  if (secret) out = out.split(secret).join('[jwt]');
  return out.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]');
}

function keccak256(message) {
  const mask = (1n << 64n) - 1n;
  const rotl = (value, bits) => ((value << BigInt(bits)) | (value >> BigInt(64 - bits))) & mask;
  const state = Array(25).fill(0n);
  const permute = () => {
    for (let round = 0; round < 24; round += 1) {
      const column = Array(5);
      for (let x = 0; x < 5; x += 1) {
        column[x] = state[x] ^ state[x + 5] ^ state[x + 10] ^ state[x + 15] ^ state[x + 20];
      }
      for (let i = 0; i < 25; i += 1) {
        const x = i % 5;
        state[i] ^= column[(x + 4) % 5] ^ rotl(column[(x + 1) % 5], 1);
      }
      const next = Array(25);
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          const index = x + (5 * y);
          next[y + (5 * ((2 * x + 3 * y) % 5))] = rotl(state[index], KECCAK_ROT[index]);
        }
      }
      for (let x = 0; x < 5; x += 1) {
        for (let y = 0; y < 5; y += 1) {
          const index = x + (5 * y);
          state[index] = next[index] ^ ((~next[((x + 1) % 5) + (5 * y)]) & next[((x + 2) % 5) + (5 * y)]);
          state[index] &= mask;
        }
      }
      state[0] ^= KECCAK_RC[round];
    }
  };
  const rate = 136;
  const input = Buffer.from(message);
  let offset = 0;
  while (input.length - offset >= rate) {
    for (let i = 0; i < rate; i += 1) {
      state[Math.floor(i / 8)] ^= BigInt(input[offset + i]) << BigInt((i % 8) * 8);
    }
    permute();
    offset += rate;
  }
  const block = Buffer.alloc(rate);
  input.copy(block, 0, offset);
  const rest = input.length - offset;
  block[rest] ^= 0x01;
  block[rate - 1] ^= 0x80;
  for (let i = 0; i < rate; i += 1) {
    state[Math.floor(i / 8)] ^= BigInt(block[i]) << BigInt((i % 8) * 8);
  }
  permute();
  let hex = '';
  for (let i = 0; i < 32; i += 1) {
    const byte = Number((state[Math.floor(i / 8)] >> BigInt((i % 8) * 8)) & 0xffn);
    hex += byte.toString(16).padStart(2, '0');
  }
  return hex;
}

function isEvmAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function hasEip55Checksum(value) {
  const hex = value.slice(2);
  if (hex === hex.toLowerCase()) return true;
  const hash = keccak256(hex.toLowerCase());
  for (let i = 0; i < hex.length; i += 1) {
    const upper = Number.parseInt(hash[i], 16) >= 8;
    const char = hex[i];
    if (upper && char !== char.toUpperCase()) return false;
    if (!upper && char !== char.toLowerCase()) return false;
  }
  return true;
}

function isNearAccount(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 64) return false;
  if (/^[0-9a-f]{64}$/.test(value)) return true;
  return /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(value);
}

function assertRefundAddress(value) {
  if (!isEvmAddress(value) || !hasEip55Checksum(value)) throw new Error('refund address must be a Base address');
}

function assertRecipient(value) {
  if (!isNearAccount(value)) throw new Error('recipient must be a NEAR account');
}

function deniedRefund(value) {
  const lower = value.toLowerCase();
  return lower === SAMPLE_REFUND || lower === ZERO_ADDRESS;
}

function deniedRecipient(value) {
  const lower = value.toLowerCase();
  return lower.startsWith('placeholder') || lower.includes('placeholder');
}

function liveParties(opts) {
  const recipient = process.env.ONECLICK_RECIPIENT;
  const refundTo = process.env.ONECLICK_REFUND_TO;
  if (!recipient || !refundTo) throw new Error('live addresses are required');
  if (opts.recipient != null && opts.recipient !== recipient) throw new Error('recipient does not match ONECLICK_RECIPIENT');
  if (opts.refundTo != null && opts.refundTo !== refundTo) throw new Error('refund address does not match ONECLICK_REFUND_TO');
  if (deniedRecipient(recipient)) throw new Error('recipient is a placeholder');
  if (deniedRefund(refundTo)) throw new Error('refund address is not allowed');
  assertRecipient(recipient);
  assertRefundAddress(refundTo);
  return { recipient, refundTo };
}

function buildQuoteRequest(opts = {}) {
  const dry = opts.dry !== false;
  if (!dry && process.env.ONECLICK_LIVE !== '1') throw new Error('live quote is off');
  if (opts.swapType && opts.swapType !== 'EXACT_OUTPUT') throw new Error('swap type must be EXACT_OUTPUT');
  if (opts.depositType && opts.depositType !== 'ORIGIN_CHAIN') throw new Error('deposit must be on the origin chain');
  if (opts.refundType && opts.refundType !== 'ORIGIN_CHAIN') throw new Error('refund must be on the origin chain');
  if (opts.recipientType && opts.recipientType !== 'DESTINATION_CHAIN') throw new Error('recipient must be on NEAR');
  if (opts.originAsset && opts.originAsset !== BASE_USDC) throw new Error('origin asset must be Base USDC');
  if (opts.destinationAsset && opts.destinationAsset !== NEAR_USDC) throw new Error('destination asset must be NEAR USDC');
  const parties = dry
    ? { recipient: opts.recipient, refundTo: opts.refundTo }
    : liveParties(opts);
  if (dry) {
    assertRefundAddress(parties.refundTo);
    assertRecipient(parties.recipient);
  }
  if (!/^[0-9]+$/.test(String(opts.amount || ''))) throw new Error('amount must be an integer');
  const amount = BigInt(opts.amount);
  if (amount <= 0n) throw new Error('amount is required');
  if (amount > CAP) throw new Error('amount is over the 1 USDC cap');
  const slippage = opts.slippageTolerance == null ? 100 : opts.slippageTolerance;
  if (!Number.isInteger(slippage) || slippage < 0 || slippage > 100) throw new Error('slippage must be 0 to 100 basis points');
  const when = Date.parse(opts.deadline);
  if (Number.isNaN(when)) throw new Error('deadline is invalid');
  const now = dry && Number.isFinite(opts.now) ? Number(opts.now) : Date.now();
  const delta = when - now;
  if (delta < MIN_DEADLINE_MS) throw new Error('deadline is too soon');
  if (delta > MAX_DEADLINE_MS) throw new Error('deadline is too far');
  return {
    dry,
    swapType: 'EXACT_OUTPUT',
    slippageTolerance: slippage,
    originAsset: BASE_USDC,
    depositType: 'ORIGIN_CHAIN',
    destinationAsset: NEAR_USDC,
    amount: String(amount),
    recipient: parties.recipient,
    recipientType: 'DESTINATION_CHAIN',
    refundTo: parties.refundTo,
    refundType: 'ORIGIN_CHAIN',
    deadline: new Date(when).toISOString(),
    depositMode: 'SIMPLE',
  };
}

function quoteHeaders() {
  const headers = { 'content-type': 'application/json' };
  const token = process.env.INTENTS_CHECKOUT_JWT;
  if (token) headers['X-API-Key'] = token;
  return headers;
}

const LEDGER_USAGE = 'grok-bot near-1click init --ledger <file>';

function emptyLedger() {
  return { spent: '0', reserved: '0', closed: false, quotes: [] };
}

function ledgerFile() {
  const file = process.env.ONECLICK_LEDGER;
  if (!file) throw new Error('spend ledger is required');
  return file;
}

function digitField(value) {
  return typeof value === 'string' && /^[0-9]+$/.test(value);
}

function readLedger(file) {
  if (!fs.existsSync(file)) throw new Error('spend ledger is missing');
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    throw new Error('spend ledger is corrupt');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('spend ledger is corrupt');
  if (!Object.prototype.hasOwnProperty.call(parsed, 'spent')
    || !Object.prototype.hasOwnProperty.call(parsed, 'reserved')
    || !Object.prototype.hasOwnProperty.call(parsed, 'closed')
    || !Object.prototype.hasOwnProperty.call(parsed, 'quotes')) {
    throw new Error('spend ledger is corrupt');
  }
  if (!digitField(parsed.spent) || !digitField(parsed.reserved)) throw new Error('spend ledger is corrupt');
  if (typeof parsed.closed !== 'boolean' || !Array.isArray(parsed.quotes)) throw new Error('spend ledger is corrupt');
  return {
    spent: parsed.spent,
    reserved: parsed.reserved,
    closed: parsed.closed,
    quotes: parsed.quotes,
  };
}

function initLedger(file) {
  if (!file || typeof file !== 'string') throw new Error('spend ledger is required');
  const body = `${JSON.stringify(emptyLedger())}\n`;
  let fd;
  try {
    fd = fs.openSync(file, 'wx', 0o600);
  } catch (err) {
    if (err && err.code === 'EEXIST') throw new Error('spend ledger already exists');
    throw err;
  }
  try {
    fs.writeSync(fd, body);
  } finally {
    fs.closeSync(fd);
  }
  return file;
}

function writeLedger(file, ledger) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.${process.pid}.tmp`);
  fs.writeFileSync(tmp, `${JSON.stringify(ledger)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, file);
}

function lockLedger(file) {
  const lock = `${file}.lock`;
  const pause = new Int32Array(new SharedArrayBuffer(4));
  const started = Date.now();
  for (;;) {
    try {
      const fd = fs.openSync(lock, 'wx');
      return () => {
        fs.closeSync(fd);
        fs.rmSync(lock, { force: true });
      };
    } catch (err) {
      if (!err || err.code !== 'EEXIST') throw err;
      if (Date.now() - started > 2000) throw new Error('spend ledger is locked');
      Atomics.wait(pause, 0, 0, 20);
    }
  }
}

function mutateLedger(file, change) {
  const unlock = lockLedger(file);
  try {
    const ledger = readLedger(file);
    change(ledger);
    writeLedger(file, ledger);
    return ledger;
  } finally {
    unlock();
  }
}

function reserveSpend(amount) {
  const file = ledgerFile();
  mutateLedger(file, (ledger) => {
    if (ledger.closed) throw new Error('live quote already used');
    const reserved = BigInt(ledger.reserved);
    const spent = BigInt(ledger.spent);
    if (reserved + spent + amount > CAP) throw new Error('amount is over the 1 USDC total');
    ledger.reserved = String(reserved + amount);
  });
  const state = { open: true };
  return {
    release() {
      if (!state.open) return;
      state.open = false;
      mutateLedger(file, (ledger) => {
        const reserved = BigInt(ledger.reserved);
        ledger.reserved = String(reserved >= amount ? reserved - amount : 0n);
      });
    },
    commit(amountIn, correlationId) {
      if (!state.open) throw new Error('spend reservation is closed');
      let reason = '';
      mutateLedger(file, (ledger) => {
        const reserved = BigInt(ledger.reserved);
        const spent = BigInt(ledger.spent);
        const next = spent + BigInt(amountIn);
        ledger.reserved = String(reserved >= amount ? reserved - amount : 0n);
        if (ledger.closed) {
          reason = 'live quote already used';
          return;
        }
        if (next > CAP) {
          reason = 'amount is over the 1 USDC total';
          return;
        }
        ledger.spent = String(next);
        ledger.closed = true;
        ledger.quotes.push({
          correlationId: String(correlationId || ''),
          amount: String(amount),
          amountIn: String(amountIn),
        });
      });
      state.open = false;
      if (reason) throw new Error(reason);
    },
  };
}

async function readJson(response) {
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }
  if (!response.ok) {
    const message = body && typeof body.message === 'string' ? body.message : `quote failed ${response.status}`;
    throw new Error(redact(message));
  }
  return body;
}

async function getQuote(opts = {}) {
  const body = buildQuoteRequest(opts);
  const held = body.dry ? null : reserveSpend(BigInt(body.amount));
  try {
    const fetchImpl = opts.fetch || globalThis.fetch;
    const response = await fetchImpl(QUOTE_URL, {
      method: 'POST',
      headers: quoteHeaders(),
      body: JSON.stringify(body),
    });
    const parsed = await readJson(response);
    if (body.dry) return parsed;
    const amountIn = parsed && parsed.quote ? parsed.quote.amountIn : '';
    const deposit = parsed && parsed.quote ? parsed.quote.depositAddress : '';
    if (!/^[0-9]+$/.test(String(amountIn || '')) || BigInt(amountIn) > CAP) {
      held.release();
      throw new Error('quoted input is over the 1 USDC cap');
    }
    if (!deposit) {
      held.release();
      throw new Error('live quote did not return a deposit address');
    }
    held.commit(amountIn, parsed && parsed.correlationId);
    return parsed;
  } catch (err) {
    if (held) held.release();
    throw err;
  }
}

function runNear1clickCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  if (!argv || argv[0] === '--help' || argv[0] === '-h') {
    stdout.write(`${LEDGER_USAGE}\n`);
    return argv && argv[0] ? 0 : 2;
  }
  if (argv[0] !== 'init' || argv[1] !== '--ledger' || !argv[2] || argv[3]) {
    stderr.write(`${LEDGER_USAGE}\n`);
    return 2;
  }
  try {
    initLedger(argv[2]);
  } catch (err) {
    stderr.write(`${redact(err instanceof Error ? err.message : String(err))}\n`);
    return 1;
  }
  stdout.write('ledger created\n');
  return 0;
}

async function getStatus(depositAddress, opts = {}) {
  if (!depositAddress || typeof depositAddress !== 'string') throw new Error('deposit address is required');
  const url = new URL(STATUS_URL);
  url.searchParams.set('depositAddress', depositAddress);
  if (opts.depositMemo) url.searchParams.set('depositMemo', String(opts.depositMemo));
  const fetchImpl = opts.fetch || globalThis.fetch;
  const response = await fetchImpl(url.toString(), {
    method: 'GET',
    headers: quoteHeaders(),
  });
  return readJson(response);
}

module.exports = {
  BASE_USDC,
  CAP,
  MAX_DEADLINE_MS,
  MIN_DEADLINE_MS,
  NEAR_USDC,
  QUOTE_URL,
  STATUS_URL,
  buildQuoteRequest,
  getQuote,
  getStatus,
  initLedger,
  keccak256,
  redact,
  runNear1clickCli,
};
