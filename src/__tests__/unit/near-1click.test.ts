import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const click = requireCjs(path.join(root, 'grok-bot/lib/near-1click.cjs')) as {
  BASE_USDC: string;
  CAP: bigint;
  NEAR_USDC: string;
  QUOTE_URL: string;
  STATUS_URL: string;
  buildQuoteRequest: (opts: Record<string, unknown>) => QuoteBody;
  getQuote: (opts: Record<string, unknown>) => Promise<{ quote?: { amountIn?: string; depositAddress?: string } }>;
  getStatus: (depositAddress: string, opts?: Record<string, unknown>) => Promise<{ status: string }>;
  initLedger: (file: string) => string;
  redact: (text: string) => string;
  runNear1clickCli: (argv: string[], io?: { stdout?: { write: (chunk: string) => void }; stderr?: { write: (chunk: string) => void } }) => number;
};

type QuoteBody = {
  dry: boolean;
  swapType: string;
  amount: string;
  refundTo: string;
  refundType: string;
  depositType: string;
  recipient: string;
  recipientType: string;
  originAsset: string;
  destinationAsset: string;
};

const NOW = Date.parse('2026-11-18T00:00:00.000Z');
const DEADLINE = '2026-11-18T00:30:00.000Z';
const REFUND = '0x2527D02599Ba641c19FEa793cD0F167589a0f10D';
const RECIPIENT = 'placeholder.near';
const LIVE_REFUND = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed';
const LIVE_RECIPIENT = 'foundry.near';
const dirs: string[] = [];

function soon() {
  return new Date(Date.now() + (30 * 60 * 1000)).toISOString();
}

function liveSetup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'oneclick-'));
  dirs.push(dir);
  const ledger = path.join(dir, 'ledger.json');
  click.initLedger(ledger);
  process.env.ONECLICK_LIVE = '1';
  process.env.ONECLICK_LEDGER = ledger;
  process.env.ONECLICK_RECIPIENT = LIVE_RECIPIENT;
  process.env.ONECLICK_REFUND_TO = LIVE_REFUND;
  return ledger;
}

function readLedger(file: string) {
  return JSON.parse(readFileSync(file, 'utf8')) as { spent: string; reserved: string; closed: boolean; quotes: Array<{ correlationId: string; amountIn: string }> };
}

function good(extra: Record<string, unknown> = {}) {
  return {
    amount: '500000',
    refundTo: REFUND,
    recipient: RECIPIENT,
    deadline: DEADLINE,
    now: NOW,
    ...extra,
  };
}

function mockFetch(status: number, body: unknown) {
  const calls: Array<{ url: string; init: { method?: string; headers?: Record<string, string>; body?: string } }> = [];
  const fetch = async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string }) => {
    calls.push({ url, init });
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => JSON.stringify(body),
    };
  };
  return { fetch, calls };
}

