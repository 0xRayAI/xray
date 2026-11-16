'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Base USDC stays. NEAR testnet USDC is a second accepts entry.
// Circle testnet id from the mill plan (ft_metadata symbol USDC, decimals 6).
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const NEAR_TESTNET_USDC = '3e2210e1184b45b64c8a434c0a7e7b23cc04ea7eb7a6c3c32520d03d4afcb8af';

function installNearMill(opts = {}) {
  if (!opts.dest) throw new Error('dest is required');
  const kitRoot = opts.kitRoot || path.resolve(__dirname, '..');
  const dest = opts.dest;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of ['near-seat', 'near-mill']) {
    const src = path.join(kitRoot, 'skills', name, 'SKILL.md');
    const target = path.join(dest, 'skills', name, 'SKILL.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(src, target);
  }
  const seatHome = path.join(dest, '.xray', 'state', 'seats', 'default');
  fs.mkdirSync(path.join(seatHome, 'near'), { recursive: true });
  const manifest = {
    plant: 'mill',
    identity: 'near-seat',
    npmPublish: false,
    groover: {
      steps: ['register', 'mint_suit', 'pin'],
      hangar: 'npx groover-hangar',
    },
    accepts: [
      { network: 'eip155:8453', asset: BASE_USDC, symbol: 'USDC' },
      { network: 'near:testnet', asset: NEAR_TESTNET_USDC, symbol: 'USDC' },
    ],
  };
  const manifestPath = path.join(dest, 'near-mill.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
  return { dest, seatHome, manifestPath, npmPublish: false, manifest };
}

module.exports = {
  BASE_USDC,
  NEAR_TESTNET_USDC,
  installNearMill,
};
