'use strict';

const fs = require('node:fs');
const { foundryRecordPath, writeFoundryRecord } = require('./foundry-create.cjs');

// Clearing main. Paths: mcp/src/http.ts:17 `/v1/pin`, :33 `/v1/listings`.
// GET /v1/listings?agentId= is the unpaid check (mcp/src/listings.ts:12-39).
// catalog.shops is { id, url } when the agent is on the listed board.
// The catalog body is listed rows (mcp/src/listed.ts:187-191).
// A row is written only by a settled pin (mcp/src/pin.ts:63-79) when the card
// has a live shop and Groover + solar. Quote is 402 until PAYMENT-SIGNATURE
// or X-PAYMENT (mcp/src/x402.ts paymentHeaderFromRequest). This client does
// not sign. `pay` may return that header.
// TECH-SPEC.md:177 — pin + Groover DID/GRVR + Dynamo solar + live HTTPS shop.
const CLEARING_ORIGIN = 'https://clearing.rippel.ai';
const LIST_USAGE = 'grok-bot hangar-list --agent-id <id> --url <https-shop>';

function originOf(value) {
  const raw = typeof value === 'string' && value.trim() ? value.trim() : CLEARING_ORIGIN;
  return raw.replace(/\/$/, '');
}

function agentIdOf(value) {
  const id = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isInteger(id) || id < 0) return null;
  return id;
}

function acceptFor(record, network) {
  const accepts = record && record.shop && Array.isArray(record.shop.accepts) ? record.shop.accepts : [];
  return accepts.find((row) => row && row.network === network) || null;
}

function listingPayload(record, shopUrl) {
  if (!record || typeof record !== 'object') throw new Error('foundry record missing');
  if (typeof shopUrl !== 'string' || !shopUrl.startsWith('https://')) throw new Error('shop URL must be https');
  if (typeof record.receiver !== 'string' || record.receiver.length === 0) throw new Error('foundry receiver missing');
  const base = acceptFor(record, 'eip155:8453');
  const near = acceptFor(record, 'near:testnet');
  if (!base || !near) throw new Error('foundry shop needs Base and near:testnet accepts');
  return {
    shopUrl,
    receiver: record.receiver,
    accepts: [base, near],
  };
}

function readRecord(file) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('foundry record missing');
  return data;
}

async function responseBody(res) {
  if (res && typeof res.json === 'function') return res.json();
  const text = res && typeof res.text === 'function' ? await res.text() : '';
  return JSON.parse(text);
}

function shopIdForUrl(body, shopUrl) {
  const catalog = body && body.catalog;
  if (!catalog || catalog.ok !== true || !Array.isArray(catalog.shops)) return null;
  const hit = catalog.shops.find((shop) => shop && shop.url === shopUrl && typeof shop.id === 'string' && shop.id.length > 0);
  return hit ? hit.id : null;
}

async function getJson(fetchImpl, url, headers) {
  const res = await fetchImpl(url, { method: 'GET', headers });
  const body = await responseBody(res);
  return { status: res.status, body };
}

async function listingsCheck(fetchImpl, origin, agentId) {
  const url = `${origin}/v1/listings?agentId=${encodeURIComponent(String(agentId))}`;
  const result = await getJson(fetchImpl, url);
  return { url, ...result };
}

async function pinForListing(fetchImpl, origin, agentId, pay) {
  const url = `${origin}/v1/pin?agentId=${encodeURIComponent(String(agentId))}`;
  const first = await getJson(fetchImpl, url);
  if (first.status !== 402) return { url, ...first, paid: first.body && first.body.paid === true };
  if (typeof pay !== 'function') return { url, ...first, paid: false };
  const header = await pay(first.body);
  if (typeof header !== 'string' || header.length === 0) return { url, ...first, paid: false };
  const second = await getJson(fetchImpl, url, { 'PAYMENT-SIGNATURE': header });
  return { url, ...second, paid: second.body && second.body.paid === true };
}

function storeListingId(file, record, listingId) {
  const next = { ...record, listingId };
  writeFoundryRecord(file, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

async function listFoundry(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  const file = foundryRecordPath(opts.dest);
  if (!fs.existsSync(file)) throw new Error('foundry record missing');
  const record = readRecord(file);
  if (typeof record.listingId === 'string' && record.listingId.length > 0) {
    return { listingId: record.listingId, kept: true, payload: null, foundryPath: file };
  }
  const payload = listingPayload(record, opts.shopUrl);
  const agentId = agentIdOf(opts.agentId);
  if (agentId == null) throw new Error('agentId is required (uint)');
  const fetchImpl = opts.fetch || globalThis.fetch;
  const origin = originOf(opts.origin);
  const checked = await listingsCheck(fetchImpl, origin, agentId);
  let listingId = shopIdForUrl(checked.body, payload.shopUrl);
  let pin = null;
  if (!listingId) {
    pin = await pinForListing(fetchImpl, origin, agentId, opts.pay);
    if (pin.paid && pin.body && pin.body.listed === true) {
      const again = await listingsCheck(fetchImpl, origin, agentId);
      listingId = shopIdForUrl(again.body, payload.shopUrl);
    }
  }
  if (!listingId) {
    const error = new Error('hangar listing id missing');
    error.payload = payload;
    error.pin = pin;
    throw error;
  }
  storeListingId(file, record, listingId);
  const line = `Hangar: ${listingId}`;
  if (typeof opts.log === 'function') opts.log(line);
  if (opts.stdout && typeof opts.stdout.write === 'function') opts.stdout.write(`${line}\n`);
  return { listingId, kept: false, payload, foundryPath: file, pin };
}

function takeValue(argv, index, flag) {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    const err = new Error(`${flag} needs a value\n${LIST_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return value;
}

function parseHangarListArgs(argv) {
  const out = { help: false, agentId: null, shopUrl: null, cwd: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      out.help = true;
      continue;
    }
    if (arg === '--agent-id' || arg === '--url' || arg === '--cwd') {
      const value = takeValue(argv, i, arg);
      if (arg === '--agent-id') out.agentId = value;
      else if (arg === '--url') out.shopUrl = value;
      else out.cwd = value;
      i += 1;
      continue;
    }
    const err = new Error(`unknown argument ${arg}\n${LIST_USAGE}`);
    err.code = 'USAGE';
    throw err;
  }
  return out;
}

async function runHangarListCli(argv, io = {}) {
  const stdout = io.stdout || process.stdout;
  const stderr = io.stderr || process.stderr;
  const list = io.listFoundry || listFoundry;
  let parsed;
  try {
    parsed = parseHangarListArgs(argv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`${message}\n`);
    return 2;
  }
  if (parsed.help) {
    stdout.write(`${LIST_USAGE}\n`);
    return 0;
  }
  if (parsed.agentId == null || !parsed.shopUrl) {
    stderr.write(`${LIST_USAGE}\n`);
    return 2;
  }
  try {
    await list({
      dest: parsed.cwd || io.cwd || process.cwd(),
      agentId: parsed.agentId,
      shopUrl: parsed.shopUrl,
      fetch: io.fetch,
      pay: io.pay,
      origin: io.origin,
      stdout,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    stderr.write(`${message}\n`);
    return 1;
  }
  return 0;
}

module.exports = {
  CLEARING_ORIGIN,
  LIST_USAGE,
  listFoundry,
  listingPayload,
  parseHangarListArgs,
  runHangarListCli,
};