afterEach(() => {
  delete process.env.ONECLICK_LIVE;
  delete process.env.ONECLICK_LEDGER;
  delete process.env.ONECLICK_RECIPIENT;
  delete process.env.ONECLICK_REFUND_TO;
  delete process.env.INTENTS_CHECKOUT_JWT;
  while (dirs.length > 0) {
    const dir = dirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('near 1click quote', () => {
  it('builds a dry exact-output quote under the cap', () => {
    const body = click.buildQuoteRequest(good());
    expect(body.dry).toBe(true);
    expect(body.swapType).toBe('EXACT_OUTPUT');
    expect(body.amount).toBe('500000');
    expect(body.depositType).toBe('ORIGIN_CHAIN');
    expect(body.refundType).toBe('ORIGIN_CHAIN');
    expect(body.recipientType).toBe('DESTINATION_CHAIN');
    expect(body.originAsset).toBe(click.BASE_USDC);
    expect(body.destinationAsset).toBe(click.NEAR_USDC);
    expect(click.CAP).toBe(1000000n);
  });

  it('rejects the wrong refund, a late deadline, and an amount over 1 USDC', () => {
    expect(() => click.buildQuoteRequest(good({ refundTo: 'foundry.near' }))).toThrow('refund address must be a Base address');
    expect(() => click.buildQuoteRequest(good({ refundType: 'INTENTS' }))).toThrow('refund must be on the origin chain');
    expect(() => click.buildQuoteRequest(good({ deadline: '2026-11-18T00:01:00.000Z' }))).toThrow('deadline is too soon');
    expect(() => click.buildQuoteRequest(good({ deadline: '2026-11-20T00:00:00.000Z' }))).toThrow('deadline is too far');
    expect(() => click.buildQuoteRequest(good({ amount: '1000001' }))).toThrow('amount is over the 1 USDC cap');
    expect(() => click.buildQuoteRequest(good({ amount: '0.5' }))).toThrow('amount must be an integer');
    expect(() => click.buildQuoteRequest(good({
      refundTo: '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    }))).not.toThrow();
    expect(() => click.buildQuoteRequest(good({ refundTo: LIVE_REFUND }))).not.toThrow();
    expect(() => click.buildQuoteRequest(good({
      refundTo: '0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed',
    }))).toThrow('refund address must be a Base address');
  });

  it('sends a dry quote by default and refuses a live quote', async () => {
    const dry = mockFetch(200, { quote: { amountIn: '510000' } });
    await click.getQuote({ ...good(), fetch: dry.fetch });
    expect(JSON.parse(dry.calls[0].init.body || '{}').dry).toBe(true);
    expect(dry.calls[0].url).toBe(click.QUOTE_URL);

    const live = mockFetch(200, { quote: { amountIn: '510000', depositAddress: '0xabc' } });
    await expect(click.getQuote({ ...good(), dry: false, fetch: live.fetch })).rejects.toThrow('live quote is off');
    expect(live.calls).toHaveLength(0);

    liveSetup();
    await expect(click.getQuote({
      dry: false,
      amount: '1000001',
      deadline: soon(),
      fetch: live.fetch,
    })).rejects.toThrow('amount is over the 1 USDC cap');
    expect(live.calls).toHaveLength(0);
  });

  it('refuses a live quote that uses the placeholder fixtures', async () => {
    const live = mockFetch(200, { quote: { amountIn: '510000', depositAddress: '0xabc' } });
    await expect(click.getQuote({ ...good(), dry: false, deadline: soon(), fetch: live.fetch })).rejects.toThrow('live quote is off');
    process.env.ONECLICK_LIVE = '1';
    await expect(click.getQuote({ ...good(), dry: false, deadline: soon(), fetch: live.fetch })).rejects.toThrow('live addresses are required');
    liveSetup();
    await expect(click.getQuote({
      ...good(),
      dry: false,
      deadline: soon(),
      fetch: live.fetch,
    })).rejects.toThrow('does not match');
    process.env.ONECLICK_REFUND_TO = '0x0000000000000000000000000000000000000000';
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      fetch: live.fetch,
    })).rejects.toThrow('refund address is not allowed');
    process.env.ONECLICK_RECIPIENT = RECIPIENT;
    process.env.ONECLICK_REFUND_TO = REFUND;
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      fetch: live.fetch,
    })).rejects.toThrow(/placeholder|not allowed/);
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      recipient: RECIPIENT,
      refundTo: REFUND,
      fetch: live.fetch,
    })).rejects.toThrow(/placeholder|not allowed|does not match/);
    expect(live.calls).toHaveLength(0);
  });

  it('drops a live quote whose input is over the cap after the post', async () => {
    const ledger = liveSetup();
    const deposit = '0x1111111111111111111111111111111111111111';
    const live = mockFetch(200, { quote: { amountIn: '1000001', depositAddress: deposit } });
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      fetch: live.fetch,
    })).rejects.toThrow('quoted input is over the 1 USDC cap');
    expect(live.calls).toHaveLength(1);
    const row = readLedger(ledger);
    expect(row.reserved).toBe('0');
    expect(row.closed).toBe(false);
    try {
      await click.getQuote({ dry: false, amount: '500000', deadline: soon(), fetch: live.fetch });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).not.toContain(deposit);
    }
  });

  it('reserves the 1 USDC total and refuses a second live quote', async () => {
    const ledger = liveSetup();
    const logs: string[] = [];
    const original = console.log;
    console.log = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
    const first = mockFetch(200, { correlationId: 'corr-1', quote: { amountIn: '510000', depositAddress: '0xabc' } });
    try {
      await click.getQuote({
        dry: false,
        amount: '500000',
        deadline: soon(),
        now: Date.now() + (48 * 60 * 60 * 1000),
        fetch: first.fetch,
      });
    } finally {
      console.log = original;
    }
    expect(logs).toEqual([]);
    expect(first.calls).toHaveLength(1);
    const booked = readLedger(ledger);
    expect(booked.closed).toBe(true);
    expect(booked.spent).toBe('510000');
    expect(booked.quotes[0].correlationId).toBe('corr-1');
    expect(booked.quotes[0].amountIn).toBe('510000');
    const second = mockFetch(200, { quote: { amountIn: '1000', depositAddress: '0xdef' } });
    await expect(click.getQuote({
      dry: false,
      amount: '1000',
      deadline: soon(),
      fetch: second.fetch,
    })).rejects.toThrow('live quote already used');
    expect(second.calls).toHaveLength(0);
  });

  it('refuses a live quote that would pass the 1 USDC total', async () => {
    const ledger = liveSetup();
    writeFileSync(ledger, `${JSON.stringify({ spent: '600000', reserved: '0', closed: false, quotes: [] })}\n`);
    const live = mockFetch(200, { quote: { amountIn: '500000', depositAddress: '0xabc' } });
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      fetch: live.fetch,
    })).rejects.toThrow('amount is over the 1 USDC total');
    expect(live.calls).toHaveLength(0);
  });

  it('refuses a live quote when the ledger file is missing or incomplete', async () => {
    const missing = liveSetup();
    rmSync(missing);
    const noFile = mockFetch(200, { quote: { amountIn: '500000', depositAddress: '0xabc' } });
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      fetch: noFile.fetch,
    })).rejects.toThrow('spend ledger is missing');
    expect(noFile.calls).toHaveLength(0);

    const broken = liveSetup();
    writeFileSync(broken, `${JSON.stringify({ reserved: '0', closed: false, quotes: [] })}\n`);
    const bad = mockFetch(200, { quote: { amountIn: '500000', depositAddress: '0xabc' } });
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      fetch: bad.fetch,
    })).rejects.toThrow('spend ledger is corrupt');
    expect(bad.calls).toHaveLength(0);
  });

  it('creates a ledger once and refuses to overwrite it', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'oneclick-'));
    dirs.push(dir);
    const file = path.join(dir, 'ledger.json');
    click.initLedger(file);
    const first = readFileSync(file, 'utf8');
    expect(JSON.parse(first).spent).toBe('0');
    expect(JSON.parse(first).closed).toBe(false);
    expect(() => click.initLedger(file)).toThrow('spend ledger already exists');
    expect(readFileSync(file, 'utf8')).toBe(first);
    const stdout: string[] = [];
    const stderr: string[] = [];
    const io = {
      stdout: { write: (chunk: string) => { stdout.push(chunk); } },
      stderr: { write: (chunk: string) => { stderr.push(chunk); } },
    };
    expect(click.runNear1clickCli(['init', '--ledger', file], io)).toBe(1);
    expect(stderr.join('')).toContain('spend ledger already exists');
    expect(readFileSync(file, 'utf8')).toBe(first);
  });

  it('releases the reservation when the live post fails', async () => {
    const ledger = liveSetup();
    const live = mockFetch(500, { message: 'upstream down' });
    await expect(click.getQuote({
      dry: false,
      amount: '500000',
      deadline: soon(),
      fetch: live.fetch,
    })).rejects.toThrow('upstream down');
    const row = readLedger(ledger);
    expect(row.reserved).toBe('0');
    expect(row.spent).toBe('0');
    expect(row.closed).toBe(false);
    expect(live.calls).toHaveLength(1);
  });

  it('reads status without sending a body', async () => {
    const status = mockFetch(200, { status: 'PENDING_DEPOSIT' });
    const row = await click.getStatus('0xdeposit', { fetch: status.fetch, depositMemo: 'memo-1' });
    expect(row.status).toBe('PENDING_DEPOSIT');
    expect(status.calls[0].init.method).toBe('GET');
    expect(status.calls[0].init.body).toBeUndefined();
    expect(status.calls[0].url).toBe(`${click.STATUS_URL}?depositAddress=0xdeposit&depositMemo=memo-1`);
    await expect(click.getStatus('', { fetch: status.fetch })).rejects.toThrow('deposit address is required');
  });

  it('the kit docs do not call near-1click testnet', () => {
    const files = ['README.md', 'AGENTS.md', 'llms.txt', 'CHANGELOG.md'];
    for (const name of files) {
      const text = readFileSync(path.join(root, 'grok-bot', name), 'utf8');
      expect(text).not.toMatch(/near-1click`, `near-mailbox`, and `hangar-list`\. They stay on NEAR testnet/);
      expect(text).toMatch(/near-1click` is ledger init plus a capped mainnet quote helper|`near-1click` ships too/);
      expect(text).toMatch(/init --ledger/);
      expect(text).toMatch(/does not spend/);
      expect(text).toMatch(/mainnet/);
    }
  });

  it('strips a jwt from an error', async () => {
    process.env.INTENTS_CHECKOUT_JWT = 'eyJhbGciOiJub25lIn0.eyJzdWIiOiJ4In0.sig';
    const failed = mockFetch(400, { message: `bad ${process.env.INTENTS_CHECKOUT_JWT}` });
    await expect(click.getQuote({ ...good(), fetch: failed.fetch })).rejects.toThrow('[jwt]');
    expect(failed.calls[0].init.headers?.['X-API-Key']).toBe(process.env.INTENTS_CHECKOUT_JWT);
    try {
      await click.getQuote({ ...good(), fetch: failed.fetch });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      expect(message).not.toContain('eyJ');
    }
  });
});
