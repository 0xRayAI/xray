import http from 'node:http';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cfg = JSON.parse(readFileSync(path.join(here, 'shop.json'), 'utf8'));

function advertised() {
  return {
    scheme: 'exact',
    network: cfg.network,
    asset: cfg.asset,
    amount: cfg.amount,
    payTo: cfg.payTo,
    maxTimeoutSeconds: 60,
  };
}

function quote(resourceUrl) {
  return {
    x402Version: 2,
    error: 'PAYMENT-SIGNATURE header is required',
    resource: {
      url: resourceUrl,
      description: 'Foundry job. Unpaid GET returns 402.',
      mimeType: 'application/json',
    },
    accepts: [{
      ...advertised(),
      extra: { name: 'USD Coin', version: '2' },
    }],
  };
}

function header(req, name) {
  const value = req.headers[name];
  return Array.isArray(value) ? value[0] : value;
}

async function settlePaid(raw) {
  const { settleOwnPayment } = await import('./self-settle.mjs');
  return settleOwnPayment({
    clearingRoot: process.env.CLEARING_ROOT,
    allowPayTo: [cfg.payTo],
    advertised: advertised(),
    allowMainnet: process.env.FOUNDRY_ALLOW_MAINNET === '1',
    raw,
    signer: cfg.signer,
    chain: cfg.chain,
    nowSec: () => BigInt(Math.floor(Date.now() / 1000)),
  });
}

export function createShopServer() {
  return http.createServer(async (req, res) => {
    const host = req.headers.host || '127.0.0.1';
    const url = new URL(req.url || '/', `http://${host}`);
    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ status: 'healthy' }));
      return;
    }
    if (url.pathname !== '/v1/job') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found' }));
      return;
    }
    const paid = header(req, 'payment-signature') || header(req, 'x-payment');
    if (!paid) {
      const body = JSON.stringify(quote(`${url.origin}${url.pathname}`));
      res.writeHead(402, {
        'content-type': 'application/json',
        'www-authenticate': 'x402',
      });
      res.end(body);
      return;
    }
    let raw;
    try {
      raw = JSON.parse(Buffer.from(paid, 'base64').toString('utf8'));
    } catch {
      res.writeHead(402, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'bad payment payload', paid: false }));
      return;
    }
    try {
      const settled = await settlePaid(raw);
      const status = settled && settled.success ? 200 : 402;
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(settled));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'settle failed';
      res.writeHead(402, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: message, paid: false }));
    }
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.PORT || 8787);
  const server = createShopServer();
  server.listen(port, '127.0.0.1');
}
