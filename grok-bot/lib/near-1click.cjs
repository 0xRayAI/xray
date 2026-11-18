'use strict';

// Read-only NEAR Intents 1Click quotes. A live quote is off unless
// ONECLICK_LIVE=1 and the output amount is at most 1 USDC (1000000 units).
// The partner token, when set, is read from INTENTS_CHECKOUT_JWT and is never logged.

const QUOTE_URL = 'https://1click.chaindefuser.com/v0/quote';
const STATUS_URL = 'https://1click.chaindefuser.com/v0/status';
const CAP = 1000000n;
const MIN_DEADLINE_MS = 2 * 60 * 1000;
const MAX_DEADLINE_MS = 24 * 60 * 60 * 1000;
const BASE_USDC = 'nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near';
const NEAR_USDC = 'nep141:17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1';

function redact(text) {
  const secret = process.env.INTENTS_CHECKOUT_JWT;
  let out = String(text || '');
  if (secret) out = out.split(secret).join('[jwt]');
  return out.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[jwt]');
}

function isEvmAddress(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function isNearAccount(value) {
  if (typeof value !== 'string' || value.length < 2 || value.length > 64) return false;
  if (/^[0-9a-f]{64}$/.test(value)) return true;
  return /^(([a-z\d]+[-_])*[a-z\d]+\.)*([a-z\d]+[-_])*[a-z\d]+$/.test(value);
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
  if (!isEvmAddress(opts.refundTo)) throw new Error('refund address must be a Base address');
  if (!isNearAccount(opts.recipient)) throw new Error('recipient must be a NEAR account');
  if (!/^[0-9]+$/.test(String(opts.amount || ''))) throw new Error('amount must be an integer');
  const amount = BigInt(opts.amount);
  if (amount <= 0n) throw new Error('amount is required');
  if (amount > CAP) throw new Error('amount is over the 1 USDC cap');
  const slippage = opts.slippageTolerance == null ? 100 : opts.slippageTolerance;
  if (!Number.isInteger(slippage) || slippage < 0 || slippage > 100) throw new Error('slippage must be 0 to 100 basis points');
  const when = Date.parse(opts.deadline);
  if (Number.isNaN(when)) throw new Error('deadline is invalid');
  const now = Number.isFinite(opts.now) ? Number(opts.now) : Date.now();
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
    recipient: opts.recipient,
    recipientType: 'DESTINATION_CHAIN',
    refundTo: opts.refundTo,
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
  const fetchImpl = opts.fetch || globalThis.fetch;
  const response = await fetchImpl(QUOTE_URL, {
    method: 'POST',
    headers: quoteHeaders(),
    body: JSON.stringify(body),
  });
  const parsed = await readJson(response);
  if (body.dry === false) {
    const amountIn = parsed && parsed.quote ? parsed.quote.amountIn : '';
    if (!/^[0-9]+$/.test(String(amountIn || '')) || BigInt(amountIn) > CAP) {
      throw new Error('quoted input is over the 1 USDC cap');
    }
  }
  return parsed;
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
  redact,
};
