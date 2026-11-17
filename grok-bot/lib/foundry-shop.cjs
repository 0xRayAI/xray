'use strict';

const fs = require('node:fs');
const path = require('node:path');

const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_NETWORK = 'eip155:8453';

const RAILWAY_PROJECT = 'xray-mcp';
const RAILWAY_SERVICE = 'mill-foundry';
const START_COMMAND = 'node shop/server.mjs';
const ENV_NAMES = [
  'PORT',
  'FOUNDRY_PAY_TO',
  'FOUNDRY_PRICE_ATOMIC',
  'FOUNDRY_ALLOW_MAINNET',
  'CLEARING_ROOT',
  'CLEARING_SHA',
];

function walletOf(value) {
  if (typeof value !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(value)) return '';
  return `0x${value.slice(2).toLowerCase()}`;
}

function priceOf(value) {
  const text = value == null ? '' : String(value).trim();
  if (!/^[0-9]+$/.test(text) || text === '0') return '';
  return text;
}

function shopConfig(opts) {
  const payTo = walletOf(opts.wallet);
  const amount = priceOf(opts.price);
  if (!payTo) throw new Error('wallet must be an EVM address');
  if (!amount) throw new Error('price must be a positive atomic amount');
  return {
    payTo,
    amount,
    network: BASE_NETWORK,
    asset: BASE_USDC,
    route: '/v1/job',
    railway: {
      project: RAILWAY_PROJECT,
      service: RAILWAY_SERVICE,
      startCommand: START_COMMAND,
      env: ENV_NAMES,
    },
  };
}

function writeText(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, body);
}

function writeFoundryShop(dest, opts, kitRoot) {
  const cfg = shopConfig(opts);
  const shopDir = path.join(dest, 'shop');
  const root = kitRoot || path.resolve(__dirname, '..');
  fs.mkdirSync(shopDir, { recursive: true });
  fs.copyFileSync(path.join(root, 'templates', 'foundry', 'shop-server.mjs'), path.join(shopDir, 'server.mjs'));
  fs.copyFileSync(path.join(root, 'templates', 'foundry', 'self-settle.mjs'), path.join(shopDir, 'self-settle.mjs'));
  writeText(path.join(shopDir, 'shop.json'), `${JSON.stringify({
    payTo: cfg.payTo,
    amount: cfg.amount,
    network: cfg.network,
    asset: cfg.asset,
    route: cfg.route,
  }, null, 2)}\n`);
  writeText(path.join(shopDir, 'Dockerfile'), `FROM node:24-bookworm-slim
WORKDIR /app
COPY server.mjs shop.json self-settle.mjs ./
ENV PORT=8080
EXPOSE 8080
CMD ["node", "server.mjs"]
`);
  writeText(path.join(shopDir, 'railway.toml'), `[deploy]
startCommand = "${START_COMMAND}"
`);
  writeText(path.join(shopDir, 'env.names'), `${ENV_NAMES.join('\n')}\n`);
  writeText(path.join(dest, 'shop-deploy.json'), `${JSON.stringify(cfg.railway, null, 2)}\n`);
  return { dir: shopDir, config: cfg };
}

module.exports = {
  BASE_NETWORK,
  BASE_USDC,
  ENV_NAMES,
  RAILWAY_PROJECT,
  RAILWAY_SERVICE,
  START_COMMAND,
  priceOf,
  shopConfig,
  walletOf,
  writeFoundryShop,
};
