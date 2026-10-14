// Hotfix: /activity seat Apps come from LIVE_GH_SEATS, not only the hardcoded kit example (every real seat got 401).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../app/server.mjs', import.meta.url), 'utf8');
const body = src.slice(src.indexOf('function ghSeatsFrom'), src.indexOf('const GH_SEATS = ghSeatsFrom'));
test('LIVE_GH_SEATS configures /activity seat Apps; invalid keeps the example', () => {
  assert.ok(src.includes('const GH_SEATS = ghSeatsFrom(process.env.LIVE_GH_SEATS)'));
  const GH_SEATS_DEFAULT = [{ seat: 'Builder', bot: 'builder-app[bot]', botId: 100000002, org: 'example-org' }];
  const ghSeatsFrom = new Function('GH_SEATS_DEFAULT', body + '; return ghSeatsFrom;')(GH_SEATS_DEFAULT);
  const ours = [{ seat: 'forge', bot: 'forge0x1[bot]', botId: 336325122, org: '0xRayAI' }];
  assert.deepEqual(ghSeatsFrom(JSON.stringify(ours)), ours);
  assert.deepEqual(ghSeatsFrom('nope'), GH_SEATS_DEFAULT);
  assert.deepEqual(ghSeatsFrom(JSON.stringify([{ seat: 'x' }])), GH_SEATS_DEFAULT);
});
