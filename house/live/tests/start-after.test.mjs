import { listenPort } from './free-port.mjs';
// start_after: a future date parks the card (no nudge). A past date wakes the owning seat once.
// The date is in start-after.json, so a restart keeps the park and does not send the wake twice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const APP = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'app');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'mesh-sa-'));
const CKEY = 'critic-' + crypto.randomBytes(8).toString('hex');
const FKEY = 'forge-' + crypto.randomBytes(8).toString('hex');
const INGEST = crypto.randomBytes(32).toString('hex');
const H = (k) => crypto.createHash('sha256').update(k).digest('hex');
const got = [];
const sink = http.createServer((q, s) => {
  let b = '';
  q.on('data', (d) => { b += d; });
  q.on('end', () => { got.push(JSON.parse(b || '{}')); s.writeHead(200); s.end('{}'); });
});
await new Promise((r) => sink.listen(0, '127.0.0.1', r));
const W = `http://127.0.0.1:${sink.address().port}/critic`;
const R = 'example-org/x';

function spawnSrv() {
  return spawn(process.execPath, [path.join(APP, 'server.mjs')], {
    env: {
      PORT: '0', PATH: process.env.PATH, COLLECTOR: 'off', LIVE_PUBLIC: '1',
      SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
      INGEST_SECRET: INGEST, MESH_DATA_DIR: DATA,
      SEAT_KEYS: JSON.stringify({ critic: H(CKEY), forge: H(FKEY) }),
      SEAT_WEBHOOKS: JSON.stringify({ critic: { url: W } }),
      WAKE_KEY_CRITIC: 'wk',
      WAKE_DEBOUNCE_S: '0', WAKE_STAGGER_MS: '0', WAKE_RETRY_MS: '10',
      NUDGE_L1_S: '1', BIFROST_TICK_S: '30',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
async function boot(srv) {
  const port = await listenPort(srv);
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(base + '/healthz')).ok) break; } catch { /* retry */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  return base;
}
async function stop(srv) {
  srv.kill();
  await new Promise((r) => (srv.exitCode != null || srv.signalCode ? r() : srv.once('exit', r)));
}
const card = (n, extra = {}) => ({
  key: `${R}#${n}`, kind: 'pr', repo: R, number: n, title: `card ${n}`, url: `https://github.com/${R}/pull/${n}`,
  owner: 'critic', stage: 'review', state: 'live', packet: { 'next owner': 'critic' }, packet_ok: true, missing: [],
  beats: [{ t: Date.now() - 5000, what: 'pushed', url: '', id: `b${n}` }], last_beat_t: Date.now() - 5000, stall: false,
  ...extra,
});

test('a future start_after parks the card with no nudge, survives restart, then one wake fires', async () => {
  let srv = spawnSrv();
  let base = await boot(srv);
  const critic = { Authorization: 'Bearer ' + CKEY, 'Content-Type': 'application/json' };
  const forge = { Authorization: 'Bearer ' + FKEY };
  const ingest = (cards) => fetch(base + '/ingest', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + INGEST, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 't', event_count: 0, generated_at: new Date().toISOString(), events: [], board: { updated_ct: 'x', cards } }),
  });
  const one = async (n) => (await (await fetch(base + '/cards?seat=critic', { headers: critic })).json()).cards.find((c) => c.number === n);
  const openNudge = async (n) => (await (await fetch(base + '/nudges', { headers: forge })).json()).nudges.filter((x) => x.number === n && !x.closed_at);
  const lines = async () => (await (await fetch(base + '/inbox/critic', { headers: critic })).json()).lines;

  const onCard = '2030-06-01T09:30-05:00';
  assert.equal((await ingest([card(5, { start_after: onCard })])).status, 200);
  let c5 = await one(5);
  assert.equal(c5.state, 'parked');
  assert.equal(c5.start_after, onCard);
  assert.equal((await openNudge(5)).length, 0);
  assert.equal((await lines()).filter((l) => l.type === 'start_after').length, 0);

  assert.equal((await ingest([card(4)])).status, 200);
  let c = await one(4);
  assert.equal(c.state, 'live');
  assert.equal((await openNudge(4)).length, 1);

  const future = '2026-10-18T08:00-05:00';
  const post = await fetch(base + '/cards/start-after', {
    method: 'POST', headers: critic, body: JSON.stringify({ repo: R, number: 4, start_after: future }),
  });
  assert.equal(post.status, 200);
  assert.equal((await fetch(base + '/cards/start-after', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status, 401);
  assert.equal((await fetch(base + '/cards/start-after', {
    method: 'POST', headers: critic, body: JSON.stringify({ repo: R, number: 4, start_after: 'tomorrow' }),
  })).status, 400);
  c = await one(4);
  assert.equal(c.state, 'parked');
  assert.equal(c.start_after, future);
  assert.equal(c.stall, false);
  assert.equal((await openNudge(4)).length, 0);
  assert.equal((await lines()).filter((l) => l.type === 'start_after').length, 0);
  const saved = JSON.parse(fs.readFileSync(path.join(DATA, 'live', 'start-after.json'), 'utf8'));
  assert.equal(saved.overrides[`${R}#4`].start_after, future);

  await stop(srv);
  srv = spawnSrv();
  base = await boot(srv);
  c = await one(4);
  assert.equal(c.state, 'parked');
  assert.equal(c.start_after, future);
  assert.equal((await openNudge(4)).length, 0);
  assert.equal((await lines()).filter((l) => l.type === 'start_after').length, 0);

  const past = '2020-01-01T08:00-06:00';
  const woke = await fetch(base + '/cards/start-after', {
    method: 'POST', headers: critic, body: JSON.stringify({ repo: R, number: 4, start_after: past }),
  });
  assert.equal(woke.status, 200);
  const hit = (await lines()).find((l) => l.type === 'start_after');
  assert.ok(hit);
  assert.equal(hit.seat, 'critic');
  assert.match(hit.reason, /start after 2020-01-01T08:00-06:00/);
  for (let i = 0; i < 40 && !got.some((g) => String(g.reason || '').includes('start after')); i++) await new Promise((r) => setTimeout(r, 50));
  assert.ok(got.some((g) => g.seat === 'critic' && String(g.reason || '').includes('start after')));
  const after = JSON.parse(fs.readFileSync(path.join(DATA, 'live', 'start-after.json'), 'utf8'));
  assert.ok(after.woke[`${R}#4@${past}`]);

  const n = got.length;
  await stop(srv);
  srv = spawnSrv();
  base = await boot(srv);
  await new Promise((r) => setTimeout(r, 300));
  assert.equal((await lines()).filter((l) => l.type === 'start_after').length, 1);
  assert.equal(got.length, n);
  await stop(srv);
  sink.close();
  fs.rmSync(DATA, { recursive: true, force: true, maxRetries: 10, retryDelay: 50 });
});
