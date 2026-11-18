import { createRequire } from 'node:module';
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
  redact: (text: string) => string;
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
  delete process.env.INTENTS_CHECKOUT_JWT;
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
  });

  it('sends a dry quote by default and refuses a live quote', async () => {
    const dry = mockFetch(200, { quote: { amountIn: '510000' } });
    await click.getQuote({ ...good(), fetch: dry.fetch });
    expect(JSON.parse(dry.calls[0].init.body || '{}').dry).toBe(true);
    expect(dry.calls[0].url).toBe(click.QUOTE_URL);

    const live = mockFetch(200, { quote: { amountIn: '510000', depositAddress: '0xabc' } });
    await expect(click.getQuote({ ...good(), dry: false, fetch: live.fetch })).rejects.toThrow('live quote is off');
    expect(live.calls).toHaveLength(0);

    process.env.ONECLICK_LIVE = '1';
    await expect(click.getQuote({ ...good({ amount: '1000001' }), dry: false, fetch: live.fetch })).rejects.toThrow('amount is over the 1 USDC cap');
    expect(live.calls).toHaveLength(0);
  });

  it('drops a live quote whose input is over the cap', async () => {
    process.env.ONECLICK_LIVE = '1';
    const live = mockFetch(200, { quote: { amountIn: '1000001', depositAddress: '0x1111111111111111111111111111111111111111' } });
    await expect(click.getQuote({ ...good(), dry: false, fetch: live.fetch })).rejects.toThrow('quoted input is over the 1 USDC cap');
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
