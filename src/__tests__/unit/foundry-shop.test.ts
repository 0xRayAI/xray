import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const requireCjs = createRequire(import.meta.url);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const shopLib = requireCjs(path.join(root, 'grok-bot', 'lib', 'foundry-shop.cjs')) as {
  BASE_USDC: string;
  RAILWAY_PROJECT: string;
  RAILWAY_SERVICE: string;
  START_COMMAND: string;
  ENV_NAMES: string[];
  writeFoundryShop: (dest: string, opts: { wallet: string; price: string }) => { dir: string };
};

const WALLET = '0x772cde67735fc8cc0f8922f103e09353c2d479fd';

describe('foundry shop', () => {
  it('unpaid GET returns 402 for the wallet and health is 200', async () => {
    const dest = mkdtempSync(path.join(tmpdir(), 'foundry-shop-'));
    const serverRef: { close: () => void } = { close: () => undefined };
    try {
      const written = shopLib.writeFoundryShop(dest, { wallet: WALLET, price: '10000' });
      const cfg = JSON.parse(readFileSync(path.join(written.dir, 'shop.json'), 'utf8')) as {
        payTo: string;
        amount: string;
        asset: string;
        network: string;
      };
      expect(cfg.payTo).toBe(WALLET);
      expect(cfg.amount).toBe('10000');
      expect(cfg.asset).toBe(shopLib.BASE_USDC);
      expect(cfg.network).toBe('eip155:8453');
      const names = readFileSync(path.join(written.dir, 'env.names'), 'utf8').trim().split('\n');
      expect(names).toEqual(shopLib.ENV_NAMES);
      expect(names.join('\n')).not.toMatch(/0x[a-fA-F0-9]{40}/);
      expect(readFileSync(path.join(written.dir, 'railway.toml'), 'utf8')).toContain(shopLib.START_COMMAND);
      const deploy = JSON.parse(readFileSync(path.join(dest, 'shop-deploy.json'), 'utf8')) as {
        project: string;
        service: string;
        startCommand: string;
        env: string[];
      };
      expect(deploy.project).toBe(shopLib.RAILWAY_PROJECT);
      expect(deploy.service).toBe(shopLib.RAILWAY_SERVICE);
      expect(deploy.startCommand).toBe(shopLib.START_COMMAND);
      expect(deploy.env).toEqual(shopLib.ENV_NAMES);
      const mod = await import(pathToFileURL(path.join(written.dir, 'server.mjs')).href) as {
        createShopServer: () => {
          listen: (port: number, host: string, cb: () => void) => void;
          address: () => { port: number } | null;
          close: (cb?: () => void) => void;
        };
      };
      const server = mod.createShopServer();
      serverRef.close = () => server.close();
      await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
      const addr = server.address();
      if (!addr) throw new Error('shop did not bind');
      const unpaid = await fetch(`http://127.0.0.1:${addr.port}/v1/job`);
      expect(unpaid.status).toBe(402);
      expect(unpaid.headers.get('www-authenticate')).toContain('x402');
      const body = await unpaid.json() as {
        accepts: Array<{ scheme: string; network: string; asset: string; amount: string; payTo: string; maxTimeoutSeconds: number }>;
      };
      expect(body.accepts).toEqual([{
        scheme: 'exact',
        network: 'eip155:8453',
        asset: shopLib.BASE_USDC,
        amount: '10000',
        payTo: WALLET,
        maxTimeoutSeconds: 60,
        extra: { name: 'USD Coin', version: '2' },
      }]);
      const health = await fetch(`http://127.0.0.1:${addr.port}/health`);
      expect(health.status).toBe(200);
      expect(await health.json()).toEqual({ status: 'healthy' });
      await new Promise<void>((resolve) => server.close(() => resolve()));
    } finally {
      serverRef.close();
      rmSync(dest, { recursive: true, force: true });
    }
  });
});
